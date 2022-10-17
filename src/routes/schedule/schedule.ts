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
  accessTokenValidCheck,
} from '@src/utils';
import axios, { AxiosResponse, Method } from 'axios';
import prisma from '@src/prisma';
import {
  PrismaClient,
  SearchHotelRes,
  Prisma,
  // GglNearbySearchRes,
  PlanType,
  PlaceType,
  GglNearbySearchRes,
  GglPhotos,
  Gglgeometry,
} from '@prisma/client';
import moment from 'moment';
import { omit, isEmpty, isNumber, isNil, isUndefined } from 'lodash';
import { v4 as uuidv4 } from 'uuid';
import {
  QueryReqParams,
  defaultNearbySearchReqParams,
  defaultSearchHotelReqParams,
  NearbySearchInnerAsyncFnRes,
  SearchedData,
  GetListQueryParamsReqParams,
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
  LatLngt,
  // MetaDataForSpike,
  DistanceMap,
  // EvalSeperatedPlacesReqParams,
  SearchHotelReqParams,
  GglNearbySearchResIncludedGeometry,
  ScheduleNodeList,
  MealOrder,
  mealPerDay,
  spotPerDay,
  minHotelBudgetPortion,
  midHotelBudgetPortion,
  maxHotelBudgetPortion,
  VisitOrder,
  flexPortionLimit,
  ReqScheduleParams,
  ReqScheduleResponse,
  FavoriteTravelType,
  // FavoriteAccommodationType,
  // FavoriteAccommodationLocation,
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
  GetPlaceDetailResponse,
  GooglePlaceReview,
  GooglePriceLevel,
  GetCandidateScheduleParams,
  GetCandidateScheduleResponse,
  ModifyScheduleParams,
  ModifyScheduleResponse,
  GetCandidateDetailScheduleParams,
  GetCandidateDetailScheduleResponse,
  GetCandidateDetailScheduleResponsePayload,
} from './types/schduleTypes';

const scheduleRouter: express.Application = express();

const getPlacePhoto = async (data: unknown) => {
  const { photos } = data as {
    photos: {
      height: number;
      html_attributions: string[];
      photo_reference: string;
      width: number;
    }[];
  };
  if (!photos) return undefined;
  const retArr: {
    height: number;
    width: number;
    html_attributuions: string;
    photo_reference: string;
    url?: string;
  }[] = [];
  // eslint-disable-next-line no-restricted-syntax
  for await (const photo of photos) {
    const photo_reference =
      (photo as Partial<{ photo_reference: string }>).photo_reference ?? '';
    const photoUrlReqParam = `https://maps.googleapis.com/maps/api/place/photo?maxheight=420&photo_reference=${photo_reference}&key=${
      process.env.GCP_MAPS_APIKEY as string
    }`;

    const rawResult: {
      request: {
        protocol: string;
        host: string;
        path: string;
      };
    } = await axios.get(photoUrlReqParam);
    // console.log(photoUrlReqParam);
    const { protocol, host, path } = rawResult.request;
    const url = `${protocol}//${host}/${path}`;

    retArr.push({
      height: photo.height,
      width: photo.width,
      html_attributuions: JSON.stringify(photo.html_attributions),
      photo_reference,
      url,
    });
  }
  return retArr;
};

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
  checkinDate: string,
  checkoutDate: string,
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

    // const promises = results.map((item: google.maps.places.IBPlaceResult) => {
    //   return prisma.gglNearbySearchRes.create({
    //     data: {
    //       QueryParams: {
    //         connect: {
    //           id: queryParamId,
    //         },
    //       },
    //       geometry: {
    //         create: {
    //           location: JSON.stringify({
    //             lat: item.geometry?.location?.lat,
    //             lngt: item.geometry?.location?.lng,
    //           }),
    //           viewport: JSON.stringify({
    //             northeast: {
    //               lat: item.geometry?.viewport?.northeast?.lat,
    //               lngt: item.geometry?.viewport?.northeast?.lng,
    //             },
    //             southwest: {
    //               lat: item.geometry?.viewport?.southwest?.lat,
    //               lngt: item.geometry?.viewport?.southwest?.lng,
    //             },
    //           }),
    //         },
    //       },
    //       icon: item.icon,
    //       icon_background_color: item.icon_background_color,
    //       icon_mask_base_uri: item.icon_mask_base_uri,
    //       name: item.name,
    //       opening_hours:
    //         (
    //           item.opening_hours as Partial<{
    //             open_now: boolean;
    //           }>
    //         )?.open_now ?? false,
    //       place_id: item.place_id,
    //       price_level: item.price_level,
    //       rating: item.rating,
    //       types: (() => {
    //         return item.types
    //           ? {
    //               connectOrCreate: item.types?.map(type => {
    //                 return {
    //                   create: { value: type },
    //                   where: { value: type },
    //                 };
    //               }),
    //             }
    //           : {
    //               create: {
    //                 value: 'Not Applicaple',
    //               },
    //             };
    //       })(),
    //       user_ratings_total: item.user_ratings_total,
    //       vicinity: item.vicinity,
    //       plus_code: {
    //         create: {
    //           compund_code: item.plus_code?.compound_code ?? '',
    //           global_code: item.plus_code?.global_code ?? '',
    //         },
    //       },
    // photos: {
    //   create: item.photos?.map(photo => {
    //     return {
    //       height: photo.height,
    //       width: photo.width,
    //       html_attributuions: JSON.stringify(photo.html_attributions),
    //       photo_reference:
    //         (photo as Partial<{ photo_reference: string }>)
    //           .photo_reference ?? '',
    //     };
    //   }),
    // },
    //     },
    //   });
    // });
    // const createdNearbyRes = await prisma.$transaction(promises);

    // eslint-disable-next-line no-restricted-syntax
    for await (const item of results) {
      await prisma.gglNearbySearchRes.create({
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
            create: await getPlacePhoto(item),
          },
        },
      });
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
    includeAdjacency = true,
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
      include_adjacency: includeAdjacency?.valueOf().toString() ?? 'true',
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

  const { results, queryParamId } = await storeDataRelatedWithQueryParams(
    queryReqParams,
    response,
    ifAlreadyQueryId,
  );

  return {
    nearbySearchResult: results,
    queryParamId,
    pageToken: (response.data as Partial<{ next_page_token: string }>)
      .next_page_token,
  };
};

