import express from 'express';
import prisma from '@src/prisma';
import {
  AdPlace,
  IBPhotos,
  TourPlace,
  Prisma,
  IBTravelTag,
  RModelBetweenTravelType,
  PrismaClient,
} from '@prisma/client';
import * as runtime from '@prisma/client/runtime/library';
import {
  ibDefs,
  asyncWrapper,
  IBResFormat,
  IBError,
  accessTokenValidCheck,
  delObjectsFromS3,
  ibTravelTagCategorize,
  getIBPhotoUrl,
} from '@src/utils';
import { isNil, isEmpty, omit } from 'lodash';

const myPageRouter: express.Application = express();

/**
 * myPage쪽에 광고 비즈니스 업체 등록시에 분류하는 category를 IBTravelTag 형식의 connectOrCreate를 할수 있도록 변환해주는 함수
 * modify일 경우에는 adPlaceId와 tx를 같이 넣어주면 해당 adPlace와 관계되어 있던 IBTravelTag관계를 모두 삭제해주는 기능까지 포함한다.
 *  */
export const adPlaceCategoryToIBTravelTag = async (param: {
  /// 유저로부터 입력받은 adPlace 카테고리
  category: {
    primary: string;
    secondary: string;
  }[];
  adPlaceId?: number; /// modify일 경우 수정할 대상 adPlaceId
  /// modify일 경우
  // tx?: Omit<
  //   PrismaClient<
  //     Prisma.PrismaClientOptions,
  //     never,
  //     Prisma.RejectOnNotFound | Prisma.RejectPerOperation | undefined
  //   >,
  //   '$connect' | '$disconnect' | '$on' | '$transaction' | '$use'
  // >;
  tx?: Omit<PrismaClient, runtime.ITXClientDenyList>;
}): Promise<{ connect: { id: number }[] }> => {
  const { category, adPlaceId, tx } = param;

  /// modify일 경우 기존에 adPlace <=> IBtravelTag와 관계를 끊어주고(reset) 입력된 category와의 관계로 덮어씌운다.
  const prevTags = await prisma.iBTravelTag.findMany({
    where: {
      AdPlace: {
        some: {
          id: adPlaceId,
        },
      },
    },
  });
  if (!isNil(tx) && !isNil(adPlaceId) && !isEmpty(prevTags)) {
    const a = Prisma.sql`delete from _AdPlaceToIBTravelTag where A = ${adPlaceId} and B in (${Prisma.join(
      prevTags.map(v => v.id),
    )});`;
    await prisma.$queryRaw(a);
  }

  return {
    connect: await (async () => {
      const ibTravelTagIds = await Promise.all(
        category
          .map(async v => {
            const { primary, secondary } = v;
            if (isNil(primary) || isNil(secondary)) {
              throw new IBError({
                type: 'INVALIDPARAMS',
                message:
                  'category의 primary, secondary는 필수 제출 파라미터입니다.',
              });
            }

            const categoryId = await ibTravelTagCategorize(
              {
                ibType: {
                  typePath: `${primary}>${secondary}`,
                  minDifficulty: 1,
                  maxDifficulty: 1,
                },
              },
              tx,
            );

            return categoryId;
          })
          .filter(v => v),
      );

      return ibTravelTagIds.map(v => {
        return {
          id: v,
        };
      });
    })(),
  };
};

