/* eslint-disable @typescript-eslint/naming-convention */

import express from 'express';
// import prisma from '@src/prisma';
import {
  ibDefs,
  asyncWrapper,
  IBResFormat,
  IBError,
  getToday,
  getTomorrow,
} from '@src/utils';
import axios, { AxiosResponse, Method } from 'axios';
import prisma from '@src/prisma';
import {
  PrismaClient,
  SearchHotelRes,
  Prisma,
  GglNearbySearchRes,
  Gglgeometry,
} from '@prisma/client';
import moment from 'moment';
import { omit, isEmpty, isNumber, isNil, isUndefined } from 'lodash';
import {
  QueryReqParams,
  defaultNearbySearchReqParams,
  defaultSearchHotelReqParams,
  NearbySearchInnerAsyncFnRes,
  SearchedData,
  GetListQueryParamsReqParams,
  // OrderSortType,
  // GetRecommendListReqParams,
  // GetRecommendListResponse,
  // GetRecommendListInnerAsyncFnResponse,
  GetRecommendListWithLatLngtReqParams,
  GetRecommendListWithLatLngtResponse,
  GetRecommendListWithLatLngtInnerAsyncFnResponse,
  VisitSchedules,
  defaultQueryParams,
  NearbySearchResponse,
  SearchHotelResponse,
  CompositeSearchResponse,
  GetListQueryParamsResponse,
  GetListQueryParamsInnerAsyncFnResponse,
  SearchLocationsFromBookingComReqParams,
  SearchLocationsFromBookingComResponse,
  SearchLocationsFromBookingComRawResponse,
  SearchLocationsFromBookingComInnerAsyncFnResponse,
  FiltersForSearchFromBookingComReqParams,
  FiltersForSearchFromBookingComResponse,
  FiltersForSearchFromBookingComInnerAsyncFnResponse,
  FiltersForSearchFromBookingRawResponse,
  getQueryParamsForRestaurant,
  getQueryParamsForTourSpot,
} from './types/schduleTypes';

const scheduleRouter: express.Application = express();
const mealPerDay = 2;
const spotPerDay = 2;
export const minHotelBudgetPortion = 0.5;
export const midHotelBudgetPortion = 0.6;
export const maxHotelBudgetPortion = 0.7;
// const hotelPerDay = 1;

const createQueryParamId = async (
  prismaX: Omit<
    PrismaClient<
      Prisma.PrismaClientOptions,
      never,
      Prisma.RejectOnNotFound | Prisma.RejectPerOperation | undefined
    >,
    '$connect' | '$disconnect' | '$on' | '$transaction' | '$use'
  >,
  params: QueryReqParams,
  ifAlreadyQueryId?: number,
) => {
  const { nearbySearchReqParams, searchHotelReqParams } = params;
  const {
    keyword,
    radius,
    location: { latitude: nearbySearchLat, longitude: nearbySearchLngt },
  } = nearbySearchReqParams ?? defaultNearbySearchReqParams;

  const {
    orderBy,
    adultsNumber,
    roomNumber,
    checkinDate,
    checkoutDate,
    filterByCurrency,
    latitude: paramLat,
    longitude: paramLngt,
    childrenAges,
    childrenNumber,
    categoriesFilterIds,
    includeAdjacency,
    // mock
  } = searchHotelReqParams ?? defaultSearchHotelReqParams;

  if (ifAlreadyQueryId && ifAlreadyQueryId > 0) return ifAlreadyQueryId;

  const queryParamResult = await prismaX.queryParams.create({
    data: {
      keyword: isEmpty(keyword) ? null : keyword,
      radius: radius > 0 ? radius : null,
      latitude: parseFloat(nearbySearchLat ?? paramLat),
      longitude: parseFloat(nearbySearchLngt ?? paramLngt),
      hotelOrderBy: orderBy,
      hotelAdultsNumber: adultsNumber,
      hotelRoomNumber: roomNumber,
      hotelCheckinDate: new Date(checkinDate),
      hotelCheckoutDate: new Date(checkoutDate),
      hotelFilterByCurrency: isEmpty(filterByCurrency)
        ? null
        : filterByCurrency,
      hotelChildrenAges: childrenAges?.toString(),
      hotelChildrenNumber: childrenNumber,
      hotelCategoriesFilterIds: categoriesFilterIds?.toString(),
      hotelIncludeAdjacency: includeAdjacency,
    },
  });
  return queryParamResult.id;
};

export const getTravelNights = (
  checkinDate: Date,
  checkoutDate: Date,
): number => {
  const mCheckinDate = moment(checkinDate);
  const mCheckoutDate = moment(checkoutDate);

  return Math.floor(moment.duration(mCheckoutDate.diff(mCheckinDate)).asDays());
};

const storeDataRelatedWithQueryParams = async (
  queryReqParams: QueryReqParams,
  response: AxiosResponse,
  ifAlreadyQueryId?: number,
) => {
  let queryParamId: number = -1;
  let results: google.maps.places.IBPlaceResult[] = [];
  if (response?.statusText === 'OK') {
    queryParamId = await createQueryParamId(
      prisma,
      queryReqParams,
      ifAlreadyQueryId,
    );

    results =
      (
        response.data as Partial<{
          results: google.maps.places.IBPlaceResult[];
        }>
      ).results ?? [];

    const promises = results.map((item: google.maps.places.IBPlaceResult) => {
      return prisma.gglNearbySearchRes.create({
        data: {
          QueryParams: {
            connect: {
              id: queryParamId,
            },
          },
          geometry: {
            create: {
              location: JSON.stringify({
                lat: item.geometry?.location?.lat,
                lngt: item.geometry?.location?.lng,
              }),
              viewport: JSON.stringify({
                northeast: {
                  lat: item.geometry?.viewport?.northeast?.lat,
                  lngt: item.geometry?.viewport?.northeast?.lng,
                },
                southwest: {
                  lat: item.geometry?.viewport?.southwest?.lat,
                  lngt: item.geometry?.viewport?.southwest?.lng,
                },
              }),
            },
          },
          icon: item.icon,
          icon_background_color: item.icon_background_color,
          icon_mask_base_uri: item.icon_mask_base_uri,
          name: item.name,
          opening_hours:
            (
              item.opening_hours as Partial<{
                open_now: boolean;
              }>
            )?.open_now ?? false,
          place_id: item.place_id,
          price_level: item.price_level,
          rating: item.rating,
          types: (() => {
            return item.types
              ? {
                  connectOrCreate: item.types?.map(type => {
                    return {
                      create: { value: type },
                      where: { value: type },
                    };
                  }),
                }
              : {
                  create: {
                    value: 'Not Applicaple',
                  },
                };
          })(),
          user_ratings_total: item.user_ratings_total,
          vicinity: item.vicinity,
          plus_code: {
            create: {
              compund_code: item.plus_code?.compound_code ?? '',
              global_code: item.plus_code?.global_code ?? '',
            },
          },
          photos: {
            create: item.photos?.map(photo => {
              return {
                height: photo.height,
                width: photo.width,
                html_attributuions: JSON.stringify(photo.html_attributions),
                photo_reference:
                  (photo as Partial<{ photo_reference: string }>)
                    .photo_reference ?? '',
              };
            }),
          },
        },
      });
    });

    try {
      await Promise.all(promises);
    } catch (e) {
      await prisma.queryParams.delete({
        where: {
          id: queryParamId,
        },
      });
      throw e;
    }
  }
  return { results, queryParamId };
};

