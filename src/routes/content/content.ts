import express, { Express } from 'express';
import prisma from '@src/prisma';
import multer from 'multer';
import {
  ibDefs,
  asyncWrapper,
  IBResFormat,
  IBError,
  accessTokenValidCheck,
  s3FileUpload,
  getS3SignedUrl,
  getUserProfileUrl,
} from '@src/utils';
import {
  CardTag,
  CardNewsGroup,
  CardNewsContent,
  Prisma,
} from '@prisma/client';
import { isEmpty, isNil } from 'lodash';

const upload = multer();

const authRouter: express.Application = express();

/**
 * 컨텐츠 검색 api
 * https://www.figma.com/file/4hamONEjUfNCjbZAxC6iW3/Travelit?node-id=311:8047
 * 만약 groupId와 keyword를 같이 넣는다면 groupId가 우선한다.
 * @param keyword required, string # 검색어, 제목 또는 카드태그를 기준으로 검색함 ex) 몰디브
 * @param skip required, string, # 수정일을 기준으로 최근일을 기준 내림차순 정렬하였을때 pagination을 위해 건너뛸 항목 수, skip 수 이후 take 수만큼 취하여 결과를 응답한다. ex) "0"
 * @param take required, string, # 수정일을 기준으로 최근일을 기준으로 내림차순 정렬하였을때 pagintation을 위해 한번에 취할 항목 수, skip 수 이후 take 수만큼 취하여 결과를 응답한다. ex) "10"
 * @param groupId optional, string # cardNewsId이다. 그룹 Id에 속하는 컨텐츠들을 요청할때 기입.
 */

export interface GetContentListRequestType {
  keyword: string;
  skip: number;
  take: number;
  orderBy: string; /// 최신순(latest), 오래된 순(oldest)
  groupId: string;
}
export interface GetContentListSuccessResType {
  groupNo: number;
  groupId: number;
  createdAt: Date;
  updatedAt: Date;
  groupTitle: string;
  groupThumbnail: string;
  cards: {
    cardId: number;
    cardNo: number;
    tag: CardTag[];
    cardTitle: string;
    cardContent: string;
    cardBgUri: string;
  }[];
  userId: number;
  creatorId: number;
  creatorNickName: string;
  userProfileImg: string | null;
}

export type GetContentListResType = Omit<IBResFormat, 'IBparams'> & {
  IBparams: GetContentListSuccessResType[] | {};
};

export const getContentList = asyncWrapper(
  async (
    req: Express.IBTypedReqQuery<GetContentListRequestType>,
    res: Express.IBTypedResponse<GetContentListResType>,
  ) => {
    try {
      const { keyword, take, skip, orderBy, groupId } = req.query;

      const foundNewsGrp = await (async () => {
        if (isNil(groupId)) {
          const resByKeyword = await prisma.cardNewsGroup.findMany({
            where: {
              OR: [
                { title: { contains: keyword } },
                {
                  cardNewsContent: {
                    some: {
                      cardTag: {
                        some: {
                          value: { contains: keyword },
                        },
                      },
                    },
                  },
                },
              ],
            },
            take: Number(take),
            skip: Number(skip),
            include: {
              cardNewsContent: {
                include: {
                  cardTag: true,
                },
              },
              creator: {
                select: {
                  id: true,
                  userId: true,
                  nickName: true,
                  user: {
                    select: {
                      profileImg: true,
                    },
                  },
                },
              },
            },

            ...(!isNil(orderBy) &&
              !isEmpty(orderBy) && {
                orderBy: {
                  id: orderBy.toUpperCase().includes('LATEST') ? 'desc' : 'asc',
                },
              }),
          });
          return resByKeyword;
        }

        const resByGroupId = await prisma.cardNewsGroup.findUnique({
          where: {
            id: Number(groupId),
          },
          include: {
            cardNewsContent: {
              include: {
                cardTag: true,
              },
            },
            creator: {
              select: {
                id: true,
                userId: true,
                nickName: true,
                user: {
                  select: {
                    profileImg: true,
                  },
                },
              },
            },
          },
        });
        return resByGroupId ? [resByGroupId] : [];
      })();

      const retCardGroups = await Promise.all(
        foundNewsGrp.map(async group => {
          const groupThumbnail = group.thumbnailUri.includes('http')
            ? group.thumbnailUri
            : await getS3SignedUrl(group.thumbnailUri);
          const cards = await Promise.all(
            group.cardNewsContent.map(async card => {
              const cardBgUri = card.bgPicUri.includes('http')
                ? card.bgPicUri
                : await getS3SignedUrl(card.bgPicUri);
              return {
                cardId: card.id,
                cardNo: card.no,
                tag: card.cardTag,
                cardTitle: card.title,
                cardContent: card.content,
                cardBgUri,
              };
            }),
          );
          return {
            groupNo: group.no,
            groupId: group.id,
            createdAt: group.createdAt,
            updatedAt: group.updatedAt,
            groupTitle: group.title,
            groupThumbnail,
            cards,
            userId: group.creator.userId,
            creatorId: group.creator.id,
            creatorNickName: group.creator.nickName,
            userProfileImg: await getUserProfileUrl(group.creator.user),
            // userProfileImg: await (async () => {
            //   const { profileImg } = group.creator.user;
            //   if (isNil(profileImg)) return null;
            //   const result =
            //     profileImg && profileImg.toLowerCase().includes('http')
            //       ? profileImg
            //       : await getS3SignedUrl(profileImg);
            //   return result;
            // })(),
          };
        }),
      );
      res.json({
        ...ibDefs.SUCCESS,
        IBparams: retCardGroups,
      });
    } catch (err) {
      if (err instanceof IBError) {
        // if (err.type === 'INVALIDENVPARAMS') {
        //   res.status(500).json({
        //     ...ibDefs.INVALIDENVPARAMS,
        //     IBdetail: (err as Error).message,
        //     IBparams: {} as object,
        //   });
        //   return;
        // }
      }
      throw err;
    }
  },
);

