/* eslint-disable @typescript-eslint/naming-convention */

import express from 'express';
import { ibDefs, asyncWrapper, IBError } from '@src/utils';
import { isUndefined } from 'lodash';
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
  // FavoriteTravelType,
  VisitSchedule,
} from './types/schduleTypes';

import {
  getHotelDataFromBKC,
  getPlaceByGglTxtSrch,
  getPlaceByGglNrby,
  childInfantToChildrenAges,
  // arrTravelTypeToObj,
  getRcmdList,
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

      const param = req.body;
      const {
        startDate,
        endDate,
        adult,
        child,
        infant,
        // favoriteTravelType,
        // favoriteAccommodation,
        // favoriteAccommodationLocation,
      } = param;

      // const scheduleHash = uuidv4();

      // const travelType: FavoriteTravelType =
      //   arrTravelTypeToObj(favoriteTravelType);
      // const accommodationType: FavoriteAccommodationLocation =
      //   arrAccommodationTypeToObj(favoriteAccommodation);
      // const accommodationLocationType: FavoriteAccommodationLocation =
      //   arrAccommodationLocationToObj(favoriteAccommodationLocation);

      const childrenAges = childInfantToChildrenAges({
        child: Number(child),
        infant: Number(infant),
      });

      const schd = await getRcmdList<BKCSrchByCoordReqOpt>({
        ...param,
        hotelTransition: 1,
        hotelSrchOpt: {
          orderBy: 'review_score',
          adultsNumber: adult ? Number(adult) : 2,
          roomNumber: 1,
          checkinDate: startDate,
          checkoutDate: endDate,
          latitude: '33.389464',
          longitude: '126.554401',
          pageNumber: 0,
          includeAdjacency: true,
          childrenAges,
          childrenNumber:
            (infant ? Number(infant) : 0) + (child ? Number(child) : 0),
        },
        store: true,
      });

      const minSchds = schd.visitSchedules.filter(v => v.planType === 'MIN');
      const midSchds = schd.visitSchedules.filter(v => v.planType === 'MID');
      const maxSchds = schd.visitSchedules.filter(v => v.planType === 'MAX');

      type RetType = {
        dayNo: string;
        titleList: {
          visitScheduleId: string;
          orderNo: string;
          title: string;
        }[];
      };
      const getRcmdListTypeToRetType = (
        acc: RetType[],
        cur: Partial<VisitSchedule>,
      ) => {
        if (cur && !isUndefined(cur.dayNo) && !isUndefined(cur.orderNo)) {
          const alreadyDayExist = acc.find(
            v =>
              v.dayNo ===
              (cur.dayNo === undefined ? 'error' : (cur.dayNo + 1).toString()),
          );
          if (!alreadyDayExist) {
            acc.push({
              dayNo: (cur.dayNo + 1).toString(),
              titleList: [
                {
                  visitScheduleId: cur.data?.id?.toString() ?? 'none',
                  orderNo: '0',
                  title: (() => {
                    if (cur.data?.tourPlaceType === 'BKC_HOTEL')
                      return cur.data.bkc_hotel_name ?? '';
                    if (cur.data?.tourPlaceType?.includes('GL_'))
                      return cur.data.gl_name ?? '';
                    if (cur.data?.tourPlaceType?.includes('VJ_'))
                      return cur.data.vj_title ?? '';
                    return 'none';
                  })(),
                },
              ],
            });
            return acc;
          }

          const alreadyOrderExist = alreadyDayExist.titleList.find(
            v => v.orderNo === cur.orderNo?.toString(),
          );

          if (!alreadyOrderExist) {
            alreadyDayExist.titleList.push({
              visitScheduleId: cur.data?.id?.toString() ?? 'none',
              orderNo: cur.orderNo.toString(),
              title: (() => {
                if (cur.data?.tourPlaceType === 'BKC_HOTEL')
                  return cur.data.bkc_hotel_name ?? '';
                if (cur.data?.tourPlaceType?.includes('GL_'))
                  return cur.data.gl_name ?? '';
                if (cur.data?.tourPlaceType?.includes('VJ_'))
                  return cur.data.vj_title ?? '';
                return 'none';
              })(),
            });
            const last = acc.pop();
            if (!isUndefined(last)) {
              return [
                ...acc,
                {
                  ...last,
                  titleList: alreadyDayExist.titleList,
                },
              ];
            }
          }
        }
        return acc;
      };
      const minRetValue = minSchds.reduce(
        getRcmdListTypeToRetType,
        [] as RetType[],
      );
      const midRetValue = midSchds.reduce(
        getRcmdListTypeToRetType,
        [] as RetType[],
      );
      const maxRetValue = maxSchds.reduce(
        getRcmdListTypeToRetType,
        [] as RetType[],
      );

      res.json({
        ...ibDefs.SUCCESS,
        IBparams: {
          queryParamsId: schd.id,
          plan: [
            { planType: 'MIN', day: minRetValue },
            { planType: 'MID', day: midRetValue },
            { planType: 'MAX', day: maxRetValue },
          ],
        },
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
