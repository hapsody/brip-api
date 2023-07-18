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
  // getS3SignedUrl,
} from '@src/utils';
import { isNil, isEmpty, isNaN, omit } from 'lodash';

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
              shareTripMemory: true,
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
            shareTripMemory: v.tourPlace.map(k => k.shareTripMemory).flat(1),
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

// export type GetAdPlaceStatusRequestType = {};
// export type GetAdPlaceStatusSuccessResType = {};
// export type GetAdPlaceStatusResType = Omit<IBResFormat, 'IBparams'> & {
//   IBparams: GetAdPlaceStatusSuccessResType | {};
// };

// export const getAdPlaceStatus = asyncWrapper(
//   async (
//     req: Express.IBTypedReqQuery<GetAdPlaceStatusRequestType>,
//     res: Express.IBTypedResponse<GetAdPlaceStatusResType>,
//   ) => {
//     try {
//       const { locals } = req;
//       const userId = (() => {
//         if (locals && locals?.grade === 'member')
//           return locals?.user?.id.toString();
//         // return locals?.tokenId;
//         throw new IBError({
//           type: 'NOTAUTHORIZED',
//           message: 'member 등급만 접근 가능합니다.',
//         });
//       })();
//       if (isNil(userId)) {
//         throw new IBError({
//           type: 'NOTEXISTDATA',
//           message: '정상적으로 부여된 userId를 가지고 있지 않습니다.',
//         });
//       }

//       await prisma.adPlace.findUnique();

//       res.json({
//         ...ibDefs.SUCCESS,
//         IBparams: result,
//       });
//       return;
//     } catch (err) {
//       if (err instanceof IBError) {
//         if (err.type === 'INVALIDPARAMS') {
//           res.status(400).json({
//             ...ibDefs.INVALIDPARAMS,
//             IBdetail: (err as Error).message,
//             IBparams: {} as object,
//           });
//           return;
//         }
//         if (err.type === 'DUPLICATEDDATA') {
//           res.status(409).json({
//             ...ibDefs.DUPLICATEDDATA,
//             IBdetail: (err as Error).message,
//             IBparams: {} as object,
//           });
//           return;
//         }
//       }

//       throw err;
//     }
//   },
// );

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
        if (locals && locals?.grade === 'member')
          return locals?.user?.userTokenId;
        // return locals?.tokenId;
        throw new IBError({
          type: 'NOTAUTHORIZED',
          message: 'member 등급만 접근 가능합니다.',
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
// adPlaceRouter.get('/getAdPlaceStatus', accessTokenValidCheck, getAdPlaceStatus);
export default adPlaceRouter;
