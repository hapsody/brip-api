import express, { Express } from 'express';
import prisma from '@src/prisma';
import {
  ibDefs,
  asyncWrapper,
  IBResFormat,
  IBError,
  accessTokenValidCheck,
  IBContext,
} from '@src/utils';
import {
  TripMemoryGroup,
  TripMemory,
  TripMemoryTag,
  ShareTripMemory,
  TourPlace,
  TripMemoryCategory,
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
  '/getNrbyPlaceListWithGeoLoc',
  accessTokenValidCheck,
  getNrbyPlaceListWithGeoLoc,
);

export default tripNetworkRouter;
