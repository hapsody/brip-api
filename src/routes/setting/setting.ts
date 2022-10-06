import express, { Express } from 'express';
import prisma from '@src/prisma';
import nodemailer from 'nodemailer';
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

export const reqTicket = (
  req: Express.IBTypedReqBody<ReqTicketRequestType>,
  res: Express.IBTypedResponse<ReqTicketResType>,
): void => {
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

    prisma.questionTicket
      .create({
        data: {
          content,
          user: {
            connect: {
              userTokenId,
            },
          },
        },
        include: {
          user: true,
        },
      })
      .then(createdTicket => {
        res.json({
          ...ibDefs.SUCCESS,
          IBparams: {},
        });

        const transporter = nodemailer.createTransport({
          service: 'gmail', // 메일 보내는 곳
          port: 587,
          host: 'smtp.gmlail.com',
          secure: true,
          requireTLS: true,
          auth: {
            user: process.env.SYSTEM_EAMIL_SENDER, // 보내는 메일의 주소
            pass: process.env.SYSTEM_EMAIL_APPPASS, // 보내는 메일의 비밀번호
            // type: 'OAuth2',
            // user: process.env.OAUTH_USER as string,
            // clientId: process.env.OAUTH_CLIENT_ID as string,
            // clientSecret: process.env.OAUTH_CLIENT_SECRET as string,
            // refreshToken: process.env.OAUTH_REFRESH_TOKEN as string,
          },
        });

        // send mail with defined transport object
        // const info = await transporter.sendMail({
        transporter
          .sendMail({
            from: `BRiP Admin" <${process.env.SYSTEM_EAMIL_SENDER as string}>`, // sender address
            to: `${createdTicket.user.email}, hapsody@gmail.com`, // list of receivers
            subject: 'BRiP System notification', // Subject line
            // text: '', // plain text body
            html: `<b>${createdTicket.createdAt.toLocaleString()}</b> 에 문의된 항목입니다. 
            <br><br>
            <b>이하 문의 본문: </b><br>
            ${createdTicket.content}
            `, // html body
          })
          .then(async () => {
            await prisma.questionTicket.update({
              where: {
                id: createdTicket.id,
              },
              data: {
                noti: true,
              },
            });
          })
          .catch(err => {
            throw new IBError({
              type: 'EXTERNALAPI',
              message: `nodemailer 이메일 전송중 문제가 발생했습니다. \n\n ${
                (err as Error).message
              }`,
            });
          });
      })
      .catch(err => {
        if (err instanceof IBError) {
          throw err;
        }
        throw new IBError({
          type: 'DBTRANSACTIONERROR',
          message: `DB에 ticket 생성중 문제가 발생했습니다. \n\n ${
            (err as Error).message
          }`,
        });
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
};

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
