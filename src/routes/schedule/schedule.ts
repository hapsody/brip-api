/* eslint-disable @typescript-eslint/naming-convention */

import express from 'express';
// import prisma from '@src/prisma';
import {
  ibDefs,
  asyncWrapper,
  IBResFormat,
  IBError,
  getNDaysLater,
  accessTokenValidCheck,
} from '@src/utils';
import axios, { Method } from 'axios';
import prisma from '@src/prisma';
import {
  SearchHotelRes,
  // GglNearbySearchRes,
  PlanType,
  PlaceType,
  GglNearbySearchRes,
  GglPhotos,
  Gglgeometry,
  TourPlace,
  QueryParams,
  MetaScheduleInfo,
} from '@prisma/client';
import moment from 'moment';
import { isEmpty, isNumber, isNil } from 'lodash';
import { v4 as uuidv4 } from 'uuid';
import {
  QueryReqParams,
  defaultSearchHotelReqParams,
  GetListQueryParamsReqParams,
  GetRecommendListWithLatLngtReqParams,
  GetRecommendListWithLatLngtResponse,
  defaultQueryParams,
  NearbySearchResponse,
  SearchHotelResponse,
  CompositeSearchResponse,
  GetListQueryParamsResponse,
  SearchLocationsFromBookingComReqParams,
  SearchLocationsFromBookingComResponse,
  SearchLocationsFromBookingComRawResponse,
  FiltersForSearchFromBookingComReqParams,
  FiltersForSearchFromBookingComResponse,
  SearchHotelReqParams,
  spotPerDay,
  gHotelTransition,
  gRadius,
  ReqScheduleParams,
  ReqScheduleResponse,
  FavoriteTravelType,
  GetScheduleParams,
  GetScheduleResponse,
  GetScheduleListParams,
  GetScheduleListResponse,
  SaveScheduleParams,
  SaveScheduleResponse,
  GetDayScheduleParams,
  GetDayScheduleResponse,
  GetDayScheduleResponsePayload,
  GetDetailScheduleParams,
  GetDetailScheduleResponse,
  GetDetailScheduleResponsePayload,
  GglPlaceDetailType,
  GooglePlaceReview,
  GetCandidateScheduleParams,
  GetCandidateScheduleResponse,
  ModifyScheduleParams,
  ModifyScheduleResponse,
  GetCandidateDetailScheduleParams,
  GetCandidateDetailScheduleResponse,
  GetCandidateDetailScheduleResponsePayload,
  TextSearchResponse,
  TextSearchReqParams,
  SyncVisitJejuDataReqParams,
  SyncVisitJejuDataResponse,
} from './types/schduleTypes';
import {
  createQueryParamId,
  getAllNearbySearchPages,
  getListQueryParamsInnerAsyncFn,
  searchHotelInnerAsyncFn,
  getTravelNights,
  getRecommendListWithLatLngtInnerAsyncFn,
  filterForSearchFromBookingComInnerAsyncFn,
  transPriceLevel,
  getPlaceDetail,
  getAllTextSearchPages,
  getVisitJejuDataInnerAsyncFn,
  searchLocationsFromBookingComInnerAsyncFn,
} from './internalFunc';

const scheduleRouter: express.Application = express();

/**
 * 구글 nearbySearch를 수행 요청하는 api endpoint 함수
 */
export const nearbySearch = asyncWrapper(
  async (
    req: Express.IBTypedReqBody<QueryReqParams>,
    res: Express.IBTypedResponse<NearbySearchResponse>,
  ) => {
    // const { nearbySearchResult } = await nearbySearchInnerAsyncFn(req.body);
    const queryReqParams = req.body;

    let queryParamId: number | undefined;
    if (queryReqParams.nearbySearchReqParams.loadAll) {
      queryParamId = await createQueryParamId(
        prisma,
        queryReqParams,
        undefined,
      );
    }

    const nearbySearchResult = await getAllNearbySearchPages(
      queryReqParams,
      queryParamId,
      queryReqParams.nearbySearchReqParams.loadAll,
    );
    res.json({
      ...ibDefs.SUCCESS,
      IBparams: {
        nearbySearchCount: nearbySearchResult.length,
        nearbySearchResult,
      },
    });
  },
);

/**
 * QueryReqParams의 조건에 맞춰 booking.com api로 호텔을 검색한다.
 * 실제 동작부인 searchHotelInnerAsync 함수를 호출하는 wrapper 함수로써의 역할만 수행한다.
 */
export const searchHotel = asyncWrapper(
  async (
    req: Express.IBTypedReqBody<QueryReqParams>,
    res: Express.IBTypedResponse<SearchHotelResponse>,
  ) => {
    const queryReqParams = req.body;
    const { hotelSearchResult } = await searchHotelInnerAsyncFn(queryReqParams);

    res.json({
      ...ibDefs.SUCCESS,
      IBparams: {
        hotelSearchCount: hotelSearchResult.length,
        hotelSearchResult,
      },
    });
  },
);

/**
 * internal(함수 내부 개발중 데이터 확인용 함수)
 * nearbySearch 와 hotelSearch를 복합 검색하도록 nearbySearchInnerAsyncFn과 hotelSearchInnerAsyncFn를 함께 호출하는 api endpoint 함수
 * 여행일수에 해당하는 관광지 수를 충분히 확보할수 있도록 수가 부족할 경우 범위를 늘려(radiusExtending) 재검색하는 기능을 포함한다.
 * 범위를 늘려 재검색하면 DB에는
 */
export const compositeSearch = asyncWrapper(
  async (
    req: Express.IBTypedReqBody<QueryReqParams>,
    res: Express.IBTypedResponse<CompositeSearchResponse>,
  ) => {
    const queryReqParams = req.body;
    // const { searchHotelReqParams, nearbySearchReqParams } = queryReqParams;

    const { hotelSearchResult, queryParamId } = await searchHotelInnerAsyncFn(
      queryReqParams,
    );

    let nearbySearchResult: google.maps.places.IBPlaceResult[] = [];

    const travelNights = getTravelNights(
      queryReqParams.searchHotelReqParams.checkinDate,
      queryReqParams.searchHotelReqParams.checkoutDate,
    );
    const travelDays = travelNights + 1;

    const radiusExtendRetryLimit = 5;
    let radiusExtendRetry = 1;
    /* radius extend repeat */
    while (
      nearbySearchResult.length < travelDays * spotPerDay &&
      radiusExtendRetry <= radiusExtendRetryLimit
    ) {
      if (radiusExtendRetry > 1)
        console.log(
          `allpage nearbySearchResult: ${nearbySearchResult.length} radiusExtendRetry:${radiusExtendRetry}`,
        );
      const radiusModifiedQueryParams = {
        ...defaultQueryParams,
        searchHotelReqParams: queryReqParams.searchHotelReqParams,
        nearbySearchReqParams: {
          ...queryReqParams.nearbySearchReqParams,
          radius:
            queryReqParams.nearbySearchReqParams.radius * radiusExtendRetry,
        },
      };
      // eslint-disable-next-line no-await-in-loop
      nearbySearchResult = await getAllNearbySearchPages(
        radiusModifiedQueryParams,
        queryParamId,
        queryReqParams.nearbySearchReqParams.loadAll,
      );
      radiusExtendRetry += 1;
    }

    res.json({
      ...ibDefs.SUCCESS,
      IBparams: {
        hotelSearchCount: hotelSearchResult.length,
        nearbySearchCount: nearbySearchResult.length,
        hotelSearchResult,
        nearbySearchResult,
      },
    });
  },
);

/**
 * internal(함수 내부 개발중 데이터 확인용 함수)
 * DB로부터 QueryParams 모델 데이터를 불러 응신한다.
 * 구글 nearbySearch, rapid api booking.com hotelSearch를 한번의 쿼리로 복합 검색시(compositeSearch / getRecommendListWithLatLngt 등 ...)
 * 하나의 QueryParams 와 관계된 모든 데이터를 요청하는 /getListQueryParams api의 주요 내부 동작 함수인 getListQueryParamsInnerAsyncFn를 호출할 wrapper endpoint api 함수이다.
 */
const getListQueryParams = asyncWrapper(
  async (
    req: Express.IBTypedReqBody<GetListQueryParamsReqParams>,
    res: Express.IBTypedResponse<GetListQueryParamsResponse>,
  ) => {
    const params = req.body;
    const queryParamsDataFromDB = await getListQueryParamsInnerAsyncFn(params);

    res.json({
      ...ibDefs.SUCCESS,
      IBparams: queryParamsDataFromDB,
    });
  },
);

