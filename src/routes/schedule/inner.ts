/* eslint-disable @typescript-eslint/naming-convention */
import moment from 'moment';
import prisma from '@src/prisma';
import { IBError } from '@src/utils';
import axios, { Method } from 'axios';
import { isNumber, isNil, isEmpty } from 'lodash';
import {
  GetHotelDataFromBKCREQParam,
  GetHotelDataFromBKCRETParamPayload,
  gCurrency,
  gLanguage,
  BKCHotelRawData,
  GetPlaceDataFromGGLREQParam,
  GetPlaceDataFromGGLRETParamPayload,
  GglPlaceResultRawData,
  GetPlaceDataFromVJREQParam,
  GetPlaceDataFromVJRETParamPayload,
} from './types/schduleTypes';

export const getToday = (): string => {
  return moment().startOf('d').format();
};
export const getTomorrow = (): string => {
  return moment().add(1, 'day').startOf('d').format();
};
export const getNDaysLater = (n: number): string => {
  return moment().add(n, 'day').startOf('d').format();
};

/**
 * GetHotelDataFromBKCREQParam 조건에 맞춰 booking.com api로 호텔을 검색한다.
 * /searchHotel api 호출시 실제 동작부를 형성한다.
 * (비슷한 동작부를 다른곳에서 사용하기 용이하도록 모듈로써 사용하기 위해 endpoint 함수와 wrapper-inner함수로써 분리함)
 *
 * (구) searchHotelInnerFn을 대체한다.
 *
 * @param param
 * @returns
 */
export const getHotelDataFromBKC = async (
  param: GetHotelDataFromBKCREQParam,
): Promise<GetHotelDataFromBKCRETParamPayload> => {
  const {
    orderBy = 'popularity',
    adultsNumber = 2,
    roomNumber = 1,
    checkinDate = getToday(),
    checkoutDate = getTomorrow(),
    filterByCurrency = gCurrency,
    latitude,
    longitude,
    pageNumber = 0,
    includeAdjacency = true,
    childrenAges,
    childrenNumber,
    categoriesFilterIds,
    mock = true,
  } = param;

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

  const hotelSearchResult = await (async () => {
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
            result: BKCHotelRawData[];
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
        latitude: latitude.toString(),
        longitude: longitude.toString(),
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

    const { result } = response.data as { result: BKCHotelRawData[] };

    return result;
  })();

  return { hotelSearchResult, hotelSearchCount: hotelSearchResult.length };
};

/**
 * google map api인 nearbySearch api를 요청하고 그 결과를 반환하는 함수
 * (구) nearbySearchInnerFn
 *
 * @param param
 * @returns
 */
export const getPlaceDataFromGglNrbySrch = async (
  param: GetPlaceDataFromGGLREQParam,
): Promise<GetPlaceDataFromGGLRETParamPayload> => {
  const { location, radius, pageToken, keyword } = param;

  console.log('google nearbySearch');
  const queryUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?keyword=${
    keyword ?? ''
  }&language=${gLanguage}&location=${location?.latitude},${
    location?.longitude
  }&radius=${radius}&key=${process.env.GCP_MAPS_APIKEY as string}${
    pageToken ? `&pagetoken=${pageToken}` : ''
  }`;
  console.log(queryUrl);

  const response = await axios.get(encodeURI(queryUrl));
  const results =
    (
      response.data as Partial<{
        results: google.maps.places.IBPlaceResult[];
      }>
    ).results ?? [];

  return {
    placeSearchCount: results.length,
    placeSearchResult: results,
    nextPageToken: (response.data as { next_page_token?: string })
      .next_page_token,
  };
};

/**
 * google map api인 textSearch api를 요청하고 그 결과를 반환하는 함수
 * (구) textSearchInnerFn
 *
 * @param param
 * @returns
 */
export const getPlaceDataFromGglTxtSrch = async (
  param: GetPlaceDataFromGGLREQParam,
): Promise<GetPlaceDataFromGGLRETParamPayload> => {
  const { pageToken, keyword } = param;

  console.log('google textSearch');
  const queryUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${
    keyword ?? ''
  }&language=ko&key=${process.env.GCP_MAPS_APIKEY as string}${
    pageToken ? `&pagetoken=${pageToken}` : ''
  }`;
  console.log(queryUrl);

  const response = await axios.get(encodeURI(queryUrl));
  const results =
    (
      response.data as Partial<{
        results: google.maps.places.IBPlaceResult[];
      }>
    ).results ?? [];

  return {
    placeSearchCount: results.length,
    placeSearchResult: results,
    nextPageToken: (response.data as { next_page_token?: string })
      .next_page_token,
  };
};