export type RegistAdPlaceRequestType = {
  title: string; /// 상호명
  mainPhotoKey: string; /// 대표사진 s3 key 형태의 url 또는 직접접근가능한 http 접두어가 포함된 사진링크.
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
  detailAddress?: string; /// 존재할경우 상세주소
  openWeek?: string; /// 영업시간, 영업요일 ex) Mon: 09:00~20:00, Tue: 09:00~20:00, ...
  closedDay?: string; /// 휴무일, 정기휴무 날짜 혹은 요일 ex) 'SAT, SUN' ...
  contact: string; /// 대표번호
  siteUrl?: string; /// 홈페이지 또는 소셜 계정
  businessNumber?: string; /// 사업자 등록번호, 사업자번호 또는 사업자 등록증 둘중 하나는 반드시 가져야 한다.
  businessRegImgKey?: string; /// 사업자 등록증 첨부사진 s3 key, 사업자번호 또는 사업자 등록증 둘중 하나는 반드시 가져야 한다.
  nationalCode: string; /// 국가 코드. 국제전화번호의 코드이다. 한국 => ex) 82
  relatedTPId: string[]; /// 먼저 존재하던 tourPlace들 중에 광고주가 등록하는 adPlace와 동일하다고 여겨지는 tourPlace들의 id 배열. 해당 tourPlace들에 매달린 기억/공유 기억 정보들은 등록 요청하는 AdPlace에서 추후에 조회하게 된다. 광고주가 등록 요청하는 adPlace와 동일한 tourPlace 별도로 생성되며 단순히 id 배열들에 해당하는 tourPlace들이 광고비즈니스 장소와 동일하여 관계를 형성해놓는것임.
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

/**
 * 업체측에서 관광지로 등록하기위해 식당, 호텔, 매장, 관광지 등을 장소로 등록신청하는 api.
 * 담당자 확인후 승인이 되면 TourPlace에 이전 등록되게 된다
 * https://www.figma.com/file/Tdpp5Q2J3h19NyvBvZMM2m/brip?type=design&node-id=3279-2978&t=e8DwiRk4nm91ziEk-4
 */

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
        mainPhotoKey,
        photos,
        category,
        desc,
        address,
        roadAddress,
        openWeek,
        detailAddress,
        closedDay,
        contact,
        siteUrl,
        businessNumber,
        businessRegImgKey,
        nationalCode,
        relatedTPId,
      } = req.body;

      if (
        isNil(title) ||
        isNil(mainPhotoKey) ||
        isNil(category) ||
        isEmpty(category) ||
        (isNil(address) && isNil(roadAddress)) ||
        (isNil(businessNumber) && isNil(businessRegImgKey)) ||
        isNil(nationalCode) ||
        isNil(relatedTPId)
      ) {
        throw new IBError({
          type: 'INVALIDPARAMS',
          message:
            'title, mainPhotoKey, category 배열, nationalCode 는 필수 파라미터입니다. address와 roadAddress 둘중 하나는 필수입니다. businessNumber와 businessRegImgKey, relatedTPId는 필수입니다.',
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

      const relatedTourPlaces = await prisma.tourPlace.findMany({
        where: {
          id: { in: relatedTPId.map(v => Number(v)) },
        },
        select: {
          id: true,
        },
      });

      if (relatedTPId.length !== relatedTourPlaces.length) {
        throw new IBError({
          type: 'NOTMATCHEDDATA',
          message:
            'relatedTPId에 존재하지 않는 tourPlaceId값이 포함되어 있습니다.',
        });
      }

      const createdOne = await prisma.adPlace.create({
        data: {
          status: 'NEW',
          subscribe: false,
          title,
          mainPhoto: {
            create: {
              key: mainPhotoKey,
            },
          },
          category: await adPlaceCategoryToIBTravelTag({ category }),
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
          detailAddress,
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
          ...(!isEmpty(relatedTourPlaces) && {
            tourPlace: {
              connect: relatedTourPlaces.map(v => {
                return {
                  id: v.id,
                };
              }),
            },
          }),
        },
      });

      res.json({
        ...ibDefs.SUCCESS,
        IBparams: createdOne,
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

/// IBTravelTag 세부 태그이름이나 id를 넣으면 상위 태그를 모두 찾아 반환하는 함수
const findAllIBTTPath = async (id: number) => {
  const asyncIterable = {
    [Symbol.asyncIterator]() {
      let nextId: number = id;
      return {
        async next() {
          if (nextId === -1) return { value: null, done: true };
          const tag = await prisma.iBTravelTag.findUnique({
            where: {
              id: nextId,
            },
            include: {
              noPtr: true,
            },
          });

          nextId =
            !isNil(tag) && !isNil(tag?.noPtr) && !isEmpty(tag?.noPtr)
              ? tag.noPtr[0].fromId
              : -1;
          return { value: tag, done: false };
        },
      };
    },
  };

  const result: (
    | (IBTravelTag & { noPtr: RModelBetweenTravelType[] })
    | null
  )[] = [];
  // eslint-disable-next-line no-restricted-syntax
  for await (const tag of asyncIterable) {
    result.push(tag);
  }
  result.reverse();
  return {
    primary: result[0]?.value,
    secondary: result[1]?.value,
  };
};

export type GetMyAdPlaceRequestType = {};
export type GetMyAdPlaceSuccessResType = Omit<
  AdPlace & {
    photos: IBPhotos[];
    category: { primary: string; secondary: string }[];
  },
  'userId'
>;
export type GetMyAdPlaceResType = Omit<IBResFormat, 'IBparams'> & {
  IBparams: GetMyAdPlaceSuccessResType[] | {};
};

/**
 * 수정페이지에서 기 요청한 내 adPlace 정보를 먼저 반환 요청한다.
 * https://www.figma.com/file/Tdpp5Q2J3h19NyvBvZMM2m/brip?type=design&node-id=3577-2555&t=aNXuVNwswvfxSqgP-4
 */
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
          mainPhoto: true,
          photos: true,
          category: true,
        },
      });

      // res.json({
      //   ...ibDefs.SUCCESS,
      //   IBparams: await Promise.all(
      //     myAdPlaces.map(async v => {
      //       return {
      //         ...omit(v, ['userId']),
      //         category: await Promise.all(
      //           v.category.map(async k => findAllIBTTPath(k.id)),
      //         ),
      //       };
      //     }),
      //   ),
      // });

      res.json({
        ...ibDefs.SUCCESS,
        IBparams: await Promise.all(
          myAdPlaces.map(async v => {
            return {
              ...omit(v, ['userId']),
              mainPhoto: isNil(v.photos)
                ? null
                : await getIBPhotoUrl(v.mainPhoto),
              photos: isNil(v.photos)
                ? null
                : await Promise.all(v.photos.map(getIBPhotoUrl)),
              category: await Promise.all(
                v.category.map(async k => findAllIBTTPath(k.id)),
              ),
            };
          }),
        ),
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

export type ModifyAdPlaceRequestType = {
  adPlaceId: string; /// 수정할 adPlace의 Id
  title?: string; /// 상호명
  mainPhotoKey?: string; /// 대표사진 s3 key 형태의 url 또는 직접접근가능한 http 접두어가 포함된 사진링크.
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
  detailAddress?: string; /// 존재할경우 상세주소
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
    category: IBTravelTag[];
  },
  'userId'
>;
export type ModifyAdPlaceResType = Omit<IBResFormat, 'IBparams'> & {
  IBparams: {};
};

/**
 이미 신청 요청한 adPlace의 정보를 수정요청하는 api

photos는 전달하는 파라미터로 기존 저장된 사진 정보를 덮어쓰는것이 아니다. 추가하는것이다.

때문에 사진 삭제를 위해서는 별도로 delAdPlacePhoto api를 이용해야 한다.

Photo 수정
photos 프로퍼티로 대표되는 서브 사진을 변경하는 예시
기존 사진을 변경하는것은 새로 사진을 등록하고 기존것을 삭제해야한다. subPhoto 2,3번 사진이 등록되어 있을때 이중 3번을 4번으로 교체하고 5번을 등록한다고 하면
a. /myPage/modifyAdPlace의 photos 파라미터는 4,5번의 키를 배열로 실어 호출한다.
b. /myPage/delAdPlacePhoto로 3번을 삭제.

mainPhoto는 subPhoto와 다르게 추가의 개념이 없고 그냥 mainPhotoKey로 전달되는 사진으로 덮어써진다. (기존것은 삭제된다.)

adPlace 생성후 승인이 나서 관련된 mainTourPlace가 생성된 상태라면 adPlace의 항목들중 tourPlace에도 영향이 갈만한 필드를 수정하면 함께 수정된다. 사진역시 마찬가지로 추가, 변경, 삭제가 tourPlace에도 함께 반영된다.

Category 수정
category는 전달하는 파라미터로 기존 저장된 카테고리 정보를 덮어쓴다. 즉 A 카테고리를 가지고 있었더라도 B,C를 category 파라미터로 전달하면 A카테고리는 상실하고 B,C 카테고리만 등록된다.
 * https://www.figma.com/file/Tdpp5Q2J3h19NyvBvZMM2m/brip?type=design&node-id=3577-2555&t=aNXuVNwswvfxSqgP-4
 */

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
        mainPhotoKey,
        photos,
        category,
        desc,
        address,
        roadAddress,
        detailAddress,
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
          category: true,
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
            category: IBTravelTag[];
            tourPlace: TourPlace | undefined;
          }
        > => {
          const adPlaceUpdatedResult = await tx.adPlace.update({
            where: {
              id: existCheck.id,
            },
            data: {
              title,
              ...(!isNil(mainPhotoKey) &&
                !isEmpty(mainPhotoKey) && {
                  mainPhoto: {
                    create: {
                      key: mainPhotoKey,
                    },
                  },
                }),
              ...(!isNil(category) && {
                category: await adPlaceCategoryToIBTravelTag({
                  category,
                  adPlaceId: Number(adPlaceId),
                  tx,
                }),
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
              detailAddress,
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

          /// 메인 사진을 변경하려 한다면 기존 메인 사진은 photos에서 삭제한다.
          if (!isNil(mainPhotoKey) && !isEmpty(mainPhotoKey)) {
            await tx.iBPhotos.delete({
              where: {
                id: existCheck.mainPhotoId,
              },
            });
          }

          /// 포토 수정이 있는데 tourPlace가 생성되어 있는 adPlace라면 IBPhotos가 위에서 deleteMany로 모두 삭제되고 재연결되었으므로 tourPlace의 IBPhotos connect도 수정해줘야한다.
          let tpUpdateResult: TourPlace | undefined;
          if (!isNil(adPlaceUpdatedResult.mainTourPlaceId) && !isNil(photos)) {
            tpUpdateResult = await tx.tourPlace.update({
              where: {
                id: adPlaceUpdatedResult.mainTourPlaceId,
              },
              data: {
                title,
                // ...(!isNil(category) && {
                //   category: await adPlaceCategoryToIBTravelTag({
                //     category,
                //     adPlaceId: Number(adPlaceId),
                //     tx,
                //   }),
                // }),

                ...(!isNil(category) &&
                  (await (async () => {
                    const tags = await Promise.all(
                      category.map(v => {
                        return ibTravelTagCategorize(
                          {
                            ibType: {
                              typePath: `${v.primary}>${v.secondary}`,
                              minDifficulty: 1,
                              maxDifficulty: 1,
                            },
                          },
                          tx,
                        );
                      }),
                    );

                    return {
                      ibTravelTag: {
                        connect: tags.map(v => {
                          return {
                            id: v,
                          };
                        }),
                      },
                    };
                  })())),

                ...((!isNil(photos) || !isNil(mainPhotoKey)) &&
                  (() => {
                    /// delAdPlacePhoto로 사전에 별도로 삭제하는 시나리오로 변경함.
                    // /// photos 수정이 있다면 기존에 연결되어 있던 IBPhotos는 삭제한다.
                    // /// 추가 todo: s3에 해당 key를 삭제까지 구현할것.
                    // await prisma.iBPhotos.deleteMany({
                    //   where: {
                    //     adPlaceId: Number(adPlaceId),
                    //   },
                    // });

                    const subPhotos = !isNil(photos) ? photos : [];
                    const mainPhoto = !isNil(mainPhotoKey)
                      ? [{ key: mainPhotoKey }]
                      : [];
                    const combinedPhotos = [...mainPhoto, ...subPhotos];

                    return {
                      photos: {
                        createMany: {
                          data: combinedPhotos,
                        },
                      },
                    };
                  })()),
                desc,
                address,
                roadAddress,
                detailAddress,
                openWeek,
                contact,
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
        if (err.type === 'NOTAUTHORIZED') {
          console.error(err);
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
        v => v.adPlaceAsSubId !== Number(adPlaceId),
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
        if (err.type === 'NOTAUTHORIZED') {
          console.error(err);
          res.status(403).json({
            ...ibDefs.NOTAUTHORIZED,
            IBdetail: (err as Error).message,
            IBparams: {} as object,
          });
          return;
        }
        if (err.type === 'NOTMATCHEDDATA') {
          console.error(err);
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
