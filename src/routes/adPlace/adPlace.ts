import express from 'express';
import prisma from '@src/prisma';
import {
  AdPlace,
  IBPhotos,
  IBTravelTag,
  TourPlace,
  ShareTripMemory,
  TripMemoryCategory,
  AdPlaceStatus,
  AdPlaceDraftStatus,
  DataStageStatus,
} from '@prisma/client';
import {
  ibDefs,
  asyncWrapper,
  IBResFormat,
  IBError,
  accessTokenValidCheck,
  getIBPhotoUrl,
  addrToGeoCode,
  ibTravelTagToTourPlaceType,
  getAccessableUrl,
  getUserProfileUrl,
  // getS3SignedUrl,
  IBContext,
} from '@src/utils';
import moment from 'moment';
import { isNil, isEmpty, isNaN, omit } from 'lodash';
import { delAdPlacePhoto } from '../myPage/myPage';

const adPlaceRouter: express.Application = express();

export type GetAdPlaceRequestType = {
  adPlaceId?: string; /// 검색할 adPlaceId
  userId?: string; /// 검색할 광고주의 userId
};
export type GetAdPlaceSuccessResType = AdPlace & {
  photos: IBPhotos[];
  category: IBTravelTag[];
  relatedShareTripMemoryCategory: TripMemoryCategory[]; /// adPlace와 연관이 있는 tourPlace들을 기반으로 게시된 shareTripMemory 들이 갖는 태그들을 중복없이 반환.
};
export type GetAdPlaceResType = Omit<IBResFormat, 'IBparams'> & {
  IBparams: GetAdPlaceSuccessResType[] | {};
};

/**
 * AdPlace 정보를 요청한다.
 * 구독상태이고 status가 IN_USE 상태인것만 찾는다.
 * 공유글은 adPlace와 연관된 모든 tourPlace에 달린 공유글을 노출한다.
 * https://www.figma.com/file/Tdpp5Q2J3h19NyvBvZMM2m/brip?type=design&node-id=3537-2478&mode=design&t=2AIO8OM26WPo3dXs-4
 */
