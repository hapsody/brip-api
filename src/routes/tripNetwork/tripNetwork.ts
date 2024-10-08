import express, { Express } from 'express';
import prisma from '@src/prisma';
// import { getImgUrlListFromIBPhotos } from '@src/routes/schedule/inner';
import {
  ibDefs,
  asyncWrapper,
  IBResFormat,
  IBError,
  accessTokenValidCheck,
  IBContext,
  getS3SignedUrl,
  getUserProfileUrl,
  // getUserSmallProfileUrl,
  getAccessableUrl,
  categoryToIBTravelTag,
  // delObjectsFromS3,
  getImgUrlListFromIBPhotos,
} from '@src/utils';
import {
  Prisma,
  PrismaClient,
  TripMemoryGroup,
  TripMemory,
  TripMemoryTag,
  ShareTripMemory,
  TourPlace,
  TripMemoryCategory,
  ReplyForShareTripMemory,
  PlaceType,
  IBPhotos,
  // User,
  IBTravelTag,
  IBPhotoMetaInfoType,
  IBPhotoMetaInfo,
  IBPhotoTag,
} from '@prisma/client';
import * as runtime from '@prisma/client/runtime/library';
import {
  putInSysNotiMessage,
  // takeOutSysNotiMessage,
  // pubSSEvent,
  pubNotiPush,
} from '@src/routes/noti/noti';
import { SysNotiMessageType } from '@src/routes/noti/types';

import { isEmpty, isNil, isNull, remove, isNaN } from 'lodash';
import moment from 'moment';

const tripNetworkRouter: express.Application = express();

export interface AddTripMemGrpRequestType {
  groupName: string;
}
export interface AddTripMemGrpSuccessResType extends TripMemoryGroup {}

export type AddTripMemGrpResType = Omit<IBResFormat, 'IBparams'> & {
  IBparams: AddTripMemGrpSuccessResType | {};
};

