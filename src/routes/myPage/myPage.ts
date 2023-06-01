import express from 'express';
import prisma from '@src/prisma';
import { AdPlace, IBPhotos, AdPlaceCategory, TourPlace } from '@prisma/client';
import {
  ibDefs,
  asyncWrapper,
  IBResFormat,
  IBError,
  accessTokenValidCheck,
  delObjectsFromS3,
} from '@src/utils';
import { isNil, isEmpty, omit } from 'lodash';

const myPageRouter: express.Application = express();

export type RegistAdPlaceRequestType = {
  title: string; /// 상호명
  mainImgUrl: string; /// 대표사진 s3 key 형태의 url 또는 직접접근가능한 http 접두어가 포함된 사진링크.
  photos?: {
    ///  기타 매장 사진
    key: string;
  }[];
  category: {
    primary: string;
    secondary: string;
  }[];
  desc?: string; /// 소개글
  address?: string; /// 지번주소.  도로명주소와 지번주소중 둘중 하나는 반드시 가져야함
  roadAddress?: string; /// 도로명주소
  openWeek?: string; /// 영업시간, 영업요일 ex) Mon: 09:00~20:00, Tue: 09:00~20:00, ...
  closedDay?: string; /// 휴무일, 정기휴무 날짜 혹은 요일 ex) 'SAT, SUN' ...
  contact: string; /// 대표번호
  siteUrl?: string; /// 홈페이지 또는 소셜 계정
  businessNumber?: string; /// 사업자 등록번호, 사업자번호 또는 사업자 등록증 둘중 하나는 반드시 가져야 한다.
  businessRegImgKey?: string; /// 사업자 등록증 첨부사진 s3 key, 사업자번호 또는 사업자 등록증 둘중 하나는 반드시 가져야 한다.
  nationalCode: string; /// 국가 코드. 국제전화번호의 코드이다. 한국 => ex) 82
};
// export interface RegistAdPlaceSuccessResType {
//   groupNo: number;
//   groupId: number;
//   groupTitle: string;
//   groupThumbnail: string;
//   cards: {
//     cardId: number;
//     cardNo: number;
//     tag: CardTag[];
//     cardTitle: string;
//     cardContent: string;
//     cardBgUri: string;
//   }[];
// }

export type RegistAdPlaceResType = Omit<IBResFormat, 'IBparams'> & {
  // IBparams: RegistAdPlaceSuccessResType[] | {};
  IBparams: {};
};

