/* eslint-disable @typescript-eslint/naming-convention */

// import prisma from '@src/prisma';
import { IBError, getToday, getTomorrow } from '@src/utils';
import axios, { AxiosResponse, Method } from 'axios';
import prisma from '@src/prisma';
import { PrismaClient, SearchHotelRes, Prisma } from '@prisma/client';
import moment from 'moment';
import { omit, isEmpty, isNumber, isNil, isUndefined } from 'lodash';
import {
  QueryReqParams,
  defaultNearbySearchReqParams,
  defaultSearchHotelReqParams,
  NearbySearchInnerAsyncFnRes,
  SearchedData,
  GetListQueryParamsReqParams,
  GetRecommendListWithLatLngtReqParams,
  GetRecommendListWithLatLngtInnerAsyncFnResponse,
  VisitSchedules,
  defaultQueryParams,
  GetListQueryParamsInnerAsyncFnResponse,
  SearchLocationsFromBookingComReqParams,
  SearchLocationsFromBookingComRawResponse,
  SearchLocationsFromBookingComInnerAsyncFnResponse,
  FiltersForSearchFromBookingComReqParams,
  FiltersForSearchFromBookingComInnerAsyncFnResponse,
  FiltersForSearchFromBookingRawResponse,
  getQueryParamsForHotel,
  getQueryParamsForRestaurant,
  getQueryParamsForTourSpot,
  LatLngt,
  DistanceMap,
  GglNearbySearchResWithGeoNTourPlace,
  ScheduleNodeList,
  MealOrder,
  mealPerDay,
  spotPerDay,
  minHotelBudgetPortion,
  midHotelBudgetPortion,
  maxHotelBudgetPortion,
  VisitOrder,
  flexPortionLimit,
  GetPlaceDetailResponse,
  GooglePriceLevel,
  TextSearchReqParams,
  SyncVisitJejuDataReqParams,
  SyncVisitJejuDataResponsePayload,
  SearchHotelResWithTourPlace,
  TextSearchInnerAsyncFnRes,
  GglPlaceDetailType,
  gHotelTransition,
  gRadius,
} from './types/schduleTypes';

const language = 'ko';

// const getPlacePhoto = async (data: unknown) => {
//   const { photos } = data as {
//     photos: {
//       height: number;
//       html_attributions: string[];
//       photo_reference: string;
//       width: number;
//     }[];
//   };
//   if (!photos) return undefined;
//   const retArr: {
//     height: number;
//     width: number;
//     html_attributuions: string;
//     photo_reference: string;
//     url?: string;
//   }[] = [];
//   // eslint-disable-next-line no-restricted-syntax
//   for await (const photo of photos) {
//     const photo_reference =
//       (photo as Partial<{ photo_reference: string }>).photo_reference ?? '';
//     const photoUrlReqParam = `https://maps.googleapis.com/maps/api/place/photo?maxheight=420&photo_reference=${photo_reference}&key=${
//       process.env.GCP_MAPS_APIKEY as string
//     }`;

//     const rawResult: {
//       request: {
//         protocol: string;
//         host: string;
//         path: string;
//       };
//     } = await axios.get(encodeURI(photoUrlReqParam));
//     // console.log(photoUrlReqParam);
//     const { protocol, host, path } = rawResult.request;
//     const url = `${protocol}//${host}/${path}`;

//     retArr.push({
//       height: photo.height,
//       width: photo.width,
//       html_attributuions: JSON.stringify(photo.html_attributions),
//       photo_reference,
//       url,
//     });
//   }
//   return retArr;
// };

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
      latitude: parseFloat(nearbySearchLat ?? paramLat ?? 9999),
      longitude: parseFloat(nearbySearchLngt ?? paramLngt ?? 9999),
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

