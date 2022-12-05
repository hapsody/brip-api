/* eslint-disable @typescript-eslint/naming-convention */
import moment from 'moment';
import prisma from '@src/prisma';
import { IBError, IBResFormat, asyncWrapper, ibDefs } from '@src/utils';
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
} from './types/schduleTypes';

import { getNDaysLater, getPlaceDataFromVJ, getRcmdList } from './inner';

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
      IBparams: result as object,
    });
  },
);
