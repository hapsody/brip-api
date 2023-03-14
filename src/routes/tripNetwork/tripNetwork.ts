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
  PlaceType,
  IBPhotos,
  User,
  IBTravelTag,
} from '@prisma/client';
import { isEmpty, isNil, isNull } from 'lodash';
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
  tourPlaceId?: string;
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
> & {
  photos: Pick<IBPhotos, 'id' | 'key' | 'url'>[];
  likeFrom: Pick<
    User,
    'id' | 'nickName' | 'createdAt' | 'updatedAt' | 'profileImg'
  >[];
};
export interface AddTripMemorySuccessResType extends TripMemory {
  tag: TripMemoryTag[];
  group: TripMemoryGroup;
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
): Promise<AddTripMemorySuccessResType> => {
  const {
    title,
    comment,
    hashTag,
    address,
    lat,
    lng,
    img,
    groupId,
    tourPlaceId,
  } = param;
  const tripMemoryGroup = await prisma.tripMemoryGroup.findUnique({
    where: {
      id: Number(groupId),
    },
  });

  if (!tripMemoryGroup)
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
      const createdTP = await tx.tourPlace.create({
        data: {
          title,
          lat: Number(lat),
          lng: Number(lng),
          address,
          // tourPlaceType: 'USER_SPOT',
          tourPlaceType: 'USER_PRIV_MEMORY_SPOT' as PlaceType,
          photos: {
            create: {
              key: img,
            },
          },
        },
      });
      return createdTP;
    })();

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

        TourPlace: {
          connect: {
            id: Number(createdOrFoundTP.id),
          },
        },
      },
      include: {
        tag: true,
        group: true,
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
            photos: {
              select: {
                id: true,
                key: true,
                url: true,
              },
            },
            good: true,
            notBad: true,
            bad: true,
            like: true,
            likeFrom: {
              select: {
                id: true,
                nickName: true,
                profileImg: true,
                createdAt: true,
                updatedAt: true,
              },
            },
          },
        },
      },
    });
    return createdOne;
  });

  return createdTripMem;
};

export const getAccessableUrl = async (url: string): Promise<string> => {
  if (url.includes('http')) return url;
  const result = await getS3SignedUrl(url);
  return result;
};

