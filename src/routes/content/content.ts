import express, { Express } from 'express';
import prisma from '@src/prisma';
import {
  ibDefs,
  asyncWrapper,
  IBResFormat,
  IBError,
  accessTokenValidCheck,
} from '@src/utils';
import { CardTag } from '@prisma/client';

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

authRouter.get('/getContentList', accessTokenValidCheck, getContentList);
authRouter.get('/getHotCardTagList', accessTokenValidCheck, getHotCardTagList);

export default authRouter;
