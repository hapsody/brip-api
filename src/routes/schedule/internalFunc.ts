/* eslint-disable @typescript-eslint/naming-convention */

// import prisma from '@src/prisma';
import { IBError, getToday, getTomorrow } from '@src/utils';
import axios, { AxiosResponse, Method } from 'axios';
import prisma from '@src/prisma';
import { PrismaClient, Prisma, PlaceType } from '@prisma/client';
import moment from 'moment';
import { omit, isEmpty, isNumber, isNil, isUndefined } from 'lodash';
import {
  QueryReqParams,
  defaultNearbySearchReqParams,
  defaultSearchHotelReqParams,
  NearbySearchInnerFnRes,
  SearchedData,
  GetListQueryParamsReqParams,
  GetRecommendListWithLatLngtReqParams,
  GetRecommendListWithLatLngtInnerFnRetParams,
  VisitSchedules,
  defaultQueryParams,
  GetListQueryParamsInnerFnRetParams,
  SearchLocationsFromBookingComReqParams,
  SearchLocationsFromBookingComRawResponse,
  SearchLocationsFromBookingComInnerFnRetParams,
  FiltersForSearchFromBookingComReqParams,
  FiltersForSearchFromBookingComInnerFnRetParams,
  FiltersForSearchFromBookingRawResponse,
  getQueryParamsForHotel,
  getQueryParamsForRestaurant,
  getQueryParamsForTourSpot,
  LatLngt,
  DistanceMap,
  GglNearbySearchResWithGeoNTourPlace,
  ScheduleNodeList,
  MealOrder,
  gMealPerDay,
  gSpotPerDay,
  gMinHotelMoneyPortion,
  gMidHotelMoneyPortion,
  gMaxHotelMoneyPortion,
  VisitOrder,
  gFlexPortionLimit,
  GetPlaceDetailRawResponse,
  GooglePriceLevel,
  TextSearchReqParams,
  SyncVisitJejuDataReqParams,
  SyncVisitJejuDataRetParamsPayload,
  SearchHotelResWithTourPlace,
  TextSearchInnerFnRetParams,
  GglPlaceDetailType,
  gHotelTransition,
  gRadius,
  FavoriteTravelType,
  FavoriteAccommodationType,
  FavoriteAccommodationLocation,
  gCurrency,
  FilterHotelWithMoneyReqParams,
  FilterHotelWithMoneyRetParams,
  gLanguage,
} from './types/schduleTypes';

export const childInfantToChildrenAges = (params: {
  child: number;
  infant: number;
}): number[] => {
  const { child, infant } = params;
  return Array.from({ length: child }, () => 5).concat(
    Array.from({ length: infant }, () => 1),
  ); /// child는 5세, infant는 1세로 일괄 처리.
};