const getRecommendListWithLatLngt = asyncWrapper(
  async (
    req: Express.IBTypedReqBody<GetRecommendListWithLatLngtReqParams>,
    res: Express.IBTypedResponse<GetRecommendListWithLatLngtResponse>,
  ) => {
    try {
      const params = req.body;
      const recommendListFromDB = await getRecommendListWithLatLngtInnerAsyncFn(
        params,
      );
      res.json({
        ...ibDefs.SUCCESS,
        IBparams: recommendListFromDB,
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
      }
      throw err;
    }
  },
);

const filtersForSearchFromBookingCom = asyncWrapper(
  async (
    req: Express.IBTypedReqBody<FiltersForSearchFromBookingComReqParams>,
    res: Express.IBTypedResponse<FiltersForSearchFromBookingComResponse>,
  ) => {
    const params = req.body;
    const data = await filterForSearchFromBookingComInnerAsyncFn(params);
    res.json({
      ...ibDefs.SUCCESS,
      IBparams: data,
    });
  },
);

const searchLocationsFromBookingCom = asyncWrapper(
  async (
    req: Express.IBTypedReqBody<SearchLocationsFromBookingComReqParams>,
    res: Express.IBTypedResponse<SearchLocationsFromBookingComResponse>,
  ) => {
    const params = req.body;

    const data = await searchLocationsFromBookingComInnerAsyncFn(params);

    res.json({
      ...ibDefs.SUCCESS,
      IBparams: data,
    });
  },
);

const prismaTest = asyncWrapper(
  async (
    req: Express.IBTypedReqBody<{}>,
    res: Express.IBTypedResponse<IBResFormat>,
  ) => {
    // const testFromDB = await prisma.nonMembersCount.count();
    await axios.get(
      `https://maps.googleapis.com/maps/api/place/photo?maxwidth=1200&photo_reference=AcYSjRiZPer89udPGpFKZg4ApRv7azA2xIIGoiPgf8I-Q1hZsmliZT6KupVtJfCv8NrvWAaSc6nMGsHQ0i2FO-YSKZOdbCRG1o9QRSKuNg6SOtba3bweA3o4psLy6CY037LYQuVzd3UMu0IAoGR8mf7_zN_ySGnK98e9RMR6PSbl1-BeUyq_&key=AIzaSyCy8gfiBApL39ZKjDVeWwR6hQKWIUR0SOw`,
    );
    // const protocol = rawResult.request?.protocol;
    // const host = rawResult.request?.host;
    // const path = rawResult.request?.path;

    // const result = `${protocol as string}//${host as string}/${path as string}`;

    res.json({
      ...ibDefs.SUCCESS,
      IBparams: {} as object,
    });
  },
);

// export const validNearbySearchPageToken = asyncWrapper(
//   async (
//     req: Express.IBTypedReqBody<{
//       keyword: string;
//       location: {
//         latitude: string; // 위도
//         longitude: string; // 경도
//       };
//       radius: number;
//     }>,
//     res: Express.IBTypedResponse<IBResFormat>,
//   ) => {
//     const {
//       body: { keyword, location, radius },
//     } = req;
//     let pageToken: string | undefined;
//     let resArr: google.maps.places.PlaceResult[] = [];

//     const queryUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?keyword=${keyword}&location=${
//       location?.latitude
//     }%2C${location?.longitude}&radius=${radius}&key=${
//       process.env.GCP_MAPS_APIKEY as string
//     }${pageToken ? `&pagetoken=${pageToken}` : ''}`;
//     console.log(queryUrl);
//     // eslint-disable-next-line no-await-in-loop
//     const response = await axios.get(queryUrl);
//     if (response?.statusText === 'OK') {
//       // eslint-disable-next-line @typescript-eslint/naming-convention
//       const { results, next_page_token } = response.data as {
//         next_page_token: string;
//         results: google.maps.places.PlaceResult[];
//       };

//       pageToken = next_page_token;
//       resArr = [...resArr, ...results];
//     }

//     const promise = new Promise(resolve => {
//       (function loop() {
//         if (pageToken) {
//           const queryUrl2 = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?keyword=${keyword}&location=${
//             location?.latitude
//           }%2C${location?.longitude}&radius=${radius}&key=${
//             process.env.GCP_MAPS_APIKEY as string
//           }${pageToken ? `&pagetoken=${pageToken}` : ''}`;
//           console.log(queryUrl2);
//           // eslint-disable-next-line no-await-in-loop
//           axios
//             .get(queryUrl)
//             .then(response2 => {
//               if (response2?.statusText === 'OK') {
//                 // eslint-disable-next-line @typescript-eslint/naming-convention
//                 const { results, next_page_token } = response2.data as {
//                   next_page_token: string;
//                   results: google.maps.places.PlaceResult[];
//                 };

//                 pageToken = next_page_token;
//                 resArr = [...resArr, ...results];
//                 resolve(true);
//               }
//               loop();
//               // console.log(JSON.stringify(response.data, null, 2));
//             })
//             .catch(err => console.error(err));
//         }
//       })();
//     });

//     await promise;
//     console.log(
//       JSON.stringify(
//         resArr.map((item, i) => {
//           return {
//             idx: i,
//             name: item.name,
//             hash: item.place_id,
//           };
//         }),
//         null,
//         2,
//       ),
//     );
//     res.json({
//       ...ibDefs.SUCCESS,
//       IBparams: resArr,
//     });
//   },
// );

export const addMockHotelResource = asyncWrapper(
  async (
    req: Express.IBTypedReqBody<SearchHotelReqParams>,
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
    } = req.body ?? defaultSearchHotelReqParams;

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
        responseData: data,
      },
    });

    res.json({
      ...ibDefs.SUCCESS,
      IBparams: response.data as object,
    });
  },
);

