import express from 'express';
import prisma from '@src/prisma';
import multer from 'multer';
import {
  QuestionTicket,
  User,
  BusinessQuestionTicket,
  TripCreator,
  FavoriteTravelType,
  Prisma,
  AdPlaceStatus,
} from '@prisma/client';
import {
  ibDefs,
  asyncWrapper,
  IBResFormat,
  IBError,
  accessTokenValidCheck,
  getS3SignedUrl,
  sendEmail,
} from '@src/utils';
import { omit, isEmpty, isNil } from 'lodash';

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

        if (err.type === 'DBTRANSACTIONERROR') {
          console.error(err);
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
        if (err.type === 'DBTRANSACTIONERROR') {
          console.error(err);
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
  area: string;
  domain: (keyof typeof CreatorDomain)[];
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
      const { userTokenId, memberId } = (() => {
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

      if (!userTokenId) {
        throw new IBError({
          type: 'NOTEXISTDATA',
          message: '정상적으로 부여된 userTokenId를 가지고 있지 않습니다.',
        });
      }
      const { name, area, domain } = req.body;

      let tripCreator: TripCreator & {
        user: User;
      };

      const user = await prisma.user.findUnique({
        where: {
          id: memberId,
        },
        include: {
          tripCreator: {
            where: {
              nickName: name,
            },
          },
        },
      });

      if (isNil(user)) {
        throw new IBError({
          type: 'NOTEXISTDATA',
          message: '존재하지 않는 memberId 입니다.',
        });
      }
      if (!isEmpty(user.tripCreator)) {
        throw new IBError({
          type: 'DUPLICATEDDATA',
          message: '이미 존재하는 nickname입니다.',
        });
      }

      await prisma.$transaction(async tx => {
        try {
          tripCreator = await tx.tripCreator.create({
            data: {
              nickName: name,
              area,
              domain: domain
                .map(
                  v =>
                    CreatorDomain[
                      v.toUpperCase() as keyof typeof CreatorDomain
                    ],
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
          to: `${user.email}, hapsody@gmail.com`,
          subject: 'BRiP System - Trip Creator Proposal Notification',
          html: `<b>${
            user.email
          }</b> 에 의해 요청된 Trip Creator 신청 항목입니다. 
          <br><br>
          닉네임: ${name}, <br>
          연락처: ${user.phone}, <br>
          전문지역: ${area}, <br>
          전문영역: ${domain.toString()},  <br>
          <br><br>
          <b>문의 작성일시: <${tripCreator.createdAt.toLocaleString()}></b>
          `,
        });

        try {
          await tx.tripCreator.update({
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
      });

      res.json({
        ...ibDefs.SUCCESS,
        IBparams: {},
      });
    } catch (err) {
      console.error(err);
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
        if (err.type === 'DBTRANSACTIONERROR') {
          console.error(err);
          res.status(500).json({
            ...ibDefs.DBTRANSACTIONERROR,
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

export type ChangeProfileImgRequestType = {
  key: string;
};
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
      const { key } = req.body;
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

      if (isNil(userTokenId)) {
        throw new IBError({
          type: 'NOTEXISTDATA',
          message: '정상적으로 부여된 userTokenId를 가지고 있지 않습니다.',
        });
      }

      if (isNil(key)) {
        throw new IBError({
          type: 'INVALIDPARAMS',
          message: 'key는 필수 파라미터값입니다.',
        });
      }

      // const files = req.files as Express.Multer.File[];

      // const uploadPromises = files.map((file: Express.Multer.File) => {
      //   return s3FileUpload({
      //     fileName: `userProfileImg/${file.originalname}`,
      //     fileData: file.buffer,
      //   });
      // });

      // const [{ Key: key }] = await Promise.all(uploadPromises);

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

export interface GetMyProfileImgRequestType {}
export interface GetMyProfileImgSuccessResType {
  signedUrl: string;
}

export type GetMyProfileImgResType = Omit<IBResFormat, 'IBparams'> & {
  IBparams: GetMyProfileImgSuccessResType[] | {};
};

export const getMyProfileImg = asyncWrapper(
  async (
    req: Express.IBTypedReqBody<GetMyProfileImgRequestType>,
    res: Express.IBTypedResponse<GetMyProfileImgResType>,
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

      if (!userTokenId) {
        throw new IBError({
          type: 'NOTEXISTDATA',
          message: '정상적으로 부여된 userTokenId를 가지고 있지 않습니다.',
        });
      }

      // const { key } = req.body;

      // const signedUrl = await getS3SignedUrl(`${key}`);
      const user = await prisma.user.findUnique({
        where: {
          id: memberId,
        },
        select: {
          profileImg: true,
        },
      });

      if (!user) {
        throw new IBError({
          type: 'NOTEXISTDATA',
          message: '존재하지 않는 계정입니다.',
        });
      }

      res.json({
        ...ibDefs.SUCCESS,
        IBparams: {
          profileImg: await (() => {
            if (user.profileImg && !isEmpty(user.profileImg)) {
              return user.profileImg.includes('http')
                ? user.profileImg
                : getS3SignedUrl(user.profileImg);
            }
            return null;
          })(),
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

export type GetMyAccountInfoRequestType = {};
export interface GetMyAccountInfoSuccessResType
  extends Omit<
    User & {
      tripCreator: {
        id: number;
        nickName: string;
      }[];
      adPlace: {
        id: number;
        status: AdPlaceStatus;
        title: string;
        subscribe: boolean;
      };
    },
    'password'
  > {}

export type GetMyAccountInfoResType = Omit<IBResFormat, 'IBparams'> & {
  IBparams: GetMyAccountInfoSuccessResType | {};
};

export const getMyAccountInfo = asyncWrapper(
  async (
    req: Express.IBTypedReqBody<GetMyAccountInfoRequestType>,
    res: Express.IBTypedResponse<GetMyAccountInfoResType>,
  ) => {
    try {
      const { locals } = req;
      const { memberId, userTokenId } = (() => {
        if (locals && locals?.grade === 'member')
          return {
            memberId: locals.user?.id,
            userTokenId: locals.user?.userTokenId,
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

      const user = await prisma.user.findUnique({
        where: {
          id: memberId,
        },
        include: {
          tripCreator: {
            select: {
              id: true,
              nickName: true,
            },
          },
          adPlace: {
            select: {
              id: true,
              status: true,
              title: true,
              subscribe: true,
            },
          },
        },
      });

      if (!user) {
        throw new IBError({
          type: 'NOTEXISTDATA',
          message: '존재하지 않는 계정입니다.',
        });
      }

      res.json({
        ...ibDefs.SUCCESS,
        IBparams: {
          ...omit(user, ['password']),
          ...(user.profileImg &&
            !isEmpty(user.profileImg) && {
              profileImg: user.profileImg.includes('http')
                ? user.profileImg
                : await getS3SignedUrl(user.profileImg),
            }),
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

export type SetTravelTypeToUserRequestType = {
  season?: string;
  dest?: string;
  trip?: string;
  activity?: string;
  companion?: string;
};
export interface SetTravelTypeToUserSuccessResType extends FavoriteTravelType {}

export type SetTravelTypeToUserResType = Omit<IBResFormat, 'IBparams'> & {
  IBparams: SetTravelTypeToUserSuccessResType | {};
};

export const setTravelTypeToUser = asyncWrapper(
  async (
    req: Express.IBTypedReqBody<SetTravelTypeToUserRequestType>,
    res: Express.IBTypedResponse<SetTravelTypeToUserResType>,
  ) => {
    try {
      const { season, dest, trip, activity, companion } = req.body;
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

      const user = await prisma.user.findUnique({
        where: {
          userTokenId,
        },
        include: {
          FavoriteTravelType: true,
        },
      });

      if (!user) {
        throw new IBError({
          type: 'NOTEXISTDATA',
          message: '존재하지 않는 계정입니다.',
        });
      }

      const trimSeason = season
        ? season
            .split(',')
            .map(v => v.trim())
            .toString()
        : undefined;
      const trimDest = dest
        ? dest
            .split(',')
            .map(v => v.trim())
            .toString()
        : undefined;
      const trimTrip = trip
        ? trip
            .split(',')
            .map(v => v.trim())
            .toString()
        : undefined;
      const trimActivity = activity
        ? activity
            .split(',')
            .map(v => v.trim())
            .toString()
        : undefined;
      const trimCompanion = companion
        ? companion
            .split(',')
            .map(v => v.trim())
            .toString()
        : undefined;

      const updatedUser = await prisma.user.update({
        where: {
          id: user.id,
        },
        data: {
          FavoriteTravelType: {
            upsert: {
              update: {
                season: trimSeason,
                dest: trimDest,
                trip: trimTrip,
                activity: trimActivity,
                companion: trimCompanion,
              },
              create: {
                season: trimSeason,
                dest: trimDest,
                trip: trimTrip,
                activity: trimActivity,
                companion: trimCompanion,
              },
            },
          },
        },
        include: {
          FavoriteTravelType: true,
        },
      });

      res.json({
        ...ibDefs.SUCCESS,
        IBparams: updatedUser.FavoriteTravelType!,
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

export type GetRandomMainImgRequestType = {
  type: string;
};
export interface GetRandomMainImgSuccessResType extends FavoriteTravelType {}

export type GetRandomMainImgResType = Omit<IBResFormat, 'IBparams'> & {
  IBparams: GetRandomMainImgSuccessResType | {};
};

export const getRandomMainImg = asyncWrapper(
  async (
    req: Express.IBTypedReqQuery<GetRandomMainImgRequestType>,
    res: Express.IBTypedResponse<GetRandomMainImgResType>,
  ) => {
    try {
      const { type } = req.query;
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

      if (isNil(type) || isEmpty(type)) {
        throw new IBError({
          type: 'INVALIDPARAMS',
          message: 'type은 제공되어야 하는 파라미터입니다.',
        });
      }

      // const user = await prisma.user.findUnique({
      //   where: {
      //     userTokenId,
      //   },
      //   include: {
      //     FavoriteTravelType: true,
      //   },
      // });

      // if (!user) {
      //   throw new IBError({
      //     type: 'NOTEXISTDATA',
      //     message: '존재하지 않는 계정입니다.',
      //   });
      // }

      const a = Prisma.sql`select mbgi.key, url from MainBackgroundImg mbgi where mbgi.type = ${type} order by RAND() limit 1;`;
      console.log(a);
      const randomMainImg = await prisma.$queryRaw<
        Promise<{ key: string; url: string }[]>
      >(a);
      console.log(randomMainImg);

      const retImgs = await Promise.all(
        randomMainImg.map(async mainImg => {
          const img =
            !isNil(mainImg.url) && mainImg.url.includes('http')
              ? mainImg.url
              : await getS3SignedUrl(mainImg.key);

          return img;
        }),
      );

      res.json({
        ...ibDefs.SUCCESS,
        IBparams: {
          imgUrl: retImgs,
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
settingRouter.post('/getMyProfileImg', accessTokenValidCheck, getMyProfileImg);
settingRouter.post(
  '/getMyAccountInfo',
  accessTokenValidCheck,
  getMyAccountInfo,
);
settingRouter.post(
  '/setTravelTypeToUser',
  accessTokenValidCheck,
  setTravelTypeToUser,
);
settingRouter.get('/getRandomMainImg', accessTokenValidCheck, getRandomMainImg);

export default settingRouter;