export interface GetHotCardTagListRequestType {
  skip: number;
  take: number;
}
export interface GetHotCardTagListSuccessResType {
  tag: string;
  count: number;
}

export type GetHotCardTagListResType = Omit<IBResFormat, 'IBparams'> & {
  IBparams: GetHotCardTagListSuccessResType[] | {};
};

export const getHotCardTagList = asyncWrapper(
  async (
    req: Express.IBTypedReqQuery<GetHotCardTagListRequestType>,
    res: Express.IBTypedResponse<GetHotCardTagListResType>,
  ) => {
    try {
      const { take = '10', skip = '0' } = req.query;
      const hotTagList = await prisma.cardTag.findMany({
        take: Number(take),
        skip: Number(skip),
        include: {
          _count: {
            select: { cardNewsContent: true },
          },
        },
        orderBy: {
          cardNewsContent: {
            _count: 'desc',
          },
        },
      });

      res.json({
        ...ibDefs.SUCCESS,
        IBparams: hotTagList.map(v => {
          return {
            tag: v.value,
            // eslint-disable-next-line no-underscore-dangle
            count: v._count.cardNewsContent,
          };
        }),
      });
    } catch (err) {
      if (err instanceof IBError) {
        // if (err.type === 'INVALIDENVPARAMS') {
        //   res.status(500).json({
        //     ...ibDefs.INVALIDENVPARAMS,
        //     IBdetail: (err as Error).message,
        //     IBparams: {} as object,
        //   });
        //   return;
        // }
      }
      throw err;
    }
  },
);

export interface GetMainCardNewsGrpRequestType {}
export type GetMainCardNewsGrpSuccessResType = CardNewsGroup & {
  cardNewsContent: CardNewsContent[];
  cardTag: CardTag[];
};

export type GetMainCardNewsGrpResType = Omit<IBResFormat, 'IBparams'> & {
  IBparams: GetMainCardNewsGrpSuccessResType | {};
};