export const addMockSearchLocationsResource = asyncWrapper(
  async (
    req: Express.IBTypedReqBody<{
      name: string;
    }>,
    res: Express.IBTypedResponse<IBResFormat>,
  ) => {
    const params = req.body;

    const { name } = params;
    const options = {
      method: 'GET' as Method,
      url: 'https://booking-com.p.rapidapi.com/v1/hotels/locations',
      params: { locale: 'en-us', name },
      headers: {
        'X-RapidAPI-Key': process.env.RAPID_API_KEY ?? '',
        'X-RapidAPI-Host': 'booking-com.p.rapidapi.com',
      },
    };

    let rawResponse = { data: {} };
    let data: string = '';
    try {
      rawResponse = await axios.request(options);

      rawResponse.data as SearchLocationsFromBookingComRawResponse[];
      data = JSON.stringify(rawResponse.data);
    } catch (err) {
      throw new IBError({
        type: 'EXTERNALAPI',
        message: (err as Error).message,
      });
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    await prisma.mockBookingDotComHotelResource.create({
      data: {
        reqType: 'SEARCH_LOCATIONS',
        responseData: data,
      },
    });

    res.json({
      ...ibDefs.SUCCESS,
      IBparams: rawResponse.data as object,
    });
  },
);

// export const readMockHotelResource = asyncWrapper(
//   async (
//     req: Express.IBTypedReqBody<{}>,
//     res: Express.IBTypedResponse<IBResFormat>,
//   ) => {
//     // eslint-disable-next-line @typescript-eslint/no-unsafe-call
//     const result = await readHotelDataFromMock();

//     res.json({
//       ...ibDefs.SUCCESS,
//       IBparams: result ? (JSON.parse(result.responseData) as Object) : {},
//     });
//   },
// );

export const reqSchedule = (
  req: Express.IBTypedReqBody<ReqScheduleParams>,
  res: Express.IBTypedResponse<ReqScheduleResponse>,
): void => {
  try {
    const watchStart = moment();
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

    const params = req.body;
    const {
      minMoney,
      maxMoney,
      startDate,
      endDate,
      adult,
      child,
      infant,
      travelHard,
      favoriteTravelType,
      // favoriteAccommodation,
      // favoriteAccommodationLocation,
      mock,
    } = params;

    const scheduleHash = uuidv4();
    const travelType: FavoriteTravelType = favoriteTravelType.reduce(
      (acc: FavoriteTravelType, cur: string) => {
        let newAcc: FavoriteTravelType = {};
        const formatted = cur.toUpperCase();
        switch (formatted) {
          case 'LANDACTIVITY':
            newAcc = { ...acc, landActivity: true };
            break;
          case 'GOLF':
            newAcc = { ...acc, golf: true };
            break;
          case 'RELAXATION':
            newAcc = { ...acc, relaxation: true };
            break;
          case 'OCEANACTIVITY':
            newAcc = { ...acc, oceanActivity: true };
            break;
          case 'GROUPACTIVITY':
            newAcc = { ...acc, groupActivity: true };
            break;
          case 'LEARN':
            newAcc = { ...acc, learn: true };
            break;
          case 'FOOD':
            newAcc = { ...acc, food: true };
            break;
          case 'EXPERIENCE':
            newAcc = { ...acc, experience: true };
            break;
          case 'VISITTOURSPOT':
            newAcc = { ...acc, visitTourSpot: true };
            break;
          case 'PACKAGETOUR':
            newAcc = { ...acc, packageTour: true };
            break;
          case 'SHOPPING':
            newAcc = { ...acc, shopping: true };
            break;
          case 'WATERPARK':
            newAcc = { ...acc, waterPark: true };
            break;
          case 'NOIDEA':
            newAcc = { ...acc, noIdea: true };
            break;

          default:
            newAcc = { ...acc };
            break;
        }
        return newAcc;
      },
      {},
    );

    // const accommodationType: FavoriteAccommodationType =
    //   favoriteAccommodation.reduce(
    //     (acc: FavoriteAccommodationType, cur: string) => {
    //       let newAcc: FavoriteAccommodationType = {};
    //       const formatted = cur.toUpperCase();
    //       switch (formatted) {
    //         case 'HOTEL':
    //           newAcc = { ...acc, hotel: true };
    //           break;

    //         case 'RESORT':
    //           newAcc = { ...acc, resort: true };
    //           break;

    //         case 'HOUSERENT':
    //           newAcc = { ...acc, houseRent: true };
    //           break;

    //         case 'ROOMRENT':
    //           newAcc = { ...acc, roomRent: true };
    //           break;

    //         case 'BEDRENT':
    //           newAcc = { ...acc, bedRent: true };
    //           break;
    //         case 'APARTRENT':
    //           newAcc = { ...acc, apartRent: true };
    //           break;
    //         case 'POOLVILLA':
    //           newAcc = { ...acc, poolVilla: true };
    //           break;
    //         case 'CAMPING':
    //           newAcc = { ...acc, camping: true };
    //           break;
    //         case 'MIXED':
    //           newAcc = { ...acc, mixed: true };
    //           break;
    //         case 'DONTCARE':
    //           newAcc = { ...acc, dontCare: true };
    //           break;
    //         default:
    //           newAcc = { ...acc };
    //           break;
    //       }
    //       return newAcc;
    //     },
    //     {},
    //   );

    // const accommodationLocationType: FavoriteAccommodationLocation =
    //   favoriteAccommodation.reduce(
    //     (acc: FavoriteAccommodationLocation, cur: string) => {
    //       let newAcc: FavoriteAccommodationLocation = {};
    //       const formatted = cur.toUpperCase();
    //       switch (formatted) {
    //         case 'NATURE':
    //           newAcc = { ...acc, nature: true };
    //           break;
    //         case 'DOWNTOWN':
    //           newAcc = { ...acc, downtown: true };
    //           break;
    //         case 'OCEANVIEW':
    //           newAcc = { ...acc, oceanView: true };
    //           break;
    //         case 'MOUNTAINVIEW':
    //           newAcc = { ...acc, mountainView: true };
    //           break;
    //         case 'CITYVIEW':
    //           newAcc = { ...acc, cityView: true };
    //           break;
    //         case 'MIXED':
    //           newAcc = { ...acc, mixed: true };
    //           break;
    //         case 'DONTCARE':
    //           newAcc = { ...acc, dontCare: true };
    //           break;
    //         default:
    //           newAcc = { ...acc };
    //           break;
    //       }
    //       return newAcc;
    //     },
    //     {},
    //   );

    const childrenAges = Array.from({ length: Number(child) }, () => 5).concat(
      Array.from({ length: Number(infant) }, () => 1),
    ); /// child는 5세, infant는 1세로 일괄 처리.

    const getRecommendFuncParam: QueryReqParams = {
      minBudget: Number(minMoney),
      maxBudget: Number(maxMoney),
      travelStartDate: startDate,
      travelEndDate: endDate,
      currency: 'KRW',
      travelType,
      travelIntensity: Number(travelHard),
      hotelTransition: gHotelTransition,
      searchHotelReqParams: {
        orderBy: 'review_score',
        adultsNumber: Number(adult),
        roomNumber: 1,
        checkinDate: startDate,
        checkoutDate: endDate,
        childrenNumber: Number(child) + Number(infant),
        childrenAges,
        filterByCurrency: 'USD',
        latitude: '33.501298', // 제주
        longitude: '126.525482', // 제주
        categoriesFilterIds: ['property_type::204'], // filter: hotel
        mock: mock ?? false,
      },
      nearbySearchReqParams: {
        keyword: '',
        location: {
          latitude: '33.501298', // 제주
          longitude: '126.525482', // 제주
        },
        radius: gRadius,
        loadAll: true,
      },
    };

    getRecommendListWithLatLngtInnerAsyncFn({
      searchCond: getRecommendFuncParam,
    })
      .then(recommendListFromDB => {
        const { queryParamId, metaInfo, visitSchedules, visitSchedulesCount } =
          recommendListFromDB;
        const promise1 = prisma.metaScheduleInfo.create({
          data: {
            totalHotelSearchCount: metaInfo.totalHotelSearchCount,
            totalRestaurantSearchCount: metaInfo.totalRestaurantSearchCount,
            totalSpotSearchCount: metaInfo.totalSpotSearchCount,
            spotPerDay: metaInfo.spotPerDay,
            mealPerDay: metaInfo.mealPerDay,
            mealSchedule: metaInfo.mealSchedule.toString(),
            travelNights: metaInfo.travelNights,
            travelDays: metaInfo.travelDays,
            hotelTransition: metaInfo.hotelTransition,
            transitionTerm: metaInfo.transitionTerm,
            recommendedMinHotelCount: metaInfo.recommendedMinHotelCount,
            recommendedMidHotelCount: metaInfo.recommendedMidHotelCount,
            recommendedMaxHotelCount: metaInfo.recommendedMaxHotelCount,
            visitSchedulesCount,
            queryParamsId: queryParamId,
          },
        });

        type VisitScheduleDataType = {
          dayNo: number;
          orderNo: number;
          from: PlanType;
          type: PlaceType;
          dataId: number;
          tourPlaceData?: TourPlace;
        };
        const visitScheduleStoreData = visitSchedules.reduce(
          (acc: VisitScheduleDataType[], cur, dayIdx) => {
            const minVisitOrder: VisitScheduleDataType[] =
              cur.visitOrder.ordersFromMinHotel.map((item, orderIdx) => {
                return {
                  dayNo: dayIdx + 1,
                  orderNo: orderIdx,
                  from: 'MIN',
                  type: item.type.toUpperCase() as PlaceType,
                  dataId: item.data.id,
                  tourPlaceData: item.data.tourPlace,
                };
              });

            const midVisitOrder: VisitScheduleDataType[] =
              cur.visitOrder.ordersFromMidHotel.map((item, orderIdx) => {
                return {
                  dayNo: dayIdx + 1,
                  orderNo: orderIdx,
                  from: 'MID',
                  type: item.type.toUpperCase() as PlaceType,
                  dataId: item.data.id,
                  tourPlaceData: item.data.tourPlace,
                };
              });

            const maxVisitOrder: VisitScheduleDataType[] =
              cur.visitOrder.ordersFromMaxHotel.map((item, orderIdx) => {
                return {
                  dayNo: dayIdx + 1,
                  orderNo: orderIdx,
                  from: 'MAX',
                  type: item.type.toUpperCase() as PlaceType,
                  dataId: item.data.id,
                  tourPlaceData: item.data.tourPlace,
                };
              });
            const newAcc = [
              ...acc,
              ...minVisitOrder,
              ...midVisitOrder,
              ...maxVisitOrder,
            ];
            return newAcc;
          },
          [],
        );

        const promise2 = visitScheduleStoreData.map(item => {
          return prisma.visitSchedule.create({
            data: {
              dayNo: item.dayNo,
              orderNo: item.orderNo,
              from: item.from,
              // type: item.type,
              dataId: item.dataId,
              // ...d,
              tourPlace: {
                connect: {
                  id: item.tourPlaceData?.id,
                },
              },
              queryParams: {
                connect: {
                  id: queryParamId,
                },
              },
            },
          });
        });

        const promise3 = prisma.queryParams.update({
          where: { id: queryParamId },
          data: {
            userTokenId,
            scheduleHash,
          },
        });

        const promises = [promise1, ...promise2, promise3];
        prisma
          .$transaction(promises)
          .then(() => {
            console.log(
              `Making schedule is done. it's taken ${moment().diff(
                watchStart,
                'seconds',
              )} seconds`,
            );
          })
          .catch(err => {
            throw err;
            // queryParam에 실패 결과 feedback 로직
          });
      })
      .catch(getRecommendListErr => {
        throw getRecommendListErr;
        // queryParam에 실패 결과 feedback 로직
      });

    res.json({
      ...ibDefs.SUCCESS,
      IBparams: { scheduleHash },
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
};

export const getSchedule = asyncWrapper(
  async (
    req: Express.IBTypedReqBody<GetScheduleParams>,
    res: Express.IBTypedResponse<GetScheduleResponse>,
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

      const params = req.body;
      const { scheduleHash } = params;

      const queryParams = await prisma.queryParams.findFirst({
        where: {
          scheduleHash,
        },
        include: {
          visitSchedule: {
            include: {
              tourPlace: {
                include: {
                  gglNearbySearchRes: true,
                  searchHotelRes: true,
                },
              },
              // spot: true,
              // restaurant: true,
              // hotel: true,
            },
          },
          metaScheduleInfo: true,
        },
      });

      if (!queryParams) {
        res.status(202).json({
          ...ibDefs.NOTEXISTDATA,
          IBdetail:
            '일정이 아직 생성되지 않았거나 존재하지 않는 scheduleHash 값입니다.',
          IBparams: {},
        });
        return;
      }
      const minVisitSchedules = queryParams.visitSchedule.filter(
        e => e.from === 'MIN',
      );
      const midVisitSchedules = queryParams.visitSchedule.filter(
        e => e.from === 'MID',
      );
      const maxVisitSchedules = queryParams.visitSchedule.filter(
        e => e.from === 'MAX',
      );

      const travelDays = queryParams?.metaScheduleInfo?.travelDays ?? 0;

      const filterXPlan = (planType: PlanType) => {
        return {
          planType,
          day: Array.from(Array(travelDays)).map((e, i) => {
            const scheduleByDays = (() => {
              if (planType === 'MIN') return minVisitSchedules;
              if (planType === 'MID') return midVisitSchedules;
              return maxVisitSchedules;
            })().filter(k => {
              if (k.dayNo === i + 1) return true;
              return false;
            });

            return {
              dayNo: `${i + 1}`,
              titleList: scheduleByDays.map(v => {
                const { tourPlace } = v;
                return {
                  visitScheduleId: v.id.toString(),
                  orderNo: v.orderNo.toString(),
                  // dayNo: tourPlace.dayNo.toString(),
                  title: (() => {
                    if (tourPlace?.tourPlaceType === 'HOTEL')
                      return tourPlace?.searchHotelRes?.hotel_name ?? 'error';
                    if (tourPlace?.tourPlaceType === 'RESTAURANT') {
                      return tourPlace?.gglNearbySearchRes?.name ?? 'error';
                    }
                    return tourPlace?.gglNearbySearchRes?.name ?? 'error';
                  })(),
                };
              }),
            };
          }),
        };
      };
      const plan = [filterXPlan('MIN'), filterXPlan('MID'), filterXPlan('MAX')];

      res.json({
        ...ibDefs.SUCCESS,
        IBparams: {
          queryParamsId: queryParams.id.toString(),
          scheduleHash: queryParams.scheduleHash,
          plan,
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

export const getScheduleList = asyncWrapper(
  async (
    req: Express.IBTypedReqBody<GetScheduleListParams>,
    res: Express.IBTypedResponse<GetScheduleListResponse>,
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

      const { skip, take } = req.body;

      const queryParams = await prisma.queryParams.findMany({
        skip: Number(skip),
        take: Number(take),
        where: {
          userTokenId,
          savedSchedule: {
            NOT: undefined,
          },
        },
        include: {
          // visitSchedule: true,
          // metaScheduleInfo: true,
          savedSchedule: {
            include: {
              hashTag: true,
            },
          },
        },
      });

      const retValue = queryParams
        .map(q => {
          const { savedSchedule } = q;
          if (!savedSchedule) return null;

          return {
            id: savedSchedule.id,
            tag: savedSchedule.hashTag.map(v => v.value),
            title: savedSchedule.title,
            createdAt: savedSchedule.createdAt,
            thumbnail: savedSchedule.thumbnail,
            scheduleHash: savedSchedule.scheduleHash,
            planType: savedSchedule.planType.toLowerCase(),
          };
        })
        .filter(e => e);

      res.json({
        ...ibDefs.SUCCESS,
        IBparams: retValue,
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

export const saveSchedule = asyncWrapper(
  async (
    req: Express.IBTypedReqBody<SaveScheduleParams>,
    res: Express.IBTypedResponse<SaveScheduleResponse>,
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

      const { title, keyword, planType, scheduleHash } = req.body;

      const queryParams = await prisma.queryParams.findFirst({
        where: {
          scheduleHash,
        },
        include: {
          savedSchedule: {
            select: {
              id: true,
            },
          },
        },
      });

      if (!queryParams) {
        throw new IBError({
          type: 'NOTEXISTDATA',
          message:
            'scheduleHash에 대응하는 일정 데이터가 존재하지 않거나 아직 생성중입니다.',
        });
      }

      if (queryParams.savedSchedule?.id) {
        throw new IBError({
          type: 'DUPLICATEDDATA',
          message: '이미 저장한 일정입니다.',
        });
      }

      const createResult = await prisma.scheduleBank.create({
        data: {
          title,
          thumbnail:
            'https://www.lottehotel.com/content/dam/lotte-hotel/lotte/jeju/overview/introduction/g-0807.jpg.thumb.768.768.jpg',
          planType: planType.toUpperCase() as PlanType,
          scheduleHash,
          hashTag: {
            connectOrCreate: keyword.map(k => {
              return {
                where: {
                  value: k,
                },
                create: {
                  value: k,
                },
              };
            }),
          },
          userTokenId,
          queryParams: {
            connect: {
              id: queryParams.id,
            },
          },
        },
      });

      res.json({
        ...ibDefs.SUCCESS,
        IBparams: {
          scheduleHash: createResult.scheduleHash,
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

        if (err.type === 'DUPLICATEDDATA') {
          res.status(409).json({
            ...ibDefs.DUPLICATEDDATA,
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

export const getDaySchedule = asyncWrapper(
  async (
    req: Express.IBTypedReqBody<GetDayScheduleParams>,
    res: Express.IBTypedResponse<GetDayScheduleResponse>,
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

      const { scheduleHash, day, planType } = req.body;

      const queryParams = await prisma.queryParams.findFirst({
        where: {
          scheduleHash,
        },
        include: {
          visitSchedule: {
            where: {
              dayNo: { equals: Number(day) },
              from: { equals: planType.toUpperCase() as PlanType },
            },
            include: {
              tourPlace: {
                include: {
                  gglNearbySearchRes: {
                    include: {
                      photos: true,
                      geometry: true,
                    },
                  },
                  searchHotelRes: true,
                },
              },
            },
          },
          metaScheduleInfo: true,
        },
      });

      if (!queryParams) {
        throw new IBError({
          type: 'NOTEXISTDATA',
          message: 'scheduleHash에 대응하는 일정 데이터가 존재하지 않습니다.',
        });
      }

      const spotList: Pick<GetDayScheduleResponsePayload, 'spotList'> = {
        spotList: queryParams.visitSchedule.map(v => {
          const vType: PlaceType = v.tourPlace?.tourPlaceType ?? 'SPOT';
          const place = (() => {
            if (vType === 'HOTEL') return v.tourPlace?.searchHotelRes;
            if (vType === 'RESTAURANT' || vType === 'SPOT')
              return v.tourPlace?.gglNearbySearchRes;
            return undefined;
          })();

          if (vType === 'HOTEL') {
            const hotel = place as SearchHotelRes;
            return {
              id: v.id.toString(),
              spotType: vType as string,
              previewImg: hotel.main_photo_url,
              spotName: hotel.hotel_name,
              roomType: hotel.unit_configuration_label,
              spotAddr: hotel.address,
              hotelBookingUrl: hotel.url,
              startDate: moment(queryParams.hotelCheckinDate).format(
                'YYYY-MM-DD',
              ),
              endDate: moment(queryParams.hotelCheckoutDate).format(
                'YYYY-MM-DD',
              ),
              night: queryParams.metaScheduleInfo?.travelNights,
              days: queryParams.metaScheduleInfo?.travelDays,
              checkin: hotel.checkin,
              checkout: hotel.checkout,
              price: hotel.min_total_price.toString(),
              rating: hotel.review_score ? hotel.review_score / 2.0 : undefined,
              lat: hotel.latitude,
              lng: hotel.longitude,
              imageList: [
                {
                  id: '1',
                  url: hotel.main_photo_url,
                  text: 'text는 어디에 쓰이는지?',
                },
              ],
            };
          }
          if (vType === 'RESTAURANT') {
            const restaurant = place as GglNearbySearchRes & {
              photos: GglPhotos[];
              geometry?: Gglgeometry;
            };
            return {
              id: v.id.toString(),
              spotType: vType as string,
              previewImg:
                restaurant.photos.length > 0 && restaurant.photos[0].url
                  ? restaurant.photos[0].url
                  : 'none',
              spotName: restaurant.name ?? 'none',
              spotAddr: restaurant.vicinity ?? 'none',
              // contact: 'none',
              placeId: restaurant.place_id ?? 'none',
              startDate: moment(queryParams.hotelCheckinDate).format(
                'YYYY-MM-DD',
              ),
              endDate: moment(queryParams.hotelCheckoutDate).format(
                'YYYY-MM-DD',
              ),
              night: queryParams.metaScheduleInfo?.travelNights,
              days: queryParams.metaScheduleInfo?.travelDays,
              rating: restaurant.rating ?? undefined,
              lat: restaurant.geometry
                ? Number(
                    (
                      JSON.parse(restaurant.geometry?.location) as {
                        lat: string;
                      }
                    ).lat,
                  )
                : undefined,
              lng: restaurant.geometry
                ? Number(
                    (
                      JSON.parse(restaurant.geometry?.location) as {
                        lngt: string;
                      }
                    ).lngt,
                  )
                : undefined,
              imageList: restaurant.photos.map(p => {
                return {
                  id: p.id.toString(),
                  url: p.url ?? 'none',
                  text: 'text는 어디에 쓰이는지?',
                };
              }),
            };
          }

          const spot = place as GglNearbySearchRes & {
            photos: GglPhotos[];
            geometry?: Gglgeometry;
          };
          return {
            id: v.id.toString(),
            spotType: vType as string,
            previewImg:
              spot.photos.length > 0 && spot.photos[0].url
                ? spot.photos[0].url
                : 'none',
            spotName: spot.name ?? 'none',
            spotAddr: spot.vicinity ?? 'none',
            // contact: 'none',
            placeId: spot.place_id ?? 'none',
            startDate: moment(queryParams.hotelCheckinDate).format(
              'YYYY-MM-DD',
            ),
            endDate: moment(queryParams.hotelCheckoutDate).format('YYYY-MM-DD'),
            night: queryParams.metaScheduleInfo?.travelNights,
            days: queryParams.metaScheduleInfo?.travelDays,
            price: spot.price_level?.toString(),
            rating: spot.rating ?? undefined,
            lat: spot.geometry
              ? Number(
                  (
                    JSON.parse(spot.geometry?.location) as {
                      lat: string;
                    }
                  ).lat,
                )
              : undefined,
            lng: spot.geometry
              ? Number(
                  (
                    JSON.parse(spot.geometry?.location) as {
                      lngt: string;
                    }
                  ).lngt,
                )
              : undefined,
            imageList: spot.photos.map(p => {
              return {
                id: p.id.toString(),
                url: p.url ?? 'none',
                text: 'text는 어디에 쓰이는지?',
              };
            }),
          };
        }),
      };

      const retValue: GetDayScheduleResponsePayload = {
        id: queryParams.id.toString(),
        dayCount: Number(day),
        contentsCountAll: spotList.spotList.length,
        spotList: spotList.spotList,
      };

      res.json({
        ...ibDefs.SUCCESS,
        IBparams: retValue,
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

export const getDetailSchedule = asyncWrapper(
  async (
    req: Express.IBTypedReqBody<GetDetailScheduleParams>,
    res: Express.IBTypedResponse<GetDetailScheduleResponse>,
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

      const { visitScheduleId } = req.body;

      const visitSchedule = await prisma.visitSchedule.findUnique({
        where: {
          id: Number(visitScheduleId),
        },
        include: {
          tourPlace: {
            include: {
              gglNearbySearchRes: {
                include: {
                  geometry: true,
                  photos: true,
                },
              },
              searchHotelRes: true,
            },
          },
          queryParams: {
            include: {
              metaScheduleInfo: true,
            },
          },
        },
      });

      if (!visitSchedule) {
        throw new IBError({
          type: 'NOTEXISTDATA',
          message:
            'visitScheduleId에 대응하는 일정 데이터가 존재하지 않습니다.',
        });
      }

      if (visitSchedule.queryParams?.userTokenId !== userTokenId) {
        throw new IBError({
          type: 'NOTEXISTDATA',
          message: '다른 유저의 visitSchedule 데이터입니다.',
        });
      }

      const retValue =
        await (async (): Promise<GetDetailScheduleResponsePayload> => {
          const tourPlaceType = visitSchedule.tourPlace?.tourPlaceType;
          if (tourPlaceType === 'HOTEL') {
            const {
              tourPlace: { searchHotelRes: hotel },
            } = visitSchedule as {
              tourPlace: {
                searchHotelRes: SearchHotelRes;
              };
            };

            const options = {
              method: 'GET' as Method,
              url: 'https://booking-com.p.rapidapi.com/v1/hotels/photos',
              params: { locale: 'ko', hotel_id: hotel.hotel_id },
              headers: {
                'X-RapidAPI-Key': `${process.env.RAPID_API_KEY as string}`,
                'X-RapidAPI-Host': 'booking-com.p.rapidapi.com',
              },
            };
            const rawResponse = await axios.request(options);
            const hotelPhotos = rawResponse.data as {
              ml_tags: {
                confidence: number;
                tag_id: number;
                tag_type: string;
                tag_name: string;
                photo_id: number;
              }[];
              tags: {
                tag: string;
                id: number;
              }[];
              photo_id: number;
              url_square60: string;
              url_max: string;
              url_1440: string;
            }[];

            return {
              id: visitSchedule.id.toString(),
              dayCount: visitSchedule.dayNo,
              orderCount: visitSchedule.orderNo,
              planType: visitSchedule.from,
              spotType: tourPlaceType,
              previewImg: hotel.main_photo_url,
              spotName: hotel.hotel_name,
              roomType: hotel.unit_configuration_label,
              spotAddr: hotel.address,
              hotelBookingUrl: hotel.url,
              placeId: null,
              startDate:
                visitSchedule && visitSchedule.queryParams
                  ? moment(visitSchedule.queryParams.hotelCheckinDate).format(
                      'YYYY-MM-DD',
                    )
                  : null,
              endDate:
                visitSchedule && visitSchedule.queryParams
                  ? moment(visitSchedule.queryParams.hotelCheckoutDate).format(
                      'YYYY-MM-DD',
                    )
                  : null,
              night:
                visitSchedule.queryParams?.metaScheduleInfo?.travelNights ??
                null,
              days:
                visitSchedule.queryParams?.metaScheduleInfo?.travelDays ?? null,
              checkIn: hotel.checkin,
              checkOut: hotel.checkout,
              price: hotel.min_total_price.toString(),
              priceLevel: null,
              rating: hotel.review_score ? hotel.review_score / 2.0 : null,
              lat: hotel.latitude,
              lng: hotel.longitude,
              hotelClass: hotel.hotelClass,
              website: hotel.url,
              language: hotel.default_language,
              cityNameEN: hotel.city_name_en,
              imageList: [
                ...hotelPhotos.map(v => {
                  return {
                    ...v,
                    url: v.url_max,
                  };
                }),
              ],
              contact: null,
              weekdayOpeningHours: null,
              reviews: null,
              takeout: null,
              googlePlaceTypes: null,
              url: null,
              userRatingsTotal: null,
              reviewScoreWord: hotel.review_score_word,
            };
          }
          if (tourPlaceType === 'RESTAURANT') {
            const {
              tourPlace: { gglNearbySearchRes: restaurant },
            } = visitSchedule as {
              tourPlace: {
                gglNearbySearchRes: GglNearbySearchRes & {
                  geometry: Gglgeometry;
                  photos: GglPhotos[];
                };
              };
            };

            const detailData: GglPlaceDetailType = await getPlaceDetail({
              placeId: restaurant.place_id ?? '',
            });

            return {
              id: visitSchedule.id.toString(),
              dayCount: visitSchedule.dayNo,
              orderCount: visitSchedule.orderNo,
              planType: visitSchedule.from,
              spotType: tourPlaceType,
              previewImg: (() => {
                return restaurant.photos.length > 0 && restaurant.photos[0].url
                  ? restaurant.photos[0].url
                  : 'none';
              })(),
              spotName: (detailData as { name: string }).name,
              roomType: null,
              spotAddr: restaurant.vicinity,
              // spotAddr: (detailData as { formatted_address: string })
              //   .formatted_address,
              hotelBookingUrl: null,
              placeId: restaurant.place_id,
              startDate: null,
              endDate: null,
              night:
                visitSchedule.queryParams?.metaScheduleInfo?.travelNights ??
                null,
              days:
                visitSchedule.queryParams?.metaScheduleInfo?.travelDays ?? null,
              checkIn: null,
              checkOut: null,
              price: null,
              priceLevel: transPriceLevel(detailData),
              rating: restaurant.rating,
              lat: restaurant.geometry
                ? Number(
                    (
                      JSON.parse(restaurant.geometry?.location) as {
                        lat: string;
                      }
                    ).lat,
                  )
                : null,
              lng: restaurant.geometry
                ? Number(
                    (
                      JSON.parse(restaurant.geometry?.location) as {
                        lngt: string;
                      }
                    ).lngt,
                  )
                : null,
              hotelClass: null,
              reviewScoreWord: null,
              language: null,
              cityNameEN: null,
              // imageList: await getPlacePhoto(detailData),
              imageList: (
                detailData as {
                  photos: {
                    height: number;
                    width: number;
                    html_attributuions: string[];
                    photo_reference: string;
                  }[];
                }
              ).photos.map(v => {
                return {
                  reference: v.photo_reference,
                };
              }),
              contact: (detailData as { formatted_phone_number: string })
                .formatted_phone_number,
              weekdayOpeningHours: (detailData as { weekday_text: string[] })
                .weekday_text,
              reviews: (
                detailData as {
                  reviews: GooglePlaceReview[];
                }
              ).reviews,
              takeout: (detailData as { takeout: boolean }).takeout,
              googlePlaceTypes: (detailData as { types: string[] }).types,
              url: (detailData as { url: string }).url,
              userRatingsTotal: (detailData as { user_ratings_total: number })
                .user_ratings_total,
              website: (detailData as { website: string }).website,
            };
          }

          /// case 'SPOT'
          const {
            tourPlace: { gglNearbySearchRes: spot },
          } = visitSchedule as {
            tourPlace: {
              gglNearbySearchRes: GglNearbySearchRes & {
                geometry: Gglgeometry;
                photos: GglPhotos[];
              };
            };
          };

          const detailData: GglPlaceDetailType = await getPlaceDetail({
            placeId: spot.place_id ?? '',
          });

          return {
            id: visitSchedule.id.toString(),
            dayCount: visitSchedule.dayNo,
            orderCount: visitSchedule.orderNo,
            planType: visitSchedule.from,
            spotType: tourPlaceType ?? 'SPOT',
            previewImg: (() => {
              return spot.photos.length > 0 && spot.photos[0].url
                ? spot.photos[0].url
                : 'none';
            })(),
            spotName: (detailData as { name: string }).name,
            roomType: null,
            spotAddr: spot.vicinity,
            // spotAddr: (detailData as { formatted_address: string })
            //   .formatted_address,
            hotelBookingUrl: null,
            placeId: spot.place_id,
            startDate: null,
            endDate: null,
            night:
              visitSchedule.queryParams?.metaScheduleInfo?.travelNights ?? null,
            days:
              visitSchedule.queryParams?.metaScheduleInfo?.travelDays ?? null,
            checkIn: null,
            checkOut: null,
            price: null,
            priceLevel: transPriceLevel(detailData),
            rating: spot.rating,
            lat: spot.geometry
              ? Number(
                  (
                    JSON.parse(spot.geometry?.location) as {
                      lat: string;
                    }
                  ).lat,
                )
              : null,
            lng: spot.geometry
              ? Number(
                  (
                    JSON.parse(spot.geometry?.location) as {
                      lngt: string;
                    }
                  ).lngt,
                )
              : null,
            hotelClass: null,
            reviewScoreWord: null,
            language: null,
            cityNameEN: null,
            // imageList: await getPlacePhoto(detailData),
            imageList: (
              detailData as {
                photos: {
                  height: number;
                  width: number;
                  html_attributuions: string[];
                  photo_reference: string;
                }[];
              }
            ).photos.map(v => {
              return {
                reference: v.photo_reference,
              };
            }),
            contact: (detailData as { formatted_phone_number: string })
              .formatted_phone_number,
            weekdayOpeningHours: (detailData as { weekday_text: string[] })
              .weekday_text,
            reviews: (
              detailData as {
                reviews: {
                  author_name: string;
                  author_url: string;
                  language: string;
                  original_language: string;
                  profile_photo_url: string;
                  rating: number;
                  relative_time_description: string;
                  text: string;
                  time: number;
                  translated: boolean;
                }[];
              }
            ).reviews,
            takeout: (detailData as { takeout: boolean }).takeout,
            googlePlaceTypes: (detailData as { types: string[] }).types,
            url: (detailData as { url: string }).url,
            userRatingsTotal: (detailData as { user_ratings_total: number })
              .user_ratings_total,
            website: (detailData as { website: string }).website,
          };
        })();

      res.json({
        ...ibDefs.SUCCESS,
        IBparams: retValue,
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

export const getCandidateSchedule = asyncWrapper(
  async (
    req: Express.IBTypedReqBody<GetCandidateScheduleParams>,
    res: Express.IBTypedResponse<GetCandidateScheduleResponse>,
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

      const { scheduleHash, spotType } = req.body;

      const retValue = await (async () => {
        if (spotType.toUpperCase() === 'HOTEL') {
          const queryParams = await prisma.queryParams.findUnique({
            where: {
              scheduleHash,
            },
            include: {
              metaScheduleInfo: true,
              tourPlace: {
                where: {
                  visitSchedule: { none: {} },
                  tourPlaceType: 'HOTEL',
                },
                include: {
                  searchHotelRes: true,
                },
              },
            },
          });
          return {
            id: queryParams?.id.toString() ?? '-1',
            contentsCountAll: queryParams?.tourPlace.length ?? -1,
            spotList: queryParams?.tourPlace.map(v => {
              const hotel = v.searchHotelRes as SearchHotelRes;
              return {
                id: hotel.tourPlaceId.toString(),
                spotType: 'hotel',
                previewImg: hotel.main_photo_url,
                spotName: hotel.hotel_name,
                roomType: hotel.unit_configuration_label,
                spotAddr: hotel.address,
                hotelBookingUrl: hotel.url,
                startDate: moment(queryParams.hotelCheckinDate).format(
                  'YYYY-MM-DD',
                ),
                endDate: moment(queryParams.hotelCheckoutDate).format(
                  'YYYY-MM-DD',
                ),
                night: queryParams.metaScheduleInfo?.travelNights,
                days: queryParams.metaScheduleInfo?.travelDays,
                checkin: hotel.checkin,
                checkout: hotel.checkout,
                price: hotel.min_total_price.toString(),
                rating: hotel.review_score
                  ? hotel.review_score / 2.0
                  : undefined,
                lat: hotel.latitude,
                lng: hotel.longitude,
                imageList: [
                  {
                    id: '1',
                    url: hotel.main_photo_url,
                    text: 'text는 어디에 쓰이는지?',
                  },
                ],
              };
            }),
          };
        }
        if (spotType.toUpperCase() === 'RESTAURANT') {
          const queryParams = await prisma.queryParams.findUnique({
            where: {
              scheduleHash,
            },
            include: {
              metaScheduleInfo: true,
              tourPlace: {
                where: {
                  AND: [
                    {
                      tourPlaceType: 'RESTAURANT',
                    },
                    {
                      visitSchedule: { none: {} },
                    },
                  ],
                },
                include: {
                  gglNearbySearchRes: {
                    include: {
                      photos: true,
                      geometry: true,
                    },
                  },
                },
              },
            },
          });

          return {
            id: queryParams?.id.toString() ?? '-1',
            contentsCountAll: queryParams?.tourPlace.length ?? -1,
            spotList: queryParams?.tourPlace.map(v => {
              const restaurant = v.gglNearbySearchRes as GglNearbySearchRes & {
                geometry: Gglgeometry | null;
                photos: GglPhotos[];
              };

              return {
                id: restaurant.tourPlaceId.toString(),
                spotType: 'restaurant',
                previewImg:
                  restaurant.photos.length > 0 && restaurant.photos[0].url
                    ? restaurant.photos[0].url
                    : 'none',
                spotName: restaurant.name ?? 'none',
                spotAddr: restaurant.vicinity ?? 'none',
                // contact: 'none',
                placeId: restaurant.place_id ?? 'none',
                startDate: moment(queryParams.hotelCheckinDate).format(
                  'YYYY-MM-DD',
                ),
                endDate: moment(queryParams.hotelCheckoutDate).format(
                  'YYYY-MM-DD',
                ),
                night: queryParams.metaScheduleInfo?.travelNights,
                days: queryParams.metaScheduleInfo?.travelDays,
                rating: restaurant.rating ?? undefined,
                lat: restaurant.geometry
                  ? Number(
                      (
                        JSON.parse(restaurant.geometry?.location) as {
                          lat: string;
                        }
                      ).lat,
                    )
                  : undefined,
                lng: restaurant.geometry
                  ? Number(
                      (
                        JSON.parse(restaurant.geometry?.location) as {
                          lngt: string;
                        }
                      ).lngt,
                    )
                  : undefined,
                imageList: restaurant.photos.map(p => {
                  return {
                    id: p.id.toString(),
                    url: p.url ?? 'none',
                    text: 'text는 어디에 쓰이는지?',
                  };
                }),
              };
            }),
          };
        }

        const queryParams = await prisma.queryParams.findUnique({
          where: {
            scheduleHash,
          },
          include: {
            metaScheduleInfo: true,
            tourPlace: {
              where: {
                AND: [
                  {
                    // gglNearbySearchRes: {
                    //   types: {
                    //     none: { value: { equals: 'restaurant' } },
                    //   },
                    // },
                    tourPlaceType: 'SPOT',
                  },
                  {
                    visitSchedule: { none: {} },
                  },
                ],
              },
              include: {
                gglNearbySearchRes: {
                  include: {
                    photos: true,
                    geometry: true,
                  },
                },
              },
            },
          },
        });

        return {
          id: queryParams?.id.toString() ?? '-1',
          contentsCountAll: queryParams?.tourPlace.length ?? -1,
          spotList: queryParams?.tourPlace.map(v => {
            const spot = v.gglNearbySearchRes as GglNearbySearchRes & {
              geometry: Gglgeometry | null;
              photos: GglPhotos[];
            };

            return {
              id: spot.tourPlaceId.toString(),
              spotType: 'spot',
              previewImg:
                spot.photos.length > 0 && spot.photos[0].url
                  ? spot.photos[0].url
                  : 'none',
              spotName: spot.name ?? 'none',
              spotAddr: spot.vicinity ?? 'none',
              // contact: 'none',
              placeId: spot.place_id ?? 'none',
              startDate: moment(queryParams.hotelCheckinDate).format(
                'YYYY-MM-DD',
              ),
              endDate: moment(queryParams.hotelCheckoutDate).format(
                'YYYY-MM-DD',
              ),
              night: queryParams.metaScheduleInfo?.travelNights,
              days: queryParams.metaScheduleInfo?.travelDays,
              rating: spot.rating ?? undefined,
              lat: spot.geometry
                ? Number(
                    (
                      JSON.parse(spot.geometry?.location) as {
                        lat: string;
                      }
                    ).lat,
                  )
                : undefined,
              lng: spot.geometry
                ? Number(
                    (
                      JSON.parse(spot.geometry?.location) as {
                        lngt: string;
                      }
                    ).lngt,
                  )
                : undefined,
              imageList: spot.photos.map(p => {
                return {
                  id: p.id.toString(),
                  url: p.url ?? 'none',
                  text: 'text는 어디에 쓰이는지?',
                };
              }),
            };
          }),
        };
      })();

      res.json({
        ...ibDefs.SUCCESS,
        IBparams: retValue,
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

/// internal dev api function
export const getHotelPhotos = asyncWrapper(
  async (
    req: Express.IBTypedReqBody<{ hotelId: string }>,
    res: Express.IBTypedResponse<{}>,
  ) => {
    const { hotelId } = req.body;
    const options = {
      method: 'GET' as Method,
      url: 'https://booking-com.p.rapidapi.com/v1/hotels/photos',
      params: { locale: 'ko', hotel_id: hotelId ?? '1377073' },
      headers: {
        'X-RapidAPI-Key': `${process.env.RAPID_API_KEY as string}`,
        'X-RapidAPI-Host': 'booking-com.p.rapidapi.com',
      },
    };
    const rawResponse = await axios.request(options);
    res.json({
      ...ibDefs.SUCCESS,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      IBparams: rawResponse.data,
    });
  },
);

export const modifySchedule = asyncWrapper(
  async (
    req: Express.IBTypedReqBody<ModifyScheduleParams>,
    res: Express.IBTypedResponse<ModifyScheduleResponse>,
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

      const { visitScheduleId, candidateSpotType, candidateId } = req.body;

      const visitSchedule = await prisma.visitSchedule.findUnique({
        where: {
          id: Number(visitScheduleId),
        },
      });

      if (!visitSchedule) {
        throw new IBError({
          type: 'NOTEXISTDATA',
          message: '존재하지 않는 visitSchedule 입니다.',
        });
      }

      await prisma.visitSchedule.update({
        where: {
          id: Number(visitScheduleId),
        },
        data: {
          // type: candidateSpotType.toUpperCase() as PlaceType,
          tourPlace: {
            connect: {
              id: Number(candidateId),
            },
            update: {
              tourPlaceType: candidateSpotType.toUpperCase() as PlaceType,
            },
          },
        },
        include: {
          tourPlace: true,
        },
      });

      res.json({
        ...ibDefs.SUCCESS,
        IBparams: {},
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

export const getCandidateDetailSchedule = asyncWrapper(
  async (
    req: Express.IBTypedReqBody<GetCandidateDetailScheduleParams>,
    res: Express.IBTypedResponse<GetCandidateDetailScheduleResponse>,
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

      const { candidateId, candidateSpotType } = req.body;

      const candidateSchedule = await (async () => {
        if (candidateSpotType.toUpperCase() === 'HOTEL') {
          const hotel = await prisma.tourPlace.findUnique({
            where: {
              id: Number(candidateId),
            },
            include: {
              searchHotelRes: true,
              queryParams: {
                include: {
                  metaScheduleInfo: true,
                },
              },
            },
          });
          return hotel;
        }

        /// Google Restaurant, Google Spot
        const gglPlace = await prisma.tourPlace.findUnique({
          where: {
            id: Number(candidateId),
          },
          include: {
            gglNearbySearchRes: {
              include: {
                geometry: true,
                photos: true,
              },
            },
            queryParams: {
              include: {
                metaScheduleInfo: true,
              },
            },
          },
        });
        return gglPlace;
      })();

      if (!candidateSchedule) {
        throw new IBError({
          type: 'NOTEXISTDATA',
          message: 'candidateId 에 대응하는 데이터가 존재하지 않습니다.',
        });
      }

      const retValue =
        await (async (): Promise<GetCandidateDetailScheduleResponsePayload> => {
          if (candidateSpotType.toUpperCase() === 'HOTEL') {
            const hotelTourPlace = candidateSchedule as TourPlace & {
              searchHotelRes: SearchHotelRes;
              queryParams: QueryParams & {
                metaScheduleInfo: MetaScheduleInfo;
              };
            };
            const { searchHotelRes: hotel } = hotelTourPlace;
            const options = {
              method: 'GET' as Method,
              url: 'https://booking-com.p.rapidapi.com/v1/hotels/photos',
              params: {
                locale: 'ko',
                hotel_id: hotel.hotel_id,
              },
              headers: {
                'X-RapidAPI-Key': `${process.env.RAPID_API_KEY as string}`,
                'X-RapidAPI-Host': 'booking-com.p.rapidapi.com',
              },
            };
            const rawResponse = await axios.request(options);
            const hotelPhotos = rawResponse.data as {
              ml_tags: {
                confidence: number;
                tag_id: number;
                tag_type: string;
                tag_name: string;
                photo_id: number;
              }[];
              tags: {
                tag: string;
                id: number;
              }[];
              photo_id: number;
              url_square60: string;
              url_max: string;
              url_1440: string;
            }[];

            return {
              id: hotelTourPlace.id.toString(),
              // dayCount: candidateSchedule.dayNo,
              // orderCount: candidateSchedule.orderNo,
              // planType: candidateSchedule.from,
              spotType: (candidateSpotType as string).toLowerCase(),
              previewImg: hotel.main_photo_url,
              spotName: hotel.hotel_name,
              roomType: hotel.unit_configuration_label,
              spotAddr: hotel.address,
              hotelBookingUrl: hotel.url,
              placeId: null,
              startDate:
                hotelTourPlace && hotelTourPlace.queryParams
                  ? moment(hotelTourPlace.queryParams.hotelCheckinDate).format(
                      'YYYY-MM-DD',
                    )
                  : null,
              endDate:
                hotelTourPlace && hotelTourPlace.queryParams
                  ? moment(hotelTourPlace.queryParams.hotelCheckoutDate).format(
                      'YYYY-MM-DD',
                    )
                  : null,
              night:
                hotelTourPlace.queryParams?.metaScheduleInfo?.travelNights ??
                null,
              days:
                hotelTourPlace.queryParams?.metaScheduleInfo?.travelDays ??
                null,
              checkIn: hotel.checkin,
              checkOut: hotel.checkout,
              price: hotel.min_total_price.toString(),
              priceLevel: null,
              rating: hotel.review_score ? hotel.review_score / 2.0 : null,
              lat: hotel.latitude,
              lng: hotel.longitude,
              hotelClass: hotel.hotelClass,
              website: hotel.url,
              language: hotel.default_language,
              cityNameEN: hotel.city_name_en,
              imageList: [
                ...hotelPhotos.map(v => {
                  return {
                    ...v,
                    url: v.url_max,
                  };
                }),
              ],
              contact: null,
              weekdayOpeningHours: null,
              reviews: null,
              takeout: null,
              googlePlaceTypes: null,
              url: null,
              userRatingsTotal: null,
              reviewScoreWord: hotel.review_score_word,
            };
          }
          if (candidateSpotType.toUpperCase() === 'RESTAURANT') {
            const restaurantTourPlace = candidateSchedule as TourPlace & {
              gglNearbySearchRes: GglNearbySearchRes & {
                geometry: Gglgeometry;
                photos: GglPhotos[];
              };
              queryParams: QueryParams & {
                metaScheduleInfo: MetaScheduleInfo;
              };
            };

            const { gglNearbySearchRes: restaurant } = restaurantTourPlace;

            const detailData: GglPlaceDetailType = await getPlaceDetail({
              placeId: restaurant.place_id ?? '',
            });

            return {
              id: restaurantTourPlace.id.toString(),
              // dayCount: restaurantTourPlace.dayNo,
              // orderCount: restaurantTourPlace.orderNo,
              // planType: restaurantTourPlace.from,
              spotType: (candidateSpotType as string).toLowerCase(),
              previewImg: (() => {
                return restaurant.photos.length > 0 && restaurant.photos[0].url
                  ? restaurant.photos[0].url
                  : 'none';
              })(),
              spotName: (detailData as { name: string }).name,
              roomType: null,
              spotAddr: restaurant.vicinity,
              // spotAddr: (detailData as { formatted_address: string })
              //   .formatted_address,
              hotelBookingUrl: null,
              placeId: restaurant.place_id,
              startDate: null,
              endDate: null,
              night:
                restaurantTourPlace.queryParams?.metaScheduleInfo
                  ?.travelNights ?? null,
              days:
                restaurantTourPlace.queryParams?.metaScheduleInfo?.travelDays ??
                null,
              checkIn: null,
              checkOut: null,
              price: null,
              priceLevel: transPriceLevel(detailData),
              rating: restaurant.rating,
              lat: restaurant.geometry
                ? Number(
                    (
                      JSON.parse(restaurant.geometry?.location) as {
                        lat: string;
                      }
                    ).lat,
                  )
                : null,
              lng: restaurant.geometry
                ? Number(
                    (
                      JSON.parse(restaurant.geometry?.location) as {
                        lngt: string;
                      }
                    ).lngt,
                  )
                : null,
              hotelClass: null,
              reviewScoreWord: null,
              language: null,
              cityNameEN: null,
              // imageList: await getPlacePhoto(detailData),
              imageList: (
                detailData as {
                  photos: {
                    height: number;
                    width: number;
                    html_attributuions: string[];
                    photo_reference: string;
                  }[];
                }
              ).photos.map(v => {
                return {
                  reference: v.photo_reference,
                };
              }),
              contact: (detailData as { formatted_phone_number: string })
                .formatted_phone_number,
              weekdayOpeningHours: (detailData as { weekday_text: string[] })
                .weekday_text,
              reviews: (
                detailData as {
                  reviews: GooglePlaceReview[];
                }
              ).reviews,
              takeout: (detailData as { takeout: boolean }).takeout,
              googlePlaceTypes: (detailData as { types: string[] }).types,
              url: (detailData as { url: string }).url,
              userRatingsTotal: (detailData as { user_ratings_total: number })
                .user_ratings_total,
              website: (detailData as { website: string }).website,
            };
          }

          /// case 'SPOT'
          const spotTourPlace = candidateSchedule as TourPlace & {
            gglNearbySearchRes: GglNearbySearchRes & {
              geometry: Gglgeometry;
              photos: GglPhotos[];
            };
            queryParams: QueryParams & {
              metaScheduleInfo: MetaScheduleInfo;
            };
          };

          const { gglNearbySearchRes: spot } = spotTourPlace;
          const detailData: GglPlaceDetailType = await getPlaceDetail({
            placeId: spot.place_id ?? '',
          });

          return {
            id: spotTourPlace.id.toString(),
            // dayCount: candidateSchedule.dayNo,
            // orderCount: candidateSchedule.orderNo,
            // planType: candidateSchedule.from,
            spotType: (candidateSpotType as string).toLowerCase(),
            previewImg: (() => {
              return spot.photos.length > 0 && spot.photos[0].url
                ? spot.photos[0].url
                : 'none';
            })(),
            spotName: (detailData as { name: string }).name,
            roomType: null,
            spotAddr: spot.vicinity,
            // spotAddr: (detailData as { formatted_address: string })
            //   .formatted_address,
            hotelBookingUrl: null,
            placeId: spot.place_id,
            startDate: null,
            endDate: null,
            night:
              candidateSchedule.queryParams?.metaScheduleInfo?.travelNights ??
              null,
            days:
              candidateSchedule.queryParams?.metaScheduleInfo?.travelDays ??
              null,
            checkIn: null,
            checkOut: null,
            price: null,
            priceLevel: transPriceLevel(detailData),
            rating: spot.rating,
            lat: spot.geometry
              ? Number(
                  (
                    JSON.parse(spot.geometry?.location) as {
                      lat: string;
                    }
                  ).lat,
                )
              : null,
            lng: spot.geometry
              ? Number(
                  (
                    JSON.parse(spot.geometry?.location) as {
                      lngt: string;
                    }
                  ).lngt,
                )
              : null,
            hotelClass: null,
            reviewScoreWord: null,
            language: null,
            cityNameEN: null,
            // imageList: await getPlacePhoto(detailData),
            imageList: (
              detailData as {
                photos: {
                  height: number;
                  width: number;
                  html_attributuions: string[];
                  photo_reference: string;
                }[];
              }
            ).photos.map(v => {
              return {
                reference: v.photo_reference,
              };
            }),
            contact: (detailData as { formatted_phone_number: string })
              .formatted_phone_number,
            weekdayOpeningHours: (detailData as { weekday_text: string[] })
              .weekday_text,
            reviews: (
              detailData as {
                reviews: {
                  author_name: string;
                  author_url: string;
                  language: string;
                  original_language: string;
                  profile_photo_url: string;
                  rating: number;
                  relative_time_description: string;
                  text: string;
                  time: number;
                  translated: boolean;
                }[];
              }
            ).reviews,
            takeout: (detailData as { takeout: boolean }).takeout,
            googlePlaceTypes: (detailData as { types: string[] }).types,
            url: (detailData as { url: string }).url,
            userRatingsTotal: (detailData as { user_ratings_total: number })
              .user_ratings_total,
            website: (detailData as { website: string }).website,
          };
        })();

      res.json({
        ...ibDefs.SUCCESS,
        IBparams: retValue,
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
 * internal 테스트용 구글 textSearch를 수행 요청하는 api endpoint 함수
 */
export const textSearch = asyncWrapper(
  async (
    req: Express.IBTypedReqBody<TextSearchReqParams>,
    res: Express.IBTypedResponse<TextSearchResponse>,
  ) => {
    // const { nearbySearchResult } = await nearbySearchInnerAsyncFn(req.body);
    const textSearchReqParams = req.body;

    const textSearchResult = await getAllTextSearchPages({
      textSearchReqParams,
      loopLoadAll: textSearchReqParams.loadAll,
    });

    res.json({
      ...ibDefs.SUCCESS,
      IBparams: {
        textSearchCount: textSearchResult.length,
        textSearchResult: textSearchResult.map(v => v.name),
      },
    });
  },
);

/**
 * internal 제주 관광공사 jeju visit 관광 데이터를 요청하여 반환한다.
 */
export const getVisitJejuData = asyncWrapper(
  async (
    req: Express.IBTypedReqBody<SyncVisitJejuDataReqParams>,
    res: Express.IBTypedResponse<SyncVisitJejuDataResponse>,
  ) => {
    const syncVisitJejuDataReqParams = req.body;
    const jejuRes = await getVisitJejuDataInnerAsyncFn(
      syncVisitJejuDataReqParams,
    );

    res.json({
      ...ibDefs.SUCCESS,
      IBparams: jejuRes,
    });
  },
);

scheduleRouter.post('/nearbySearch', nearbySearch);
scheduleRouter.post('/googleTextSearch', textSearch);
scheduleRouter.post('/searchHotel', searchHotel);
scheduleRouter.post('/compositeSearch', compositeSearch);
scheduleRouter.post('/getListQueryParams', getListQueryParams);
// scheduleRouter.post('/getRecommendList', getRecommendList);
scheduleRouter.post(
  '/getRecommendListWithLatLngt',
  getRecommendListWithLatLngt,
);
// scheduleRouter.post('/validNearbySearchPageToken', validNearbySearchPageToken);
scheduleRouter.post('/prismaTest', prismaTest);
scheduleRouter.post(
  '/filtersForSearchFromBookingCom',
  filtersForSearchFromBookingCom,
);
scheduleRouter.post(
  '/searchLocationsFromBookingCom',
  searchLocationsFromBookingCom,
);
scheduleRouter.post('/addMockHotelResource', addMockHotelResource);
scheduleRouter.post(
  '/addMockSearchLocationsResource',
  addMockSearchLocationsResource,
);

scheduleRouter.post('/reqSchedule', accessTokenValidCheck, reqSchedule);
scheduleRouter.post('/getSchedule', accessTokenValidCheck, getSchedule);
scheduleRouter.post('/getScheduleList', accessTokenValidCheck, getScheduleList);
scheduleRouter.post('/saveSchedule', accessTokenValidCheck, saveSchedule);
scheduleRouter.post('/getDaySchedule', accessTokenValidCheck, getDaySchedule);
scheduleRouter.post(
  '/getDetailSchedule',
  accessTokenValidCheck,
  getDetailSchedule,
);
scheduleRouter.post(
  '/getCandidateSchedule',
  accessTokenValidCheck,
  getCandidateSchedule,
);
scheduleRouter.post('/getHotelPhotos', getHotelPhotos);
scheduleRouter.post('/modifySchedule', accessTokenValidCheck, modifySchedule);
scheduleRouter.post(
  '/getCandidateDetailSchedule',
  accessTokenValidCheck,
  getCandidateDetailSchedule,
);
scheduleRouter.post('/getVisitJejuData', getVisitJejuData);

export default scheduleRouter;