const searchLocationsFromBookingComInnerAsyncFn = async (
  params: SearchLocationsFromBookingComReqParams,
): Promise<SearchLocationsFromBookingComInnerAsyncFnResponse[]> => {
  const { name, mock = true } = params;

  if (mock) {
    const responseData = await prisma.mockBookingDotComHotelResource.findFirst({
      where: {
        reqType: 'SEARCH_LOCATIONS',
      },
      orderBy: [{ id: 'desc' }],
    });
    const result = responseData
      ? (JSON.parse(
          responseData?.responseData,
        ) as SearchLocationsFromBookingComRawResponse[])
      : [];
    return result;
  }
  const options = {
    method: 'GET' as Method,
    url: 'https://booking-com.p.rapidapi.com/v1/hotels/locations',
    params: { locale: 'en-us', name },
    headers: {
      'X-RapidAPI-Key': process.env.RAPID_API_KEY ?? '',
      'X-RapidAPI-Host': 'booking-com.p.rapidapi.com',
    },
  };
  try {
    const rawResponse = await axios.request(options);
    const fetchedData =
      rawResponse.data as SearchLocationsFromBookingComRawResponse[];
    return fetchedData;
  } catch (err) {
    throw new IBError({
      type: 'EXTERNALAPI',
      message: (err as Error).message,
    });
  }
};

const filterForSearchFromBookingComInnerAsyncFn = async (
  params: FiltersForSearchFromBookingComReqParams,
): Promise<FiltersForSearchFromBookingComInnerAsyncFnResponse> => {
  const {
    adultsNumber,
    destType,
    orderBy,
    checkoutDate,
    checkinDate,
    filterByCurrency,
    destId,
    roomNumber,
    categoriesFilterIds,
    childrenNumber,
    includeAdjacency,
    pageNumber,
    childrenAges,
  } = params;

  const options = {
    method: 'GET' as Method,
    url: 'https://booking-com.p.rapidapi.com/v1/hotels/search-filters',
    params: {
      adults_number: adultsNumber?.toString() ?? '2',
      dest_type: destType ?? 'region',
      order_by: orderBy ?? 'popularity',
      checkin_date:
        moment(checkinDate).format('YYYY-MM-DD') ??
        moment(getToday()).format('YYYY-MM-DD'),
      checkout_date:
        moment(checkoutDate).format('YYYY-MM-DD') ??
        moment(getTomorrow()).format('YYYY-MM-DD'),
      locale: 'en-us',
      units: 'metric',
      filter_by_currency: filterByCurrency ?? 'USD',
      dest_id: destId?.toString() ?? '3185',
      room_number: roomNumber?.toString() ?? '1',
      categories_filter_ids:
        isUndefined(categoriesFilterIds) ||
        categoriesFilterIds?.toString() === ''
          ? undefined
          : categoriesFilterIds?.toString(),
      children_number:
        childrenNumber && childrenNumber >= 1
          ? childrenNumber.toString()
          : undefined,
      include_adjacency: includeAdjacency ?? 'true',
      page_number: pageNumber?.toString() ?? '0',
      children_ages:
        isUndefined(childrenAges) || childrenAges?.toString() === ''
          ? undefined
          : childrenAges?.toString(),
    },
    headers: {
      'X-RapidAPI-Key': (process.env.RAPID_API_KEY as string) ?? '',
      'X-RapidAPI-Host': 'booking-com.p.rapidapi.com',
    },
  };

  const rawResponse = await axios.request(options);

  const fetchedData =
    rawResponse.data as FiltersForSearchFromBookingRawResponse;

  return fetchedData.filter;
};

const nearbySearchInnerAsyncFn = async (
  queryReqParams: QueryReqParams,
  ifAlreadyQueryId?: number,
  // compositeSearch?: {
  //   checkinDate: Date;
  //   checkoutDate: Date;
  // },
): Promise<NearbySearchInnerAsyncFnRes> => {
  const {
    nearbySearchReqParams: { location, radius, pageToken, keyword },
  } = queryReqParams;

  const queryUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?keyword=${
    keyword ?? ''
  }&location=${location?.latitude}%2C${
    location?.longitude
  }&radius=${radius}&key=${process.env.GCP_MAPS_APIKEY as string}${
    pageToken ? `&pagetoken=${pageToken}` : ''
  }`;
  console.log(queryUrl);

  const response = await axios.get(queryUrl);
  // if (compositeSearch) {
  //   const travelDays = getTravelNights(
  //     compositeSearch.checkinDate,
  //     compositeSearch.checkoutDate,
  //   );
  //   let { results } = response.data as Partial<{
  //     results: google.maps.places.IBPlaceResult[];
  //   }>;
  //   const retryLimit = 5;
  //   let retry = 1;
  //   while (
  //     results &&
  //     results.length < travelDays * spotPerDay &&
  //     retry <= retryLimit
  //   ) {
  //     const reQueryUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?keyword=${keyword}&location=${
  //       location?.latitude
  //     }%2C${location?.longitude}&radius=${radius * (1 + retry)}&key=${
  //       process.env.GCP_MAPS_APIKEY as string
  //     }${pageToken ? `&pagetoken=${pageToken}` : ''}`;
  //     console.log(`[retry:${retry}]: ${reQueryUrl}`);

  //     // eslint-disable-next-line no-await-in-loop
  //     response = await axios.get(reQueryUrl);
  //     results = (
  //       response.data as Partial<{
  //         results: google.maps.places.IBPlaceResult[];
  //       }>
  //     ).results;
  //     // console.log(`nearbySearch numOfResult: ${results ? results.length : 0}`);
  //     retry += 1;
  //   }
  // }

  const { results, queryParamId } = await storeDataRelatedWithQueryParams(
    queryReqParams,
    response,
    ifAlreadyQueryId,
  );
  // console.log(JSON.stringify(response.data, null, 2));
  // console.log(`response.status: ${response.status}`);
  // console.log(`response.statusText: ${response.statusText}`);
  return {
    nearbySearchResult: results,
    queryParamId,
    pageToken: (response.data as Partial<{ next_page_token: string }>)
      .next_page_token,
  };
};