export const addTripMemGrp = asyncWrapper(
  async (
    req: Express.IBTypedReqBody<AddTripMemGrpRequestType>,
    res: Express.IBTypedResponse<AddTripMemGrpResType>,
  ) => {
    try {
      const { groupName } = req.body;
      const { locals } = req;
      const { memberId, userTokenId } = (() => {
        if (locals && locals?.grade === 'member')
          return {
            memberId: locals?.user?.id,
            userTokenId: locals?.user?.userTokenId,
          };
        // return locals?.tokenId;
        throw new IBError({
          type: 'NOTAUTHORIZED',
          message: 'member 등급만 접근 가능합니다.',
        });
      })();

      if (!userTokenId || !memberId) {
        throw new IBError({
          type: 'NOTEXISTDATA',
          message: '정상적으로 부여된 userTokenId를 가지고 있지 않습니다.',
        });
      }

      const tripMemoryGroup = await prisma.tripMemoryGroup.findUnique({
        where: {
          name_userId: {
            name: groupName,
            userId: memberId,
          },
        },
      });

      if (tripMemoryGroup)
        throw new IBError({
          type: 'DUPLICATEDDATA',
          message: '이미 존재하는 그룹이름 입니다.',
        });

      const createdGroup = await prisma.tripMemoryGroup.create({
        data: {
          name: groupName,
          userId: memberId,
        },
      });

      res.json({
        ...ibDefs.SUCCESS,
        IBparams: createdGroup,
      });
    } catch (err) {
      if (err instanceof IBError) {
        if (err.type === 'NOTAUTHORIZED') {
          console.error(err);
          res.status(403).json({
            ...ibDefs.NOTAUTHORIZED,
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

        if (err.type === 'DBTRANSACTIONERROR') {
          console.error(err);
          res.status(500).json({
            ...ibDefs.DBTRANSACTIONERROR,
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

export interface GetTripMemGrpListRequestType {
  skip: string;
  take: string;
}
export interface GetTripMemGrpListSuccessResType extends TripMemoryGroup {}

export type GetTripMemGrpListResType = Omit<IBResFormat, 'IBparams'> & {
  IBparams: GetTripMemGrpListSuccessResType | {};
};

export const getTripMemGrpList = asyncWrapper(
  async (
    req: Express.IBTypedReqBody<GetTripMemGrpListRequestType>,
    res: Express.IBTypedResponse<GetTripMemGrpListResType>,
  ) => {
    try {
      const { skip, take } = req.body;
      const { locals } = req;
      const { memberId, userTokenId } = (() => {
        if (locals && locals?.grade === 'member')
          return {
            memberId: locals?.user?.id,
            userTokenId: locals?.user?.userTokenId,
          };
        // return locals?.tokenId;
        throw new IBError({
          type: 'NOTAUTHORIZED',
          message: 'member 등급만 접근 가능합니다.',
        });
      })();

      if (!userTokenId || !memberId) {
        throw new IBError({
          type: 'NOTEXISTDATA',
          message: '정상적으로 부여된 userTokenId를 가지고 있지 않습니다.',
        });
      }

      const tripMemoryGroup = await prisma.tripMemoryGroup.findMany({
        where: {
          userId: memberId,
        },
        skip: skip ? Number(skip) : 0,
        take: take ? Number(take) : 10,
      });

      res.json({
        ...ibDefs.SUCCESS,
        IBparams: tripMemoryGroup,
      });
    } catch (err) {
      if (err instanceof IBError) {
        if (err.type === 'NOTAUTHORIZED') {
          console.error(err);
          res.status(403).json({
            ...ibDefs.NOTAUTHORIZED,
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

        if (err.type === 'DBTRANSACTIONERROR') {
          console.error(err);
          res.status(500).json({
            ...ibDefs.DBTRANSACTIONERROR,
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

type PhotoMetaInfoForAdd = {
  /// common fields
  type: IBPhotoMetaInfoType;
  title: string;
  lat?: string;
  lng?: string;
  shotTime?: string;
  keyword: string[];
  feature: {
    super: string;
    name: string;
  }[];
  // eval?: string; /// for only MAIN fields /// 데이터 수집시에 MAIN 타입의 사진의 photoMetaInfo 에서 필수적으로 저장되어야 하는 데이터이지만(스키마에서는 nullable) photoMetaInfo에서 따로 입력받지 않고 addShareTripMemory할때 입력받는 recommendGrade로 자동 저장함
  desc?: string; /// for only MAIN fields
  publicInfo?: string; /// for DETAIL fields
};

export interface AddTripMemoryRequestType {
  title: string;
  comment: string;
  hashTag?: string[];
  address?: string;
  lat: string;
  lng: string;
  groupId?: string;
  tourPlaceId?: string; /// 기존에 존재하는 장소에 tripmemory 또는 shareTripMemory를 생성하는 경우 undefined 이면 안된다.
  // img: string;
  photos: {
    key: string;
    photoMetaInfo?: PhotoMetaInfoForAdd;
  }[];
  categoryIds?: string[]; /// nullable. 바로 공유를 하는 경우에는 제공되어야 하지만 '기억'이후 '공유'할때 호출하는 것이면 추가로 입력받지 않으므로 전달해줄수 없다.
  /// 원래 tripMemory에 필요한 필드가 아니나 먼저 '기억:tripMemory'를 생성했다가 나중에 '공유:shareTripMemory'를 생성할 경우 최초 입력했던 카테고리를 다시 묻지 않는 입력 시나리오때문에 tripMemoryCategory를 기록해두기 위해 추가함.
}
export type TourPlaceCommonType = Pick<
  TourPlace,
  | 'id'
  | 'createdAt'
  | 'updatedAt'
  | 'title'
  | 'status'
  | 'tourPlaceType'
  | 'lat'
  | 'lng'
  | 'address'
  | 'roadAddress'
  | 'openWeek'
  | 'contact'
  | 'postcode'
  | 'desc'
  | 'good'
  | 'notBad'
  | 'bad'
  | 'like'
  | 'adPlaceId'
> & {
  // photos: Pick<IBPhotos, 'id' | 'key' | 'url'>[]; /// deprecated 예정 => TourPlaceCommonType을 사용하고 있는 api의 리턴값에서 AddTripMemorySuccessResType.photo 또는 GetShareTripMemListByPlaceSuccessResType.photo 등과 같이 리턴값에서 TourPlace 상위의 photos 프로퍼티로 반환정보를 대체함
  photos?: Partial<IBPhotos>[];
  // likeFrom: Pick<
  //   User,
  //   'id' | 'nickName' | 'createdAt' | 'updatedAt' | 'profileImg'
  // >[];
};

type PhotoWithMetaType = Partial<IBPhotos> & {
  photoMetaInfo?:
    | (IBPhotoMetaInfo & {
        feature: TripMemoryCategory[];
        keyword: IBPhotoTag[];
      })
    | null;
};
export interface AddTripMemorySuccessResType extends TripMemory {
  tag: TripMemoryTag[];
  group: TripMemoryGroup | null;
  photos: PhotoWithMetaType[];
  TourPlace: TourPlaceCommonType | null;
  // TourPlace: {
  //   id: number;
  //   title: string | null;
  //   tourPlaceType: PlaceType;
  //   lat: number | null;
  //   lng: number | null;
  //   address: string | null;
  //   roadAddress: string | null;
  //   openWeek: string | null;
  //   contact: string | null;
  //   postcode: string | null;
  //   photos: {
  //     url: string | null;
  //   }[];
  //   desc: string | null;
  // } | null;
}

export type AddTripMemoryResType = Omit<IBResFormat, 'IBparams'> & {
  IBparams: AddTripMemorySuccessResType | {};
};

export interface ContextAddTripMemory extends IBContext {}

const addTripMemory = async (
  param: AddTripMemoryRequestType,
  ctx: ContextAddTripMemory,
  // transaction?: Omit<
  //   PrismaClient<
  //     Prisma.PrismaClientOptions,
  //     never,
  //     Prisma.RejectOnNotFound | Prisma.RejectPerOperation | undefined
  //   >,
  //   '$connect' | '$disconnect' | '$on' | '$transaction' | '$use'
  // >,

  transaction?: Omit<PrismaClient, runtime.ITXClientDenyList>,
): Promise<AddTripMemorySuccessResType> => {
  const {
    title,
    comment,
    hashTag,
    address,
    lat,
    lng,
    // img,
    groupId,
    tourPlaceId,
    photos,
    categoryIds,
  } = param;

  if (isNil(photos) || isEmpty(photos)) {
    throw new IBError({
      type: 'INVALIDPARAMS',
      message: 'photos는 필수 파라미터입니다.',
    });
  }

  if (isNil(categoryIds) || isEmpty(categoryIds)) {
    throw new IBError({
      type: 'INVALIDPARAMS',
      message: `categoryIds는 1개 이상 반드시 제공되어야 합니다.`,
    });
  }

  // const mainImg = photos.find(v =>
  //   v.photoMetaInfo?.type?.toUpperCase().includes('MAIN'),
  // );

  // if (isNil(mainImg)) {
  //   throw new IBError({
  //     type: 'INVALIDPARAMS',
  //     message: 'photos중에 MAIN type 이미지는 반드시 지정해야 합니다.',
  //   });
  // }

  const img = photos[0].key;

  /// addShareTrip api 호출로 인한 addTripMemory 요청의 경우
  if (!isNil(transaction)) {
    const tx = transaction;
    const alreadyExist = await tx.tripMemory.findUnique({
      where: {
        title_img: {
          title,
          img,
        },
      },
    });

    if (!isNil(alreadyExist)) {
      throw new IBError({
        type: 'DUPLICATEDDATA',
        message: '이미 기억 데이터가 존재합니다.',
      });
    }

    /// groupId 값이 주어졌다면 groupId의 유효성 검사후 해당 tripMemory 날짜 업데이트를 해준다.
    await (async () => {
      if (!isNil(groupId) && !isEmpty(groupId) && !isNaN(Number(groupId))) {
        const tmGroup = await (
          transaction ?? prisma
        ).tripMemoryGroup.findUnique({
          where: {
            id: Number(groupId),
          },
        });

        if (isNil(tmGroup))
          throw new IBError({
            type: 'NOTEXISTDATA',
            message: '존재하지 않는 그룹입니다.',
          });

        if (isNil(tmGroup.userId) || tmGroup.userId !== Number(ctx.memberId)) {
          throw new IBError({
            type: 'NOTAUTHORIZED',
            message: '해당 유저의 권한으로 조회할수 없는 그룹입니다.',
          });
        }

        const prevStartDate = !isNil(tmGroup.startDate)
          ? tmGroup.startDate
          : moment().startOf('d').toISOString();
        const prevEndDate = !isNil(tmGroup.endDate)
          ? tmGroup.endDate
          : moment().startOf('d').toISOString();

        const sDay = moment(prevStartDate).format('YYYY-MM-DD');
        const eDay = moment(prevEndDate).format('YYYY-MM-DD');
        const curDay = moment().startOf('d').format('YYYY-MM-DD');

        const startDate = (() => {
          if (moment(sDay).diff(moment(curDay)) > 0)
            return moment(curDay).toISOString();
          return moment(sDay).toISOString();
        })();
        const endDate = (() => {
          if (moment(eDay).diff(moment(curDay)) < 0)
            return moment(curDay).toISOString();
          return moment(eDay).toISOString();
        })();

        const existMemGroup = await tx.tripMemoryGroup.findUnique({
          where: {
            id: Number(groupId),
          },
        });

        if (!existMemGroup) {
          throw new IBError({
            type: 'NOTEXISTDATA',
            message: '존재 하지 않는 TripMemoryGroup ID입니다.',
          });
        }

        await tx.tripMemoryGroup.update({
          where: {
            id: Number(groupId),
          },
          data: {
            startDate,
            endDate,
          },
        });

        return tmGroup;
      }
      return null;
    })();

    /// 사진 메타 데이터와 사진을 먼저 생성후 tripMemory와 connect
    const photoMetaInfo = await Promise.all(
      photos.map((v, index) => {
        const latitude =
          isNil(v.photoMetaInfo!.lat) || isEmpty(v.photoMetaInfo!.lat)
            ? undefined
            : Number(v.photoMetaInfo!.lat);
        const longitude =
          isNil(v.photoMetaInfo!.lng) || isEmpty(v.photoMetaInfo!.lng)
            ? undefined
            : Number(v.photoMetaInfo!.lng);

        return tx.iBPhotoMetaInfo.create({
          data: {
            type: v.photoMetaInfo!.type,
            order: index,
            title: v.photoMetaInfo!.title,
            lat: latitude,
            lng: longitude,
            shotTime: v.photoMetaInfo!.shotTime,
            ...(v.photoMetaInfo!.keyword && {
              keyword: {
                connectOrCreate: v.photoMetaInfo!.keyword.map(k => {
                  return {
                    where: {
                      name: k,
                    },
                    create: {
                      name: k,
                    },
                  };
                }),
              },
            }),
            ...(v.photoMetaInfo!.feature && {
              feature: {
                connectOrCreate: v.photoMetaInfo!.feature.map(k => {
                  return {
                    where: {
                      super_name: {
                        super: k.super,
                        name: k.name,
                      },
                    },
                    create: {
                      super: k.super,
                      name: k.name,
                    },
                  };
                }),
              },
            }),
            // eval: v.photoMetaInfo!.eval, /// 데이터 수집시에 MAIN 타입의 사진의 photoMetaInfo 에서 필수적으로 저장되어야 하는 데이터이지만(스키마에서는 nullable) photoMetaInfo에서 따로 입력받지 않고 addShareTripMemory할때 입력받는 recommendGrade로 자동 저장함
            desc: v.photoMetaInfo!.desc,
            publicInfo: v.photoMetaInfo?.publicInfo,
            photo: {
              create: {
                key: v.key,
              },
            },
          },
        });
      }),
    );

    /// tourPlaceId가 제공되었으면 찾아서 반환, 없으면 생성해서 반환
    /// 반환된 tourPlace는 tripMemory 생성할때 connect해준다.
    const createdOrFoundTP = await (async () => {
      /// 1. tourPlaceId가 제공되었을 경우
      if (!isNil(tourPlaceId)) {
        const matchedTP = await tx.tourPlace.findUnique({
          where: {
            id: Number(tourPlaceId),
          },
        });

        if (isNull(matchedTP)) {
          throw new IBError({
            type: 'INVALIDPARAMS',
            message: '유효하지 않은 tourPlaceId 값입니다.',
          });
        }

        /// 기존에 존재하는 tourPlaceId 에 shareTripMemory를 생성하는 경우에는 기존 tourPlace에 해당 shareTripMemory에서 제공하는 사진을 추가한다.
        await tx.tourPlace.update({
          where: {
            id: Number(tourPlaceId),
          },
          data: {
            photos: {
              connect: photoMetaInfo.map(k => {
                return {
                  id: k.photoId,
                };
              }),
            },
          },
        });

        return matchedTP;
      }

      /// 2. tourPlaceId 제공되지 않은 경우 새로 tourPlace를 생성해서 반환한다.

      /// 동일한 이름과 GPS 정보가 일치하는 장소가 있으면 신규로 등록하지 않고 오류 발생시킴
      const minLat = Number(lat) - 0.0025;
      const maxLat = Number(lat) + 0.0025;
      const minLng = Number(lng) - 0.0025;
      const maxLng = Number(lng) + 0.0025;
      const sameNamedTP = await tx.tourPlace.findFirst({
        where: {
          title,
          AND: [
            { lat: { gte: Number(minLat) } },
            { lat: { lt: Number(maxLat) } },
            { lng: { gte: Number(minLng) } },
            { lng: { lt: Number(maxLng) } },
          ],
        },
      });
      if (!isNil(sameNamedTP)) {
        throw new IBError({
          type: 'DUPLICATEDDATA',
          message: '동일한 위치에(lat, lng) 동일한 이름의 장소가 존재합니다.',
        });
      }

      const createdTP = await tx.tourPlace.create({
        data: {
          title,
          lat: Number(lat),
          lng: Number(lng),
          address,
          // tourPlaceType: 'USER_SPOT',
          tourPlaceType: 'USER_PRIV_MEMORY_SPOT' as PlaceType,
          photos: {
            connect: photoMetaInfo.map(k => {
              return {
                id: k.photoId,
              };
            }),
          },
        },
      });
      return createdTP;
    })();

    const createdTripMem = await tx.tripMemory.create({
      data: {
        title,
        comment,
        lat: Number(lat),
        lng: Number(lng),
        address,
        img,
        ...(!isNil(groupId) &&
          !isEmpty(groupId) &&
          !isNaN(groupId) && {
            group: {
              connect: {
                id: Number(groupId),
              },
            },
          }),
        user: {
          connect: {
            id: ctx.memberId!,
          },
        },
        ...(hashTag &&
          !isEmpty(hashTag) && {
            tag: {
              connectOrCreate: hashTag
                .map(tag => {
                  return tag.split(',');
                })
                .flat()
                .map(tag => {
                  return {
                    where: {
                      name_userId: {
                        name: tag,
                        userId: ctx.memberId!,
                      },
                    },
                    create: {
                      name: tag,
                      user: {
                        connect: {
                          id: ctx.memberId!,
                        },
                      },
                    },
                  };
                }),
            },
          }),
        photos: {
          connect: photoMetaInfo.map(v => {
            return {
              id: v.photoId,
            };
          }),
        },
        TourPlace: {
          connect: {
            id: Number(createdOrFoundTP.id),
          },
        },
        tripMemCategoryIds: categoryIds.toString(),
      },
      include: {
        tag: true,
        group: true,
        photos: {
          include: {
            photoMetaInfo: {
              include: {
                feature: true,
                keyword: true,
              },
            },
          },
        },
        TourPlace: {
          select: {
            id: true,
            createdAt: true,
            updatedAt: true,
            tourPlaceType: true,
            status: true,
            title: true,
            lat: true,
            lng: true,
            address: true,
            roadAddress: true,
            openWeek: true,
            contact: true,
            postcode: true,
            rating: true,
            desc: true,
            // photos: {
            //   select: {
            //     id: true,
            //     key: true,
            //     url: true,
            //   },
            // },
            good: true,
            notBad: true,
            bad: true,
            like: true,
            // likeFrom: {
            //   select: {
            //     id: true,
            //     nickName: true,
            //     profileImg: true,
            //     createdAt: true,
            //     updatedAt: true,
            //   },
            // },
            adPlaceId: true,
          },
        },
      },
    });
    return createdTripMem;
  }

  /// 직접 addTripMemory 요청의 경우

  const createdTripMem = await prisma.$transaction(async tx => {
    const alreadyExist = await tx.tripMemory.findUnique({
      where: {
        title_img: {
          title,
          img,
        },
      },
    });

    if (!isNil(alreadyExist)) {
      throw new IBError({
        type: 'DUPLICATEDDATA',
        message: '이미 기억 데이터가 존재합니다.',
      });
    }

    /// groupId 값이 주어졌다면 groupId의 유효성 검사후 해당 tripMemory 날짜 업데이트를 해준다.
    await (async () => {
      if (!isNil(groupId) && !isEmpty(groupId) && !isNaN(Number(groupId))) {
        const tmGroup = await (
          transaction ?? prisma
        ).tripMemoryGroup.findUnique({
          where: {
            id: Number(groupId),
          },
        });

        if (isNil(tmGroup))
          throw new IBError({
            type: 'NOTEXISTDATA',
            message: '존재하지 않는 그룹입니다.',
          });

        if (isNil(tmGroup.userId) || tmGroup.userId !== Number(ctx.memberId)) {
          throw new IBError({
            type: 'NOTAUTHORIZED',
            message: '해당 유저의 권한으로 조회할수 없는 그룹입니다.',
          });
        }

        const prevStartDate = !isNil(tmGroup.startDate)
          ? tmGroup.startDate
          : moment().startOf('d').toISOString();
        const prevEndDate = !isNil(tmGroup.endDate)
          ? tmGroup.endDate
          : moment().startOf('d').toISOString();

        const sDay = moment(prevStartDate).format('YYYY-MM-DD');
        const eDay = moment(prevEndDate).format('YYYY-MM-DD');
        const curDay = moment().startOf('d').format('YYYY-MM-DD');

        const startDate = (() => {
          if (moment(sDay).diff(moment(curDay)) > 0)
            return moment(curDay).toISOString();
          return moment(sDay).toISOString();
        })();
        const endDate = (() => {
          if (moment(eDay).diff(moment(curDay)) < 0)
            return moment(curDay).toISOString();
          return moment(eDay).toISOString();
        })();

        const existMemGroup = await tx.tripMemoryGroup.findUnique({
          where: {
            id: Number(groupId),
          },
        });

        if (!existMemGroup) {
          throw new IBError({
            type: 'NOTEXISTDATA',
            message: '존재 하지 않는 TripMemoryGroup ID입니다.',
          });
        }

        await tx.tripMemoryGroup.update({
          where: {
            id: Number(groupId),
          },
          data: {
            startDate,
            endDate,
          },
        });

        return tmGroup;
      }
      return null;
    })();

    /// tourPlaceId가 제공되었으면 찾아서 반환, 없으면 생성해서 반환
    /// 반환된 tourPlace는 tripMemory 생성할때 connect해준다.
    const createdOrFoundTP = await (async () => {
      /// 1. tourPlaceId가 제공되었을 경우
      if (!isNil(tourPlaceId)) {
        const matchedTP = await tx.tourPlace.findUnique({
          where: {
            id: Number(tourPlaceId),
          },
        });
        if (isNull(matchedTP)) {
          throw new IBError({
            type: 'INVALIDPARAMS',
            message: '유효하지 않은 tourPlaceId 값입니다.',
          });
        }
        return matchedTP;
      }

      /// 2. tourPlaceId 제공되지 않은 경우 새로 tourPlace를 생성해서 반환한다.
      /// 동일한 이름과 GPS 정보가 일치하는 장소가 있으면 신규로 등록하지 않고 오류 발생시킴
      const minLat = Number(lat) - 0.0025;
      const maxLat = Number(lat) + 0.0025;
      const minLng = Number(lng) - 0.0025;
      const maxLng = Number(lng) + 0.0025;
      const sameNamedTP = await tx.tourPlace.findFirst({
        where: {
          title,
          AND: [
            { lat: { gte: Number(minLat) } },
            { lat: { lt: Number(maxLat) } },
            { lng: { gte: Number(minLng) } },
            { lng: { lt: Number(maxLng) } },
          ],
        },
      });
      if (!isNil(sameNamedTP)) {
        throw new IBError({
          type: 'DUPLICATEDDATA',
          message: '동일한 위치에(lat, lng) 동일한 이름의 장소가 존재합니다.',
        });
      }

      const createdTP = await tx.tourPlace.create({
        data: {
          title,
          lat: Number(lat),
          lng: Number(lng),
          address,
          // tourPlaceType: 'USER_SPOT',
          tourPlaceType: 'USER_PRIV_MEMORY_SPOT' as PlaceType,
          /// TripMemory 만 생성하는 경우에는 유저가 아직 'share'를 허용한 케이스가 아니기 때문에 사진이 tourPlace에 공유되면 안된다.
          // photos: {
          //   createMany: {
          //     data: photos.map(k => {
          //       return {
          //         key: k.key,
          //       };
          //     }),
          //   },

          //   // create: {
          //   //   key: img,
          //   // },
          // },
        },
      });
      return createdTP;
    })();

    /// 사진 메타 데이터와 사진을 먼저 생성후 tripMemory와 connect
    const photoMetaInfo = await Promise.all(
      photos.map((v, index) => {
        const latitude =
          isNil(v.photoMetaInfo!.lat) || isEmpty(v.photoMetaInfo!.lat)
            ? undefined
            : Number(v.photoMetaInfo!.lat);
        const longitude =
          isNil(v.photoMetaInfo!.lng) || isEmpty(v.photoMetaInfo!.lng)
            ? undefined
            : Number(v.photoMetaInfo!.lng);
        return tx.iBPhotoMetaInfo.create({
          data: {
            type: v.photoMetaInfo!.type,
            order: index,
            title: v.photoMetaInfo!.title,
            lat: latitude,
            lng: longitude,
            shotTime: v.photoMetaInfo!.shotTime,
            ...(v.photoMetaInfo!.keyword && {
              keyword: {
                connectOrCreate: v.photoMetaInfo!.keyword.map(k => {
                  return {
                    where: {
                      name: k,
                    },
                    create: {
                      name: k,
                    },
                  };
                }),
              },
            }),
            ...(v.photoMetaInfo!.feature && {
              feature: {
                connectOrCreate: v.photoMetaInfo!.feature.map(k => {
                  return {
                    where: {
                      super_name: {
                        super: k.super,
                        name: k.name,
                      },
                    },
                    create: {
                      super: k.super,
                      name: k.name,
                    },
                  };
                }),
              },
            }),
            // eval: v.photoMetaInfo!.eval, /// 데이터 수집시에 MAIN 타입의 사진의 photoMetaInfo 에서 필수적으로 저장되어야 하는 데이터이지만(스키마에서는 nullable) photoMetaInfo에서 따로 입력받지 않고 addShareTripMemory할때 입력받는 recommendGrade로 자동 저장함
            desc: v.photoMetaInfo!.desc,
            publicInfo: v.photoMetaInfo?.publicInfo,
            photo: {
              create: {
                key: v.key,
              },
            },
          },
        });
      }),
    );

    const createdOne = await tx.tripMemory.create({
      data: {
        title,
        comment,
        lat: Number(lat),
        lng: Number(lng),
        address,
        img,
        ...(!isNil(groupId) &&
          !isEmpty(groupId) &&
          !isNaN(groupId) && {
            group: {
              connect: {
                id: Number(groupId),
              },
            },
          }),

        user: {
          connect: {
            id: ctx.memberId!,
          },
        },
        ...(hashTag &&
          !isEmpty(hashTag) && {
            tag: {
              connectOrCreate: hashTag
                .map(tag => {
                  return tag.split(',');
                })
                .flat()
                .map(tag => {
                  return {
                    where: {
                      name_userId: {
                        name: tag,
                        userId: ctx.memberId!,
                      },
                    },
                    create: {
                      name: tag,
                      user: {
                        connect: {
                          id: ctx.memberId!,
                        },
                      },
                    },
                  };
                }),
            },
          }),
        photos: {
          connect: photoMetaInfo.map(v => {
            return {
              id: v.photoId,
            };
          }),
        },
        TourPlace: {
          connect: {
            id: Number(createdOrFoundTP.id),
          },
        },
        tripMemCategoryIds: categoryIds.toString(),
      },
      include: {
        tag: true,
        group: true,
        photos: {
          include: {
            photoMetaInfo: {
              include: {
                feature: true,
                keyword: true,
              },
            },
          },
        },
        TourPlace: {
          select: {
            id: true,
            createdAt: true,
            updatedAt: true,
            tourPlaceType: true,
            status: true,
            title: true,
            lat: true,
            lng: true,
            address: true,
            roadAddress: true,
            openWeek: true,
            contact: true,
            postcode: true,
            rating: true,
            desc: true,
            // photos: {
            //   select: {
            //     id: true,
            //     key: true,
            //     url: true,
            //   },
            // },
            good: true,
            notBad: true,
            bad: true,
            like: true,
            // likeFrom: {
            //   select: {
            //     id: true,
            //     nickName: true,
            //     profileImg: true,
            //     createdAt: true,
            //     updatedAt: true,
            //   },
            // },
            adPlaceId: true,
          },
        },
      },
    });
    return createdOne;
  });

  return createdTripMem;
};

// export const getAccessableUrl = async (url: string): Promise<string> => {
//   if (url.includes('http')) return url;
//   const result = await getS3SignedUrl(url);
//   return result;
// };

export const getIBPhotoUrl = async (
  photo: PhotoWithMetaType,
): Promise<PhotoWithMetaType> => {
  if (!isNil(photo.url)) {
    return {
      ...photo,
      url: photo.url,
    };
  }
  if (!isNil(photo.key)) {
    return {
      ...photo,
      url: await getS3SignedUrl(photo.key),
    };
  }

  throw new IBError({
    type: 'INVALIDSTATUS',
    message: 'photos의 url과 key값이 둘다 존재하지 않습니다.',
  });
};

export const addTripMemoryWrapper = asyncWrapper(
  async (
    req: Express.IBTypedReqBody<AddTripMemoryRequestType>,
    res: Express.IBTypedResponse<AddTripMemoryResType>,
  ) => {
    try {
      const param = req.body;
      const { locals } = req;
      const { memberId, userTokenId } = (() => {
        if (locals && locals?.grade === 'member')
          return {
            memberId: locals?.user?.id,
            userTokenId: locals?.user?.userTokenId,
          };
        // return locals?.tokenId;
        throw new IBError({
          type: 'NOTAUTHORIZED',
          message: 'member 등급만 접근 가능합니다.',
        });
      })();

      if (!userTokenId || !memberId) {
        throw new IBError({
          type: 'NOTEXISTDATA',
          message: '정상적으로 부여된 userTokenId를 가지고 있지 않습니다.',
        });
      }
      const ctx = {
        memberId,
        userTokenId,
      };
      const createdTripMem = await addTripMemory(param, ctx);

      res.json({
        ...ibDefs.SUCCESS,
        IBparams: createdTripMem,
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

        if (err.type === 'NOTAUTHORIZED') {
          console.error(err);
          res.status(403).json({
            ...ibDefs.NOTAUTHORIZED,
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

        if (err.type === 'DBTRANSACTIONERROR') {
          console.error(err);
          res.status(500).json({
            ...ibDefs.DBTRANSACTIONERROR,
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

export type AddTripMemCategoryRequestType = {
  superCategory: string;
  nameList: string[];
}[];

export type AddTripMemCategorySuccessResType = TripMemoryGroup[];

export type AddTripMemCategoryResType = Omit<IBResFormat, 'IBparams'> & {
  IBparams: AddTripMemCategorySuccessResType | {};
};

export const addTripMemCategory = asyncWrapper(
  async (
    req: Express.IBTypedReqBody<AddTripMemCategoryRequestType>,
    res: Express.IBTypedResponse<AddTripMemCategoryResType>,
  ) => {
    try {
      const param = req.body;

      const { locals } = req;
      const { memberId, userTokenId } = (() => {
        if (locals && locals?.grade === 'member')
          return {
            memberId: locals?.user?.id,
            userTokenId: locals?.user?.userTokenId,
          };
        // return locals?.tokenId;
        throw new IBError({
          type: 'NOTAUTHORIZED',
          message: 'member 등급만 접근 가능합니다.',
        });
      })();

      if (!userTokenId || !memberId) {
        throw new IBError({
          type: 'NOTEXISTDATA',
          message: '정상적으로 부여된 userTokenId를 가지고 있지 않습니다.',
        });
      }

      // const tripMemoryCategory = await prisma.tripMemoryCategory.findUnique({
      //   where: {
      //     super_name: {
      //       super: superCategory,
      //       name,
      //     },
      //   },
      // });

      // if (tripMemoryCategory) {
      //   throw new IBError({
      //     type: 'DUPLICATEDDATA',
      //     message: '이미 존재하는 카테고리입니다.',
      //   });
      // }

      const createdList = await prisma.$transaction(
        param
          .map(p => {
            return p.nameList.map(name => {
              return prisma.tripMemoryCategory.upsert({
                where: {
                  super_name: {
                    super: p.superCategory.replace(/ /g, ''),
                    name: name.replace(/ /g, ''),
                  },
                },
                update: {},
                create: {
                  super: p.superCategory.replace(/ /g, ''),
                  name: name.replace(/ /g, ''),
                },
              });
            });
          })
          .flat(),
      );

      res.json({
        ...ibDefs.SUCCESS,
        IBparams: createdList,
      });
    } catch (err) {
      if (err instanceof IBError) {
        if (err.type === 'NOTAUTHORIZED') {
          console.error(err);
          res.status(403).json({
            ...ibDefs.NOTAUTHORIZED,
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

        if (err.type === 'DBTRANSACTIONERROR') {
          console.error(err);
          res.status(500).json({
            ...ibDefs.DBTRANSACTIONERROR,
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

export interface GetTripMemCategoryListRequestType {
  skip: string;
  take: string;
  superCategory?: string;
  name?: string;
}
export type GetTripMemCategoryListSuccessResType = TripMemoryGroup[];

export type GetTripMemCategoryListResType = Omit<IBResFormat, 'IBparams'> & {
  IBparams: GetTripMemCategoryListSuccessResType | {};
};

export const getTripMemCategoryList = asyncWrapper(
  async (
    req: Express.IBTypedReqBody<GetTripMemCategoryListRequestType>,
    res: Express.IBTypedResponse<GetTripMemCategoryListResType>,
  ) => {
    try {
      const { skip, take, superCategory, name } = req.body;
      const { locals } = req;
      const userTokenId = (() => {
        if (locals && locals?.grade === 'member')
          return locals?.user?.userTokenId;

        return locals?.tokenId;
        // throw new IBError({
        //   type: 'NOTAUTHORIZED',
        //   message: 'member 등급만 접근 가능합니다.',
        // });
      })();

      if (!userTokenId) {
        throw new IBError({
          type: 'NOTEXISTDATA',
          message: '정상적으로 부여된 userTokenId를 가지고 있지 않습니다.',
        });
      }

      const tripMemoryCategory = await prisma.tripMemoryCategory.findMany({
        skip: skip ? Number(skip) : 0,
        take: take ? Number(take) : 10,
        where: {
          super: superCategory,
          name,
        },
      });

      res.json({
        ...ibDefs.SUCCESS,
        IBparams: tripMemoryCategory,
      });
    } catch (err) {
      if (err instanceof IBError) {
        if (err.type === 'NOTAUTHORIZED') {
          console.error(err);
          res.status(403).json({
            ...ibDefs.NOTAUTHORIZED,
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

        if (err.type === 'DBTRANSACTIONERROR') {
          console.error(err);
          res.status(500).json({
            ...ibDefs.DBTRANSACTIONERROR,
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

export interface AddShareTripMemoryRequestType {
  tripMemoryParam: AddTripMemoryRequestType;
  tripMemoryId?: string; /// 이미 존재하는 tripMemory일 경우 id를 제공해야 한다. tripMemoryId가 제공되지 않을 경우 addShareTripMemory api 수행 과정중 tripMemory가 생성된다.
  recommendGrade: 'good' | 'notbad' | 'bad';
  // categoryIds: string[]; /// tripMemoryParam으로 이전되어 들어갔다.
  // isShare: string; /// 공유 하려면 true, false일 경우 shareTripMemory를 생성해놓긴 하지만 노출되지 않음
  tourPlaceId?: string | null; /// 이미 존재하는 장소에 share하려는 경우네느 tourPlaceId를 제공해야한다.
}
export interface AddShareTripMemorySuccessResType extends ShareTripMemory {
  TourPlace: TourPlaceCommonType | null;
  photos: PhotoWithMetaType[];
  tripMemory:
    | (TripMemory & {
        tag: TripMemoryTag[];
        group: TripMemoryGroup;
      })
    | null;
  tripMemoryCategory: TripMemoryCategory[];
}

export type AddShareTripMemoryResType = Omit<IBResFormat, 'IBparams'> & {
  IBparams: AddShareTripMemorySuccessResType | {};
};

export const addShareTripMemory = asyncWrapper(
  async (
    req: Express.IBTypedReqBody<AddShareTripMemoryRequestType>,
    res: Express.IBTypedResponse<AddShareTripMemoryResType>,
  ) => {
    try {
      const {
        tripMemoryParam,
        recommendGrade,
        // categoryIds,
        tourPlaceId,
        tripMemoryId,
        // isShare,
      } = req.body;

      const { title, comment, address, lat, lng, photos } = tripMemoryParam;

      const { locals } = req;
      const { memberId, userTokenId } = (() => {
        if (locals && locals?.grade === 'member')
          return {
            memberId: locals?.user?.id,
            userTokenId: locals?.user?.userTokenId,
          };
        // return locals?.tokenId;
        throw new IBError({
          type: 'NOTAUTHORIZED',
          message: 'member 등급만 접근 가능합니다.',
        });
      })();

      if (!userTokenId || !memberId) {
        throw new IBError({
          type: 'NOTEXISTDATA',
          message: '정상적으로 부여된 userTokenId를 가지고 있지 않습니다.',
        });
      }

      if (isNil(photos) || isEmpty(photos)) {
        throw new IBError({
          type: 'INVALIDPARAMS',
          message: 'photos는 필수 파라미터입니다.',
        });
      }
      const img = photos[0].key;

      const alreadyExist = await prisma.shareTripMemory.findUnique({
        where: {
          title_img: {
            title,
            img,
          },
        },
      });

      if (!isNil(alreadyExist)) {
        throw new IBError({
          type: 'DUPLICATEDDATA',
          message: '이미 공유기억 데이터가 존재합니다.',
        });
      }

      const createdShareTripMemory = await prisma.$transaction(async tx => {
        /// tripMemoryId 가 제공되었으면 찾아서 반환, 없으면 생성해서 반환
        /// 반환된 tripMemory는 shareTripMemory 생성할때 connect해준다.

        const createdOrFoundTripMem =
          await (async (): Promise<AddTripMemorySuccessResType> => {
            /// 1. tripMemoryId 제공되지 않았을 경우
            if (isNil(tripMemoryId)) {
              const ctx = {
                userTokenId,
                memberId,
              };
              const addResult = await addTripMemory(
                {
                  ...tripMemoryParam,
                  /// 마찬가지로 tourPlaceId가 제공되었을 경우 addTripMemory를 호출하며 포워딩해준다.
                  /// tourPlaceId가 전달되지 않으면 addTripMemory 과정에서 tourPlace를 생성한다.
                  tourPlaceId: !isNil(tourPlaceId) ? tourPlaceId : undefined,
                },
                ctx,
                tx,
              );
              return addResult;
            }
            /// 2. tripMemoryId 제공되었을 경우
            const findResult = await tx.tripMemory.findUnique({
              where: {
                id: Number(tripMemoryId),
              },
              include: {
                tag: true,
                user: true,
                group: true,
                photos: {
                  include: {
                    photoMetaInfo: {
                      include: {
                        keyword: true,
                        feature: true,
                      },
                    },
                  },
                },
                TourPlace: {
                  select: {
                    id: true,
                    createdAt: true,
                    updatedAt: true,
                    status: true,
                    tourPlaceType: true,
                    title: true,
                    lat: true,
                    lng: true,
                    address: true,
                    roadAddress: true,
                    openWeek: true,
                    contact: true,
                    postcode: true,
                    rating: true,
                    desc: true,
                    // photos: {
                    //   select: {
                    //     id: true,
                    //     key: true,
                    //     url: true,
                    //   },
                    // },
                    good: true,
                    notBad: true,
                    bad: true,
                    like: true,
                    // likeFrom: {
                    //   select: {
                    //     id: true,
                    //     nickName: true,
                    //     profileImg: true,
                    //     createdAt: true,
                    //     updatedAt: true,
                    //   },
                    // },
                    adPlaceId: true,
                  },
                },
              },
            });
            if (isNil(findResult)) {
              throw new IBError({
                type: 'INVALIDPARAMS',
                message:
                  '제공된 tripMemoryId에 해당하는 tripMemory가 없습니다.',
              });
            }
            return findResult;
          })();

        await (async () => {
          /// 만약 '기억'만 먼저 생성했다가 '공유'한 경우에는 기존에 '기억'을 생성할때 사진이 등록되어 있다.
          /// 그러나 평가는 '기억'을 생성하는 시나리오에서만 존재하므로 기존에 저장된 MAIN 타입의 사진의 eval은 결정되어지지 않은 상태일 것이다.
          /// 이것은 이후에 '공유 기억'을 생성할때 평가하는 recommendGrade 값에 따라 기존에 저장되어있던 MAIN 타입의 사진의 photoMetaInfo에서 eval을 수정해주는 과정이 필요하며 해당 과정을 이 클로저에서 처리한다.
          const mainPhoto = createdOrFoundTripMem.photos.find(
            v => v.photoMetaInfo?.type === 'MAIN',
          );

          if (isNil(mainPhoto) || isNil(mainPhoto.photoMetaInfo)) {
            throw new IBError({
              type: 'INVALIDSTATUS',
              message:
                '저장된 photos중에 MAIN 타입으로 지정된 사진이 존재하지 않습니다.',
            });
          }
          await tx.iBPhotoMetaInfo.update({
            where: {
              id: mainPhoto.photoMetaInfo.id,
            },
            data: {
              eval: recommendGrade,
            },
          });
        })();

        const { tripMemCategoryIds } = createdOrFoundTripMem;
        if (isNil(tripMemCategoryIds) || isEmpty(tripMemCategoryIds)) {
          throw new IBError({
            type: 'INVALIDSTATUS',
            message: `tripMemory에 저장된 tripMemCategoryIds가 존재하지 않습니다.`,
          });
        }
        const categoryIds = tripMemCategoryIds.split(',');

        if (isNil(categoryIds) || isEmpty(categoryIds)) {
          throw new IBError({
            type: 'INVALIDSTATUS',
            message: `tripMemory에 저장된 categoryId가 올바른 형식이 아닙니다.`,
          });
        }
        const tripMemoryCategory = await tx.tripMemoryCategory.findMany({
          where: {
            id: {
              in: categoryIds.map(v => Number(v)),
            },
          },
        });

        if (
          isNil(tripMemoryCategory) ||
          isEmpty(tripMemoryCategory) ||
          tripMemoryCategory.length !== categoryIds.length
        ) {
          const notExistIds = categoryIds.filter(id => {
            const notExist = tripMemoryCategory.find(v => v.id !== Number(id));
            return !isNil(notExist);
          });
          throw new IBError({
            type: 'NOTEXISTDATA',
            message: `${notExistIds.toString()}는 존재하지 않는 categoryIds입니다. `,
          });
        }

        const typeNTags = await categoryToIBTravelTag(tripMemoryCategory);

        const ibTravelTagIds = typeNTags.ibTravelTagIds
          .map(v => {
            if (v === null) return null;
            return {
              id: v,
            };
          })
          .filter((v): v is { id: number } => v !== null);

        const shareTripMemory = await tx.shareTripMemory.create({
          data: {
            // isShare: isShare.toUpperCase().includes('TRUE'),
            title: createdOrFoundTripMem.title,
            lat: createdOrFoundTripMem.lat,
            lng: createdOrFoundTripMem.lng,
            address: createdOrFoundTripMem.address,
            img: createdOrFoundTripMem.img,
            comment,
            user: {
              connect: {
                id: Number(memberId),
              },
            },
            tripMemoryCategory: {
              connect: categoryIds.map(v => {
                return {
                  id: Number(v),
                };
              }),
            },
            /// tripMemory의 tourPlace와 동일한 tourPlace를 shareTripMemory와 connect한다.
            tripMemory: {
              connect: {
                id: createdOrFoundTripMem.id,
              },
            },
            TourPlace: {
              connectOrCreate: {
                where: {
                  id: createdOrFoundTripMem.TourPlace?.id ?? -1,
                },
                create: {
                  title,
                  lat: Number(lat),
                  lng: Number(lng),
                  address,
                  // tourPlaceType: 'USER_SPOT',
                  tourPlaceType: typeNTags.tourPlaceType,
                  ...(!isNil(ibTravelTagIds) &&
                    !isEmpty(ibTravelTagIds) && {
                      ibTravelTag: {
                        connect: ibTravelTagIds,
                      },
                    }),
                },
              },
            },
            photos: {
              connect: createdOrFoundTripMem.photos.map(v => {
                return {
                  id: v.photoMetaInfo!.photoId,
                };
              }),
            },
          },
          include: {
            tripMemoryCategory: true,
            tripMemory: {
              include: {
                tag: true,
                group: true,
              },
            },
            photos: {
              include: {
                photoMetaInfo: {
                  include: {
                    feature: true,
                    keyword: true,
                  },
                },
              },
            },
            TourPlace: {
              select: {
                id: true,
                createdAt: true,
                updatedAt: true,
                tourPlaceType: true,
                status: true,
                title: true,
                lat: true,
                lng: true,
                address: true,
                roadAddress: true,
                openWeek: true,
                contact: true,
                postcode: true,
                rating: true,
                desc: true,
                // photos: {
                //   select: {
                //     id: true,
                //     key: true,
                //     url: true,
                //   },
                // },
                good: true,
                notBad: true,
                bad: true,
                like: true,
                // likeFrom: {
                //   select: {
                //     id: true,
                //     nickName: true,
                //     profileImg: true,
                //     createdAt: true,
                //     updatedAt: true,
                //   },
                // },
                adPlaceId: true,
              },
            },
          },
        });

        /// case1: tourPlaceId 가 제공되지 않은 tourPlace의 신규 생성일 경우에는
        /// shareTripMemory 생성 전 tripMemory의 생성단계에서 tourPlace가 같이 생성된다.
        /// 이때는 나만 보는 '기억'에서 신규 생성한 장소이므로 tourPlace가 USER_PRIV_MEMORY_SPOT 갖는데
        /// 생성된 tourPlace가 바로 공유가 되는 셈이므로 타입을 공개상태중 하나인 NEW로 바꿔준다.
        /// case2: tourPlaceId 가 제공되었을 경우는 addTripMemory 단계를 거치면서
        /// 기존에 있는 tourPlace가 tripMemory와 매칭되고 이 tourPlace를 반환했을 것이다.
        /// 이 tourPlace는 IN_USE 상태일 것이므로 아래 타입 업데이트를 거치지 않는다.

        if (
          createdOrFoundTripMem.TourPlace?.tourPlaceType ===
          ('USER_PRIV_MEMORY_SPOT' as PlaceType)
        ) {
          await tx.tourPlace.update({
            where: {
              id: createdOrFoundTripMem.TourPlace.id,
            },
            data: {
              tourPlaceType: typeNTags.tourPlaceType,
            },
          });
        }

        const recommendNPhotoUpdatePromise = (() => {
          if (recommendGrade === 'good') {
            const nextGood = shareTripMemory.TourPlace!.good + 1;
            return tx.tourPlace.update({
              where: {
                id: shareTripMemory.TourPlace!.id,
              },
              data: {
                good: nextGood,
                photos: {
                  connect: createdOrFoundTripMem.photos.map(v => {
                    return {
                      id: v.photoMetaInfo!.photoId,
                    };
                  }),
                },
              },
            });
          }
          if (recommendGrade === 'notbad') {
            const nextNotBad = shareTripMemory.TourPlace!.notBad + 1;
            return tx.tourPlace.update({
              where: {
                id: shareTripMemory.TourPlace!.id,
              },
              data: {
                notBad: nextNotBad,
                photos: {
                  connect: createdOrFoundTripMem.photos.map(v => {
                    return {
                      id: v.photoMetaInfo!.photoId,
                    };
                  }),
                },
              },
            });
          }
          const nextBad = shareTripMemory.TourPlace!.bad + 1;
          return tx.tourPlace.update({
            where: {
              id: shareTripMemory.TourPlace!.id,
            },
            data: {
              bad: nextBad,
              photos: {
                connect: createdOrFoundTripMem.photos.map(v => {
                  return {
                    id: v.photoMetaInfo!.photoId,
                  };
                }),
              },
            },
          });
        })();

        await recommendNPhotoUpdatePromise;

        return shareTripMemory;
      });

      res.json({
        ...ibDefs.SUCCESS,
        IBparams: createdShareTripMemory,
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

        if (err.type === 'NOTAUTHORIZED') {
          console.error(err);
          res.status(403).json({
            ...ibDefs.NOTAUTHORIZED,
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

        if (err.type === 'DUPLICATEDDATA') {
          console.error(err);
          res.status(409).json({
            ...ibDefs.NOTEXISTDATA,
            IBdetail: (err as Error).message,
            IBparams: {} as object,
          });
          return;
        }

        if (err.type === 'DBTRANSACTIONERROR') {
          console.error(err);
          res.status(500).json({
            ...ibDefs.DBTRANSACTIONERROR,
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

export interface GetNrbyPlaceListWithGeoLocRequestType {
  minLat: string;
  minLng: string;
  maxLat: string;
  maxLng: string;
  take: string;
  lastId: string; /// pagination을 위해 사용될 직전 검색의 마지막 검색된 tourPlaceId
}
export interface GetNrbyPlaceListWithGeoLocSuccessResType {
  totalCount: number;
  returnedCount: number;
  list: TourPlace[];
}

export type GetNrbyPlaceListWithGeoLocResType = Omit<
  IBResFormat,
  'IBparams'
> & {
  IBparams: GetNrbyPlaceListWithGeoLocSuccessResType | {};
};

export interface ContextGetNrbyPlaceListWithGeoLoc extends IBContext {}

export const getNrbyPlaceListWithGeoLoc = async (
  param: GetNrbyPlaceListWithGeoLocRequestType,
  ctx: ContextGetNrbyPlaceListWithGeoLoc,
): Promise<GetNrbyPlaceListWithGeoLocSuccessResType> => {
  const { minLat, minLng, maxLat, maxLng, take = '10', lastId } = param;
  const { memberId, userTokenId } = ctx;

  if (!userTokenId || !memberId) {
    throw new IBError({
      type: 'NOTEXISTDATA',
      message: '정상적으로 부여된 userTokenId를 가지고 있지 않습니다.',
    });
  }

  const count = await prisma.tourPlace.aggregate({
    where: {
      AND: [
        { lat: { gte: Number(minLat) } },
        { lat: { lt: Number(maxLat) } },
        { lng: { gte: Number(minLng) } },
        { lng: { lt: Number(maxLng) } },
      ],
    },
    _count: {
      id: true,
    },
  });
  const foundTourPlace = await prisma.tourPlace.findMany({
    where: {
      AND: [
        /// 기본적으로 IN_USE 상태의 tourPlace만 반환되어야 하나
        /// 내가 남긴 글이 최초로 작성되는 경우에는 tourPlace가 새로 생성되기 때문에 IN_USE가 아니어도 내가 남긴글와 관계된 tourPlace는 반환되어야 한다.
        {
          OR: [
            { status: 'IN_USE' },
            {
              shareTripMemory: {
                some: {
                  userId: ctx.memberId,
                },
              },
            },
            {
              shareTripMemory: {
                some: {
                  user: {
                    userTokenId: ctx.userTokenId,
                  },
                },
              },
            },
            {
              tripMemory: {
                some: {
                  userId: ctx.memberId,
                },
              },
            },
            {
              tripMemory: {
                some: {
                  user: {
                    userTokenId: ctx.userTokenId,
                  },
                },
              },
            },
          ],
        },

        { lat: { gte: Number(minLat) } },
        { lat: { lt: Number(maxLat) } },
        { lng: { gte: Number(minLng) } },
        { lng: { lt: Number(maxLng) } },
      ],
    },
    take: Number(take),
    ...(!isEmpty(lastId) && {
      cursor: {
        id: Number(lastId) + 1,
      },
    }),
  });
  return {
    // eslint-disable-next-line no-underscore-dangle
    totalCount: count._count.id ?? 0,
    returnedCount: foundTourPlace.length,
    list: foundTourPlace,
  };
};

export const getNrbyPlaceListWithGeoLocWrapper = asyncWrapper(
  async (
    req: Express.IBTypedReqBody<GetNrbyPlaceListWithGeoLocRequestType>,
    res: Express.IBTypedResponse<GetNrbyPlaceListWithGeoLocResType>,
  ) => {
    try {
      const param = req.body;
      const { locals } = req;
      const ctx: ContextGetNrbyPlaceListWithGeoLoc = (() => {
        if (locals && locals?.grade === 'member')
          return {
            memberId: locals?.user?.id,
            userTokenId: locals?.user?.userTokenId,
          };
        // return locals?.tokenId;
        throw new IBError({
          type: 'NOTAUTHORIZED',
          message: 'member 등급만 접근 가능합니다.',
        });
      })();

      const result = await getNrbyPlaceListWithGeoLoc(param, ctx);
      res.json({
        ...ibDefs.SUCCESS,
        IBparams: result,
      });
    } catch (err) {
      if (err instanceof IBError) {
        if (err.type === 'NOTAUTHORIZED') {
          console.error(err);
          res.status(403).json({
            ...ibDefs.NOTAUTHORIZED,
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

        if (err.type === 'DBTRANSACTIONERROR') {
          console.error(err);
          res.status(500).json({
            ...ibDefs.DBTRANSACTIONERROR,
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

export interface AddReplyToShareTripMemoryRequestType {
  shareTripMemoryId?: string; /// 추가하는 댓글이 달려야 하는 공유 기억 id
  parentReplyId?: string; /// 추가하는 댓글이 대댓글인경우 상위 댓글의 id
  replyText: string; /// 내용
}
export interface AddReplyToShareTripMemorySuccessResType
  extends ReplyForShareTripMemory {
  parentReply: ReplyForShareTripMemory | null;
}

export type AddReplyToShareTripMemoryResType = Omit<IBResFormat, 'IBparams'> & {
  IBparams: AddReplyToShareTripMemorySuccessResType | {};
};

export const addReplyToShareTripMemory = asyncWrapper(
  async (
    req: Express.IBTypedReqBody<AddReplyToShareTripMemoryRequestType>,
    res: Express.IBTypedResponse<AddReplyToShareTripMemoryResType>,
  ) => {
    try {
      const {
        shareTripMemoryId: userInputShareTripMemId,
        parentReplyId,
        replyText = '',
      } = req.body;
      const { locals } = req;
      const { memberId, userTokenId } = (() => {
        if (locals && locals?.grade === 'member')
          return {
            memberId: locals?.user?.id,
            userTokenId: locals?.user?.userTokenId,
          };
        // return locals?.tokenId;
        throw new IBError({
          type: 'NOTAUTHORIZED',
          message: 'member 등급만 접근 가능합니다.',
        });
      })();

      if (!userTokenId || !memberId) {
        throw new IBError({
          type: 'NOTEXISTDATA',
          message: '정상적으로 부여된 userTokenId를 가지고 있지 않습니다.',
        });
      }

      if (isNil(userInputShareTripMemId) && isNil(parentReplyId)) {
        throw new IBError({
          type: 'INVALIDENVPARAMS',
          message:
            'shareTripMemoryId 또는 parentReplyId 둘중 하나는 값이 있어야 합니다.',
        });
      }

      const parentRpl = await (async () => {
        // if (isNil(userInputShareTripMemId) && !isNil(parentReplyId)) {
        if (!isNil(parentReplyId)) {
          const parentReply = await prisma.replyForShareTripMemory.findUnique({
            where: {
              id: Number(parentReplyId),
            },
            select: {
              shareTripMemoryId: true,
              parentReplyId: true,
              userId: true,
            },
          });
          if (!parentReply) {
            throw new IBError({
              type: 'INVALIDPARAMS',
              message: '존재하지 않는 parentReplyId입니다.',
            });
          }

          if (
            !isNil(userInputShareTripMemId) &&
            parentReply.shareTripMemoryId !== Number(userInputShareTripMemId)
          ) {
            throw new IBError({
              type: 'INVALIDSTATUS',
              message:
                '입력한 shareTripMemoryId과 parentReplyId의 관계가 올바르지 않습니다.(parentReplyId가 속한 shareTripMemory가 입력된 shareTripMemoryId가 아닙니다.)',
            });
          }

          if (!isNil(parentReply.parentReplyId) && !isNil(parentReplyId)) {
            throw new IBError({
              type: 'INVALIDSTATUS',
              message: '대댓글 기능 이상은 지원하지 않습니다.',
            });
          }

          return parentReply;
        }
        return null;
      })();

      const shareTripMemoryId = isNil(parentRpl)
        ? Number(userInputShareTripMemId)
        : parentRpl.shareTripMemoryId;

      const createdOne = await prisma.$transaction(async tx => {
        await tx.notiNewCommentOnShareTripMemory.create({
          data: {
            userId: Number(memberId),
            shareTripMemoryId,
          },
        });
        const result = await tx.replyForShareTripMemory.create({
          data: {
            text: replyText,
            shareTripMemory: {
              connect: {
                id: shareTripMemoryId,
              },
            },
            user: {
              connect: {
                id: Number(memberId),
              },
            },
            ...(parentReplyId && {
              parentReply: {
                connect: {
                  id: Number(parentReplyId),
                },
              },
            }),
          },
          include: {
            parentReply: true,
            shareTripMemory: {
              select: {
                userId: true,
                tourPlaceId: true,
              },

              // select: {
              //   user: true,

              // },
            },
          },
        });
        return result;
      });

      if (!isNil(createdOne.shareTripMemory.userId)) {
        /// 1. 댓글이 달린 shareTripMemory 소유자
        let notiMsg: SysNotiMessageType = {
          userId: `${createdOne.shareTripMemory.userId}`,
          // userRole: createdOne.shareTripMemory.user
          createdAt: new Date(createdOne.createdAt).toISOString(),
          message: '내 게시물에 댓글이 달렸어요',
          type: 'REPLYFORMYSHARETRIPMEM',
          additionalInfo: {
            replyAlarm: {
              tourPlaceId: createdOne.shareTripMemory.tourPlaceId!.toString(),
              shareTripMemoryId: createdOne.shareTripMemoryId.toString(),
              replyId: createdOne.id.toString(),
            },
          },
        };
        await putInSysNotiMessage(notiMsg);
        await pubNotiPush({
          // from: 'system',
          ...notiMsg,
          userId: `${createdOne.shareTripMemory.userId}`,
          pushType: 'SYSTEMNOTI',
        });

        /// 2. 대댓글인경우 부모 댓글 쓴사람
        if (!isNil(parentRpl) && !isNil(parentRpl.userId)) {
          /// 댓글을 썼던 사용자가 삭제될 경우 userId가 null일수도..?
          notiMsg = {
            userId: `${parentRpl.userId}`,
            // userRole: createdOne.shareTripMemory.user
            createdAt: new Date(createdOne.createdAt).toISOString(),
            message: '내 게시물에 댓글이 달렸어요',
            type: 'REPLYFORMYREPLY',
            additionalInfo: {
              replyAlarm: {
                tourPlaceId: createdOne.shareTripMemory.tourPlaceId!.toString(),
                shareTripMemoryId: createdOne.shareTripMemoryId.toString(),
                replyId: createdOne.id.toString(),
              },
            },
          };
          await putInSysNotiMessage(notiMsg);
          await pubNotiPush({
            // from: 'system',
            ...notiMsg,
            userId: `${parentRpl.userId}`,
            pushType: 'SYSTEMNOTI',
          });
        }
      }

      res.json({
        ...ibDefs.SUCCESS,
        IBparams: createdOne,
      });
    } catch (err) {
      if (err instanceof IBError) {
        if (err.type === 'NOTAUTHORIZED') {
          console.error(err);
          res.status(403).json({
            ...ibDefs.NOTAUTHORIZED,
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

        if (err.type === 'DBTRANSACTIONERROR') {
          console.error(err);
          res.status(500).json({
            ...ibDefs.DBTRANSACTIONERROR,
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

        if (err.type === 'INVALIDENVPARAMS') {
          console.error(err);
          res.status(500).json({
            ...ibDefs.INVALIDENVPARAMS,
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

export interface GetReplyListByShareTripMemRequestType {
  shareTripMemoryId?: string; /// 조회하려는 댓글이 속한 공유기억(shareTripMemory) id
}
export interface GetReplyListByShareTripMemSuccessResType {
  shareTripMemoryId: number;
  id: number;
  text: string;
  createdAt: Date;
  updatedAt: Date;
  user: {
    id: number;
    nickName: string;
    profileImg: string | null;
  } | null;
  childrenReplies: {
    id: number;
    text: string;
    createdAt: Date;
    updatedAt: Date;
    parentReplyId: number;
    user: {
      id: number;
      nickName: string;
      profileImg: string;
    };
  }[];
}

export type GetReplyListByShareTripMemResType = Omit<
  IBResFormat,
  'IBparams'
> & {
  IBparams: GetReplyListByShareTripMemSuccessResType[] | {};
};

export const getReplyListByShareTripMem = asyncWrapper(
  async (
    req: Express.IBTypedReqBody<GetReplyListByShareTripMemRequestType>,
    res: Express.IBTypedResponse<GetReplyListByShareTripMemResType>,
  ) => {
    try {
      const { shareTripMemoryId } = req.body;
      const { locals } = req;
      const { memberId, userTokenId } = (() => {
        if (locals && locals?.grade === 'member')
          return {
            memberId: locals?.user?.id,
            userTokenId: locals?.user?.userTokenId,
          };
        // return locals?.tokenId;
        throw new IBError({
          type: 'NOTAUTHORIZED',
          message: 'member 등급만 접근 가능합니다.',
        });
      })();

      if (!userTokenId || !memberId) {
        throw new IBError({
          type: 'NOTEXISTDATA',
          message: '정상적으로 부여된 userTokenId를 가지고 있지 않습니다.',
        });
      }

      if (isNil(shareTripMemoryId)) {
        throw new IBError({
          type: 'INVALIDENVPARAMS',
          message: 'shareTripMemoryId는 필수 파라미터입니다.',
        });
      }

      const found = await prisma.replyForShareTripMemory.findMany({
        where: {
          shareTripMemoryId: Number(shareTripMemoryId),
          parentReplyId: null,
        },
        select: {
          id: true,
          text: true,
          createdAt: true,
          updatedAt: true,
          shareTripMemoryId: true,
          user: {
            select: {
              id: true,
              nickName: true,
              profileImg: true,
            },
          },
          childrenReplies: {
            select: {
              id: true,
              text: true,
              createdAt: true,
              updatedAt: true,
              parentReplyId: true,
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
      });

      res.json({
        ...ibDefs.SUCCESS,
        IBparams: await Promise.all(
          found.map(async v => {
            return {
              ...v,
              user: {
                ...v.user,
                ...(!isNil(v.user) &&
                  !isNil(v.user.profileImg) && {
                    profileImg: await getUserProfileUrl(v.user),
                    // profileImg: v.user!.profileImg.includes('http')
                    //   ? v.user!.profileImg
                    //   : await getS3SignedUrl(v.user!.profileImg),
                  }),
              },
              childrenReplies: await Promise.all(
                v.childrenReplies.map(async v2 => {
                  return {
                    ...v2,
                    user: {
                      ...v2.user,
                      ...(!isNil(v2.user) &&
                        !isNil(v2.user.profileImg) && {
                          profileImg: await getUserProfileUrl(v2.user),
                          // profileImg: v2.user!.profileImg.includes('http')
                          //   ? v2.user!.profileImg
                          //   : await getS3SignedUrl(v2.user!.profileImg),
                        }),
                    },
                  };
                }),
              ),
            };
          }),
        ),
      });
    } catch (err) {
      if (err instanceof IBError) {
        if (err.type === 'NOTAUTHORIZED') {
          console.error(err);
          res.status(403).json({
            ...ibDefs.NOTAUTHORIZED,
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

        if (err.type === 'DBTRANSACTIONERROR') {
          console.error(err);
          res.status(500).json({
            ...ibDefs.DBTRANSACTIONERROR,
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

export interface DelShareTripMemReplyRequestType {
  replyId?: string; /// 삭제하려는 공유기억 댓글 id
}

export type DelShareTripMemReplyResType = Omit<IBResFormat, 'IBparams'> & {
  IBparams: {};
};

export const delShareTripMemReply = asyncWrapper(
  async (
    req: Express.IBTypedReqBody<DelShareTripMemReplyRequestType>,
    res: Express.IBTypedResponse<DelShareTripMemReplyResType>,
  ) => {
    try {
      const { replyId } = req.body;
      const { locals } = req;
      const { memberId, userTokenId } = (() => {
        if (locals && locals?.grade === 'member')
          return {
            memberId: locals?.user?.id,
            userTokenId: locals?.user?.userTokenId,
          };
        // return locals?.tokenId;
        throw new IBError({
          type: 'NOTAUTHORIZED',
          message: 'member 등급만 접근 가능합니다.',
        });
      })();

      if (!userTokenId || !memberId) {
        throw new IBError({
          type: 'NOTEXISTDATA',
          message: '정상적으로 부여된 userTokenId를 가지고 있지 않습니다.',
        });
      }

      if (isNil(replyId)) {
        throw new IBError({
          type: 'INVALIDENVPARAMS',
          message: 'replyId는 필수 파라미터입니다.',
        });
      }

      const checkExist = await prisma.replyForShareTripMemory.findUnique({
        where: {
          id: Number(replyId),
        },
        select: {
          userId: true,
        },
      });

      if (isNil(checkExist)) {
        throw new IBError({
          type: 'INVALIDENVPARAMS',
          message: '존재하지 않는 replyId입니다.',
        });
      }

      if (checkExist.userId !== Number(memberId)) {
        throw new IBError({
          type: 'INVALIDENVPARAMS',
          message: '다른 유저의 댓글은 삭제 권한이 없습니다.',
        });
      }

      await prisma.replyForShareTripMemory.delete({
        where: {
          id: Number(replyId),
        },
      });

      res.json({
        ...ibDefs.SUCCESS,
        IBparams: {},
      });
    } catch (err) {
      if (err instanceof IBError) {
        if (err.type === 'NOTAUTHORIZED') {
          console.error(err);
          res.status(403).json({
            ...ibDefs.NOTAUTHORIZED,
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

        if (err.type === 'DBTRANSACTIONERROR') {
          console.error(err);
          res.status(500).json({
            ...ibDefs.DBTRANSACTIONERROR,
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

export interface ModifyReplyToShareTripMemoryRequestType {
  replyId: string;
  replyText: string;
}
export interface ModifyReplyToShareTripMemorySuccessResType
  extends ReplyForShareTripMemory {
  parentReply: ReplyForShareTripMemory | null;
  childrenReplies: ReplyForShareTripMemory | null;
}

export type ModifyReplyToShareTripMemoryResType = Omit<
  IBResFormat,
  'IBparams'
> & {
  IBparams: ModifyReplyToShareTripMemorySuccessResType | {};
};

export const modifyReplyToShareTripMemory = asyncWrapper(
  async (
    req: Express.IBTypedReqBody<ModifyReplyToShareTripMemoryRequestType>,
    res: Express.IBTypedResponse<ModifyReplyToShareTripMemoryResType>,
  ) => {
    try {
      const { replyId, replyText } = req.body;
      const { locals } = req;
      const { memberId, userTokenId } = (() => {
        if (locals && locals?.grade === 'member')
          return {
            memberId: locals?.user?.id,
            userTokenId: locals?.user?.userTokenId,
          };
        // return locals?.tokenId;
        throw new IBError({
          type: 'NOTAUTHORIZED',
          message: 'member 등급만 접근 가능합니다.',
        });
      })();

      if (!userTokenId || !memberId) {
        throw new IBError({
          type: 'NOTEXISTDATA',
          message: '정상적으로 부여된 userTokenId를 가지고 있지 않습니다.',
        });
      }

      if (isNil(replyId) || isNil(replyText)) {
        throw new IBError({
          type: 'INVALIDENVPARAMS',
          message: 'replyId와 replyText는 필수 파라미터입니다.',
        });
      }

      const target = await prisma.replyForShareTripMemory.findUnique({
        where: {
          id: Number(replyId),
        },
      });

      if (isNil(target)) {
        throw new IBError({
          type: 'NOTEXISTDATA',
          message: 'replyId에 해당하는 댓글이 없습니다.',
        });
      }

      if (target.userId !== Number(memberId)) {
        throw new IBError({
          type: 'NOTEXISTDATA',
          message:
            'replyId에 해당하는 댓글은 다른 유저의 댓글로 수정 권한이 없습니다.',
        });
      }

      const updatedOne = await prisma.replyForShareTripMemory.update({
        where: {
          id: Number(replyId),
        },
        data: {
          text: replyText,
        },
        include: {
          parentReply: true,
          childrenReplies: true,
        },
      });

      res.json({
        ...ibDefs.SUCCESS,
        IBparams: updatedOne,
      });
    } catch (err) {
      if (err instanceof IBError) {
        if (err.type === 'NOTAUTHORIZED') {
          console.error(err);
          res.status(403).json({
            ...ibDefs.NOTAUTHORIZED,
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

        if (err.type === 'DBTRANSACTIONERROR') {
          console.error(err);
          res.status(500).json({
            ...ibDefs.DBTRANSACTIONERROR,
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

export interface DeleteReplyToShareTripMemoryRequestType {
  replyId: string;
}
export interface DeleteReplyToShareTripMemorySuccessResType {}

export type DeleteReplyToShareTripMemoryResType = Omit<
  IBResFormat,
  'IBparams'
> & {
  IBparams: DeleteReplyToShareTripMemorySuccessResType | {};
};

export const deleteReplyToShareTripMemory = asyncWrapper(
  async (
    req: Express.IBTypedReqBody<DeleteReplyToShareTripMemoryRequestType>,
    res: Express.IBTypedResponse<DeleteReplyToShareTripMemoryResType>,
  ) => {
    try {
      const { replyId } = req.body;
      const { locals } = req;
      const { memberId, userTokenId } = (() => {
        if (locals && locals?.grade === 'member')
          return {
            memberId: locals?.user?.id,
            userTokenId: locals?.user?.userTokenId,
          };
        // return locals?.tokenId;
        throw new IBError({
          type: 'NOTAUTHORIZED',
          message: 'member 등급만 접근 가능합니다.',
        });
      })();

      if (!userTokenId || !memberId) {
        throw new IBError({
          type: 'NOTEXISTDATA',
          message: '정상적으로 부여된 userTokenId를 가지고 있지 않습니다.',
        });
      }

      if (isNil(replyId)) {
        throw new IBError({
          type: 'INVALIDENVPARAMS',
          message: 'replyId는 필수 파라미터입니다.',
        });
      }

      const target = await prisma.replyForShareTripMemory.findUnique({
        where: {
          id: Number(replyId),
        },
      });

      if (isNil(target)) {
        throw new IBError({
          type: 'NOTEXISTDATA',
          message: 'replyId에 해당하는 댓글이 없습니다.',
        });
      }

      if (target.userId !== Number(memberId)) {
        throw new IBError({
          type: 'NOTEXISTDATA',
          message:
            'replyId에 해당하는 댓글은 다른 유저의 댓글로 수정 권한이 없습니다.',
        });
      }

      await prisma.replyForShareTripMemory.delete({
        where: {
          id: Number(replyId),
        },
      });

      res.json({
        ...ibDefs.SUCCESS,
        IBparams: {},
      });
    } catch (err) {
      const isPrismaError = (
        v: unknown,
      ): v is Prisma.PrismaClientKnownRequestError => {
        if (v instanceof Prisma.PrismaClientKnownRequestError) return true;
        return false;
      };

      if (err instanceof IBError) {
        if (err.type === 'NOTAUTHORIZED') {
          console.error(err);
          res.status(403).json({
            ...ibDefs.NOTAUTHORIZED,
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

        if (err.type === 'DBTRANSACTIONERROR') {
          console.error(err);
          res.status(500).json({
            ...ibDefs.DBTRANSACTIONERROR,
            IBdetail: (err as Error).message,
            IBparams: {} as object,
          });
          return;
        }
      } else if (isPrismaError(err)) {
        if (
          err.code === 'P2003' &&
          err.message.includes(
            'Foreign key constraint failed on the field: `parentReplyId`',
          )
        ) {
          console.error(err);
          res.status(500).json({
            ...ibDefs.DBTRANSACTIONERROR,
            IBdetail: '대댓글이 존재하는 댓글입니다. 삭제할수 없습니다.',
            IBparams: {} as object,
          });
          return;
        }
      }
      throw err;
    }
  },
);

export interface GetShareTripMemListRequestType {
  shareTripMemoryId?: string; /// 단일 조회를 원할 경우 조회를 원하는 항목의 id
  orderBy?: string; /// 추천순(recommend), 좋아요순(like), 최신순(latest) 정렬 default 최신순
  lastId?: string; /// 커서 기반 페이지네이션으로 직전 조회에서 확인한 마지막 ShareTripMemory id. undefined라면 처음부터 조회한다.
  take: string; /// default 10
  categoryKeyword: string; /// 카테고리 검색 키워드
  userId: string; /// 특정하고자 하는 userId
  minLat?: string; /// 지도에서 shareTripMemory 위치 기반으로 검색할 경우
  minLng?: string;
  maxLat?: string;
  maxLng?: string;
}
export interface GetShareTripMemListSuccessResType extends ShareTripMemory {
  // TourPlace: {
  //   id: number;
  //   gl_name: string | null;
  //   vj_title: string | null;
  //   title: string | null;
  //   good: number;
  //   like: number;
  // } | null;
  TourPlace: TourPlaceCommonType | null;
  user: {
    id: number;
    nickName: string;
    profileImg: string | null;
    tripCreator: {
      nickName: string;
    }[];
  };
  photos: PhotoWithMetaType[];
}

export type GetShareTripMemListResType = Omit<IBResFormat, 'IBparams'> & {
  IBparams: GetShareTripMemListSuccessResType[] | {};
};

export const getShareTripMemList = asyncWrapper(
  async (
    req: Express.IBTypedReqBody<GetShareTripMemListRequestType>,
    res: Express.IBTypedResponse<GetShareTripMemListResType>,
  ) => {
    try {
      const {
        shareTripMemoryId,
        orderBy = 'latest',
        lastId,
        take = '10',
        categoryKeyword = '',
        userId,
        minLat,
        maxLat,
        minLng,
        maxLng,
      } = req.body;
      const { locals } = req;
      const userTokenId = (() => {
        if (locals && locals?.grade === 'member')
          return locals?.user?.userTokenId;

        return locals?.tokenId;

        // throw new IBError({
        //   type: 'NOTAUTHORIZED',
        //   message: 'member 등급만 접근 가능합니다.',
        // });
      })();

      if (!userTokenId) {
        throw new IBError({
          type: 'NOTEXISTDATA',
          message: '정상적으로 부여된 userTokenId를 가지고 있지 않습니다.',
        });
      }

      if (!isNil(shareTripMemoryId)) {
        const foundShareTripMem = await prisma.shareTripMemory.findUnique({
          where: {
            id: Number(shareTripMemoryId),
          },
          include: {
            tripMemoryCategory: true,
            ReplyForShareTripMemory: {
              include: {
                childrenReplies: true,
              },
            },
            user: {
              select: {
                id: true,
                nickName: true,
                profileImg: true,
                tripCreator: {
                  select: {
                    nickName: true,
                  },
                },
              },
            },
            TourPlace: {
              select: {
                id: true,
                tourPlaceType: true,
                status: true,
                createdAt: true,
                updatedAt: true,
                title: true,
                lat: true,
                lng: true,
                address: true,
                roadAddress: true,
                openWeek: true,
                contact: true,
                postcode: true,
                rating: true,
                desc: true,
                // photos: {
                //   select: {
                //     id: true,
                //     key: true,
                //     url: true,
                //   },
                // },
                good: true,
                notBad: true,
                bad: true,
                like: true,
                // likeFrom: {
                //   select: {
                //     id: true,
                //     nickName: true,
                //     profileImg: true,
                //     createdAt: true,
                //     updatedAt: true,
                //   },
                // },
                adPlaceId: true,
              },
            },
            photos: {
              include: {
                photoMetaInfo: {
                  include: {
                    feature: true,
                    keyword: true,
                  },
                },
              },
            },
          },
        });

        if (isNil(foundShareTripMem)) {
          throw new IBError({
            type: 'NOTEXISTDATA',
            message: '존재하지 않는 shareTripMemoryId입니다.',
          });
        }
        // if (!foundShareTripMem.isShare) {
        //   throw new IBError({
        //     type: 'INVALIDSTATUS',
        //     message: '공유상태의 shareTripMemoryId가 아닙니다.',
        //   });
        // }
        res.json({
          ...ibDefs.SUCCESS,
          IBparams: [
            {
              ...foundShareTripMem,
              img: await getAccessableUrl(foundShareTripMem.img),
              // img: foundShareTripMem.img.includes('http')
              //   ? foundShareTripMem.img
              //   : await getS3SignedUrl(foundShareTripMem.img),
              ...(!isNil(foundShareTripMem.user) && {
                user: {
                  ...foundShareTripMem.user,
                  ...(!isNil(foundShareTripMem.user.profileImg) && {
                    profileImg: await getUserProfileUrl(foundShareTripMem.user),
                    // profileImg: profileImg.includes('http')
                    //   ? profileImg
                    //   : await getS3SignedUrl(profileImg),
                  }),
                },
              }),

              photos: isNil(foundShareTripMem.photos)
                ? null
                : await Promise.all(
                    foundShareTripMem.photos.map(getIBPhotoUrl),
                  ),
            },
          ],
        });
        return;
      }

      const foundShareTripMemList = await prisma.shareTripMemory.findMany({
        where: {
          AND: [
            {
              tripMemoryCategory: {
                some: {
                  name: {
                    contains: categoryKeyword,
                  },
                },
              },
            },
            { userId: Number(userId) },
            {
              ...(!isNil(minLat) &&
                !isEmpty(minLat) &&
                !isNaN(Number(minLat)) && {
                  lat: { gte: Number(minLat) },
                }),
            },
            {
              ...(!isNil(maxLat) &&
                !isEmpty(maxLat) &&
                !isNaN(Number(maxLat)) && {
                  lat: { lt: Number(maxLat) },
                }),
            },
            {
              ...(!isNil(minLng) &&
                !isEmpty(minLng) &&
                !isNaN(Number(minLng)) && {
                  lng: { gte: Number(minLng) },
                }),
            },
            {
              ...(!isNil(maxLng) &&
                !isEmpty(maxLng) &&
                !isNaN(Number(maxLng)) && {
                  lng: { lt: Number(maxLng) },
                }),
            },
          ],
        },
        ...(isNil(lastId) && {
          take: Number(take),
        }),
        ...(!isNil(lastId) && {
          take: Number(take) + 1,
          cursor: {
            id: Number(lastId),
          },
        }),
        include: {
          tripMemoryCategory: true,
          user: {
            select: {
              id: true,
              nickName: true,
              profileImg: true,
              tripCreator: {
                select: {
                  nickName: true,
                },
              },
            },
          },
          TourPlace: {
            select: {
              id: true,
              tourPlaceType: true,
              status: true,
              createdAt: true,
              updatedAt: true,
              title: true,
              lat: true,
              lng: true,
              address: true,
              roadAddress: true,
              openWeek: true,
              contact: true,
              postcode: true,
              rating: true,
              desc: true,
              // photos: {
              //   select: {
              //     id: true,
              //     key: true,
              //     url: true,
              //   },
              // },
              good: true,
              notBad: true,
              bad: true,
              like: true,
              // likeFrom: {
              //   select: {
              //     id: true,
              //     nickName: true,
              //     profileImg: true,
              //     createdAt: true,
              //     updatedAt: true,
              //   },
              // },
              adPlaceId: true,
            },
          },
          photos: {
            include: {
              photoMetaInfo: {
                include: {
                  keyword: true,
                  feature: true,
                },
              },
            },
          },
        },
        ...(orderBy.toUpperCase().includes('LATEST') && {
          orderBy: {
            id: 'desc',
          },
        }),
        ...(orderBy.toUpperCase().includes('RECOMMEND') && {
          orderBy: {
            TourPlace: {
              good: 'desc',
            },
          },
        }),
        ...(orderBy.toUpperCase().includes('LIKE') && {
          orderBy: {
            like: 'desc',
          },
        }),
      });

      if (!isNil(lastId)) foundShareTripMemList.shift();

      res.json({
        ...ibDefs.SUCCESS,
        IBparams: await Promise.all(
          foundShareTripMemList.map(async v => {
            // const userImg = await (() => {
            //   const { profileImg } = v.user;
            //   if (!isNil(profileImg)) {
            //     return getAccessableUrl(profileImg);
            //     // if (profileImg.includes('http')) return profileImg;
            //     // return getS3SignedUrl(profileImg);
            //   }
            //   return null;
            // })();

            const ret = {
              ...v,
              img: await getAccessableUrl(v.img),
              user: {
                ...v.user,
                profileImg: await getUserProfileUrl(v.user),
              },
              photos: isNil(v.photos)
                ? null
                : await Promise.all(v.photos.map(getIBPhotoUrl)),
            };

            // return omit(ret, ['TourPlace']);
            return ret;
          }),
        ),
      });
    } catch (err) {
      const isPrismaError = (
        v: unknown,
      ): v is Prisma.PrismaClientKnownRequestError => {
        if (v instanceof Prisma.PrismaClientKnownRequestError) return true;
        return false;
      };

      if (err instanceof IBError) {
        if (err.type === 'NOTAUTHORIZED') {
          console.error(err);
          res.status(403).json({
            ...ibDefs.NOTAUTHORIZED,
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
        if (err.type === 'INVALIDSTATUS') {
          console.error(err);
          res.status(400).json({
            ...ibDefs.INVALIDSTATUS,
            IBdetail: (err as Error).message,
            IBparams: {} as object,
          });
          return;
        }

        if (err.type === 'DBTRANSACTIONERROR') {
          console.error(err);
          res.status(500).json({
            ...ibDefs.DBTRANSACTIONERROR,
            IBdetail: (err as Error).message,
            IBparams: {} as object,
          });
          return;
        }
      } else if (isPrismaError(err)) {
        if (
          err.code === 'P2003' &&
          err.message.includes(
            'Foreign key constraint failed on the field: `parentReplyId`',
          )
        ) {
          console.error(err);
          res.status(500).json({
            ...ibDefs.DBTRANSACTIONERROR,
            IBdetail: '대댓글이 존재하는 댓글입니다. 삭제할수 없습니다.',
            IBparams: {} as object,
          });
          return;
        }
      }
      throw err;
    }
  },
);

export interface GetShareTripMemListByPlaceRequestType {
  tourPlaceId?: string; /// 단일 tourPlaceId 조회
  orderBy?: string; /// 추천순(recommend), 좋아요순(like), 최신순(latest) 정렬 default 최신순
  lastId?: string; /// 커서 기반 페이지네이션으로 직전 조회에서 확인한 마지막 tourPlace id. undefined라면 처음부터 조회한다.
  take: string; /// default 10
  categoryKeyword: string; /// 카테고리 검색 키워드
  shareTripMemory?: {
    orderBy: string; /// 좋아요순(like), 최신순(latest) 정렬 default 최신순
  };
  minLat?: string; /// 지도에서 tourPlace 위치 기반으로 검색할 경우
  minLng?: string;
  maxLat?: string;
  maxLng?: string;
}
export interface GetShareTripMemListByPlaceSuccessResType
  extends TourPlaceCommonType {
  // id: number;
  // title: string | null;
  // shareTripMemory: (ShareTripMemory & {
  //   user: {
  //     id: number;
  //     tripCreator: {
  //       nickName: string;
  //     }[];
  //     nickName: string;
  //     profileImg: string | null;
  //   };
  //   tripMemoryCategory: TripMemoryCategory[];
  // })[];
  // gl_name: string | null;
  // vj_title: string | null;
  ibTravelTag: IBTravelTag[];
  shareTripMemory: ShareTripMemory & {
    photos: PhotoWithMetaType[];
    tripMemoryCategory: TripMemoryCategory[];
    user: {
      id: number;
      nickName: string | null;
      profileImg: string | null;
      tripCreator: {
        nickName: string | null;
      };
    };
  };
}

export type GetShareTripMemListByPlaceResType = Omit<
  IBResFormat,
  'IBparams'
> & {
  IBparams: GetShareTripMemListByPlaceSuccessResType[] | {};
};

export const getShareTripMemListByPlace = asyncWrapper(
  async (
    req: Express.IBTypedReqBody<GetShareTripMemListByPlaceRequestType>,
    res: Express.IBTypedResponse<GetShareTripMemListByPlaceResType>,
  ) => {
    try {
      const {
        tourPlaceId,
        orderBy = 'latest',
        lastId,
        take = '10',
        categoryKeyword = '',
        shareTripMemory,
        minLat,
        maxLat,
        minLng,
        maxLng,
      } = req.body;
      const { locals } = req;
      const userTokenId = (() => {
        if (locals && locals?.grade === 'member')
          return locals?.user?.userTokenId;

        return locals?.tokenId;

        // throw new IBError({
        //   type: 'NOTAUTHORIZED',
        //   message: 'member 등급만 접근 가능합니다.',
        // });
      })();

      if (!userTokenId) {
        throw new IBError({
          type: 'NOTEXISTDATA',
          message: '정상적으로 부여된 userTokenId를 가지고 있지 않습니다.',
        });
      }

      const tourPlaceList = await prisma.tourPlace.findMany({
        where: {
          AND: [
            { status: 'IN_USE' },
            { id: isNil(tourPlaceId) ? undefined : Number(tourPlaceId) },
            {
              ...(isNil(tourPlaceId) &&
                !isNil(minLat) &&
                !isEmpty(minLat) &&
                !isNaN(Number(minLat)) && {
                  lat: { gte: Number(minLat) },
                }),
            },
            {
              ...(isNil(tourPlaceId) &&
                !isNil(maxLat) &&
                !isEmpty(maxLat) &&
                !isNaN(Number(maxLat)) && {
                  lat: { lt: Number(maxLat) },
                }),
            },
            {
              ...(isNil(tourPlaceId) &&
                !isNil(minLng) &&
                !isEmpty(minLng) &&
                !isNaN(Number(minLng)) && {
                  lng: { gte: Number(minLng) },
                }),
            },
            {
              ...(isNil(tourPlaceId) &&
                !isNil(maxLng) &&
                !isEmpty(maxLng) &&
                !isNaN(Number(maxLng)) && {
                  lng: { lt: Number(maxLng) },
                }),
            },
            // {
            //   OR: [
            //     /// adPlace와 연관된 tp는 공유가 하나도 없더라도 검색되어야 함.
            //     /// adPlace와 연관되지 않은 tp는 공유가 없다면 검색되면 안됨.
            //     {
            //       adPlaceId: { not: null }, /// adPlace 연관 tp
            //       ...(!isNil(categoryKeyword) &&
            //         !isEmpty(categoryKeyword) && {
            //           shareTripMemory: {
            //             some: {
            //               AND: [
            //                 {
            //                   tripMemoryCategory: {
            //                     some: {
            //                       name: {
            //                         contains: categoryKeyword,
            //                       },
            //                     },
            //                   },
            //                 },
            //                 // { isShare: true },
            //               ],
            //             },
            //           },
            //         }),
            //     },
            //     {
            //       adPlaceId: null, /// adPlace와 연관없는 일반 tp
            //       shareTripMemory: {
            //         some: {
            //           AND: [
            //             {
            //               tripMemoryCategory: {
            //                 some: {
            //                   name: {
            //                     contains: categoryKeyword,
            //                   },
            //                 },
            //               },
            //             },
            //             // { isShare: true },
            //           ],
            //         },
            //       },
            //     },
            //   ],
            // },
            {
              ...(!isNil(categoryKeyword) &&
                !isEmpty(categoryKeyword) && {
                  shareTripMemory: {
                    some: {
                      AND: [
                        {
                          tripMemoryCategory: {
                            some: {
                              name: {
                                contains: categoryKeyword,
                              },
                            },
                          },
                        },
                        // { isShare: true },
                      ],
                    },
                  },
                }),
            },
          ],
        },
        select: {
          id: true,
          tourPlaceType: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          title: true,
          lat: true,
          lng: true,
          address: true,
          roadAddress: true,
          openWeek: true,
          contact: true,
          postcode: true,
          rating: true,
          desc: true,
          photos: true,
          good: true,
          notBad: true,
          bad: true,
          like: true,
          // likeFrom: {
          //   select: {
          //     id: true,
          //     nickName: true,
          //     profileImg: true,
          //     createdAt: true,
          //     updatedAt: true,
          //   },
          // },

          ibTravelTag: true,
          shareTripMemory: {
            include: {
              tripMemoryCategory: true,
              user: {
                select: {
                  id: true,
                  nickName: true,
                  profileImg: true,
                  // smallProfileImg: true,
                  tripCreator: {
                    select: {
                      nickName: true,
                    },
                  },
                },
              },
              photos: {
                include: {
                  photoMetaInfo: {
                    include: {
                      feature: true,
                      keyword: true,
                    },
                  },
                },
              },
            },
            ...(!isNil(shareTripMemory) &&
              !isNil(shareTripMemory.orderBy) &&
              shareTripMemory.orderBy.toUpperCase().includes('LIKE') && {
                orderBy: {
                  like: 'desc',
                },
              }),
            ...(!isNil(shareTripMemory) &&
              !isNil(shareTripMemory.orderBy) &&
              shareTripMemory.orderBy.toUpperCase().includes('LATEST') && {
                orderBy: {
                  id: 'desc',
                },
              }),
          },
          adPlaceId: true,
        },
        ...(orderBy.toUpperCase().includes('LATEST') && {
          orderBy: {
            id: 'desc',
          },
        }),
        ...(orderBy.toUpperCase().includes('RECOMMEND') && {
          orderBy: {
            good: 'desc',
          },
        }),
        ...(orderBy.toUpperCase().includes('LIKE') && {
          orderBy: {
            like: 'desc',
          },
        }),
        ...(isNil(lastId) && {
          take: Number(take),
        }),
        ...(!isNil(lastId) && {
          take: Number(take) + 1,
          cursor: {
            id: Number(lastId),
          },
        }),
      });

      if (!isNil(lastId)) tourPlaceList.shift();

      res.json({
        ...ibDefs.SUCCESS,
        IBparams: await Promise.all(
          tourPlaceList.map(async t => {
            return {
              ...t,
              photos: await getImgUrlListFromIBPhotos(t.photos),
              shareTripMemory: await Promise.all(
                t.shareTripMemory.map(async s => {
                  const ret = {
                    ...s,
                    img: await getAccessableUrl(s.img),
                    // smallImg: await getAccessableUrl(s.smallImg),
                    user: {
                      ...s.user,
                      profileImg: await getUserProfileUrl(s.user),
                      // smallProfileImg: await getUserSmallProfileUrl(s.user),
                    },
                    photos: await Promise.all(s.photos.map(getIBPhotoUrl)),
                  };
                  return ret;
                }),
              ),
            };
          }),
        ),
      });
    } catch (err) {
      const isPrismaError = (
        v: unknown,
      ): v is Prisma.PrismaClientKnownRequestError => {
        if (v instanceof Prisma.PrismaClientKnownRequestError) return true;
        return false;
      };

      if (err instanceof IBError) {
        if (err.type === 'NOTAUTHORIZED') {
          console.error(err);
          res.status(403).json({
            ...ibDefs.NOTAUTHORIZED,
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

        if (err.type === 'DBTRANSACTIONERROR') {
          console.error(err);
          res.status(500).json({
            ...ibDefs.DBTRANSACTIONERROR,
            IBdetail: (err as Error).message,
            IBparams: {} as object,
          });
          return;
        }
      } else if (isPrismaError(err)) {
        if (
          err.code === 'P2003' &&
          err.message.includes(
            'Foreign key constraint failed on the field: `parentReplyId`',
          )
        ) {
          console.error(err);
          res.status(500).json({
            ...ibDefs.DBTRANSACTIONERROR,
            IBdetail: '대댓글이 존재하는 댓글입니다. 삭제할수 없습니다.',
            IBparams: {} as object,
          });
          return;
        }
      }
      throw err;
    }
  },
);

export interface GetTripMemListRequestType {
  tripMemoryId?: string; /// 단일 조회를 원할 경우 조회를 원하는 항목의 id
  orderBy?: string; /// 최신순(latest), 오래된 순(oldest) 정렬 default 최신순
  lastId?: string; /// 커서 기반 페이지네이션으로 직전 조회에서 확인한 마지막 ShareTripMemory id. undefined라면 처음부터 조회한다.
  take?: string; /// default 10
  tagKeyword?: string; /// 해시태그 검색 키워드
  groupId?: string; /// 그룹에 따라 조회하려면 groupId가 제공되어야 한다.
  onlyNonGroup?: string; /// true or false. true라면 group에 속해있지 않은것만 찾는다. false이면 group에 속해있건 없건 모두 찾는다. default false. 그룹에 속해있는 것들만 찾을 경우에는 getTripMemListByGroup을 이용할것. 기본적으로 tripMemory는 반드시 tripMemoryGroup에 속했었으나 이것이 옵셔널로 바뀌면서 그룹에 속해있지 않는 tripMemory들만 조회할 필요가 있어서 추가함. 논리적으로 groupId와 onlyNonGroup이 동시에 쓰일수 있는 경우는 없기 때문에 같이 제공되어서는 안된다.
  minLat?: string; /// 지도에서 위치 기반으로 검색할 경우
  minLng?: string;
  maxLat?: string;
  maxLng?: string;
}
export interface GetTripMemListSuccessResType {
  id: number;
  createdAt: string;
  title: string;
  comment: true;
  lat: true;
  lng: true;
  address: true;
  img: true;
  tag: {
    id: number;
    name: string;
  }[];
  group: {
    id: number;
    name: string;
    startDate: string;
    endDate: string;
  } | null;
  user: {
    id: number;
    nickName: string;
    profileImg: string | null;
  };
  ShareTripMemory: {
    id: number;
    tourPlaceId: number | null;
  } | null;
  photos: PhotoWithMetaType[];
  TourPlace: TourPlaceCommonType | null;
}

export type GetTripMemListResType = Omit<IBResFormat, 'IBparams'> & {
  IBparams: GetTripMemListSuccessResType[] | {};
};

/**
 * '내' 기억 리스트를 리턴하는 api
 */
export const getTripMemList = asyncWrapper(
  async (
    req: Express.IBTypedReqBody<GetTripMemListRequestType>,
    res: Express.IBTypedResponse<GetTripMemListResType>,
  ) => {
    try {
      const {
        tripMemoryId,
        orderBy = 'latest',
        lastId,
        take = '10',
        tagKeyword = '',
        groupId,
        onlyNonGroup = 'false',
        minLat,
        minLng,
        maxLat,
        maxLng,
      } = req.body;
      const { locals } = req;
      const { memberId, userTokenId } = (() => {
        if (locals && locals?.grade === 'member')
          return {
            memberId: locals?.user?.id,
            userTokenId: locals?.user?.userTokenId,
          };
        // return locals?.tokenId;
        throw new IBError({
          type: 'NOTAUTHORIZED',
          message: 'member 등급만 접근 가능합니다.',
        });
      })();

      if (!userTokenId || !memberId) {
        throw new IBError({
          type: 'NOTEXISTDATA',
          message: '정상적으로 부여된 userTokenId를 가지고 있지 않습니다.',
        });
      }

      /// tripMemoryId로 조회 요청온  경우
      if (!isNil(tripMemoryId)) {
        const foundTripMem = await prisma.tripMemory.findUnique({
          where: {
            id: Number(tripMemoryId),
          },
          select: {
            id: true,
            createdAt: true,
            title: true,
            comment: true,
            lat: true,
            lng: true,
            address: true,
            img: true,
            tag: {
              select: {
                id: true,
                name: true,
              },
            },
            group: {
              select: {
                id: true,
                name: true,
                startDate: true,
                endDate: true,
              },
            },
            user: {
              select: {
                id: true,
                nickName: true,
                profileImg: true,
              },
            },
            ShareTripMemory: {
              select: {
                id: true,
                tourPlaceId: true,
              },
            },
            photos: {
              include: {
                photoMetaInfo: {
                  include: {
                    keyword: true,
                    feature: true,
                  },
                },
              },
            },
            TourPlace: {
              select: {
                id: true,
                tourPlaceType: true,
                status: true,
                createdAt: true,
                updatedAt: true,
                title: true,
                lat: true,
                lng: true,
                address: true,
                roadAddress: true,
                openWeek: true,
                contact: true,
                postcode: true,
                rating: true,
                desc: true,
                // photos: {
                //   select: {
                //     id: true,
                //     key: true,
                //     url: true,
                //   },
                // },
                good: true,
                notBad: true,
                bad: true,
                like: true,
                // likeFrom: {
                //   select: {
                //     id: true,
                //     nickName: true,
                //     profileImg: true,
                //     createdAt: true,
                //     updatedAt: true,
                //   },
                // },
              },
            },
          },
        });

        if (isNil(foundTripMem)) {
          throw new IBError({
            type: 'NOTEXISTDATA',
            message: '존재하지 않는 tripMemoryId입니다.',
          });
        }

        if (foundTripMem.user.id !== Number(memberId)) {
          throw new IBError({
            type: 'NOTAUTHORIZED',
            message: '조회 권한이 없는 기억 id입니다.',
          });
        }
        // const { profileImg } = foundTripMem.user;
        res.json({
          ...ibDefs.SUCCESS,
          IBparams: [
            {
              ...foundTripMem,
              img: await getAccessableUrl(foundTripMem.img),
              // img: foundTripMem.img.includes('http')
              //   ? foundTripMem.img
              //   : await getS3SignedUrl(foundTripMem.img),
              user: {
                ...foundTripMem.user,
                profileImg: await getUserProfileUrl(foundTripMem.user),
                // ...(!isNil(profileImg) && {
                //   profileImg: profileImg.includes('http')
                //     ? profileImg
                //     : await getS3SignedUrl(profileImg),
                // }),
              },
              photos: isNil(foundTripMem.photos)
                ? null
                : await Promise.all(foundTripMem.photos.map(getIBPhotoUrl)),
            },
          ],
        });
        return;
      }

      /// tripMemoryId 가 없이 조회 요청온  경우
      const foundTripMemList = await prisma.tripMemory.findMany({
        where: {
          AND: [
            {
              ...(!isNil(tagKeyword) &&
                !isEmpty(tagKeyword) && {
                  tag: {
                    some: {
                      name: {
                        contains: tagKeyword,
                      },
                    },
                  },
                }),
            },
            {
              ...(!isNil(groupId) &&
                !isEmpty(groupId) &&
                !isNaN(Number(groupId)) && {
                  groupId: Number(groupId),
                }),
            },
            {
              ...(onlyNonGroup.toLowerCase().includes('true') && {
                groupId: null,
              }),
            },
            {
              ...(!isNil(minLat) &&
                !isEmpty(minLat) &&
                !isNaN(Number(minLat)) && {
                  lat: { gte: Number(minLat) },
                }),
            },
            {
              ...(!isNil(maxLat) &&
                !isEmpty(maxLat) &&
                !isNaN(Number(maxLat)) && {
                  lat: { lt: Number(maxLat) },
                }),
            },
            {
              ...(!isNil(minLng) &&
                !isEmpty(minLng) &&
                !isNaN(Number(minLng)) && {
                  lng: { gte: Number(minLng) },
                }),
            },
            {
              ...(!isNil(maxLng) &&
                !isEmpty(maxLng) &&
                !isNaN(Number(maxLng)) && {
                  lng: { lt: Number(maxLng) },
                }),
            },
            // { lat: isNil(minLat) ? undefined : { gte: Number(minLat) } },
            // { lat: isNil(maxLat) ? undefined : { lt: Number(maxLat) } },
            // { lng: isNil(minLng) ? undefined : { gte: Number(minLng) } },
            // { lng: isNil(maxLng) ? undefined : { lt: Number(maxLng) } },
            { userId: Number(memberId) },
          ],
        },
        ...(isNil(lastId) && {
          take: Number(take),
        }),
        ...(!isNil(lastId) && {
          take: Number(take) + 1,
          cursor: {
            id: Number(lastId),
          },
        }),
        select: {
          id: true,
          createdAt: true,
          title: true,
          comment: true,
          lat: true,
          lng: true,
          address: true,
          img: true,
          tag: {
            select: {
              id: true,
              name: true,
            },
          },
          group: {
            select: {
              id: true,
              name: true,
              startDate: true,
              endDate: true,
            },
          },
          user: {
            select: {
              id: true,
              nickName: true,
              profileImg: true,
            },
          },
          ShareTripMemory: {
            select: {
              id: true,
              tourPlaceId: true,
            },
          },
          photos: {
            include: {
              photoMetaInfo: {
                include: {
                  keyword: true,
                  feature: true,
                },
              },
            },
          },
          TourPlace: {
            select: {
              id: true,
              title: true,
              lat: true,
              lng: true,
              address: true,
              roadAddress: true,
              openWeek: true,
              contact: true,
              postcode: true,
              rating: true,
              desc: true,
              // photos: {
              //   select: {
              //     id: true,
              //     key: true,
              //     url: true,
              //   },
              // },
            },
          },
        },
        ...(orderBy.toUpperCase().includes('LATEST') && {
          orderBy: {
            id: 'desc',
          },
        }),
      });

      if (!isNil(lastId)) foundTripMemList.shift();

      res.json({
        ...ibDefs.SUCCESS,
        IBparams: await Promise.all(
          foundTripMemList.map(async v => {
            // const userImg = await (() => {
            //   const { profileImg } = v.user;
            //   if (!isNil(profileImg)) {
            //     if (profileImg.includes('http')) return profileImg;
            //     return getS3SignedUrl(profileImg);
            //   }
            //   return null;
            // })();

            const ret = {
              ...v,
              img: await getAccessableUrl(v.img),
              // img: v.img.includes('http') ? v.img : await getS3SignedUrl(v.img),
              user: {
                ...v.user,
                profileImg: await getUserProfileUrl(v.user),
                // profileImg: userImg,
              },
              photos: isNil(v.photos)
                ? null
                : await Promise.all(v.photos.map(getIBPhotoUrl)),
            };

            return ret;
          }),
        ),
      });
    } catch (err) {
      const isPrismaError = (
        v: unknown,
      ): v is Prisma.PrismaClientKnownRequestError => {
        if (v instanceof Prisma.PrismaClientKnownRequestError) return true;
        return false;
      };

      if (err instanceof IBError) {
        if (err.type === 'NOTAUTHORIZED') {
          console.error(err);
          res.status(403).json({
            ...ibDefs.NOTAUTHORIZED,
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

        if (err.type === 'DBTRANSACTIONERROR') {
          console.error(err);
          res.status(500).json({
            ...ibDefs.DBTRANSACTIONERROR,
            IBdetail: (err as Error).message,
            IBparams: {} as object,
          });
          return;
        }
      } else if (isPrismaError(err)) {
        if (
          err.code === 'P2003' &&
          err.message.includes(
            'Foreign key constraint failed on the field: `parentReplyId`',
          )
        ) {
          console.error(err);
          res.status(500).json({
            ...ibDefs.DBTRANSACTIONERROR,
            IBdetail: '대댓글이 존재하는 댓글입니다. 삭제할수 없습니다.',
            IBparams: {} as object,
          });
          return;
        }
      }
      throw err;
    }
  },
);

export interface GetTripMemListByGroupRequestType {
  orderBy?: string; /// 최신순(latest), 오래된 순(oldest) 정렬 default 최신순
  lastId?: string; /// 커서 기반 페이지네이션으로 직전 조회에서 확인한 마지막 ShareTripMemory id. undefined라면 처음부터 조회한다.
  take?: string; /// default 10
  tagKeyword?: string; /// 해시태그 검색 키워드
  groupId?: string; /// 그룹에 따라 조회하려면 groupId가 제공되어야 한다.
  minLat?: string; /// 지도에서 위치 기반으로 검색할 경우
  minLng?: string;
  maxLat?: string;
  maxLng?: string;
}
export interface GetTripMemListByGroupSuccessResType {
  id: number;
  name: string;
  startDate: Date | null;
  endDate: Date | null;
  user: {
    id: number;
    nickName: string;
    profileImg: string | null;
  };
  tripMemory: {
    createdAt: string;
    createdDay: string;
    img: string;
    lng: number;
    lat: number;
    tag: {
      id: number;
      name: string;
    }[];
    id: number;
    title: string;
    comment: string;
    address: string | null;
    ShareTripMemory: {
      id: number;
      tourPlaceId: number | null;
    } | null;
    TourPlace: TourPlaceCommonType | null;
    photos: PhotoWithMetaType[];
    // TourPlace: {
    //   title: string | null;
    //   lat: number | null;
    //   lng: number | null;
    //   address: string | null;
    //   roadAddress: string | null;
    //   openWeek: string | null;
    //   contact: string | null;
    //   postcode: string | null;
    //   photos: {
    //     url: string | null;
    //   }[];
    //   desc: string | null;
    // } | null;
  }[];
}

export type GetTripMemListByGroupResType = Omit<IBResFormat, 'IBparams'> & {
  IBparams: GetTripMemListByGroupSuccessResType[] | {};
};

/**
 * 기억 그룹별로 그룹지어진 '내' 기억 리스트를 리턴하는 api
 */
export const getTripMemListByGroup = asyncWrapper(
  async (
    req: Express.IBTypedReqBody<GetTripMemListByGroupRequestType>,
    res: Express.IBTypedResponse<GetTripMemListByGroupResType>,
  ) => {
    try {
      const {
        orderBy = 'latest',
        lastId,
        take = '10',
        tagKeyword = '',
        groupId,
        minLat,
        minLng,
        maxLat,
        maxLng,
      } = req.body;
      const { locals } = req;
      const { memberId, userTokenId } = (() => {
        if (locals && locals?.grade === 'member')
          return {
            memberId: locals?.user?.id,
            userTokenId: locals?.user?.userTokenId,
          };
        // return locals?.tokenId;
        throw new IBError({
          type: 'NOTAUTHORIZED',
          message: 'member 등급만 접근 가능합니다.',
        });
      })();

      if (!userTokenId || !memberId) {
        throw new IBError({
          type: 'NOTEXISTDATA',
          message: '정상적으로 부여된 userTokenId를 가지고 있지 않습니다.',
        });
      }

      const foundGroupList = await prisma.tripMemoryGroup.findMany({
        where: {
          AND: [
            { id: isNil(groupId) ? undefined : Number(groupId) },
            { userId: Number(memberId) },
            {
              tripMemory: {
                some: {
                  AND: [
                    {
                      ...(!isEmpty(tagKeyword) && {
                        tag: {
                          some: {
                            name: {
                              contains: tagKeyword,
                            },
                          },
                        },
                      }),
                    },
                    {
                      lat: isNil(minLat) ? undefined : { gte: Number(minLat) },
                    },
                    { lat: isNil(maxLat) ? undefined : { lt: Number(maxLat) } },
                    {
                      lng: isNil(minLng) ? undefined : { gte: Number(minLng) },
                    },
                    { lng: isNil(maxLng) ? undefined : { lt: Number(maxLng) } },
                  ],
                },
              },
            },
          ],
        },
        ...(isNil(lastId) && {
          take: Number(take),
        }),
        ...(!isNil(lastId) && {
          take: Number(take) + 1,
          cursor: {
            id: Number(lastId),
          },
        }),
        select: {
          id: true,
          name: true,
          startDate: true,
          endDate: true,
          user: {
            select: {
              id: true,
              nickName: true,
              profileImg: true,
            },
          },
          tripMemory: {
            select: {
              id: true,
              createdAt: true,
              title: true,
              comment: true,
              lat: true,
              lng: true,
              address: true,
              img: true,
              tag: {
                select: {
                  id: true,
                  name: true,
                },
              },
              ShareTripMemory: {
                select: {
                  id: true,
                  tourPlaceId: true,
                },
              },
              TourPlace: {
                select: {
                  id: true,
                  tourPlaceType: true,
                  status: true,
                  createdAt: true,
                  updatedAt: true,
                  title: true,
                  lat: true,
                  lng: true,
                  address: true,
                  roadAddress: true,
                  openWeek: true,
                  contact: true,
                  postcode: true,
                  rating: true,
                  desc: true,
                  // photos: {
                  //   select: {
                  //     id: true,
                  //     key: true,
                  //     url: true,
                  //   },
                  // },
                  good: true,
                  notBad: true,
                  bad: true,
                  like: true,
                  // likeFrom: {
                  //   select: {
                  //     id: true,
                  //     nickName: true,
                  //     profileImg: true,
                  //     createdAt: true,
                  //     updatedAt: true,
                  //   },
                  // },
                },
              },
              photos: {
                include: {
                  photoMetaInfo: {
                    include: {
                      keyword: true,
                      feature: true,
                    },
                  },
                },
              },
            },
          },
        },
        ...(orderBy.toUpperCase().includes('LATEST') && {
          orderBy: {
            id: 'desc',
          },
        }),
      });
      if (!isNil(lastId)) foundGroupList.shift();

      res.json({
        ...ibDefs.SUCCESS,
        IBparams: await Promise.all(
          foundGroupList.map(async v => {
            // const userImg = await (() => {
            //   const { profileImg } = v.user;
            //   if (!isNil(profileImg)) {
            //     if (profileImg.includes('http')) return profileImg;
            //     return getS3SignedUrl(profileImg);
            //   }
            //   return null;
            // })();

            const ret = {
              ...v,
              tripMemory: await Promise.all(
                v.tripMemory.map(async k => {
                  return {
                    ...k,
                    createdDay: moment(k.createdAt)
                      .startOf('d')
                      .format('YYYY-MM-DD'),
                    img: await getAccessableUrl(k.img),
                    // img: k.img.includes('http')
                    //   ? k.img
                    //   : await getS3SignedUrl(k.img),
                    TourPlace: k.TourPlace,
                    photos: isNil(k.photos)
                      ? null
                      : await Promise.all(k.photos.map(getIBPhotoUrl)),
                  };
                }),
              ),

              user: {
                ...v.user,
                profileImg: await getUserProfileUrl(v.user),
                // profileImg: userImg,
              },
            };

            return ret;
          }),
        ),
      });
    } catch (err) {
      const isPrismaError = (
        v: unknown,
      ): v is Prisma.PrismaClientKnownRequestError => {
        if (v instanceof Prisma.PrismaClientKnownRequestError) return true;
        return false;
      };

      if (err instanceof IBError) {
        if (err.type === 'NOTAUTHORIZED') {
          console.error(err);
          res.status(403).json({
            ...ibDefs.NOTAUTHORIZED,
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

        if (err.type === 'DBTRANSACTIONERROR') {
          console.error(err);
          res.status(500).json({
            ...ibDefs.DBTRANSACTIONERROR,
            IBdetail: (err as Error).message,
            IBparams: {} as object,
          });
          return;
        }
      } else if (isPrismaError(err)) {
        if (
          err.code === 'P2003' &&
          err.message.includes(
            'Foreign key constraint failed on the field: `parentReplyId`',
          )
        ) {
          console.error(err);
          res.status(500).json({
            ...ibDefs.DBTRANSACTIONERROR,
            IBdetail: '대댓글이 존재하는 댓글입니다. 삭제할수 없습니다.',
            IBparams: {} as object,
          });
          return;
        }
      }
      throw err;
    }
  },
);

export interface GetNotiNewCommentRequestType {}

export type GetNotiNewCommentResType = Omit<IBResFormat, 'IBparams'> & {
  IBparams: boolean | {};
};

export const getNotiNewComment = asyncWrapper(
  async (
    req: Express.IBTypedReqQuery<GetNotiNewCommentRequestType>,
    res: Express.IBTypedResponse<GetNotiNewCommentResType>,
  ) => {
    try {
      const { locals } = req;
      const { memberId, userTokenId } = (() => {
        if (locals && locals?.grade === 'member')
          return {
            memberId: locals?.user?.id,
            userTokenId: locals?.user?.userTokenId,
          };
        // return locals?.tokenId;
        throw new IBError({
          type: 'NOTAUTHORIZED',
          message: 'member 등급만 접근 가능합니다.',
        });
      })();

      if (!userTokenId || !memberId) {
        throw new IBError({
          type: 'NOTEXISTDATA',
          message: '정상적으로 부여된 userTokenId를 가지고 있지 않습니다.',
        });
      }

      const shareTripMemory = await prisma.shareTripMemory.findMany({
        where: {
          userId: Number(memberId),
          NotiNewCommentOnShareTripMemory: {
            some: {
              userChecked: false,
            },
          },
        },
        include: {
          NotiNewCommentOnShareTripMemory: true,
        },
      });

      let result = false;
      if (!isEmpty(shareTripMemory)) result = true;

      res.json({
        ...ibDefs.SUCCESS,
        IBparams: result,
      });
    } catch (err) {
      if (err instanceof IBError) {
        if (err.type === 'NOTAUTHORIZED') {
          console.error(err);
          res.status(403).json({
            ...ibDefs.NOTAUTHORIZED,
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

        if (err.type === 'DBTRANSACTIONERROR') {
          console.error(err);
          res.status(500).json({
            ...ibDefs.DBTRANSACTIONERROR,
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

export interface CheckNotiNewCommentRequestType {}

export type CheckNotiNewCommentResType = Omit<IBResFormat, 'IBparams'> & {
  IBparams: number | {};
};

export const checkNotiNewComment = asyncWrapper(
  async (
    req: Express.IBTypedReqBody<CheckNotiNewCommentRequestType>,
    res: Express.IBTypedResponse<CheckNotiNewCommentResType>,
  ) => {
    try {
      const { locals } = req;
      const { memberId, userTokenId } = (() => {
        if (locals && locals?.grade === 'member')
          return {
            memberId: locals?.user?.id,
            userTokenId: locals?.user?.userTokenId,
          };
        // return locals?.tokenId;
        throw new IBError({
          type: 'NOTAUTHORIZED',
          message: 'member 등급만 접근 가능합니다.',
        });
      })();

      if (!userTokenId || !memberId) {
        throw new IBError({
          type: 'NOTEXISTDATA',
          message: '정상적으로 부여된 userTokenId를 가지고 있지 않습니다.',
        });
      }

      const shareTripMemory = await prisma.shareTripMemory.findMany({
        where: {
          userId: Number(memberId),
          NotiNewCommentOnShareTripMemory: {
            some: {
              userChecked: false,
            },
          },
        },
        select: {
          NotiNewCommentOnShareTripMemory: {
            select: {
              id: true,
            },
          },
        },
      });

      const notiNewCommentIds = shareTripMemory
        .map(
          (
            v,
          ): {
            id: number;
          }[] => {
            return v.NotiNewCommentOnShareTripMemory;
          },
        )
        .flat()
        .map(v => v.id);

      let updated: Prisma.BatchPayload | undefined;
      if (!isEmpty(notiNewCommentIds)) {
        updated = await prisma.notiNewCommentOnShareTripMemory.updateMany({
          where: {
            id: {
              in: notiNewCommentIds,
            },
          },
          data: {
            userChecked: true,
          },
        });
      }

      res.json({
        ...ibDefs.SUCCESS,
        IBparams: updated && updated.count ? updated.count : 0,
      });
    } catch (err) {
      if (err instanceof IBError) {
        if (err.type === 'NOTAUTHORIZED') {
          console.error(err);
          res.status(403).json({
            ...ibDefs.NOTAUTHORIZED,
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

        if (err.type === 'DBTRANSACTIONERROR') {
          console.error(err);
          res.status(500).json({
            ...ibDefs.DBTRANSACTIONERROR,
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

export interface ModifyTripMemoryRequestType {
  tripMemoryId: string;
  title?: string;
  comment?: string;
  address?: string;
  lat?: string;
  lng?: string;
  // img?: string; ///deprecated photos에서 첫번째 해당하는 사진을 메인 이미지로 설정함.
  photos?: {
    key: string;
    photoMetaInfo?: Partial<PhotoMetaInfoForAdd>;
  }[];
}
export interface ModifyTripMemorySuccessResType extends TripMemory {
  photos: PhotoWithMetaType[];
  group: TripMemoryGroup | null;
  tag: TripMemoryTag[];
}

export type ModifyTripMemoryResType = Omit<IBResFormat, 'IBparams'> & {
  IBparams: ModifyTripMemorySuccessResType | {};
};

export interface ContextModifyTripMemory extends IBContext {}

/**
 * 트립네트워크의 기억 정보 변경 요청 api.
 * https://www.figma.com/file/Tdpp5Q2J3h19NyvBvZMM2m/brip?node-id=498:1572&t=fxdTKyUVsRIw7Rd9-4
 * 2023-06-08 기준 해당 API에서 comment와 각 photos안의 tag인 keyword만 수정 가능함.
 * 만약 '공유'를 했던 tripMemory의 사진정보를 수정한다면 해당shareTripMemory의 사진도 함께 수정된다. 연관된 tourPlace의 사진정보는 수정되지 않는다.
 */
const modifyTripMemory = async (
  param: ModifyTripMemoryRequestType,
  ctx: ContextModifyTripMemory,
): Promise<ModifyTripMemorySuccessResType> => {
  const { tripMemoryId, title, comment, address, lat, lng, photos } = param;

  /// 들어온순서대로 사진 순서 부여
  const photosWithOrder = photos?.map((v, idx) => {
    return {
      ...v,
      photoMetaInfo: {
        ...v.photoMetaInfo,
        order: idx,
      },
    };
  });

  if (isNil(tripMemoryId) || isEmpty(tripMemoryId)) {
    throw new IBError({
      type: 'INVALIDPARAMS',
      message: 'tripMemoryId는 필수값입니다.',
    });
  }

  const tripMemory = await prisma.tripMemory.findUnique({
    where: {
      id: Number(tripMemoryId),
    },
    include: {
      group: {
        select: {
          tripMemory: true,
        },
      },
      ShareTripMemory: {
        select: {
          id: true,
        },
      },
      photos: true,
    },
  });

  if (isNil(tripMemory)) {
    throw new IBError({
      type: 'NOTEXISTDATA',
      message: '존재하지 않는 tripMemoryId입니다.',
    });
  }

  if (isNil(tripMemory.userId) || tripMemory.userId !== Number(ctx.memberId)) {
    throw new IBError({
      type: 'NOTAUTHORIZED',
      message: '해당 유저의 권한으로 수정할 수 없는 tripMemory입니다.',
    });
  }

  const updatedTxRes = await prisma.$transaction(async tx => {
    /// 수정시에 제공되지 않은 photo key값을 찾아 기존 포토에서 삭제하기 위해 삭제 후보사진키 delCandPhotos 체크
    let newCreatedPhotoMetaInfo: IBPhotoMetaInfo[] = [];
    if (!isNil(photosWithOrder)) {
      const exPics = [...tripMemory.photos];
      const newPics = [...photosWithOrder];

      /// 삭제 후보사진 표시하기
      const delCandPhotos = exPics.reduce<IBPhotos[]>((acc, exPic) => {
        /// 이전 사진들중 새 사진과 일치하는 key가 있다면 지울 대상이 아니다.
        const isDel = !newPics.find(
          newPic => !isNil(exPic.key) && newPic.key.includes(exPic.key),
        );

        if (isDel) {
          return [...acc, exPic];
        }

        return acc;
      }, []);

      // /// s3와 db에서의 직접 사진 삭제기능은 보류한다. 관계만 끊는것으로 대체함
      if (!isEmpty(delCandPhotos)) {
        /// disconnect all with IBPhotos relations
        await Promise.all(
          delCandPhotos.map(v => {
            return tx.iBPhotos.update({
              where: {
                id: v.id,
              },
              data: {
                tripMemoryId: null,
                shareTripMemoryId: null,
                // tourPlaceId: null,
              },
            });
          }),
        );
        /// delete From IBPhotos DB model
        // await Promise.all(
        //   delCandPhotos.map(v => {
        //     return tx.iBPhotos.delete({
        //       where: {
        //         id: v.id,
        //       },
        //     });
        //   }),
        // );

        //   /// delete From S3 Photo key
        //   const deleteFromS3Result = await delObjectsFromS3(
        //     delCandPhotos.map(v => v.key).filter((v): v is string => !isNil(v)),
        //   );
        //   console.log(deleteFromS3Result);
      }

      /// 기존에 존재하고 있던 사진
      const notChangePhotos = [...exPics];
      remove(notChangePhotos, exPic => {
        return !!delCandPhotos.find(delPic => exPic.id === delPic.id);
      });

      /// 이번 수정요청에서 새롭게 생성해야할 사진
      const newCreatePhoto = [...photosWithOrder];
      const modifyAlreadyExPhoto = remove(newCreatePhoto, newPic => {
        const a = !!notChangePhotos.find(
          notChangePic =>
            !isNil(notChangePic.key) && notChangePic.key?.includes(newPic.key),
        );
        return a;
      });

      /// 새롭게 생성해야할 IBPhotos를 DB에 생성함
      /// 사진 메타 데이터와 사진을 먼저 생성후 tripMemory와 connect
      newCreatedPhotoMetaInfo = await Promise.all(
        newCreatePhoto.map((v, index) => {
          return tx.iBPhotoMetaInfo.create({
            data: {
              type: v.photoMetaInfo.type as IBPhotoMetaInfoType,
              order: index,
              title: v.photoMetaInfo.title!,
              lat: Number(v.photoMetaInfo.lat!),
              lng: Number(v.photoMetaInfo.lng!),
              shotTime: v.photoMetaInfo.shotTime,
              ...(v.photoMetaInfo.keyword && {
                keyword: {
                  connectOrCreate: v.photoMetaInfo.keyword.map(k => {
                    return {
                      where: {
                        name: k,
                      },
                      create: {
                        name: k,
                      },
                    };
                  }),
                },
              }),
              ...(v.photoMetaInfo.feature && {
                feature: {
                  connectOrCreate: v.photoMetaInfo.feature.map(k => {
                    return {
                      where: {
                        super_name: {
                          super: k.super,
                          name: k.name,
                        },
                      },
                      create: {
                        super: k.super,
                        name: k.name,
                      },
                    };
                  }),
                },
              }),
              // eval: v.photoMetaInfo!.eval, /// 데이터 수집시에 MAIN 타입의 사진의 photoMetaInfo 에서 필수적으로 저장되어야 하는 데이터이지만(스키마에서는 nullable) photoMetaInfo에서 따로 입력받지 않고 addShareTripMemory할때 입력받는 recommendGrade로 자동 저장함
              desc: v.photoMetaInfo.desc,
              publicInfo: v.photoMetaInfo?.publicInfo,
              photo: {
                create: {
                  key: v.key,
                },
              },
            },
          });
        }),
      );

      await Promise.all(
        modifyAlreadyExPhoto.map(v => {
          const matched = notChangePhotos.find(k => k.key?.includes(v.key));
          if (isNil(v.photoMetaInfo)) return null;
          return tx.iBPhotos.update({
            where: {
              id: matched!.id,
            },
            data: {
              photoMetaInfo: {
                update: {
                  order: v.photoMetaInfo.order,
                  ...(!isNil(v.photoMetaInfo.type) && {
                    type: v.photoMetaInfo.type,
                  }),
                  ...(!isNil(v.photoMetaInfo.title) && {
                    title: v.photoMetaInfo.title,
                  }),
                  ...(!isNil(v.photoMetaInfo.lat) && {
                    lat: Number(v.photoMetaInfo.lat),
                  }),
                  ...(!isNil(v.photoMetaInfo.lng) && {
                    lng: Number(v.photoMetaInfo.lng),
                  }),
                  ...(!isNil(v.photoMetaInfo.shotTime) && {
                    shotTime: v.photoMetaInfo.shotTime,
                  }),
                  ...(!isNil(v.photoMetaInfo.desc) && {
                    desc: v.photoMetaInfo.desc,
                  }),
                  ...(!isNil(v.photoMetaInfo.publicInfo) && {
                    publicInfo: v.photoMetaInfo.publicInfo,
                  }),
                  ...(!isNil(v.photoMetaInfo.keyword) && {
                    keyword: {
                      set: [],
                      connectOrCreate: v.photoMetaInfo.keyword.map(
                        keywordName => {
                          return {
                            where: {
                              name: keywordName,
                            },
                            create: {
                              name: keywordName,
                            },
                          };
                        },
                      ),
                    },
                  }),
                  ...(!isNil(v.photoMetaInfo.feature) && {
                    feature: {
                      set: [],
                      connectOrCreate: v.photoMetaInfo.feature.map(k => {
                        return {
                          where: {
                            super_name: {
                              super: k.super,
                              name: k.name,
                            },
                          },
                          create: {
                            super: k.super,
                            name: k.name,
                          },
                        };
                      }),
                    },
                  }),
                },
              },
            },
          });
        }),
      );
    }

    const updateResult = await tx.tripMemory.update({
      where: {
        id: Number(tripMemoryId),
      },
      data: {
        title,
        comment,
        lat: !isNil(lat) ? Number(lat) : undefined,
        lng: !isNil(lng) ? Number(lng) : undefined,
        address,
        ...(photosWithOrder && {
          img: photosWithOrder[0].key,
        }),
        ...(!isEmpty(newCreatedPhotoMetaInfo) && {
          photos: {
            connect: newCreatedPhotoMetaInfo.map(v => {
              return {
                id: v.photoId,
              };
            }),
          },
        }),
        ...(!isNil(tripMemory.ShareTripMemory) && {
          ShareTripMemory: {
            update: {
              title,
              ...(photosWithOrder && {
                img: photosWithOrder[0].key,
              }),
              ...(!isEmpty(newCreatedPhotoMetaInfo) && {
                photos: {
                  connect: newCreatedPhotoMetaInfo.map(v => {
                    return {
                      id: v.photoId,
                    };
                  }),
                },
              }),
              comment,
            },
          },
        }),
      },
      include: {
        tag: true,
        group: true,
        photos: {
          include: {
            photoMetaInfo: {
              include: {
                feature: true,
                keyword: true,
              },
            },
          },
        },
      },
    });
    return updateResult;
  });

  return updatedTxRes;
};

export const modifyTripMemoryWrapper = asyncWrapper(
  async (
    req: Express.IBTypedReqBody<ModifyTripMemoryRequestType>,
    res: Express.IBTypedResponse<ModifyTripMemoryResType>,
  ) => {
    try {
      const param = req.body;
      const { locals } = req;
      const { memberId, userTokenId } = (() => {
        if (locals && locals?.grade === 'member')
          return {
            memberId: locals?.user?.id,
            userTokenId: locals?.user?.userTokenId,
          };
        // return locals?.tokenId;
        throw new IBError({
          type: 'NOTAUTHORIZED',
          message: 'member 등급만 접근 가능합니다.',
        });
      })();

      if (!userTokenId || !memberId) {
        throw new IBError({
          type: 'NOTEXISTDATA',
          message: '정상적으로 부여된 userTokenId를 가지고 있지 않습니다.',
        });
      }
      const ctx = {
        memberId,
        userTokenId,
      };
      const updatedTripMem = await modifyTripMemory(param, ctx);

      res.json({
        ...ibDefs.SUCCESS,
        IBparams: updatedTripMem,
      });
    } catch (err) {
      if (err instanceof IBError) {
        if (err.type === 'NOTAUTHORIZED') {
          console.error(err);
          res.status(403).json({
            ...ibDefs.NOTAUTHORIZED,
            IBdetail: (err as Error).message,
            IBparams: {} as object,
          });
          return;
        }

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

        if (err.type === 'DBTRANSACTIONERROR') {
          console.error(err);
          res.status(500).json({
            ...ibDefs.DBTRANSACTIONERROR,
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

export interface DeleteTripMemoryRequestType {
  tripMemoryId: string;
}
export interface DeleteTripMemorySuccessResType {}

export type DeleteTripMemoryResType = Omit<IBResFormat, 'IBparams'> & {
  IBparams: DeleteTripMemorySuccessResType | {};
};

export interface ContextDeleteTripMemory extends IBContext {}

const deleteTripMemory = async (
  param: DeleteTripMemoryRequestType,
  ctx: ContextDeleteTripMemory,
): Promise<DeleteTripMemorySuccessResType> => {
  const { tripMemoryId } = param;

  if (isNil(tripMemoryId) || isEmpty(tripMemoryId)) {
    throw new IBError({
      type: 'INVALIDPARAMS',
      message: 'tripMemoryId는 필수값입니다.',
    });
  }

  const tripMemory = await prisma.tripMemory.findUnique({
    where: {
      id: Number(tripMemoryId),
    },
    select: {
      id: true,
      userId: true,
      group: {},
    },
  });

  if (isNil(tripMemory)) {
    throw new IBError({
      type: 'NOTEXISTDATA',
      message: '존재하지 않는 tripMemoryId입니다.',
    });
  }

  if (tripMemory.userId !== Number(ctx.memberId)) {
    throw new IBError({
      type: 'NOTAUTHORIZED',
      message: '해당 유저의 권한으로 수정할 수 없는 tripMemory입니다.',
    });
  }

  const deleteResult = await prisma.tripMemory.delete({
    where: {
      id: Number(tripMemoryId),
    },
  });
  return deleteResult;
};

export const deleteTripMemoryWrapper = asyncWrapper(
  async (
    req: Express.IBTypedReqBody<DeleteTripMemoryRequestType>,
    res: Express.IBTypedResponse<DeleteTripMemoryResType>,
  ) => {
    try {
      const param = req.body;
      const { locals } = req;
      const { memberId, userTokenId } = (() => {
        if (locals && locals?.grade === 'member')
          return {
            memberId: locals?.user?.id,
            userTokenId: locals?.user?.userTokenId,
          };
        // return locals?.tokenId;
        throw new IBError({
          type: 'NOTAUTHORIZED',
          message: 'member 등급만 접근 가능합니다.',
        });
      })();

      if (!userTokenId || !memberId) {
        throw new IBError({
          type: 'NOTEXISTDATA',
          message: '정상적으로 부여된 userTokenId를 가지고 있지 않습니다.',
        });
      }
      const ctx = {
        memberId,
        userTokenId,
      };
      await deleteTripMemory(param, ctx);

      res.json({
        ...ibDefs.SUCCESS,
        IBparams: {},
      });
    } catch (err) {
      if (err instanceof IBError) {
        if (err.type === 'NOTAUTHORIZED') {
          console.error(err);
          res.status(403).json({
            ...ibDefs.NOTAUTHORIZED,
            IBdetail: (err as Error).message,
            IBparams: {} as object,
          });
          return;
        }

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

        if (err.type === 'DBTRANSACTIONERROR') {
          console.error(err);
          res.status(500).json({
            ...ibDefs.DBTRANSACTIONERROR,
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

export interface ModifyShareTripMemoryRequestType {
  shareTripMemoryId: string;
  title?: string;
  comment?: string;
  // isShare?: string;
  photos?: {
    key: string;
    photoMetaInfo?: {
      /// common fields
      type?: IBPhotoMetaInfoType;
      title?: string;
      lat?: string;
      lng?: string;
      shotTime?: string;
      keyword?: string[];
      feature?: {
        super: string;
        name: string;
      }[];
      // eval?: string; /// for only MAIN fields /// 데이터 수집시에 MAIN 타입의 사진의 photoMetaInfo 에서 필수적으로 저장되어야 하는 데이터이지만(스키마에서는 nullable) photoMetaInfo에서 따로 입력받지 않고 addShareTripMemory할때 입력받는 recommendGrade로 자동 저장함
      desc?: string; /// for only MAIN fields
      publicInfo?: string; /// for DETAIL fields
    };
  }[];
}
export interface ModifyShareTripMemorySuccessResType extends ShareTripMemory {
  TourPlace: TourPlaceCommonType | null;
  tripMemory:
    | (TripMemory & {
        tag: TripMemoryTag[];
        group: TripMemoryGroup;
      })
    | null;
  tripMemoryCategory: TripMemoryCategory[];
  photos?: {
    key: string;
    photoMetaInfo?: {
      /// common fields
      type?: IBPhotoMetaInfoType;
      title?: string;
      lat?: string;
      lng?: string;
      shotTime?: string;
      keyword?: string[];
      feature?: {
        super: string;
        name: string;
      }[];
      // eval?: string; /// for only MAIN fields /// 데이터 수집시에 MAIN 타입의 사진의 photoMetaInfo 에서 필수적으로 저장되어야 하는 데이터이지만(스키마에서는 nullable) photoMetaInfo에서 따로 입력받지 않고 addShareTripMemory할때 입력받는 recommendGrade로 자동 저장함
      desc?: string; /// for only MAIN fields
      publicInfo?: string; /// for DETAIL fields
    };
  }[];
}

export type ModifyShareTripMemoryResType = Omit<IBResFormat, 'IBparams'> & {
  IBparams: ModifyShareTripMemorySuccessResType | {};
};

/**
 * 공유 기억을 수정하는 api
 * https://www.figma.com/file/Tdpp5Q2J3h19NyvBvZMM2m/brip?node-id=464:2593&t=fxdTKyUVsRIw7Rd9-4
 * 1. modifyTripMemory와 다르게 한번 '공유'된 기억은 이미 공공에 공개된 정보로 같은 사진을 공유하는 '공유'의 사진정보를 수정하면 관련한 해당 유저의 tripMemory 사진정보도 수정된다.
 * 2. 만약 shareTripMemory에서 신규장소로 생성해서 tourPlace를 함께 생성한 shareTripMemory라면 최초 공유했을때의 사진또한 tourPlace와 공유하고 있다. 이후 본 api를 통해 사진 정보를 수정하면 tourPlace사진은 바뀌지 않는다.
 */
export const modifyShareTripMemory = asyncWrapper(
  async (
    req: Express.IBTypedReqBody<ModifyShareTripMemoryRequestType>,
    res: Express.IBTypedResponse<ModifyShareTripMemoryResType>,
  ) => {
    try {
      const { shareTripMemoryId, title, comment, photos } = req.body;
      const { locals } = req;
      const { memberId, userTokenId } = (() => {
        if (locals && locals?.grade === 'member')
          return {
            memberId: locals?.user?.id,
            userTokenId: locals?.user?.userTokenId,
          };
        // return locals?.tokenId;
        throw new IBError({
          type: 'NOTAUTHORIZED',
          message: 'member 등급만 접근 가능합니다.',
        });
      })();

      if (isNil(userTokenId) || isNil(memberId)) {
        throw new IBError({
          type: 'NOTEXISTDATA',
          message: '정상적으로 부여된 userTokenId를 가지고 있지 않습니다.',
        });
      }

      if (isNil(shareTripMemoryId) || isEmpty(shareTripMemoryId)) {
        throw new IBError({
          type: 'NOTEXISTDATA',
          message: 'shareTripMemoryId는 필수 값입니다.',
        });
      }

      if (
        (isNil(title) || isEmpty(title)) &&
        (isNil(comment) || isEmpty(comment)) &&
        isNil(photos) &&
        isEmpty(photos)
      ) {
        throw new IBError({
          type: 'NOTEXISTDATA',
          message: '최소 하나의 수정 파라미터는 있어야 합니다.',
        });
      }

      /// 들어온순서대로 사진 순서 부여
      const photosWithOrder = photos?.map((v, idx) => {
        return {
          ...v,
          photoMetaInfo: {
            ...v.photoMetaInfo,
            order: idx,
          },
        };
      });

      const img = isNil(photosWithOrder) ? undefined : photosWithOrder[0]?.key;

      const existCheck = await prisma.shareTripMemory.findUnique({
        where: {
          id: Number(shareTripMemoryId),
        },
        include: {
          tripMemoryCategory: true,
          photos: true,
        },
      });

      if (isNil(existCheck)) {
        throw new IBError({
          type: 'NOTEXISTDATA',
          message: '존재하지 않는 shareTripMemoryId입니다.',
        });
      }

      const exShareTripMem = existCheck;
      const shareTripMemory = await prisma.$transaction(async tx => {
        let newCreatedPhotoMetaInfo: IBPhotoMetaInfo[] = [];
        if (!isNil(photosWithOrder)) {
          const exPics = [...exShareTripMem.photos];
          const newPics = [...photosWithOrder];

          /// 삭제 후보사진 표시하기
          const delCandPhotos = exPics.reduce<IBPhotos[]>((acc, exPic) => {
            /// 이전 사진들중 새 사진과 일치하는 key가 있다면 지울 대상이 아니다.
            const isDel = !newPics.find(
              newPic => !isNil(exPic.key) && newPic.key.includes(exPic.key),
            );

            if (isDel) {
              return [...acc, exPic];
            }

            return acc;
          }, []);

          // /// s3와 db에서의 직접 사진 삭제기능은 보류한다. 관계만 끊는것으로 대체함
          if (!isEmpty(delCandPhotos)) {
            /// disconnect all with IBPhotos relations
            await Promise.all(
              delCandPhotos.map(v => {
                return tx.iBPhotos.update({
                  where: {
                    id: v.id,
                  },
                  data: {
                    tripMemoryId: null,
                    shareTripMemoryId: null,
                    // tourPlaceId: null,
                  },
                });
              }),
            );

            //   /// delete From IBPhotos DB model
            //   await Promise.all(
            //     delCandPhotos.map(v => {
            //       return tx.iBPhotos.delete({
            //         where: {
            //           id: v.id,
            //         },
            //       });
            //     }),
            //   );

            //   /// delete From S3 Photo key
            //   const deleteFromS3Result = await delObjectsFromS3(
            //     delCandPhotos
            //       .map(v => v.key)
            //       .filter((v): v is string => !isNil(v)),
            //   );
            //   console.log(deleteFromS3Result);
          }

          /// 기존에 존재하고 있던 사진
          const notChangePhotos = [...exPics];
          remove(notChangePhotos, exPic => {
            return !!delCandPhotos.find(delPic => exPic.id === delPic.id);
          });

          /// 이번 수정요청에서 새롭게 생성해야할 사진
          const newCreatePhoto = [...photosWithOrder];
          const modifyAlreadyExPhoto = remove(newCreatePhoto, newPic => {
            const a = !!notChangePhotos.find(
              notChangePic =>
                !isNil(notChangePic.key) &&
                notChangePic.key?.includes(newPic.key),
            );
            return a;
          });

          /// 새롭게 생성해야할 IBPhotos를 DB에 생성함
          /// 사진 메타 데이터와 사진을 먼저 생성후 tripMemory와 connect
          newCreatedPhotoMetaInfo = await Promise.all(
            newCreatePhoto.map((v, index) => {
              return tx.iBPhotoMetaInfo.create({
                data: {
                  type: v.photoMetaInfo.type as IBPhotoMetaInfoType,
                  order: index,
                  title: v.photoMetaInfo.title!,
                  lat: Number(v.photoMetaInfo.lat!),
                  lng: Number(v.photoMetaInfo.lng!),
                  shotTime: v.photoMetaInfo.shotTime,
                  ...(v.photoMetaInfo.keyword && {
                    keyword: {
                      connectOrCreate: v.photoMetaInfo.keyword.map(k => {
                        return {
                          where: {
                            name: k,
                          },
                          create: {
                            name: k,
                          },
                        };
                      }),
                    },
                  }),
                  ...(v.photoMetaInfo.feature && {
                    feature: {
                      connectOrCreate: v.photoMetaInfo.feature.map(k => {
                        return {
                          where: {
                            super_name: {
                              super: k.super,
                              name: k.name,
                            },
                          },
                          create: {
                            super: k.super,
                            name: k.name,
                          },
                        };
                      }),
                    },
                  }),
                  // eval: v.photoMetaInfo!.eval, /// 데이터 수집시에 MAIN 타입의 사진의 photoMetaInfo 에서 필수적으로 저장되어야 하는 데이터이지만(스키마에서는 nullable) photoMetaInfo에서 따로 입력받지 않고 addShareTripMemory할때 입력받는 recommendGrade로 자동 저장함
                  desc: v.photoMetaInfo.desc,
                  publicInfo: v.photoMetaInfo?.publicInfo,
                  photo: {
                    create: {
                      key: v.key,
                    },
                  },
                },
              });
            }),
          );

          await Promise.all(
            modifyAlreadyExPhoto.map(v => {
              const matched = notChangePhotos.find(k => k.key?.includes(v.key));
              if (isNil(v.photoMetaInfo)) return null;
              return tx.iBPhotos.update({
                where: {
                  id: matched!.id,
                },
                data: {
                  photoMetaInfo: {
                    update: {
                      order: v.photoMetaInfo.order,
                      ...(!isNil(v.photoMetaInfo.type) && {
                        type: v.photoMetaInfo.type,
                      }),
                      ...(!isNil(v.photoMetaInfo.title) && {
                        title: v.photoMetaInfo.title,
                      }),
                      ...(!isNil(v.photoMetaInfo.lat) && {
                        lat: Number(v.photoMetaInfo.lat),
                      }),
                      ...(!isNil(v.photoMetaInfo.lng) && {
                        lng: Number(v.photoMetaInfo.lng),
                      }),
                      ...(!isNil(v.photoMetaInfo.shotTime) && {
                        shotTime: v.photoMetaInfo.shotTime,
                      }),
                      ...(!isNil(v.photoMetaInfo.desc) && {
                        desc: v.photoMetaInfo.desc,
                      }),
                      ...(!isNil(v.photoMetaInfo.publicInfo) && {
                        publicInfo: v.photoMetaInfo.publicInfo,
                      }),
                      ...(!isNil(v.photoMetaInfo.keyword) && {
                        keyword: {
                          set: [],
                          connectOrCreate: v.photoMetaInfo.keyword.map(
                            keywordName => {
                              return {
                                where: {
                                  name: keywordName,
                                },
                                create: {
                                  name: keywordName,
                                },
                              };
                            },
                          ),
                        },
                      }),
                      ...(!isNil(v.photoMetaInfo.feature) && {
                        feature: {
                          set: [],
                          connectOrCreate: v.photoMetaInfo.feature.map(k => {
                            return {
                              where: {
                                super_name: {
                                  super: k.super,
                                  name: k.name,
                                },
                              },
                              create: {
                                super: k.super,
                                name: k.name,
                              },
                            };
                          }),
                        },
                      }),
                    },
                  },
                },
              });
            }),
          );
        }

        const updateResult = await tx.shareTripMemory.update({
          where: {
            id: Number(shareTripMemoryId),
          },
          data: {
            title,
            comment,
            img,
            ...(!isEmpty(newCreatedPhotoMetaInfo) && {
              photos: {
                connect: newCreatedPhotoMetaInfo.map(v => {
                  return {
                    id: v.photoId,
                  };
                }),
              },
            }),

            tripMemory: {
              update: {
                title,
                img,
                comment,
                ...(!isEmpty(newCreatedPhotoMetaInfo) && {
                  photos: {
                    connect: newCreatedPhotoMetaInfo.map(v => {
                      return {
                        id: v.photoId,
                      };
                    }),
                  },
                }),
              },
            },
          },

          include: {
            TourPlace: true,
            tripMemoryCategory: true,
            tripMemory: {
              include: {
                tag: true,
                group: true,
              },
            },
            photos: {
              include: {
                photoMetaInfo: {
                  include: {
                    keyword: true,
                    feature: true,
                  },
                },
              },
            },
          },
        });
        return updateResult;
      });

      res.json({
        ...ibDefs.SUCCESS,
        IBparams: shareTripMemory,
      });
    } catch (err) {
      if (err instanceof IBError) {
        if (err.type === 'NOTAUTHORIZED') {
          console.error(err);
          res.status(403).json({
            ...ibDefs.NOTAUTHORIZED,
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

        if (err.type === 'DBTRANSACTIONERROR') {
          console.error(err);
          res.status(500).json({
            ...ibDefs.DBTRANSACTIONERROR,
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

export interface DeleteShareTripMemoryRequestType {
  shareTripMemoryId: string;
}
export interface DeleteShareTripMemorySuccessResType {}

export type DeleteShareTripMemoryResType = Omit<IBResFormat, 'IBparams'> & {
  IBparams: DeleteShareTripMemorySuccessResType | {};
};

export const deleteShareTripMemory = asyncWrapper(
  async (
    req: Express.IBTypedReqBody<DeleteShareTripMemoryRequestType>,
    res: Express.IBTypedResponse<DeleteShareTripMemoryResType>,
  ) => {
    try {
      const { shareTripMemoryId } = req.body;
      const { locals } = req;
      const { memberId, userTokenId } = (() => {
        if (locals && locals?.grade === 'member')
          return {
            memberId: locals?.user?.id,
            userTokenId: locals?.user?.userTokenId,
          };
        // return locals?.tokenId;
        throw new IBError({
          type: 'NOTAUTHORIZED',
          message: 'member 등급만 접근 가능합니다.',
        });
      })();

      if (isNil(userTokenId) || isNil(memberId)) {
        throw new IBError({
          type: 'NOTEXISTDATA',
          message: '정상적으로 부여된 userTokenId를 가지고 있지 않습니다.',
        });
      }

      if (isNil(shareTripMemoryId) || isEmpty(shareTripMemoryId)) {
        throw new IBError({
          type: 'NOTEXISTDATA',
          message: 'shareTripMemoryId는 필수 값입니다.',
        });
      }

      const existCheck = await prisma.shareTripMemory.findUnique({
        where: {
          id: Number(shareTripMemoryId),
        },
        select: {
          id: true,
          userId: true,
        },
      });

      if (isNil(existCheck)) {
        throw new IBError({
          type: 'NOTEXISTDATA',
          message: '존재하지 않는 shareTripMemoryId입니다.',
        });
      }
      if (existCheck.userId !== Number(memberId)) {
        throw new IBError({
          type: 'NOTAUTHORIZED',
          message: '해당 유저의 권한으로 수정할 수 없는 shareTripMemory입니다.',
        });
      }

      await prisma.shareTripMemory.delete({
        where: {
          id: Number(shareTripMemoryId),
        },
      });

      res.json({
        ...ibDefs.SUCCESS,
        IBparams: {},
      });
    } catch (err) {
      if (err instanceof IBError) {
        if (err.type === 'NOTAUTHORIZED') {
          console.error(err);
          res.status(403).json({
            ...ibDefs.NOTAUTHORIZED,
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

        if (err.type === 'DBTRANSACTIONERROR') {
          console.error(err);
          res.status(500).json({
            ...ibDefs.DBTRANSACTIONERROR,
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

export interface LikeOrUnlilkeShareTripMemoryRequestType {
  shareTripMemoryId: string;
}
export interface LikeOrUnlilkeShareTripMemorySuccessResType {
  operation: 'like' | 'unlike';
  updateResult: {
    id: number;
    like: number;
    updatedAt: Date;
  };
}

export type LikeOrUnlilkeShareTripMemoryResType = Omit<
  IBResFormat,
  'IBparams'
> & {
  IBparams: LikeOrUnlilkeShareTripMemorySuccessResType | {};
};

/**
 * 트립 네트워크 '공유' 항목 좋아요 +1 요청 api
 * https://www.figma.com/file/Tdpp5Q2J3h19NyvBvZMM2m/brip?node-id=464:2593&t=fxdTKyUVsRIw7Rd9-4
 */

export const likeOrUnlikeShareTripMemory = asyncWrapper(
  async (
    req: Express.IBTypedReqBody<LikeOrUnlilkeShareTripMemoryRequestType>,
    res: Express.IBTypedResponse<LikeOrUnlilkeShareTripMemoryResType>,
  ) => {
    try {
      const { shareTripMemoryId } = req.body;
      const { locals } = req;
      const { memberId, userTokenId } = (() => {
        if (locals && locals?.grade === 'member')
          return {
            memberId: locals?.user?.id,
            userTokenId: locals?.user?.userTokenId,
          };
        // return locals?.tokenId;
        throw new IBError({
          type: 'NOTAUTHORIZED',
          message: 'member 등급만 접근 가능합니다.',
        });
      })();

      if (isNil(userTokenId) || isNil(memberId)) {
        throw new IBError({
          type: 'NOTEXISTDATA',
          message: '정상적으로 부여된 userTokenId를 가지고 있지 않습니다.',
        });
      }

      if (isNil(shareTripMemoryId) || isEmpty(shareTripMemoryId)) {
        throw new IBError({
          type: 'NOTEXISTDATA',
          message: 'shareTripMemoryId는 필수 값입니다.',
        });
      }

      const existCheck = await prisma.shareTripMemory.findUnique({
        where: {
          id: Number(shareTripMemoryId),
        },
        select: {
          id: true,
          like: true,
          likeFrom: {
            where: {
              id: Number(memberId),
            },
            select: {
              id: true,
            },
          },
        },
      });

      if (isNil(existCheck)) {
        throw new IBError({
          type: 'NOTEXISTDATA',
          message: '존재하지 않는 shareTripMemoryId입니다.',
        });
      }

      // if (!isEmpty(existCheck.likeFrom)) {
      //   throw new IBError({
      //     type: 'DUPLICATEDDATA',
      //     message: '이미 이전에 like 하였습니다.',
      //   });
      // }

      if (isNil(existCheck.likeFrom) || isEmpty(existCheck.likeFrom)) {
        /// 이전에 memberId 유저가 이 shareTripMemory에 대해 like한 이력이 없음 => 때문에 like 처리함
        const likeResult = await prisma.shareTripMemory.update({
          where: {
            id: Number(shareTripMemoryId),
          },
          data: {
            like: Number(existCheck.like) + 1,
            likeFrom: {
              connect: {
                id: Number(memberId),
              },
            },
          },
          select: {
            id: true,
            updatedAt: true,
            like: true,
          },
        });
        res.json({
          ...ibDefs.SUCCESS,
          IBparams: {
            operation: 'like',
            updateResult: likeResult,
          },
        });
        return;
      }

      /// 이전에 memberId 유저가 이 shareTripMemory에 대해 like한 이력이 있음 => 때문에 unlike 처리함
      const unlikeResult = await prisma.shareTripMemory.update({
        where: {
          id: Number(shareTripMemoryId),
        },
        data: {
          like: Number(existCheck.like) - 1,
          likeFrom: {
            disconnect: {
              id: Number(memberId),
            },
          },
        },
        select: {
          id: true,
          updatedAt: true,
          like: true,
        },
      });
      res.json({
        ...ibDefs.SUCCESS,
        IBparams: {
          operation: 'unlike',
          updateResult: unlikeResult,
        },
      });
    } catch (err) {
      if (err instanceof IBError) {
        if (err.type === 'NOTAUTHORIZED') {
          console.error(err);
          res.status(403).json({
            ...ibDefs.NOTAUTHORIZED,
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

        if (err.type === 'DUPLICATEDDATA') {
          console.error(err);
          res.status(409).json({
            ...ibDefs.DUPLICATEDDATA,
            IBdetail: (err as Error).message,
            IBparams: {} as object,
          });
          return;
        }

        if (err.type === 'DBTRANSACTIONERROR') {
          console.error(err);
          res.status(500).json({
            ...ibDefs.DBTRANSACTIONERROR,
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

export interface LikeOrUnlilkeTourPlaceRequestType {
  tourPlaceId: string;
}
export interface LikeOrUnlilkeTourPlaceSuccessResType {
  operation: 'like' | 'unlike';
  updateResult: {
    id: number;
    like: number;
    updatedAt: Date;
  };
}

export type LikeOrUnlilkeTourPlaceResType = Omit<IBResFormat, 'IBparams'> & {
  IBparams: LikeOrUnlilkeTourPlaceSuccessResType | {};
};

/**
 * 트립 네트워크 장소에 항목 좋아요 +1 요청 api
 * https://www.figma.com/file/Tdpp5Q2J3h19NyvBvZMM2m/brip?node-id=228:1202&t=yRRDwI04Yo5Y0wqe-4
 */
export const likeOrUnlikeTourPlace = asyncWrapper(
  async (
    req: Express.IBTypedReqBody<LikeOrUnlilkeTourPlaceRequestType>,
    res: Express.IBTypedResponse<LikeOrUnlilkeTourPlaceResType>,
  ) => {
    try {
      const { tourPlaceId } = req.body;
      const { locals } = req;
      const { memberId, userTokenId } = (() => {
        if (locals && locals?.grade === 'member')
          return {
            memberId: locals?.user?.id,
            userTokenId: locals?.user?.userTokenId,
          };
        // return locals?.tokenId;
        throw new IBError({
          type: 'NOTAUTHORIZED',
          message: 'member 등급만 접근 가능합니다.',
        });
      })();

      if (isNil(userTokenId) || isNil(memberId)) {
        throw new IBError({
          type: 'NOTEXISTDATA',
          message: '정상적으로 부여된 userTokenId를 가지고 있지 않습니다.',
        });
      }

      if (isNil(tourPlaceId) || isEmpty(tourPlaceId)) {
        throw new IBError({
          type: 'NOTEXISTDATA',
          message: 'tourPlaceId는 필수 값입니다.',
        });
      }

      const existCheck = await prisma.tourPlace.findUnique({
        where: {
          id: Number(tourPlaceId),
        },
        select: {
          id: true,
          like: true,
          likeFrom: {
            where: {
              id: Number(memberId),
            },
            select: {
              id: true,
            },
          },
          shareTripMemory: {
            select: {
              id: true,
            },
          },
        },
      });

      if (isNil(existCheck)) {
        throw new IBError({
          type: 'NOTEXISTDATA',
          message: '존재하지 않는 tourPlaceId입니다.',
        });
      }

      // if (isEmpty(existCheck.shareTripMemory)) {
      //   throw new IBError({
      //     type: 'NOTEXISTDATA',
      //     message: '어떤 user도 공유하지 않은 장소입니다.',
      //   });
      // }

      if (isEmpty(existCheck.likeFrom)) {
        /// 이전에 memberId 유저가 이 tourPlace에 대해 like한 이력이 없음
        const likeResult = await prisma.tourPlace.update({
          where: {
            id: Number(tourPlaceId),
          },
          data: {
            like: Number(existCheck.like) + 1,
            likeFrom: {
              connect: {
                id: Number(memberId),
              },
            },
          },
          select: {
            id: true,
            updatedAt: true,
            like: true,
          },
        });
        res.json({
          ...ibDefs.SUCCESS,
          IBparams: {
            operation: 'like',
            updateResult: likeResult,
          },
        });
        return;
      }

      const unlikeResult = await prisma.tourPlace.update({
        where: {
          id: Number(tourPlaceId),
        },
        data: {
          like: Number(existCheck.like) - 1,
          likeFrom: {
            disconnect: {
              id: Number(memberId),
            },
          },
        },
        select: {
          id: true,
          updatedAt: true,
          like: true,
        },
      });
      res.json({
        ...ibDefs.SUCCESS,
        IBparams: {
          operation: 'unlike',
          updateResult: unlikeResult,
        },
      });
    } catch (err) {
      if (err instanceof IBError) {
        if (err.type === 'NOTAUTHORIZED') {
          console.error(err);
          res.status(403).json({
            ...ibDefs.NOTAUTHORIZED,
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

        if (err.type === 'DUPLICATEDDATA') {
          console.error(err);
          res.status(409).json({
            ...ibDefs.DUPLICATEDDATA,
            IBdetail: (err as Error).message,
            IBparams: {} as object,
          });
          return;
        }

        if (err.type === 'DBTRANSACTIONERROR') {
          console.error(err);
          res.status(500).json({
            ...ibDefs.DBTRANSACTIONERROR,
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

export interface CheckLikeShareTripMemoryRequestType {
  shareTripMemoryId: string;
}
export interface CheckLikeShareTripMemorySuccessResType {
  status: 'like' | 'unlike';
}

export type CheckLikeShareTripMemoryResType = Omit<IBResFormat, 'IBparams'> & {
  IBparams: CheckLikeShareTripMemorySuccessResType | {};
};

export const checkLikeShareTripMemory = asyncWrapper(
  async (
    req: Express.IBTypedReqBody<CheckLikeShareTripMemoryRequestType>,
    res: Express.IBTypedResponse<CheckLikeShareTripMemoryResType>,
  ) => {
    try {
      const { shareTripMemoryId } = req.body;
      const { locals } = req;
      const { memberId, userTokenId } = (() => {
        if (locals && locals?.grade === 'member')
          return {
            memberId: locals?.user?.id,
            userTokenId: locals?.user?.userTokenId,
          };
        // return locals?.tokenId;
        throw new IBError({
          type: 'NOTAUTHORIZED',
          message: 'member 등급만 접근 가능합니다.',
        });
      })();

      if (isNil(userTokenId) || isNil(memberId)) {
        throw new IBError({
          type: 'NOTEXISTDATA',
          message: '정상적으로 부여된 userTokenId를 가지고 있지 않습니다.',
        });
      }

      if (isNil(shareTripMemoryId) || isEmpty(shareTripMemoryId)) {
        throw new IBError({
          type: 'NOTEXISTDATA',
          message: 'shareTripMemoryId는 필수 값입니다.',
        });
      }

      const existCheck = await prisma.shareTripMemory.findUnique({
        where: {
          id: Number(shareTripMemoryId),
        },
        select: {
          id: true,
          like: true,
          likeFrom: {
            where: {
              id: Number(memberId),
            },
            select: {
              id: true,
            },
          },
        },
      });

      if (isNil(existCheck)) {
        throw new IBError({
          type: 'NOTEXISTDATA',
          message: '존재하지 않는 shareTripMemoryId입니다.',
        });
      }

      if (isNil(existCheck.likeFrom) || isEmpty(existCheck.likeFrom)) {
        /// 이전에 memberId 유저가 이 shareTripMemory에 대해 like한 이력이 없음
        res.json({
          ...ibDefs.SUCCESS,
          IBparams: {
            status: 'unlike',
          },
        });
        return;
      }

      res.json({
        ...ibDefs.SUCCESS,
        IBparams: {
          status: 'like',
        },
      });
    } catch (err) {
      if (err instanceof IBError) {
        if (err.type === 'NOTAUTHORIZED') {
          console.error(err);
          res.status(403).json({
            ...ibDefs.NOTAUTHORIZED,
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

        if (err.type === 'DUPLICATEDDATA') {
          console.error(err);
          res.status(409).json({
            ...ibDefs.DUPLICATEDDATA,
            IBdetail: (err as Error).message,
            IBparams: {} as object,
          });
          return;
        }

        if (err.type === 'DBTRANSACTIONERROR') {
          console.error(err);
          res.status(500).json({
            ...ibDefs.DBTRANSACTIONERROR,
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

export interface CheckLikeTourPlaceRequestType {
  tourPlaceId: string;
}
export interface CheckLikeTourPlaceSuccessResType {
  status: 'like' | 'unlike';
}

export type CheckLikeTourPlaceResType = Omit<IBResFormat, 'IBparams'> & {
  IBparams: CheckLikeTourPlaceSuccessResType | {};
};

/**
 * accessToken을 제공한 유저가 해당 '장소' 항목에 좋아요 했는지 여부를 확인 요청하는 api
 */
export const checkLikeTourPlace = asyncWrapper(
  async (
    req: Express.IBTypedReqBody<CheckLikeTourPlaceRequestType>,
    res: Express.IBTypedResponse<CheckLikeTourPlaceResType>,
  ) => {
    try {
      const { tourPlaceId } = req.body;
      const { locals } = req;
      const { memberId, userTokenId } = (() => {
        if (locals && locals?.grade === 'member')
          return {
            memberId: locals?.user?.id,
            userTokenId: locals?.user?.userTokenId,
          };
        // return locals?.tokenId;
        throw new IBError({
          type: 'NOTAUTHORIZED',
          message: 'member 등급만 접근 가능합니다.',
        });
      })();

      if (isNil(userTokenId) || isNil(memberId)) {
        throw new IBError({
          type: 'NOTEXISTDATA',
          message: '정상적으로 부여된 userTokenId를 가지고 있지 않습니다.',
        });
      }

      if (isNil(tourPlaceId) || isEmpty(tourPlaceId)) {
        throw new IBError({
          type: 'INVALIDPARAMS',
          message: 'tourPlaceId는 필수 값입니다.',
        });
      }

      const existCheck = await prisma.tourPlace.findUnique({
        where: {
          id: Number(tourPlaceId),
        },
        select: {
          id: true,
          like: true,
          likeFrom: {
            where: {
              id: Number(memberId),
            },
            select: {
              id: true,
            },
          },
          shareTripMemory: {
            select: {
              id: true,
            },
          },
        },
      });

      if (isNil(existCheck)) {
        throw new IBError({
          type: 'NOTEXISTDATA',
          message: '존재하지 않는 tourPlaceId입니다.',
        });
      }

      // if (isEmpty(existCheck.shareTripMemory)) {
      //   throw new IBError({
      //     type: 'NOTEXISTDATA',
      //     message: '어떤 user도 공유하지 않은 장소입니다.',
      //   });
      // }

      if (isNil(existCheck.likeFrom) || isEmpty(existCheck.likeFrom)) {
        /// 이전에 memberId 유저가 이 tourPlace에 대해 like한 이력이 없음
        res.json({
          ...ibDefs.SUCCESS,
          IBparams: {
            status: 'unlike',
          },
        });
        return;
      }

      res.json({
        ...ibDefs.SUCCESS,
        IBparams: {
          status: 'like',
        },
      });
    } catch (err) {
      if (err instanceof IBError) {
        if (err.type === 'NOTAUTHORIZED') {
          console.error(err);
          res.status(403).json({
            ...ibDefs.NOTAUTHORIZED,
            IBdetail: (err as Error).message,
            IBparams: {} as object,
          });
          return;
        }

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

        if (err.type === 'DUPLICATEDDATA') {
          console.error(err);
          res.status(409).json({
            ...ibDefs.DUPLICATEDDATA,
            IBdetail: (err as Error).message,
            IBparams: {} as object,
          });
          return;
        }

        if (err.type === 'DBTRANSACTIONERROR') {
          console.error(err);
          res.status(500).json({
            ...ibDefs.DBTRANSACTIONERROR,
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

tripNetworkRouter.post('/addTripMemGrp', accessTokenValidCheck, addTripMemGrp);
tripNetworkRouter.post(
  '/getTripMemGrpList',
  accessTokenValidCheck,
  getTripMemGrpList,
);
tripNetworkRouter.post(
  '/addTripMemory',
  accessTokenValidCheck,
  addTripMemoryWrapper,
);
tripNetworkRouter.post(
  '/addTripMemCategory',
  accessTokenValidCheck,
  addTripMemCategory,
);
tripNetworkRouter.post(
  '/getTripMemCategoryList',
  accessTokenValidCheck,
  getTripMemCategoryList,
);
tripNetworkRouter.post(
  '/addShareTripMemory',
  accessTokenValidCheck,
  addShareTripMemory,
);
tripNetworkRouter.post(
  '/getReplyListByShareTripMem',
  accessTokenValidCheck,
  getReplyListByShareTripMem,
);

tripNetworkRouter.post(
  '/delShareTripMemReply',
  accessTokenValidCheck,
  delShareTripMemReply,
);
tripNetworkRouter.post(
  '/getNrbyPlaceListWithGeoLoc',
  accessTokenValidCheck,
  getNrbyPlaceListWithGeoLocWrapper,
);
tripNetworkRouter.post(
  '/addReplyToShareTripMemory',
  accessTokenValidCheck,
  addReplyToShareTripMemory,
);

tripNetworkRouter.post(
  '/modifyReplyToShareTripMemory',
  accessTokenValidCheck,
  modifyReplyToShareTripMemory,
);

tripNetworkRouter.post(
  '/deleteReplyToShareTripMemory',
  accessTokenValidCheck,
  deleteReplyToShareTripMemory,
);
tripNetworkRouter.post(
  '/getShareTripMemList',
  accessTokenValidCheck,
  getShareTripMemList,
);
tripNetworkRouter.post(
  '/getShareTripMemListByPlace',
  accessTokenValidCheck,
  getShareTripMemListByPlace,
);
tripNetworkRouter.post(
  '/getTripMemList',
  accessTokenValidCheck,
  getTripMemList,
);
tripNetworkRouter.post(
  '/getTripMemListByGroup',
  accessTokenValidCheck,
  getTripMemListByGroup,
);

tripNetworkRouter.get(
  '/getNotiNewComment',
  accessTokenValidCheck,
  getNotiNewComment,
);
tripNetworkRouter.post(
  '/checkNotiNewComment',
  accessTokenValidCheck,
  checkNotiNewComment,
);

tripNetworkRouter.post(
  '/modifyTripMemory',
  accessTokenValidCheck,
  modifyTripMemoryWrapper,
);

tripNetworkRouter.post(
  '/deleteTripMemory',
  accessTokenValidCheck,
  deleteTripMemoryWrapper,
);

tripNetworkRouter.post(
  '/modifyShareTripMemory',
  accessTokenValidCheck,
  modifyShareTripMemory,
);

tripNetworkRouter.post(
  '/deleteShareTripMemory',
  accessTokenValidCheck,
  deleteShareTripMemory,
);

tripNetworkRouter.post(
  '/likeOrUnlikeShareTripMemory',
  accessTokenValidCheck,
  likeOrUnlikeShareTripMemory,
);
tripNetworkRouter.post(
  '/likeOrUnlikeTourPlace',
  accessTokenValidCheck,
  likeOrUnlikeTourPlace,
);

tripNetworkRouter.post(
  '/checkLikeTourPlace',
  accessTokenValidCheck,
  checkLikeTourPlace,
);
tripNetworkRouter.post(
  '/checkLikeShareTripMemory',
  accessTokenValidCheck,
  checkLikeShareTripMemory,
);

export default tripNetworkRouter;
