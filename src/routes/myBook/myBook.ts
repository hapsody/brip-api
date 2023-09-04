import express from 'express';
import prisma from '@src/prisma';
import { BookingInfo, AdPlace, BookingInfoStatus } from '@prisma/client';
import {
  ibDefs,
  asyncWrapper,
  IBResFormat,
  IBError,
  accessTokenValidCheck,
  // getS3SignedUrl,
  getUserProfileUrl,
} from '@src/utils';
import { isNil, isEmpty, isNaN } from 'lodash';

const myBookRouter: express.Application = express();

export type GetMyBookingInfoRequestType = {
  role: 'company' | 'customer';
};
export type GetMyBookingInfoSuccessResType = BookingInfo &
  {
    customer?: {
      id: number;
      nickName: string;
      profileImg: string;
    };
    company?: {
      id: number;
      nickName: string;
      profileImg: string;
    };
    adPlace: AdPlace;
  }[];
export type GetMyBookingInfoResType = Omit<IBResFormat, 'IBparams'> & {
  IBparams: GetMyBookingInfoSuccessResType[] | {};
};

/**
 * header에 accessToken으로 제공된 유저의 예약현황을 리턴한다.
 * https://www.figma.com/file/Tdpp5Q2J3h19NyvBvZMM2m/brip?type=design&node-id=3537-2871&mode=design&t=P6O07fc7qI2f60jh-0
 */