export const storeDataRelatedWithQueryParams = async (params: {
  queryReqParams?: QueryReqParams;
  response: AxiosResponse;
  batchJobId?: number;
  ifAlreadyQueryId?: number;
}): Promise<{
  results: google.maps.places.IBPlaceResult[];
  queryParamId: number;
}> => {
  const { queryReqParams, response, batchJobId, ifAlreadyQueryId } = params;
  let queryParamId: number = -1;
  let results: google.maps.places.IBPlaceResult[] = [];
  if (response?.statusText === 'OK') {
    if (queryReqParams) {
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
              ...(queryParamId > 0 && {
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
                html_attributuions: JSON.stringify(photo.html_attributions),
                photo_reference:
                  (photo as Partial<{ photo_reference: string }>)
                    .photo_reference ?? '',
              };
            }),
          },
          ...(batchJobId &&
            batchJobId > 0 && {
              BatchQueryParams: {
                connectOrCreate: {
                  where: {
                    id: batchJobId,
                  },
                  create: {
                    // keyword: queryReqParams?.textSearchReqParams?.keyword,
                    latitude: queryReqParams?.textSearchReqParams?.location
                      ? Number(
                          queryReqParams.textSearchReqParams.location.latitude,
                        )
                      : undefined,
                    longitude: queryReqParams?.textSearchReqParams?.location
                      ? Number(
                          queryReqParams.textSearchReqParams.location.longitude,
                        )
                      : undefined,
                    radius: queryReqParams?.textSearchReqParams?.radius,
                    searchkeyword: {
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
                  },
                },
              },
              BatchSearchKeyword: {
                connectOrCreate: {
                  where: {
                    keyword: queryReqParams?.textSearchReqParams?.keyword,
                  },
                  create: {
                    keyword: queryReqParams?.textSearchReqParams?.keyword ?? '',
                  },
                },
              },
            }),
        },
      });
    }
  }

  return { results, queryParamId };
};

