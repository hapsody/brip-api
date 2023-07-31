import express from 'express';
import prisma from '@src/prisma';
import { TripCreator, AdPlace } from '@prisma/client';
import {
  ibDefs,
  asyncWrapper,
  IBResFormat,
  IBError,
  accessTokenValidCheck,
  getUserProfileUrl,
} from '@src/utils';
import { isNil, isEmpty } from 'lodash';

const myBookRouter: express.Application = express();

export type GetUserRequestType = {
  userId: string;
};
export type GetUserSuccessResType = {
  id: number;
  nickName: string;
  profileImg: string;
  tripCreator: TripCreator[];
  adPlace: AdPlace[];
}[];
export type GetUserResType = Omit<IBResFormat, 'IBparams'> & {
  IBparams: GetUserSuccessResType | {};
};

/**
 * 요청하는 userId에 해당하는 유저의 공개정보들을 리턴한다.
 *
 */
export const getUser = asyncWrapper(
  async (
    req: Express.IBTypedReqQuery<GetUserRequestType>,
    res: Express.IBTypedResponse<GetUserResType>,
  ) => {
    try {
      const { locals } = req;
      const userId = (() => {
        if (locals && locals?.grade === 'member') return locals?.user?.id;
        return locals?.tokenId;
        // throw new IBError({
        //   type: 'NOTAUTHORIZED',
        //   message: 'member 등급만 접근 가능합니다.',
        // });
      })();
      if (!userId) {
        throw new IBError({
          type: 'NOTEXISTDATA',
          message: '정상적으로 부여된 userTokenId를 가지고 있지 않습니다.',
        });
      }

      const { userId: targetUserId } = req.query;
      if (isNil(targetUserId) || isEmpty(targetUserId)) {
        throw new IBError({
          type: 'INVALIDPARAMS',
          message: '요청하려는 대상 userId가 제공되어야 합니다.',
        });
      }

      const userInfo = await prisma.user.findUnique({
        where: {
          id: Number(targetUserId),
        },
        select: {
          id: true,
          nickName: true,
          profileImg: true,
          tripCreator: true,
          adPlace: true,
        },
      });

      res.json({
        ...ibDefs.SUCCESS,
        IBparams: {
          ...userInfo,
          profileImg: await getUserProfileUrl(userInfo),
          // ...(!isNull(userInfo) &&
          //   !isNull(userInfo.profileImg) && {
          //     profileImg: userInfo.profileImg!.includes('http')
          //       ? userInfo.profileImg
          //       : await getS3SignedUrl(userInfo.profileImg!),
          //   }),
        },
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
      }

      throw err;
    }
  },
);
myBookRouter.get('/getUser', accessTokenValidCheck, getUser);
export default myBookRouter;
