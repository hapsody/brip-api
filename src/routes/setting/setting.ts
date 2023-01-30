import express, { Express } from 'express';
import prisma from '@src/prisma';
import nodemailer from 'nodemailer';
import multer from 'multer';
import {
  QuestionTicket,
  User,
  BusinessQuestionTicket,
  TripCreator,
} from '@prisma/client';
import {
  ibDefs,
  asyncWrapper,
  IBResFormat,
  IBError,
  accessTokenValidCheck,
  s3FileUpload,
  getS3SignedUrl,
} from '@src/utils';

const upload = multer();

const settingRouter: express.Application = express();

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

const sendEmail = async (params: {
  from: string;
  to: string;
  subject: string;
  html: string;
}) => {
  try {
    const { from, to, subject, html } = params;
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
    await transporter.sendMail({
      from, // sender address
      to, // list of receivers
      subject, // Subject line
      // text: '', // plain text body
      html, // html body
    });
  } catch (err) {
    throw new IBError({
      type: 'EXTERNALAPI',
      message: `nodemailer 이메일 전송중 문제가 발생했습니다. \n\n ${
        (err as Error).message
      }`,
    });
  }
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

      let createdTicket: QuestionTicket & {
        user: User;
      };

      try {
        createdTicket = await prisma.questionTicket.create({
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
        });
      } catch (err) {
        throw new IBError({
          type: 'DBTRANSACTIONERROR',
          message: `DB에 ticket 생성중 문제가 발생했습니다. \n\n ${
            (err as Error).message
          }`,
        });
      }

      await sendEmail({
        from: `BRiP Admin" <${process.env.SYSTEM_EMAIL_SENDER as string}>`,
        to: `${createdTicket.user.email}, hapsody@gmail.com`,
        subject: 'BRiP System - User Question Notification',
        html: `<b>${createdTicket.user.email}</b> 에 의해 문의된 항목입니다. 
        <br><br>
        <b>이하 문의 본문: </b><br>
        ${createdTicket.content}
        <br><br>
        <b>문의 작성일시: <${createdTicket.createdAt.toLocaleString()}></b>
        `,
      });

      try {
        await prisma.questionTicket.update({
          where: {
            id: createdTicket.id,
          },
          data: {
            noti: true,
          },
        });
      } catch (err) {
        throw new IBError({
          type: 'DBTRANSACTIONERROR',
          message: `ticket에 상태 업데이트중 문제가 발생했습니다. \n\n ${
            (err as Error).message
          }`,
        });
      }

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

      let createdTicket: BusinessQuestionTicket & {
        user: User;
      };
      try {
        createdTicket = await prisma.businessQuestionTicket.create({
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
          include: {
            user: true,
          },
        });
      } catch (err) {
        throw new IBError({
          type: 'DBTRANSACTIONERROR',
          message: `DB에 businessQuestionTicket 생성중 문제가 발생했습니다. . \n\n ${
            (err as Error).message
          }`,
        });
      }

      await sendEmail({
        from: `BRiP Admin" <${process.env.SYSTEM_EMAIL_SENDER as string}>`,
        to: `${createdTicket.user.email}, hapsody@gmail.com`,
        subject: 'BRiP System - Business Question Notification',
        html: `<b>${
          createdTicket.user.email
        }</b> 에 의해 비지니스 문의한 항목입니다. 
        <br><br>
        회사명: ${createdTicket.companyName}, <br>
        연락처: ${createdTicket.phone}, <br>
        문의내용: ${createdTicket.content}
        <br><br>
        <b>문의 작성일시: <${createdTicket.createdAt.toLocaleString()}></b>
        `,
      });

      try {
        await prisma.businessQuestionTicket.update({
          where: {
            id: createdTicket.id,
          },
          data: {
            noti: true,
          },
        });
      } catch (err) {
        throw new IBError({
          type: 'DBTRANSACTIONERROR',
          message: `businessQuestionTicket에 상태 업데이트중 문제가 발생했습니다. \n\n ${
            (err as Error).message
          }`,
        });
      }

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

      let tripCreator: TripCreator & {
        user: User;
      };
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

        tripCreator = await prisma.tripCreator.create({
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
          include: {
            user: true,
          },
        });
      } catch (err) {
        console.log(err);
        if (err instanceof IBError) {
          throw err;
        }
        throw new IBError({
          type: 'DBTRANSACTIONERROR',
          message: 'tripCreator DB 생성중에 문제가 발생했습니다.',
        });
      }

      await sendEmail({
        from: `BRiP Admin" <${process.env.SYSTEM_EMAIL_SENDER as string}>`,
        to: `${tripCreator.user.email}, hapsody@gmail.com`,
        subject: 'BRiP System - Trip Creator Proposal Notification',
        html: `<b>${
          tripCreator.user.email
        }</b> 에 의해 요청된 Trip Creator 신청 항목입니다. 
        <br><br>
        닉네임: ${tripCreator.nickName}, <br>
        연락처: ${tripCreator.phone}, <br>
        전문지역: ${tripCreator.area}, <br>
        전문영역: ${tripCreator.domain
          .split(',')
          .map(v => {
            return `${CreatorDomain[Number(v)]}`;
          })
          .toString()},  <br>
        제휴내용: ${tripCreator.proposal}
        <br><br>
        <b>문의 작성일시: <${tripCreator.createdAt.toLocaleString()}></b>
        `,
      });

      try {
        await prisma.tripCreator.update({
          where: {
            id: tripCreator.id,
          },
          data: {
            noti: true,
          },
        });
      } catch (err) {
        throw new IBError({
          type: 'DBTRANSACTIONERROR',
          message: `tripCreator 에 상태 업데이트중 문제가 발생했습니다. \n\n ${
            (err as Error).message
          }`,
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

export type ChangeProfileImgRequestType = {};
export interface ChangeProfileImgSuccessResType {
  signedUrl: string;
}

export type ChangeProfileImgResType = Omit<IBResFormat, 'IBparams'> & {
  IBparams: ChangeProfileImgSuccessResType[] | {};
};

export const changeProfileImg = asyncWrapper(
  async (
    req: Express.IBTypedReqBody<ChangeProfileImgRequestType>,
    res: Express.IBTypedResponse<ChangeProfileImgResType>,
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

      const files = req.files as Express.Multer.File[];

      const uploadPromises = files.map((file: Express.Multer.File) => {
        return s3FileUpload({
          fileName: `userProfileImg/${file.originalname}`,
          fileData: file.buffer,
        });
      });

      const [{ Key: key }] = await Promise.all(uploadPromises);

      await prisma.user.update({
        where: {
          userTokenId,
        },
        data: {
          profileImg: key,
        },
      });
      // const signedProfileImgUrl = await getS3SignedUrl(`${key}`);

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

export type GetProfileImgRequestType = {
  key: string;
};
export interface GetProfileImgSuccessResType {
  signedUrl: string;
}

export type GetProfileImgResType = Omit<IBResFormat, 'IBparams'> & {
  IBparams: GetProfileImgSuccessResType[] | {};
};

export const getProfileImg = asyncWrapper(
  async (
    req: Express.IBTypedReqBody<GetProfileImgRequestType>,
    res: Express.IBTypedResponse<GetProfileImgResType>,
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

      const { key } = req.body;

      const signedUrl = await getS3SignedUrl(`${key}`);

      res.json({
        ...ibDefs.SUCCESS,
        IBparams: {
          signedUrl,
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

settingRouter.post('/reqTicket', accessTokenValidCheck, reqTicket);
settingRouter.post(
  '/reqBusinessTicket',
  accessTokenValidCheck,
  reqBusinessTicket,
);
settingRouter.get('/getFaqList', accessTokenValidCheck, getFaqList);
settingRouter.post('/reqTripCreator', accessTokenValidCheck, reqTripCreator);
settingRouter.post(
  '/changeProfileImg',
  accessTokenValidCheck,
  [upload.array('files', 10)],
  changeProfileImg,
);
settingRouter.post('/getProfileImg', accessTokenValidCheck, getProfileImg);

export default settingRouter;