export const getMainCardNewsGrp = asyncWrapper(
  async (
    req: Express.IBTypedReqQuery<GetMainCardNewsGrpRequestType>,
    res: Express.IBTypedResponse<GetMainCardNewsGrpResType>,
  ) => {
    try {
      const { locals } = req;
      const userTokenId = (() => {
        if (
          locals &&
          locals?.grade === 'member'
          // !isEmpty(locals?.user?.tripCreator)
        ) {
          return locals?.user?.userTokenId;
        }

        return locals?.tokenId;
      })();

      if (isNil(userTokenId)) {
        throw new IBError({
          type: 'NOTEXISTDATA',
          message: '정상적으로 부여된 userTokenId를 가지고 있지 않습니다.',
        });
      }

      const recommendedCardNewsGrp = await (async (): Promise<
        | (CardNewsGroup & {
            cardNewsContent: (CardNewsContent & {
              cardTag: CardTag[];
            })[];
          })
        | undefined
      > => {
        /// 임시로 가장 적게 노출된 컨텐츠 그룹을 내보냄. 만약 노출 카운트가 동일한 것들끼리는 임시로 랜덤. 향후 시용지 취향에 따라 노출하도록 변경할것
        const mainCardNewsGrps = await prisma.cardNewsGroup.findMany({
          include: {
            cardNewsContent: {
              include: {
                cardTag: true,
              },
            },
          },
        });

        if (isNil(mainCardNewsGrps)) return undefined;

        // const exposedHeatMap = await prisma.contentGrpExposedHistory.groupBy({
        //   by: ['contentGrpId'],
        //   where: {
        //     userTokenId,
        //   },
        //   _count: {
        //     id: true,
        //   },
        //   orderBy: {
        //     _count: {
        //       id: 'asc',
        //     },
        //   },
        // });

        // /// 한번도 노출된적이 없다면 랜덤
        // if (isNil(exposedHeatMap)) {
        //   return mainCardNewsGrps.sort(() => 0.5 - Math.random())[0];
        // }

        // /// 가장 적게 노출된 contentGrp을 찾아 현재 존재하는 mainCardNewsGroup 리스트에서 아직 존재한다면 해당 그룹을 반환하고 없다면 차순위 최소 노출 contentGrp을 찾아 반복한다.
        // const mainCardNewsGrp = mainCardNewsGrps.find(cg => {
        //   return exposedHeatMap.find(v => v.contentGrpId === cg.id);
        // });

        const exposedHistory = await prisma.contentGrpExposedHistory.findMany({
          where: {
            userTokenId: userTokenId.toString(),
          },
          orderBy: {
            count: 'asc',
          },
        });

        /// 가장 적은 노출 빈도의 카드그룹을 반환, 만약 0인 카운트의 카드그룹이 많다면 그중에선 랜덤
        const heatMap = mainCardNewsGrps
          .sort(() => Math.random() - 0.5)
          .map(v => {
            const hit = exposedHistory.find(ex => v.id === ex.contentGrpId);
            return {
              grpId: v.id,
              userTokenId: userTokenId.toString(),
              count: hit?.count ?? 0,
              cardGrp: v,
            };
          })
          .sort((a, b) => a.count - b.count);

        if (heatMap[0].count > 0) {
          await prisma.contentGrpExposedHistory.update({
            where: {
              userTokenId_contentGrpId: {
                userTokenId: userTokenId.toString(),
                contentGrpId: heatMap[0].grpId,
              },
            },
            data: {
              count: heatMap[0].count + 1,
            },
          });
        } else {
          await prisma.contentGrpExposedHistory.create({
            data: {
              userTokenId: userTokenId.toString(),
              contentGrpId: heatMap[0].grpId,
              count: 1,
            },
          });
        }

        return heatMap[0].cardGrp;
      })();

      if (isNil(recommendedCardNewsGrp)) {
        res.json({
          ...ibDefs.SUCCESS,
          IBparams: {},
        });
        return;
      }

      const groupThumbnail = recommendedCardNewsGrp.thumbnailUri.includes(
        'http',
      )
        ? recommendedCardNewsGrp.thumbnailUri
        : await getS3SignedUrl(recommendedCardNewsGrp.thumbnailUri);
      const cards = await Promise.all(
        recommendedCardNewsGrp.cardNewsContent.map(async card => {
          const cardBgUri = card.bgPicUri.includes('http')
            ? card.bgPicUri
            : await getS3SignedUrl(card.bgPicUri);
          return {
            cardId: card.id,
            cardNo: card.no,
            tag: card.cardTag,
            cardTitle: card.title,
            cardContent: card.content,
            cardBgUri,
          };
        }),
      );
      const ret = {
        groupNo: recommendedCardNewsGrp.no,
        groupId: recommendedCardNewsGrp.id,
        groupTitle: recommendedCardNewsGrp.title,
        groupThumbnail,
        cards,
      };

      res.json({
        ...ibDefs.SUCCESS,
        IBparams: ret,
      });
    } catch (err) {
      if (err instanceof IBError) {
        // if (err.type === 'INVALIDENVPARAMS') {
        //   res.status(500).json({
        //     ...ibDefs.INVALIDENVPARAMS,
        //     IBdetail: (err as Error).message,
        //     IBparams: {} as object,
        //   });
        //   return;
        // }
      }
      throw err;
    }
  },
);

export interface CardNewsContentReqType {
  title: string; /// 그룹에 속한 카드 컨텐츠의 타이틀
  content: string; /// 그룹에 속한 카드 컨텐츠의 내용
  bgPicUri: string; /// 그룹에 속한 카드 컨텐츠의 배경 이미지
  cardTag?: string[]; /// 그룹이 가지는 카드 태그 => 카드 그룹이 가지고 있지만 이것을 개별 카드 컨텐츠가 갖도록 수정 필요
}

export interface CardNewsGroupRequestType {
  title: string; /// 카드 뉴스 그룹 타이틀
  thumbnailUri: string; /// 카드 뉴스 그룹 썸네일 이미지
  groupNo?: string; /// 카드 뉴스 그룹의 번호. 그룹이 연작 시리즈일경우 사용
}
export interface AddCardGrpRequestType extends CardNewsGroupRequestType {
  cardNewsContent?: CardNewsContentReqType[];
}
export interface AddCardGrpSuccessResType
  extends GetContentListSuccessResType {}

export type AddCardGrpResType = Omit<IBResFormat, 'IBparams'> & {
  IBparams: AddCardGrpSuccessResType | {};
};