export const getAdPlace = asyncWrapper(
  async (
    req: Express.IBTypedReqQuery<GetAdPlaceRequestType>,
    res: Express.IBTypedResponse<GetAdPlaceResType>,
  ) => {
    try {
      const { locals } = req;
      const userTokenId = (() => {
        if (locals && locals?.grade === 'member')
          return locals?.user?.userTokenId;
        return locals?.tokenId;
      })();
      if (!userTokenId) {
        throw new IBError({
          type: 'NOTEXISTDATA',
          message: '정상적으로 부여된 userTokenId를 가지고 있지 않습니다.',
        });
      }

      const { adPlaceId, userId } = req.query;

      if (
        (isNil(adPlaceId) || isEmpty(adPlaceId) || isNaN(Number(adPlaceId))) &&
        (isNil(userId) || isEmpty(userId) || isNaN(Number(userId)))
      ) {
        throw new IBError({
          type: 'INVALIDPARAMS',
          message: 'adPlaceId나 userId 두 파라미터중 하나는 제공되어야 합니다.',
        });
      }

      const adPlaces = await prisma.adPlace.findMany({
        where: {
          status: 'IN_USE',
          ...(!isNil(adPlaceId) &&
            !isEmpty(adPlaceId) &&
            !isNaN(Number(adPlaceId)) && {
              id: Number(adPlaceId),
            }),
          ...(!isNil(userId) &&
            !isEmpty(userId) &&
            !isNaN(Number(userId)) && {
              userId: Number(userId),
            }),
        },
        include: {
          mainPhoto: true,
          photos: true,
          category: true,
          tourPlace: {
            select: {
              id: true,
              shareTripMemory: {
                include: {
                  tripMemoryCategory: true,
                  user: {
                    select: {
                      id: true,
                      nickName: true,
                      profileImg: true,
                    },
                  },
                },
              },
            },
          },
          AdPlaceDraft: true,
        },
      });

      const categoryIds = adPlaces
        .map(adP => {
          return adP.tourPlace
            .map(tp => {
              return tp.shareTripMemory
                .map(shtm => {
                  return shtm.tripMemoryCategory.map(cate => cate.id);
                })
                .flat();
            })
            .flat();
        })
        .flat();

      const tripMemoryCategories = await prisma.tripMemoryCategory.findMany({
        where: {
          id: { in: categoryIds },
        },
      });

      const result = await Promise.all(
        adPlaces.map(async v => {
          return {
            ...omit(v, ['tourPlace']),
            relatedShareTripMemoryCategory: tripMemoryCategories,
            mainPhoto: isNil(v.photos)
              ? null
              : await getIBPhotoUrl(v.mainPhoto),
            photos: isNil(v.photos)
              ? null
              : await Promise.all(v.photos.map(getIBPhotoUrl)),
            shareTripMemory: await Promise.all(
              v.tourPlace
                .map(k =>
                  k.shareTripMemory.map(async stm => {
                    return {
                      ...stm,
                      img: await getAccessableUrl(stm.img),
                      user: {
                        ...stm.user,
                        profileImg: await getUserProfileUrl(stm.user),
                      },
                    };
                  }),
                )
                .flat(1),
            ),
          };
        }),
      );

      res.json({
        ...ibDefs.SUCCESS,
        IBparams: result,
      });
    } catch (err) {
      if (err instanceof IBError) {
        if (err.type === 'INVALIDPARAMS') {
          console.error(err);
          res.status(400).json({
            ...ibDefs.INVALIDPARAMS,
            IBdetail: (err as Error).message,
            IBparams: {} as object,
          });
          return;
        }
        if (err.type === 'DUPLICATEDDATA') {
          console.error(err);
          res.status(409).json({
            ...ibDefs.DUPLICATEDDATA,
            IBdetail: (err as Error).message,
            IBparams: {} as object,
          });
          return;
        }
      }

      throw err;
    }
  },
);

export type GetAdPlaceStatisticsRequestType = {
  adPlaceId: string; /// 조회하려는 adPlaceId
  day?: string; /// 조회하려는 날짜 기준일 ex) 2023-06-20이면 daily는 전날인 2023-06-19일이 조회되고 weekly는 6/20일 기준으로 전주인 2023년 24번째 주간통계가, 월간 통계는 2023-06-20일이 속한 해인 2023년 통계가 월간치로 뽑힌다.
};
export type GetAdPlaceStatisticsSuccessResType = {
  daily: {
    targetYear: number;
    targetMonth: number;
    targetDay: number;
    /// 전일 통계
    exposure: number; /// 노출수: 스케쥴에  뽑힌것, 실시간 추천, 네트워크 일반 노출 수
    validClicks: number; /// 유효 클릭 수
    validConversions: number; /// 유효 전환 수
  };
  weekly: {
    targetYear: number;
    targetWeek: number;
    /// 전주 통계
    exposure: number; /// 노출수: 스케쥴에  뽑힌것, 실시간 추천, 네트워크 일반 노출 수
    validClicks: number; /// 유효클릭수: 광고 비즈니스 문의 페이지까지 들어온것 https://www.figma.com/file/Tdpp5Q2J3h19NyvBvZMM2m/brip?type=design&node-id=3537-2711&mode=design&t=9lNcRGkkddcykgox-4
    validConversions: number; /// 유효전환수: 광고 비즈니스 문의 페이지까지 들어와서 문의 버튼까지 누른 수 https://www.figma.com/file/Tdpp5Q2J3h19NyvBvZMM2m/brip?type=design&node-id=3537-2711&mode=design&t=9lNcRGkkddcykgox-4
  };
  monthly: {
    targetYear: number;
    month: string; /// 당년 몇월통계인지 표시
    exposure: number; /// 노출수: 스케쥴에  뽑힌것, 실시간 추천, 네트워크 일반 노출 수
    validClicks: number; /// /// 유효클릭수: 광고 비즈니스 문의 페이지까지 들어온것 https://www.figma.com/file/Tdpp5Q2J3h19NyvBvZMM2m/brip?type=design&node-id=3537-2711&mode=design&t=9lNcRGkkddcykgox-4
    validConversions: number; /// 유효전환수: 광고 비즈니스 문의 페이지까지 들어와서 문의 버튼까지 누른 수 https://www.figma.com/file/Tdpp5Q2J3h19NyvBvZMM2m/brip?type=design&node-id=3537-2711&mode=design&t=9lNcRGkkddcykgox-4
  }[];
};
export type GetAdPlaceStatisticsResType = Omit<IBResFormat, 'IBparams'> & {
  IBparams: GetAdPlaceStatisticsSuccessResType | {};
};

