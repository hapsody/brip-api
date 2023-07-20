import express from 'express';
import prisma from '@src/prisma';
import { BookingInfo, AdPlace } from '@prisma/client';
import {
  ibDefs,
  asyncWrapper,
  IBResFormat,
  IBError,
  accessTokenValidCheck,
  getS3SignedUrl,
} from '@src/utils';
import { isNil, isEmpty, isNull } from 'lodash';

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
          ...(role === 'customer' && {
            customer: {
              select: {
                id: true,
                nickName: true,
                profileImg: true,
              },
            },
          }),
          ...(role === 'company' && {
            company: {
              select: {
                id: true,
                nickName: true,
                profileImg: true,
              },
            },
          }),
          adPlace: true,
        },
      });

      res.json({
        ...ibDefs.SUCCESS,
        IBparams: await Promise.all(
          myBookingInfo.map(async v => {
            const profileImg =
              role === 'customer'
                ? v.customer!.profileImg
                : v.company!.profileImg;

            if (role === 'customer') {
              return {
                ...v,
                customer: {
                  ...v.customer,
                  profileImg:
                    !isNull(profileImg) &&
                    profileImg.toLowerCase().includes('http')
                      ? profileImg
                      : await getS3SignedUrl(profileImg!),
                },
              };
            }

            return {
              ...v,
              company: {
                ...v.company,
                profileImg:
                  !isNull(profileImg) &&
                  profileImg.toLowerCase().includes('http')
                    ? profileImg
                    : await getS3SignedUrl(profileImg!),
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
      }

      throw err;
    }
  },
);
myBookRouter.get('/getMyBookingInfo', accessTokenValidCheck, getMyBookingInfo);
export default myBookRouter;