const getAllNearbySearchPages = async (
  queryReqParams: QueryReqParams,
  ifAlreadyQueryId?: number,
  loopLoadAll = false,
): Promise<google.maps.places.IBPlaceResult[]> => {
  let retry = 1;
  const retryLimit = 5;

  // do while loop
  // do {
  //   const loopQueryParams: QueryReqParams = {
  //     nearbySearchReqParams: {
  //       ...queryReqParams.nearbySearchReqParams,
  //       pageToken: loopPageToken ?? '',
  //     },
  //     searchHotelReqParams: queryReqParams.searchHotelReqParams,
  //   };
  //   // eslint-disable-next-line no-await-in-loop
  //   const loopTemp = await nearbySearchInnerAsyncFn(
  //     loopQueryParams,
  //     queryParamId,
  //   );

  //   loopResult = [...loopResult, ...loopTemp.nearbySearchResult];
  //   loopPageToken = loopTemp.pageToken ?? '';
  //   retry += 1;
  //   console.log(retry);
  // } while (loopLoadAll && !isEmpty(loopPageToken) && retry <= retryLimit);

  // recursion
  const loopFunc = async (curPageToken: string) => {
    const loopQueryParams: QueryReqParams = {
      ...defaultQueryParams,
      nearbySearchReqParams: {
        ...queryReqParams.nearbySearchReqParams,
        pageToken: curPageToken ?? '',
      },
      searchHotelReqParams: queryReqParams.searchHotelReqParams,
    };
    // eslint-disable-next-line no-await-in-loop
    const loopTemp = await nearbySearchInnerAsyncFn(
      loopQueryParams,
      ifAlreadyQueryId,
    );

    const nextPageToken = loopTemp.pageToken ?? '';
    const stopLoop = !loopLoadAll;
    retry += 1;

    if (stopLoop || isEmpty(nextPageToken) || retry > retryLimit)
      return [...loopTemp.nearbySearchResult];

    // const subResults: google.maps.places.IBPlaceResult[];
    const subResults = await new Promise(resolve => {
      setTimeout(() => {
        loopFunc(nextPageToken)
          .then(promiseRes => {
            resolve(promiseRes);
          })
          .catch(err => {
            console.error(err);
            resolve([] as google.maps.places.IBPlaceResult[]);
          });
      }, 2000);
    });

    let loopResult: google.maps.places.IBPlaceResult[] = [];
    loopResult = [
      ...(subResults as google.maps.places.IBPlaceResult[]),
      ...loopTemp.nearbySearchResult,
    ];

    return loopResult;
  };
  const loopFuncRes = await loopFunc(
    queryReqParams.nearbySearchReqParams.pageToken ?? '',
  );

  return loopFuncRes;
};

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