export const getAdPlaceStatistics = asyncWrapper(
  async (
    req: Express.IBTypedReqQuery<GetAdPlaceStatisticsRequestType>,
    res: Express.IBTypedResponse<GetAdPlaceStatisticsResType>,
  ) => {
    try {
      const { locals } = req;
      const userId = (() => {
        if (locals && locals?.grade === 'member')
          return locals?.user?.id.toString();
        return locals?.tokenId;
        // throw new IBError({
        //   type: 'NOTAUTHORIZED',
        //   message: 'member 등급만 접근 가능합니다.',
        // });
      })();
      if (isNil(userId)) {
        throw new IBError({
          type: 'NOTEXISTDATA',
          message: '정상적으로 부여된 userId를 가지고 있지 않습니다.',
        });
      }

      const { adPlaceId, day } = req.query;
      if (isNil(adPlaceId) || isEmpty(adPlaceId) || isNaN(Number(adPlaceId))) {
        throw new IBError({
          type: 'INVALIDPARAMS',
          message:
            'adPlaceId 파라미터가 제공되지 않거나 number로 변환할수 없는 string 타입입니다.',
        });
      }

      const today = moment(day).startOf('d');
      // const where = {
      //   adPlaceId: Number(adPlaceId),
      //   ...(() => {
      //     /// daily condition
      //     const yesterday = moment(today.subtract(1, 'd'));
      //     const targetYear = Number(yesterday.format('YYYY'));
      //     const targetMonth = Number(yesterday.format('MM')) - 1; /// 이번달.
      //     const targetDay = Number(yesterday.format('DD')) - 1; /// 전날

      //     return {
      //       daily: {
      //         every: {
      //           targetYear,
      //           targetMonth,
      //           targetDay,
      //         },
      //       },
      //     };
      //   })(),
      //   ...(() => {
      //     /// weekly condition
      //     /// 당해년도 1주차면 전해년도 52주차를 반환
      //     const prevWeek = moment(today.subtract(1, 'w'));
      //     const targetYear = Number(prevWeek.format('YYYY'));
      //     const targetWeek = Number(prevWeek.format('WW')) - 1; /// 전 주

      //     return {
      //       weekly: {
      //         every: {
      //           targetYear,
      //           targetWeek,
      //         },
      //       },
      //     };
      //   })(),
      //   ...(() => {
      //     /// monthly condition
      //     const targetYear = Number(today.format('YYYY'));

      //     return {
      //       monthly: {
      //         every: {
      //           targetYear,
      //         },
      //       },
      //     };
      //   })(),
      // };
      const yesterday = moment(today).subtract(1, 'd');
      const prevWeek = moment(today).subtract(1, 'w');
      const adPlaceStatistics = await prisma.adPlaceStatistics.findFirst({
        where: {
          adPlaceId: Number(adPlaceId),
        },
        include: {
          // daily: true,
          // weekly: true,
          // monthly: true,
          ...(() => {
            /// daily condition

            const targetYear = Number(yesterday.format('YYYY'));
            const targetMonth = Number(yesterday.format('MM')); /// 이번달.
            const targetDay = Number(yesterday.format('DD')); /// 전날

            return {
              daily: {
                where: {
                  targetYear,
                  targetMonth,
                  targetDay,
                },
              },
            };
          })(),
          ...(() => {
            /// weekly condition
            /// 당해년도 1주차면 전해년도 52주차를 반환

            const targetYear = Number(prevWeek.format('YYYY'));
            const targetWeek = Number(prevWeek.format('WW')); /// 전 주

            return {
              weekly: {
                where: {
                  targetYear,
                  targetWeek,
                },
              },
            };
          })(),
          ...(() => {
            /// monthly condition
            const targetYear = Number(today.format('YYYY'));

            return {
              monthly: {
                where: {
                  targetYear,
                },
              },
            };
          })(),
        },
      });

      if (isNil(adPlaceStatistics)) {
        throw new IBError({
          type: 'NOTEXISTDATA',
          message:
            '존재하지 않는 adPlaceId이거나 통계가 생성되지 않은 adPlaceId입니다..',
        });
      }

      const { daily, monthly, weekly } = adPlaceStatistics;
      const result: GetAdPlaceStatisticsSuccessResType = {
        daily:
          isNil(daily) || isEmpty(daily)
            ? {
                targetYear: Number(yesterday.format('YYYY')),
                targetMonth: Number(yesterday.format('MM')),
                targetDay: Number(yesterday.format('DD')),
                exposure: 0,
                validClicks: 0,
                validConversions: 0,
              }
            : {
                targetYear: daily[0].targetYear,
                targetMonth: daily[0].targetMonth,
                targetDay: daily[0].targetDay,
                exposure: daily[0].exposureCnt,
                validClicks: daily[0].validClickCnt,
                validConversions: daily[0].validConversionCnt,
              },
        weekly:
          isNil(weekly) || isEmpty(weekly)
            ? {
                targetYear: Number(prevWeek.format('YYYY')),
                targetWeek: Number(prevWeek.format('w')),
                exposure: 0,
                validClicks: 0,
                validConversions: 0,
              }
            : {
                targetYear: weekly[0].targetYear,
                targetWeek: weekly[0].targetWeek,
                exposure:
                  isNil(weekly) ?? isEmpty(weekly) ? 0 : weekly[0].exposureCnt,
                validClicks:
                  isNil(weekly) ?? isEmpty(weekly)
                    ? 0
                    : weekly[0].validClickCnt,
                validConversions:
                  isNil(weekly) ?? isEmpty(weekly)
                    ? 0
                    : weekly[0].validConversionCnt,
              },
        monthly: monthly.map(v => {
          return {
            targetYear: v.targetYear,
            month: v.targetMonth.toString(),
            exposure: v.exposureCnt,
            validClicks: v.validClickCnt,
            validConversions: v.validConversionCnt,
          };
        }),
      };

      res.json({
        ...ibDefs.SUCCESS,
        IBparams: result,
      });
    } catch (err) {
      if (err instanceof IBError) {
        if (err.type === 'INVALIDPARAMS') {
          console.error(err);
          res.status(400).json({
            ...ibDefs.INVALIDPARAMS,
            IBdetail: (err as Error).message,
            IBparams: {} as object,
          });
          return;
        }
        if (err.type === 'NOTEXISTDATA') {
          console.error(err);
          res.status(404).json({
            ...ibDefs.NOTEXISTDATA,
            IBdetail: (err as Error).message,
            IBparams: {} as object,
          });
          return;
        }
      }

      throw err;
    }
  },
);

