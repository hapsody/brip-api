/* eslint-disable @typescript-eslint/naming-convention */
import moment from 'moment';
import prisma from '@src/prisma';
import { IBError } from '@src/utils';
import axios, { Method } from 'axios';
import { TourPlace, PlanType, VisitSchedule, PlaceType } from '@prisma/client';
import { isNumber, isNil, isEmpty, isUndefined } from 'lodash';
import {
  GetHotelDataFromBKCREQParam,
  GetHotelDataFromBKCRETParamPayload,
  gCurrency,
  gLanguage,
  BKCHotelRawData,
  GetPlaceByGglNrbyREQParam,
  GetPlaceByGglNrbyRETParamPayload,
  GetPlaceByGglTxtSrchREQParam,
  GetPlaceByGglTxtSrchRETParamPayload,
  GglPlaceResultRawData,
  GetPlaceDataFromVJREQParam,
  GetPlaceDataFromVJRETParamPayload,
  GetRcmdListREQParam,
  GetRcmdListRETParamPayload,
  gHotelTransition,
  HotelOptType,
  gMinHotelMoneyPortion,
  gMidHotelMoneyPortion,
  gMaxHotelMoneyPortion,
  gFlexPortionLimit,
  gMealPerDay,
  gSpotPerDay,
  MealOrder,
  IVisitSchedule,
  FavoriteTravelType,
  ReqScheduleREQParam,
  ReqScheduleRETParamPayload,
  GetScheduleREQParam,
  GetScheduleRETParamPayload,
  DayScheduleType,
  GetScheduleListREQParam,
  GetScheduleListRETParamPayload,
  SaveScheduleREQParam,
  SaveScheduleRETParamPayload,
  IBContext,
  GetDayScheduleREQParam,
  GetDayScheduleRETParamPayload,
} from './types/schduleTypes';

/**
 * inner utils
 *  */
export const getToday = (): string => {
  return moment().startOf('d').format();
};
export const getTomorrow = (): string => {
  return moment().add(1, 'day').startOf('d').format();
};
export const getNDaysLater = (n: number): string => {
  return moment().add(n, 'day').startOf('d').format();
};

export const getTravelNights = (
  checkinDate: string,
  checkoutDate: string,
): number => {
  const mCheckinDate = moment(checkinDate).startOf('d');
  const mCheckoutDate = moment(checkoutDate).startOf('d');

  return Math.floor(moment.duration(mCheckoutDate.diff(mCheckinDate)).asDays());
};