export const registAdPlace = asyncWrapper(
  async (
    req: Express.IBTypedReqBody<RegistAdPlaceRequestType>,
    res: Express.IBTypedResponse<RegistAdPlaceResType>,
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
      const {
        title,
        mainImgUrl,
        photos,
        category,
        desc,
        address,
        roadAddress,
        openWeek,
        closedDay,
        contact,
        siteUrl,
        businessNumber,
        businessRegImgKey,
        nationalCode,
      } = req.body;

      if (
        isNil(title) ||
        isNil(mainImgUrl) ||
        isNil(category) ||
        isEmpty(category) ||
        (isNil(address) && isNil(roadAddress)) ||
        (isNil(businessNumber) && isNil(businessRegImgKey)) ||
        isNil(nationalCode)
      ) {
        throw new IBError({
          type: 'INVALIDPARAMS',
          message:
            'title, mainImgUrl, category 배열, nationalCode 는 필수 파라미터입니다. address와 roadAddress 둘중 하나는 필수입니다. businessNumber와 businessRegImgKey는 필수입니다.',
        });
      }

      const existCheck = await prisma.adPlace.findFirst({
        where: {
          OR: [
            {
              AND: [{ title }, { address }, { roadAddress }],
            },
            { businessNumber },
          ],
        },
      });

      if (!isNil(existCheck)) {
        if (existCheck.businessNumber === businessNumber)
          throw new IBError({
            type: 'DUPLICATEDDATA',
            message: '이미 등록된 사업자등록번호입니다.',
          });
        throw new IBError({
          type: 'DUPLICATEDDATA',
          message: '이미 존재하는 AdPlace입니다.',
        });
      }

      await prisma.adPlace.create({
        data: {
          status: 'NEW',
          subscribe: false,
          title,
          mainImgUrl,
          category: {
            connectOrCreate: category.map(v => {
              const { primary, secondary } = v;
              if (isNil(primary) || isNil(secondary)) {
                throw new IBError({
                  type: 'INVALIDPARAMS',
                  message:
                    'category의 primary, secondary는 필수 제출 파라미터입니다.',
                });
              }

              return {
                where: {
                  primary_secondary: {
                    primary,
                    secondary,
                  },
                },
                create: {
                  primary,
                  secondary,
                },
              };
            }),
          },
          ...(!isNil(photos) && {
            photos: {
              createMany: {
                data: photos,
              },
            },
          }),
          desc,
          address,
          roadAddress,
          openWeek,
          closedDay,
          contact,
          siteUrl,
          businessNumber,
          businessRegImgKey,
          nationalCode,
          user: {
            connect: {
              userTokenId,
            },
          },
        },
      });

      res.json({
        ...ibDefs.SUCCESS,
        IBparams: {},
      });
    } catch (err) {
      if (err instanceof IBError) {
        if (err.type === 'INVALIDPARAMS') {
          res.status(400).json({
            ...ibDefs.INVALIDPARAMS,
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
      }

      throw err;
    }
  },
);

export type GetMyAdPlaceRequestType = {};
export type GetMyAdPlaceSuccessResType = Omit<
  AdPlace & {
    photos: IBPhotos[];
    category: AdPlaceCategory[];
  },
  'userId'
>;
export type GetMyAdPlaceResType = Omit<IBResFormat, 'IBparams'> & {
  IBparams: GetMyAdPlaceSuccessResType[] | {};
};

export const getMyAdPlace = asyncWrapper(
  async (
    req: Express.IBTypedReqQuery<GetMyAdPlaceRequestType>,
    res: Express.IBTypedResponse<GetMyAdPlaceResType>,
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

      const myAdPlaces = await prisma.adPlace.findMany({
        where: {
          user: {
            userTokenId,
          },
        },
        include: {
          photos: true,
          category: true,
        },
      });

      res.json({
        ...ibDefs.SUCCESS,
        IBparams: myAdPlaces.map(v => omit(v, ['userId'])),
      });
    } catch (err) {
      if (err instanceof IBError) {
        if (err.type === 'INVALIDPARAMS') {
          res.status(400).json({
            ...ibDefs.INVALIDPARAMS,
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
      }

      throw err;
    }
  },
);

export type ModifyAdPlaceRequestType = {
  adPlaceId: string; /// 수정할 adPlace의 Id
  title?: string; /// 상호명
  mainImgUrl?: string; /// 대표사진 s3 key 형태의 url 또는 직접접근가능한 http 접두어가 포함된 사진링크.
  photos?: {
    ///  기타 매장 사진
    key: string;
  }[];
  category?: {
    primary: string;
    secondary: string;
  }[];
  desc?: string; /// 소개글
  address?: string; /// 지번주소.  도로명주소와 지번주소중 둘중 하나는 반드시 가져야함
  roadAddress?: string; /// 도로명주소
  openWeek?: string; /// 영업시간, 영업요일 ex) Mon: 09:00~20:00, Tue: 09:00~20:00, ...
  closedDay?: string; /// 휴무일, 정기휴무 날짜 혹은 요일 ex) 'SAT, SUN' ...
  contact?: string; /// 대표번호
  siteUrl?: string; /// 홈페이지 또는 소셜 계정
  businessNumber?: string; /// 사업자 등록번호, 사업자번호 또는 사업자 등록증 둘중 하나는 반드시 가져야 한다.
  businessRegImgKey?: string; /// 사업자 등록증 첨부사진 s3 key, 사업자번호 또는 사업자 등록증 둘중 하나는 반드시 가져야 한다.
};
export type ModifyAdPlaceSuccessResType = Omit<
  AdPlace & {
    photos: IBPhotos[];
    category: AdPlaceCategory[];
  },
  'userId'
>;
export type ModifyAdPlaceResType = Omit<IBResFormat, 'IBparams'> & {
  IBparams: {};
};

export const modifyAdPlace = asyncWrapper(
  async (
    req: Express.IBTypedReqBody<ModifyAdPlaceRequestType>,
    res: Express.IBTypedResponse<ModifyAdPlaceResType>,
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
      const {
        adPlaceId,
        title,
        mainImgUrl,
        photos,
        category,
        desc,
        address,
        roadAddress,
        openWeek,
        closedDay,
        contact,
        siteUrl,
        businessNumber,
        businessRegImgKey,
      } = req.body;

      if (isNil(adPlaceId)) {
        throw new IBError({
          type: 'INVALIDPARAMS',
          message: 'adPlaceId는 필수 파라미터입니다.',
        });
      }

      const existCheck = await prisma.adPlace.findFirst({
        where: {
          id: Number(adPlaceId),
        },
        include: {
          user: {
            select: {
              id: true,
              userTokenId: true,
            },
          },
        },
      });

      if (isNil(existCheck)) {
        throw new IBError({
          type: 'NOTEXISTDATA',
          message: '존재하지 않는 AdPlace입니다.',
        });
      }
      if (existCheck.user.userTokenId !== userTokenId) {
        throw new IBError({
          type: 'NOTAUTHORIZED',
          message: '변경 권한이 없는 항목의 adPlace입니다.',
        });
      }

      const result = await prisma.$transaction(
        async (
          tx,
        ): Promise<
          AdPlace & {
            photos: IBPhotos[];
            category: AdPlaceCategory[];
            tourPlace: TourPlace | undefined;
          }
        > => {
          const adPlaceUpdatedResult = await tx.adPlace.update({
            where: {
              id: existCheck.id,
            },
            data: {
              title,
              mainImgUrl,
              ...(!isNil(category) && {
                category: {
                  connect: category.map(v => {
                    const { primary, secondary } = v;
                    if (isNil(primary) || isNil(secondary)) {
                      throw new IBError({
                        type: 'INVALIDPARAMS',
                        message:
                          'category의 primary, secondary는 필수 제출 파라미터입니다.',
                      });
                    }

                    return {
                      primary_secondary: {
                        primary,
                        secondary,
                      },
                    };
                  }),
                },
              }),
              ...(!isNil(photos) &&
                (() => {
                  /// delAdPlacePhoto로 사전에 별도로 삭제하는 시나리오로 변경함.
                  // /// photos 수정이 있다면 기존에 연결되어 있던 IBPhotos는 삭제한다.
                  // /// 추가 todo: s3에 해당 key를 삭제까지 구현할것.
                  // await prisma.iBPhotos.deleteMany({
                  //   where: {
                  //     adPlaceId: Number(adPlaceId),
                  //   },
                  // });
                  return {
                    photos: {
                      createMany: {
                        data: photos,
                      },
                    },
                  };
                })()),
              desc,
              address,
              roadAddress,
              openWeek,
              closedDay,
              contact,
              siteUrl,
              businessNumber,
              businessRegImgKey,
            },
            include: {
              photos: true,
              category: true,
            },
          });

          /// 포토 수정이 있는데 tourPlace가 생성되어 있는 adPlace라면 IBPhotos가 위에서 deleteMany로 모두 삭제되고 재연결되었으므로 tourPlace의 IBPhotos connect도 수정해줘야한다.
          let tpUpdateResult: TourPlace | undefined;
          if (!isNil(adPlaceUpdatedResult.tourPlaceId) && !isNil(photos)) {
            tpUpdateResult = await tx.tourPlace.update({
              where: {
                id: adPlaceUpdatedResult.tourPlaceId,
              },
              data: {
                photos: {
                  connect: adPlaceUpdatedResult.photos.map(v => {
                    return {
                      id: v.id,
                    };
                  }),
                },
              },
            });
          }

          const ret = {
            ...adPlaceUpdatedResult,
            tourPlace: tpUpdateResult,
          };
          return ret;
        },
      );

      res.json({
        ...ibDefs.SUCCESS,
        IBparams: result,
      });
    } catch (err) {
      if (err instanceof IBError) {
        if (err.type === 'INVALIDPARAMS') {
          res.status(400).json({
            ...ibDefs.INVALIDPARAMS,
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
        if (err.type === 'NOTAUTHORIZED') {
          res.status(403).json({
            ...ibDefs.NOTAUTHORIZED,
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

export type DelAdPlacePhotoRequestType = {
  adPlaceId: string; /// 수정할 adPlace의 Id
  delPhotoList: string[]; /// 삭제할 photoId
};
// export type DelAdPlacePhotoSuccessResType = Omit<
//   AdPlace & {
//     photos: IBPhotos[];
//     category: AdPlaceCategory[];
//   },
//   'userId'
// >;
export type DelAdPlacePhotoResType = Omit<IBResFormat, 'IBparams'> & {
  IBparams:
    | {
        count: number; ///  DB에서 삭제 성공한 숫자
      }
    | {};
};

export const delAdPlacePhoto = asyncWrapper(
  async (
    req: Express.IBTypedReqBody<DelAdPlacePhotoRequestType>,
    res: Express.IBTypedResponse<DelAdPlacePhotoResType>,
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
      const { adPlaceId, delPhotoList } = req.body;

      if (isNil(adPlaceId) || isNil(delPhotoList || isEmpty(delPhotoList))) {
        throw new IBError({
          type: 'INVALIDPARAMS',
          message: 'adPlaceId, delPhotoList는 필수 파라미터입니다.',
        });
      }

      const existCheck = await prisma.adPlace.findFirst({
        where: {
          id: Number(adPlaceId),
        },
        include: {
          user: {
            select: {
              id: true,
              userTokenId: true,
            },
          },
        },
      });

      if (isNil(existCheck)) {
        throw new IBError({
          type: 'NOTEXISTDATA',
          message: '존재하지 않는 AdPlace입니다.',
        });
      }
      if (existCheck.user.userTokenId !== userTokenId) {
        throw new IBError({
          type: 'NOTAUTHORIZED',
          message: '변경 권한이 없는 항목의 adPlace입니다.',
        });
      }

      const targetPhotos = await prisma.iBPhotos.findMany({
        where: {
          id: { in: delPhotoList.map(v => Number(v)) },
        },
      });

      if (targetPhotos.length !== delPhotoList.length) {
        throw new IBError({
          type: 'NOTMATCHEDDATA',
          message: '존재하지 않는 photoId가 포함되었습니다.',
        });
      }

      const notAuthorizedPhoto = targetPhotos.find(
        v => v.adPlaceId !== Number(adPlaceId),
      );
      if (!isNil(notAuthorizedPhoto)) {
        throw new IBError({
          type: 'NOTAUTHORIZED',
          message: `id:${notAuthorizedPhoto.id}는 해당 유저에게 삭제 권한이 없는 IBPhoto 항목입니다.`,
        });
      }

      const prismaDelResult = await prisma.iBPhotos.deleteMany({
        where: {
          id: { in: targetPhotos.map(v => v.id) },
        },
      });

      const deleteFromS3Result = await delObjectsFromS3(
        targetPhotos.map(v => v.key).filter((v): v is string => !isNil(v)),
      );

      console.log(deleteFromS3Result);

      res.json({
        ...ibDefs.SUCCESS,
        IBparams: prismaDelResult,
      });
    } catch (err) {
      if (err instanceof IBError) {
        if (err.type === 'INVALIDPARAMS') {
          res.status(400).json({
            ...ibDefs.INVALIDPARAMS,
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
        if (err.type === 'NOTAUTHORIZED') {
          res.status(403).json({
            ...ibDefs.NOTAUTHORIZED,
            IBdetail: (err as Error).message,
            IBparams: {} as object,
          });
          return;
        }
        if (err.type === 'NOTMATCHEDDATA') {
          res.status(404).json({
            ...ibDefs.NOTMATCHEDDATA,
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

myPageRouter.post('/registAdPlace', accessTokenValidCheck, registAdPlace);
myPageRouter.get('/getMyAdPlace', accessTokenValidCheck, getMyAdPlace);
myPageRouter.post('/modifyAdPlace', accessTokenValidCheck, modifyAdPlace);
myPageRouter.post('/delAdPlacePhoto', accessTokenValidCheck, delAdPlacePhoto);
export default myPageRouter;
