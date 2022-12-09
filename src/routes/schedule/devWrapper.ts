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
import {
  AddMockBKCHotelResourceREQParam,
  defaultBKCHotelReqParams,
  GetPlaceDataFromVJREQParam,
  GetPlaceDataFromVJRETParam,
  BKCSrchByCoordReqOpt,
  GetRcmdListREQParam,
  GetRcmdListRETParam,
  MakeScheduleREQParam,
  gParamByTravelLevel,
} from './types/schduleTypes';

import { getPlaceDataFromVJ, getRcmdList } from './inner';

const degreeToMeter = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
) => {
  // generally used geo measurement function
  const R = 6378.137; // Radius of earth in KM
  const dLat = (lat2 * Math.PI) / 180 - (lat1 * Math.PI) / 180;
  const dLon = (lon2 * Math.PI) / 180 - (lon1 * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c;
  return d * 1000; // meters
};

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
      return;
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
 * inner 함수인 getRcmdList 확인용
 */
export const getRcmdListWrapper = asyncWrapper(
  async (
    req: Express.IBTypedReqBody<GetRcmdListREQParam<BKCSrchByCoordReqOpt>>,
    res: Express.IBTypedResponse<GetRcmdListRETParam>,
  ) => {
    try {
      const param = req.body;
      const ret = await getRcmdList(param);

      res.json({
        ...ibDefs.SUCCESS,
        IBparams: ret,
      });
      return;
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
 * 테스트용
 * 파라미터로 넘긴 tag에 OR로 해당하는(IBTravelType) tourPlace를 반환한다.
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
        ibTravelType: {
          some: {
            value: { in: tags },
          },
        },
      },
      select: {
        id: true,
        gl_name: true,
        vj_title: true,
        ibTravelType: {
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
 * 테스트용
 * 파라미터로 넘긴 tag와 관계된 tag의 트리 구조를 반환한다.
 */
export const getTagRelationWrapper = asyncWrapper(
  async (
    req: Express.IBTypedReqBody<{ tag: string; direction: 'up' | 'down' }>,
    res: Express.IBTypedResponse<IBResFormat>,
  ) => {
    const param = req.body;

    const { tag: startTag, direction } = param;
    type SuperTagTree = {
      tagName: string;
      superTags: SuperTagTree[];
    };
    type SubTagTree = {
      tagName: string;
      subTags: SubTagTree[];
    };
    const upRecursiveFunc = async (tag: string): Promise<SuperTagTree> => {
      const curTag = await prisma.iBTravelType.findUnique({
        where: {
          value: tag,
        },
        include: {
          related: {
            include: {
              to: true,
            },
          },
        },
      });

      if (curTag === null) {
        return {
          tagName: tag,
          superTags: [],
        };
      }

      const superTagPromises = curTag.related.map(v => {
        return upRecursiveFunc(v.to.value);
      });

      const superTags = await Promise.all(superTagPromises);

      return {
        tagName: curTag.value,
        superTags,
      };
    };

    const downRecursiveFunc = async (tag: string): Promise<SubTagTree> => {
      const curTag = await prisma.iBTravelType.findUnique({
        where: {
          value: tag,
        },
        include: {
          noPtr: {
            include: {
              from: true,
            },
          },
        },
      });

      if (curTag === null) {
        return {
          tagName: tag,
          subTags: [],
        };
      }

      const subTagPromises = curTag.noPtr.map(v => {
        return downRecursiveFunc(v.from.value);
      });

      const subTags = await Promise.all(subTagPromises);

      return {
        tagName: curTag.value,
        subTags,
      };
    };

    const result = await (async () => {
      if (direction === 'up') {
        const ret = await upRecursiveFunc(startTag);
        return ret;
      }

      const ret = await downRecursiveFunc(startTag);
      return ret;
    })();

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
    req: Express.IBTypedReqBody<MakeScheduleREQParam>,
    res: Express.IBTypedResponse<IBResFormat>,
  ) => {
    const { period, travelType, travelHard } = req.body;

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

    const tp = await prisma.tourPlace.findMany({
      where: {
        ibTravelType: {
          some: {
            AND: [
              { minDifficulty: { gte: calibUserLevel.min } },
              { maxDifficulty: { lte: calibUserLevel.max } },
            ],
          },
        },
        status: 'IN_USE',
        tourPlaceType: { in: ['VISITJEJU_SPOT', 'GL_SPOT'] },
      },
      select: {
        id: true,
        gl_name: true,
        vj_title: true,
        ibTravelType: {
          select: {
            value: true,
            minDifficulty: true,
            maxDifficulty: true,
          },
        },
        gl_vicinity: true,
        gl_formatted_address: true,
        vj_address: true,
        gl_lat: true,
        gl_lng: true,
        vj_latitude: true,
        vj_longitude: true,
        status: true,
        gl_rating: true,
      },
      orderBy: {
        gl_rating: 'desc',
      },
    });

    const paramByAvgCalibLevel =
      gParamByTravelLevel[
        Math.floor((calibUserLevel.min + calibUserLevel.max) / 2)
      ];
    const spotPerDay =
      Number(period) / (Number(period) * paramByAvgCalibLevel.actMultiplier);

    const numOfWholeTravelSpot = spotPerDay * Number(period);
    const spots = [...tp].splice(0, numOfWholeTravelSpot);

    /// spots clustering part
    const getLatLng = (spot: {
      gl_lat: number | null;
      gl_lng: number | null;
      vj_latitude: number | null;
      vj_longitude: number | null;
    }) => {
      if (spot.gl_lat && spot.gl_lng)
        return {
          lat: spot.gl_lat,
          lng: spot.gl_lng,
        };
      if (spot.vj_latitude && spot.vj_longitude)
        return {
          lat: spot.vj_latitude,
          lng: spot.vj_longitude,
        };
      return null;
    };

    // const { lat: latSum, lng: lngSum } = spots.reduce(
    //   (prevSum, curSpot) => {
    //     const curLatLng = getLatLng(curSpot);

    //     if (!curLatLng) return prevSum;
    //     const curLatSum = prevSum.lat + curLatLng.lat;
    //     const curLngSum = prevSum.lng + curLatLng.lng;

    //     return {
    //       lat: curLatSum,
    //       lng: curLngSum,
    //     };
    //   },
    //   { lat: 0, lng: 0 },
    // );
    // const allSpotCent = {
    //   lat: latSum / spots.length,
    //   lng: lngSum / spots.length,
    // };

    // const farthestTop5FromCentroid = [...spots]
    //   .sort((a, b) => {
    //     const geoA = getLatLng(a);
    //     const geoB = getLatLng(b);
    //     if (!geoA || !geoB) return -1;
    //     const distSqrA =
    //       (allSpotCent.lat - geoA.lat) ** 2 + (allSpotCent.lng - geoA.lng) ** 2;

    //     const distSqrB =
    //       (allSpotCent.lat - geoB.lat) ** 2 + (allSpotCent.lng - geoB.lng) ** 2;

    //     return distSqrB - distSqrA;
    //   })
    //   .splice(0, 5);

    const r = paramByAvgCalibLevel.maxDist;

    /// based on Mean-Shift clustering algorithm
    /// 전체 장소들의 평균 지점(무게중심)으로부터 가장 먼 5개 점을 뽑아서(s1, s2, ... s5)
    /// 해당 점들로부터 여행강도가 허용하는 하루 이동거리(r) 이내의 거리의 장소들만의 평균 지점을(a11, a12, ... a15) 구한다.
    /// 새로 구해진 5개 지점들로부터 r거리 이내의 거리의 점들의 평균지점을(a21, a22, ..., a25) 새로 구한다.
    /// an1 ... an5 각 지점이 a(n-1)1, ... a(n-1)5 와 k 거리오차 이내이면 루프를 종료한다.
    interface GeoFormat {
      lat: number;
      lng: number;
    }
    const getDistance = (a: GeoFormat, b: GeoFormat) => {
      return Math.sqrt((a.lat - b.lat) ** 2 + (a.lng - b.lng) ** 2);
    };

    // let centroids = [...farthestTop5FromCentroid].map(spot => getLatLng(spot));
    let centroids = [...spots].map(spot => getLatLng(spot));

    const centHistoryByStage: {
      stageNo: number;
      centroids: (GeoFormat | null)[];
    }[] = [
      {
        stageNo: 0,
        centroids,
      },
    ];
    const k = 0.01;
    let keepDoing: boolean[] = Array.from(Array(spots.length), () => false);
    let i = 0;
    const histories = Array.from(Array(spots.length), () => 'start');

    /// histories와 centroids를 구하는 루프를 실행한다.
    /// centroids: 최종적으로 수렴된 군집들의 대표값 배열
    /// histories: 각 loop stage 별로 반경 r안에 위치한 spots들에 대해 평균 위치 대표값을 구하여 배열로 저장한 데이터. 각 stage 별 centroids들을 배열로 엮은 값이다.
    do {
      const nextCentroids = centroids.map((c, index) => {
        if (!c) return null;
        const initCenterLatLng = c;
        const center = spots.reduce(
          (acc, curSpot, idx) => {
            const spotLatLng = getLatLng(curSpot);
            if (!spotLatLng) return acc;
            if (
              degreeToMeter(acc.lat, acc.lng, spotLatLng.lat, spotLatLng.lng) <
              r
            ) {
              const curAvgLat = (acc.lat * idx + spotLatLng.lat) / (idx + 1);
              const curAvgLng = (acc.lng * idx + spotLatLng.lng) / (idx + 1);
              return {
                lat: curAvgLat,
                lng: curAvgLng,
                numOfPointLessThanR: acc.numOfPointLessThanR + 1,
              };
            }
            return acc;
          },
          {
            lat: initCenterLatLng.lat,
            lng: initCenterLatLng.lng,
            numOfPointLessThanR: 0,
          },
        );
        histories[index] = `${histories[index]}-${center.numOfPointLessThanR}`;
        return center;
      });
      // eslint-disable-next-line @typescript-eslint/no-loop-func
      keepDoing = nextCentroids.map((newCent, idx) => {
        if (!newCent) return false;
        const prevCent = centroids[idx];
        if (!prevCent) return false;
        const rDiff = getDistance(newCent, prevCent);
        if (rDiff < k) return false;
        return true;
      }); /// keepDoing에 false가 있다면 해당 점은 더이상 진행하지 않아도 된다는 것이다.
      centroids = [...nextCentroids];
      centHistoryByStage.push({
        stageNo: centHistoryByStage.length,
        centroids,
      });
      i += 1;
      console.log(i, centroids[0]);
    } while (keepDoing.find(v => v === true)); /// 하나라도 true가 발견된다면 계속 진행해야한다.

    const wholeSpotLatLngSum = {
      lat: spots.reduce((acc, v) => {
        const curLat = getLatLng(v);
        if (!curLat) return acc;
        return acc + curLat.lat;
      }, 0),
      lng: spots.reduce((acc, v) => {
        const curLng = getLatLng(v);
        if (!curLng) return acc;
        return acc + curLng.lng;
      }, 0),
    };

    const wholeSpotLatLngAvg = {
      lat: wholeSpotLatLngSum.lat / spots.length,
      lng: wholeSpotLatLngSum.lng / spots.length,
      length: spots.length,
    };

    /// centroids의 중복을 제거하여 nonDupCentroids를 구한다.
    /// nonDupCentroids의 idx는 centroids의 인덱스값이다.
    /// 수렴된 centroids 값들중 하나만 남기고 나머지는 제거한다.
    const nonDupCentroids = centroids.reduce(
      (
        nonDupBuf: (GeoFormat & { idx: number })[],
        cur: GeoFormat | null,
        idx,
      ) => {
        if (!cur) return nonDupBuf;
        const isDup = nonDupBuf.find(
          d => d === null || (d.lat === cur.lat && d.lng === cur.lng),
        );

        if (isDup) return nonDupBuf;
        nonDupBuf.push({ idx, ...cur });
        return nonDupBuf;
      },
      [],
    );

    res.json({
      ...ibDefs.SUCCESS,
      IBparams: {
        r,
        maxPhase: i,
        wholeSpotLatLngAvg,
        nonDupCentroids,
        centHistoryByStage,
        centroids: centroids.map((v, idx) => {
          return {
            ...v,
            histories: histories[idx],
          };
        }),
        spotsGeoLocation: spots.map(v => {
          return {
            id: v.id,
            name: v.gl_name,
            lat: v.gl_lat,
            lng: v.gl_lng,
          };
        }),
      } as object,
    });
  },
);

/**
 * 테스트용
 */
export const prismaTestWrapper = asyncWrapper(
  async (
    req: Express.IBTypedReqBody<{ tags: string[] }>,
    res: Express.IBTypedResponse<IBResFormat>,
  ) => {
    const param = req.body;
    const { tags } = param;
    const result = await prisma.tourPlace.findMany({
      where: {
        ibTravelType: {
          some: {
            value: { in: tags },
          },
        },
      },
      select: {
        id: true,
        gl_name: true,
        vj_title: true,
        ibTravelType: {
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
      IBparams: result,
    });
  },
);