export const searchLocationsFromBookingComInnerAsyncFn = async (
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

export const filterForSearchFromBookingComInnerAsyncFn = async (
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

export const nearbySearchInnerAsyncFn = async (
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
  }&language=${language}&location=${location?.latitude},${
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

export const textSearchInnerAsyncFn = async (params: {
  textSearchReqParams: TextSearchReqParams;
  batchJobId?: number;
  ifAlreadyQueryId?: number;
}): Promise<TextSearchInnerAsyncFnRes> => {
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
    const loopTemp = await textSearchInnerAsyncFn({
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
export const searchHotelInnerAsyncFn = async (
  queryReqParams: QueryReqParams,
  ifAlreadyQueryId?: number,
): Promise<{ hotelSearchResult: SearchedData[]; queryParamId: number }> => {
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
export const getListQueryParamsInnerAsyncFn = async (
  params: GetListQueryParamsReqParams,
): Promise<GetListQueryParamsInnerAsyncFnResponse> => {
  const queryParamsDataFromDB = await prisma.queryParams.findMany(params);

  return queryParamsDataFromDB as GetListQueryParamsInnerAsyncFnResponse;
};

export const getDistance = ({
  startPoint,
  endPoint,
}: {
  startPoint: LatLngt;
  endPoint: LatLngt;
}): number => {
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
  baseNode: SearchHotelRes | GglNearbySearchResWithGeoNTourPlace;
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
      (baseNode as GglNearbySearchResWithGeoNTourPlace).geometry.location,
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
//   MyType extends SearchHotelRes | GglNearbySearchResWithGeoNTourPlace,
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
//       (baseNode as GglNearbySearchResWithGeoNTourPlace).geometry.location,
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
//   BaseListType extends SearchHotelRes | GglNearbySearchResWithGeoNTourPlace,
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
//       (outerItem as GglNearbySearchResWithGeoNTourPlace) !== undefined
//     ) {
//       const location = JSON.parse(
//         (outerItem as GglNearbySearchResWithGeoNTourPlace).geometry.location,
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

export const getRecommendListWithLatLngtInnerAsyncFn = async (
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
    hotelTransition = gHotelTransition, // 호텔 바꾸는 횟수
    nearbySearchReqParams,
    searchHotelReqParams,
  } = searchCond;

  const { radius = gRadius, location } = nearbySearchReqParams;
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
    nearbySearchResult.length < travelDays * spotPerDay &&
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

  const hotelQueryParamsDataFromDB = await getListQueryParamsInnerAsyncFn(
    getQueryParamsForHotel(queryParamId),
  );
  const restaurantQueryParamsDataFromDB = await getListQueryParamsInnerAsyncFn(
    getQueryParamsForRestaurant(queryParamId),
  );
  const spotQueryParamsDataFromDB = await getListQueryParamsInnerAsyncFn(
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
  let prevMinHotel: SearchHotelResWithTourPlace | undefined;
  let prevMidHotel: SearchHotelResWithTourPlace | undefined;
  let prevMaxHotel: SearchHotelResWithTourPlace | undefined;
  let minHotel: SearchHotelResWithTourPlace | undefined;
  let midHotel: SearchHotelResWithTourPlace | undefined;
  let maxHotel: SearchHotelResWithTourPlace | undefined;
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
    const thatDaySpotFromMinHotel: GglNearbySearchResWithGeoNTourPlace[] = [];
    const thatDayRestaurantFromMinHotel: GglNearbySearchResWithGeoNTourPlace[] =
      [];
    const thatDayVisitOrderFromMinHotel: VisitOrder[] = [];
    if (minBudgetHotel) {
      let destination: GglNearbySearchResWithGeoNTourPlace;
      let prevDest:
        | SearchHotelResWithTourPlace
        | GglNearbySearchResWithGeoNTourPlace = minBudgetHotel;
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
    const thatDaySpotFromMidHotel: GglNearbySearchResWithGeoNTourPlace[] = [];
    const thatDayRestaurantFromMidHotel: GglNearbySearchResWithGeoNTourPlace[] =
      [];
    const thatDayVisitOrderFromMidHotel: VisitOrder[] = [];
    if (midBudgetHotel) {
      let destination: GglNearbySearchResWithGeoNTourPlace;

      let prevDest:
        | SearchHotelResWithTourPlace
        | GglNearbySearchResWithGeoNTourPlace = midBudgetHotel;
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
    const thatDaySpotFromMaxHotel: GglNearbySearchResWithGeoNTourPlace[] = [];
    const thatDayRestaurantFromMaxHotel: GglNearbySearchResWithGeoNTourPlace[] =
      [];
    const thatDayVisitOrderFromMaxHotel: VisitOrder[] = [];
    if (maxBudgetHotel) {
      let destination: GglNearbySearchResWithGeoNTourPlace;
      let prevDest:
        | SearchHotelResWithTourPlace
        | GglNearbySearchResWithGeoNTourPlace = maxBudgetHotel;
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
    ...omit(restaurantQueryParamsDataFromDB[0], 'tourPlace'),
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

export const getPlaceDetail = async (params: {
  placeId: string;
}): Promise<GglPlaceDetailType> => {
  try {
    const { placeId } = params;
    const queryUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&key=${
      process.env.GCP_MAPS_APIKEY as string
    }`;
    const rawResponse = await axios.get(encodeURI(queryUrl));
    const fetchedData = rawResponse.data as GetPlaceDetailResponse;
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
export const getVisitJejuDataInnerAsyncFn = async (
  params: SyncVisitJejuDataReqParams,
): Promise<SyncVisitJejuDataResponsePayload> => {
  const { locale, page, cid } = params;

  const jejuRawRes = await axios.get(
    `http://api.visitjeju.net/vsjApi/contents/searchlist?apiKey=${
      process.env.VISITJEJU_API_KEY as string
    }${`&locale=${locale ?? ''}`}${`&page=${page ?? ''}`}${`&cid=${
      cid ?? ''
    }`}`,
  );

  const jejuRes = jejuRawRes.data as SyncVisitJejuDataResponsePayload;
  return jejuRes;
};