export const getMyBookingInfo = asyncWrapper(
  async (
    req: Express.IBTypedReqQuery<GetMyBookingInfoRequestType>,
    res: Express.IBTypedResponse<GetMyBookingInfoResType>,
  ) => {
    try {
      const { locals } = req;
      const userId = (() => {
        if (locals && locals?.grade === 'member') return locals?.user?.id;
        // return locals?.tokenId;
        throw new IBError({
          type: 'NOTAUTHORIZED',
          message: 'member 등급만 접근 가능합니다.',
        });
      })();
      if (!userId) {
        throw new IBError({
          type: 'NOTEXISTDATA',
          message: '정상적으로 부여된 userTokenId를 가지고 있지 않습니다.',
        });
      }

      const { role } = req.query;
      if (isNil(role) || isEmpty(role)) {
        throw new IBError({
          type: 'INVALIDPARAMS',
          message: 'role 파라미터가(company | customer) 제공되어야 합니다.',
        });
      }

      /// redis의 bookingInfo:${key} hash 데이터는 가장 최근에 문의가 진행중인 bookingInfo 값 만을 저장하고 있기 때문에
      /// DB를 뒤져야 과거 성사된 문의 히스토리를 볼수 있다.
      const myBookingInfo = await prisma.bookingInfo.findMany({
        where: {
          ...(role === 'customer' && {
            customerId: userId,
          }),
          ...(role === 'company' && {
            companyId: userId,
          }),
        },
        include: {
          customer: {
            select: {
              id: true,
              nickName: true,
              profileImg: true,
            },
          },

          company: {
            select: {
              id: true,
              nickName: true,
              profileImg: true,
            },
          },

          adPlace: true,
        },
      });

      res.json({
        ...ibDefs.SUCCESS,
        IBparams: await Promise.all(
          myBookingInfo.map(async v => {
            return {
              ...v,
              customer: {
                ...v.customer,
                profileImg: await getUserProfileUrl(v.customer),
              },
              company: {
                ...v.company,
                profileImg: await getUserProfileUrl(v.company),
              },
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
        if (err.type === 'NOTEXISTDATA') {
          console.error(err);
          res.status(404).json({
            ...ibDefs.NOTEXISTDATA,
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

export type ChangeBookingInfoStatusRequestType = {
  role: 'company' | 'customer';
  bookingInfoStatus: BookingInfoStatus;
  bookingInfoId: string;
};
export type ChangeBookingInfoStatusSuccessResType = BookingInfo;
export type ChangeBookingInfoStatusResType = Omit<IBResFormat, 'IBparams'> & {
  IBparams: ChangeBookingInfoStatusSuccessResType[] | {};
};

/**
 * BookingInfoStatus 를 수정함
 * https://www.figma.com/file/Tdpp5Q2J3h19NyvBvZMM2m/brip?type=design&node-id=5732-1968&mode=design&t=nrkIGB9SSxifdtJ0-4
 */
export const changeBookingInfoStatus = asyncWrapper(
  async (
    req: Express.IBTypedReqBody<ChangeBookingInfoStatusRequestType>,
    res: Express.IBTypedResponse<ChangeBookingInfoStatusResType>,
  ) => {
    try {
      const { locals } = req;
      const userId = (() => {
        if (locals && locals?.grade === 'member') return locals?.user?.id;
        // return locals?.tokenId;
        throw new IBError({
          type: 'NOTAUTHORIZED',
          message: 'member 등급만 접근 가능합니다.',
        });
      })();
      if (!userId) {
        throw new IBError({
          type: 'NOTEXISTDATA',
          message: '정상적으로 부여된 userTokenId를 가지고 있지 않습니다.',
        });
      }

      const { role, bookingInfoStatus, bookingInfoId } = req.body;
      if (isNil(role) || isEmpty(role)) {
        throw new IBError({
          type: 'INVALIDPARAMS',
          message: 'role 파라미터가(company | customer) 제공되어야 합니다.',
        });
      }

      if (isNil(bookingInfoStatus) || isEmpty(bookingInfoStatus)) {
        throw new IBError({
          type: 'INVALIDPARAMS',
          message: 'bookingInfoStatus 파라미터가 제공되어야 합니다.',
        });
      }

      if (
        isNil(bookingInfoId) ||
        isEmpty(bookingInfoId) ||
        isNaN(Number(bookingInfoId))
      ) {
        throw new IBError({
          type: 'INVALIDPARAMS',
          message: 'bookingInfoId 파라미터가 제공되어야 합니다.',
        });
      }

      const bookingInfo = await prisma.bookingInfo.findUnique({
        where: {
          id: Number(bookingInfoId),
        },
      });

      if (isNil(bookingInfo)) {
        throw new IBError({
          type: 'NOTEXISTDATA',
          message: '존재하지 않는 bookingInfoId입니다.',
        });
      }

      if (
        (role === 'customer' && bookingInfo.customerId !== userId) ||
        (role === 'company' && bookingInfo.companyId !== userId)
      ) {
        throw new IBError({
          type: 'NOTAUTHORIZED',
          message: '해당 bookingInfoStatus를 변경할 권한이 없습니다.',
        });
      }

      if (role === 'customer') {
        if (
          bookingInfoStatus === 'COMPANYCANCEL' ||
          bookingInfoStatus === 'NOSHOW' ||
          bookingInfoStatus === 'VISITED'
        )
          throw new IBError({
            type: 'INVALIDSTATUS',
            message:
              'customer role이 변경할수 없는 status로 변경을 시도하였습니다.',
          });
      }

      if (role === 'company') {
        if (bookingInfoStatus === 'CUSTOMERCANCEL') {
          throw new IBError({
            type: 'INVALIDSTATUS',
            message:
              'company role이 변경할수 없는 status로 변경을 시도하였습니다.',
          });
        }
      }

      const updateResult = await prisma.bookingInfo.update({
        where: {
          id: Number(bookingInfoId),
        },
        data: {
          status: bookingInfoStatus,
        },
      });

      res.json({
        ...ibDefs.SUCCESS,
        IBparams: updateResult,
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
        if (err.type === 'NOTEXISTDATA') {
          console.error(err);
          res.status(404).json({
            ...ibDefs.NOTEXISTDATA,
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
        if (err.type === 'INVALIDSTATUS') {
          console.error(err);
          res.status(400).json({
            ...ibDefs.INVALIDSTATUS,
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
myBookRouter.get('/getMyBookingInfo', accessTokenValidCheck, getMyBookingInfo);
myBookRouter.post(
  '/changeBookingInfoStatus',
  accessTokenValidCheck,
  changeBookingInfoStatus,
);
export default myBookRouter;
