/* eslint-disable @typescript-eslint/naming-convention */
import moment from 'moment';
import prisma from '@src/prisma';
import {
  IBError,
  IBResFormat,
  asyncWrapper,
  ibDefs,
  getNDaysLater,
} from '@src/utils';
import axios, { Method } from 'axios';
import { isNumber, isNil, isEmpty } from 'lodash';
import { getBoundingBox, getDistFromTwoGeoLoc } from '@src/utils/geoLocation';
import {
  AddMockBKCHotelResourceREQParam,
  defaultBKCHotelReqParams,
  GetPlaceDataFromVJREQParam,
  GetPlaceDataFromVJRETParam,
  // BKCSrchByCoordReqOpt,
  // GetRcmdListREQParam,
  // GetRcmdListRETParam,
  MakeScheduleREQParam,
  gParamByTravelLevel,
  MakeScheduleRETParam,
  ContextMakeSchedule,
  gMealPerDay,
} from './types/schduleTypes';

import { getPlaceDataFromVJ, makeSchedule, makeCluster } from './inner';

export const addMockBKCHotelResourceWrapper = asyncWrapper(
  async (
    req: Express.IBTypedReqBody<AddMockBKCHotelResourceREQParam>,
    res: Express.IBTypedResponse<IBResFormat>,
  ) => {
    const {
      orderBy = 'popularity',
      adultsNumber = 2,
      roomNumber = 1,
      // checkinDate = getToday(),
      // checkoutDate = getTomorrow(),
      checkinDate = getNDaysLater(10),
      checkoutDate = getNDaysLater(11),
      filterByCurrency = 'USD',
      latitude: paramLat,
      longitude: paramLngt,
      pageNumber = 0,
      includeAdjacency = true,
      childrenAges,
      childrenNumber,
      categoriesFilterIds,
    } = req.body ?? defaultBKCHotelReqParams;

    if (childrenAges && childrenAges.length > 0 && !isNumber(childrenNumber)) {
      throw new IBError({
        type: 'INVALIDPARAMS',
        message:
          'childrenNumber 파라미터가 제공되지 않았거나 number 타입이 아닙니다.',
      });
    }
    if (
      (isNumber(childrenNumber) && isNil(childrenAges)) ||
      (isNumber(childrenNumber) &&
        childrenAges &&
        childrenAges.length < childrenNumber)
    ) {
      throw new IBError({
        type: 'INVALIDPARAMS',
        message:
          'childrenAges 파라미터가 제공되지 않았거나 childrenAges 배열의 요소의 수가 childrenNumber보다 적습니다.',
      });
    }

    const options = {
      method: 'GET' as Method,
      url: 'https://booking-com.p.rapidapi.com/v1/hotels/search-by-coordinates',
      params: {
        order_by: orderBy ?? 'popularity',
        adults_number: adultsNumber.toString(),
        units: 'metric',
        room_number: roomNumber ? roomNumber.toString() : '1',
        checkin_date: moment(checkinDate).format('YYYY-MM-DD'),
        checkout_date: moment(checkoutDate).format('YYYY-MM-DD'),
        filter_by_currency: filterByCurrency ?? 'USD',
        locale: 'en-us',
        latitude: paramLat.toString(),
        longitude: paramLngt.toString(),
        page_number: pageNumber ? pageNumber.toString() : '0',
        include_adjacency: includeAdjacency.valueOf().toString() ?? 'true',
        ...(isNumber(childrenNumber) &&
          childrenNumber > 0 && {
            children_number: childrenNumber.toString(),
          }),
        ...(childrenAges &&
          !isEmpty(childrenAges) && { children_ages: childrenAges.toString() }),
        ...(categoriesFilterIds &&
          !isEmpty(categoriesFilterIds) && {
            categories_filter_ids: categoriesFilterIds?.toString(),
          }),
        // categories_filter_ids: 'class::2,class::4,free_cancellation::1',
      },
      headers: {
        'X-RapidAPI-Key': (process.env.RAPID_API_KEY as string) ?? '',
        'X-RapidAPI-Host': 'booking-com.p.rapidapi.com',
      },
    };
    const response = await axios.request(options);

    const data = JSON.stringify(response.data);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    await prisma.mockBookingDotComHotelResource.create({
      data: {
        orderBy,
        adultsNumber,
        childrenNumber,
        childrenAges: childrenAges?.toString(),
        roomNumber,
        checkinDate,
        checkoutDate,
        latitude: Number(paramLat),
        longitude: Number(paramLngt),
        pageNumber,
        includeAdjacency,
        categoriesFilterIds: categoriesFilterIds?.toString(),
        responseData: data,
      },
    });

    res.json({
      ...ibDefs.SUCCESS,
      IBparams: response.data as object,
    });
  },
);