/**
 * 구글 nearbySearch시에는 한 페이지당 20개의 목록만을 보여준다.
 * 전체 일정중 필요한 스팟(관광지) 또는 식당이 충분한 숫자가 확보되어야 하는데
 * nearbySearch 후 끝 페이지 모든 장소를 미리 읽어 해당 숫자만큼 확보되었는지 확인하여야 한다.
 * 이때 사용할 끝 페이지까지 계속해서 자동으로 nearbySearch를 요청하는 함수
 * 끝 페이지까지 여러번 쿼리하면 이 함수에서 구글로부터 응답받은 모든 GglNearbySearchRes 데이터들은 하나의 ifAlreadyQueryId와 관계된채 중복없이 DB에 저장됨을 보장한다.
 * @param queryReqParams
 * @param ifAlreadyQueryId DB에는 QueryParams에 GglNearbySearchRes, SearchHotelRes가 한번에 관계되어 있다.
 * DB에 GglNearbySearchRes 를 create할때 QueryParams id를 알려주어야 관계를 맺을수 있기 때문에 해당 파라미터로 받아 외래키로 관계를 형성한다.
 * @param loopLoadAll 끝 페이지까지 읽는 로직을 실행할것인지 결정한다. false라면 첫번째 페이지 값만 리턴한다.
 * @returns
 */

