/* eslint-disable @typescript-eslint/naming-convention */

import express from 'express';
import { isNil } from 'lodash';
import { ibDefs, asyncWrapper, IBError, IBContext } from '@src/utils';
import {
  GetHotelDataFromBKCREQParam,
  GetHotelDataFromBKCRETParam,
  GetPlaceByGglTxtSrchREQParam,
  GetPlaceByGglTxtSrchRETParam,
  GetPlaceByGglNrbyREQParam,
  GetPlaceByGglNrbyRETParam,
  GetScheduleREQParam,
  GetScheduleRETParam,
  GetScheduleListREQParam,
  GetScheduleListRETParam,
  SaveScheduleREQParam,
  SaveScheduleRETParam,
  GetDayScheduleREQParam,
  GetDayScheduleRETParam,
  GetDetailScheduleREQParam,
  GetDetailScheduleRETParam,
  GetCandidateScheduleREQParam,
  GetCandidateScheduleRETParam,
  GetCandDetailSchdREQParam,
  GetCandDetailSchdRETParam,
  ModifyScheduleREQParam,
  ModifyScheduleRETParam,
  MakeScheduleREQParam,
  MakeScheduleRETParam,
  ContextMakeSchedule,
  GetHotelListREQParam,
  GetHotelListRETParam,
  GetScheduleLoadingImgREQParam,
  GetScheduleLoadingImgRETParam,
  GetScheduleCountREQParam,
  GetScheduleCountRETParam,
  FixHotelREQParam,
  FixHotelRETParam,
  RefreshScheduleREQParam,
  RefreshScheduleRETParam,
  GetEstimatedCostREQParam,
  GetEstimatedCostRETParam,
  DelScheduleREQParam,
  DelScheduleRETParam,
  ChangeScheduleTitleREQParam,
  ChangeScheduleTitleRETParam,
} from './types/schduleTypes';

