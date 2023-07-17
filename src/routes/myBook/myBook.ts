import express from 'express';
import prisma from '@src/prisma';
import { BookingInfo } from '@prisma/client';
import {
  ibDefs,
  asyncWrapper,
  IBResFormat,
  IBError,
  accessTokenValidCheck,
} from '@src/utils';
import { isNil, isEmpty } from 'lodash';

const myBookRouter: express.Application = express();

export type GetMyBookingInfoRequestType = {
  role: 'company' | 'customer';
};
export type GetMyBookingInfoSuccessResType = BookingInfo[];
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

      const myBookingInfo = await prisma.bookingInfo.findMany({
        where: {
          ...(role === 'customer' && {
            customerId: userId,
          }),
          ...(role === 'company' && {
            companyId: userId,
          }),
        },
      });

      res.json({
        ...ibDefs.SUCCESS,
        IBparams: myBookingInfo,
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
myBookRouter.get('/getMyBookingInfo', accessTokenValidCheck, getMyBookingInfo);
export default myBookRouter;