export type ApproveAdPlaceDraftRequestType = {
  adPlaceDraftId: string;
};
export type ApproveAdPlaceDraftSuccessResType = AdPlace & {
  mainPhoto: IBPhotos;
  photos: IBPhotos[];
  tourPlace: TourPlace & {
    ibTravelTag: IBTravelTag[];
    photos: IBPhotos[];
    shareTripMemory: ShareTripMemory[];
  };
};
export type ApproveAdPlaceResType = Omit<IBResFormat, 'IBparams'> & {
  IBparams: ApproveAdPlaceDraftSuccessResType | {};
};

/**
 * 광고주 사업자가 신청한 AdPlaceDraft를 idealbloom이 승인하는 api.
 * 정보수정을 요청해도 approveAdPlaceDraft를 요청해야 한다.
 * 승인하는 과정에서 adPlace와 대응하는 mainTourPlace가 생성된다. 기 존재한다면 adPlace를 업데이트 하는것일텐데 업데이트하려는 draft 정보에 맞춰 tourPlace 정보가 update 된다.
 * 승인하려는 draft 상태가 staging 상태여야한다.
 */
export const approveAdPlaceDraft = asyncWrapper(
  async (
    req: Express.IBTypedReqBody<ApproveAdPlaceDraftRequestType>,
    res: Express.IBTypedResponse<ApproveAdPlaceResType>,
  ) => {
    try {
      const { locals } = req;
      const userTokenId = (() => {
        if (!isNil(locals) && locals.grade === 'member' && locals.user?.admin)
          return locals?.user?.userTokenId;
        // return locals?.tokenId;
        throw new IBError({
          type: 'NOTAUTHORIZED',
          message: 'admin member 등급만 접근 가능합니다.',
        });
      })();
      if (!userTokenId) {
        throw new IBError({
          type: 'NOTEXISTDATA',
          message: '정상적으로 부여된 userTokenId를 가지고 있지 않습니다.',
        });
      }

      const { adPlaceDraftId } = req.body;

      if (
        isNil(adPlaceDraftId) ||
        isEmpty(adPlaceDraftId) ||
        isNaN(Number(adPlaceDraftId))
      ) {
        throw new IBError({
          type: 'INVALIDPARAMS',
          message: 'adPlaceDraftId나 파라미터는 반드시 제공되어야 합니다.',
        });
      }

      const adPlaceDraft = await prisma.adPlaceDraft.findUnique({
        where: {
          id: Number(adPlaceDraftId),
        },
        include: {
          photos: true,
          category: {
            include: {
              related: {
                include: {
                  from: true,
                  to: true,
                },
              },
              noPtr: {
                include: {
                  from: true,
                  to: true,
                },
              },
            },
          },
          adPlace: {
            select: {
              id: true,
              photos: true,
              mainPhotoId: true,
            },
          },
        },
      });

      if (
        isNil(adPlaceDraft) ||
        isEmpty(adPlaceDraft) ||
        adPlaceDraft.status !== 'STAGING'
      ) {
        throw new IBError({
          type: 'NOTEXISTDATA',
          message:
            'adPlaceDraftId에 해당하는 STAGING 상태의 adPlaceDraft가 존재하지 않습니다.',
        });
      }

      const geoCode = await addrToGeoCode(
        !isNil(adPlaceDraft.address) && !isEmpty(adPlaceDraft.address)
          ? {
              address: adPlaceDraft.address,
              type: 'parcel',
            }
          : {
              address: adPlaceDraft.roadAddress!,
              type: 'road',
            },
      );

      if (isNil(geoCode) || isEmpty(geoCode)) {
        throw new IBError({
          type: 'EXTERNALAPI',
          message:
            'addrToGeoCode api 수행중 문제가 발생했습니다.(유효하지 않은 address 혹은 외부 api 문제입니다.)',
        });
      }

      const result = await prisma.$transaction(async tx => {
        const tpUpsertData = {
          title: adPlaceDraft.title,
          status: 'IN_USE' as DataStageStatus,
          tourPlaceType: ibTravelTagToTourPlaceType({
            tag: adPlaceDraft.category[0],
            subject: 'ADPLACE',
          }),
          photos: {
            set: [], /// 기존연결 모두 제거, Draft 연결로 모두 덮어씀
            connect: [
              { id: adPlaceDraft.mainPhotoId }, /// mainPhoto를 제일 앞으로
              ...adPlaceDraft.photos.map(v => {
                return {
                  id: v.id,
                };
              }),
            ],
          },
          lat: geoCode?.lat,
          lng: geoCode?.lng,
          regionCode1: geoCode.regionCode1,
          regionCode2: geoCode.regionCode2,
          desc: adPlaceDraft.desc,
          address: adPlaceDraft.address,
          roadAddress: adPlaceDraft.roadAddress,
          detailAddress: adPlaceDraft.detailAddress,
          openWeek: adPlaceDraft.openWeek,
          contact: adPlaceDraft.contact,
          AdPlaceDraft: {
            connect: {
              id: Number(adPlaceDraftId),
            },
          },

          /// nationalCode: '82'
        };

        const mainTourPlace = await tx.tourPlace.upsert({
          where: {
            id: adPlaceDraft.mainTourPlaceId ?? -1,
          },
          update: { ...omit(tpUpsertData, 'AdPlaceDraft') },
          create: {
            ...tpUpsertData,
            photos: {
              ...omit(tpUpsertData.photos, 'set'),
            },
          },
        });

        const adPlaceDraftRes = await tx.adPlaceDraft.update({
          where: {
            id: Number(adPlaceDraftId),
          },
          data: {
            status: 'APPLIED' as AdPlaceDraftStatus, /// 'IN_USE' 상태로 바로 전환하는것은 임시코드이다. 'APPROVED' 단계를 거쳐 batch 스크립트등을 통해 'IN_USE' 상태로 전환하는것을 원칙으로 한다.
            mainTourPlaceId: mainTourPlace.id,
            tourPlace: {
              connect: {
                id: mainTourPlace.id,
              },
            },
          },
          include: {
            mainPhoto: true,
            photos: true,
            tourPlace: {
              include: {
                ibTravelTag: true,
                photos: true,
                shareTripMemory: true,
              },
            },
            category: true,
            adPlace: true,
          },
        });

        const adPlaceRes = await (async () => {
          const adPlaceUpsertData = {
            status: 'IN_USE' as AdPlaceStatus, /// 'IN_USE' 상태로 바로 전환하는것은 임시코드이다. 'APPROVED' 단계를 거쳐 batch 스크립트등을 통해 'IN_USE' 상태로 전환하는것을 원칙으로 한다.
            title: adPlaceDraftRes.title,
            mainTourPlaceId: mainTourPlace.id,
            tourPlace: {
              set: [], /// 기존 연결 모두 끊고 draft 연결로 덮어씀
              connect: {
                id: mainTourPlace.id,
              },
            },
            mainPhoto: {
              connect: {
                id: adPlaceDraftRes.mainPhotoId,
              },
            },
            photos: {
              set: [], /// 기존 연결 모두 끊고 draft 연결로 덮어씀
              connect: [
                // { id: adPlaceDraftRes.mainPhotoId }, /// mainPhoto를 제일 앞으로
                ...adPlaceDraftRes.photos.map(v => {
                  return {
                    id: v.id,
                  };
                }),
              ],
            },
            category: {
              set: [], /// 기존 연결 모두 끊고 draft 연결로 덮어씀
              connect: [
                ...adPlaceDraftRes.category.map(v => {
                  return {
                    id: v.id,
                  };
                }),
              ],
            },
            desc: adPlaceDraftRes.desc,
            address: adPlaceDraftRes.address,
            roadAddress: adPlaceDraftRes.roadAddress,
            detailAddress: adPlaceDraftRes.detailAddress,
            openWeek: adPlaceDraftRes.openWeek,
            closedDay: adPlaceDraftRes.closedDay,
            contact: adPlaceDraftRes.contact,
            siteUrl: adPlaceDraftRes.siteUrl,
            businessNumber: adPlaceDraftRes.businessNumber,
            businessRegImgKey: adPlaceDraftRes.businessRegImgKey,
            nationalCode: adPlaceDraftRes.nationalCode,
            user: {
              connect: {
                id: adPlaceDraftRes.userId,
              },
            },
            AdPlaceDraft: {
              connect: {
                id: adPlaceDraftRes.id,
              },
            },
          };

          const adPlace = await tx.adPlace.upsert({
            where: {
              id: adPlaceDraftRes.adPlaceId ?? -1,
            },
            update: {
              ...adPlaceUpsertData,
            },
            create: {
              ...adPlaceUpsertData,
              tourPlace: {
                ...omit(adPlaceUpsertData.tourPlace, 'set'),
              },
              photos: {
                ...omit(adPlaceUpsertData.photos, 'set'),
              },
              category: {
                ...omit(adPlaceUpsertData.category, 'set'),
              },
            },
            include: {
              mainPhoto: true,
              photos: true,
              tourPlace: {
                include: {
                  ibTravelTag: true,
                  photos: true,
                  shareTripMemory: true,
                },
              },
              category: true,
            },
          });

          return adPlace;
        })();

        return adPlaceRes;
      });

      if (!isNil(adPlaceDraft.adPlace)) {
        const ctx: IBContext = {
          userTokenId,
          admin: true,
        };
        await delAdPlacePhoto(
          {
            adPlaceId: adPlaceDraft.adPlace.id.toString(),
            delPhotoListFromDB: adPlaceDraft.adPlace.photos.map(v =>
              v.id.toString(),
            ),
            delPhotoListFromS3: adPlaceDraft.adPlace.photos
              .filter(oldPhoto => {
                return isNil(
                  adPlaceDraft.photos.find(
                    newPhoto => newPhoto.key === oldPhoto.key,
                  ),
                );
              })
              .map(v => v.id.toString()),
          },
          ctx,
        );
      }

      res.json({
        ...ibDefs.SUCCESS,
        IBparams: await (async () => {
          return {
            ...result,
            mainPhoto: await getIBPhotoUrl(result.mainPhoto),
            photos: isNil(result.photos)
              ? null
              : await Promise.all(result.photos.map(getIBPhotoUrl)),
            tourPlace: await Promise.all(
              result.tourPlace.map(async v => {
                return {
                  ...v,
                  photos: isNil(v.photos)
                    ? null
                    : await Promise.all(v.photos.map(getIBPhotoUrl)),
                };
              }),
            ),
          };
        })(),
      });
    } catch (err) {
      if (err instanceof IBError) {
        if (err.type === 'INVALIDPARAMS') {
          console.error(err);
          res.status(400).json({
            ...ibDefs.INVALIDPARAMS,
            IBdetail: (err as Error).message,
            IBparams: {} as object,
          });
          return;
        }
        if (err.type === 'INVALIDSTATUS') {
          console.error(err);
          res.status(400).json({
            ...ibDefs.INVALIDSTATUS,
            IBdetail: (err as Error).message,
            IBparams: {} as object,
          });
          return;
        }
        if (err.type === 'NOTEXISTDATA') {
          console.error(err);
          res.status(404).json({
            ...ibDefs.NOTEXISTDATA,
            IBdetail: (err as Error).message,
            IBparams: {} as object,
          });
          return;
        }
        if (err.type === 'EXTERNALAPI') {
          console.error(err);
          res.status(500).json({
            ...ibDefs.EXTERNALAPI,
            IBdetail: (err as Error).message,
            IBparams: {} as object,
          });
          return;
        }
      }

      throw err;
    }
  },
);

adPlaceRouter.get('/getAdPlace', accessTokenValidCheck, getAdPlace);
// adPlaceRouter.post('/approveAdPlace', accessTokenValidCheck, approveAdPlace);
adPlaceRouter.post(
  '/approveAdPlaceDraft',
  accessTokenValidCheck,
  approveAdPlaceDraft,
);
adPlaceRouter.get(
  '/getAdPlaceStatistics',
  accessTokenValidCheck,
  getAdPlaceStatistics,
);
export default adPlaceRouter;
