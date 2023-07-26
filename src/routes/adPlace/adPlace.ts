import express from 'express';
import prisma from '@src/prisma';
import {
  AdPlace,
  IBPhotos,
  IBTravelTag,
  TourPlace,
  ShareTripMemory,
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
} from '@src/utils';
import { isNil, isEmpty, isNaN, omit } from 'lodash';
import moment from 'moment';

const adPlaceRouter: express.Application = express();

export type GetAdPlaceRequestType = {
  adPlaceId?: string;
  userId?: string;
};
export type GetAdPlaceSuccessResType = AdPlace & {
  photos: IBPhotos[];
  category: IBTravelTag[];
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
        },
      });

      const result = await Promise.all(
        adPlaces.map(async v => {
          return {
            ...omit(v, ['tourPlace']),
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

      const { adPlaceId } = req.query;
      if (isNil(adPlaceId) || isEmpty(adPlaceId) || isNaN(Number(adPlaceId))) {
        throw new IBError({
          type: 'INVALIDPARAMS',
          message:
            'adPlaceId 파라미터가 제공되지 않거나 number로 변환할수 없는 string 타입입니다.',
        });
      }

      const today = moment();
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
            const yesterday = moment(today).subtract(1, 'd');
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
            const prevWeek = moment(today).subtract(1, 'w');
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
                targetYear: Number(today.format('YYYY')),
                targetMonth: Number(today.format('MM')),
                targetDay: Number(today.format('DD')),
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
                targetYear: Number(today.format('YYYY')),
                targetWeek: Number(today.format('w')),
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

export type ApproveAdPlaceRequestType = {
  adPlaceId: string;
};
export type ApproveAdPlaceSuccessResType = AdPlace & {
  mainPhoto: IBPhotos;
  photos: IBPhotos[];
  tourPlace: TourPlace & {
    ibTravelTag: IBTravelTag[];
    photos: IBPhotos[];
    shareTripMemory: ShareTripMemory[];
  };
};
export type ApproveAdPlaceResType = Omit<IBResFormat, 'IBparams'> & {
  IBparams: ApproveAdPlaceSuccessResType | {};
};

/**
 * 광고주 사업자가 신청한 AdPlace를 idealbllom이 승인하는 api.
 * 승인하는 과정에서 adPlace와 대응하는 mainTourPlace가 생성된다.
 * 승인하려는 adPlace의 status 상태가 NEW 상태여야 한다.
 */
export const approveAdPlace = asyncWrapper(
  async (
    req: Express.IBTypedReqBody<ApproveAdPlaceRequestType>,
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

      const { adPlaceId } = req.body;

      if (isNil(adPlaceId) || isEmpty(adPlaceId) || isNaN(Number(adPlaceId))) {
        throw new IBError({
          type: 'INVALIDPARAMS',
          message: 'adPlaceId나 파라미터는 반드시 제공되어야 합니다.',
        });
      }

      const adPlace = await prisma.adPlace.findUnique({
        where: {
          id: Number(adPlaceId),
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
        },
      });

      if (isNil(adPlace) || isEmpty(adPlace)) {
        throw new IBError({
          type: 'NOTEXISTDATA',
          message:
            'adPlaceId에 해당하는 NEW 상태의 adPlace가 존재하지 않습니다.',
        });
      }

      if (adPlace.status !== 'NEW') {
        throw new IBError({
          type: 'INVALIDSTATUS',
          message: 'adPlace가 NEW 상태가 아닙니다.',
        });
      }

      const geoCode = await addrToGeoCode(
        !isNil(adPlace.address) && !isEmpty(adPlace.address)
          ? {
              address: adPlace.address,
              type: 'parcel',
            }
          : {
              address: adPlace.roadAddress!,
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
        const mainTourPlace = await tx.tourPlace.create({
          data: {
            title: adPlace.title,
            status: 'IN_USE',
            tourPlaceType: ibTravelTagToTourPlaceType({
              tag: adPlace.category[0],
              subject: 'ADPLACE',
            }),
            photos: {
              connect: [
                { id: adPlace.mainPhotoId }, /// mainPhoto를 제일 앞으로
                ...adPlace.photos.map(v => {
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
            desc: adPlace.desc,
            address: adPlace.address,
            roadAddress: adPlace.roadAddress,
            detailAddress: adPlace.detailAddress,
            openWeek: adPlace.openWeek,
            contact: adPlace.contact,
            adPlace: {
              connect: {
                id: Number(adPlaceId),
              },
            },
            /// nationalCode: '82'
          },
        });

        const adPlaceRes = await tx.adPlace.update({
          where: {
            id: Number(adPlaceId),
          },
          data: {
            status: 'IN_USE', /// 'IN_USE' 상태로 바로 전환하는것은 임시코드이다. 'APPROVED' 단계를 거쳐 batch 스크립트등을 통해 'IN_USE' 상태로 전환하는것을 원칙으로 한다.
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
          },
        });
        return adPlaceRes;
      });

      // const result = await Promise.all(
      //   adPlaces.map(async v => {
      //     return {
      //       ...omit(v, ['tourPlace']),
      //       mainPhoto: isNil(v.photos)
      //         ? null
      //         : await getIBPhotoUrl(v.mainPhoto),
      //       photos: isNil(v.photos)
      //         ? null
      //         : await Promise.all(v.photos.map(getIBPhotoUrl)),
      //       shareTripMemory: v.tourPlace.map(k => k.shareTripMemory).flat(1),
      //     };
      //   }),
      // );

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
adPlaceRouter.post('/approveAdPlace', accessTokenValidCheck, approveAdPlace);
adPlaceRouter.get(
  '/getAdPlaceStatistics',
  accessTokenValidCheck,
  getAdPlaceStatistics,
);
export default adPlaceRouter;
