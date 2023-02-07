import express, { Express } from 'express';
import prisma from '@src/prisma';
import {
  ibDefs,
  asyncWrapper,
  IBResFormat,
  IBError,
  accessTokenValidCheck,
  IBContext,
  getS3SignedUrl,
} from '@src/utils';
import {
  Prisma,
  TripMemoryGroup,
  TripMemory,
  TripMemoryTag,
  ShareTripMemory,
  TourPlace,
  TripMemoryCategory,
  ReplyForShareTripMemory,
} from '@prisma/client';
import { isEmpty, isNil } from 'lodash';
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
          res.status(403).json({
            ...ibDefs.NOTAUTHORIZED,
            IBdetail: (err as Error).message,
            IBparams: {} as object,
          });
          return;
        }

        if (err.type === 'NOTEXISTDATA') {
          res.status(404).json({
            ...ibDefs.NOTEXISTDATA,
            IBdetail: (err as Error).message,
            IBparams: {} as object,
          });
          return;
        }

        if (err.type === 'DBTRANSACTIONERROR') {
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
          res.status(403).json({
            ...ibDefs.NOTAUTHORIZED,
            IBdetail: (err as Error).message,
            IBparams: {} as object,
          });
          return;
        }

        if (err.type === 'NOTEXISTDATA') {
          res.status(404).json({
            ...ibDefs.NOTEXISTDATA,
            IBdetail: (err as Error).message,
            IBparams: {} as object,
          });
          return;
        }

        if (err.type === 'DBTRANSACTIONERROR') {
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

export interface AddTripMemoryRequestType {
  title: string;
  comment: string;
  hashTag?: string[];
  address?: string;
  lat: string;
  lng: string;
  img: string;
  groupId: string;
}
export interface AddTripMemorySuccessResType extends TripMemory {
  tag: TripMemoryTag[];
  group: TripMemoryGroup;
}

export type AddTripMemoryResType = Omit<IBResFormat, 'IBparams'> & {
  IBparams: AddTripMemorySuccessResType | {};
};

export interface ContextAddTripMemory extends IBContext {}

const addTripMemory = async (
  param: AddTripMemoryRequestType,
  ctx: ContextAddTripMemory,
): Promise<AddTripMemorySuccessResType> => {
  const { title, comment, hashTag, address, lat, lng, img, groupId } = param;
  const tripMemoryGroup = await prisma.tripMemoryGroup.findUnique({
    where: {
      id: Number(groupId),
    },
  });

  if (!tripMemoryGroup || tripMemoryGroup.userId !== Number(ctx.memberId))
    throw new IBError({
      type: 'NOTEXISTDATA',
      message: '존재하지 않는 그룹입니다.',
    });

  if (tripMemoryGroup.userId !== Number(ctx.memberId))
    throw new IBError({
      type: 'NOTAUTHORIZED',
      message: '해당 유저의 권한으로 조회할수 없는 그룹입니다.',
    });

  const createdTripMem = await prisma.$transaction(async tx => {
    const prevStartDate = !isNil(tripMemoryGroup.startDate)
      ? tripMemoryGroup.startDate
      : moment().startOf('d').toISOString();
    const prevEndDate = !isNil(tripMemoryGroup.endDate)
      ? tripMemoryGroup.endDate
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

    const createdOne = await tx.tripMemory.create({
      data: {
        title,
        comment,
        lat: Number(lat),
        lng: Number(lng),
        address,
        img,
        group: {
          connect: {
            id: Number(groupId),
          },
        },
        user: {
          connect: {
            id: ctx.memberId!,
          },
        },
        ...(hashTag &&
          !isEmpty(hashTag) && {
            tag: {
              connectOrCreate: hashTag.map(tag => {
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
      },
      include: {
        tag: true,
        group: true,
      },
    });
    return createdOne;
  });

  return createdTripMem;
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
        if (err.type === 'NOTAUTHORIZED') {
          res.status(403).json({
            ...ibDefs.NOTAUTHORIZED,
            IBdetail: (err as Error).message,
            IBparams: {} as object,
          });
          return;
        }

        if (err.type === 'NOTEXISTDATA') {
          res.status(404).json({
            ...ibDefs.NOTEXISTDATA,
            IBdetail: (err as Error).message,
            IBparams: {} as object,
          });
          return;
        }

        if (err.type === 'DBTRANSACTIONERROR') {
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
          res.status(403).json({
            ...ibDefs.NOTAUTHORIZED,
            IBdetail: (err as Error).message,
            IBparams: {} as object,
          });
          return;
        }

        if (err.type === 'NOTEXISTDATA') {
          res.status(404).json({
            ...ibDefs.NOTEXISTDATA,
            IBdetail: (err as Error).message,
            IBparams: {} as object,
          });
          return;
        }

        if (err.type === 'DBTRANSACTIONERROR') {
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
          res.status(403).json({
            ...ibDefs.NOTAUTHORIZED,
            IBdetail: (err as Error).message,
            IBparams: {} as object,
          });
          return;
        }

        if (err.type === 'NOTEXISTDATA') {
          res.status(404).json({
            ...ibDefs.NOTEXISTDATA,
            IBdetail: (err as Error).message,
            IBparams: {} as object,
          });
          return;
        }

        if (err.type === 'DBTRANSACTIONERROR') {
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
  recommendGrade: 'good' | 'notbad' | 'bad';
  categoryIds: string[];
  tourPlaceId?: string | null;
}
export interface AddShareTripMemorySuccessResType extends ShareTripMemory {
  TourPlace: TourPlace | null;
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
      const { tripMemoryParam, recommendGrade, categoryIds, tourPlaceId } =
        req.body;
      const { title, comment, address, lat, lng, img } = tripMemoryParam;
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

      const tripMemoryCategory = await prisma.tripMemoryCategory.findMany({
        where: {
          id: {
            in: categoryIds.map(v => Number(v)),
          },
        },
      });

      if (
        !tripMemoryCategory ||
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

      const ctx = {
        userTokenId,
        memberId,
      };
      const createdTripMem = await addTripMemory(tripMemoryParam, ctx);

      const shareTripMemory = await prisma.shareTripMemory.create({
        data: {
          title,
          lat: Number(lat),
          lng: Number(lng),
          address,
          img,
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
          tripMemory: {
            connect: {
              id: createdTripMem.id,
            },
          },
          TourPlace: isNil(tourPlaceId)
            ? {
                create: {
                  lat: Number(lat),
                  lng: Number(lng),
                  address,
                  tourPlaceType: 'USER_SPOT',
                  photos: {
                    create: {
                      photo_reference: img,
                    },
                  },
                },
              }
            : {
                connect: {
                  id: Number(tourPlaceId),
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
        },
      });

      const recommendUpdatePromise = (() => {
        if (recommendGrade === 'good') {
          const nextGood = shareTripMemory.TourPlace!.good + 1;
          return prisma.tourPlace.update({
            where: {
              id: shareTripMemory.TourPlace!.id,
            },
            data: {
              good: nextGood,
            },
          });
        }
        if (recommendGrade === 'notbad') {
          const nextNotBad = shareTripMemory.TourPlace!.notBad + 1;
          return prisma.tourPlace.update({
            where: {
              id: shareTripMemory.TourPlace!.id,
            },
            data: {
              notBad: nextNotBad,
            },
          });
        }
        const nextBad = shareTripMemory.TourPlace!.bad + 1;
        return prisma.tourPlace.update({
          where: {
            id: shareTripMemory.TourPlace!.id,
          },
          data: {
            bad: nextBad,
          },
        });
      })();

      await recommendUpdatePromise;

      res.json({
        ...ibDefs.SUCCESS,
        IBparams: shareTripMemory,
      });
    } catch (err) {
      if (err instanceof IBError) {
        if (err.type === 'NOTAUTHORIZED') {
          res.status(403).json({
            ...ibDefs.NOTAUTHORIZED,
            IBdetail: (err as Error).message,
            IBparams: {} as object,
          });
          return;
        }

        if (err.type === 'NOTEXISTDATA') {
          res.status(404).json({
            ...ibDefs.NOTEXISTDATA,
            IBdetail: (err as Error).message,
            IBparams: {} as object,
          });
          return;
        }

        if (err.type === 'DBTRANSACTIONERROR') {
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

export const getNrbyPlaceListWithGeoLoc = asyncWrapper(
  async (
    req: Express.IBTypedReqBody<GetNrbyPlaceListWithGeoLocRequestType>,
    res: Express.IBTypedResponse<GetNrbyPlaceListWithGeoLocResType>,
  ) => {
    try {
      const {
        minLat,
        minLng,
        maxLat,
        maxLng,
        take = '10',
        lastId = '1',
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

      const count = await prisma.tourPlace.aggregate({
        where: {
          OR: [
            {
              AND: [
                { lat: { gte: Number(minLat) } },
                { lat: { lt: Number(maxLat) } },
                { lng: { gte: Number(minLng) } },
                { lng: { lt: Number(maxLng) } },
              ],
            },
            {
              AND: [
                { gl_lat: { gte: Number(minLat) } },
                { gl_lat: { lt: Number(maxLat) } },
                { gl_lng: { gte: Number(minLng) } },
                { gl_lng: { lt: Number(maxLng) } },
              ],
            },
            {
              AND: [
                { vj_latitude: { gte: Number(minLat) } },
                { vj_latitude: { lt: Number(maxLat) } },
                { vj_longitude: { gte: Number(minLng) } },
                { vj_longitude: { lt: Number(maxLng) } },
              ],
            },
          ],
          status: 'IN_USE',
        },
        _count: {
          id: true,
        },
      });
      const foundTourPlace = await prisma.tourPlace.findMany({
        where: {
          OR: [
            {
              AND: [
                { lat: { gte: Number(minLat) } },
                { lat: { lt: Number(maxLat) } },
                { lng: { gte: Number(minLng) } },
                { lng: { lt: Number(maxLng) } },
              ],
            },
            {
              AND: [
                { gl_lat: { gte: Number(minLat) } },
                { gl_lat: { lt: Number(maxLat) } },
                { gl_lng: { gte: Number(minLng) } },
                { gl_lng: { lt: Number(maxLng) } },
              ],
            },
            {
              AND: [
                { vj_latitude: { gte: Number(minLat) } },
                { vj_latitude: { lt: Number(maxLat) } },
                { vj_longitude: { gte: Number(minLng) } },
                { vj_longitude: { lt: Number(maxLng) } },
              ],
            },
          ],
        },
        take: Number(take),
        cursor: {
          id: Number(lastId) + 1,
        },
      });

      res.json({
        ...ibDefs.SUCCESS,
        IBparams: {
          // eslint-disable-next-line no-underscore-dangle
          totalCount: count._count.id ?? 0,
          returnedCount: foundTourPlace.length,
          list: foundTourPlace,
        },
      });
    } catch (err) {
      if (err instanceof IBError) {
        if (err.type === 'NOTAUTHORIZED') {
          res.status(403).json({
            ...ibDefs.NOTAUTHORIZED,
            IBdetail: (err as Error).message,
            IBparams: {} as object,
          });
          return;
        }

        if (err.type === 'NOTEXISTDATA') {
          res.status(404).json({
            ...ibDefs.NOTEXISTDATA,
            IBdetail: (err as Error).message,
            IBparams: {} as object,
          });
          return;
        }

        if (err.type === 'DBTRANSACTIONERROR') {
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

      const shareTripMemoryId = await (async () => {
        // if (isNil(userInputShareTripMemId) && !isNil(parentReplyId)) {
        if (!isNil(parentReplyId)) {
          const parentReply = await prisma.replyForShareTripMemory.findUnique({
            where: {
              id: Number(parentReplyId),
            },
            select: {
              shareTripMemoryId: true,
              parentReplyId: true,
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
              message: '대댓글 기능은 지원하지 않습니다.',
            });
          }

          return parentReply.shareTripMemoryId;
        }
        return Number(userInputShareTripMemId);
      })();

      const createdOne = await prisma.replyForShareTripMemory.create({
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
        },
      });

      res.json({
        ...ibDefs.SUCCESS,
        IBparams: createdOne,
      });
    } catch (err) {
      if (err instanceof IBError) {
        if (err.type === 'NOTAUTHORIZED') {
          res.status(403).json({
            ...ibDefs.NOTAUTHORIZED,
            IBdetail: (err as Error).message,
            IBparams: {} as object,
          });
          return;
        }

        if (err.type === 'NOTEXISTDATA') {
          res.status(404).json({
            ...ibDefs.NOTEXISTDATA,
            IBdetail: (err as Error).message,
            IBparams: {} as object,
          });
          return;
        }

        if (err.type === 'DBTRANSACTIONERROR') {
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
        IBparams: found,
      });
    } catch (err) {
      if (err instanceof IBError) {
        if (err.type === 'NOTAUTHORIZED') {
          res.status(403).json({
            ...ibDefs.NOTAUTHORIZED,
            IBdetail: (err as Error).message,
            IBparams: {} as object,
          });
          return;
        }

        if (err.type === 'NOTEXISTDATA') {
          res.status(404).json({
            ...ibDefs.NOTEXISTDATA,
            IBdetail: (err as Error).message,
            IBparams: {} as object,
          });
          return;
        }

        if (err.type === 'DBTRANSACTIONERROR') {
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
          res.status(403).json({
            ...ibDefs.NOTAUTHORIZED,
            IBdetail: (err as Error).message,
            IBparams: {} as object,
          });
          return;
        }

        if (err.type === 'NOTEXISTDATA') {
          res.status(404).json({
            ...ibDefs.NOTEXISTDATA,
            IBdetail: (err as Error).message,
            IBparams: {} as object,
          });
          return;
        }

        if (err.type === 'DBTRANSACTIONERROR') {
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
          res.status(403).json({
            ...ibDefs.NOTAUTHORIZED,
            IBdetail: (err as Error).message,
            IBparams: {} as object,
          });
          return;
        }

        if (err.type === 'NOTEXISTDATA') {
          res.status(404).json({
            ...ibDefs.NOTEXISTDATA,
            IBdetail: (err as Error).message,
            IBparams: {} as object,
          });
          return;
        }

        if (err.type === 'DBTRANSACTIONERROR') {
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
          res.status(403).json({
            ...ibDefs.NOTAUTHORIZED,
            IBdetail: (err as Error).message,
            IBparams: {} as object,
          });
          return;
        }

        if (err.type === 'NOTEXISTDATA') {
          res.status(404).json({
            ...ibDefs.NOTEXISTDATA,
            IBdetail: (err as Error).message,
            IBparams: {} as object,
          });
          return;
        }

        if (err.type === 'DBTRANSACTIONERROR') {
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
}
export interface GetShareTripMemListSuccessResType extends ShareTripMemory {
  TourPlace: {
    good: number;
    like: number;
  } | null;
  user: {
    id: number;
    nickName: string;
    profileImg: string | null;
    tripCreator: {
      nickName: string;
    }[];
  };
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

      if (!isNil(shareTripMemoryId)) {
        const foundShareTripMem = await prisma.shareTripMemory.findUnique({
          where: {
            id: Number(shareTripMemoryId),
          },
          include: {
            TourPlace: true,
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
          },
        });

        if (isNil(foundShareTripMem)) {
          throw new IBError({
            type: 'NOTEXISTDATA',
            message: '존재하지 않는 shareTripMemoryId입니다.',
          });
        }
        const { profileImg } = foundShareTripMem.user;
        res.json({
          ...ibDefs.SUCCESS,
          IBparams: [
            {
              ...foundShareTripMem,
              img: foundShareTripMem.img.includes('http')
                ? foundShareTripMem.img
                : await getS3SignedUrl(foundShareTripMem.img),
              user: {
                ...foundShareTripMem.user,
                ...(!isNil(profileImg) && {
                  profileImg: profileImg.includes('http')
                    ? profileImg
                    : await getS3SignedUrl(profileImg),
                }),
              },
            },
          ],
        });
        return;
      }

      const foundShareTripMemList = await prisma.shareTripMemory.findMany({
        where: {
          tripMemoryCategory: {
            some: {
              name: {
                contains: categoryKeyword,
              },
            },
          },
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
          TourPlace: {
            select: {
              good: true,
              like: true,
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
            TourPlace: {
              like: 'desc',
            },
          },
        }),
      });

      if (!isNil(lastId)) foundShareTripMemList.shift();

      res.json({
        ...ibDefs.SUCCESS,
        IBparams: await Promise.all(
          foundShareTripMemList.map(async v => {
            const userImg = await (() => {
              const { profileImg } = v.user;
              if (!isNil(profileImg)) {
                if (profileImg.includes('http')) return profileImg;
                return getS3SignedUrl(profileImg);
              }
              return null;
            })();

            const ret = {
              ...v,
              img: v.img.includes('http') ? v.img : await getS3SignedUrl(v.img),
              user: {
                ...v.user,
                profileImg: userImg,
              },
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
          res.status(403).json({
            ...ibDefs.NOTAUTHORIZED,
            IBdetail: (err as Error).message,
            IBparams: {} as object,
          });
          return;
        }

        if (err.type === 'NOTEXISTDATA') {
          res.status(404).json({
            ...ibDefs.NOTEXISTDATA,
            IBdetail: (err as Error).message,
            IBparams: {} as object,
          });
          return;
        }

        if (err.type === 'DBTRANSACTIONERROR') {
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
  getNrbyPlaceListWithGeoLoc,
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

export default tripNetworkRouter;