export const childInfantToChildrenAges = (params: {
  child: number;
  infant: number;
}): number[] => {
  const { child, infant } = params;
  return Array.from({ length: child }, () => 5).concat(
    Array.from({ length: infant }, () => 1),
  ); /// child는 5세, infant는 1세로 일괄 처리.
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
    latitude: lat,
    longitude: lng,
    pageNumber = 0,
    includeAdjacency = true,
    childrenAges,
    childrenNumber,
    categoriesFilterIds,
    store = false,
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
    const rawList = await (async () => {
      const rawData = await prisma.mockBookingDotComHotelResource.findMany({
        where: {
          reqType: 'SEARCH_HOTELS_BY_COORDINATES',
          adultsNumber,
          childrenNumber,
          childrenAges: childrenAges?.toString(),
          roomNumber,
          checkinDate,
          checkoutDate,
          latitude: Number(lat),
          longitude: Number(lng),
          pageNumber,
          includeAdjacency,
          categoriesFilterIds: categoriesFilterIds?.toString(),
        },
        orderBy: [{ id: 'desc' }],
      });

      if (rawData && rawData.length > 0) {
        const temp = JSON.parse(rawData[0].responseData) as BKCHotelRawData[];
        return temp;
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
          latitude: lat.toString(),
          longitude: lng.toString(),
          page_number: pageNumber ? pageNumber.toString() : '0',
          include_adjacency: includeAdjacency.valueOf().toString() ?? 'true',
          ...(isNumber(childrenNumber) &&
            childrenNumber > 0 && {
              children_number: childrenNumber.toString(),
            }),
          ...(childrenAges &&
            !isEmpty(childrenAges) && {
              children_ages: childrenAges.toString(),
            }),
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
      console.log('\n');
      console.log(options);
      const response = await axios.request(options);
      const { result } = response.data as {
        result: BKCHotelRawData[];
      };

      await prisma.mockBookingDotComHotelResource.create({
        data: {
          orderBy,
          adultsNumber,
          childrenNumber,
          childrenAges: childrenAges?.toString(),
          roomNumber,
          checkinDate,
          checkoutDate,
          latitude: Number(lat),
          longitude: Number(lng),
          pageNumber,
          includeAdjacency,
          categoriesFilterIds: categoriesFilterIds?.toString(),
          responseData: JSON.stringify(result),
        },
      });
      return result;
    })();

    if (store) {
      const createSearchHotelResPromises = rawList.map(item => {
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
          currencycode,
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

        return prisma.tourPlace.create({
          data: {
            tourPlaceType: 'BKC_HOTEL',
            status: 'IN_USE',
            bkc_unit_configuration_label: unit_configuration_label,
            bkc_min_total_price: min_total_price,
            bkc_gross_amount_per_night: gross_amount_per_night,
            bkc_gross_amount: gross_amount,
            bkc_included_taxes_and_charges_amount:
              included_taxes_and_charges_amount,
            bkc_net_amount: net_amount,
            bkc_hotelClass: hotelClass,
            bkc_countrycode: countrycode,
            bkc_default_language: default_language,
            bkc_address: address,
            bkc_city: city,
            bkc_city_name_en: city_name_en,
            bkc_checkin: checkin,
            bkc_checkout: checkout,
            bkc_distance: parseFloat(distance),
            bkc_review_score_word: review_score_word,
            bkc_review_score: review_score,
            bkc_currency_code: currencycode,
            bkc_timezone: timezone,
            bkc_urgency_message: urgency_message,
            bkc_hotel_id: hotel_id,
            bkc_hotel_name: hotel_name,
            bkc_latitude: latitude,
            bkc_longitude: longitude,
            bkc_url: url,
            bkc_accommodation_type_name: accommodation_type_name,
            bkc_zip: zip,
            bkc_main_photo_url: main_photo_url,
            bkc_max_photo_url: max_photo_url,
            bkc_hotel_facilities: hotel_facilities,
            // has_swimming_pool,
          },
        });
      });
      const tourPlaceTrRes = await prisma.$transaction(
        createSearchHotelResPromises,
      );
      return tourPlaceTrRes;
    }

    const retValue: Partial<TourPlace>[] = rawList.map(item => {
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
        currencycode,
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

      return {
        bkc_unit_configuration_label: unit_configuration_label,
        bkc_min_total_price: min_total_price,
        bkc_gross_amount_per_night: gross_amount_per_night,
        bkc_gross_amount: gross_amount,
        bkc_included_taxes_and_charges_amount:
          included_taxes_and_charges_amount,
        bkc_net_amount: net_amount,
        bkc_hotelClass: hotelClass,
        bkc_countrycode: countrycode,
        bkc_default_language: default_language,
        bkc_address: address,
        bkc_city: city,
        bkc_city_name_en: city_name_en,
        bkc_checkin: checkin,
        bkc_checkout: checkout,
        bkc_distance: parseFloat(distance),
        bkc_review_score_word: review_score_word,
        bkc_review_score: review_score,
        bkc_currency_code: currencycode,
        bkc_timezone: timezone,
        bkc_urgency_message: urgency_message,
        bkc_hotel_id: hotel_id,
        bkc_hotel_name: hotel_name,
        bkc_latitude: latitude,
        bkc_longitude: longitude,
        bkc_url: url,
        bkc_accommodation_type_name: accommodation_type_name,
        bkc_zip: zip,
        bkc_main_photo_url: main_photo_url,
        bkc_max_photo_url: max_photo_url,
        bkc_hotel_facilities: hotel_facilities,
      };
    });
    return retValue;
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
export const qryPlaceDataToGglNrby = async (
  param: GetPlaceByGglNrbyREQParam,
): Promise<GetPlaceByGglNrbyRETParamPayload> => {
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
export const qryPlaceDataToGglTxtSrch = async (
  param: GetPlaceByGglTxtSrchREQParam,
): Promise<GetPlaceByGglTxtSrchRETParamPayload> => {
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
 * 구글 TextSearch를 반복적으로 요청해
 * 전체 페이지의 데이터를 반환하는 함수
 * 구글 TextSearch를 한 페이지당 20개의 목록만을 보여준다.
 * 전체 일정중 필요한 스팟(관광지) 또는 식당이 충분한 숫자가 확보되어야 하는데
 * TextSearch를 후 끝 페이지 모든 장소를 미리 읽어 해당 숫자만큼 확보되었는지 확인하여야 한다.
 * 이때 사용할 끝 페이지까지 계속해서 자동으로 TextSearch를를 요청하는 함수
 *
 * (구) getAllTextSearchPages
 * @param
 * @returns
 */
// export const getAllPlaceDataFromGGLPlaceAPI = async (
export const getAllPlaceByGglTxtSrch = async (
  param: GetPlaceByGglTxtSrchREQParam,
): Promise<GglPlaceResultRawData[]> => {
  let retry = 1;
  const retryLimit = 5;

  console.log(param);

  // recursion version
  const loopFunc = async (curPageToken: string) => {
    const loopQryParams: GetPlaceByGglTxtSrchREQParam = {
      ...param,
      pageToken: curPageToken ?? '',
    };
    // eslint-disable-next-line no-await-in-loop
    const loopTemp = await qryPlaceDataToGglTxtSrch(loopQryParams);

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
 * 구글 nearbySearch 또는 반복적으로 요청해
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
//  export const getAllPlaceDataFromGGLPlaceAPI = async (
export const getAllPlaceByGglNrby = async (
  param: GetPlaceByGglNrbyREQParam,
): Promise<GglPlaceResultRawData[]> => {
  let retry = 1;
  const retryLimit = 5;

  console.log(param);

  // recursion version
  const loopFunc = async (curPageToken: string) => {
    const loopQryParams: GetPlaceByGglNrbyREQParam = {
      ...param,
      pageToken: curPageToken ?? '',
    };
    // eslint-disable-next-line no-await-in-loop
    const loopTemp = await qryPlaceDataToGglNrby(loopQryParams);

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
 * getPlaceByGglTxtSrchWrapper의 실제 동작부인 inner 함수
 * store 옵션이 있을 경우 idealbllom DB에 저장한다.
 *
 * @param
 * @returns
 */
export const getPlaceByGglTxtSrch = async (
  param: GetPlaceByGglTxtSrchREQParam,
): Promise<GetPlaceByGglTxtSrchRETParamPayload> => {
  const placeSearchResult = await getAllPlaceByGglTxtSrch(param);

  /// store data to db
  if (param.store) {
    const { batchJobCtx } = param;
    // eslint-disable-next-line no-restricted-syntax
    for await (const item of placeSearchResult) {
      /// 배치 스크립트로 store 옵션과 함께 실행되면
      /// 기존 사용중인 데이터는 ARCHIVED가 되고
      /// 배치 스크립트로 새로 수집된 데이터가 IN_USE가 된다.
      if (batchJobCtx && !isEmpty(batchJobCtx)) {
        await prisma.tourPlace.updateMany({
          where: {
            gl_place_id: item.place_id,
            status: 'IN_USE',
            tourPlaceType: { in: ['GL_RESTAURANT', 'GL_SPOT'] },
          },
          data: {
            status: 'ARCHIVED',
          },
        });
      }

      await prisma.tourPlace.create({
        data: {
          status: batchJobCtx && !isEmpty(batchJobCtx) ? 'IN_USE' : 'NEW',
          tourPlaceType:
            item.types?.findIndex(
              type => type.toUpperCase() === 'GL_RESTAURANT',
            ) === -1
              ? 'GL_SPOT'
              : 'GL_RESTAURANT',
          gl_lat: item.geometry?.location?.lat,
          gl_lng: item.geometry?.location?.lng,
          gl_viewport_ne_lat: item.geometry?.viewport?.northeast?.lat,
          gl_viewport_ne_lng: item.geometry?.viewport?.northeast?.lng,
          gl_icon: item.icon,
          gl_icon_background_color: item.icon_background_color,
          gl_icon_mask_base_uri: item.icon_mask_base_uri,
          gl_name: item.name,
          gl_opening_hours:
            (
              item.opening_hours as Partial<{
                open_now: boolean;
              }>
            )?.open_now ?? false,
          gl_place_id: item.place_id,
          gl_price_level: item.price_level,
          gl_rating: item.rating,
          gl_types: (() => {
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
          gl_user_ratings_total: item.user_ratings_total,
          gl_vicinity: item.vicinity,
          gl_formatted_address: item.formatted_address,
          gl_photos: {
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
          ...(batchJobCtx &&
            batchJobCtx.batchQueryParamsId && {
              batchQueryParams: {
                connectOrCreate: {
                  where: {
                    id: batchJobCtx.batchQueryParamsId,
                  },
                  create: {
                    latitude: batchJobCtx.latitude,
                    longitude: batchJobCtx.longitude,
                    radius: batchJobCtx.radius,
                    searchkeyword: {
                      connectOrCreate: {
                        where: {
                          keyword: param.keyword ?? '',
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
                    keyword: param.keyword ?? '',
                  },
                  create: {
                    keyword: param.keyword ?? '',
                  },
                },
              },
            }),
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
 * getPlaceByGglNrbyWrapper의 실제 동작부인 inner 함수
 * store 옵션이 있을 경우 idealbllom DB에 저장한다.
 *
 * @param
 * @returns
 */
export const getPlaceByGglNrby = async (
  param: GetPlaceByGglNrbyREQParam,
): Promise<GetPlaceByGglNrbyRETParamPayload> => {
  const placeSearchResult = await getAllPlaceByGglNrby(param);

  /// store data to db
  if (param.store) {
    const { batchJobCtx } = param;
    // eslint-disable-next-line no-restricted-syntax
    for await (const item of placeSearchResult) {
      /// 배치 스크립트로 store 옵션과 함께 실행되면
      /// 기존 사용중인 데이터는 ARCHIVED가 되고
      /// 배치 스크립트로 새로 수집된 데이터가 IN_USE가 된다.
      if (batchJobCtx && !isEmpty(batchJobCtx)) {
        const updated = await prisma.tourPlace.updateMany({
          where: {
            gl_place_id: item.place_id,
            status: 'IN_USE',
            tourPlaceType: { in: ['GL_RESTAURANT', 'GL_SPOT'] },
          },
          data: {
            status: 'ARCHIVED',
          },
        });
        console.log(updated);
      }

      await prisma.tourPlace.create({
        data: {
          status: batchJobCtx && !isEmpty(batchJobCtx) ? 'IN_USE' : 'NEW',
          tourPlaceType:
            item.types?.findIndex(
              type => type.toUpperCase() === 'GL_RESTAURANT',
            ) === -1
              ? 'GL_SPOT'
              : 'GL_RESTAURANT',
          gl_lat: item.geometry?.location?.lat,
          gl_lng: item.geometry?.location?.lng,
          gl_viewport_ne_lat: item.geometry?.viewport?.northeast?.lat,
          gl_viewport_ne_lng: item.geometry?.viewport?.northeast?.lng,
          gl_icon: item.icon,
          gl_icon_background_color: item.icon_background_color,
          gl_icon_mask_base_uri: item.icon_mask_base_uri,
          gl_name: item.name,
          gl_opening_hours:
            (
              item.opening_hours as Partial<{
                open_now: boolean;
              }>
            )?.open_now ?? false,
          gl_place_id: item.place_id,
          gl_price_level: item.price_level,
          gl_rating: item.rating,
          gl_types: (() => {
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
          gl_user_ratings_total: item.user_ratings_total,
          gl_vicinity: item.vicinity,
          gl_formatted_address: item.formatted_address,
          gl_photos: {
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
          ...(batchJobCtx &&
            batchJobCtx.batchQueryParamsId && {
              batchQueryParams: {
                connectOrCreate: {
                  where: {
                    id: batchJobCtx.batchQueryParamsId,
                  },
                  create: {
                    latitude: batchJobCtx.latitude,
                    longitude: batchJobCtx.longitude,
                    radius: batchJobCtx.radius,
                    searchkeyword: {
                      connectOrCreate: {
                        where: {
                          keyword: param.keyword ?? '',
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
                    keyword: param.keyword ?? '',
                  },
                  create: {
                    keyword: param.keyword ?? '',
                  },
                },
              },
            }),
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
 * store 옵션이 있을 경우 idealbllom DB에 저장한다.
 */
export const getPlaceDataFromVJ = async (
  param: GetPlaceDataFromVJREQParam,
): Promise<GetPlaceDataFromVJRETParamPayload> => {
  const { batchJobCtx } = param;

  const jejuRes = await getAllPlaceDataFromVJ(param);

  /// store data to db
  if (param.store) {
    const { items } = jejuRes;

    /// 배치 스크립트로 store 옵션과 함께 실행되면
    /// 기존 사용중인 데이터는 ARCHIVED가 되고
    /// 배치 스크립트로 새로 수집된 데이터가 IN_USE가 된다.
    if (batchJobCtx && !isEmpty(batchJobCtx)) {
      const updatedPromises =
        items &&
        items.map(item => {
          const promise = prisma.tourPlace.updateMany({
            where: {
              vj_contentsid: item.contentsid,
              status: 'IN_USE',
              tourPlaceType: { in: ['VISITJEJU_RESTAURANT', 'VISITJEJU_SPOT'] },
            },
            data: {
              status: 'ARCHIVED',
            },
          });
          return promise;
        });
      if (updatedPromises) await prisma.$transaction(updatedPromises);
    }

    const createPromises =
      items &&
      items.map(item => {
        const promise = prisma.tourPlace.create({
          data: {
            status: batchJobCtx && !isEmpty(batchJobCtx) ? 'IN_USE' : 'NEW',
            tourPlaceType:
              item.contentscd?.label === '음식점'
                ? 'VISITJEJU_RESTAURANT'
                : 'VISITJEJU_SPOT',

            vj_contentsid: item.contentsid as string,
            vj_contentscdLabel: item.contentscd?.label,
            vj_contentscdValue: item.contentscd?.value,
            vj_contentscdRefId: item.contentscd?.refId,
            vj_title: item.title,
            vj_region1cdLabel: item.region1cd?.label,
            vj_region1cdValue: item.region1cd?.value,
            vj_region1cdRefId: item.region1cd?.refId,
            vj_region2cdLabel: item.region2cd?.label,
            vj_region2cdValue: item.region2cd?.value,
            vj_region2cdRefId: item.region2cd?.refId,
            vj_address: item.address,
            vj_roadaddress: item.roadaddress,
            vj_tag: {
              ...(item.tag && {
                connectOrCreate: item.tag.split(',').map(v => {
                  return {
                    where: {
                      value: v,
                    },
                    create: {
                      value: v,
                    },
                  };
                }),
              }),
            },
            vj_introduction: item.introduction,
            vj_latitude: item.latitude,
            vj_longitude: item.longitude,
            vj_postcode: item.postcode,
            vj_phoneno: item.phoneno,
            ...(batchJobCtx &&
              batchJobCtx.batchQueryParamsId && {
                batchQueryParams: {
                  connectOrCreate: {
                    where: {
                      id: batchJobCtx.batchQueryParamsId,
                    },
                    create: {
                      // keyword: queryReqParams?.textSearchReqParams?.keyword,
                      latitude: undefined,
                      longitude: undefined,
                      radius: undefined,
                      searchkeyword: {
                        connectOrCreate: {
                          where: {
                            keyword: '',
                          },
                          create: {
                            keyword: '',
                          },
                        },
                      },
                    },
                  },
                },
              }),
          },
        });
        return promise;
      });

    const createdList =
      createPromises && (await prisma.$transaction(createPromises));

    if (!createdList)
      throw new IBError({
        type: 'EXTERNALAPI',
        message: '반환된 visitJeju searchList 결과값이 없습니다.',
      });
  }
  return jejuRes;
};

/*
 * curCheckin ~ curCheckout 기간동안
 * hotelTransition 수만큼 자동으로 날짜를 나누어 검색한 결과들을 리턴하는 재귀 함수
 *  */
export interface CandidateHotel {
  transitionNo: number;
  stayPeriod: number;
  checkin: string;
  checkout: string;
  hotels: Partial<TourPlace>[];
}

/**
 * 전체 여행 일정에서 호텔 변경 횟수(hotelTransition) 만큼 일정을 나누어
 * 일정별 호텔을 검색하여 반환하는 함수
 * hotelSrchOpt의 타입에 따라 호출할 외부 api가 결정되게 된다.(현재는 bookin.com만 존재)
 *
 * hotelSrchOpt 파라미터로 전달된 전체일정에서
 * (checkinDate, checkoutDate)
 * hotelTransition 값에 따라 일정을 쪼개어 필요한 호텔 수 만큼 검색한다.
 * ex) hotelTransition === 1 이고, 2022-01-01 ~ 2022-01-06 일정이라면
 * 1일부터 5일까지 5박일정으로 1번 호텔을 변경하게 되면 총 필요한 호텔 수는 2이다.
 * 즉 5/2 = 2.5 를 올림하여 호텔 변경까지 텀은 3일이다. (3일에 한번씩 바꾼다는 의미)
 *  - 2022-01-01 ~ 2022-01-04
 *  - 2022-01-04 ~ 2022-01-05
 * 로 끊어서 두번 호텔 방을 검색하게 된다.
 *
 * @param hotelLoopParam
 * @returns
 */
export const hotelLoopSrchByHotelTrans = async <
  H extends HotelOptType,
>(hotelLoopParam: {
  hotelSrchOpt: H;
  curLoopCnt?: number;
  hotelTransition: number;
  transitionTerm: number;
  store?: boolean;
}): Promise<CandidateHotel[]> => {
  const {
    hotelSrchOpt,
    curLoopCnt,
    hotelTransition,
    transitionTerm,
    store = false,
  } = hotelLoopParam;
  if (isUndefined(curLoopCnt)) {
    const list = await hotelLoopSrchByHotelTrans<H>({
      hotelSrchOpt,
      curLoopCnt: 0,
      hotelTransition,
      transitionTerm,
      store,
    });
    return list;
  }

  if (curLoopCnt > hotelTransition) return []; /// recursion exit condition

  const curCheckin = moment(
    moment(hotelSrchOpt.checkinDate).add(transitionTerm * curLoopCnt, 'd'),
  ).toISOString();
  let curCheckout = moment(
    moment(curCheckin).add(transitionTerm, 'd'),
  ).toISOString();

  if (moment(curCheckout).diff(moment(hotelSrchOpt.checkoutDate), 'd') > 0)
    curCheckout = hotelSrchOpt.checkoutDate;

  const { hotelSearchResult: curHotels } = await getHotelDataFromBKC({
    ...hotelSrchOpt,
    checkinDate: curCheckin,
    checkoutDate: curCheckout,
    store,
  });

  const list = await hotelLoopSrchByHotelTrans<H>({
    hotelSrchOpt,
    curLoopCnt: curLoopCnt + 1,
    hotelTransition,
    transitionTerm,
    store,
  });

  // /// 뽑을 호텔들중 겹치지 않도록 차순위 호텔을 선택하는 로직
  // const picked =                        .find(candidateHotel => {
  //   return (
  //     list.findIndex(
  //       alreadyPicked =>
  //         alreadyPicked.hotel?.bkc_hotel_id === candidateHotel.bkc_hotel_id,
  //     ) === -1
  //   );
  // });

  return [
    {
      transitionNo: curLoopCnt,
      stayPeriod: moment(curCheckout).diff(curCheckin, 'd'),
      checkin: curCheckin,
      checkout: curCheckout,
      hotels: curHotels,
    },
    ...list,
  ];
};

/*
 * minMoney와 maxMoney에 맞게 비용 초과되지 않는 호텔들만 변경 숙소들로 리턴하는 함수
 *  */
export const moneyFilterForHotel = (param: {
  candidates: CandidateHotel[];
  inputCtx: {
    minMoney: number;
    maxMoney: number;
    travelNights: number;
  };
}): {
  min: CandidateHotel[];
  mid: CandidateHotel[];
  max: CandidateHotel[];
} => {
  const {
    candidates,
    inputCtx: { minMoney, maxMoney, travelNights },
  } = param;

  const minHotelMoney = minMoney * gMinHotelMoneyPortion;
  const dailyMinMoney = minHotelMoney / travelNights;

  const midMoney = (minMoney + maxMoney) / 2;
  const midHotelMoney = midMoney * gMidHotelMoneyPortion;
  const dailyMidMoney = (midHotelMoney * gFlexPortionLimit) / travelNights;

  const maxHotelMoney = maxMoney * gMaxHotelMoneyPortion;
  const dailyMaxMoney = maxHotelMoney / travelNights;

  const minFilteredCandidates = candidates.map(c => {
    return {
      ...c,
      hotels: c.hotels.filter(hotel =>
        hotel.bkc_gross_amount_per_night
          ? hotel.bkc_gross_amount_per_night < dailyMinMoney
          : false,
      ),
    };
  });
  const midFilteredCandidates = candidates.map(c => {
    return {
      ...c,
      hotels: c.hotels.filter(hotel =>
        hotel.bkc_gross_amount_per_night
          ? hotel.bkc_gross_amount_per_night < dailyMidMoney
          : false,
      ),
    };
  });
  const maxFilteredCandidates = candidates.map(c => {
    return {
      ...c,
      hotels: c.hotels.filter(hotel =>
        hotel.bkc_gross_amount_per_night
          ? hotel.bkc_gross_amount_per_night < dailyMaxMoney
          : false,
      ),
    };
  });

  // const alreadyBuf: Partial<TourPlace>[] = [];
  // const pick = (mfc: CandidateHotel) => {
  //   const { hotels: curHotels } = mfc;

  //   const curPicked = curHotels.find(
  //     ch =>
  //       alreadyBuf.findIndex(
  //         alreadyPicked => alreadyPicked.bkc_hotel_id === ch.bkc_hotel_id,
  //       ) === -1,
  //   );
  //   if (curPicked) {
  //     alreadyBuf.push(curPicked);
  //   }
  //   return {
  //     ...mfc,
  //     hotels: (curPicked ?? []) as Partial<TourPlace>[],
  //   };
  // };
  // const minRes = minFilteredCandidates.map(mfc => pick(mfc));
  // const midRes = midFilteredCandidates.map(mfc => pick(mfc));
  // const maxRes = maxFilteredCandidates.map(mfc => pick(mfc));

  /**
   * pick 함수
   * 중복이 되지 않도록 후보 호텔 리스트 앞에서부터 선택해서
   * (review_score 또는 popularity 정렬되어있음)
   * Candidate[] 형태의 hotels 프로퍼티에 선택된 하나씩만 넣어서 리턴하는 reduce 함수
   *  */
  const pick = (acc: CandidateHotel[], cur: CandidateHotel) => {
    const { hotels: curHotels } = cur;
    const alreadyBuf = acc.map(v => v.hotels).flat();
    const curPicked = curHotels.find(
      h =>
        alreadyBuf.findIndex(
          alreadyPicked => alreadyPicked.bkc_hotel_id === h.bkc_hotel_id,
        ) === -1,
    );

    return [
      ...acc,
      {
        ...cur,
        hotels: ([curPicked] ?? []) as Partial<TourPlace>[],
      },
    ];
  };

  const minRes = minFilteredCandidates.reduce(
    (acc, cur) => pick(acc, cur),
    [] as CandidateHotel[],
  );
  const midRes = midFilteredCandidates.reduce(
    (acc, cur) => pick(acc, cur),
    [] as CandidateHotel[],
  );
  const maxRes = maxFilteredCandidates.reduce(
    (acc, cur) => pick(acc, cur),
    [] as CandidateHotel[],
  );

  return {
    min: minRes,
    mid: midRes,
    max: maxRes,
  };
};
/**
 * 호텔 검색 옵션과 장소 및 식장 검색 옵션 파라미터를 전달받아 추천 일정 리스트를 반환하는 함수
 * (구) getRecommendListWithLatLNgtInnerFn, getRecommendListFromDBInnerFn
 */
export const getRcmdList = async <H extends HotelOptType>(
  param: GetRcmdListREQParam<H>,
  ctx?: IBContext,
): Promise<GetRcmdListRETParamPayload> => {
  const {
    minMoney = 0, // 여행 전체일정중 최소비용
    maxMoney = 0, // 여행 전체 일정중 최대 비용
    // currency,
    // travelType,
    travelHard,
    startDate, // 여행 시작일
    endDate, // 여행 종료일
    adult,
    child,
    hotelTransition = gHotelTransition, // 호텔 바꾸는 횟수
    hotelSrchOpt,
    // placeSrchOpt,
    store,
  } = param;

  const userTokenId = ctx?.userTokenId;

  const { latitude: hotelLat, longitude: hotelLngt } = hotelSrchOpt;

  if (minMoney === 0 || maxMoney === 0) {
    throw new IBError({
      type: 'INVALIDPARAMS',
      message: 'minMoney, maxMoney는 모두 0이상의 값이 제공되어야 합니다.',
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

  const travelNights = getTravelNights(startDate, endDate);
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
  const travelDays = travelNights + 1;
  const transitionTerm = Math.ceil(travelNights / (hotelTransition + 1)); // 호텔 이동할 주기 (단위: 일)
  const candidateBKCHotels = await hotelLoopSrchByHotelTrans<H>({
    hotelSrchOpt,
    hotelTransition,
    transitionTerm,
    store,
  });

  const {
    min: minCandidates,
    mid: midCandidates,
    max: maxCandidates,
  } = moneyFilterForHotel({
    candidates: candidateBKCHotels,
    inputCtx: {
      minMoney,
      maxMoney,
      travelNights,
    },
  });

  const spots = await prisma.tourPlace.findMany({
    where: {
      AND: [
        { status: 'IN_USE' },
        {
          OR: [
            { tourPlaceType: 'GL_SPOT' },
            { tourPlaceType: 'VISITJEJU_SPOT' },
          ],
        },
      ],
    },
    orderBy: [{ evalScore: 'desc' }],
  });
  const restaurants = await prisma.tourPlace.findMany({
    where: {
      AND: [
        { status: 'IN_USE' },
        {
          OR: [
            { tourPlaceType: 'GL_RESTAURANT' },
            { tourPlaceType: 'VISITJEJU_RESTAURANT' },
          ],
        },
      ],
    },
    orderBy: [{ evalScore: 'desc' }],
  });

  const makeVisitSchedule = (planType: PlanType) => {
    const cpSpots = [...spots];
    const cpRestaurants = [...restaurants];

    const numOfADaySchedule = gMealPerDay + gSpotPerDay + 1;
    // const totalScheduleLength = visitScheduleLength * 3; /// min,  mid, max 세개
    let mealOrder: MealOrder;
    let nextMealOrder: number;

    return (x: unknown, i: number) => {
      const dayNo = Math.floor(i / numOfADaySchedule);
      const orderNo = i % numOfADaySchedule;
      let ret: Partial<IVisitSchedule> = { dayNo, orderNo, planType };

      const transitionNo = Math.floor(
        dayNo === travelDays - 1
          ? minCandidates.length - 1
          : dayNo / transitionTerm,
      );

      const candidates = (() => {
        if (planType === 'MIN') return minCandidates[transitionNo];
        if (planType === 'MID') return midCandidates[Math.floor(transitionNo)];
        return maxCandidates[Math.floor(transitionNo)];
      })();

      if (orderNo === 0) {
        ret = {
          ...ret,
          placeType: 'HOTEL',
          transitionNo: candidates.transitionNo ?? {},
          stayPeriod: candidates.stayPeriod ?? {},
          checkin: candidates.checkin ?? {},
          checkout: candidates.checkout ?? {},
          data: candidates.hotels[0] ?? {},
        };
        mealOrder = new MealOrder();
        nextMealOrder = mealOrder.getNextMealOrder();
        return ret;
      }

      if (nextMealOrder === orderNo) {
        ret = {
          ...ret,
          placeType: 'RESTAURANT',
          transitionNo: candidates.transitionNo ?? {},
          stayPeriod: candidates.stayPeriod ?? {},
          checkin: candidates.checkin ?? {},
          checkout: candidates.checkout ?? {},
          data: cpRestaurants.shift() ?? {},
        };
        nextMealOrder = mealOrder.getNextMealOrder();
        return ret;
      }

      ret = {
        ...ret,
        placeType: 'SPOT',
        transitionNo: candidates.transitionNo ?? {},
        stayPeriod: candidates.stayPeriod ?? {},
        checkin: candidates.checkin ?? {},
        checkout: candidates.checkout ?? {},
        data: cpSpots.shift() ?? {},
      };
      return ret;
    };
  };

  const numOfADaySchedule = gMealPerDay + gSpotPerDay + 1;
  const visitScheduleLength = travelDays * numOfADaySchedule;
  const tmpArr = Array.from(Array(visitScheduleLength));
  const minVisitSchedules = tmpArr.map(makeVisitSchedule('MIN'));
  const midVisitSchedules = tmpArr.map(makeVisitSchedule('MID'));
  const maxVisitSchedules = tmpArr.map(makeVisitSchedule('MAX'));

  const visitSchedules = [
    ...minVisitSchedules,
    ...midVisitSchedules,
    ...maxVisitSchedules,
  ];

  /// legacy code day, order 2중 루프
  // const visitSchedulePromises = Array.from(Array(travelDays)).map(
  //   async (x, day) => {
  //     const mealOrder = new MealOrder();
  //     let nextMealOrder = mealOrder.getNextMealOrder();

  //     const dayArr = Array.from(Array(gMealPerDay + gSpotPerDay + 1));

  //     const makeVisitSchedule = (type: 'min' | 'mid' | 'max') => {
  //       return async (v: unknown, i: number) => {
  //         const promise: Promise<VisitOrder> = new Promise(resolve => {
  //           if (i === 0) {
  //             resolve({
  //               type: 'HOTEL',
  //               data: ((): Partial<TourPlace> => {
  //                 if (type === 'min') {
  //                   return (
  //                     minCandidates[Math.floor(day / transitionTerm)]
  //                       .hotels[0] ?? {}
  //                   );
  //                 }

  //                 if (type === 'mid') {
  //                   return (
  //                     midCandidates[Math.floor(day / transitionTerm)]
  //                       .hotels[0] ?? {}
  //                   );
  //                 }

  //                 return (
  //                   maxCandidates[Math.floor(day / transitionTerm)].hotels[0] ??
  //                   {}
  //                 );
  //               })(),
  //             });
  //           }
  //           if (nextMealOrder === i) {
  //             nextMealOrder = mealOrder.getNextMealOrder();
  //             resolve({
  //               type: 'RESTAURANT',
  //               data: restaurants.shift() ?? {},
  //             });
  //           }
  //           resolve({
  //             type: 'SPOT',
  //             data: spots.shift() ?? {},
  //           });
  //         });
  //         const result = await promise;
  //         return result;
  //       };
  //     };

  //     const min = await Promise.all(dayArr.map(makeVisitSchedule('min')));
  //     const mid = await Promise.all(dayArr.map(makeVisitSchedule('mid')));
  //     const max = await Promise.all(dayArr.map(makeVisitSchedule('max')));

  //     return {
  //       visitOrder: {
  //         min,
  //         mid,
  //         max,
  //       },
  //     };
  //   },
  // );

  // const visitSchedules = await Promise.all(visitSchedulePromises);

  const tStartDate = moment(moment(startDate).startOf('d')).toISOString();
  const tEndDate = moment(moment(endDate).startOf('d')).toISOString();

  const queryParams = await prisma.queryParams.create({
    data: {
      minMoney: minMoney ? Number(minMoney) : undefined,
      maxMoney: maxMoney ? Number(maxMoney) : undefined,
      startDate: tStartDate,
      endDate: tEndDate,
      // startDate,
      // endDate,
      travelHard: travelHard ? Number(travelHard) : travelHard,
      adult: adult ? Number(adult) : undefined,
      child: child ? Number(child) : undefined,
      tourPlace: {
        connect: [
          ...(() => {
            const result = candidateBKCHotels
              .map(c => {
                const hotelIds = c.hotels
                  .map(h => {
                    if (h.id)
                      return {
                        id: h.id,
                      };
                    return undefined;
                  })
                  .filter(x => x) as unknown[] as {
                  id: number;
                }[];
                return hotelIds;
              })
              .flat();
            return result;
          })(),
          ...restaurants.map(v => {
            return { id: v.id };
          }),
          ...spots.map(v => {
            return { id: v.id };
          }),
        ],
      },
      userTokenId,
      visitSchedule: {
        createMany: {
          data: visitSchedules.map(v => {
            return {
              dayNo: v.dayNo ?? -1,
              orderNo: v.orderNo ?? -1,
              planType: v.planType ?? 'MIN',
              placeType: v.placeType ?? null,
              tourPlaceId: v.data?.id,
              transitionNo: v.transitionNo,
              stayPeriod: v.stayPeriod,
              checkin: v.checkin,
              checkout: v.checkout,
            };
          }),
        },
      },
    },
    include: {
      visitSchedule: {
        include: {
          tourPlace: true,
        },
      },
    },
  });

  return {
    ...queryParams,
  };
};

const visitScheduleToDayScheduleType = (
  acc: DayScheduleType[],
  cur: VisitSchedule & {
    tourPlace: TourPlace | null;
  },
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
            visitScheduleId: cur.id.toString(),
            orderNo: cur.orderNo.toString(),
            transitionNo: cur.transitionNo,
            stayPeriod: cur.stayPeriod,
            checkin: cur.checkin?.toISOString() ?? null,
            checkout: cur.checkout?.toISOString() ?? null,
            title: (() => {
              if (cur.tourPlace?.tourPlaceType === 'BKC_HOTEL')
                return cur.tourPlace?.bkc_hotel_name ?? '';
              if (cur.tourPlace?.tourPlaceType.includes('GL_'))
                return cur.tourPlace?.gl_name ?? '';
              if (cur.tourPlace?.tourPlaceType.includes('VJ_'))
                return cur.tourPlace?.vj_title ?? '';
              return 'none';
            })(),
            tourPlaceData: cur.tourPlace,
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
        visitScheduleId: cur.id?.toString() ?? 'none',
        orderNo: cur.orderNo.toString(),
        transitionNo: cur.transitionNo,
        stayPeriod: cur.stayPeriod,
        checkin: cur.checkin?.toISOString() ?? null,
        checkout: cur.checkout?.toISOString() ?? null,
        title: (() => {
          if (cur.tourPlace?.tourPlaceType === 'BKC_HOTEL')
            return cur.tourPlace?.bkc_hotel_name ?? '';
          if (cur.tourPlace?.tourPlaceType.includes('GL_'))
            return cur.tourPlace?.gl_name ?? '';
          if (cur.tourPlace?.tourPlaceType.includes('VJ_'))
            return cur.tourPlace?.vj_title ?? '';
          return 'none';
        })(),
        tourPlaceData: cur.tourPlace,
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

/**
 * 일정 생성 요청을 하는 reqSchedule 구현부 함수.
 * 내부적으로 getRcmdList를 호출하여 타입 변환 후 프론트로 전달한다.
 */
export const reqSchedule = async <H extends HotelOptType>(
  param: ReqScheduleREQParam<H>,
  ctx?: IBContext,
): Promise<ReqScheduleRETParamPayload> => {
  // const watchStart = moment();

  const {
    startDate,
    endDate,
    adult,
    child,
    infant,
    // favoriteTravelType,
    // favoriteAccommodation,
    // favoriteAccommodationLocation,
    hotelSrchOpt: inputHotelSrchOpt,
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

  const hotelSrchOpt = {
    orderBy: 'review_score',
    adultsNumber: adult ? Number(adult) : 2,
    roomNumber: 1,
    checkinDate: startDate,
    checkoutDate: endDate,
    filterByCurrency: 'KRW',
    latitude: '33.389464',
    longitude: '126.554401',
    pageNumber: 0,
    includeAdjacency: true,
    childrenAges,
    childrenNumber: (infant ? Number(infant) : 0) + (child ? Number(child) : 0),
    categoriesFilterIds: inputHotelSrchOpt?.categoriesFilterIds ?? [
      'property_type::204',
    ],
  } as H;

  const schd = await getRcmdList<H>(
    {
      ...param,
      hotelTransition: 1,
      hotelSrchOpt,
      store: true,
    },
    ctx,
  );

  const minSchds = schd.visitSchedule.filter(v => v.planType === 'MIN');
  const midSchds = schd.visitSchedule.filter(v => v.planType === 'MID');
  const maxSchds = schd.visitSchedule.filter(v => v.planType === 'MAX');

  const minRetValue = minSchds.reduce(
    visitScheduleToDayScheduleType,
    [] as DayScheduleType[],
  );
  const midRetValue = midSchds.reduce(
    visitScheduleToDayScheduleType,
    [] as DayScheduleType[],
  );
  const maxRetValue = maxSchds.reduce(
    visitScheduleToDayScheduleType,
    [] as DayScheduleType[],
  );

  return {
    queryParamsId: schd.id.toString(),
    plan: [
      { planType: 'MIN', day: minRetValue },
      { planType: 'MID', day: midRetValue },
      { planType: 'MAX', day: maxRetValue },
    ],
  };
};

/**
 * 일정 생성 요청을 하는 reqSchedule 로 생성된 일정을
 * queryParamsId 파라미터로 특정하여 일정을 찾아 반환하는 함수.
 * savedSchedule 로 구분되는 유저의 일정 '저장'여부와 상관없이
 * 생성 요청으로 인해 일정이 구성되었기만 한다면 데이터를 반환한다.
 */
export const getSchedule = async (
  param: GetScheduleREQParam,
): Promise<GetScheduleRETParamPayload> => {
  const { queryParamsId } = param;

  const queryParams = await prisma.queryParams.findUnique({
    where: {
      id: Number(queryParamsId),
    },
    include: {
      visitSchedule: {
        include: {
          tourPlace: true,
        },
      },
    },
  });

  if (isEmpty(queryParams))
    throw new IBError({
      type: 'NOTMATCHEDDATA',
      message: 'queryParamsId에 해당하는 데이터가 존재하지 않습니다.',
    });

  const minVisitSchd = queryParams.visitSchedule.filter(
    v => v.planType === 'MIN',
  );
  const midVisitSchd = queryParams.visitSchedule.filter(
    v => v.planType === 'MID',
  );
  const maxVisitSchd = queryParams.visitSchedule.filter(
    v => v.planType === 'MAX',
  );

  const minRetValue = minVisitSchd.reduce(
    visitScheduleToDayScheduleType,
    [] as DayScheduleType[],
  );
  const midRetValue = midVisitSchd.reduce(
    visitScheduleToDayScheduleType,
    [] as DayScheduleType[],
  );
  const maxRetValue = maxVisitSchd.reduce(
    visitScheduleToDayScheduleType,
    [] as DayScheduleType[],
  );

  return {
    queryParamsId: queryParams.id.toString(),
    plan: [
      { planType: 'MIN', day: minRetValue },
      { planType: 'MID', day: midRetValue },
      { planType: 'MAX', day: maxRetValue },
    ],
  };
};

/**
 * 일정 생성 요청을 하는 reqSchedule 로 생성된 일정중
 * api 요청시에 Bearer 토큰으로 전달받는 userTokenId 파라미터로 특정하여
 * 해당 유저가 '저장' 완료한 복수의 일정을 찾아 반환하는 함수.
 * savedSchedule이 null이 아닌것을 조건으로 DB에서 검색한다.
 * (savedSchedule이 생성되어 있다면 유저가 일정을 확인 후 '저장' 한것이다.)
 */
export const getScheduleList = async (
  param: GetScheduleListREQParam,
  ctx?: IBContext,
): Promise<GetScheduleListRETParamPayload[]> => {
  const { skip, take } = param;
  const userTokenId = ctx?.userTokenId;

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
      visitSchedule: {
        include: {
          tourPlace: true,
        },
      },
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
        id: savedSchedule.id.toString(),
        tag: savedSchedule.hashTag.map(v => v.value),
        title: savedSchedule.title,
        createdAt: savedSchedule.createdAt.toISOString(),
        thumbnail: savedSchedule.thumbnail,
        // scheduleHash: savedSchedule.scheduleHash,
        planType: savedSchedule.planType.toLowerCase(),
      };
    })
    .filter(v => v) as GetScheduleListRETParamPayload[];

  return retValue;
};

/**
 * 일정 생성 요청을 하는 saveSchedule 로 생성된 일정중
 * 해당 유저가 확인 후 '저장' 요청시에 호출하는 함수
 */
export const saveSchedule = async (
  param: SaveScheduleREQParam,
  ctx?: IBContext,
): Promise<SaveScheduleRETParamPayload> => {
  const { title, keyword, planType, queryParamsId } = param;
  const userTokenId = ctx?.userTokenId ?? '';

  const queryParams = await prisma.queryParams.findFirst({
    where: {
      id: Number(queryParamsId),
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
      message: 'scheduleHash에 대응하는 일정 데이터가 존재하지 않습니다.',
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
  return { queryParamsId: createResult.queryParamsId.toString() };
};

/**
 * 생성된 스케쥴의 하루 일정 요청 api
 * 스케쥴에서 지정된 날짜의 데일리 계획을 조회 요청한다.
 */
export const getDaySchedule = async (
  param: GetDayScheduleREQParam,
): Promise<GetDayScheduleRETParamPayload> => {
  const { queryParamsId, day, planType } = param;

  const queryParams = await prisma.queryParams.findFirst({
    where: {
      id: Number(queryParamsId),
    },
    include: {
      visitSchedule: {
        where: {
          dayNo: { equals: Number(day) },
          planType: { equals: planType.toUpperCase() as PlanType },
        },
        include: {
          tourPlace: {
            include: {
              gl_photos: true,
            },
          },
        },
      },
    },
  });

  if (!queryParams) {
    throw new IBError({
      type: 'NOTEXISTDATA',
      message: 'queryParamsId 에 해당하는 일정 데이터가 존재하지 않습니다.',
    });
  }

  const spotList: Pick<GetDayScheduleRETParamPayload, 'spotList'> = {
    spotList: queryParams.visitSchedule.map(v => {
      if (!v.tourPlace) return undefined;

      const vType: PlaceType = v.tourPlace.tourPlaceType;
      const night = v.stayPeriod ?? 0;
      const days = v.stayPeriod ? night + 1 : 0;

      if (vType.includes('BKC_HOTEL')) {
        const hotel = v.tourPlace;
        return {
          id: v.id.toString(),
          spotType: vType as string,
          previewImg: hotel.bkc_main_photo_url ?? 'none',
          spotName: hotel.bkc_hotel_name ?? 'none',
          roomType: hotel.bkc_unit_configuration_label ?? 'none',
          spotAddr: hotel.bkc_address ?? 'none',
          hotelBookingUrl: hotel.bkc_url ?? 'none',
          startDate: v.checkin ? moment(v.checkin).format('YYYY-MM-DD') : '',
          endDate: v.checkout ? moment(v.checkout).format('YYYY-MM-DD') : '',
          night,
          days,
          checkin: hotel.bkc_checkin,
          checkout: hotel.bkc_checkout,
          price: hotel.bkc_min_total_price?.toString(),
          rating: hotel.bkc_review_score
            ? hotel.bkc_review_score / 2.0
            : undefined,
          lat: hotel.bkc_latitude ?? -1,
          lng: hotel.bkc_longitude ?? -1,
          imageList: [
            {
              id: '1',
              url: hotel.bkc_main_photo_url ?? undefined,
            },
          ],
        };
      }
      if (vType.includes('GL_')) {
        const googlePlace = v.tourPlace;
        return {
          id: v.id.toString(),
          spotType: vType as string,
          previewImg:
            googlePlace.gl_photos.length > 0 && googlePlace.gl_photos[0].url
              ? googlePlace.gl_photos[0].url
              : 'none',
          spotName: googlePlace.gl_name ?? 'none',
          spotAddr: googlePlace.gl_vicinity ?? 'none',
          // contact: 'none',
          placeId: googlePlace.gl_place_id ?? 'none',
          startDate: v.checkin ? moment(v.checkin).format('YYYY-MM-DD') : '',
          endDate: v.checkout ? moment(v.checkout).format('YYYY-MM-DD') : '',
          night,
          days,
          price: googlePlace.gl_price_level?.toString(),
          rating: googlePlace.gl_rating ?? undefined,
          lat: googlePlace.gl_lat ?? -1,
          lng: googlePlace.gl_lng ?? -1,
          imageList: googlePlace.gl_photos.map(p => {
            return {
              id: p.id.toString(),
              photo_reference: p.photo_reference,
            };
          }),
        };
      }

      if (vType.includes('VJ_')) {
        const visitJejuPlace = v.tourPlace;
        return {
          id: v.id.toString(),
          spotType: vType as string,
          previewImg: 'none',
          spotName: visitJejuPlace.vj_title ?? 'none',
          spotAddr: visitJejuPlace.vj_address ?? 'none',
          // contact: 'none',
          placeId: visitJejuPlace.vj_contentsid ?? 'none',
          startDate: v.checkin ? moment(v.checkin).format('YYYY-MM-DD') : '',
          endDate: v.checkout ? moment(v.checkout).format('YYYY-MM-DD') : '',
          night,
          days,
          lat: visitJejuPlace.vj_latitude ?? -1,
          lng: visitJejuPlace.vj_longitude ?? -1,
        };
      }
      return undefined;
    }),
  };

  const retValue: GetDayScheduleRETParamPayload = {
    id: queryParams.id.toString(),
    dayCount: Number(day),
    contentsCountAll: spotList.spotList.length,
    spotList: spotList.spotList,
  };
  return retValue;
};
