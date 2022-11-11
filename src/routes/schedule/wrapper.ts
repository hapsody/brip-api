/* eslint-disable @typescript-eslint/naming-convention */

import express from 'express';
import { ibDefs, asyncWrapper, IBError } from '@src/utils';
import {
  GetHotelDataFromBKCREQParam,
  GetHotelDataFromBKCRETParam,
  GetPlaceByGglTxtSrchREQParam,
  GetPlaceByGglTxtSrchRETParam,
  GetPlaceByGglNrbyREQParam,
  GetPlaceByGglNrbyRETParam,
} from './types/schduleTypes';

import {
  getHotelDataFromBKC,
  getPlaceByTxtSrch,
  getPlaceByGglNrby,
} from './inner';

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
    try {
      const param = req.body;

      const hotelData = await getHotelDataFromBKC(param);

      res.json({
        ...ibDefs.SUCCESS,
        IBparams: hotelData,
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

/**
 * 구글 getPlaceByTxtSrch 수행 요청하는 api endpoint 함수
 * (구) textSearch
 */
export const getPlaceByGglTxtSrchWrapper = asyncWrapper(
  async (
    req: Express.IBTypedReqBody<GetPlaceByGglTxtSrchREQParam>,
    res: Express.IBTypedResponse<GetPlaceByGglTxtSrchRETParam>,
  ) => {
    try {
      const param = req.body;
      const placeResult = await getPlaceByTxtSrch(param);
      res.json({
        ...ibDefs.SUCCESS,
        IBparams: placeResult,
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

/**
 * 구글 getPlaceDataFromGGL을 수행 요청하는 api endpoint 함수
 * (구) nearbySearch
 */
export const getPlaceByGglNrbyWrapper = asyncWrapper(
  async (
    req: Express.IBTypedReqBody<GetPlaceByGglNrbyREQParam>,
    res: Express.IBTypedResponse<GetPlaceByGglNrbyRETParam>,
  ) => {
    try {
      const param = req.body;
      const placeResult = await getPlaceByGglNrby(param);
      res.json({
        ...ibDefs.SUCCESS,
        IBparams: placeResult,
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

export default scheduleRouter;