import {
  getHotelDataFromBKC,
  getPlaceByGglTxtSrch,
  getPlaceByGglNrby,
  getSchedule,
  getScheduleList,
  saveSchedule,
  delSchedule,
  changeScheduleTitle,
  getDaySchedule,
  getDetailSchedule,
  getCandidateSchedule,
  getCandDetailSchd,
  modifySchedule,
  makeSchedule,
  getHotelList,
  getScheduleLoadingImg,
  getScheduleCount,
  fixHotel,
  refreshSchedule,
  getEstimatedCost,
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

/**
 * 일정 생성 요청을 하는 함수를 호출하는 api endpoint(변경 스펙)
 *
 */
export const reqScheduleWrapper = asyncWrapper(
  async (
    req: Express.IBTypedReqBody<MakeScheduleREQParam>,
    res: Express.IBTypedResponse<MakeScheduleRETParam>,
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

      const retryLoop = async () => {
        const retryLimit = 5;
        let retry = 0;

        const exclusiveRegion: string[] = [];
        const param = req.body;
        let ctx: ContextMakeSchedule = {};
        while (retry < retryLimit) {
          try {
            ctx = {
              userTokenId,
              exclusiveRegion, /// destination이 recommend일 경우 추천지역 후보지(getRecommendRegion의 randCandRegion 배열항목중) 중에 배제하고 싶은 리스트가 있다면 해당 파라미터로 보낸다. 클라이언트가 사용하는 파라미터는 아니고 서버 시스템 내부적으로 makeSchedule 반복 호출시에 사용
            };
            // eslint-disable-next-line no-await-in-loop
            const result = await makeSchedule(
              {
                ...param,
                familyOpt: param.familyOpt ?? [],
                minFriend: param.minFriend ?? '0',
                maxFriend: param.maxFriend ?? '0',
              },
              ctx,
            );
            return result;
          } catch (err) {
            /// 지역 추천을 선택한 경우에만 재시도
            if (
              param.destination !== 'recommend' ||
              !(err instanceof IBError) ||
              err.type !== 'NOTEXISTDATA'
            ) {
              throw err;
            }

            if (
              !err.message.includes(
                '조건에 맞고 여행일수에 필요한만큼 충분한 수의 관광 spot이 없습니다.',
              ) &&
              !err.message.includes(
                '충분한 수의 여행지 클러스터가 형성되지 못하였습니다.',
              ) &&
              !err.message.includes(
                '충분한 수의 식당 클러스터가 형성되지 못하였습니다.',
              ) &&
              !err.message.includes(
                '더이상 채워넣을 식당이 존재하지 않습니다.',
              ) &&
              !err.message.includes(
                '더이상 채워넣을 방문지가 존재하지 않습니다.',
              )
            ) {
              throw err;
            }

            retry += 1;
            if (!isNil(ctx.recommendedRegion)) {
              exclusiveRegion.push(ctx.recommendedRegion);
            }
            console.log(err);
            console.log(`retry\nretry\nretry\nretry ${retry}`);
            console.log(
              `exclusiveRegion: [${ctx.exclusiveRegion?.toString() ?? ''}]`,
            );
          }
        }
        throw new IBError({
          type: 'INVALIDSTATUS',
          message: `재시도 횟수(${retryLimit})를 초과하였습니다.`,
        });
      };

      const scheduleResult = await retryLoop();

      res.json({
        ...ibDefs.SUCCESS,
        IBparams: {
          queryParamsId: scheduleResult.queryParamsId,
          recommendedRegion: scheduleResult.recommendedRegion,
          plan: scheduleResult.visitSchedules,
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

/**
 * 일정삭제 버튼을 누르면 호출할 api
 * queryParamsId와 관계된 일체가 삭제된다. (visitSchedule, scheduleBank, metaScheduleInfo, validCluster) tourPlace는 삭제 안됨
 */
export const delScheduleWrapper = asyncWrapper(
  async (
    req: Express.IBTypedReqBody<DelScheduleREQParam>,
    res: Express.IBTypedResponse<DelScheduleRETParam>,
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
      await delSchedule(param, ctx);
      res.json({
        ...ibDefs.SUCCESS,
        IBparams: {},
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

/**
 * 생성된 스케쥴 이름 변경
 */
export const changeScheduleTitleWrapper = asyncWrapper(
  async (
    req: Express.IBTypedReqBody<ChangeScheduleTitleREQParam>,
    res: Express.IBTypedResponse<ChangeScheduleTitleRETParam>,
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
      const uRes = await changeScheduleTitle(param, ctx);
      res.json({
        ...ibDefs.SUCCESS,
        IBparams: uRes,
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

/**
 * 생성된 스케쥴의 하루 일정 요청인 getDaySchedule 호출을 요청하는 wrapper 함수
 * 스케쥴에서 지정된 날짜의 데일리 계획을 조회 요청한다.
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

/**
 *
 */
export const modifyScheduleWrapper = asyncWrapper(
  async (
    req: Express.IBTypedReqBody<ModifyScheduleREQParam>,
    res: Express.IBTypedResponse<ModifyScheduleRETParam>,
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

      const scheduleResult = await modifySchedule(param);
      res.json({
        ...ibDefs.SUCCESS,
        IBparams: scheduleResult ?? {},
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

/**
 * makeSchedule로 인한 클러스터 형성 후
 * 관련 호텔 데이터를 반환하는 api
 *
 */
export const getHotelListWrapper = asyncWrapper(
  async (
    req: Express.IBTypedReqBody<GetHotelListREQParam>,
    res: Express.IBTypedResponse<GetHotelListRETParam>,
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
      const hotelSrchRes = await getHotelList(param);
      res.json({
        ...ibDefs.SUCCESS,
        IBparams: hotelSrchRes,
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

/**
 * makeSchedule로 인한 클러스터 형성 후
 * 일정반환까지 띄워줄 로딩화면 창 img 반환
 *
 */
export const getScheduleLoadingImgWrapper = asyncWrapper(
  async (
    req: Express.IBTypedReqBody<GetScheduleLoadingImgREQParam>,
    res: Express.IBTypedResponse<GetScheduleLoadingImgRETParam>,
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

      const imgs = await getScheduleLoadingImg();
      res.json({
        ...ibDefs.SUCCESS,
        IBparams: imgs,
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

/**
 * 생성된 일정중 요청하는 유저의 tokenId로 생성된 Schedule 리스트를 반환하는 api
 *
 */
export const getScheduleCountWrapper = asyncWrapper(
  async (
    req: Express.IBTypedReqBody<GetScheduleCountREQParam>,
    res: Express.IBTypedResponse<GetScheduleCountRETParam>,
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

      const ctx: IBContext = {
        userTokenId,
      };
      const scheduleCount = await getScheduleCount(ctx);
      res.json({
        ...ibDefs.SUCCESS,
        IBparams: scheduleCount,
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

/**
 * 생성된 일정기반 일자별 유저 호텔 선택 결과를 서버에 알리는 api
 *
 */
export const fixHotelWrapper = asyncWrapper(
  async (
    req: Express.IBTypedReqBody<FixHotelREQParam>,
    res: Express.IBTypedResponse<FixHotelRETParam>,
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

      const updateList = await fixHotel(param);
      res.json({
        ...ibDefs.SUCCESS,
        IBparams: updateList,
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

/**
 * 기본 생성된 일정들중 특정 일자의 추천 리스트를 새로고침 요청하는 api
 * fixedList에 전달되는 각 VisitSchedule 들은 그대로 리턴되고
 * 나머지는 기존 검색되었던 장소 또는 음식점들중에 다른것으로 교체(DB에도 그대로 적용된 후 ) 반환된다.
 *
 * "남은일정 새로고침" 클릭시에 요청됨
 * https://www.figma.com/file/Tdpp5Q2J3h19NyvBvZMM2m/brip?node-id=407:2587&t=dh22WyIeTTDtUTxg-4
 */
export const refreshScheduleWrapper = asyncWrapper(
  async (
    req: Express.IBTypedReqBody<RefreshScheduleREQParam>,
    res: Express.IBTypedResponse<RefreshScheduleRETParam>,
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

      const scheduleResult = await refreshSchedule(param);
      res.json({
        ...ibDefs.SUCCESS,
        IBparams: scheduleResult,
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

/**
 * fixHotel api를 통해 호텔들이 선택되면 MetaScheduleInfo에 저장된  산출된 비용을 반환함
 */
export const getEstimatedCostWrapper = asyncWrapper(
  async (
    req: Express.IBTypedReqBody<GetEstimatedCostREQParam>,
    res: Express.IBTypedResponse<GetEstimatedCostRETParam>,
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

      const result = await getEstimatedCost(param);
      res.json({
        ...ibDefs.SUCCESS,
        IBparams: result,
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

export default scheduleRouter;
