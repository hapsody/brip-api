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
  ReqScheduleREQParam,
  ReqScheduleRETParam,
  BKCSrchByCoordReqOpt,
  GetScheduleREQParam,
  GetScheduleRETParam,
  GetScheduleListREQParam,
  GetScheduleListRETParam,
  SaveScheduleREQParam,
  SaveScheduleRETParam,
  IBContext,
  GetDayScheduleREQParam,
  GetDayScheduleRETParam,
  GetDetailScheduleREQParam,
  GetDetailScheduleRETParam,
  GetCandidateScheduleREQParam,
  GetCandidateScheduleRETParam,
  GetCandDetailSchdREQParam,
  GetCandDetailSchdRETParam,
} from './types/schduleTypes';

import {
  getHotelDataFromBKC,
  getPlaceByGglTxtSrch,
  getPlaceByGglNrby,
  reqSchedule,
  getSchedule,
  getScheduleList,
  saveSchedule,
  getDaySchedule,
  getDetailSchedule,
  getCandidateSchedule,
  getCandDetailSchd,
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
 * 구글 getPlaceByGglTxtSrch 수행 요청하는 api endpoint 함수
 * (구) textSearch
 */
export const getPlaceByGglTxtSrchWrapper = asyncWrapper(
  async (
    req: Express.IBTypedReqBody<GetPlaceByGglTxtSrchREQParam>,
    res: Express.IBTypedResponse<GetPlaceByGglTxtSrchRETParam>,
  ) => {
    try {
      const param = req.body;
      const placeResult = await getPlaceByGglTxtSrch(param);
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

/**
 * 일정 생성 요청을 하는 api endpoint
 *
 */
export const reqScheduleWrapper = asyncWrapper(
  async (
    req: Express.IBTypedReqBody<ReqScheduleREQParam<BKCSrchByCoordReqOpt>>,
    res: Express.IBTypedResponse<ReqScheduleRETParam>,
  ) => {
    try {
      // const watchStart = moment();
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

      const ctx: IBContext = {
        userTokenId,
      };
      const param = req.body;
      const scheduleResult = await reqSchedule<BKCSrchByCoordReqOpt>(
        param,
        ctx,
      );
      res.json({
        ...ibDefs.SUCCESS,
        IBparams: scheduleResult,
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
 * 생성된 일정중 queryParams에 해당하는 일정 정보를 반환하는 api
 *
 */
export const getScheduleWrapper = asyncWrapper(
  async (
    req: Express.IBTypedReqBody<GetScheduleREQParam>,
    res: Express.IBTypedResponse<GetScheduleRETParam>,
  ) => {
    try {
      // const watchStart = moment();
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

      const param = req.body;
      const scheduleResult = await getSchedule(param);
      res.json({
        ...ibDefs.SUCCESS,
        IBparams: scheduleResult,
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
 * 생성된 일정중 요청하는 유저의 tokenId로 생성된 Schedule 리스트를 반환하는 api
 *
 */
export const getScheduleListWrapper = asyncWrapper(
  async (
    req: Express.IBTypedReqBody<GetScheduleListREQParam>,
    res: Express.IBTypedResponse<GetScheduleListRETParam>,
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

      const param = req.body;
      const ctx: IBContext = {
        userTokenId,
      };
      const scheduleResult = await getScheduleList(param, ctx);
      res.json({
        ...ibDefs.SUCCESS,
        IBparams: scheduleResult,
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
 * 생성된 일정중 유저가 저장하기를 요청할때 호출하는 api
 *
 */
export const saveScheduleWrapper = asyncWrapper(
  async (
    req: Express.IBTypedReqBody<SaveScheduleREQParam>,
    res: Express.IBTypedResponse<SaveScheduleRETParam>,
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

      const param = req.body;
      const ctx: IBContext = {
        userTokenId,
      };
      const scheduleResult = await saveSchedule(param, ctx);
      res.json({
        ...ibDefs.SUCCESS,
        IBparams: scheduleResult,
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
 * 생성된 일정중 유저가 저장하기를 요청할때 호출하는 api
 *
 */
export const getDayScheduleWrapper = asyncWrapper(
  async (
    req: Express.IBTypedReqBody<GetDayScheduleREQParam>,
    res: Express.IBTypedResponse<GetDayScheduleRETParam>,
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

      const param = req.body;

      const scheduleResult = await getDaySchedule(param);
      res.json({
        ...ibDefs.SUCCESS,
        IBparams: scheduleResult,
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
 * 일정중 지정한 하나의 장소에 대한 상세 조회 요청 함수인 getDetailSchedule을 호출할 wrapper 함수
 *
 */
export const getDetailScheduleWrapper = asyncWrapper(
  async (
    req: Express.IBTypedReqBody<GetDetailScheduleREQParam>,
    res: Express.IBTypedResponse<GetDetailScheduleRETParam>,
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

      const param = req.body;

      const ctx: IBContext = {
        userTokenId,
      };
      const scheduleResult = await getDetailSchedule(param, ctx);

      res.json({
        ...ibDefs.SUCCESS,
        IBparams: scheduleResult ?? {},
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
 * 생성된 스케쥴의 변경 후보 리스트를 요청하는 getCandidateSchedule을 호출하는 wrapper 함수
 *
 */
export const getCandidateScheduleWrapper = asyncWrapper(
  async (
    req: Express.IBTypedReqBody<GetCandidateScheduleREQParam>,
    res: Express.IBTypedResponse<GetCandidateScheduleRETParam>,
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

      const param = req.body;

      const scheduleResult = await getCandidateSchedule(param);
      res.json({
        ...ibDefs.SUCCESS,
        IBparams: scheduleResult,
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
 * 생성된 스케쥴의 변경 후보 리스트중 1개 후보항목의 자세한 정보를 요청하는
 *  getCandDetailSchd을 호출하는 wrapper 함수
 *
 */
export const getCandDetailSchdWrapper = asyncWrapper(
  async (
    req: Express.IBTypedReqBody<GetCandDetailSchdREQParam>,
    res: Express.IBTypedResponse<GetCandDetailSchdRETParam>,
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

      const param = req.body;

      const scheduleResult = await getCandDetailSchd(param);
      res.json({
        ...ibDefs.SUCCESS,
        IBparams: scheduleResult ?? {},
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
