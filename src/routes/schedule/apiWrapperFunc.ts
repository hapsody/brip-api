/* eslint-disable @typescript-eslint/naming-convention */

import express from 'express';
// import prisma from '@src/prisma';
import {
  ibDefs,
  asyncWrapper,
  // IBResFormat,
  // IBError,
  // getNDaysLater,
  // accessTokenValidCheck,
} from '@src/utils';
import {
  GetHotelDataFromBKCREQParam,
  GetHotelDataFromBKCRETParam,
} from './types/schduleTypes';

import { getHotelDataFromBKC } from './internalHotelFunc';

const scheduleRouter: express.Application = express();

/**
 * GetHotelDataFromBKCREQParam 조건에 맞춰 booking.com api로 호텔을 검색한다.
 * (구) /searchHotel api 대체
 */
export const getHotelDataFromBKCWrapper = asyncWrapper(
  async (
    req: Express.IBTypedReqBody<GetHotelDataFromBKCREQParam>,
    res: Express.IBTypedResponse<GetHotelDataFromBKCRETParam>,
  ) => {
    const reqParam = req.body;

    const hotelData = await getHotelDataFromBKC(reqParam);
    res.json({
      ...ibDefs.SUCCESS,
      IBparams: hotelData,
    });
  },
);

scheduleRouter.post('/searchHotel', getHotelDataFromBKCWrapper);

export default scheduleRouter;