export const getIBPhotoUrl = async (photo: {
  id: number;
  key: string | null;
  url: string | null;
}): Promise<{ url: string }> => {
  if (!isNull(photo.url)) {
    return {
      url: photo.url,
    };
  }
  if (!isNull(photo.key)) {
    return {
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
  tripMemoryId?: string; /// 이미 존재하는 tripMemory일 경우 id를 제공해야 한다. tripMemoryId가 제공되지 않을 경우 addShareTripMemory api 수행 과정중 tripMemory가 생성된다.
  recommendGrade: 'good' | 'notbad' | 'bad';
  categoryIds: string[];
  tourPlaceId?: string | null;
}
export interface AddShareTripMemorySuccessResType extends ShareTripMemory {
  TourPlace: TourPlaceCommonType | null;
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
        categoryIds,
        tourPlaceId,
        tripMemoryId,
      } = req.body;

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

      const categoryToIBTravelTag = {
        tourPlaceType: (() => {
          switch (
            tripMemoryCategory[0].super /// 모두 같은 상위 카테고리에서만 선택이 되었다고 가정하기 때문에 첫번째 값만 참조해도 무방하다. 예를들면 상위 카테고리인 음식 카테고리에서 하위 카테고리를 한식, 코스요리, 특별한 맛집 등으로 골랐다면 그것은 음식 카테고리에서만 뽑은 것이며, 여타 다음 상위 카테고리와 함께 선택되지 않았다고 가정한다(시나리오상 고를수 없다는 것)
          ) {
            case '음식':
            case '카페':
              return 'USER_RESTAURANT' as PlaceType;
            case '관광':
            case '액티비티':
            case '휴식':
            default:
              return 'USER_SPOT' as PlaceType;
            // case 'lodge':
          }
        })(),
        ibTravelTagNames: tripMemoryCategory.map(v => {
          switch (v.name) {
            /// 음식
            case '브런치':
            case '한식':
            case '중식':
            case '일식':
            case '양식':
            case '패스트푸드':
            case '코스요리':
            case '고기맛집':
            case '특별한맛집':
            case '나만의맛집':
            case '아이와함께먹을수있는':
            case '오래된맛집':
              return null;
            /// 카페
            case '분위기좋은':
            case '인스타감성':
            case '케익맛집':
            case '예쁜':
            case '로컬카페':
            case '다목적공간':
            case '힙한':
            case '핫플':
              return null;
            case '조용한':
              if (v.super === '숙소') return '';
              return null;
            /// 숙소
            case '시티뷰':
            case '바다뷰':
            case '마운틴뷰':
            case '깔끔한':
            case '친절한':
            case '시내와인접한':
            case '풀빌라':
            case '에어비앤비':
            case '독채':
            case '펫동반':
            case '가족단위':
              return null;
            /// 관광
            case '쇼핑':
              return 'shopping';
            case '아쿠아리움':
              return 'aquarium';
            case '테마파크':
              return 'themePark';
            case '놀이공원':
              return 'amusementPark';
            case '유적지':
              return 'historicalSpot';
            case '박물관':
            case '미술관':
              return 'museum';
            case '국립공원':
              return 'nationalPark';
            case '해안경관':
              return 'ocean';
            case '공원/정원':
              return 'park';
            case '섬':
              return 'island';
            case '언덕':
              return 'hill';
            case '산':
              return 'mountain';
            case '강':
              return 'river';
            case '수목원':
              return 'arboreteum';
            case '숲':
              return 'forest';
            case '바위':
              return 'rocks';
            case '둘레길':
              return 'circumferenceTrail';
            case '오름':
              return 'oreum';
            case '해안도로':
              return 'shoreline';
            case '기타':
              return 'etc';
            /// 액티비티
            case '스노보드':
              return 'snowBoard';
            case '스키':
              return 'ski';
            case '케이블카':
              return 'cableCar';
            case '패러글라이딩':
              return 'paragliding';
            case '짚라인':
              return 'zipTrack';
            case 'UTV':
              return 'UTV';
            case 'MTB':
              return 'MTB';
            case '암벽등반':
              return 'rockClimbing';
            case '그룹하이킹':
              return 'groupHiking';
            case '등산':
              return 'climbing';
            case '루지레이스':
              return 'lugeRacing';
            case '골프':
              return 'golf';
            case '티켓':
              return 'ticket';
            case '농장':
              return 'farm';
            case '승마':
              return 'horseRiding';
            case 'ATV':
              return 'ATV';
            case '카트레이스':
              return 'cartRacing';
            case '크루즈':
              return 'cruise';
            case '카약':
              return 'kayak';
            case '패들보드':
              return 'paddleBoard';
            case '서핑':
              return 'surfing';
            case '제트보트':
              return 'jetBoat';
            case '세일링':
              return 'sailing';
            case '낚시':
              return 'fishing';
            case '스노클링':
              return 'snorkeling';
            case '해수욕':
              return 'beach';
            default:
              return null;
          }
        }),
      };

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
            );
            return addResult;
          }
          /// 2. tripMemoryId 제공되었을 경우
          const findResult = await prisma.tripMemory.findUnique({
            where: {
              id: Number(tripMemoryId),
            },
            include: {
              tag: true,
              user: true,
              group: true,
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
                  photos: {
                    select: {
                      id: true,
                      key: true,
                      url: true,
                    },
                  },
                  good: true,
                  notBad: true,
                  bad: true,
                  like: true,
                  likeFrom: {
                    select: {
                      id: true,
                      nickName: true,
                      profileImg: true,
                      createdAt: true,
                      updatedAt: true,
                    },
                  },
                },
              },
            },
          });
          if (isNil(findResult)) {
            throw new IBError({
              type: 'INVALIDPARAMS',
              message: '제공된 tripMemoryId에 해당하는 tripMemory가 없습니다.',
            });
          }
          return findResult;
        })();

      const ibTravelTagNames = categoryToIBTravelTag.ibTravelTagNames
        .map(v => {
          if (v === null) return null;
          return {
            value: v,
          };
        })
        .filter((v): v is { value: string } => v !== null);

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
          /// tripMemory의 tourPlace와 동일한 tourPlace를 shareTripMemory와 connect한다.
          tripMemory: {
            connect: {
              id: createdOrFoundTripMem.id,
            },
          },
          TourPlace: isNil(tourPlaceId)
            ? {
                create: {
                  title,
                  lat: Number(lat),
                  lng: Number(lng),
                  address,
                  // tourPlaceType: 'USER_SPOT',
                  tourPlaceType: categoryToIBTravelTag.tourPlaceType,
                  photos: {
                    create: {
                      key: img,
                    },
                  },
                  ...(!isNil(ibTravelTagNames) &&
                    !isEmpty(ibTravelTagNames) && {
                      ibTravelTag: {
                        connect: ibTravelTagNames,
                      },
                    }),
                },
              }
            : {
                connect: {
                  id: Number(tourPlaceId),
                },
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
              photos: {
                select: {
                  id: true,
                  key: true,
                  url: true,
                },
              },
              good: true,
              notBad: true,
              bad: true,
              like: true,
              likeFrom: {
                select: {
                  id: true,
                  nickName: true,
                  profileImg: true,
                  createdAt: true,
                  updatedAt: true,
                },
              },
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
        await prisma.tourPlace.update({
          where: {
            id: createdOrFoundTripMem.id,
          },
          data: {
            tourPlaceType: categoryToIBTravelTag.tourPlaceType,
          },
        });
      }

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

