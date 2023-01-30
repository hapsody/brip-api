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
} from '@src/utils';
import { CardTag, CardNewsGroup, CardNewsContent } from '@prisma/client';
import { isEmpty } from 'lodash';

const upload = multer();

const authRouter: express.Application = express();

export interface GetContentListRequestType {
  keyword: string;
  skip: number;
  take: number;
}
export interface GetContentListSuccessResType {
  groupNo: number;
  groupId: number;
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
      const { keyword, take, skip } = req.query;
      const foundNewsGrp = await prisma.cardNewsGroup.findMany({
        where: {
          OR: [
            { title: { contains: keyword } },
            {
              cardTag: {
                some: {
                  value: { contains: keyword },
                },
              },
            },
          ],
        },
        take: Number(take),
        skip: Number(skip),
        include: {
          cardNewsContent: true,
          cardTag: true,
        },
      });

      const retCardGroups: GetContentListSuccessResType[] = foundNewsGrp.map(
        group => {
          return {
            groupNo: group.no,
            groupId: group.id,
            groupTitle: group.title,
            groupThumbnail: group.thumbnailUri,
            cards: group.cardNewsContent.map(card => {
              return {
                cardId: card.id,
                cardNo: card.no,
                tag: group.cardTag,
                cardTitle: card.title,
                cardContent: card.content,
                cardBgUri: card.bgPicUri,
              };
            }),
          };
        },
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
      const { take, skip } = req.query;
      const hotTagList = await prisma.cardTag.findMany({
        take: Number(take),
        skip: Number(skip),
        include: {
          _count: {
            select: { cardNewsGroup: true },
          },
        },
        orderBy: {
          cardNewsGroup: {
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
            count: v._count.cardNewsGroup,
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
      /// 임시로 가장 최근 작성된 뉴스 그룹을 내보내도록 함. 향후 시용지 취향에 따라 노출하도록 변경할것
      const mainCardNewsGrp = await prisma.cardNewsGroup.findFirst({
        orderBy: {
          id: 'desc',
        },
        include: {
          cardNewsContent: true,
          cardTag: true,
        },
      });

      res.json({
        ...ibDefs.SUCCESS,
        IBparams: mainCardNewsGrp ?? {},
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

export interface AddCardGrpRequestType {
  title: string; /// 카드 뉴스 그룹 타이틀
  thumbnailUri: string; /// 카드 뉴스 그룹 썸네일 이미지
  no?: number; /// 카드 뉴스 그룹의 번호. 그룹이 연작 시리즈일경우 사용
  cardNewsContent?: {
    title: string; /// 그룹에 속한 카드 컨텐츠의 타이틀
    content: string; /// 그룹에 속한 카드 컨텐츠의 내용
    bgPicUri: string; /// 그룹에 속한 카드 컨텐츠의 배경 이미지
  }[];
  cardTag?: string[]; /// 그룹이 가지는 카드 태그 => 카드 그룹이 가지고 있지만 이것을 개별 카드 컨텐츠가 갖도록 수정 필요
}
export interface AddCardGrpSuccessResType
  extends GetMainCardNewsGrpSuccessResType {}

export type AddCardGrpResType = Omit<IBResFormat, 'IBparams'> & {
  IBparams: AddCardGrpSuccessResType[] | {};
};

export const addCardGrp = asyncWrapper(
  async (
    req: Express.IBTypedReqBody<AddCardGrpRequestType>,
    res: Express.IBTypedResponse<AddCardGrpResType>,
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

        // return locals?.tokenId;
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

      const { title, thumbnailUri, no, cardNewsContent, cardTag } = param;
      const createRes = await prisma.cardNewsGroup.create({
        data: {
          title,
          thumbnailUri,
          no: no ?? 1,
          ...(cardNewsContent &&
            !isEmpty(cardNewsContent) && {
              cardNewsContent: {
                createMany: {
                  data: cardNewsContent.map((v, i) => {
                    return {
                      title: v.title,
                      content: v.content,
                      bgPicUri: v.bgPicUri,
                      no: i,
                    };
                  }),
                },
              },
            }),
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
        },
        include: {
          cardNewsContent: true,
          cardTag: true,
        },
      });

      res.json({
        ...ibDefs.SUCCESS,
        IBparams: createRes,
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
      }
      throw err;
    }
  },
);

authRouter.get('/getContentList', accessTokenValidCheck, getContentList);
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

export default authRouter;