export const addCardGrp = asyncWrapper(
  async (
    req: Express.IBTypedReqBody<AddCardGrpRequestType>,
    res: Express.IBTypedResponse<AddCardGrpResType>,
  ) => {
    try {
      const param = req.body;

      const { locals } = req;
      const { creatorUserId, userTokenId, creatorId } = (() => {
        if (
          locals &&
          locals?.grade === 'member' &&
          !isEmpty(locals?.user?.tripCreator)
        ) {
          return {
            creatorUserId: locals?.user?.id,
            creatorId: locals?.user?.tripCreator[0].id,
            userTokenId: locals?.user?.userTokenId,
          };
        }

        // return locals?.tokenId;
        throw new IBError({
          type: 'NOTAUTHORIZED',
          message: 'creator member 등급만 접근 가능합니다.',
        });
      })();

      if (!userTokenId || !creatorUserId) {
        throw new IBError({
          type: 'NOTEXISTDATA',
          message: '정상적으로 부여된 userTokenId를 가지고 있지 않습니다.',
        });
      }

      const { title, thumbnailUri, groupNo, cardNewsContent } = param;
      const data = {
        title,
        thumbnailUri,
        no: groupNo ? Number(groupNo) : 0,
        // userId: creatorUserId,
        creatorId: creatorId!,
        ...(cardNewsContent &&
          !isEmpty(cardNewsContent) && {
            cardNewsContent: {
              create: cardNewsContent.map((v, i) => {
                const { cardTag } = v;
                return {
                  title: v.title,
                  content: v.content,
                  bgPicUri: v.bgPicUri,
                  no: i,
                  ...(cardTag &&
                    !isEmpty(cardTag) && {
                      cardTag: {
                        connectOrCreate: cardTag.map(value => {
                          return {
                            where: {
                              value,
                            },
                            create: {
                              value,
                            },
                          };
                        }),
                      },
                    }),
                };
              }),
            },
          }),
      };

      const createdGroup = await prisma.cardNewsGroup.create({
        data,
        include: {
          cardNewsContent: {
            include: {
              cardTag: true,
            },
          },
          creator: {
            select: {
              id: true,
              userId: true,
              nickName: true,
              user: {
                select: {
                  profileImg: true,
                },
              },
            },
          },
        },
      });

      const retCardGroups: AddCardGrpSuccessResType = {
        groupNo: createdGroup.no,
        groupId: createdGroup.id,
        createdAt: createdGroup.createdAt,
        updatedAt: createdGroup.updatedAt,
        groupTitle: createdGroup.title,
        groupThumbnail: createdGroup.thumbnailUri,
        cards: createdGroup.cardNewsContent.map(card => {
          return {
            cardId: card.id,
            cardNo: card.no,
            tag: card.cardTag,
            cardTitle: card.title,
            cardContent: card.content,
            cardBgUri: card.bgPicUri,
          };
        }),
        userId: createdGroup.creator.userId,
        creatorId: createdGroup.creator.id,
        creatorNickName: createdGroup.creator.nickName,
        userProfileImg: createdGroup.creator.user.profileImg,
      };

      res.json({
        ...ibDefs.SUCCESS,
        IBparams: retCardGroups,
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
      }
      throw err;
    }
  },
);

export type UploadCardGrpImgRequestType = {};
export interface UploadCardGrpImgSuccessResType {
  signedUrl: string;
}

export type UploadCardGrpImgResType = Omit<IBResFormat, 'IBparams'> & {
  IBparams: UploadCardGrpImgSuccessResType[] | {};
};

export const uploadCardGrpImg = asyncWrapper(
  async (
    req: Express.IBTypedReqBody<UploadCardGrpImgRequestType>,
    res: Express.IBTypedResponse<UploadCardGrpImgResType>,
  ) => {
    try {
      const { locals } = req;
      const userTokenId = (() => {
        if (
          locals &&
          locals?.grade === 'member' &&
          !isEmpty(locals?.user?.tripCreator)
        ) {
          return locals?.user?.userTokenId;
        }
        throw new IBError({
          type: 'NOTAUTHORIZED',
          message: 'creator member 등급만 접근 가능합니다.',
        });
      })();

      if (!userTokenId) {
        throw new IBError({
          type: 'NOTEXISTDATA',
          message: '정상적으로 부여된 userTokenId를 가지고 있지 않습니다.',
        });
      }

      const files = req.files as Express.Multer.File[];

      const uploadPromises = files.map((file: Express.Multer.File) => {
        return s3FileUpload({
          fileName: `cardNewsGroupImg/${file.originalname}`,
          fileData: file.buffer,
        });
      });

      const [{ Key: key }] = await Promise.all(uploadPromises);

      res.json({
        ...ibDefs.SUCCESS,
        IBparams: {
          key,
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
      }
      throw err;
    }
  },
);

export type UploadCardImgRequestType = {};

export type UploadCardImgResType = Omit<IBResFormat, 'IBparams'> & {
  IBparams: string[] | {};
};

export const uploadCardImg = asyncWrapper(
  async (
    req: Express.IBTypedReqBody<UploadCardImgRequestType>,
    res: Express.IBTypedResponse<UploadCardImgResType>,
  ) => {
    try {
      const { locals } = req;
      const userTokenId = (() => {
        if (
          locals &&
          locals?.grade === 'member' &&
          !isEmpty(locals?.user?.tripCreator)
        ) {
          return locals?.user?.userTokenId;
        }
        throw new IBError({
          type: 'NOTAUTHORIZED',
          message: 'creator member 등급만 접근 가능합니다.',
        });
      })();

      if (!userTokenId) {
        throw new IBError({
          type: 'NOTEXISTDATA',
          message: '정상적으로 부여된 userTokenId를 가지고 있지 않습니다.',
        });
      }

      const files = req.files as Express.Multer.File[];

      const uploadPromises = files.map((file: Express.Multer.File) => {
        return s3FileUpload({
          fileName: `cardNewsContentBgImg/${file.originalname}`,
          fileData: file.buffer,
        });
      });

      // const [{ Key: key }] = await Promise.all(uploadPromises);
      const keys = await Promise.all(uploadPromises);

      res.json({
        ...ibDefs.SUCCESS,
        IBparams: keys.map(v => v.Key),
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
      }
      throw err;
    }
  },
);

export interface UpdateCardGrpRequestType
  extends Partial<CardNewsGroupRequestType> {
  groupId: string;
}
export interface UpdateCardGrpSuccessResType
  extends Omit<GetContentListSuccessResType, 'cards'> {}

export type UpdateCardGrpResType = Omit<IBResFormat, 'IBparams'> & {
  IBparams: UpdateCardGrpSuccessResType | {};
};

export const updateCardGrp = asyncWrapper(
  async (
    req: Express.IBTypedReqBody<UpdateCardGrpRequestType>,
    res: Express.IBTypedResponse<UpdateCardGrpResType>,
  ) => {
    try {
      const param = req.body;

      const { locals } = req;
      const userTokenId = (() => {
        if (
          locals &&
          locals?.grade === 'member' &&
          !isEmpty(locals?.user?.tripCreator)
        ) {
          return locals?.user?.userTokenId;
        }

        throw new IBError({
          type: 'NOTAUTHORIZED',
          message: 'creator member 등급만 접근 가능합니다.',
        });
      })();

      if (!userTokenId) {
        throw new IBError({
          type: 'NOTEXISTDATA',
          message: '정상적으로 부여된 userTokenId를 가지고 있지 않습니다.',
        });
      }

      const { groupId, title, thumbnailUri, groupNo } = param;
      const foundGroup = await prisma.cardNewsGroup.findUnique({
        where: {
          id: Number(groupId),
        },
      });

      if (!foundGroup) {
        throw new IBError({
          type: 'NOTEXISTDATA',
          message: '존재하지 않는 그룹 Id입니다.',
        });
      }

      const updatedGroup = await prisma.cardNewsGroup.update({
        where: {
          id: Number(groupId),
        },
        data: {
          title,
          thumbnailUri,
          no: groupNo ? Number(groupNo) : undefined,
        },
      });

      const retCardGroups = {
        groupNo: updatedGroup.no,
        groupId: updatedGroup.id,
        groupTitle: updatedGroup.title,
        groupThumbnail: updatedGroup.thumbnailUri,
      };

      res.json({
        ...ibDefs.SUCCESS,
        IBparams: retCardGroups,
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
      }
      throw err;
    }
  },
);

export type AddCardNewsRequestUnitType = CardNewsContentReqType & {
  cardNo?: string;
  groupId: string;
  // no?: string;
};

export type UpdateCardNewsRequestUnitType = Partial<CardNewsContentReqType> & {
  cardId: string;
  cardNo?: string;
};

export interface DeleteCardNewsRequestUnitType {
  cardId: string;
}

export interface UpdateCardNewsRequestType {
  cardNewsContent?: UpdateCardNewsRequestUnitType[]; ///  deprecated
  update?: UpdateCardNewsRequestUnitType[];
  add?: AddCardNewsRequestUnitType[];
  delete?: DeleteCardNewsRequestUnitType[];
}

export type PickCardsTypeFromGetContentList =
  GetContentListSuccessResType['cards'][0];
export interface UpdateCardNewsSuccessResType {
  delResult: Prisma.BatchPayload;
  addResult: Prisma.BatchPayload;
  updateResult: PickCardsTypeFromGetContentList;
}

export type UpdateCardNewsResType = Omit<IBResFormat, 'IBparams'> & {
  IBparams: UpdateCardNewsSuccessResType[] | {};
};

export const updateCardNews = asyncWrapper(
  async (
    req: Express.IBTypedReqBody<UpdateCardNewsRequestType>,
    res: Express.IBTypedResponse<UpdateCardNewsResType>,
  ) => {
    try {
      const param = req.body;
      const { locals } = req;
      const userTokenId = (() => {
        if (
          locals &&
          locals?.grade === 'member' &&
          !isEmpty(locals?.user?.tripCreator)
        ) {
          return locals?.user?.userTokenId;
        }

        throw new IBError({
          type: 'NOTAUTHORIZED',
          message: 'creator member 등급만 접근 가능합니다.',
        });
      })();

      if (!userTokenId) {
        throw new IBError({
          type: 'NOTEXISTDATA',
          message: '정상적으로 부여된 userTokenId를 가지고 있지 않습니다.',
        });
      }

      const { cardNewsContent, update, add, delete: del } = param;

      /// 파라미터가 아무것도 없을 경우
      if (
        (isNil(cardNewsContent) || isEmpty(cardNewsContent)) &&
        (isNil(update) || isEmpty(update)) &&
        (isNil(add) || isEmpty(add)) &&
        (isNil(del) || isEmpty(del))
      ) {
        throw new IBError({
          type: 'INVALIDPARAMS',
          message:
            'update, add, delete중 하나의 파라미터 프로퍼티값은 제공되어야 합니다.',
        });
      }

      const operationResult = await prisma.$transaction(async tx => {
        /// delete transaction
        const delCardArrParam = del;
        let result = {};
        if (!isNil(delCardArrParam) && !isEmpty(delCardArrParam)) {
          const found = await tx.cardNewsContent.findMany({
            where: {
              id: { in: delCardArrParam.map(v => Number(v.cardId)) },
            },
          });

          if (found.length !== delCardArrParam.length) {
            throw new IBError({
              type: 'NOTEXISTDATA',
              message: 'delete 연산에 존재하지 않는 카드 Id가 전달되었습니다.',
            });
          }

          const delResult = await tx.cardNewsContent.deleteMany({
            where: {
              id: {
                in: delCardArrParam.map(v => Number(v.cardId)),
              },
            },
          });
          result = {
            ...result,
            delResult,
          };
        }

        /// add transaction
        const addCardArrParam = add;
        if (!isNil(addCardArrParam) && !isEmpty(addCardArrParam)) {
          // groupId = Number(addCardArrParam[0].groupId);
          const lastNoContent = await tx.cardNewsContent.findFirst({
            where: {
              cardNewsGroupId: Number(addCardArrParam[0].groupId),
            },
            orderBy: {
              no: 'desc',
            },
            select: {
              id: true,
              no: true,
            },
          });

          let startCardNo = (() => {
            // if (v.cardNo) {
            //   return Number(v.cardNo);
            // }

            /// 카드그룹에 뉴스컨텐츠가 하나도 없으면 생성되는 no는 1
            if (isNil(lastNoContent)) {
              return 1;
            }
            /// 카드그룹에 뉴스컨텐츠가 하나이상 있으면 마지막 카드의 다음 번호
            return lastNoContent.no + 1;
          })();

          const addResult = await Promise.all(
            addCardArrParam.map(v => {
              const { cardTag } = v;
              const no = (() => {
                if (v.cardNo) {
                  return Number(v.cardNo);
                }
                const retNo = startCardNo;
                startCardNo += 1;
                return retNo;
              })();

              return tx.cardNewsContent.create({
                data: {
                  title: v.title,
                  content: v.content,
                  no,
                  bgPicUri: v.bgPicUri,
                  cardNewsGroupId: Number(v.groupId),
                  ...(cardTag &&
                    !isEmpty(cardTag) && {
                      cardTag: {
                        // set: [],
                        connectOrCreate: cardTag.map(tag => {
                          return {
                            where: {
                              value: tag,
                            },
                            create: {
                              value: tag,
                            },
                          };
                        }),
                      },
                    }),
                },
              });
            }),
          );

          result = {
            ...result,
            addResult,
          };
        }

        /// Update transaction
        const updateCardArrParam =
          isNil(update) || isEmpty(update) ? cardNewsContent : update;

        if (!isNil(updateCardArrParam) && !isEmpty(updateCardArrParam)) {
          const updatedCardList = await Promise.all(
            updateCardArrParam.map(async v => {
              const { cardTag } = v;
              return (async () => {
                const foundCard = await tx.cardNewsContent.findUnique({
                  where: {
                    id: Number(v.cardId),
                  },
                });
                if (!foundCard) {
                  throw new IBError({
                    type: 'NOTEXISTDATA',
                    message:
                      'update연산에 존재하지 않는 카드 Id가 제공되었습니다.',
                  });
                }
                const updatedCardNews = await tx.cardNewsContent.update({
                  where: {
                    id: Number(v.cardId),
                  },
                  data: {
                    title: v.title,
                    content: v.content,
                    no: v.cardNo ? Number(v.cardNo) : undefined,
                    bgPicUri: v.bgPicUri,
                    ...(cardTag &&
                      !isEmpty(cardTag) && {
                        cardTag: {
                          set: [],
                          connectOrCreate: cardTag.map(tag => {
                            return {
                              where: {
                                value: tag,
                              },
                              create: {
                                value: tag,
                              },
                            };
                          }),
                        },
                      }),
                  },
                  include: {
                    cardTag: true,
                  },
                });
                return updatedCardNews;
              })();
            }),
          );

          // groupId = updatedCardList[0].cardNewsGroupId;

          const updateResult = updatedCardList.map(v => {
            return {
              cardId: v.id,
              cardNo: v.no,
              cardTitle: v.title,
              cardContent: v.content,
              cardBgUri: v.bgPicUri,
              tag: v.cardTag.map(n => n.value),
            };
          });
          result = {
            ...result,
            updateResult,
          };
        }
        return result;
      });

      res.json({
        ...ibDefs.SUCCESS,
        IBparams: operationResult,
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
      }
      throw err;
    }
  },
);

export interface DeleteCardGrpRequestType {
  groupId: string;
}
export type DeleteCardGrpResType = Omit<IBResFormat, 'IBparams'> & {
  IBparams: {};
};

export const deleteCardGrp = asyncWrapper(
  async (
    req: Express.IBTypedReqBody<DeleteCardGrpRequestType>,
    res: Express.IBTypedResponse<DeleteCardGrpResType>,
  ) => {
    try {
      const param = req.body;

      const { locals } = req;
      const userTokenId = (() => {
        if (
          locals &&
          locals?.grade === 'member' &&
          !isEmpty(locals?.user?.tripCreator)
        ) {
          return locals?.user?.userTokenId;
        }

        throw new IBError({
          type: 'NOTAUTHORIZED',
          message: 'creator member 등급만 접근 가능합니다.',
        });
      })();

      if (!userTokenId) {
        throw new IBError({
          type: 'NOTEXISTDATA',
          message: '정상적으로 부여된 userTokenId를 가지고 있지 않습니다.',
        });
      }

      const { groupId } = param;
      const foundGroup = await prisma.cardNewsGroup.delete({
        where: {
          id: Number(groupId),
        },
      });

      if (!foundGroup) {
        throw new IBError({
          type: 'NOTEXISTDATA',
          message: '존재하지 않는 그룹 Id입니다.',
        });
      }

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
      }
      throw err;
    }
  },
);

export interface DeleteCardNewsRequestType
  extends DeleteCardNewsRequestUnitType {}
export type DeleteCardNewsResType = Omit<IBResFormat, 'IBparams'> & {
  IBparams: {};
};

export const deleteCardNews = asyncWrapper(
  async (
    req: Express.IBTypedReqBody<DeleteCardNewsRequestType>,
    res: Express.IBTypedResponse<DeleteCardNewsResType>,
  ) => {
    try {
      const param = req.body;

      const { locals } = req;
      const userTokenId = (() => {
        if (
          locals &&
          locals?.grade === 'member' &&
          !isEmpty(locals?.user?.tripCreator)
        ) {
          return locals?.user?.userTokenId;
        }

        throw new IBError({
          type: 'NOTAUTHORIZED',
          message: 'creator member 등급만 접근 가능합니다.',
        });
      })();

      if (!userTokenId) {
        throw new IBError({
          type: 'NOTEXISTDATA',
          message: '정상적으로 부여된 userTokenId를 가지고 있지 않습니다.',
        });
      }

      const { cardId } = param;
      const foundNewsContent = await prisma.cardNewsContent.delete({
        where: {
          id: Number(cardId),
        },
      });

      if (!foundNewsContent) {
        throw new IBError({
          type: 'NOTEXISTDATA',
          message: '존재하지 않는 그룹 Id입니다.',
        });
      }

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
      }
      throw err;
    }
  },
);

export interface GetMyContentListRequestType {
  keyword: string;
  skip: number;
  take: number;
  orderBy: string; /// 최신순(latest), 오래된 순(oldest)
}
export interface GetMyContentListSuccessResType {
  groupNo: number;
  groupId: number;
  createdAt: Date;
  updatedAt: Date;
  groupTitle: string;
  groupThumbnail: string;
  cards: {
    cardId: number;
    cardNo: number;
    tag: CardTag[];
    cardTitle: string;
    cardContent: string;
    cardBgUri: string;
  }[];
  userId: number;
  creatorId: number;
  creatorNickName: string;
  userProfileImg: string | null;
}

export type GetMyContentListResType = Omit<IBResFormat, 'IBparams'> & {
  IBparams: GetMyContentListSuccessResType[] | {};
};

export const getMyContentList = asyncWrapper(
  async (
    req: Express.IBTypedReqQuery<GetMyContentListRequestType>,
    res: Express.IBTypedResponse<GetMyContentListResType>,
  ) => {
    try {
      const { keyword, take, skip, orderBy } = req.query;

      const { locals } = req;
      const { creatorId } = (() => {
        if (
          locals &&
          locals?.grade === 'member' &&
          !isEmpty(locals?.user?.tripCreator)
        ) {
          return {
            // creatorUserId: locals?.user?.id,
            creatorId: locals?.user?.tripCreator[0].id,
            // userTokenId: locals?.user?.userTokenId,
          };
        }

        // return locals?.tokenId;
        throw new IBError({
          type: 'NOTAUTHORIZED',
          message: 'creator member 등급만 접근 가능합니다.',
        });
      })();

      const foundNewsGrp = await prisma.cardNewsGroup.findMany({
        where: {
          OR: [
            { title: { contains: keyword } },
            {
              cardNewsContent: {
                some: {
                  cardTag: {
                    some: {
                      value: { contains: keyword },
                    },
                  },
                },
              },
            },
          ],
          // user: {
          //   userTokenId,
          // },
          creatorId: creatorId!,
        },
        take: Number(take),
        skip: Number(skip),
        include: {
          cardNewsContent: {
            include: {
              cardTag: true,
            },
          },
          creator: {
            select: {
              id: true,
              userId: true,
              nickName: true,
              user: {
                select: {
                  profileImg: true,
                },
              },
            },
          },
        },
        ...(!isNil(orderBy) &&
          !isEmpty(orderBy) && {
            orderBy: {
              id: orderBy.toUpperCase().includes('LATEST') ? 'desc' : 'asc',
            },
          }),
      });

      // const retCardGroups: GetContentListSuccessResType[] = foundNewsGrp.map(
      //   group => {
      //     return {
      //       groupNo: group.no,
      //       groupId: group.id,
      //       groupTitle: group.title,
      //       groupThumbnail: group.thumbnailUri,
      //       cards: group.cardNewsContent.map(card => {
      //         return {
      //           cardId: card.id,
      //           cardNo: card.no,
      //           tag: card.cardTag,
      //           cardTitle: card.title,
      //           cardContent: card.content,
      //           cardBgUri: card.bgPicUri,
      //         };
      //       }),
      //     };
      //   },
      // );

      const retCardGroups = await Promise.all(
        foundNewsGrp.map(async group => {
          const groupThumbnail = group.thumbnailUri.includes('http')
            ? group.thumbnailUri
            : await getS3SignedUrl(group.thumbnailUri);
          const cards = await Promise.all(
            group.cardNewsContent.map(async card => {
              const cardBgUri = card.bgPicUri.includes('http')
                ? card.bgPicUri
                : await getS3SignedUrl(card.bgPicUri);
              return {
                cardId: card.id,
                cardNo: card.no,
                tag: card.cardTag,
                cardTitle: card.title,
                cardContent: card.content,
                cardBgUri,
              };
            }),
          );
          return {
            groupNo: group.no,
            groupId: group.id,
            createdAt: group.createdAt,
            updatedAt: group.updatedAt,
            groupTitle: group.title,
            groupThumbnail,
            cards,
            userId: group.creator.userId,
            creatorId: group.creator.id,
            creatorNickName: group.creator.nickName,
            userProfileImg: await (async () => {
              const { profileImg } = group.creator.user;
              if (isNil(profileImg)) return null;
              const result =
                profileImg && profileImg.toLowerCase().includes('http')
                  ? profileImg
                  : await getS3SignedUrl(profileImg);
              return result;
            })(),
          };
        }),
      );

      res.json({
        ...ibDefs.SUCCESS,
        IBparams: retCardGroups,
      });
    } catch (err) {
      if (err instanceof IBError) {
        // if (err.type === 'INVALIDENVPARAMS') {
        //   res.status(500).json({
        //     ...ibDefs.INVALIDENVPARAMS,
        //     IBdetail: (err as Error).message,
        //     IBparams: {} as object,
        //   });
        //   return;
        // }
      }
      throw err;
    }
  },
);

export interface GetRandomCardImgRequestType {
  num: string;
}
export interface GetRandomCardImgSuccessResType {
  img: string[];
}

export type GetRandomCardImgResType = Omit<IBResFormat, 'IBparams'> & {
  IBparams: GetRandomCardImgSuccessResType | {};
};

export const getRandomCardImg = asyncWrapper(
  async (
    req: Express.IBTypedReqQuery<GetRandomCardImgRequestType>,
    res: Express.IBTypedResponse<GetRandomCardImgResType>,
  ) => {
    try {
      const { num = '10' } = req.query;
      const { locals } = req;
      const userTokenId = (() => {
        if (locals && locals?.grade === 'member') {
          return locals?.user?.userTokenId;
        }

        return locals?.tokenId;
      })();

      if (!userTokenId) {
        throw new IBError({
          type: 'NOTEXISTDATA',
          message: '정상적으로 부여된 userTokenId를 가지고 있지 않습니다.',
        });
      }
      const cardNewsContent = await prisma.$queryRaw<
        Promise<{ bgPicUri: string }[]>
      >(
        Prisma.sql`select bgPicUri from CardNewsContent order by RAND() limit ${Number(
          num,
        )};`,
      );

      const retImgs = await Promise.all(
        cardNewsContent.map(async card => {
          const img = card.bgPicUri.includes('http')
            ? card.bgPicUri
            : await getS3SignedUrl(card.bgPicUri);

          return img;
        }),
      );

      res.json({
        ...ibDefs.SUCCESS,
        IBparams: { img: retImgs },
      });
    } catch (err) {
      if (err instanceof IBError) {
        // if (err.type === 'INVALIDENVPARAMS') {
        //   res.status(500).json({
        //     ...ibDefs.INVALIDENVPARAMS,
        //     IBdetail: (err as Error).message,
        //     IBparams: {} as object,
        //   });
        //   return;
        // }
      }
      throw err;
    }
  },
);

authRouter.get('/getContentList', accessTokenValidCheck, getContentList);
authRouter.get('/getHotCardTagList', accessTokenValidCheck, getHotCardTagList);
authRouter.get(
  '/getMainCardNewsGrp',
  accessTokenValidCheck,
  getMainCardNewsGrp,
);
authRouter.post('/addCardGrp', accessTokenValidCheck, addCardGrp);
authRouter.post(
  '/uploadCardGrpImg',
  accessTokenValidCheck,
  [upload.array('files', 10)],
  uploadCardGrpImg,
);
authRouter.post(
  '/uploadCardImg',
  accessTokenValidCheck,
  [upload.array('files', 10)],
  uploadCardImg,
);
authRouter.post('/updateCardGrp', accessTokenValidCheck, updateCardGrp);
authRouter.post('/updateCardNews', accessTokenValidCheck, updateCardNews);
authRouter.post('/deleteCardGrp', accessTokenValidCheck, deleteCardGrp);
authRouter.post('/deleteCardNews', accessTokenValidCheck, deleteCardNews);
authRouter.get('/getMyContentList', accessTokenValidCheck, getMyContentList);
authRouter.get('/getRandomCardImg', accessTokenValidCheck, getRandomCardImg);

export default authRouter;