export interface ContextGetNrbyPlaceListWithGeoLoc extends IBContext {}

export const getNrbyPlaceListWithGeoLoc = async (
  param: GetNrbyPlaceListWithGeoLocRequestType,
  ctx: ContextGetNrbyPlaceListWithGeoLoc,
): Promise<GetNrbyPlaceListWithGeoLocSuccessResType> => {
  const { minLat, minLng, maxLat, maxLng, take = '10', lastId = '1' } = param;
  const { memberId, userTokenId } = ctx;

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
              message: '대댓글 기능 이상은 지원하지 않습니다.',
            });
          }

          return parentReply.shareTripMemoryId;
        }
        return Number(userInputShareTripMemId);
      })();

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
          },
        });
        return result;
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
        if (err.type === 'INVALIDSTATUS') {
          res.status(400).json({
            ...ibDefs.INVALIDSTATUS,
            IBdetail: (err as Error).message,
            IBparams: {} as object,
          });
          return;
        }

        if (err.type === 'INVALIDENVPARAMS') {
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
                photos: {
                  select: {
                    id: true,
                    key: true,
                    url: true,
                  },
                },
                good: true,
                notBad: true,
                bad: true,
                like: true,
                likeFrom: {
                  select: {
                    id: true,
                    nickName: true,
                    profileImg: true,
                    createdAt: true,
                    updatedAt: true,
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
              photos: {
                select: {
                  id: true,
                  key: true,
                  url: true,
                },
              },
              good: true,
              notBad: true,
              bad: true,
              like: true,
              likeFrom: {
                select: {
                  id: true,
                  nickName: true,
                  profileImg: true,
                  createdAt: true,
                  updatedAt: true,
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
                return getAccessableUrl(profileImg);
                // if (profileImg.includes('http')) return profileImg;
                // return getS3SignedUrl(profileImg);
              }
              return null;
            })();

            const ret = {
              ...v,
              img: await getAccessableUrl(v.img),
              user: {
                ...v.user,
                profileImg: userImg,
              },
              TourPlace:
                isNil(v.TourPlace) || isNil(v.TourPlace.photos)
                  ? null
                  : await Promise.all(v.TourPlace?.photos.map(getIBPhotoUrl)),
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

export interface GetShareTripMemListByPlaceRequestType {
  tourPlaceId?: string; /// 단일 tourPlaceId 조회
  orderBy?: string; /// 추천순(recommend), 좋아요순(like), 최신순(latest) 정렬 default 최신순
  lastId?: string; /// 커서 기반 페이지네이션으로 직전 조회에서 확인한 마지막 tourPlace id. undefined라면 처음부터 조회한다.
  take: string; /// default 10
  categoryKeyword: string; /// 카테고리 검색 키워드
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
          id: isNil(tourPlaceId) ? undefined : Number(tourPlaceId),
          shareTripMemory: {
            some: {
              tripMemoryCategory: {
                some: {
                  name: {
                    contains: categoryKeyword,
                  },
                },
              },
            },
          },
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
          likeFrom: {
            select: {
              id: true,
              nickName: true,
              profileImg: true,
              createdAt: true,
              updatedAt: true,
            },
          },

          ibTravelTag: true,
          shareTripMemory: {
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
              shareTripMemory: await Promise.all(
                t.shareTripMemory.map(async s => {
                  const userImg = await (() => {
                    const { profileImg } = s.user;
                    if (!isNil(profileImg)) {
                      if (profileImg.includes('http')) return profileImg;
                      return getS3SignedUrl(profileImg);
                    }
                    return null;
                  })();
                  const ret = {
                    ...s,
                    img: s.img.includes('http')
                      ? s.img
                      : await getS3SignedUrl(s.img),
                    user: {
                      ...s.user,
                      profileImg: userImg,
                    },
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

export interface GetTripMemListRequestType {
  tripMemoryId?: string; /// 단일 조회를 원할 경우 조회를 원하는 항목의 id
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
  };
  user: {
    id: number;
    nickName: string;
    profileImg: string | null;
  };
  ShareTripMemory: {
    id: number;
    tourPlaceId: number | null;
  } | null;
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
                photos: {
                  select: {
                    id: true,
                    key: true,
                    url: true,
                  },
                },
                good: true,
                notBad: true,
                bad: true,
                like: true,
                likeFrom: {
                  select: {
                    id: true,
                    nickName: true,
                    profileImg: true,
                    createdAt: true,
                    updatedAt: true,
                  },
                },
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
        const { profileImg } = foundTripMem.user;
        res.json({
          ...ibDefs.SUCCESS,
          IBparams: [
            {
              ...foundTripMem,
              img: foundTripMem.img.includes('http')
                ? foundTripMem.img
                : await getS3SignedUrl(foundTripMem.img),
              user: {
                ...foundTripMem.user,
                ...(!isNil(profileImg) && {
                  profileImg: profileImg.includes('http')
                    ? profileImg
                    : await getS3SignedUrl(profileImg),
                }),
              },
              TourPlace: foundTripMem.TourPlace
                ? {
                    ...foundTripMem.TourPlace,
                    photos:
                      !isNil(foundTripMem.TourPlace?.photos) &&
                      (await Promise.all(
                        foundTripMem.TourPlace?.photos.map(getIBPhotoUrl),
                      )),
                  }
                : null,
            },
          ],
        });
        return;
      }

      const foundTripMemList = await prisma.tripMemory.findMany({
        where: {
          AND: [
            {
              tag: {
                some: {
                  name: {
                    contains: tagKeyword,
                  },
                },
              },
            },
            {
              groupId: isNil(groupId) ? undefined : Number(groupId),
            },

            { lat: isNil(minLat) ? undefined : { gte: Number(minLat) } },
            { lat: isNil(maxLat) ? undefined : { lt: Number(maxLat) } },
            { lng: isNil(minLng) ? undefined : { gte: Number(minLng) } },
            { lng: isNil(maxLng) ? undefined : { lt: Number(maxLng) } },
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
              photos: {
                select: {
                  id: true,
                  key: true,
                  url: true,
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

      if (!isNil(lastId)) foundTripMemList.shift();

      res.json({
        ...ibDefs.SUCCESS,
        IBparams: await Promise.all(
          foundTripMemList.map(async v => {
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
              TourPlace: v.TourPlace
                ? {
                    ...v.TourPlace,
                    photos:
                      !isNil(v.TourPlace?.photos) &&
                      (await Promise.all(
                        v.TourPlace?.photos.map(async k => {
                          if (!isNull(k.url)) {
                            return {
                              url: k.url,
                            };
                          }
                          if (!isNull(k.key)) {
                            return {
                              url: await getS3SignedUrl(k.key),
                            };
                          }

                          throw new IBError({
                            type: 'INVALIDSTATUS',
                            message:
                              'photos의 url과 key값이 둘다 존재하지 않습니다.',
                          });
                        }),
                      )),
                  }
                : null,
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
                      tag: {
                        some: {
                          name: {
                            contains: tagKeyword,
                          },
                        },
                      },
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
                  photos: {
                    select: {
                      id: true,
                      key: true,
                      url: true,
                    },
                  },
                  good: true,
                  notBad: true,
                  bad: true,
                  like: true,
                  likeFrom: {
                    select: {
                      id: true,
                      nickName: true,
                      profileImg: true,
                      createdAt: true,
                      updatedAt: true,
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
              tripMemory: await Promise.all(
                v.tripMemory.map(async k => {
                  return {
                    ...k,
                    createdDay: moment(k.createdAt)
                      .startOf('d')
                      .format('YYYY-MM-DD'),
                    img: k.img.includes('http')
                      ? k.img
                      : await getS3SignedUrl(k.img),
                    TourPlace: k.TourPlace
                      ? {
                          ...k.TourPlace,
                          photos:
                            !isNil(k.TourPlace?.photos) &&
                            (await Promise.all(
                              k.TourPlace?.photos.map(async m => {
                                if (!isNull(m.url)) {
                                  return {
                                    url: m.url,
                                  };
                                }
                                if (!isNull(m.key)) {
                                  return {
                                    url: await getS3SignedUrl(m.key),
                                  };
                                }

                                throw new IBError({
                                  type: 'INVALIDSTATUS',
                                  message:
                                    'photos의 url과 key값이 둘다 존재하지 않습니다.',
                                });
                              }),
                            )),
                        }
                      : null,
                  };
                }),
              ),
              user: {
                ...v.user,
                profileImg: userImg,
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

export interface ModifyTripMemoryRequestType {
  tripMemoryId: string;
  title?: string;
  comment?: string;
  address?: string;
  lat?: string;
  lng?: string;
  img?: string;
}
export interface ModifyTripMemorySuccessResType extends TripMemory {
  tag: TripMemoryTag[];
  group: TripMemoryGroup;
}

export type ModifyTripMemoryResType = Omit<IBResFormat, 'IBparams'> & {
  IBparams: ModifyTripMemorySuccessResType | {};
};

export interface ContextModifyTripMemory extends IBContext {}

const modifyTripMemory = async (
  param: ModifyTripMemoryRequestType,
  ctx: ContextModifyTripMemory,
): Promise<ModifyTripMemorySuccessResType> => {
  const { tripMemoryId, title, comment, address, lat, lng, img } = param;

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

  const updatedOne = await prisma.tripMemory.update({
    where: {
      id: Number(tripMemoryId),
    },
    data: {
      title,
      comment,
      lat: !isNil(lat) ? Number(lat) : undefined,
      lng: !isNil(lng) ? Number(lng) : undefined,
      address,
      img,
    },
    include: {
      tag: true,
      group: true,
    },
  });
  return updatedOne;
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
          res.status(403).json({
            ...ibDefs.NOTAUTHORIZED,
            IBdetail: (err as Error).message,
            IBparams: {} as object,
          });
          return;
        }

        if (err.type === 'INVALIDPARAMS') {
          res.status(400).json({
            ...ibDefs.INVALIDPARAMS,
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
          res.status(403).json({
            ...ibDefs.NOTAUTHORIZED,
            IBdetail: (err as Error).message,
            IBparams: {} as object,
          });
          return;
        }

        if (err.type === 'INVALIDPARAMS') {
          res.status(400).json({
            ...ibDefs.INVALIDPARAMS,
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

export interface ModifyShareTripMemoryRequestType {
  shareTripMemoryId: string;
  title?: string;
  comment?: string;
}
export interface ModifyShareTripMemorySuccessResType extends ShareTripMemory {
  TourPlace: TourPlace | null;
  tripMemory:
    | (TripMemory & {
        tag: TripMemoryTag[];
        group: TripMemoryGroup;
      })
    | null;
  tripMemoryCategory: TripMemoryCategory[];
}

export type ModifyShareTripMemoryResType = Omit<IBResFormat, 'IBparams'> & {
  IBparams: ModifyShareTripMemorySuccessResType | {};
};

export const modifyShareTripMemory = asyncWrapper(
  async (
    req: Express.IBTypedReqBody<ModifyShareTripMemoryRequestType>,
    res: Express.IBTypedResponse<ModifyShareTripMemoryResType>,
  ) => {
    try {
      const { shareTripMemoryId, title, comment } = req.body;
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
        (isNil(comment) || isEmpty(comment))
      ) {
        throw new IBError({
          type: 'NOTEXISTDATA',
          message: '최소 하나의 수정 파라미터는 있어야 합니다.',
        });
      }

      const existCheck = await prisma.shareTripMemory.findUnique({
        where: {
          id: Number(shareTripMemoryId),
        },
      });

      if (isNil(existCheck)) {
        throw new IBError({
          type: 'NOTEXISTDATA',
          message: '존재하지 않는 shareTripMemoryId입니다.',
        });
      }

      const shareTripMemory = await prisma.shareTripMemory.update({
        where: {
          id: Number(shareTripMemoryId),
        },
        data: {
          title,
          comment,
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

      if (isEmpty(existCheck.likeFrom)) {
        /// 이전에 memberId 유저가 이 shareTripMemory에 대해 like한 이력이 없음
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

        if (err.type === 'DUPLICATEDDATA') {
          res.status(409).json({
            ...ibDefs.DUPLICATEDDATA,
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

      if (isEmpty(existCheck.shareTripMemory)) {
        throw new IBError({
          type: 'NOTEXISTDATA',
          message: '어떤 user도 공유하지 않은 장소입니다.',
        });
      }

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

        if (err.type === 'DUPLICATEDDATA') {
          res.status(409).json({
            ...ibDefs.DUPLICATEDDATA,
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

      if (isEmpty(existCheck.likeFrom)) {
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

        if (err.type === 'DUPLICATEDDATA') {
          res.status(409).json({
            ...ibDefs.DUPLICATEDDATA,
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

export interface CheckLikeTourPlaceRequestType {
  tourPlaceId: string;
}
export interface CheckLikeTourPlaceSuccessResType {
  status: 'like' | 'unlike';
}

export type CheckLikeTourPlaceResType = Omit<IBResFormat, 'IBparams'> & {
  IBparams: CheckLikeTourPlaceSuccessResType | {};
};

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

      if (isEmpty(existCheck.shareTripMemory)) {
        throw new IBError({
          type: 'NOTEXISTDATA',
          message: '어떤 user도 공유하지 않은 장소입니다.',
        });
      }

      if (isEmpty(existCheck.likeFrom)) {
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

        if (err.type === 'DUPLICATEDDATA') {
          res.status(409).json({
            ...ibDefs.DUPLICATEDDATA,
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
