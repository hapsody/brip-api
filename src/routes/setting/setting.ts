import express, { Express } from 'express';
import prisma from '@src/prisma';
import {
  ibDefs,
  asyncWrapper,
  IBResFormat,
  IBError,
  accessTokenValidCheck,
} from '@src/utils';

const authRouter: express.Application = express();

export type ReqTicketRequestType = {
  content: string;
};
// export interface ReqTicketSuccessResType {
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

export type ReqTicketResType = Omit<IBResFormat, 'IBparams'> & {
  // IBparams: ReqTicketSuccessResType[] | {};
  IBparams: {};
};

export const reqTicket = asyncWrapper(
  async (
    req: Express.IBTypedReqBody<ReqTicketRequestType>,
    res: Express.IBTypedResponse<ReqTicketResType>,
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
      const { content } = req.body;

      await prisma.questionTicket.create({
        data: {
          content,
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
        // if (err.type === 'INVALIDENVPARAMS') {
        //   res.status(500).json({
        //     ...ibDefs.INVALIDENVPARAMS,
        //     IBdetail: (err as Error).message,
        //     IBparams: {} as object,
        //   });
        //   return;
        // }

        if (err.type === 'NOTAUTHORIZED') {
          res.status(403).json({
            ...ibDefs.NOTAUTHORIZED,
            IBdetail: (err as Error).message,
            IBparams: {} as object,
          });
          return;
        }
        if (err.type === 'NOTEXISTDATA') {
          res.status(202).json({
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

export type ReqBusinessTicketRequestType = {
  name: string;
  phone: string;
  content: string;
};
// export interface ReqBusinessTicketSuccessResType {
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

export type ReqBusinessTicketResType = Omit<IBResFormat, 'IBparams'> & {
  // IBparams: ReqBusinessTicketSuccessResType[] | {};
  IBparams: {};
};

export const reqBusinessTicket = asyncWrapper(
  async (
    req: Express.IBTypedReqBody<ReqBusinessTicketRequestType>,
    res: Express.IBTypedResponse<ReqBusinessTicketResType>,
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
      const { name, phone, content } = req.body;

      await prisma.businessQuestionTicket.create({
        data: {
          companyName: name,
          phone,
          content,
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
        // if (err.type === 'INVALIDENVPARAMS') {
        //   res.status(500).json({
        //     ...ibDefs.INVALIDENVPARAMS,
        //     IBdetail: (err as Error).message,
        //     IBparams: {} as object,
        //   });
        //   return;
        // }

        if (err.type === 'NOTAUTHORIZED') {
          res.status(403).json({
            ...ibDefs.NOTAUTHORIZED,
            IBdetail: (err as Error).message,
            IBparams: {} as object,
          });
          return;
        }
        if (err.type === 'NOTEXISTDATA') {
          res.status(202).json({
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

export type GetFaqListRequestType = {
  name: string;
  phone: string;
  content: string;
};
export interface GetFaqListSuccessResType {
  title: string;
  answer: string;
}

export type GetFaqListResType = Omit<IBResFormat, 'IBparams'> & {
  IBparams: GetFaqListSuccessResType[] | {};
  // IBparams: {};
};

export const getFaqList = asyncWrapper(
  async (
    req: Express.IBTypedReqQuery<GetFaqListRequestType>,
    res: Express.IBTypedResponse<GetFaqListResType>,
  ) => {
    try {
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

      const faqList = await prisma.faqList.findMany();
      const retArr = faqList.map(v => {
        return {
          title: v.question,
          answer: v.answer,
        };
      });
      res.json({
        ...ibDefs.SUCCESS,
        IBparams: retArr,
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
          res.status(202).json({
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

enum CreatorDomain {
  TOUR,
  ACTIVITY,
  HIKING,
  HONEYMOON,
  GOLF,
  PACKAGE,
  EXPERIENCE,
  GROUPACTIVITY,
}

export type ReqTripCreatorRequestType = {
  name: string;
  phone: string;
  area: string;
  content: string;
  checkList: (keyof typeof CreatorDomain)[];
  // userToken: string;
};
// export interface ReqTripCreatorSuccessResType {
//   title: string;
//   answer: string;
// }

export type ReqTripCreatorResType = Omit<IBResFormat, 'IBparams'> & {
  // IBparams: ReqTripCreatorSuccessResType[] | {};
  IBparams: {};
};

export const reqTripCreator = asyncWrapper(
  async (
    req: Express.IBTypedReqBody<ReqTripCreatorRequestType>,
    res: Express.IBTypedResponse<ReqTripCreatorResType>,
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
      const { name, phone, area, content, checkList } = req.body;

      try {
        const alreadyCreator = await prisma.tripCreator.findUnique({
          where: {
            nickName: name,
          },
        });

        if (alreadyCreator) {
          throw new IBError({
            type: 'DUPLICATEDDATA',
            message: '이미 존재하는 nickname입니다.',
          });
        }

        await prisma.tripCreator.create({
          data: {
            nickName: name,
            phone,
            area,
            proposal: content,
            domain: checkList
              .map(
                v =>
                  CreatorDomain[v.toUpperCase() as keyof typeof CreatorDomain],
              )
              .toString(),
            user: {
              connect: {
                userTokenId,
              },
            },
          },
        });
      } catch (err) {
        if (err instanceof IBError) {
          throw err;
        }
        throw new IBError({
          type: 'DBTRANSACTIONERROR',
          message: 'DB 생성중에 문제가 발생했습니다.',
        });
      }

      res.json({
        ...ibDefs.SUCCESS,
        IBparams: {},
      });
    } catch (err) {
      console.error(err);
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
          res.status(202).json({
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

authRouter.post('/reqTicket', accessTokenValidCheck, reqTicket);
authRouter.post('/reqBusinessTicket', accessTokenValidCheck, reqBusinessTicket);
authRouter.get('/getFaqList', accessTokenValidCheck, getFaqList);
authRouter.post('/reqTripCreator', accessTokenValidCheck, reqTripCreator);

export default authRouter;
