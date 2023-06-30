import express from 'express';
import prisma from '@src/prisma';
import { AdPlace, IBPhotos, IBTravelTag } from '@prisma/client';
import {
  ibDefs,
  asyncWrapper,
  IBResFormat,
  IBError,
  accessTokenValidCheck,
} from '@src/utils';
import { isNil, isEmpty, omit, isNaN } from 'lodash';

const adPlaceRouter: express.Application = express();

export type GetAdPlaceRequestType = {
  adPlaceId?: string;
  userId?: string;
};
export type GetAdPlaceSuccessResType = Omit<
  AdPlace & {
    photos: IBPhotos[];
    category: IBTravelTag[];
  },
  'userId'
>;
export type GetAdPlaceResType = Omit<IBResFormat, 'IBparams'> & {
  IBparams: GetAdPlaceSuccessResType[] | {};
};

/**
 * AdPlace 정보를 요청한다.
 * https://www.figma.com/file/Tdpp5Q2J3h19NyvBvZMM2m/brip?type=design&node-id=3537-2711&mode=design&t=VGgF11HCARwsYAQr-4
 */
export const getAdPlace = asyncWrapper(
  async (
    req: Express.IBTypedReqQuery<GetAdPlaceRequestType>,
    res: Express.IBTypedResponse<GetAdPlaceResType>,
  ) => {
    try {
      const { locals } = req;
      const userTokenId = (() => {
        if (locals && locals?.grade === 'member')
          return locals?.user?.userTokenId;
        return locals?.tokenId;
      })();
      if (!userTokenId) {
        throw new IBError({
          type: 'NOTEXISTDATA',
          message: '정상적으로 부여된 userTokenId를 가지고 있지 않습니다.',
        });
      }

      const { adPlaceId, userId } = req.query;

      if (
        (isNil(adPlaceId) || isEmpty(adPlaceId) || isNaN(Number(adPlaceId))) &&
        (isNil(userId) || isEmpty(userId) || isNaN(Number(userId)))
      ) {
        throw new IBError({
          type: 'INVALIDPARAMS',
          message: 'adPlaceId나 userId 두 파라미터중 하나는 제공되어야 합니다.',
        });
      }

      const adPlaces = await prisma.adPlace.findMany({
        where: {
          status: 'IN_USE',
          ...(!isNil(adPlaceId) &&
            !isEmpty(adPlaceId) &&
            !isNaN(Number(adPlaceId)) && {
              id: Number(adPlaceId),
            }),
          ...(!isNil(userId) &&
            !isEmpty(userId) &&
            !isNaN(Number(userId)) && {
              userId: Number(userId),
            }),
        },
        include: {
          photos: true,
          category: true,
        },
      });

      res.json({
        ...ibDefs.SUCCESS,
        IBparams: adPlaces.map(v => omit(v, ['userId'])),
      });
    } catch (err) {
      if (err instanceof IBError) {
        if (err.type === 'INVALIDPARAMS') {
          res.status(400).json({
            ...ibDefs.INVALIDPARAMS,
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
adPlaceRouter.get('/getAdPlace', accessTokenValidCheck, getAdPlace);
export default adPlaceRouter;
