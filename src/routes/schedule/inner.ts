/* eslint-disable @typescript-eslint/naming-convention */
import moment from 'moment';
import prisma from '@src/prisma';
import { IBError } from '@src/utils';
import axios, { Method } from 'axios';
import { TourPlace, PlanType } from '@prisma/client';
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
  VisitSchedule,
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
    mock = false,
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
    if (mock) {
      const responseData = await prisma.mockBookingDotComHotelResource.findMany(
        {
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
        },
      );
      const { result } =
        responseData && responseData.length > 0
          ? (JSON.parse(responseData[0].responseData) as {
              result: BKCHotelRawData[];
            })
          : { result: [] };

      if (!isEmpty(result)) {
        const transResult: Partial<TourPlace>[] = result.map(item => {
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

        return transResult;
      }
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
    console.log('\n');
    console.log(options);
    const response = await axios.request(options);
    const { result: responseData } = response.data as {
      result: BKCHotelRawData[];
    };

    if (mock) {
      const data = JSON.stringify(response.data);
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
          responseData: data,
        },
      });
    }

    if (store) {
      const createSearchHotelResPromises = responseData.map(item => {
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

    const retValue: Partial<TourPlace>[] = responseData.map(item => {
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
      await prisma.tourPlace.upsert({
        where: { gl_place_id: item.place_id },
        update: {},
        create: {
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
      await prisma.tourPlace.upsert({
        where: { gl_place_id: item.place_id },
        update: {},
        create: {
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
  const jejuRes = await getAllPlaceDataFromVJ(param);

  /// store data to db
  if (param.store) {
    const { items } = jejuRes;

    const batchJobId = 1;
    const createPromises =
      items &&
      items.map(item => {
        const promise = prisma.tourPlace.create({
          data: {
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
            ...(batchJobId &&
              batchJobId > 0 && {
                batchQueryParams: {
                  connectOrCreate: {
                    where: {
                      id: batchJobId,
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
                batchSearchKeyword: {
                  connectOrCreate: {
                    where: {
                      keyword: '',
                    },
                    create: {
                      keyword: '',
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
  mock?: boolean;
}): Promise<CandidateHotel[]> => {
  const { hotelSrchOpt, curLoopCnt, hotelTransition, transitionTerm, mock } =
    hotelLoopParam;
  if (isUndefined(curLoopCnt)) {
    const list = await hotelLoopSrchByHotelTrans<H>({
      hotelSrchOpt,
      curLoopCnt: 0,
      hotelTransition,
      transitionTerm,
      mock,
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
    mock,
  });

  const list = await hotelLoopSrchByHotelTrans<H>({
    hotelSrchOpt,
    curLoopCnt: curLoopCnt + 1,
    hotelTransition,
    transitionTerm,
    mock,
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
    mock,
  } = param;

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
    mock,
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
      OR: [{ tourPlaceType: 'GL_SPOT' }, { tourPlaceType: 'VISITJEJU_SPOT' }],
    },
    orderBy: [{ evalScore: 'desc' }],
  });
  const restaurants = await prisma.tourPlace.findMany({
    where: {
      OR: [
        { tourPlaceType: 'GL_RESTAURANT' },
        { tourPlaceType: 'VISITJEJU_RESTAURANT' },
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
      let ret: Partial<VisitSchedule> = { dayNo, orderNo, planType };

      if (orderNo === 0) {
        const candidates = (() => {
          if (planType === 'MIN')
            return minCandidates[Math.floor(dayNo / transitionTerm)];
          if (planType === 'MID')
            return midCandidates[Math.floor(dayNo / transitionTerm)];
          return maxCandidates[Math.floor(dayNo / transitionTerm)];
        })();

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
          data: cpRestaurants.shift() ?? {},
        };
        nextMealOrder = mealOrder.getNextMealOrder();
        return ret;
      }

      ret = { ...ret, placeType: 'SPOT', data: cpSpots.shift() ?? {} };
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
      visitSchedule: {
        createMany: {
          data: visitSchedules.map(v => {
            return {
              dayNo: v.dayNo ?? -1,
              orderNo: v.orderNo ?? -1,
              planType: v.planType ?? 'MIN',
              placeType: v.placeType ?? null,
              tourPlaceId: v.data?.id,
            };
          }),
        },
      },
    },
  });

  return {
    ...queryParams,
    visitSchedulesCount: visitSchedules.length,
    visitSchedules,
  };
};