/**
 * 구글 nearbySearch 또는 TextSearch를(이하 nextSearch 로 지칭) 반복적으로 요청해
 * 전체 페이지의 데이터를 반환하는 함수
 * 구글 nearbySearch 한 페이지당 20개의 목록만을 보여준다.
 * 전체 일정중 필요한 스팟(관광지) 또는 식당이 충분한 숫자가 확보되어야 하는데
 * nearbySearch 후 끝 페이지 모든 장소를 미리 읽어 해당 숫자만큼 확보되었는지 확인하여야 한다.
 * 이때 사용할 끝 페이지까지 계속해서 자동으로 nearbySearch를 요청하는 함수
 *
 * (구) getAllNearbySearchPages
 * @param
 * @returns
 */
export const getAllPlaceDataFromGGLPlaceAPI = async (
  param: GetPlaceDataFromGGLREQParam,
): Promise<GglPlaceResultRawData[]> => {
  let retry = 1;
  const retryLimit = 5;

  console.log(param);

  // recursion version
  const loopFunc = async (curPageToken: string) => {
    const loopQryParams: GetPlaceDataFromGGLREQParam = {
      ...param,
      pageToken: curPageToken ?? '',
    };
    // eslint-disable-next-line no-await-in-loop
    const loopTemp = await (async () => {
      if (
        !isEmpty(param.location?.latitude) &&
        !isEmpty(param.location?.longitude)
      ) {
        const r = await getPlaceDataFromGglNrbySrch(loopQryParams);
        return r;
      }
      const r = await getPlaceDataFromGglTxtSrch(loopQryParams);
      return r;
    })();

    const nextPageToken = loopTemp.nextPageToken ?? '';
    const stopLoop = !param.loadAll;
    retry += 1;

    if (stopLoop || isEmpty(nextPageToken) || retry > retryLimit)
      return [...loopTemp.placeSearchResult];

    const subResults = await new Promise(resolve => {
      setTimeout(() => {
        loopFunc(nextPageToken)
          .then(promiseRes => {
            resolve(promiseRes);
          })
          .catch(err => {
            console.error(err);
            resolve([] as GglPlaceResultRawData[]);
          });
      }, 2000);
    });

    let loopResult: GglPlaceResultRawData[] = [];
    loopResult = [
      ...(subResults as GglPlaceResultRawData[]),
      ...loopTemp.placeSearchResult,
    ];

    return loopResult;
  };
  const loopFuncRes = await loopFunc(param.pageToken ?? '');

  return loopFuncRes;
};

/**
 * 구글 Place API(nearbySearch, textSearch 등)을 요청해 결과를 반환한다.
 * store 옵션이 있을 경우 idealbllom DB에 저장한다.
 *
 * @param
 * @returns
 */