const getAllNearbySearchPages = async (
  queryReqParams: QueryReqParams,
  ifAlreadyQueryId?: number,
  loopLoadAll = false,
): Promise<google.maps.places.IBPlaceResult[]> => {
  let retry = 1;
  const retryLimit = 5;

  // do while loop version
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

  // recursion version
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
 * queryReqParams의 조건에 맞춰 booking.com api로 호텔을 검색한다.
 * /searchHotel api 호출시 실제 동작부를 형성한다. (비슷한 동작부를 다른곳에서 사용하기 용이하도록 모듈로써 사용하기 위해 endpoint 함수와 wrapper-inner함수로써 분리함)
 * @param queryReqParams
 * @param ifAlreadyQueryId DB에는 QueryParams에 GglNearbySearchRes, SearchHotelRes가 한번에 관계되어 있다.
 * DB에 hotelSearchRes 를 create할때 QueryParams id를 알려주어야 관계를 맺을수 있기 때문에 해당 파라미터로 받아 관계를 형성한다.
 * @return
 */
const searchHotelInnerAsyncFn = async (
  queryReqParams: QueryReqParams,
  ifAlreadyQueryId?: number,
) => {
  const { searchHotelReqParams } = queryReqParams;

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

    const { result } = response.data as { result: SearchedData[] };

    return result;
  })();

  let queryParamId: number = -1;
  queryParamId = await createQueryParamId(
    prisma,
    queryReqParams,
    ifAlreadyQueryId,
  );

  const createSearchHotelResPromises = data.map(item => {
    const {
      unit_configuration_label,
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

        gross_amount_per_night: { value: gross_amount_per_night },
      },
      class: hotelClass,
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
        unit_configuration_label,
        min_total_price,
        gross_amount_per_night,
        gross_amount,
        included_taxes_and_charges_amount,
        net_amount,
        hotelClass,
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
  await prisma.$transaction(createSearchHotelResPromises);
  // await Promise.all(createSearchHotelResPromises);
  // try {
  //   await Promise.all(createSearchHotelResPromises);
  // } catch (e) {
  //   await prisma.queryParams.delete({
  //     where: {
  //       id: queryParamId,
  //     },
  //   });
  //   throw e;
  // }

  return { hotelSearchResult: data, queryParamId };
};

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

/**
 * DB로부터 QueryParams 모델 데이터를 불러 응신한다.
 * 구글 nearbySearch, rapid api booking.com hotelSearch를 한번의 쿼리로 복합 검색시(compositeSearch / getRecommendListWithLatLngt 등 ...)
 * 하나의 QueryParams 와 관계된 모든 데이터를 요청하는 /getListQueryParams api의 주요 내부 동작 함수
 */
export const getListQueryParamsInnerAsyncFn = async (
  params: GetListQueryParamsReqParams,
): Promise<GetListQueryParamsInnerAsyncFnResponse> => {
  const queryParamsDataFromDB = await prisma.queryParams.findMany(params);

  return queryParamsDataFromDB as GetListQueryParamsInnerAsyncFnResponse;
};

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

// const evalMetaData = (withXDistances: number[]): MetaDataForSpike => {
//   let prevValue = 0;
//   const withXDelta = withXDistances.map(v => {
//     const retValue = v - prevValue;
//     prevValue = v;
//     return retValue;
//   });

//   let sum = 0;
//   const withXDeltaAvg = withXDelta.map((v, i) => {
//     sum += v;
//     return sum / (i + 1);
//   });
//   const calibValue = 1.7;
//   const totalDeltaAvg = sum / withXDelta.length;
//   const withHotelCalibDeltaAvg = withXDeltaAvg.map(v => calibValue * v);

//   sum = 0;
//   const withXDeltaSepAvg = withXDelta.map((d, i) => {
//     sum += d;
//     const curSeperatedAvg = sum / (i + 1);
//     // let seperatedIdx = -1;
//     if (
//       d > totalDeltaAvg * calibValue &&
//       d > curSeperatedAvg &&
//       d > withHotelCalibDeltaAvg[i]
//     ) {
//       sum = withXDelta[i];
//       // seperatedIdx = i;
//     }

//     return curSeperatedAvg;
//   });

//   const sepIdxs = withXDeltaSepAvg.map((curSeperatedAvg, i) => {
//     const d = withXDelta[i];
//     if (
//       d > totalDeltaAvg * calibValue &&
//       d > curSeperatedAvg &&
//       d > withHotelCalibDeltaAvg[i]
//     ) {
//       return i;
//     }
//     return -1;
//   });

//   return {
//     distances: withXDistances,
//     delta: withXDelta,
//     deltaAvg: withXDeltaAvg,
//     deltaSepAvg: withXDeltaSepAvg,
//     seperatedIdxs: sepIdxs,
//   };
// };

export const orderByDistanceFromNode = ({
  baseNode,
  scheduleNodeLists,
}: {
  baseNode: SearchHotelRes | GglNearbySearchResIncludedGeometry;
  scheduleNodeLists: ScheduleNodeList;
}): DistanceMap => {
  const sortByDistance = (a: { distance: number }, b: { distance: number }) => {
    if (a.distance > b.distance) {
      return 1;
    }
    if (a.distance < b.distance) {
      return -1;
    }
    return 0;
  };

  const baseLocation = (() => {
    if ((baseNode as SearchHotelRes).latitude !== undefined)
      return {
        latitude: (baseNode as SearchHotelRes).latitude,
        longitude: (baseNode as SearchHotelRes).longitude,
      };
    const location = JSON.parse(
      (baseNode as GglNearbySearchResIncludedGeometry).geometry.location,
    ) as LatLngt;
    return {
      latitude: location.lat,
      longitude: location.lngt,
    };
  })();
  const withHotels = scheduleNodeLists.hotel.map(hotel => {
    return {
      data: hotel,
      distance: getDistance({
        startPoint: {
          lat: baseLocation.latitude,
          lngt: baseLocation.longitude,
        },
        endPoint: {
          lat: hotel.latitude,
          lngt: hotel.longitude,
        },
      }),
    };
  });
  withHotels.sort(sortByDistance);

  const withSpots = scheduleNodeLists.spot.map(spot => {
    const spotLocation = JSON.parse(spot.geometry.location) as LatLngt;

    return {
      data: spot,
      distance: getDistance({
        startPoint: {
          lat: baseLocation.latitude,
          lngt: baseLocation.longitude,
        },
        endPoint: {
          lat: spotLocation.lat,
          lngt: spotLocation.lngt,
        },
      }),
    };
  });
  withSpots.sort(sortByDistance);

  const withRestaurants = scheduleNodeLists.restaurant.map(restaurant => {
    const spotLocation = JSON.parse(restaurant.geometry.location) as LatLngt;

    return {
      data: restaurant,
      distance: getDistance({
        startPoint: {
          lat: baseLocation.latitude,
          lngt: baseLocation.longitude,
        },
        endPoint: {
          lat: spotLocation.lat,
          lngt: spotLocation.lngt,
        },
      }),
    };
  });
  withRestaurants.sort(sortByDistance);

  return {
    data: baseNode,
    withHotels,
    withSpots,
    withRestaurants,
  };
};

// const orderByDistanceFromNode = <
//   MyType extends SearchHotelRes | GglNearbySearchResIncludedGeometry,
// >({
//   baseNode,
//   scheduleNodeLists,
//   baseListType = 'hotel',
// }: {
//   baseNode: MyType;
//   scheduleNodeLists: ScheduleNodeList;
//   baseListType: PlaceType;
// }): DistanceMap<MyType> => {
//   const sortByDistance = (a: { distance: number }, b: { distance: number }) => {
//     if (a.distance > b.distance) {
//       return 1;
//     }
//     if (a.distance < b.distance) {
//       return -1;
//     }
//     return 0;
//   };

//   const baseLocation = (() => {
//     if (baseListType === 'hotel')
//       return {
//         latitude: (baseNode as SearchHotelRes).latitude,
//         longitude: (baseNode as SearchHotelRes).longitude,
//       };
//     const location = JSON.parse(
//       (baseNode as GglNearbySearchResIncludedGeometry).geometry.location,
//     ) as LatLngt;
//     return {
//       latitude: location.lat,
//       longitude: location.lngt,
//     };
//   })();
//   const withHotels = scheduleNodeLists.hotel.map(hotel => {
//     return {
//       data: hotel,
//       distance: getDistance({
//         startPoint: {
//           lat: baseLocation.latitude,
//           lngt: baseLocation.longitude,
//         },
//         endPoint: {
//           lat: hotel.latitude,
//           lngt: hotel.longitude,
//         },
//       }),
//     };
//   });
//   withHotels.sort(sortByDistance);

//   const withSpots = scheduleNodeLists.spot.map(spot => {
//     const spotLocation = JSON.parse(spot.geometry.location) as LatLngt;

//     return {
//       data: spot,
//       distance: getDistance({
//         startPoint: {
//           lat: baseLocation.latitude,
//           lngt: baseLocation.longitude,
//         },
//         endPoint: {
//           lat: spotLocation.lat,
//           lngt: spotLocation.lngt,
//         },
//       }),
//     };
//   });
//   withSpots.sort(sortByDistance);

//   const withRestaurants = scheduleNodeLists.spot.map(restaurant => {
//     const spotLocation = JSON.parse(restaurant.geometry.location) as LatLngt;

//     return {
//       data: restaurant,
//       distance: getDistance({
//         startPoint: {
//           lat: baseLocation.latitude,
//           lngt: baseLocation.longitude,
//         },
//         endPoint: {
//           lat: spotLocation.lat,
//           lngt: spotLocation.lngt,
//         },
//       }),
//     };
//   });
//   withRestaurants.sort(sortByDistance);

//   return {
//     data: baseNode,
//     withHotels,
//     withSpots,
//     withRestaurants,
//   };
// };

// const evalSperatedPlaces = <
//   BaseListType extends SearchHotelRes | GglNearbySearchResIncludedGeometry,
// >({
//   searchHotelRes,
//   touringSpotGglNearbySearchRes,
//   restaurantGglNearbySearchRes,
//   baseType = 'hotel',
// }: EvalSeperatedPlacesReqParams) => {
//   const sortByDistance = (a: { distance: number }, b: { distance: number }) => {
//     if (a.distance > b.distance) {
//       return 1;
//     }
//     if (a.distance < b.distance) {
//       return -1;
//     }
//     return 0;
//   };

//   const distanceMaps: DistanceMap<BaseListType> = (() => {
//     if (baseType === 'hotel') return searchHotelRes;
//     if (baseType === 'spot') return touringSpotGglNearbySearchRes;
//     return restaurantGglNearbySearchRes;
//   })().map((outerItem: unknown) => {
//     let lat = 0;
//     let lngt = 0;
//     if ((outerItem as SearchHotelRes) !== undefined) {
//       lat = (outerItem as SearchHotelRes).latitude;
//       lngt = (outerItem as SearchHotelRes).longitude;
//     } else if (
//       (outerItem as GglNearbySearchResIncludedGeometry) !== undefined
//     ) {
//       const location = JSON.parse(
//         (outerItem as GglNearbySearchResIncludedGeometry).geometry.location,
//       ) as LatLngt;
//       lat = location.lat;
//       lngt = location.lngt;
//     }

//     const withHotelDistances = searchHotelRes.map(hotel => {
//       return {
//         data: hotel,
//         distance: getDistance({
//           startPoint: {
//             lat,
//             lngt,
//           },
//           endPoint: {
//             lat: hotel.latitude,
//             lngt: hotel.longitude,
//           },
//         }),
//       };
//     });
//     withHotelDistances.sort(sortByDistance);

//     const withSpotDistances = touringSpotGglNearbySearchRes.map(spot => {
//       const location = JSON.parse(spot.geometry.location) as LatLngt;
//       return {
//         data: spot,
//         distance: getDistance({
//           startPoint: {
//             lat,
//             lngt,
//           },
//           endPoint: {
//             lat: location.lat,
//             lngt: location.lngt,
//           },
//         }),
//       };
//     });
//     withSpotDistances.sort(sortByDistance);

//     const withRestaurantDistances = restaurantGglNearbySearchRes.map(
//       restaurant => {
//         const location = JSON.parse(restaurant.geometry.location) as LatLngt;
//         return {
//           data: restaurant,
//           distance: getDistance({
//             startPoint: {
//               lat,
//               lngt,
//             },
//             endPoint: {
//               lat: location.lat,
//               lngt: location.lngt,
//             },
//           }),
//         };
//       },
//     );
//     withRestaurantDistances.sort(sortByDistance);
//     return {
//       me: outerItem as BaseListType,
//       withHotel: {
//         data: withHotelDistances.map(e => e.data),
//         metaDataForDistance: evalMetaData(
//           withHotelDistances.map(e => e.distance),
//         ),
//       },
//       withSpot: {
//         data: withSpotDistances.map(e => e.data),
//         metaDataForDistance: evalMetaData(
//           withSpotDistances.map(e => e.distance),
//         ),
//       },
//       withRestaurant: {
//         data: withRestaurantDistances.map(e => e.data),
//         metaDataForDistance: evalMetaData(
//           withSpotDistances.map(e => e.distance),
//         ),
//       },
//     };
//   });

//   return distanceMaps;
// };

const getRecommendListWithLatLngtInnerAsyncFn = async (
  params: GetRecommendListWithLatLngtReqParams,
): Promise<GetRecommendListWithLatLngtInnerAsyncFnResponse> => {
  if (isEmpty(params)) {
    throw new IBError({
      type: 'INVALIDPARAMS',
      message: 'parameter가 필요합니다.',
    });
  }

  const { searchCond } = params;
  const {
    minBudget = 0, // 여행 전체일정중 최소비용
    maxBudget = 0, // 여행 전체 일정중 최대 비용
    // currency,
    // travelType,
    // travelIntensity,
    travelStartDate, // 여행 시작일
    travelEndDate, // 여행 종료일
    hotelTransition = 0, // 호텔 바꾸는 횟수
    nearbySearchReqParams,
    searchHotelReqParams,
  } = searchCond;

  const { radius = 4000, location } = nearbySearchReqParams;
  const { latitude: hotelLat, longitude: hotelLngt } = searchHotelReqParams;

  if (minBudget === 0 || maxBudget === 0) {
    throw new IBError({
      type: 'INVALIDPARAMS',
      message: 'minBudget, maxBudget은 모두 0이상의 값이 제공되어야 합니다.',
    });
  }

  if (
    isEmpty(location) ||
    isEmpty(location.latitude) ||
    isEmpty(location.longitude)
  ) {
    throw new IBError({
      type: 'INVALIDPARAMS',
      message:
        '전달된 파라미터중 nearbySearchReqParams의 location(latitude, longitude) 값이 없거나 string으로 제공되지 않았습니다.',
    });
  }

  if (isEmpty(hotelLat) || isEmpty(hotelLngt)) {
    throw new IBError({
      type: 'INVALIDPARAMS',
      message:
        '전달된 파라미터중 searchHotelReqParams의 latitude, longitude 값이 없거나 string으로 제공되지 않았습니다.',
    });
  }

  if (
    isEmpty(travelStartDate) ||
    isEmpty(travelEndDate) ||
    !(new Date(travelStartDate) instanceof Date) ||
    !(new Date(travelEndDate) instanceof Date)
  ) {
    throw new IBError({
      type: 'INVALIDPARAMS',
      message:
        'travelStartDate, travelEndDate 값은 모두 Date의 ISO string 형태로 제공되어야 합니다.',
    });
  }

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
  const sameDatedSearchHotelReqParams = {
    ...searchCond.searchHotelReqParams,
    checkinDate: searchCond.searchHotelReqParams.checkinDate ?? travelStartDate,
    checkoutDate: searchCond.searchHotelReqParams.checkoutDate ?? travelEndDate,
  };
  const sameDatedSearchCond = {
    ...searchCond,
    searchHotelReqParams: sameDatedSearchHotelReqParams,
  };
  const { queryParamId } = await searchHotelInnerAsyncFn(sameDatedSearchCond);
  // 식당 검색
  let nearbySearchResult: google.maps.places.IBPlaceResult[] = [];
  const travelDays = travelNights + 1;

  const radiusExtendRetryLimit = 5; // 구글 nearbySearch 시에 전체일정중 필요한 관광지나 식당수가 모자랄 경우 범위를 넓혀서 재검색하는데 이 재시도 리미트 횟수
  let radiusExtendRetry = 1;

  while (
    nearbySearchResult.length < travelDays * mealPerDay &&
    radiusExtendRetry <= radiusExtendRetryLimit
  ) {
    if (radiusExtendRetry > 1)
      console.log(`restaurant radiusExtendRetry:${radiusExtendRetry}`);
    const radiusModifiedQueryParams = {
      ...defaultQueryParams,
      sameDatedSearchHotelReqParams,
      nearbySearchReqParams: {
        ...nearbySearchReqParams,
        keyword: 'restaurant',
        radius: radius * radiusExtendRetry,
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
      sameDatedSearchHotelReqParams,
      nearbySearchReqParams: {
        ...nearbySearchReqParams,
        keyword: 'tourist places',
        radius: radius * radiusExtendRetry,
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

  const transitionTerm = Math.ceil(travelNights / (hotelTransition + 1)); // 호텔 이동할 주기 (단위: 일)
  const filterHotelWithBudget = () => {
    const copiedHotelRes = Array.from(searchHotelRes).reverse();

    const minHotelBudget = minBudget * minHotelBudgetPortion;
    const dailyMinBudget = minHotelBudget / travelNights;
    const midBudget = (minBudget + maxBudget) / 2;
    // const flexPortionLimit = 1.3;

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
  let minNodeLists: ScheduleNodeList = {
    hotel: searchHotelRes,
    restaurant: restaurantGglNearbySearchRes.slice(0, mealPerDay * travelDays),
    spot: touringSpotGglNearbySearchRes.slice(0, spotPerDay * travelDays),
  };

  let midNodeLists = {
    hotel: searchHotelRes,
    restaurant: restaurantGglNearbySearchRes.slice(0, mealPerDay * travelDays),
    spot: touringSpotGglNearbySearchRes.slice(0, spotPerDay * travelDays),
  };

  let maxNodeLists = {
    hotel: searchHotelRes,
    restaurant: restaurantGglNearbySearchRes.slice(0, mealPerDay * travelDays),
    spot: touringSpotGglNearbySearchRes.slice(0, spotPerDay * travelDays),
  };

  arr.reduce((acc: VisitSchedules, cur, idx) => {
    if (idx % transitionTerm === 0 && idx < arr.length - 1) {
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

    // minHotel의 idx 해당일 spot들 구하기
    const thatDaySpotFromMinHotel: GglNearbySearchResIncludedGeometry[] = [];
    const thatDayRestaurantFromMinHotel: GglNearbySearchResIncludedGeometry[] =
      [];
    const thatDayVisitOrderFromMinHotel: VisitOrder[] = [];
    if (minBudgetHotel) {
      let destination: GglNearbySearchResIncludedGeometry;
      let prevDest: SearchHotelRes | GglNearbySearchResIncludedGeometry =
        minBudgetHotel;
      thatDayVisitOrderFromMinHotel.push({
        type: 'hotel',
        data: prevDest,
      });
      const mealOrder = new MealOrder();
      let nextMealOrder = mealOrder.getNextMealOrder();
      for (let i = 0; i < spotPerDay + mealPerDay; i += 1) {
        if (nextMealOrder === i) {
          const distanceMapsFromBase = orderByDistanceFromNode({
            baseNode: prevDest,
            scheduleNodeLists: minNodeLists,
          });
          destination = distanceMapsFromBase.withRestaurants[0].data;
          thatDayRestaurantFromMinHotel.push(destination);
          thatDayVisitOrderFromMinHotel.push({
            type: 'restaurant',
            data: destination,
          });
          prevDest = destination;
          minNodeLists = {
            ...minNodeLists,
            restaurant: distanceMapsFromBase.withRestaurants
              .map(s => {
                return s.data;
              })
              .slice(1, distanceMapsFromBase.withRestaurants.length), // 방금 thatDayRestaurantFromMinHotel push 등록한 장소는(맨앞 0번째 항목) 제외한다.
          };
          nextMealOrder = mealOrder.getNextMealOrder();
        } else {
          const distanceMapsFromBase = orderByDistanceFromNode({
            baseNode: prevDest,
            scheduleNodeLists: minNodeLists,
          });
          destination = distanceMapsFromBase.withSpots[0].data;
          thatDaySpotFromMinHotel.push(destination);
          thatDayVisitOrderFromMinHotel.push({
            type: 'spot',
            data: destination,
          });
          prevDest = destination;

          minNodeLists = {
            ...minNodeLists,
            spot: distanceMapsFromBase.withSpots
              .map(s => {
                return s.data;
              })
              .slice(1, distanceMapsFromBase.withSpots.length), // 방금 thatDaySpotFromMinHotel에 push 등록한 장소는(맨앞 0번째 항목) 제외한다.
          };
        }
      }
    }

    // midHotel의 idx 해당일 spot들 구하기
    const thatDaySpotFromMidHotel: GglNearbySearchResIncludedGeometry[] = [];
    const thatDayRestaurantFromMidHotel: GglNearbySearchResIncludedGeometry[] =
      [];
    const thatDayVisitOrderFromMidHotel: VisitOrder[] = [];
    if (midBudgetHotel) {
      let destination: GglNearbySearchResIncludedGeometry;

      let prevDest: SearchHotelRes | GglNearbySearchResIncludedGeometry =
        midBudgetHotel;
      thatDayVisitOrderFromMidHotel.push({
        type: 'hotel',
        data: prevDest,
      });
      const mealOrder = new MealOrder();
      let nextMealOrder = mealOrder.getNextMealOrder();
      for (let i = 0; i < spotPerDay + mealPerDay; i += 1) {
        if (nextMealOrder === i) {
          const distanceMapsFromBase = orderByDistanceFromNode({
            baseNode: prevDest,
            scheduleNodeLists: midNodeLists,
          });
          destination = distanceMapsFromBase.withRestaurants[0].data;
          thatDayRestaurantFromMidHotel.push(destination);
          thatDayVisitOrderFromMidHotel.push({
            type: 'restaurant',
            data: destination,
          });
          prevDest = destination;

          midNodeLists = {
            ...midNodeLists,
            restaurant: distanceMapsFromBase.withRestaurants
              .map(s => {
                return s.data;
              })
              .slice(1, distanceMapsFromBase.withRestaurants.length), // 방금 thatDayRestaurantFromMidHotel push 등록한 장소는(맨앞 0번째 항목) 제외한다.
          };
          nextMealOrder = mealOrder.getNextMealOrder();
        } else {
          const distanceMapsFromBase = orderByDistanceFromNode({
            baseNode: prevDest,
            scheduleNodeLists: midNodeLists,
          });
          destination = distanceMapsFromBase.withSpots[0].data;
          thatDaySpotFromMidHotel.push(destination);
          thatDayVisitOrderFromMidHotel.push({
            type: 'spot',
            data: destination,
          });
          prevDest = destination;
          midNodeLists = {
            ...midNodeLists,
            spot: distanceMapsFromBase.withSpots
              .map(s => {
                return s.data;
              })
              .slice(1, distanceMapsFromBase.withSpots.length), // 방금 thatDaySpotFromMidHotel에 push 등록한 장소는(맨앞 0번째 항목) 제외한다.
          };
        }
      }
    }

    // maxHotel의 idx 해당일 spot들 구하기
    const thatDaySpotFromMaxHotel: GglNearbySearchResIncludedGeometry[] = [];
    const thatDayRestaurantFromMaxHotel: GglNearbySearchResIncludedGeometry[] =
      [];
    const thatDayVisitOrderFromMaxHotel: VisitOrder[] = [];
    if (maxBudgetHotel) {
      let destination: GglNearbySearchResIncludedGeometry;
      let prevDest: SearchHotelRes | GglNearbySearchResIncludedGeometry =
        maxBudgetHotel;
      thatDayVisitOrderFromMaxHotel.push({
        type: 'hotel',
        data: prevDest,
      });
      const mealOrder = new MealOrder();
      let nextMealOrder = mealOrder.getNextMealOrder();
      for (let i = 0; i < spotPerDay + mealPerDay; i += 1) {
        if (nextMealOrder === i) {
          const distanceMapsFromBase = orderByDistanceFromNode({
            baseNode: prevDest,
            scheduleNodeLists: maxNodeLists,
          });
          destination = distanceMapsFromBase.withRestaurants[0].data;
          thatDayRestaurantFromMaxHotel.push(destination);
          thatDayVisitOrderFromMaxHotel.push({
            type: 'restaurant',
            data: destination,
          });
          prevDest = destination;
          maxNodeLists = {
            ...maxNodeLists,
            restaurant: distanceMapsFromBase.withRestaurants
              .map(s => {
                return s.data;
              })
              .slice(1, distanceMapsFromBase.withRestaurants.length), // 방금 thatDayRestaurantFromMaxHotel push 등록한 장소는(맨앞 0번째 항목) 제외한다.
          };
          nextMealOrder = mealOrder.getNextMealOrder();
        } else {
          const distanceMapsFromBase = orderByDistanceFromNode({
            baseNode: prevDest,
            scheduleNodeLists: maxNodeLists,
          });
          destination = distanceMapsFromBase.withSpots[0].data;
          thatDaySpotFromMaxHotel.push(destination);
          thatDayVisitOrderFromMaxHotel.push({
            type: 'spot',
            data: destination,
          });
          prevDest = destination;
          maxNodeLists = {
            ...maxNodeLists,
            spot: distanceMapsFromBase.withSpots
              .map(s => {
                return s.data;
              })
              .slice(1, distanceMapsFromBase.withSpots.length), // 방금 thatDaySpotFromMaxHotel에 push 등록한 장소는(맨앞 0번째 항목) 제외한다.
          };
        }
      }
    }

    acc.push({
      visitOrder: {
        ordersFromMinHotel: thatDayVisitOrderFromMinHotel,
        ordersFromMidHotel: thatDayVisitOrderFromMidHotel,
        ordersFromMaxHotel: thatDayVisitOrderFromMaxHotel,
      },
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
        // 여행 마지막날은 숙박하지 않는다.
        minBudgetHotel: idx === arr.length - 1 ? undefined : minBudgetHotel,
        midBudgetHotel: idx === arr.length - 1 ? undefined : midBudgetHotel,
        maxBudgetHotel: idx === arr.length - 1 ? undefined : maxBudgetHotel,
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
    metaInfo: {
      totalHotelSearchCount: searchHotelRes.length,
      totalRestaurantSearchCount: restaurantGglNearbySearchRes.length,
      totalSpotSearchCount: touringSpotGglNearbySearchRes.length,
      spotPerDay,
      mealPerDay,
      mealSchedule: new MealOrder().mealOrder,
      travelNights,
      travelDays,
      hotelTransition,
      transitionTerm,
      // recommendedSpotCount,
      // recommendedRestaurantCount,
      recommendedMinHotelCount,
      recommendedMidHotelCount,
      recommendedMaxHotelCount,
    },
    visitSchedulesCount: visitSchedules.length,
    visitSchedules,
    queryParamId,
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
      hotelTransition: 0,
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
        radius: 4000,
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
          const d: {
            hotelId?: number;
            spotId?: number;
            restaurantId?: number;
          } = {
            ...(item.type === 'HOTEL' && { hotelId: item.dataId }),
            ...(item.type === 'RESTAURANT' && { restaurantId: item.dataId }),
            ...(item.type === 'SPOT' && { spotId: item.dataId }),
          };

          return prisma.visitSchedule.create({
            data: {
              dayNo: item.dayNo,
              orderNo: item.orderNo,
              from: item.from,
              type: item.type,
              dataId: item.dataId,
              ...d,
              queryParamsId: queryParamId,
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
              spot: true,
              restaurant: true,
              hotel: true,
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
                return {
                  visitScheduleId: v.id.toString(),
                  orderNo: v.orderNo.toString(),
                  // dayNo: v.dayNo.toString(),
                  title: (() => {
                    if (v.type === 'HOTEL')
                      return v.hotel?.hotel_name ?? 'error';
                    if (v.type === 'RESTAURANT') {
                      return v.restaurant?.name ?? 'error';
                    }
                    return v.spot?.name ?? 'error';
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
              spot: {
                include: {
                  photos: true,
                  geometry: true,
                },
              },
              restaurant: {
                include: {
                  photos: true,
                  geometry: true,
                },
              },
              hotel: true,
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
          const place = (() => {
            if (v.type === 'HOTEL') return v.hotel;
            if (v.type === 'RESTAURANT') return v.restaurant;
            return v.spot;
          })();

          if (v.type === 'HOTEL') {
            const hotel = place as SearchHotelRes;
            return {
              id: v.id.toString(),
              spotType: v.type as string,
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
          if (v.type === 'RESTAURANT') {
            const restaurant = place as GglNearbySearchRes & {
              photos: GglPhotos[];
              geometry?: Gglgeometry;
            };
            return {
              id: v.id.toString(),
              spotType: v.type as string,
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
            spotType: v.type as string,
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

const getPlaceDetail = async (params: { placeId: string }) => {
  try {
    const { placeId } = params;
    const queryUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&key=${
      process.env.GCP_MAPS_APIKEY as string
    }`;
    const rawResponse = await axios.get(queryUrl);
    const fetchedData = rawResponse.data as GetPlaceDetailResponse;
    return fetchedData.result;
  } catch (err) {
    throw new IBError({
      type: 'EXTERNALAPI',
      message: `google place detail api 요청중 문제가 발생했습니다.`,
    });
  }
};

const transPriceLevel = (data: unknown) => {
  const priceLevel = (data as { price_level?: number }).price_level;
  if (priceLevel)
    return GooglePriceLevel[priceLevel] as keyof typeof GooglePriceLevel;
  return null;
};

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
          spot: {
            include: {
              geometry: true,
              photos: true,
            },
          },
          restaurant: {
            include: {
              geometry: true,
              photos: true,
            },
          },
          hotel: true,
          QueryParams: {
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

      if (visitSchedule.QueryParams?.userTokenId !== userTokenId) {
        throw new IBError({
          type: 'NOTEXISTDATA',
          message: '다른 유저의 visitSchedule 데이터입니다.',
        });
      }

      const retValue =
        await (async (): Promise<GetDetailScheduleResponsePayload> => {
          if (visitSchedule.type === 'HOTEL') {
            const { hotel } = visitSchedule as { hotel: SearchHotelRes };
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
              spotType: visitSchedule.type,
              previewImg: hotel.main_photo_url,
              spotName: hotel.hotel_name,
              roomType: hotel.unit_configuration_label,
              spotAddr: hotel.address,
              hotelBookingUrl: hotel.url,
              placeId: null,
              startDate:
                visitSchedule && visitSchedule.QueryParams
                  ? moment(visitSchedule.QueryParams.hotelCheckinDate).format(
                      'YYYY-MM-DD',
                    )
                  : null,
              endDate:
                visitSchedule && visitSchedule.QueryParams
                  ? moment(visitSchedule.QueryParams.hotelCheckoutDate).format(
                      'YYYY-MM-DD',
                    )
                  : null,
              night:
                visitSchedule.QueryParams?.metaScheduleInfo?.travelNights ??
                null,
              days:
                visitSchedule.QueryParams?.metaScheduleInfo?.travelDays ?? null,
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
          if (visitSchedule.type === 'RESTAURANT') {
            const { restaurant } = visitSchedule as {
              restaurant: GglNearbySearchRes & {
                geometry: Gglgeometry;
                photos: GglPhotos[];
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
              spotType: visitSchedule.type,
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
                visitSchedule.QueryParams?.metaScheduleInfo?.travelNights ??
                null,
              days:
                visitSchedule.QueryParams?.metaScheduleInfo?.travelDays ?? null,
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
          const { spot } = visitSchedule as {
            spot: GglNearbySearchRes & {
              geometry: Gglgeometry;
              photos: GglPhotos[];
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
            spotType: visitSchedule.type,
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
              visitSchedule.QueryParams?.metaScheduleInfo?.travelNights ?? null,
            days:
              visitSchedule.QueryParams?.metaScheduleInfo?.travelDays ?? null,
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
              searchHotelRes: {
                where: { visitSchedule: { none: {} } },
              },
              gglNearbySearchRes: {
                where: {
                  AND: [
                    { spotSchedule: { none: {} } },
                    { restaurantSchedule: { none: {} } },
                  ],
                },
              },
            },
          });

          return {
            id: queryParams?.id.toString() ?? '-1',
            contentsCountAll: queryParams?.searchHotelRes.length ?? -1,
            spotList: queryParams?.searchHotelRes.map(hotel => {
              return {
                id: hotel.id.toString(),
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
              gglNearbySearchRes: {
                where: {
                  types: {
                    some: { value: { equals: 'restaurant' } },
                  },
                  AND: [
                    { spotSchedule: { none: {} } },
                    { restaurantSchedule: { none: {} } },
                  ],
                },
                include: {
                  photos: true,
                  geometry: true,
                },
              },
            },
          });

          return {
            id: queryParams?.id.toString() ?? '-1',
            contentsCountAll: queryParams?.gglNearbySearchRes.length ?? -1,
            spotList: queryParams?.gglNearbySearchRes.map(restaurant => {
              return {
                id: restaurant.id.toString(),
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
            gglNearbySearchRes: {
              where: {
                types: {
                  none: { value: { equals: 'restaurant' } },
                },
                AND: [
                  { spotSchedule: { none: {} } },
                  { restaurantSchedule: { none: {} } },
                ],
              },
              include: {
                photos: true,
                geometry: true,
              },
            },
          },
        });
        return {
          id: queryParams?.id.toString() ?? '-1',
          contentsCountAll: queryParams?.gglNearbySearchRes.length ?? -1,
          spotList: queryParams?.gglNearbySearchRes.map(spot => {
            return {
              id: spot.id.toString(),
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
          type: candidateSpotType.toUpperCase() as PlaceType,
          dataId: Number(candidateId),
          hotelId:
            candidateSpotType.toUpperCase() === 'HOTEL'
              ? Number(candidateId)
              : null,
          restaurantId:
            candidateSpotType.toUpperCase() === 'RESTAURANT'
              ? Number(candidateId)
              : null,
          spotId:
            candidateSpotType.toUpperCase() === 'SPOT'
              ? Number(candidateId)
              : null,
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
          const hotel = await prisma.searchHotelRes.findUnique({
            where: {
              id: Number(candidateId),
            },
            include: {
              QueryParams: {
                include: {
                  metaScheduleInfo: true,
                },
              },
            },
          });
          return hotel;
        }

        if (candidateSpotType.toUpperCase() === 'RESTAURANT') {
          const restaurant = await prisma.gglNearbySearchRes.findUnique({
            where: {
              id: Number(candidateId),
            },
            include: {
              geometry: true,
              photos: true,
              QueryParams: {
                include: {
                  metaScheduleInfo: true,
                },
              },
            },
          });
          return restaurant;
        }
        const spot = await prisma.gglNearbySearchRes.findUnique({
          where: {
            id: Number(candidateId),
          },
          include: {
            geometry: true,
            photos: true,
            QueryParams: {
              include: {
                metaScheduleInfo: true,
              },
            },
          },
        });
        return spot;
      })();

      if (!candidateSchedule) {
        throw new IBError({
          type: 'NOTEXISTDATA',
          message: 'candidateId 에 대응하는 데이터가 존재하지 않습니다.',
        });
      }

      const retValue =
        await (async (): Promise<GetCandidateDetailScheduleResponsePayload> => {
          if (candidateSpotType === 'HOTEL') {
            const hotel = candidateSchedule as SearchHotelRes;
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
              id: candidateSchedule.id.toString(),
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
                candidateSchedule && candidateSchedule.QueryParams
                  ? moment(
                      candidateSchedule.QueryParams.hotelCheckinDate,
                    ).format('YYYY-MM-DD')
                  : null,
              endDate:
                candidateSchedule && candidateSchedule.QueryParams
                  ? moment(
                      candidateSchedule.QueryParams.hotelCheckoutDate,
                    ).format('YYYY-MM-DD')
                  : null,
              night:
                candidateSchedule.QueryParams?.metaScheduleInfo?.travelNights ??
                null,
              days:
                candidateSchedule.QueryParams?.metaScheduleInfo?.travelDays ??
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
            const restaurant = candidateSchedule as GglNearbySearchRes & {
              geometry: Gglgeometry;
              photos: GglPhotos[];
            };

            const detailData: GglPlaceDetailType = await getPlaceDetail({
              placeId: restaurant.place_id ?? '',
            });

            return {
              id: candidateSchedule.id.toString(),
              // dayCount: candidateSchedule.dayNo,
              // orderCount: candidateSchedule.orderNo,
              // planType: candidateSchedule.from,
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
                candidateSchedule.QueryParams?.metaScheduleInfo?.travelNights ??
                null,
              days:
                candidateSchedule.QueryParams?.metaScheduleInfo?.travelDays ??
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
          const spot = candidateSchedule as GglNearbySearchRes & {
            geometry: Gglgeometry;
            photos: GglPhotos[];
          };
          const detailData: GglPlaceDetailType = await getPlaceDetail({
            placeId: spot.place_id ?? '',
          });

          return {
            id: candidateSchedule.id.toString(),
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
              candidateSchedule.QueryParams?.metaScheduleInfo?.travelNights ??
              null,
            days:
              candidateSchedule.QueryParams?.metaScheduleInfo?.travelDays ??
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

/// internal dev api function
const getHotelPhotos = asyncWrapper(
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
export default scheduleRouter;