const searchHotelInnerAsyncFn = async (
  queryReqParams: QueryReqParams,
  ifAlreadyQueryId?: number,
) => {
  const { searchHotelReqParams } = queryReqParams;
  // const {
  //   keyword,
  //   radius,
  //   location: { latitude: nearbySearchLat, longitude: nearbySearchLngt },
  // } = nearbySearchReqParams ?? defaultNearbySearchReqParams;

  const {
    orderBy = 'popularity',
    adultsNumber = 2,
    roomNumber = 1,
    checkinDate = getToday(),
    checkoutDate = getTomorrow(),
    filterByCurrency = 'USD',
    latitude: paramLat,
    longitude: paramLngt,
    pageNumber = 0,
    includeAdjacency = true,
    childrenAges,
    childrenNumber,
    categoriesFilterIds,
    mock = true,
  } = searchHotelReqParams ?? defaultSearchHotelReqParams;

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

  const data = await (async () => {
    if (mock) {
      const responseData =
        await prisma.mockBookingDotComHotelResource.findFirst({
          where: {
            reqType: 'SEARCH_HOTELS_BY_COORDINATES',
          },
          orderBy: [{ id: 'desc' }],
        });
      const { result } = responseData
        ? (JSON.parse(responseData?.responseData) as {
            result: SearchedData[];
          })
        : { result: [] };
      return result;
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
        include_adjacency: includeAdjacency ?? 'false',
        ...(isNumber(childrenNumber) && {
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

    const { result } = response.data as { result: SearchedData[] };

    return result;
  })();

  let queryParamId: number = -1;
  queryParamId = await createQueryParamId(
    prisma,
    queryReqParams,
    ifAlreadyQueryId,
  );

  // const queryParamResult = await prismaX.queryReqParams.create({
  //   data: {
  //     latitude: paramLat,
  //     longitude: paramLngt,
  //     hotelOrderBy: orderBy ?? 'popularity',
  //     hotelAdultsNumber: adultsNumber,
  //     hotelUnits: 'metric',
  //     hotelRoomNumber: roomNumber ?? 1,
  //     hotelCheckinDate: new Date(checkinDate),
  //     hotelCheckoutDate: new Date(checkoutDate),
  //     hotelFilterByCurrency: filterByCurrency ?? 'USD',
  //   },
  // });

  const createSearchHotelResPromises = data.map(item => {
    const {
      min_total_price,
      composite_price_breakdown: {
        product_price_breakdowns: [
          {
            gross_amount: { value: gross_amount },
          },
        ],
        included_taxes_and_charges_amount: {
          value: included_taxes_and_charges_amount,
        },
        net_amount: { value: net_amount },
      },
      countrycode,
      default_language,
      address,
      city,
      city_name_en,
      checkin: { from: checkin },
      checkout: { until: checkout },
      distance,
      review_score_word,
      review_score,
      // currency,
      currency_code,
      timezone,
      urgency_message,
      hotel_id,
      hotel_name,
      latitude,
      longitude,
      url,
      accommodation_type_name,
      zip,
      main_photo_url,
      max_photo_url,
      hotel_facilities,
      // has_swimming_pool,
    } = item;

    return prisma.searchHotelRes.create({
      data: {
        QueryParams: {
          connect: {
            id: queryParamId,
          },
        },
        min_total_price,
        gross_amount,
        included_taxes_and_charges_amount,
        net_amount,
        countrycode,
        default_language,
        address,
        city,
        city_name_en,
        checkin,
        checkout,
        distance: parseFloat(distance),
        review_score_word,
        review_score,
        currency_code,
        timezone,
        urgency_message,
        hotel_id,
        hotel_name,
        latitude,
        longitude,
        url,
        accommodation_type_name,
        zip,
        main_photo_url,
        max_photo_url,
        hotel_facilities,
        // has_swimming_pool,
      },
    });
  });

  try {
    await Promise.all(createSearchHotelResPromises);
  } catch (e) {
    await prisma.queryParams.delete({
      where: {
        id: queryParamId,
      },
    });
    throw e;
  }

  return { hotelSearchResult: data, queryParamId };
};

export const searchHotel = asyncWrapper(
  async (
    req: Express.IBTypedReqBody<QueryReqParams>,
    res: Express.IBTypedResponse<SearchHotelResponse>,
  ) => {
    // const {
    //   body: {
    // orderBy,
    // adultsNumber,
    // roomNumber,
    // checkinDate,
    // checkoutDate,
    // filterByCurrency,
    // latitude: paramLat,
    // longitude: paramLngt,
    // pageNumber,
    // includeAdjacency,
    // mock,
    //   },
    // } = req;

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
        console.log(`radiusExtendRetry:${radiusExtendRetry}`);
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

const getListQueryParamsInnerAsyncFn = async (
  params: GetListQueryParamsReqParams,
): Promise<GetListQueryParamsInnerAsyncFnResponse> => {
  // const { id, hotelSearch, nearbySearch: nearbySearchX } = params;
  // const hotelOrderBy = hotelSearch!.orderBy;
  // const nearbyOrderBy = nearbySearchX!.orderBy;
  // const cond: {
  //   where: { id: number } | undefined;
  //   include: {
  //     searchHotelRes: {
  //       select?: Record<keyof SearchHotelRes, boolean>;
  //       orderBy?:
  //         | {
  //             [x: string]: OrderSortType;
  //           }[]
  //         | undefined;
  //     };
  //     gglNearbySearchRes: {
  //       select?: Record<keyof GglNearbySearchRes, boolean>;
  //       orderBy?:
  //         | {
  //             [x: string]: OrderSortType;
  //           }[]
  //         | undefined;
  //     };
  //   };
  // } = {
  //   where: id ? { id } : undefined,
  //   include: {
  //     searchHotelRes: {
  //       select: hotelSearch!.select ?? undefined,
  //       orderBy:
  //         hotelOrderBy && hotelOrderBy.length > 0
  //           ? hotelOrderBy.map(item => {
  //               return { [`${item.column}`]: item?.sort ?? 'asc' };
  //             })
  //           : undefined,
  //     },
  //     gglNearbySearchRes: {
  //       select: nearbySearchX!.select ?? undefined,
  //       orderBy:
  //         nearbyOrderBy && nearbyOrderBy.length > 0
  //           ? nearbyOrderBy.map(item => {
  //               return { [`${item.column}`]: item?.sort ?? 'asc' };
  //             })
  //           : undefined,
  //     },
  //   },
  // };

  // if (!cond.include.searchHotelRes.select) {
  //   const { searchHotelRes } = cond.include;
  //   const newSearchHotelRes = omit(searchHotelRes, ['select']);
  //   cond.include.searchHotelRes = newSearchHotelRes;
  // }
  // if (!cond.include.searchHotelRes.orderBy) {
  //   const { searchHotelRes } = cond.include;
  //   const newSearchHotelRes = omit(searchHotelRes, ['orderBy']);
  //   cond.include.searchHotelRes = newSearchHotelRes;
  // }

  // if (!cond.include.gglNearbySearchRes.select) {
  //   const { gglNearbySearchRes } = cond.include;
  //   const newGglNearbySearchRes = omit(gglNearbySearchRes, ['select']);
  //   cond.include.gglNearbySearchRes = newGglNearbySearchRes;
  // }
  // if (!cond.include.gglNearbySearchRes.orderBy) {
  //   const { gglNearbySearchRes } = cond.include;
  //   const newGglNearbySearchRes = omit(gglNearbySearchRes, ['orderBy']);
  //   cond.include.gglNearbySearchRes = newGglNearbySearchRes;
  // }

  // const queryParamsDataFromDB = await prisma.queryParams.findMany(cond);
  // return queryParamsDataFromDB as GetListQueryParamsInnerAsyncFnResponse;

  const queryParamsDataFromDB = await prisma.queryParams.findMany(params);

  // const queryParamsDataFromDB = await prisma.queryParams.findMany({
  //   where: {
  //     id: 203,
  //   },
  //   include: {
  //     gglNearbySearchRes: {
  //       include: {
  //         types: true,
  //       },
  //       where: {
  //         types: {
  //           some: {
  //             value: {
  //               equals: 'restaurant',
  //             },
  //           },
  //         },
  //       },
  //       // include: {

  //       //   types: true,
  //       // },
  //     },
  //     searchHotelRes: {
  //       orderBy: [
  //         {
  //           review_score: 'desc',
  //         },
  //         {
  //           distance: 'asc',
  //         },
  //       ],
  //       select: {
  //         hotel_name: true,
  //         review_score: true,
  //         distance: true,
  //       },
  //     },
  //   },
  // });
  return queryParamsDataFromDB as GetListQueryParamsInnerAsyncFnResponse;
};

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

const evalSperatedPlaces = ({
  searchHotelRes,
  touringSpotGglNearbySearchRes,
  restaurantGglNearbySearchRes,
}: {
  searchHotelRes: SearchHotelRes[];
  touringSpotGglNearbySearchRes: (GglNearbySearchRes & {
    geometry: Gglgeometry;
  })[];
  restaurantGglNearbySearchRes: (GglNearbySearchRes & {
    geometry: Gglgeometry;
  })[];
}) => {
  type LatLngt = { lat: number; lngt: number };
  type MetaDataForSpike = {
    distances: number[];
    delta: number[];
    deltaAvg: number[];
    deltaSepAvg: number[];
    seperatedIdxs: number[];
  };
  type DistanceMap = {
    withHotel: {
      data: SearchHotelRes[];
      metaDataForDistance: MetaDataForSpike;
    };
    withRestaurant: {
      data: (GglNearbySearchRes & { geometry: Gglgeometry })[];
      metaDataForDistance: MetaDataForSpike;
    };
    withSpot: {
      data: (GglNearbySearchRes & { geometry: Gglgeometry })[];
      metaDataForDistance: MetaDataForSpike;
    };
  }[];
  const getDistance = ({
    startPoint,
    endPoint,
  }: {
    startPoint: LatLngt;
    endPoint: LatLngt;
  }) => {
    return (
      (endPoint.lat - startPoint.lat) ** 2 +
      (endPoint.lngt - startPoint.lngt) ** 2
    );
  };

  const evalMetaData = (withXDistances: number[]): MetaDataForSpike => {
    let prevValue = 0;
    const withXDelta = withXDistances.map(v => {
      const retValue = v - prevValue;
      prevValue = v;
      return retValue;
    });

    let sum = 0;
    const withXDeltaAvg = withXDelta.map((v, i) => {
      sum += v;
      return sum / (i + 1);
    });
    const calibValue = 1.7;
    const totalDeltaAvg = sum / withXDelta.length;
    const withHotelCalibDeltaAvg = withXDeltaAvg.map(v => calibValue * v);

    sum = 0;
    const withXDeltaSepAvg = withXDelta.map((d, i) => {
      sum += d;
      const curSeperatedAvg = sum / (i + 1);
      // let seperatedIdx = -1;
      if (
        d > totalDeltaAvg * calibValue &&
        d > curSeperatedAvg &&
        d > withHotelCalibDeltaAvg[i]
      ) {
        sum = withXDelta[i];
        // seperatedIdx = i;
      }

      return curSeperatedAvg;
    });

    const sepIdxs = withXDeltaSepAvg.map((curSeperatedAvg, i) => {
      const d = withXDelta[i];
      if (
        d > totalDeltaAvg * calibValue &&
        d > curSeperatedAvg &&
        d > withHotelCalibDeltaAvg[i]
      ) {
        return i;
      }
      return -1;
    });

    return {
      distances: withXDistances,
      delta: withXDelta,
      deltaAvg: withXDeltaAvg,
      deltaSepAvg: withXDeltaSepAvg,
      seperatedIdxs: sepIdxs,
    };
  };

  const distanceMaps: DistanceMap = searchHotelRes.map(outerHotel => {
    const withHotelDistances = searchHotelRes.map(innerHotel => {
      return {
        data: innerHotel,
        distance: getDistance({
          startPoint: {
            lat: outerHotel.latitude,
            lngt: outerHotel.longitude,
          },
          endPoint: {
            lat: innerHotel.latitude,
            lngt: innerHotel.longitude,
          },
        }),
      };
    });
    withHotelDistances.sort((a, b) => {
      if (a.distance > b.distance) {
        return 1;
      }
      if (a.distance < b.distance) {
        return -1;
      }
      return 0;
    });

    const withSpotDistances = touringSpotGglNearbySearchRes.map(spot => {
      const location = JSON.parse(spot.geometry.location) as LatLngt;
      return {
        data: spot,
        distance: getDistance({
          startPoint: {
            lat: outerHotel.latitude,
            lngt: outerHotel.longitude,
          },
          endPoint: {
            lat: location.lat,
            lngt: location.lngt,
          },
        }),
      };
    });
    withSpotDistances.sort((a, b) => {
      if (a.distance > b.distance) {
        return 1;
      }
      if (a.distance < b.distance) {
        return -1;
      }
      return 0;
    });

    const withRestaurantDistances = restaurantGglNearbySearchRes.map(
      restaurant => {
        const location = JSON.parse(restaurant.geometry.location) as LatLngt;
        return {
          data: restaurant,
          distance: getDistance({
            startPoint: {
              lat: outerHotel.latitude,
              lngt: outerHotel.longitude,
            },
            endPoint: {
              lat: location.lat,
              lngt: location.lngt,
            },
          }),
        };
      },
    );
    withRestaurantDistances.sort((a, b) => {
      if (a.distance > b.distance) {
        return 1;
      }
      if (a.distance < b.distance) {
        return -1;
      }
      return 0;
    });

    return {
      withHotel: {
        data: withHotelDistances.map(e => e.data),
        metaDataForDistance: evalMetaData(
          withHotelDistances.map(e => e.distance),
        ),
      },
      withSpot: {
        data: withSpotDistances.map(e => e.data),
        metaDataForDistance: evalMetaData(
          withSpotDistances.map(e => e.distance),
        ),
      },
      withRestaurant: {
        data: withRestaurantDistances.map(e => e.data),
        metaDataForDistance: evalMetaData(
          withSpotDistances.map(e => e.distance),
        ),
      },
    };
  });

  console.log(distanceMaps);
  return distanceMaps;
};

const getRecommendListWithLatLngtInnerAsyncFn = async (
  params: GetRecommendListWithLatLngtReqParams,
): Promise<GetRecommendListWithLatLngtInnerAsyncFnResponse> => {
  const { searchCond } = params;
  const {
    minBudget = 0,
    maxBudget = 0,
    // currency,
    // travelType,
    // travelIntensity,
    travelStartDate,
    travelEndDate,
    hotelTransition = 0, // 호텔 바꾸는 횟수
    nearbySearchReqParams,
    searchHotelReqParams,
  } = searchCond;

  const travelNights = getTravelNights(
    // searchCond.searchHotelReqParams.checkinDate,
    // searchCond.searchHotelReqParams.checkoutDate,
    travelStartDate,
    travelEndDate,
  );
  if (travelNights < 1) {
    throw new IBError({
      type: 'INVALIDPARAMS',
      message: '여행 시작일과 종료일의 차이가 1미만입니다.',
    });
  }

  if (travelNights < hotelTransition)
    throw new IBError({
      type: 'INVALIDPARAMS',
      message:
        "hotelTransation 값은 전체 여행중 숙소에 머무를 '박'수를 넘을수 없습니다.",
    });

  // 호텔 검색
  const { queryParamId } = await searchHotelInnerAsyncFn(searchCond);
  // 식당 검색
  let nearbySearchResult: google.maps.places.IBPlaceResult[] = [];
  const travelDays = travelNights + 1;

  const radiusExtendRetryLimit = 5;
  let radiusExtendRetry = 1;

  while (
    nearbySearchResult.length < travelDays * mealPerDay &&
    radiusExtendRetry <= radiusExtendRetryLimit
  ) {
    if (radiusExtendRetry > 1)
      console.log(`restaurant radiusExtendRetry:${radiusExtendRetry}`);
    const radiusModifiedQueryParams = {
      ...defaultQueryParams,
      searchHotelReqParams,
      nearbySearchReqParams: {
        ...nearbySearchReqParams,
        keyword: 'restaurant',
        radius: nearbySearchReqParams.radius * radiusExtendRetry,
      },
    };
    // eslint-disable-next-line no-await-in-loop
    nearbySearchResult = await getAllNearbySearchPages(
      radiusModifiedQueryParams,
      queryParamId,
      nearbySearchReqParams.loadAll,
    );
    radiusExtendRetry += 1;
  }

  // 관광지 검색
  radiusExtendRetry = 1;
  nearbySearchResult = [];
  while (
    nearbySearchResult.length < travelDays * spotPerDay &&
    radiusExtendRetry <= radiusExtendRetryLimit
  ) {
    if (radiusExtendRetry > 1)
      console.log(`touring spot radiusExtendRetry:${radiusExtendRetry}`);
    const radiusModifiedQueryParams = {
      ...defaultQueryParams,
      searchHotelReqParams,
      nearbySearchReqParams: {
        ...nearbySearchReqParams,
        keyword: 'tourist places',
        radius: nearbySearchReqParams.radius * radiusExtendRetry,
      },
    };
    // eslint-disable-next-line no-await-in-loop
    nearbySearchResult = await getAllNearbySearchPages(
      radiusModifiedQueryParams,
      queryParamId,
      nearbySearchReqParams.loadAll,
    );
    radiusExtendRetry += 1;
  }

  const restaurantQueryParamsDataFromDB = await getListQueryParamsInnerAsyncFn(
    getQueryParamsForRestaurant(queryParamId),
  );
  const spotQueryParamsDataFromDB = await getListQueryParamsInnerAsyncFn(
    getQueryParamsForTourSpot(queryParamId),
  );
  const { searchHotelRes, gglNearbySearchRes: restaurantGglNearbySearchRes } =
    restaurantQueryParamsDataFromDB[0];
  const { gglNearbySearchRes: touringSpotGglNearbySearchRes } =
    spotQueryParamsDataFromDB[0];

  const distanceMapsFromHotel = evalSperatedPlaces({
    searchHotelRes,
    touringSpotGglNearbySearchRes: touringSpotGglNearbySearchRes.slice(
      0,
      spotPerDay * travelDays,
    ),
    restaurantGglNearbySearchRes: restaurantGglNearbySearchRes.slice(
      0,
      mealPerDay * travelDays,
    ),
  });

  // distanceMapsFromHotel.forEach((e, i) => {
  //   console.log(`[${i}]: ${JSON.stringify(e.withRestaurant, null, 2)}`);
  // });

  const transitionTerm = Math.ceil(travelNights / (hotelTransition + 1)); // 호텔 이동할 주기 (단위: 일)
  const filterHotelWithBudget = () => {
    const copiedHotelRes = Array.from(searchHotelRes).reverse();

    const minHotelBudget = minBudget * minHotelBudgetPortion;
    const dailyMinBudget = minHotelBudget / travelNights;

    const midBudget = (minBudget + maxBudget) / 2;
    const flexPortionLimit = 1.3;
    const midHotelBudget = midBudget * midHotelBudgetPortion;
    const dailyMidBudget = (midHotelBudget * flexPortionLimit) / travelNights;

    const maxHotelBudget = maxBudget * maxHotelBudgetPortion;
    const dailyMaxBudget = maxHotelBudget / travelNights;

    const minFilteredHotels = copiedHotelRes.filter(
      hotel => hotel.min_total_price / travelNights < dailyMinBudget,
    );
    const midFilteredHotels = copiedHotelRes.filter(
      hotel => hotel.min_total_price / travelNights < dailyMidBudget,
    );
    const maxFilteredHotels = copiedHotelRes.filter(
      hotel => hotel.min_total_price / travelNights < dailyMaxBudget,
    );
    return {
      minFilteredHotels,
      midFilteredHotels,
      maxFilteredHotels,
    };
  };
  const { minFilteredHotels, midFilteredHotels, maxFilteredHotels } =
    filterHotelWithBudget();

  const visitSchedules: VisitSchedules = [];

  const arr = Array.from(Array(travelDays));
  // let recommendedSpotCount = 0;
  // let recommendedRestaurantCount = 0;

  let recommendedMinHotelCount = 0;
  let recommendedMidHotelCount = 0;
  let recommendedMaxHotelCount = 0;
  let prevMinHotel: SearchHotelRes | undefined;
  let prevMidHotel: SearchHotelRes | undefined;
  let prevMaxHotel: SearchHotelRes | undefined;
  let minHotel: SearchHotelRes | undefined;
  let midHotel: SearchHotelRes | undefined;
  let maxHotel: SearchHotelRes | undefined;
  arr.reduce((acc: VisitSchedules, cur, idx) => {
    // const thatDaySpot = touringSpotGglNearbySearchRes.slice(
    //   idx * spotPerDay,
    //   (idx + 1) * spotPerDay <= touringSpotGglNearbySearchRes.length
    //     ? (idx + 1) * spotPerDay
    //     : touringSpotGglNearbySearchRes.length - 1,
    // );
    // recommendedSpotCount += thatDaySpot.length;

    // const thatDayRestaurant = restaurantGglNearbySearchRes.slice(
    //   idx * mealPerDay,
    //   (idx + 1) * mealPerDay <= restaurantGglNearbySearchRes.length
    //     ? (idx + 1) * mealPerDay
    //     : restaurantGglNearbySearchRes.length - 1,
    // );
    // recommendedRestaurantCount += thatDayRestaurant.length;

    if (idx % transitionTerm === 0) {
      minHotel = minFilteredHotels.pop();
      midHotel = midFilteredHotels.pop();
      maxHotel = maxFilteredHotels.pop();
      prevMinHotel = minHotel;
      prevMidHotel = midHotel;
      prevMaxHotel = maxHotel;

      if (minHotel) recommendedMinHotelCount += 1;
      if (midHotel) recommendedMidHotelCount += 1;
      if (maxHotel) recommendedMaxHotelCount += 1;
    }
    const minBudgetHotel = idx % transitionTerm === 0 ? minHotel : prevMinHotel;
    const midBudgetHotel = idx % transitionTerm === 0 ? midHotel : prevMidHotel;
    const maxBudgetHotel = idx % transitionTerm === 0 ? maxHotel : prevMaxHotel;

    const minBudgetHotelIdx = distanceMapsFromHotel[0].withHotel.data.findIndex(
      item => item.id === minBudgetHotel?.id,
    );
    const midBudgetHotelIdx = distanceMapsFromHotel[0].withHotel.data.findIndex(
      item => item.id === midBudgetHotel?.id,
    );
    const maxBudgetHotelIdx = distanceMapsFromHotel[0].withHotel.data.findIndex(
      item => item.id === maxBudgetHotel?.id,
    );

    let restaurantsFromMinHotel: (GglNearbySearchRes & {
      geometry: Gglgeometry;
    })[] = [];
    let spotsFromMinHotel: (GglNearbySearchRes & {
      geometry: Gglgeometry;
    })[] = [];
    if (minBudgetHotelIdx > -1) {
      restaurantsFromMinHotel =
        distanceMapsFromHotel[minBudgetHotelIdx].withRestaurant.data;
      spotsFromMinHotel =
        distanceMapsFromHotel[minBudgetHotelIdx].withSpot.data;
    }
    let restaurantsFromMidHotel: (GglNearbySearchRes & {
      geometry: Gglgeometry;
    })[] = [];
    let spotsFromMidHotel: (GglNearbySearchRes & {
      geometry: Gglgeometry;
    })[] = [];
    if (midBudgetHotelIdx > -1) {
      restaurantsFromMidHotel =
        distanceMapsFromHotel[midBudgetHotelIdx].withRestaurant.data;
      spotsFromMidHotel =
        distanceMapsFromHotel[midBudgetHotelIdx].withSpot.data;
    }
    let restaurantsFromMaxHotel: (GglNearbySearchRes & {
      geometry: Gglgeometry;
    })[] = [];
    let spotsFromMaxHotel: (GglNearbySearchRes & {
      geometry: Gglgeometry;
    })[] = [];
    if (maxBudgetHotelIdx > -1) {
      restaurantsFromMaxHotel =
        distanceMapsFromHotel[maxBudgetHotelIdx].withRestaurant.data;
      spotsFromMaxHotel =
        distanceMapsFromHotel[maxBudgetHotelIdx].withSpot.data;
    }

    const thatDayRestaurantFromMinHotel = restaurantsFromMinHotel.slice(
      idx * mealPerDay,
      (idx + 1) * mealPerDay <= restaurantsFromMinHotel.length
        ? (idx + 1) * mealPerDay
        : restaurantsFromMinHotel.length - 1,
    );
    // recommendedMinHotelCount += thatDayRestaurantFromMinHotel.length;
    const thatDayRestaurantFromMidHotel = restaurantsFromMidHotel.slice(
      idx * mealPerDay,
      (idx + 1) * mealPerDay <= restaurantsFromMidHotel.length
        ? (idx + 1) * mealPerDay
        : restaurantsFromMidHotel.length - 1,
    );
    // recommendedMidHotelCount += thatDayRestaurantFromMidHotel.length;
    const thatDayRestaurantFromMaxHotel = restaurantsFromMaxHotel.slice(
      idx * mealPerDay,
      (idx + 1) * mealPerDay <= restaurantsFromMaxHotel.length
        ? (idx + 1) * mealPerDay
        : restaurantsFromMaxHotel.length - 1,
    );
    // recommendedMaxHotelCount += thatDayRestaurantFromMaxHotel.length;

    const thatDaySpotFromMinHotel = spotsFromMinHotel.slice(
      idx * spotPerDay,
      (idx + 1) * spotPerDay <= spotsFromMinHotel.length
        ? (idx + 1) * spotPerDay
        : spotsFromMinHotel.length - 1,
    );
    // recommendedMinHotelCount += thatDaySpotFromMinHotel.length;

    const thatDaySpotFromMidHotel = spotsFromMidHotel.slice(
      idx * spotPerDay,
      (idx + 1) * spotPerDay <= spotsFromMidHotel.length
        ? (idx + 1) * spotPerDay
        : spotsFromMidHotel.length - 1,
    );
    // recommendedMaxHotelCount += thatDaySpotFromMidHotel.length;

    const thatDaySpotFromMaxHotel = spotsFromMaxHotel.slice(
      idx * spotPerDay,
      (idx + 1) * spotPerDay <= spotsFromMaxHotel.length
        ? (idx + 1) * spotPerDay
        : spotsFromMaxHotel.length - 1,
    );
    // recommendedMaxHotelCount += thatDaySpotFromMaxHotel.length;

    acc.push({
      // spot: thatDaySpot.map(e => {
      //   return {
      //     ...e,
      //     spotUrl: `https://www.google.com/maps/place/?q=place_id:${
      //       e.place_id as string
      //     }`,
      //   };
      // }),
      // restaurant: thatDayRestaurant.map(e => {
      //   return {
      //     ...e,
      //     spotUrl: `https://www.google.com/maps/place/?q=place_id:${
      //       e.place_id as string
      //     }`,
      //   };
      // }),
      spot: {
        spotsFromMinHotel: thatDaySpotFromMinHotel.map(e => {
          return {
            ...e,
            spotUrl: `https://www.google.com/maps/place/?q=place_id:${
              e.place_id as string
            }`,
          };
        }),
        spotsFromMidHotel: thatDaySpotFromMidHotel.map(e => {
          return {
            ...e,
            spotUrl: `https://www.google.com/maps/place/?q=place_id:${
              e.place_id as string
            }`,
          };
        }),
        spotsFromMaxHotel: thatDaySpotFromMaxHotel.map(e => {
          return {
            ...e,
            spotUrl: `https://www.google.com/maps/place/?q=place_id:${
              e.place_id as string
            }`,
          };
        }),
      },
      restaurant: {
        restaurantsFromMinHotel: thatDayRestaurantFromMinHotel.map(e => {
          return {
            ...e,
            spotUrl: `https://www.google.com/maps/place/?q=place_id:${
              e.place_id as string
            }`,
          };
        }),
        restaurantsFromMidHotel: thatDayRestaurantFromMidHotel.map(e => {
          return {
            ...e,
            spotUrl: `https://www.google.com/maps/place/?q=place_id:${
              e.place_id as string
            }`,
          };
        }),
        restaurantsFromMaxHotel: thatDayRestaurantFromMaxHotel.map(e => {
          return {
            ...e,
            spotUrl: `https://www.google.com/maps/place/?q=place_id:${
              e.place_id as string
            }`,
          };
        }),
      },
      hotel: {
        minBudgetHotel,
        midBudgetHotel,
        maxBudgetHotel,
      },
    });

    return acc;
  }, visitSchedules);

  const recommendList = {
    ...omit(restaurantQueryParamsDataFromDB[0], [
      'gglNearbySearchRes',
      'searchHotelRes',
    ]),
    // totalNearbySearchCount: gglNearbySearchRes.length,
    totalHotelSearchCount: searchHotelRes.length,
    spotPerDay,
    mealPerDay,
    travelNights,
    travelDays,
    hotelTransition,
    transitionTerm,
    // recommendedSpotCount,
    // recommendedRestaurantCount,
    recommendedMinHotelCount,
    recommendedMidHotelCount,
    recommendedMaxHotelCount,
    visitSchedulesCount: visitSchedules.length,
    visitSchedules,
  };

  return recommendList;
};

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
          res.json({
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

// const getRecommendListInnerAsyncFn = async (
//   params: GetRecommendListReqParams,
// ): Promise<GetRecommendListInnerAsyncFnResponse> => {
//   const { searchCond, evalCond } = params;
//   const {
//     searchLocation,
//     minBudget = 0,
//     maxBudget = 0,
//     // currency,
//     // travelType,
//     // travelIntensity,
//     travelStartDate,
//     travelEndDate,
//     hotelTransition = 0, // 호텔 바꾸는 횟수
//     nearbySearchReqParams: { loadAll },
//   } = searchCond;

//   const travelNights = getTravelNights(
//     // searchCond.searchHotelReqParams.checkinDate,
//     // searchCond.searchHotelReqParams.checkoutDate,
//     travelStartDate,
//     travelEndDate,
//   );
//   if (travelNights < 1) {
//     throw new IBError({
//       type: 'INVALIDPARAMS',
//       message: '여행 시작일과 종료일의 차이가 1미만입니다.',
//     });
//   }

//   if (travelNights < hotelTransition)
//     throw new IBError({
//       type: 'INVALIDPARAMS',
//       message:
//         "hotelTransation 값은 전체 여행중 숙소에 머무를 '박'수를 넘을수 없습니다.",
//     });

//   let locationsArr: SearchLocationsFromBookingComInnerAsyncFnResponse[] = [];
//   try {
//     locationsArr = await searchLocationsFromBookingComInnerAsyncFn({
//       name: searchLocation,
//     });
//   } catch (err) {
//     if (err instanceof IBError) {
//       throw err;
//     }
//   }

//   const { dest_id: destId } = locationsArr.find(item =>
//     Object.keys(item).find(e => e === 'region'),
//   ) ?? {
//     dest_id: '',
//   };

//   if (isEmpty(destId)) {
//     throw new IBError({
//       type: 'EXTERNALAPI',
//       message:
//         'booking.com /v1/hotels/locations api 결과값이 정상적으로 응답되지 않았습니다. (dest_id 값이 없습니다.)',
//     });
//   }

//   // const filters = await filterForSearchFromBookingComInnerAsyncFn({
//   //   adultsNumber: searchHotelReqParams.adultsNumber,
//   //   destType: 'region',
//   //   orderBy: searchHotelReqParams.orderBy,
//   //   checkoutDate: searchHotelReqParams.checkoutDate,
//   //   checkinDate: searchHotelReqParams.checkinDate,
//   //   filterByCurrency: 'USD',
//   //   destId: Number(destId) ?? 0,
//   //   roomNumber: searchHotelReqParams.roomNumber,
//   //   categoriesFilterIds: searchHotelReqParams.categoriesFilterIds,
//   //   childrenNumber: searchHotelReqParams.childrenNumber,
//   //   includeAdjacency: searchHotelReqParams.includeAdjacency,
//   //   pageNumber: searchHotelReqParams.pageNumber,
//   //   childrenAges: searchHotelReqParams.childrenAges,
//   //   // categoriesFilterIds: [],
//   // });

//   // const hotelTypeFilter = filters
//   //   ?.find(e => e.id === 'property_type')
//   //   ?.categories?.find(e => e.name === 'Hotels');

//   // const hotelTypeFilterId = hotelTypeFilter?.id ?? 'property_type::204'; // hotels filter id

//   // searchCond.searchHotelReqParams.categoriesFilterIds = [
//   //   ...(searchCond.searchHotelReqParams.categoriesFilterIds ?? []),
//   //   bookingComFilterCategoryList.hotels,
//   // ];

//   // Do composite search
//   const { queryParamId } = await searchHotelInnerAsyncFn(searchCond);
//   // await nearbySearchInnerAsyncFn(searchCond, queryParamId);
//   await getAllNearbySearchPages(searchCond, queryParamId, loadAll);

//   const getListQueryParamsWithId = { ...evalCond, id: queryParamId };
//   // Get high priority candidate data from composite search result.
//   const queryParamsDataFromDB = await getListQueryParamsInnerAsyncFn(
//     getListQueryParamsWithId,
//   );
//   const travelDays = travelNights + 1;

//   const { searchHotelRes, gglNearbySearchRes } =
//     queryParamsDataFromDB[0] as QueryParams & {
//       searchHotelRes: SearchHotelRes[];
//       gglNearbySearchRes: GglNearbySearchRes[];
//     };

//   const transitionTerm = Math.ceil(travelNights / (hotelTransition + 1)); // 호텔 이동할 주기 (단위: 일)
//   const filterHotelWithBudget = () => {
//     const copiedHotelRes = Array.from(searchHotelRes).reverse();

//     const minHotelBudget = minBudget * minHotelBudgetPortion;
//     const dailyMinBudget = minHotelBudget / transitionTerm;

//     const midBudget = (minBudget + maxBudget) / 2;
//     const flexPortionLimit = 1.3;
//     const midHotelBudget = midBudget * midHotelBudgetPortion;
//     const dailyMidBudget = (midHotelBudget * flexPortionLimit) / transitionTerm;

//     const maxHotelBudget = maxBudget * maxHotelBudgetPortion;
//     const dailyMaxBudget = maxHotelBudget / transitionTerm;

//     const minFilteredHotels = copiedHotelRes.filter(
//       hotel => hotel.min_total_price < dailyMinBudget,
//     );
//     const midFilteredHotels = copiedHotelRes.filter(hotel => {
//       return hotel.min_total_price < dailyMidBudget;
//     });
//     const maxFilteredHotels = copiedHotelRes.filter(
//       hotel => hotel.min_total_price < dailyMaxBudget,
//     );
//     return {
//       minFilteredHotels,
//       midFilteredHotels,
//       maxFilteredHotels,
//     };
//   };
//   const { minFilteredHotels, midFilteredHotels, maxFilteredHotels } =
//     filterHotelWithBudget();

//   const visitSchedules: VisitSchedules = [];
//   // const minBudgetHotel: SearchHotelRes[] = [];
//   // const midBudgetHotel: SearchHotelRes[] = [];
//   // const maxBudgetHotel: SearchHotelRes[] = [];

//   const arr = Array.from(Array(travelDays));
//   let recommendedNearbySearchCount = 0;
//   let recommendedMinHotelCount = 0;
//   let recommendedMidHotelCount = 0;
//   let recommendedMaxHotelCount = 0;
//   let prevMinHotel: SearchHotelRes | undefined;
//   let prevMidHotel: SearchHotelRes | undefined;
//   let prevMaxHotel: SearchHotelRes | undefined;
//   let minHotel: SearchHotelRes | undefined;
//   let midHotel: SearchHotelRes | undefined;
//   let maxHotel: SearchHotelRes | undefined;
//   arr.reduce((acc: VisitSchedules, cur, idx) => {
//     const thatDaySpot = gglNearbySearchRes.slice(
//       idx * spotPerDay,
//       (idx + 1) * spotPerDay <= gglNearbySearchRes.length
//         ? (idx + 1) * spotPerDay
//         : gglNearbySearchRes.length - 1,
//     );
//     recommendedNearbySearchCount += thatDaySpot.length;

//     if (idx % transitionTerm === 0) {
//       minHotel = minFilteredHotels.pop();
//       midHotel = midFilteredHotels.pop();
//       maxHotel = maxFilteredHotels.pop();
//       prevMinHotel = minHotel;
//       prevMidHotel = midHotel;
//       prevMaxHotel = maxHotel;

//       if (minHotel) recommendedMinHotelCount += 1;
//       if (midHotel) recommendedMidHotelCount += 1;
//       if (maxHotel) recommendedMaxHotelCount += 1;
//     }

//     acc.push({
//       spot: thatDaySpot,
//       hotel: {
//         minBudgetHotel: idx % transitionTerm === 0 ? minHotel : prevMinHotel,
//         midBudgetHotel: idx % transitionTerm === 0 ? midHotel : prevMidHotel,
//         maxBudgetHotel: idx % transitionTerm === 0 ? maxHotel : prevMaxHotel,
//       },
//     });

//     return acc;
//   }, visitSchedules);

//   const recommendList = {
//     ...omit(queryParamsDataFromDB[0], ['gglNearbySearchRes', 'searchHotelRes']),
//     searchLocation,
//     totalNearbySearchCount: gglNearbySearchRes.length,
//     totalHotelSearchCount: searchHotelRes.length,
//     spotPerDay,
//     travelNights,
//     travelDays,
//     hotelTransition,
//     transitionTerm,
//     recommendedNearbySearchCount,
//     recommendedMinHotelCount,
//     recommendedMidHotelCount,
//     recommendedMaxHotelCount,
//     visitSchedulesCount: visitSchedules.length,
//     visitSchedules,
//   };

//   return recommendList;
// };

// const getRecommendList = asyncWrapper(
//   async (
//     req: Express.IBTypedReqBody<GetRecommendListReqParams>,
//     res: Express.IBTypedResponse<GetRecommendListResponse>,
//   ) => {
//     try {
//       const params = req.body;
//       const recommendListFromDB = await getRecommendListInnerAsyncFn(params);
//       res.json({
//         ...ibDefs.SUCCESS,
//         IBparams: recommendListFromDB,
//       });
//     } catch (err) {
//       if (err instanceof IBError) {
//         if (err.type === 'INVALIDPARAMS') {
//           res.json({
//             ...ibDefs.INVALIDPARAMS,
//             IBdetail: (err as Error).message,
//             IBparams: {} as object,
//           });
//         } else if (err.type === 'EXTERNALAPI') {
//           res.json({
//             ...ibDefs.EXTERNALAPI,
//             IBdetail: (err as Error).message,
//             IBparams: {} as object,
//           });
//         }
//       }
//       throw err;
//     }
//   },
// );

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
    const testFromDB = await prisma.queryParams.findMany({
      include: {
        searchHotelRes: {
          select: { review_score: true, distance: true },
          orderBy: [{ distance: 'asc' }, { review_score: 'desc' }],
        },
      },
    });

    res.json({
      ...ibDefs.SUCCESS,
      IBparams: testFromDB as object,
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

//     // do {
//     //   const queryUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?keyword=${keyword}&location=${
//     //     location?.latitude
//     //   }%2C${location?.longitude}&radius=${radius}&key=${
//     //     process.env.GCP_MAPS_APIKEY as string
//     //   }${pageToken ? `&pagetoken=${pageToken}` : ''}`;
//     //   console.log(queryUrl);
//     //   // eslint-disable-next-line no-await-in-loop
//     // const response = await axios.get(queryUrl);
//     // if (response?.statusText === 'OK') {
//     //   // eslint-disable-next-line @typescript-eslint/naming-convention
//     //   const { results, next_page_token } = response.data as {
//     //     next_page_token: string;
//     //     results: google.maps.places.PlaceResult[];
//     //   };

//     //   pageToken = next_page_token;
//     //   resArr = [...resArr, ...results];
//     // }
//     //   // console.log(JSON.stringify(response.data, null, 2));
//     // } while (pageToken);

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
    req: Express.IBTypedReqBody<{
      orderBy?: // default popularity
      | 'popularity'
        | 'class_ascending'
        | 'class_descending'
        | 'distance'
        | 'upsort_bh'
        | 'review_score'
        | 'price';
      adultsNumber: number;
      // units: 'metric';
      roomNumber?: number; // Number of rooms
      checkinDate: Date; // '2022-09-30';
      checkoutDate: Date; // '2022-10-01';
      filterByCurrency?: 'USD' | 'KRW'; // default USD;
      // locale: 'en-us';
      latitude: string; // 위도좌표 ex) 21.4286856;
      longitude: string; // 경도 ex) -158.1389763;
      pageNumber?: number; // default 0;
      includeAdjacency?: boolean; // default false. Include nearby places. If there are few hotels in the selected location, nearby locations will be added. You should pay attention to the `primary_count` parameter - it is the number of hotels from the beginning of the array that matches the strict filter.
    }>,
    res: Express.IBTypedResponse<IBResFormat>,
  ) => {
    const {
      body: {
        orderBy,
        adultsNumber,
        roomNumber,
        checkinDate,
        checkoutDate,
        filterByCurrency,
        latitude: paramLat,
        longitude: paramLngt,
        pageNumber,
        includeAdjacency,
      },
    } = req;

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
        include_adjacency: includeAdjacency ?? 'false',
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

scheduleRouter.post('/nearbySearch', nearbySearch);
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
export default scheduleRouter;