export const getPlaceDataFromGGL = async (
  param: GetPlaceDataFromGGLREQParam,
): Promise<GetPlaceDataFromGGLRETParamPayload> => {
  const placeSearchResult = await getAllPlaceDataFromGGLPlaceAPI(param);

  /// store data to db
  if (param.store) {
    const batchJobId = 1;
    // eslint-disable-next-line no-restricted-syntax
    for await (const item of placeSearchResult) {
      await prisma.tourPlace.create({
        data: {
          tourPlaceType:
            item.types?.findIndex(
              type => type.toUpperCase() === 'RESTAURANT',
            ) === -1
              ? 'SPOT'
              : 'RESTAURANT',
          gglNearbySearchRes: {
            connectOrCreate: {
              where: {
                place_id: item.place_id,
              },
              create: {
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
                      html_attributions: JSON.stringify(
                        photo.html_attributions,
                      ),
                      photo_reference:
                        (photo as Partial<{ photo_reference: string }>)
                          .photo_reference ?? '',
                    };
                  }),
                },
                ...(batchJobId &&
                  batchJobId > 0 && {
                    batchQueryParams: {
                      connectOrCreate: {
                        where: {
                          id: batchJobId,
                        },
                        create: {
                          // keyword: queryReqParams?.textSearchReqParams?.keyword,
                          latitude: param.location
                            ? Number(param.location.latitude)
                            : undefined,
                          longitude: param.location
                            ? Number(param.location.longitude)
                            : undefined,
                          radius: param.radius,
                          searchkeyword: {
                            connectOrCreate: {
                              where: {
                                keyword: param.keyword,
                              },
                              create: {
                                keyword: param.keyword ?? '',
                              },
                            },
                          },
                        },
                      },
                    },
                    batchSearchKeyword: {
                      connectOrCreate: {
                        where: {
                          keyword: param.keyword,
                        },
                        create: {
                          keyword: param.keyword ?? '',
                        },
                      },
                    },
                  }),
              },
            },
          },
        },
      });
    }
  }

  return {
    placeSearchCount: placeSearchResult.length,
    placeSearchResult,
  };
};

/**
 * internal 제주 관광공사 jeju visit 관광 데이터를 요청하여 반환한다.
 */
export const getVisitJejuData = async (
  param: GetPlaceDataFromVJREQParam,
): Promise<GetPlaceDataFromVJRETParamPayload> => {
  const { locale, page, cid } = param;

  const option = `http://api.visitjeju.net/vsjApi/contents/searchList?apiKey=${
    process.env.VISITJEJU_API_KEY as string
  }${`&locale=${locale ?? 'kr'}`}${page ? `&page=${page}` : '1'}${
    cid ? `&cid=${cid ?? ''}` : ''
  }`;
  const jejuRawRes = await axios.get(option);
  console.log(option);
  const jejuRes = jejuRawRes.data as GetPlaceDataFromVJRETParamPayload;

  return jejuRes;
};

/**
 * internal 제주 관광공사 jeju visit 관광 데이터를 요청하여 반환한다.
 * visit jeju data를 반복적으로 요청해 전체 페이지 데이터를 반환한다.
 */
export const getAllPlaceDataFromVJ = async (
  param: GetPlaceDataFromVJREQParam,
): Promise<GetPlaceDataFromVJRETParamPayload> => {
  console.log(param);
  const { loadAll } = param;

  let curRes = await getVisitJejuData(param);
  let nextPage = (curRes.currentPage ?? 1) + 1;
  const allRes: GetPlaceDataFromVJRETParamPayload = { ...curRes };

  if (loadAll) {
    while (
      curRes.currentPage &&
      curRes.pageCount &&
      curRes.currentPage < curRes.pageCount
    ) {
      // eslint-disable-next-line no-await-in-loop
      const nextRes = await getVisitJejuData({
        ...param,
        page: nextPage,
      });
      if (
        allRes.items &&
        allRes.items.length > 0 &&
        nextRes.items &&
        nextRes.items.length > 0
      ) {
        allRes.items = [...allRes.items, ...nextRes.items];
        if (allRes.resultCount) {
          allRes.resultCount += nextRes.resultCount ?? 0;
        }
        if (allRes.currentPage) {
          allRes.currentPage = nextRes.currentPage ?? 1;
        }

        curRes = { ...nextRes };
        nextPage += 1;
      }
    }
  }

  return allRes;
};

/**
 * internal 제주 관광공사 jeju visit 관광 데이터를 요청하여 반환한다.
 * visit jeju data를 반복적으로 요청해 전체 페이지 데이터를 반환한다.
 */
export const getPlaceDataFromVJ = async (
  param: GetPlaceDataFromVJREQParam,
): Promise<GetPlaceDataFromVJRETParamPayload> => {
  const jejuRes = await getAllPlaceDataFromVJ(param);
  return jejuRes;
};