/**
 * internal 제주 관광공사 jeju visit 관광 데이터를 요청하여 반환한다.
 */
export const getPlaceDataFromVJWrapper = asyncWrapper(
  async (
    req: Express.IBTypedReqBody<GetPlaceDataFromVJREQParam>,
    res: Express.IBTypedResponse<GetPlaceDataFromVJRETParam>,
  ) => {
    try {
      const param = req.body;
      const jejuRes = await getPlaceDataFromVJ(param);
      // const jejuRes = await getPlaceDataFromVJ(param);

      res.json({
        ...ibDefs.SUCCESS,
        IBparams: jejuRes,
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
 * 테스트용
 * 파라미터로 넘긴 tag에 OR로 해당하는(ibTravelTag) tourPlace를 반환한다.
 */
export const getTourPlaceByTagWrapper = asyncWrapper(
  async (
    req: Express.IBTypedReqBody<{ tags: string[] }>,
    res: Express.IBTypedResponse<IBResFormat>,
  ) => {
    const param = req.body;

    const { tags } = param;
    const result = await prisma.tourPlace.findMany({
      where: {
        ibTravelTag: {
          some: {
            value: { in: tags },
          },
        },
      },
      select: {
        id: true,
        ibTravelTag: {
          where: {
            value: { in: tags },
          },
          select: {
            id: true,
            value: true,
            related: {
              include: {
                to: true,
              },
            },
          },
        },
      },
    });

    res.json({
      ...ibDefs.SUCCESS,
      IBparams: result as object,
    });
  },
);

/**
 * makeSchedule에서 일정 데이터를 고르기위해 뽑힌 spot DB 데이터들 값을 기반으로
 * 군집화(cluster) 및 군집화 과정 데이터를 요청한다.(개발용))
 */
export const makeClusterWrapper = asyncWrapper(
  async (
    req: Express.IBTypedReqBody<
      MakeScheduleREQParam & { runType: 'spot' | 'food' }
    >,
    res: Express.IBTypedResponse<IBResFormat>,
  ) => {
    const {
      // isNow,
      // companion,
      // familyOpt,
      // minFriend,
      // maxFriend,
      period,
      travelType,
      // destination,
      travelHard,
      runType,
    } = req.body;
    const ctx: ContextMakeSchedule = {};

    /// spot  search part
    const calibUserLevel = (() => {
      const uInputTypeLevel = travelType.reduce(
        (acc, cur) => {
          const type = cur.toUpperCase();
          const typeDifficulty = { min: 9999, max: -1 };
          switch (type) {
            case 'REST':
              typeDifficulty.min = 1;
              typeDifficulty.max = 1;
              break;
            case 'HEALING':
              typeDifficulty.min = 1;
              typeDifficulty.max = 4;
              break;
            case 'NATUREEXPERIENCE':
              typeDifficulty.min = 3;
              typeDifficulty.max = 8;
              break;
            case 'LEARNINGEXPERIENCE':
              typeDifficulty.min = 3;
              typeDifficulty.max = 7;
              break;
            case 'SIGHT':
              typeDifficulty.min = 3;
              typeDifficulty.max = 7;
              break;
            case 'MEETING':
              typeDifficulty.min = 2;
              typeDifficulty.max = 6;
              break;
            case 'ACTIVITY':
              typeDifficulty.min = 4;
              typeDifficulty.max = 9;
              break;
            case 'LEARNING':
              typeDifficulty.min = 1;
              typeDifficulty.max = 3;
              break;
            case 'DELICIOUS':
              typeDifficulty.min = 3;
              typeDifficulty.max = 7;
              break;
            case 'EXPLORATION':
              typeDifficulty.min = 5;
              typeDifficulty.max = 10;
              break;
            default:
              break;
          }
          if (acc.min > typeDifficulty.min) acc.min = typeDifficulty.min;
          if (acc.max < typeDifficulty.max) acc.max = typeDifficulty.max;

          return acc;
        },
        { min: 9999, max: -1 },
      );

      return Number(travelHard) <= uInputTypeLevel.max
        ? {
            ...uInputTypeLevel,
            max: Number(travelHard),
          }
        : uInputTypeLevel;
    })();

    const paramByAvgCalibLevel =
      gParamByTravelLevel[
        Math.floor((calibUserLevel.min + calibUserLevel.max) / 2)
      ];
    ctx.spotPerDay = 2 / paramByAvgCalibLevel.actMultiplier;
    ctx.mealPerDay = gMealPerDay;
    // const mealPerDay = gMealPerDay;
    // const numOfADaySchedule = spotPerDay + mealPerDay + 1;

    ctx.numOfWholeTravelSpot = Math.ceil(ctx.spotPerDay * Number(period)); /// 전체 방문해야할 목표 여행지 수

    const spots = await prisma.tourPlace.findMany({
      where: {
        ibTravelTag: {
          some: {
            AND: [
              { minDifficulty: { gte: calibUserLevel.min } },
              { maxDifficulty: { lte: calibUserLevel.max } },
            ],
          },
        },
        status: 'IN_USE',
        tourPlaceType: { in: ['VISITJEJU_SPOT', 'GL_SPOT', 'TOUR4_SPOT'] },
      },
      select: {
        id: true,
        ibTravelTag: {
          select: {
            value: true,
            minDifficulty: true,
            maxDifficulty: true,
          },
        },
        title: true,
        status: true,
        lat: true,
        lng: true,
        address: true,
        roadAddress: true,
        openWeek: true,
        contact: true,
        postcode: true,
        photos: true,
        rating: true,
        desc: true,
      },
      // take: ctx.numOfWholeTravelSpot,
    });

    const foods = await prisma.tourPlace.findMany({
      where: {
        status: 'IN_USE',
        tourPlaceType: { in: ['VISITJEJU_RESTAURANT', 'GL_RESTAURANT'] },
      },
      select: {
        id: true,
        ibTravelTag: {
          select: {
            value: true,
            minDifficulty: true,
            maxDifficulty: true,
          },
        },
        title: true,
        status: true,
        lat: true,
        lng: true,
        address: true,
        roadAddress: true,
        openWeek: true,
        contact: true,
        postcode: true,
        photos: true,
        rating: true,
        desc: true,
      },
    });

    if (spots.length < ctx.numOfWholeTravelSpot)
      throw new IBError({
        type: 'NOTEXISTDATA',
        message: `조건에 맞고 여행일수에 필요한만큼 충분한 수의 관광 spot이 없습니다.
          (필요 관광지 수: ${ctx.numOfWholeTravelSpot}, 검색된 관광지 수:${spots.length})`,
      });

    if (foods.length < Number(period) * 2)
      throw new IBError({
        type: 'NOTEXISTDATA',
        message:
          '여행일수에 필요한만큼 충분한 수의 관광 restaurant이 없습니다.',
      });

    ctx.spots = [...spots];
    ctx.foods = [...foods];
    ctx.paramByAvgCalibLevel = paramByAvgCalibLevel;

    /// spots clustering part
    ctx.spotClusterRes = makeCluster(ctx, runType);
    res.json({
      ...ibDefs.SUCCESS,
      IBparams: ctx.spotClusterRes!,
    });
  },
);

/**
 *  일정 생성 요청을 하는 함수를 호출하는 api endpoint(개발확인용)
 *
 */
export const makeScheduleWrapper = asyncWrapper(
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

      const ctx: ContextMakeSchedule = {
        userTokenId,
      };
      const param = req.body;
      const scheduleResult = await makeSchedule(
        {
          ...param,
          familyOpt: param.familyOpt ?? [],
          minFriend: param.minFriend ?? '0',
          maxFriend: param.maxFriend ?? '0',
        },
        ctx,
      );
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
 * 테스트용
 */
export const prismaTestWrapper = (
  req: Express.IBTypedReqBody<{ tags: string[] }>,
  res: Express.IBTypedResponse<IBResFormat>,
): void => {
  // const result = getBoundingBox(98, 127, 2.5);

  // 위경도 값
  const sss = getBoundingBox(33.0, 127.3, 2500);

  const result = getDistFromTwoGeoLoc({
    aLat: sss.minLat,
    aLng: sss.minLng,
    bLat: sss.minLat,
    bLng: sss.maxLng,
  });
  res.json({
    ...ibDefs.SUCCESS,
    IBparams: {
      cent: sss,
      distance: result,
    },
  });
};