export const createQueryParamId = async (
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
): Promise<number> => {
  const { nearbySearchReqParams, searchHotelReqParams } = params;
  const { keyword, radius, location } =
    nearbySearchReqParams ?? defaultNearbySearchReqParams;
  const { latitude: nearbySearchLat, longitude: nearbySearchLngt } =
    location ?? {
      latitude: undefined,
      longitude: undefined,
    };

  const {
    orderBy,
    adultsNumber,
    roomNumber = 1,
    checkinDate,
    checkoutDate,
    filterByCurrency,
    latitude: paramLat,
    longitude: paramLngt,
    childrenAges,
    childrenNumber = 0,
    categoriesFilterIds,
    includeAdjacency = false,
    // mock
  } = searchHotelReqParams ?? defaultSearchHotelReqParams;

  if (ifAlreadyQueryId && ifAlreadyQueryId > 0) return ifAlreadyQueryId;

  const queryParamResult = await prismaX.queryParams.create({
    data: {
      keyword: isEmpty(keyword) ? null : keyword,
      radius: radius > 0 ? radius : null,
      latitude: parseFloat(nearbySearchLat ?? paramLat ?? 9999),
      longitude: parseFloat(nearbySearchLngt ?? paramLngt ?? 9999),
      hotelOrderBy: orderBy,
      hotelAdultsNumber: adultsNumber,
      hotelRoomNumber: roomNumber,
      hotelCheckinDate: new Date(checkinDate),
      hotelCheckoutDate: new Date(checkoutDate),
      hotelFilterByCurrency: isEmpty(filterByCurrency)
        ? gCurrency
        : filterByCurrency,
      hotelChildrenAges: childrenAges?.toString(),
      hotelChildrenNumber: childrenNumber,
      hotelCategoriesFilterIds: categoriesFilterIds?.toString(),
      hotelIncludeAdjacency: includeAdjacency ?? false,
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

export const storeDataRelatedWithQueryParams = async (params: {
  queryReqParams?: QueryReqParams;
  response: AxiosResponse;
  batchJobId?: number;
  ifAlreadyQueryId?: number;
}): Promise<{
  results: google.maps.places.IBPlaceResult[];
  queryParamId: number;
}> => {
  const { queryReqParams, response, ifAlreadyQueryId } = params;
  const { batchJobId } = params;
  let queryParamId: number = -1;
  let results: google.maps.places.IBPlaceResult[] = [];
  if (response?.statusText === 'OK') {
    if (queryReqParams && !batchJobId) {
      queryParamId = await createQueryParamId(
        prisma,
        queryReqParams,
        ifAlreadyQueryId,
      );
    }

    results =
      (
        response.data as Partial<{
          results: google.maps.places.IBPlaceResult[];
        }>
      ).results ?? [];

    // eslint-disable-next-line no-restricted-syntax
    for await (const item of results) {
      await prisma.gglNearbySearchRes.create({
        data: {
          tourPlace: {
            create: {
              ...(queryParamId > 0 &&
                !batchJobId && {
                  queryParams: {
                    connect: {
                      id: queryParamId,
                    },
                  },
                }),
              tourPlaceType:
                item.types?.findIndex(
                  type => type.toUpperCase() === 'RESTAURANT',
                ) === -1
                  ? 'SPOT'
                  : 'RESTAURANT',
              ...(batchJobId &&
                batchJobId > 0 && {
                  batchQueryParams: {
                    connectOrCreate: {
                      where: {
                        id: batchJobId,
                      },
                      create: {
                        // keyword: queryReqParams?.textSearchReqParams?.keyword,
                        latitude: queryReqParams?.textSearchReqParams?.location
                          ? Number(
                              queryReqParams.textSearchReqParams.location
                                .latitude,
                            )
                          : undefined,
                        longitude: queryReqParams?.textSearchReqParams?.location
                          ? Number(
                              queryReqParams.textSearchReqParams.location
                                .longitude,
                            )
                          : undefined,
                        radius: queryReqParams?.textSearchReqParams?.radius,
                        searchkeyword: {
                          connectOrCreate: {
                            where: {
                              keyword:
                                queryReqParams?.textSearchReqParams?.keyword,
                            },
                            create: {
                              keyword:
                                queryReqParams?.textSearchReqParams?.keyword ??
                                '',
                            },
                          },
                        },
                      },
                    },
                  },
                  batchSearchKeyword: {
                    connectOrCreate: {
                      where: {
                        keyword: queryReqParams?.textSearchReqParams?.keyword,
                      },
                      create: {
                        keyword:
                          queryReqParams?.textSearchReqParams?.keyword ?? '',
                      },
                    },
                  },
                }),
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
          formatted_address: item.formatted_address,
          plus_code: {
            create: {
              compund_code: item.plus_code?.compound_code ?? '',
              global_code: item.plus_code?.global_code ?? '',
            },
          },
          photos: {
            // create: await getPlacePhoto(item),
            create: item.photos?.map(photo => {
              return {
                height: photo.height,
                width: photo.width,
                html_attributions: JSON.stringify(photo.html_attributions),
                photo_reference:
                  (photo as Partial<{ photo_reference: string }>)
                    .photo_reference ?? '',
              };
            }),
          },
        },
      });
    }
  }

  return { results, queryParamId };
};

export const searchLocationsFromBookingComInnerFn = async (
  params: SearchLocationsFromBookingComReqParams,
): Promise<SearchLocationsFromBookingComInnerFnRetParams[]> => {
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

export const filterForSearchFromBookingComInnerFn = async (
  params: FiltersForSearchFromBookingComReqParams,
): Promise<FiltersForSearchFromBookingComInnerFnRetParams> => {
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

export const nearbySearchInnerFn = async (
  queryReqParams: QueryReqParams,
  ifAlreadyQueryId?: number,
  // compositeSearch?: {
  //   checkinDate: Date;
  //   checkoutDate: Date;
  // },
): Promise<NearbySearchInnerFnRes> => {
  const {
    nearbySearchReqParams: { location, radius, pageToken, keyword },
  } = queryReqParams;

  const queryUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?keyword=${
    keyword ?? ''
  }&language=${gLanguage}&location=${location?.latitude},${
    location?.longitude
  }&radius=${radius}&key=${process.env.GCP_MAPS_APIKEY as string}${
    pageToken ? `&pagetoken=${pageToken}` : ''
  }`;
  console.log(queryUrl);

  const response = await axios.get(encodeURI(queryUrl));

  const { results, queryParamId } = await storeDataRelatedWithQueryParams({
    queryReqParams,
    response,
    ifAlreadyQueryId,
  });

  return {
    nearbySearchResult: results,
    queryParamId,
    pageToken: (response.data as Partial<{ next_page_token: string }>)
      .next_page_token,
  };
};

export const textSearchInnerFn = async (params: {
  textSearchReqParams: TextSearchReqParams;
  batchJobId?: number;
  ifAlreadyQueryId?: number;
}): Promise<TextSearchInnerFnRetParams> => {
  const { textSearchReqParams, batchJobId, ifAlreadyQueryId } = params;
  const {
    // location,
    // radius,
    pageToken,
    keyword,
  } = textSearchReqParams;

  const queryUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${
    keyword ?? ''
  }&language=ko&key=${process.env.GCP_MAPS_APIKEY as string}${
    pageToken ? `&pagetoken=${pageToken}` : ''
  }`;
  console.log(queryUrl);

  const response = await axios.get(encodeURI(queryUrl));

  const { results, queryParamId } = await storeDataRelatedWithQueryParams({
    queryReqParams: { textSearchReqParams } as QueryReqParams,
    response,
    batchJobId,
    ifAlreadyQueryId,
  });

  return {
    textSearchResult: results,
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

export const getAllNearbySearchPages = async (
  queryReqParams: QueryReqParams,
  ifAlreadyQueryId?: number,
  loopLoadAll = false,
): Promise<google.maps.places.IBPlaceResult[]> => {
  let retry = 1;
  const retryLimit = 10;

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
    const loopTemp = await nearbySearchInnerFn(
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
 * 구글 getAllNearbySearchPages 를 내부 개발 테스트용으로 개조한 함수
 * @param queryReqParams
 * @param ifAlreadyQueryId DB에는 QueryParams에 GglNearbySearchRes, SearchHotelRes가 한번에 관계되어 있다.
 * DB에 GglNearbySearchRes 를 create할때 QueryParams id를 알려주어야 관계를 맺을수 있기 때문에 해당 파라미터로 받아 외래키로 관계를 형성한다.
 * @param loopLoadAll 끝 페이지까지 읽는 로직을 실행할것인지 결정한다. false라면 첫번째 페이지 값만 리턴한다.
 * @returns
 */

export const getAllTextSearchPages = async (params: {
  textSearchReqParams: TextSearchReqParams;
  ifAlreadyQueryId?: number;
  batchJobId?: number;
  loopLoadAll?: boolean;
}): Promise<google.maps.places.IBPlaceResult[]> => {
  const {
    textSearchReqParams,
    ifAlreadyQueryId,
    batchJobId,
    loopLoadAll = false,
  } = params;
  let retry = 1;
  const retryLimit = 10;

  // recursion version
  const loopFunc = async (curPageToken: string) => {
    const nextReqParams: TextSearchReqParams = {
      ...textSearchReqParams,
      pageToken: curPageToken ?? '',
    };
    // eslint-disable-next-line no-await-in-loop
    const loopTemp = await textSearchInnerFn({
      textSearchReqParams: nextReqParams,
      batchJobId,
      ifAlreadyQueryId,
    });

    const nextPageToken = loopTemp.pageToken ?? '';
    const stopLoop = !loopLoadAll;
    retry += 1;

    if (stopLoop || isEmpty(nextPageToken) || retry > retryLimit)
      return [...loopTemp.textSearchResult];

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
      ...loopTemp.textSearchResult,
    ];

    return loopResult;
  };
  const loopFuncRes = await loopFunc(textSearchReqParams.pageToken ?? '');

  return loopFuncRes;
};

/**
 * queryReqParams의 조건에 맞춰 booking.com api로 호텔을 검색한다.
 * /searchHotel api 호출시 실제 동작부를 형성한다. (비슷한 동작부를 다른곳에서 사용하기 용이하도록 모듈로써 사용하기 위해 endpoint 함수와 wrapper-inner함수로써 분리함)
 * @param queryReqParams
 * @param ifAlreadyQueryId DB에는 QueryParams에 GglNearbySearchRes, SearchHotelRes가 한번에 관계되어 있다.
 * DB에 hotelSearchRes 를 create할때 QueryParams id를 알려주어야 관계를 맺을수 있기 때문에 해당 파라미터로 받아 관계를 형성한다.
 * @return
 */
export const searchHotelInnerFn = async (
  queryReqParams: QueryReqParams,
  ifAlreadyQueryId?: number,
): Promise<{ hotelSearchResult: SearchedData[]; queryParamId: number }> => {
  const { currency, searchHotelReqParams } = queryReqParams;

  const {
    orderBy = 'popularity',
    adultsNumber = 2,
    roomNumber = 1,
    checkinDate = getToday(),
    checkoutDate = getTomorrow(),
    filterByCurrency = currency ??
      searchHotelReqParams.filterByCurrency ??
      gCurrency,
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
        // QueryParams: {
        //   connect: {
        //     id: queryParamId,
        //   },
        // },
        tourPlace: {
          create: {
            tourPlaceType: 'HOTEL',
            queryParams: {
              connect: {
                id: queryParamId,
              },
            },
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
 * DB로부터 QueryParams 모델 데이터를 불러 응신한다.
 * 구글 nearbySearch, rapid api booking.com hotelSearch를 한번의 쿼리로 복합 검색시(compositeSearch / getRecommendListWithLatLngt 등 ...)
 * 하나의 QueryParams 와 관계된 모든 데이터를 요청하는 /getListQueryParams api의 주요 내부 동작 함수
 */
export const getListQueryParamsInnerFn = async (
  params: GetListQueryParamsReqParams,
): Promise<GetListQueryParamsInnerFnRetParams> => {
  const queryParamsDataFromDB = await prisma.queryParams.findMany(params);

  return queryParamsDataFromDB as GetListQueryParamsInnerFnRetParams;
};

export const getDistance = ({
  startPoint,
  endPoint,
}: {
  startPoint: LatLngt;
  endPoint: LatLngt;
}): number => {
  return (
    (endPoint.lat - startPoint.lat) ** 2 + (endPoint.lng - startPoint.lng) ** 2
  );
};

export const orderByDistanceFromNode = <
  T extends SearchHotelResWithTourPlace | GglNearbySearchResWithGeoNTourPlace,
>({
  startNode,
  nodePool,
}: {
  startNode: T;
  nodePool: ScheduleNodeList;
}): DistanceMap<T> => {
  const sortByDistance = (
    a: { distanceFromStart: number },
    b: { distanceFromStart: number },
  ) => {
    if (a.distanceFromStart > b.distanceFromStart) {
      return 1;
    }
    if (a.distanceFromStart < b.distanceFromStart) {
      return -1;
    }
    return 0;
  };

  const startLocation = (() => {
    if ((startNode as SearchHotelResWithTourPlace).latitude !== undefined)
      return {
        latitude: (startNode as SearchHotelResWithTourPlace).latitude,
        longitude: (startNode as SearchHotelResWithTourPlace).longitude,
      };

    /// case GglNearbySearchResWithGeoNTourPlace
    const location = JSON.parse(
      (startNode as GglNearbySearchResWithGeoNTourPlace).geometry.location,
    ) as LatLngt;
    return {
      latitude: location.lat,
      longitude: location.lng,
    };
  })();
  const sortedHotels = nodePool.hotel.map(hotelEnd => {
    return {
      nodeData: hotelEnd,
      distanceFromStart: getDistance({
        startPoint: {
          lat: startLocation.latitude,
          lng: startLocation.longitude,
        },
        endPoint: {
          lat: hotelEnd.latitude,
          lng: hotelEnd.longitude,
        },
      }),
    };
  });
  sortedHotels.sort(sortByDistance);

  const sortedSpots = nodePool.spot.map(spotEnd => {
    const spotLocation = JSON.parse(spotEnd.geometry.location) as LatLngt;

    return {
      nodeData: spotEnd,
      distanceFromStart: getDistance({
        startPoint: {
          lat: startLocation.latitude,
          lng: startLocation.longitude,
        },
        endPoint: {
          lat: spotLocation.lat,
          lng: spotLocation.lng,
        },
      }),
    };
  });
  sortedSpots.sort(sortByDistance);

  const sortedRestaurants = nodePool.restaurant.map(restaurantEnd => {
    // const spotLocation = JSON.parse(restaurantEnd.geometry.location) as LatLngt;
    const restaurantLocation = JSON.parse(
      restaurantEnd.geometry.location,
    ) as LatLngt;

    return {
      nodeData: restaurantEnd,
      distanceFromStart: getDistance({
        startPoint: {
          lat: startLocation.latitude,
          lng: startLocation.longitude,
        },
        endPoint: {
          lat: restaurantLocation.lat,
          lng: restaurantLocation.lng,
        },
      }),
    };
  });
  sortedRestaurants.sort(sortByDistance);

  return {
    startNode,
    sortedHotels,
    sortedSpots,
    sortedRestaurants,
  };
};

export const filterHotelWithMoney = (
  params: FilterHotelWithMoneyReqParams,
): FilterHotelWithMoneyRetParams => {
  const { hotels, minMoney, maxMoney, travelNights } = params;
  const copiedHotelRes = Array.from(hotels).reverse();

  const minHotelMoney = minMoney * gMinHotelMoneyPortion;
  const dailyMinMoney = minHotelMoney / travelNights;
  const midMoney = (minMoney + maxMoney) / 2;
  // const gFlexPortionLimit = 1.3;

  const midHotelMoney = midMoney * gMidHotelMoneyPortion;
  const dailyMidMoney = (midHotelMoney * gFlexPortionLimit) / travelNights;

  const maxHotelMoney = maxMoney * gMaxHotelMoneyPortion;
  const dailyMaxMoney = maxHotelMoney / travelNights;

  const minFilteredHotels = copiedHotelRes.filter(
    hotel => hotel.min_total_price / travelNights < dailyMinMoney,
  );
  const midFilteredHotels = copiedHotelRes.filter(
    hotel => hotel.min_total_price / travelNights < dailyMidMoney,
  );
  const maxFilteredHotels = copiedHotelRes.filter(
    hotel => hotel.min_total_price / travelNights < dailyMaxMoney,
  );
  return {
    minFilteredHotels,
    midFilteredHotels,
    maxFilteredHotels,
  };
};

export const getRecommendListWithLatLngtInnerFn = async (
  params: GetRecommendListWithLatLngtReqParams,
): Promise<GetRecommendListWithLatLngtInnerFnRetParams> => {
  if (isEmpty(params)) {
    throw new IBError({
      type: 'INVALIDPARAMS',
      message: 'parameter가 필요합니다.',
    });
  }

  const { searchCond } = params;
  const {
    minMoney = 0, // 여행 전체일정중 최소비용
    maxMoney = 0, // 여행 전체 일정중 최대 비용
    // currency,
    // travelType,
    // travelIntensity,
    startDate, // 여행 시작일
    endDate, // 여행 종료일
    hotelTransition = gHotelTransition, // 호텔 바꾸는 횟수
    nearbySearchReqParams,
    searchHotelReqParams,
  } = searchCond;

  const { radius = gRadius, location } = nearbySearchReqParams;
  const { latitude: hotelLat, longitude: hotelLngt } = searchHotelReqParams;

  if (minMoney === 0 || maxMoney === 0) {
    throw new IBError({
      type: 'INVALIDPARAMS',
      message: 'minMoney, maxMoney는 모두 0이상의 값이 제공되어야 합니다.',
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
    isEmpty(startDate) ||
    isEmpty(endDate) ||
    !(new Date(startDate) instanceof Date) ||
    !(new Date(endDate) instanceof Date)
  ) {
    throw new IBError({
      type: 'INVALIDPARAMS',
      message:
        'startDate, endDate 값은 모두 Date의 ISO string 형태로 제공되어야 합니다.',
    });
  }

  const travelNights = getTravelNights(
    // searchCond.searchHotelReqParams.checkinDate,
    // searchCond.searchHotelReqParams.checkoutDate,
    startDate,
    endDate,
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
    checkinDate: searchCond.searchHotelReqParams.checkinDate ?? startDate,
    checkoutDate: searchCond.searchHotelReqParams.checkoutDate ?? endDate,
  };
  const sameDatedSearchCond = {
    ...searchCond,
    searchHotelReqParams: sameDatedSearchHotelReqParams,
  };
  const { queryParamId } = await searchHotelInnerFn(sameDatedSearchCond);
  // 식당 검색
  let nearbySearchResult: google.maps.places.IBPlaceResult[] = [];
  const travelDays = travelNights + 1;

  const radiusExtendRetryLimit = 5; // 구글 nearbySearch 시에 전체일정중 필요한 관광지나 식당수가 모자랄 경우 범위를 넓혀서 재검색하는데 이 재시도 리미트 횟수
  let radiusExtendRetry = 1;

  while (
    nearbySearchResult.length < travelDays * gMealPerDay &&
    radiusExtendRetry <= radiusExtendRetryLimit
  ) {
    if (radiusExtendRetry > 1)
      console.log(
        `restaurant radiusExtendRetry:${radiusExtendRetry}, searched results: ${nearbySearchResult.length}`,
      );
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
    nearbySearchResult.length < travelDays * gSpotPerDay &&
    radiusExtendRetry <= radiusExtendRetryLimit
  ) {
    if (radiusExtendRetry > 1)
      console.log(
        `touring spot radiusExtendRetry:${radiusExtendRetry}, , searched results: ${nearbySearchResult.length}`,
      );
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

  const hotelQueryParamsDataFromDB = await getListQueryParamsInnerFn(
    getQueryParamsForHotel(queryParamId),
  );
  const restaurantQueryParamsDataFromDB = await getListQueryParamsInnerFn(
    getQueryParamsForRestaurant(queryParamId),
  );
  const spotQueryParamsDataFromDB = await getListQueryParamsInnerFn(
    getQueryParamsForTourSpot(queryParamId),
  );
  const { tourPlace: tourPlaceHotel } = hotelQueryParamsDataFromDB[0];
  const { tourPlace: tourPlaceRestaurant } = restaurantQueryParamsDataFromDB[0];
  const { tourPlace: tourPlaceSpot } = spotQueryParamsDataFromDB[0];

  const searchHotelRes = tourPlaceHotel.map(v => v.searchHotelRes);
  const restaurantGglNearbySearchRes = tourPlaceRestaurant.map(
    v => v.gglNearbySearchRes,
  );

  const touringSpotGglNearbySearchRes = tourPlaceSpot.map(
    v => v.gglNearbySearchRes,
  );

  // const {
  //   TourPlace: {
  //     SearchHotelRes: searchHotelRes,
  //     gglNearbySearchRes: restaurantGglNearbySearchRes,
  //   },
  // } = restaurantQueryParamsDataFromDB[0];
  // const {
  //   TourPlace: { gglNearbySearchRes: touringSpotGglNearbySearchRes },
  // } = spotQueryParamsDataFromDB[0];

  const transitionTerm = Math.ceil(travelNights / (hotelTransition + 1)); // 호텔 이동할 주기 (단위: 일)

  const { minFilteredHotels, midFilteredHotels, maxFilteredHotels } =
    filterHotelWithMoney({
      hotels: searchHotelRes,
      minMoney,
      maxMoney,
      travelNights,
    });

  const visitSchedules: VisitSchedules = [];

  const arr = Array.from(Array(travelDays));
  // let recommendedSpotCount = 0;
  // let recommendedRestaurantCount = 0;

  let recommendedMinHotelCount = 0;
  let recommendedMidHotelCount = 0;
  let recommendedMaxHotelCount = 0;
  let prevMinHotel: SearchHotelResWithTourPlace | undefined;
  let prevMidHotel: SearchHotelResWithTourPlace | undefined;
  let prevMaxHotel: SearchHotelResWithTourPlace | undefined;
  let minHotel: SearchHotelResWithTourPlace | undefined;
  let midHotel: SearchHotelResWithTourPlace | undefined;
  let maxHotel: SearchHotelResWithTourPlace | undefined;
  let minNodeLists: ScheduleNodeList = {
    hotel: searchHotelRes,
    restaurant: restaurantGglNearbySearchRes.slice(0, gMealPerDay * travelDays),
    spot: touringSpotGglNearbySearchRes.slice(0, gSpotPerDay * travelDays),
  };

  let midNodeLists = {
    hotel: searchHotelRes,
    restaurant: restaurantGglNearbySearchRes.slice(0, gMealPerDay * travelDays),
    spot: touringSpotGglNearbySearchRes.slice(0, gSpotPerDay * travelDays),
  };

  let maxNodeLists = {
    hotel: searchHotelRes,
    restaurant: restaurantGglNearbySearchRes.slice(0, gMealPerDay * travelDays),
    spot: touringSpotGglNearbySearchRes.slice(0, gSpotPerDay * travelDays),
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
    const minMoneyHotel = idx % transitionTerm === 0 ? minHotel : prevMinHotel;
    const midMoneyHotel = idx % transitionTerm === 0 ? midHotel : prevMidHotel;
    const maxMoneyHotel = idx % transitionTerm === 0 ? maxHotel : prevMaxHotel;

    // minHotel의 idx 해당일 spot들 구하기
    const thatDaySpotFromMinHotel: GglNearbySearchResWithGeoNTourPlace[] = [];
    const thatDayRestaurantFromMinHotel: GglNearbySearchResWithGeoNTourPlace[] =
      [];
    const thatDayVisitOrderFromMinHotel: VisitOrder[] = [];
    if (minMoneyHotel) {
      let destination: GglNearbySearchResWithGeoNTourPlace;
      let prevDest:
        | SearchHotelResWithTourPlace
        | GglNearbySearchResWithGeoNTourPlace = minMoneyHotel;
      thatDayVisitOrderFromMinHotel.push({
        type: 'hotel',
        data: prevDest,
      });
      const mealOrder = new MealOrder();
      let nextMealOrder = mealOrder.getNextMealOrder();
      for (let i = 0; i < gSpotPerDay + gMealPerDay; i += 1) {
        if (nextMealOrder === i) {
          const distanceMapsFromBase = orderByDistanceFromNode({
            startNode: prevDest,
            nodePool: minNodeLists,
          });
          destination = distanceMapsFromBase.sortedRestaurants[0].nodeData;
          thatDayRestaurantFromMinHotel.push(destination);
          thatDayVisitOrderFromMinHotel.push({
            type: 'restaurant',
            data: destination,
          });
          prevDest = destination;
          minNodeLists = {
            ...minNodeLists,
            restaurant: (
              distanceMapsFromBase.sortedRestaurants as {
                nodeData: GglNearbySearchResWithGeoNTourPlace;
                distanceFromStart: number;
              }[]
            )
              .map(s => {
                return s.nodeData;
              })
              .slice(1, distanceMapsFromBase.sortedRestaurants.length), // 방금 thatDayRestaurantFromMinHotel push 등록한 장소는(맨앞 0번째 항목) 제외한다.
          };
          nextMealOrder = mealOrder.getNextMealOrder();
        } else {
          const distanceMapsFromBase = orderByDistanceFromNode({
            startNode: prevDest,
            nodePool: minNodeLists,
          });
          destination = distanceMapsFromBase.sortedSpots[0].nodeData;
          thatDaySpotFromMinHotel.push(destination);
          thatDayVisitOrderFromMinHotel.push({
            type: 'spot',
            data: destination,
          });
          prevDest = destination;

          minNodeLists = {
            ...minNodeLists,
            spot: distanceMapsFromBase.sortedSpots
              .map(s => {
                return s.nodeData;
              })
              .slice(1, distanceMapsFromBase.sortedSpots.length), // 방금 thatDaySpotFromMinHotel에 push 등록한 장소는(맨앞 0번째 항목) 제외한다.
          };
        }
      }
    }

    // midHotel의 idx 해당일 spot들 구하기
    const thatDaySpotFromMidHotel: GglNearbySearchResWithGeoNTourPlace[] = [];
    const thatDayRestaurantFromMidHotel: GglNearbySearchResWithGeoNTourPlace[] =
      [];
    const thatDayVisitOrderFromMidHotel: VisitOrder[] = [];
    if (midMoneyHotel) {
      let destination: GglNearbySearchResWithGeoNTourPlace;

      let prevDest:
        | SearchHotelResWithTourPlace
        | GglNearbySearchResWithGeoNTourPlace = midMoneyHotel;
      thatDayVisitOrderFromMidHotel.push({
        type: 'hotel',
        data: prevDest,
      });
      const mealOrder = new MealOrder();
      let nextMealOrder = mealOrder.getNextMealOrder();
      for (let i = 0; i < gSpotPerDay + gMealPerDay; i += 1) {
        if (nextMealOrder === i) {
          const distanceMapsFromBase = orderByDistanceFromNode({
            startNode: prevDest,
            nodePool: midNodeLists,
          });
          destination = distanceMapsFromBase.sortedRestaurants[0].nodeData;
          thatDayRestaurantFromMidHotel.push(destination);
          thatDayVisitOrderFromMidHotel.push({
            type: 'restaurant',
            data: destination,
          });
          prevDest = destination;

          midNodeLists = {
            ...midNodeLists,
            restaurant: distanceMapsFromBase.sortedRestaurants
              .map(s => {
                return s.nodeData;
              })
              .slice(1, distanceMapsFromBase.sortedRestaurants.length), // 방금 thatDayRestaurantFromMidHotel push 등록한 장소는(맨앞 0번째 항목) 제외한다.
          };
          nextMealOrder = mealOrder.getNextMealOrder();
        } else {
          const distanceMapsFromBase = orderByDistanceFromNode({
            startNode: prevDest,
            nodePool: midNodeLists,
          });
          destination = distanceMapsFromBase.sortedSpots[0].nodeData;
          thatDaySpotFromMidHotel.push(destination);
          thatDayVisitOrderFromMidHotel.push({
            type: 'spot',
            data: destination,
          });
          prevDest = destination;
          midNodeLists = {
            ...midNodeLists,
            spot: distanceMapsFromBase.sortedSpots
              .map(s => {
                return s.nodeData;
              })
              .slice(1, distanceMapsFromBase.sortedSpots.length), // 방금 thatDaySpotFromMidHotel에 push 등록한 장소는(맨앞 0번째 항목) 제외한다.
          };
        }
      }
    }

    // maxHotel의 idx 해당일 spot들 구하기
    const thatDaySpotFromMaxHotel: GglNearbySearchResWithGeoNTourPlace[] = [];
    const thatDayRestaurantFromMaxHotel: GglNearbySearchResWithGeoNTourPlace[] =
      [];
    const thatDayVisitOrderFromMaxHotel: VisitOrder[] = [];
    if (maxMoneyHotel) {
      let destination: GglNearbySearchResWithGeoNTourPlace;
      let prevDest:
        | SearchHotelResWithTourPlace
        | GglNearbySearchResWithGeoNTourPlace = maxMoneyHotel;
      thatDayVisitOrderFromMaxHotel.push({
        type: 'hotel',
        data: prevDest,
      });
      const mealOrder = new MealOrder();
      let nextMealOrder = mealOrder.getNextMealOrder();
      for (let i = 0; i < gSpotPerDay + gMealPerDay; i += 1) {
        if (nextMealOrder === i) {
          const distanceMapsFromBase = orderByDistanceFromNode({
            startNode: prevDest,
            nodePool: maxNodeLists,
          });
          destination = distanceMapsFromBase.sortedRestaurants[0].nodeData;
          thatDayRestaurantFromMaxHotel.push(destination);
          thatDayVisitOrderFromMaxHotel.push({
            type: 'restaurant',
            data: destination,
          });
          prevDest = destination;
          maxNodeLists = {
            ...maxNodeLists,
            restaurant: distanceMapsFromBase.sortedRestaurants
              .map(s => {
                return s.nodeData;
              })
              .slice(1, distanceMapsFromBase.sortedRestaurants.length), // 방금 thatDayRestaurantFromMaxHotel push 등록한 장소는(맨앞 0번째 항목) 제외한다.
          };
          nextMealOrder = mealOrder.getNextMealOrder();
        } else {
          const distanceMapsFromBase = orderByDistanceFromNode({
            startNode: prevDest,
            nodePool: maxNodeLists,
          });
          destination = distanceMapsFromBase.sortedSpots[0].nodeData;
          thatDaySpotFromMaxHotel.push(destination);
          thatDayVisitOrderFromMaxHotel.push({
            type: 'spot',
            data: destination,
          });
          prevDest = destination;
          maxNodeLists = {
            ...maxNodeLists,
            spot: distanceMapsFromBase.sortedSpots
              .map(s => {
                return s.nodeData;
              })
              .slice(1, distanceMapsFromBase.sortedSpots.length), // 방금 thatDaySpotFromMaxHotel에 push 등록한 장소는(맨앞 0번째 항목) 제외한다.
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
        minMoneyHotel: idx === arr.length - 1 ? undefined : minMoneyHotel,
        midMoneyHotel: idx === arr.length - 1 ? undefined : midMoneyHotel,
        maxMoneyHotel: idx === arr.length - 1 ? undefined : maxMoneyHotel,
      },
    });

    return acc;
  }, visitSchedules);

  const recommendList = {
    ...omit(restaurantQueryParamsDataFromDB[0], 'tourPlace'),
    // totalNearbySearchCount: gglNearbySearchRes.length,
    metaInfo: {
      totalHotelSearchCount: searchHotelRes.length,
      totalRestaurantSearchCount: restaurantGglNearbySearchRes.length,
      totalSpotSearchCount: touringSpotGglNearbySearchRes.length,
      spotPerDay: gSpotPerDay,
      mealPerDay: gMealPerDay,
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

export const getPlaceDetail = async (params: {
  placeId: string;
}): Promise<GglPlaceDetailType> => {
  try {
    const { placeId } = params;
    const queryUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&key=${
      process.env.GCP_MAPS_APIKEY as string
    }`;
    const rawResponse = await axios.get(encodeURI(queryUrl));
    const fetchedData = rawResponse.data as GetPlaceDetailRawResponse;
    return fetchedData.result;
  } catch (err) {
    throw new IBError({
      type: 'EXTERNALAPI',
      message: `google place detail api 요청중 문제가 발생했습니다.`,
    });
  }
};

export const transPriceLevel = (
  data: unknown,
): keyof typeof GooglePriceLevel | null => {
  const priceLevel = (data as { price_level?: number }).price_level;
  if (priceLevel)
    return GooglePriceLevel[priceLevel] as keyof typeof GooglePriceLevel;
  return null;
};

/**
 * internal 제주 관광공사 jeju visit 관광 데이터를 요청하여 반환한다.
 */
export const getVisitJejuDataInnerFn = async (
  params: SyncVisitJejuDataReqParams,
): Promise<SyncVisitJejuDataRetParamsPayload> => {
  const { locale, page, cid } = params;

  const option = `http://api.visitjeju.net/vsjApi/contents/searchList?apiKey=${
    process.env.VISITJEJU_API_KEY as string
  }${`&locale=${locale ?? 'kr'}`}${page ? `&page=${page}` : '1'}${
    cid ? `&cid=${cid ?? ''}` : ''
  }`;
  const jejuRawRes = await axios.get(option);
  console.log(option);
  const jejuRes = jejuRawRes.data as SyncVisitJejuDataRetParamsPayload;

  return jejuRes;
};

export const arrTravelTypeToObj = (
  favoriteTravelType: (keyof FavoriteTravelType)[],
): FavoriteTravelType => {
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
  return travelType;
};

export const arrAccommodationTypeToObj = (
  favoriteAccommodation: (keyof FavoriteAccommodationType)[],
): FavoriteAccommodationType => {
  const accommodationType: FavoriteAccommodationType =
    favoriteAccommodation.reduce(
      (acc: FavoriteAccommodationType, cur: string) => {
        let newAcc: FavoriteAccommodationType = {};
        const formatted = cur.toUpperCase();
        switch (formatted) {
          case 'HOTEL':
            newAcc = { ...acc, hotel: true };
            break;

          case 'RESORT':
            newAcc = { ...acc, resort: true };
            break;

          case 'HOUSERENT':
            newAcc = { ...acc, houseRent: true };
            break;

          case 'ROOMRENT':
            newAcc = { ...acc, roomRent: true };
            break;

          case 'BEDRENT':
            newAcc = { ...acc, bedRent: true };
            break;
          case 'APARTRENT':
            newAcc = { ...acc, apartRent: true };
            break;
          case 'POOLVILLA':
            newAcc = { ...acc, poolVilla: true };
            break;
          case 'CAMPING':
            newAcc = { ...acc, camping: true };
            break;
          case 'MIXED':
            newAcc = { ...acc, mixed: true };
            break;
          case 'DONTCARE':
            newAcc = { ...acc, dontCare: true };
            break;
          default:
            newAcc = { ...acc };
            break;
        }
        return newAcc;
      },
      {},
    );
  return accommodationType;
};

export const arrAccommodationLocationToObj = (
  favoriteAccommodation: (keyof FavoriteAccommodationLocation)[],
): FavoriteAccommodationLocation => {
  const accommodationType: FavoriteAccommodationLocation =
    favoriteAccommodation.reduce(
      (acc: FavoriteAccommodationLocation, cur: string) => {
        let newAcc: FavoriteAccommodationLocation = {};
        const formatted = cur.toUpperCase();
        switch (formatted) {
          case 'NATURE':
            newAcc = { ...acc, nature: true };
            break;

          case 'DOWNTOWN':
            newAcc = { ...acc, downtown: true };
            break;

          case 'MOUNTAINVIEW':
            newAcc = { ...acc, mountainView: true };
            break;

          case 'CITYVIEW':
            newAcc = { ...acc, cityView: true };
            break;

          case 'MIXED':
            newAcc = { ...acc, mixed: true };
            break;
          case 'DONTCARE':
            newAcc = { ...acc, dontCare: true };
            break;
          default:
            newAcc = { ...acc };
            break;
        }
        return newAcc;
      },
      {},
    );
  return accommodationType;
};

export const getTourPlaceFromDB = async (
  placeType: 'RESTAURANT' | 'SPOT',
): Promise<GglNearbySearchResWithGeoNTourPlace[]> => {
  type Result = {
    tourPlaceId: number;
    tpCreatedAt: Date;
    tpUpdatedAt: Date;
    tourPlaceType: PlaceType;
    queryParamsId?: number;
    gglNearbySearchResId: number;
    gglNCreatedAt: Date;
    gglNUpdatedAt: Date;
    geometryId: number;
    geometryCreatedAt: Date;
    geometryUpdatedAt: Date;
    location: string;
    viewport: string;
    icon?: string;
    icon_background_color?: string;
    icon_mask_base_uri?: string;
    name?: string;
    opening_hours?: boolean;
    gpId: number;
    gpCreatedAt: Date;
    gpUpdatedAt: Date;
    html_attributions?: string;
    photo_reference?: string;
    height?: number;
    width?: number;
    place_id?: string;
    price_level?: number;
    plus_codeId?: number;
    rating?: number;
    user_ratings_total?: number;
    formatted_address?: string;
    vicinity?: string;
    reliable_score?: number;
  };
  const queryResult: Result[] = await (async () => {
    if (placeType === 'RESTAURANT') {
      const res: Result[] = await prisma.$queryRaw`
      select 
        tp.id as tourPlaceId,
        tp.createdAt as tpCreatedAt,
        tp.updatedAt as tpUpdatedAt,
        tp.tourPlaceType,
        tp.queryParamsId,
        gnsr.id as gglNearbySearchResId ,
        gnsr.createdAt as gglNCreatedAt,
        gnsr.updatedAt as gglNUpdatedAt,
        g.id as geometryId,
        g.createdAt as geometryCreatedAt,
        g.updatedAt as geometryUpdatedAt,
        g.location,
        g.viewport,
        gnsr.icon,
        gnsr.icon_background_color,
        gnsr.icon_mask_base_uri,
        gnsr.plus_codeId,
        gnsr.name,
        gp.id as gpId,
        gp.createdAt as gpCreatedAt,
        gp.updatedAt as gpUpdatedAt,
        gp.html_attributions,
        gp.photo_reference,
        gp.width,
        gnsr.place_id,
        gnsr.price_level ,
        gnsr.rating,
        gnsr.user_ratings_total,
        gnsr.formatted_address, 
        gnsr.vicinity,
        gnsr.rating * gnsr.user_ratings_total as reliable_score
      from TourPlace tp
      left join GglNearbySearchRes gnsr on gnsr.tourPlaceId = tp.id
      left join _GglNearbySearchResToGglPhotos gnsrtgp on gnsrtgp.A = gnsr.id
      left join GglPhotos gp on gp.id = gnsrtgp.B
      left join Gglgeometry g on g.id = gnsr.gglgeometryId
      where tp.tourPlaceType in ('RESTAURANT')
      order by reliable_score desc;
      `;
      return res;
    }
    const res: Result[] = await prisma.$queryRaw`
    select 
      tp.id as tourPlaceId,
      tp.createdAt as tpCreatedAt,
      tp.updatedAt as tpUpdatedAt,
      tp.tourPlaceType,
      tp.queryParamsId,
      gnsr.id as gglNearbySearchResId ,
      gnsr.createdAt as gglNCreatedAt,
      gnsr.updatedAt as gglNUpdatedAt,
      g.id as geometryId,
      g.createdAt as geometryCreatedAt,
      g.updatedAt as geometryUpdatedAt,
      g.location,
      g.viewport,
      gnsr.icon,
      gnsr.icon_background_color,
      gnsr.icon_mask_base_uri,
      gnsr.name,
      gnsr.plus_codeId,
      gp.id as gpId,
      gp.createdAt as gpCreatedAt,
      gp.updatedAt as gpUpdatedAt,
      gp.html_attributions,
      gp.photo_reference,
      gp.width,
      gnsr.place_id,
      gnsr.price_level ,
      gnsr.rating,
      gnsr.user_ratings_total,
      gnsr.formatted_address, 
      gnsr.vicinity,
      gnsr.rating * gnsr.user_ratings_total as reliable_score
    from TourPlace tp
    left join GglNearbySearchRes gnsr on gnsr.tourPlaceId = tp.id
    left join _GglNearbySearchResToGglPhotos gnsrtgp on gnsrtgp.A = gnsr.id
    left join GglPhotos gp on gp.id = gnsrtgp.B
    left join Gglgeometry g on g.id = gnsr.gglgeometryId
    where tp.tourPlaceType in ('SPOT')
    order by reliable_score desc;
    `;
    return res;
  })();

  const result: GglNearbySearchResWithGeoNTourPlace[] = queryResult.map(v => {
    return {
      id: v.gglNearbySearchResId,
      tourPlaceId: v.tourPlaceId,
      createdAt: v.gglNCreatedAt,
      updatedAt: v.gglNUpdatedAt,
      tourPlace: {
        id: v.tourPlaceId,
        tourPlaceType: v.tourPlaceType,
        queryParamsId: v.queryParamsId ?? null,
        createdAt: v.tpCreatedAt,
        updatedAt: v.tpUpdatedAt,
        batchQueryParamsId: null,
        batchSearchKeywordId: null,
      },
      queryParamsId: v.queryParamsId,
      gglgeometryId: v.geometryId,
      icon: v.icon ?? null,
      icon_background_color: v.icon_background_color ?? null,
      icon_mask_base_uri: v.icon_mask_base_uri ?? null,
      geometry: {
        id: v.geometryId,
        createdAt: v.geometryCreatedAt,
        updatedAt: v.geometryUpdatedAt,
        location: v.location,
        viewport: v.viewport,
      },
      name: v.name ?? null,
      photos: [
        {
          id: v.gpId,
          createdAt: v.gpCreatedAt,
          updatedAt: v.gpUpdatedAt,
          height: v.height,
          html_attributions: [v.html_attributions],
          photo_reference: v.photo_reference,
          width: v.width,
        },
      ],
      opening_hours: v.opening_hours ?? false,
      price_level: v.price_level ?? null,
      formatted_address: v.formatted_address ?? null,
      plus_codeId: v.plus_codeId ?? null,
      place_id: v.place_id ?? null,
      rating: v.rating ?? null,
      user_ratings_total: v.user_ratings_total ?? null,
      vicinity: v.formatted_address ?? v.vicinity ?? null,
    };
  });
  return result;
};
