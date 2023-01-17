/* eslint-disable @typescript-eslint/naming-convention */
import moment from 'moment';
import prisma from '@src/prisma';
import { IBError, getToday, getTomorrow, getNDaysLater } from '@src/utils';
import axios, { Method } from 'axios';
// import { EventEmitter } from 'events';
import { TourPlace, PlanType, VisitSchedule, PlaceType } from '@prisma/client';
import {
  isNumber,
  isNil,
  isEmpty,
  isNaN,
  isUndefined,
  omit,
  flattenDeep,
} from 'lodash';
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
  // GetRcmdListREQParam,
  // GetRcmdListRETParamPayload,
  // gHotelTransition,
  HotelOptType,
  gMinHotelMoneyPortion,
  gMidHotelMoneyPortion,
  gMaxHotelMoneyPortion,
  gFlexPortionLimit,
  gMealPerDay,
  // gSpotPerDay,
  MealOrder,
  IVisitOneSchedule,
  FavoriteTravelType,
  // ReqScheduleREQParam,
  // ReqScheduleRETParamPayload,
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
  GetDetailScheduleREQParam,
  GetDetailScheduleRETParamPayload,
  GglPlaceDetailType,
  GetPlaceDetailRawData,
  GooglePriceLevel,
  GooglePlaceReview,
  // GetRcmdListHotelOpt,
  GetCandidateScheduleREQParam,
  GetCandidateScheduleRETParamPayload,
  BriefScheduleType,
  GetCandDetailSchdREQParam,
  GetCandDetailSchdRETParamPayload,
  ModifyScheduleREQParam,
  ModifyScheduleRETParamPayload,
  MakeScheduleREQParam,
  MakeScheduleRETParamPayload,
  BKCSrchByCoordReqOpt,
  gParamByTravelLevel,
  MakeClusterRETParam,
  TourPlaceGeoLoc,
  IHotelInMakeSchedule,
  ContextMakeSchedule,
  GeoFormat,
  IValidCentResources,
  GetHotelListRETParamPayload,
  GetHotelListREQParam,
  GetScheduleLoadingImgRETParamPayload,
} from './types/schduleTypes';

/**
 * inner utils
 *  */

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

export const getChildNumber = (familyOpt: string[]): number =>
  familyOpt.find(v => v.toUpperCase().includes('CHILD')) ? 1 : 0;
export const getInfantNumber = (familyOpt: string[]): number =>
  familyOpt.find(v => v.toUpperCase().includes('INFANT')) ? 1 : 0;
export const getAdultNumber = ({
  companion,
  familyOpt,
  maxFriend,
}: {
  companion: string;
  familyOpt: string[];
  maxFriend: string;
}): number => {
  if (companion) {
    const withPeople = companion.toUpperCase();
    switch (withPeople) {
      case 'ALONE':
        return 1;
      case 'FAMILY': {
        const parent = 2;
        const teenager = familyOpt.find(v =>
          v.toUpperCase().includes('TEENAGER'),
        )
          ? 1
          : 0;
        return parent + teenager;
      }
      case 'FRIEND': {
        const me = 1;
        return me + Number(maxFriend);
      }
      case 'NOTYET':
      default:
        return 2;
    }
  }
  return 2;
};
export const getRoomNumber = ({
  companion,
  familyOpt,
  maxFriend,
}: {
  companion: string;
  familyOpt: string[];
  maxFriend: string;
}): number => {
  const withPeople = companion.toUpperCase();
  switch (withPeople) {
    case 'FAMILY': {
      const parent = 1;
      const teenager = familyOpt.find(v => v.toUpperCase().includes('TEENAGER'))
        ? 1
        : 0;
      return parent + teenager;
    }
    case 'FRIEND': {
      if (!isEmpty(maxFriend)) return Math.ceil(Number(maxFriend) / 2);
      return 1;
    }
    case 'ALONE':
    case 'NOTYET':
    default:
      return 1;
  }
};

export const getBKCHotelSrchOpts = ({
  companion,
  familyOpt,
  maxFriend,
  period,
}: {
  companion: string;
  familyOpt: string[];
  maxFriend: string;
  period: string;
}): {
  childrenNumber: number;
  childrenAges: number[];
  adultsNumber: number;
  roomNumber: number;
  startDate: string;
  endDate: string;
} => {
  const child = getChildNumber(familyOpt);
  const infant = getInfantNumber(familyOpt);
  const childrenNumber = child + infant;

  const childrenAges = childInfantToChildrenAges({
    child: Number(child),
    infant: Number(infant),
  });

  /// teenager는 성인 1로 친다.
  /// default 2
  const adultsNumber = getAdultNumber({ companion, familyOpt, maxFriend });
  const roomNumber = getRoomNumber({ companion, familyOpt, maxFriend });

  const startDate = getNDaysLater(90);
  const endDate = getNDaysLater(90 + Number(period));

  return {
    childrenNumber,
    childrenAges,
    adultsNumber,
    roomNumber,
    startDate,
    endDate,
  };
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

  return { hotelSearchCount: hotelSearchResult.length, hotelSearchResult };
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
  const { pageToken, batchJobCtx } = param;
  const keyword = (() => {
    if (batchJobCtx) return batchJobCtx.keyword;
    return param.keyword;
  })();

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
                          keyword: batchJobCtx.keyword ?? '',
                        },
                        create: {
                          keyword: batchJobCtx.keyword ?? '',
                        },
                      },
                    },
                  },
                },
              },
              batchSearchKeyword: {
                connectOrCreate: {
                  where: {
                    keyword: batchJobCtx.keyword ?? '',
                  },
                  create: {
                    keyword: batchJobCtx.keyword ?? '',
                  },
                },
              },
              ibTravelTag: await (async () => {
                const {
                  ibType: { typePath, minDifficulty, maxDifficulty },
                } = batchJobCtx;
                const types = typePath.split('>');
                // const leafType = types[types.length - 1];
                let lastCreatedId = 0;
                let superTypeId: number = -1;
                // eslint-disable-next-line no-restricted-syntax
                for await (const type of types) {
                  let curIBTType = await prisma.iBTravelTag.findUnique({
                    where: {
                      value: type,
                    },
                  });
                  if (!curIBTType) {
                    curIBTType = await prisma.iBTravelTag.create({
                      data: {
                        value: type,
                        minDifficulty,
                        maxDifficulty,
                      },
                    });
                  }
                  if (superTypeId > -1) {
                    curIBTType = await prisma.iBTravelTag.update({
                      where: {
                        id: curIBTType.id,
                      },
                      data: {
                        related: {
                          connectOrCreate: {
                            where: {
                              fromId_toId: {
                                fromId: curIBTType.id,
                                toId: superTypeId,
                              },
                            },
                            create: {
                              toId: superTypeId,
                            },
                          },
                        },
                      },
                    });
                  }
                  superTypeId = curIBTType.id;
                }
                lastCreatedId = superTypeId;
                return {
                  connect: {
                    id: lastCreatedId,
                  },
                };
              })(),
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

const visitScheduleToDayScheduleType = (
  acc: DayScheduleType[],
  cur: VisitSchedule & {
    tourPlace: TourPlace | null;
  },
) => {
  if (cur && !isUndefined(cur.dayNo) && !isUndefined(cur.orderNo)) {
    const alreadyDayExist = acc.find(
      v =>
        v.dayNo === (cur.dayNo === undefined ? 'error' : cur.dayNo.toString()),
    );
    if (!alreadyDayExist) {
      acc.push({
        dayNo: cur.dayNo.toString(),
        scheduleItem: [
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
              if (cur.tourPlace?.tourPlaceType.includes('VISITJEJU_'))
                return cur.tourPlace?.vj_title ?? '';
              return 'none';
            })(),
            tourPlaceData: cur.tourPlace,
          },
        ],
      });
      return acc;
    }

    const alreadyOrderExist = alreadyDayExist.scheduleItem.find(
      v => v.orderNo === cur.orderNo?.toString(),
    );

    if (!alreadyOrderExist) {
      alreadyDayExist.scheduleItem.push({
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
          if (cur.tourPlace?.tourPlaceType.includes('VISITJEJU_'))
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
            scheduleItem: alreadyDayExist.scheduleItem,
          },
        ];
      }
    }
  }
  return acc;
};

/**
 * 두 위경도 값의 차이를 미터 단위로 환산하여 리턴하는 함수, 위도에 따른 지구 곡률 보정이 포함되어 있다.
 */
export const degreeToMeter = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number => {
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

const getLatLng = (spot: {
  gl_lat: number | null;
  gl_lng: number | null;
  vj_latitude: number | null;
  vj_longitude: number | null;
}): GeoFormat => {
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
  return {
    lat: spot.vj_latitude as number,
    lng: spot.vj_longitude as number,
  };
};

/**
 * makeSchedule에서 일정 데이터를 고르기위해 뽑힌 spot DB 데이터들 값을 기반으로
 * 군집화(cluster) 및 군집화 과정 데이터를 요청한다.
 */
const getDistance = (a: GeoFormat, b: GeoFormat) => {
  return Math.sqrt((a.lat - b.lat) ** 2 + (a.lng - b.lng) ** 2);
};

/**
 * 입력되는 type의 spot 또는 food에 따라 데이터들간의 클러스터링을 수행한다.
 */
export const makeCluster = (
  ctx: ContextMakeSchedule,
  type: 'spot' | 'food',
): MakeClusterRETParam | undefined => {
  const { spots, foods, paramByAvgCalibLevel } = ctx;

  let items: TourPlaceGeoLoc[] | undefined;

  if (type === 'spot') {
    /// spot일경우
    if (!spots || !paramByAvgCalibLevel) return undefined;
    items = spots;
  } else {
    /// food일 경우
    if (!foods || !paramByAvgCalibLevel) return undefined;
    items = foods;
  }

  /// 뽑힌 지점들 그룹화
  const r = (paramByAvgCalibLevel.maxDist * 1.5) / 5;

  let centroids = [...items].map((spot, idx) => {
    return {
      idx,
      ...getLatLng(spot),
      numOfPointLessThanR: -1,
    } as GeoFormat & {
      idx: number;
      numOfPointLessThanR: number;
      histories: string;
      randNum: number;
    };
  });
  const centHistoryByStage: {
    stageNo: number;
    centroids: GeoFormat[];
  }[] = [
    {
      stageNo: 0,
      centroids,
    },
  ];
  // const k = 0.001; /// 위경도 차이인데 적도기준에서 거리로 환산하면 약 111m(오차 최대치)
  let keepDoing: boolean[] = Array.from(Array(items.length), () => false);
  let maxPhase = 0;
  const histories = Array.from(Array(items.length), () => 'start');

  /// histories와 centroids를 구하는 루프를 실행한다.
  /// centroids: 최종적으로 수렴된 군집들의 대표 중심값 배열
  /// histories: 각 loop stage 별로 반경 r안에 위치한 items들에 대해 평균 위치 대표값을 구하여 배열로 저장한 데이터. 각 stage 별 centroids들을 배열로 엮은 값이다.
  do {
    const nextCentroids = centroids.map((c, index) => {
      const initCenterLatLng = c;

      /// 각 스테이지(index)의 클러스터 중심과 요소들간 거리를 비교해서 반경안에 있는 요소수를 확인
      const center = items!.reduce(
        (acc, curSpot) => {
          const spotLatLng = getLatLng(curSpot);
          if (!spotLatLng) return acc;
          if (degreeToMeter(c.lat, c.lng, spotLatLng.lat, spotLatLng.lng) < r) {
            const prevNumOfPoint = acc.numOfPointLessThanR;
            /// 새 요소가 추가되면서 이전까지 계산한 평균값에 새 값을 더해 평균값 재계산
            const curAvgLat =
              (acc.lat * prevNumOfPoint + spotLatLng.lat) /
              (prevNumOfPoint + 1);
            const curAvgLng =
              (acc.lng * prevNumOfPoint + spotLatLng.lng) /
              (prevNumOfPoint + 1);
            return {
              ...acc,
              numOfPointLessThanR: prevNumOfPoint + 1,
              lat: curAvgLat,
              lng: curAvgLng,
              randNum: Math.random(),
              // itemsLength: acc.items.length + 1,
              // items: [...acc.items, curSpot],
            };
          }
          return acc;
        },
        {
          idx: index,
          lat: initCenterLatLng.lat,
          lng: initCenterLatLng.lng,
          numOfPointLessThanR: 0,
          randNum: 0,
          histories: '',
          // itemsLength: 0,
          // items: [],
        } as GeoFormat & {
          idx: number;
          numOfPointLessThanR: number;
          histories: string;
          randNum: number;
          // itemsLength: number;
          // items: TourPlaceGeoLoc[];
        },
      );
      histories[index] = `${
        histories[index] === 'start' ? '' : `${histories[index]}-`
      }${center.numOfPointLessThanR}`;
      center.histories = histories[index];
      return center;
    });

    // eslint-disable-next-line @typescript-eslint/no-loop-func
    keepDoing = [...nextCentroids].map((newCent, idx) => {
      if (!newCent) return false;
      const prevCent = centroids[idx];
      if (!prevCent) return false;
      if (prevCent.lng === newCent.lng && prevCent.lat === newCent.lat)
        return false;
      // const rDiff = Math.abs(getDistance(newCent, prevCent));
      // if (rDiff < k) return false;
      /// 이전 차수의 클러스터보다 새 스테이지 차수의 클러스터가 가지고 있는 요소수가 적어졌다면 그 클러스터는 다음차수부터는 진행하지 않고 거기서 멈춘다.
      if (prevCent.numOfPointLessThanR > newCent.numOfPointLessThanR) {
        nextCentroids[idx] = { ...prevCent };
        return false;
      }
      prevCent.numOfPointLessThanR = newCent.numOfPointLessThanR;
      return true;
    }); /// keepDoing에 false가 있다면 해당 점은 더이상 진행하지 않아도 된다는 것이다.
    centroids = [...nextCentroids];
    centHistoryByStage.push({
      stageNo: centHistoryByStage.length,
      centroids,
    });
    maxPhase += 1;
  } while (keepDoing.find(v => v === true)); /// 하나라도 true가 발견된다면 계속 진행해야한다.

  // const wholeSpotLatLngSum = {
  //   lat: items.reduce((acc, v) => {
  //     const curLat = getLatLng(v);
  //     if (!curLat) return acc;
  //     return acc + curLat.lat;
  //   }, 0),
  //   lng: items.reduce((acc, v) => {
  //     const curLng = getLatLng(v);
  //     if (!curLng) return acc;
  //     return acc + curLng.lng;
  //   }, 0),
  // };
  // const wholeSpotLatLngAvg = {
  //   lat: wholeSpotLatLngSum.lat / items.length,
  //   lng: wholeSpotLatLngSum.lng / items.length,
  //   length: items.length,
  // };

  /// 클러스터링 전체 결과중 (gCentroids) 충분히 가까운값은 하나의 클러스터링으로 간주하고 버린 결과. 즉 미중복 클러스터들이다.
  /// centroids의 중복을 제거하여 nonDupCentroids를 구한다.
  /// nonDupCentroids의 idx는 centroids의 인덱스값이다.
  /// 수렴된 centroids 값들중 하나만 남기고 나머지는 제거한다.
  // const rankCentroids = [...centroids].sort(
  //   (a, b) => b.numOfPointLessThanR - a.numOfPointLessThanR,
  // );
  // const shuffledCentroids = [...centroids].sort(
  //   (a, b) => a.randNum - b.randNum,
  // );
  const nonDupCentroids = [...centroids].reduce(
    (
      nonDupBuf: (GeoFormat & {
        idx: number;
        numOfPointLessThanR: number;
        randNum: number;
      })[],
      cur: (GeoFormat & { idx: number; numOfPointLessThanR: number }) | null,
    ) => {
      if (!cur) return nonDupBuf;

      const isDup = nonDupBuf.find(
        /// 클러스터 중심간 거리가 특정값 미만이면 같은 클러스터로 간주한다.
        nd =>
          nd === null || degreeToMeter(nd.lat, nd.lng, cur.lat, cur.lng) < r,
      );

      if (isDup) return nonDupBuf;
      nonDupBuf.push({ ...cur, randNum: Math.random() });
      return nonDupBuf;
    },
    [],
  );

  return {
    r,
    maxPhase, /// 클러스터링 형성시 가장 많이 진행된 루프 수
    // wholeSpotLatLngAvg, /// 검색된 전체 요소의 평균 중심점
    nonDupCentroids: nonDupCentroids.sort((a, b) => a.randNum - b.randNum), /// 클러스터링 전체 결과중 (gCentroids) 충분히 가까운값은 하나의 클러스터링으로 간주하고 버린 결과. 즉 미중복 클러스터들이다.
    centHistoryByStage, /// 각 클러스터들이 형성된 차수별 궤적 정보 (개발용 확인 정보)
    centroids, /// 최종 전체 클러스터링 결과들
    ...(type === 'spot' && {
      spotsGeoLocation: items.map(v => {
        return {
          id: v.id ?? -1,
          name: v.gl_name ?? v.vj_title ?? '',
          lat: v.gl_lat ?? v.vj_latitude ?? -9999,
          lng: v.gl_lng ?? v.vj_longitude ?? -9999,
        };
      }),
    }),
    ...(type === 'food' && {
      foodsGeoLocation: items.map(v => {
        return {
          id: v.id ?? -1,
          name: v.gl_name ?? v.vj_title ?? '',
          lat: v.gl_lat ?? v.vj_latitude ?? -9999,
          lng: v.gl_lng ?? v.vj_longitude ?? -9999,
        };
      }),
    }),
  };
};

/**
 *  직전 방문했던곳으로부터(baseGeoLoc) 거리기준 오름차순 정렬 함수
 * */
export const nearestWithBaseLoc = (
  baseGeoLoc: GeoFormat,
): ((a: TourPlaceGeoLoc, b: TourPlaceGeoLoc) => number) => {
  return (a: TourPlaceGeoLoc, b: TourPlaceGeoLoc) => {
    const geoA = getLatLng(a);
    const geoB = getLatLng(b);
    const distWithA = getDistance(baseGeoLoc, geoA);
    const distWithB = getDistance(baseGeoLoc, geoB);
    return distWithA - distWithB;
  };
};

/**
 * 일정 생성 요청을 하는 makeSchedule 구현부 함수. (reqSchedule 역할의 변경 스펙)
 */

export const makeSchedule = async (
  param: MakeScheduleREQParam,
  ctx: ContextMakeSchedule,
): Promise<MakeScheduleRETParamPayload> => {
  const {
    isNow,
    companion,
    familyOpt,
    minFriend,
    maxFriend,
    period,
    travelType,
    destination,
    travelHard,
  } = param;

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

  const paramByAvgCalibLevel =
    gParamByTravelLevel[
      Math.floor((calibUserLevel.min + calibUserLevel.max) / 2)
    ];
  ctx.spotPerDay = 2 / paramByAvgCalibLevel.actMultiplier;
  ctx.mealPerDay = gMealPerDay;
  // const mealPerDay = gMealPerDay;
  // const numOfADaySchedule = spotPerDay + mealPerDay + 1;

  ctx.numOfWholeTravelSpot = Math.ceil(ctx.spotPerDay * Number(period)); /// 전체 방문해야할 목표 여행지 수

  const spots = await prisma.tourPlace.findMany({
    where: {
      ibTravelTag: {
        some: {
          AND: [
            { minDifficulty: { gte: calibUserLevel.min } },
            { maxDifficulty: { lte: calibUserLevel.max } },
          ],
        },
      },
      OR: [
        /// 제주 클리핑
        {
          AND: [
            { vj_latitude: { gte: 33.109684 } },
            { vj_latitude: { lt: 33.650946 } },
            { vj_longitude: { gte: 126.032175 } },
            { vj_longitude: { lt: 127.048411 } },
          ],
        },
        {
          AND: [
            { gl_lat: { gte: 33.109684 } },
            { gl_lat: { lt: 33.650946 } },
            { gl_lng: { gte: 126.032175 } },
            { gl_lng: { lt: 127.048411 } },
          ],
        },
      ],
      // OR: [ /// 서울 클리핑
      //   {
      //     AND: [
      //       { vj_latitude: { gte: 37.483403 } },
      //       { vj_latitude: { lt: 37.655385 } },
      //       { vj_longitude: { gte: 126.796251 } },
      //       { vj_longitude: { lt: 127.230211 } },
      //     ],
      //   },
      //   {
      //     AND: [
      //       { gl_lat: { gte: 37.483403 } },
      //       { gl_lat: { lt: 37.655385 } },
      //       { gl_lng: { gte: 126.796251 } },
      //       { gl_lng: { lt: 127.230211 } },
      //     ],
      //   },
      // ],
      status: 'IN_USE',
      tourPlaceType: { in: ['VISITJEJU_SPOT', 'GL_SPOT'] },
    },
    select: {
      id: true,
      gl_name: true,
      vj_title: true,
      ibTravelTag: {
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
      gl_user_ratings_total: true,
    },
    orderBy: [
      {
        gl_user_ratings_total: 'desc',
      },
      {
        gl_rating: 'desc',
      },
    ],
    // take: ctx.numOfWholeTravelSpot,
  });

  const foods = await prisma.tourPlace.findMany({
    where: {
      status: 'IN_USE',
      tourPlaceType: { in: ['VISITJEJU_RESTAURANT', 'GL_RESTAURANT'] },
      OR: [
        /// 제주 클리핑
        {
          AND: [
            { vj_latitude: { gte: 33.109684 } },
            { vj_latitude: { lt: 33.650946 } },
            { vj_longitude: { gte: 126.032175 } },
            { vj_longitude: { lt: 127.048411 } },
          ],
        },
        {
          AND: [
            { gl_lat: { gte: 33.109684 } },
            { gl_lat: { lt: 33.650946 } },
            { gl_lng: { gte: 126.032175 } },
            { gl_lng: { lt: 127.048411 } },
          ],
        },
      ],
      // OR: [ /// 서울 클리핑
      //   {
      //     AND: [
      //       { vj_latitude: { gte: 37.483403 } },
      //       { vj_latitude: { lt: 37.655385 } },
      //       { vj_longitude: { gte: 126.796251 } },
      //       { vj_longitude: { lt: 127.230211 } },
      //     ],
      //   },
      //   {
      //     AND: [
      //       { gl_lat: { gte: 37.483403 } },
      //       { gl_lat: { lt: 37.655385 } },
      //       { gl_lng: { gte: 126.796251 } },
      //       { gl_lng: { lt: 127.230211 } },
      //     ],
      //   },
      // ],
    },
    select: {
      id: true,
      gl_name: true,
      vj_title: true,
      ibTravelTag: {
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
    orderBy: [
      {
        gl_user_ratings_total: 'desc',
      },
      {
        gl_rating: 'desc',
      },
    ],
  });
  // const foods = [];

  if (spots.length < ctx.numOfWholeTravelSpot)
    throw new IBError({
      type: 'NOTEXISTDATA',
      message: `조건에 맞고 여행일수에 필요한만큼 충분한 수의 관광 spot이 없습니다.
        (필요 관광지 수: ${ctx.numOfWholeTravelSpot}, 검색된 관광지 수:${spots.length})`,
    });

  // if (foods.length < Number(period) * 2)
  //   throw new IBError({
  //     type: 'NOTEXISTDATA',
  //     message: '여행일수에 필요한만큼 충분한 수의 관광 restaurant이 없습니다.',
  //   });

  ctx.spots = [...spots];
  ctx.foods = foods && foods.length > 0 ? [...foods] : [];
  ctx.paramByAvgCalibLevel = paramByAvgCalibLevel;

  /// spots clustering part
  ctx.spotClusterRes = makeCluster(ctx, 'spot');
  ctx.foodClusterRes = makeCluster(ctx, 'food');

  const {
    childrenNumber,
    childrenAges,
    adultsNumber,
    roomNumber,
    startDate,
    endDate,
  } = getBKCHotelSrchOpts({ companion, familyOpt, maxFriend, period });

  /// hotel search part
  (() => {
    let validSpotCentroids = // validSpotCentroids: 적당히 많은 수의(spotPerDay * 2)  관광지 군집. validSpotCentroids 의 위치를 바탕으로 숙소를 검색한다.
      ctx.spotClusterRes?.nonDupCentroids
        // .sort((a, b) => b.numOfPointLessThanR - a.numOfPointLessThanR) /// 군집 범위가 포함하고 있는 spot수가 많은순으로 정렬
        .filter(v => v.numOfPointLessThanR > ctx.spotPerDay! * 2) ?? [];
    const validFoodCentroids = // validSpotCentroids: 적당히 많은 수의(3끼니 이상)  식당 군집.
      ctx.foodClusterRes?.nonDupCentroids
        // .sort((a, b) => b.numOfPointLessThanR - a.numOfPointLessThanR) /// 군집 범위가 포함하고 있는 spot수가 많은순으로 정렬
        .filter(v => v.numOfPointLessThanR > 3) ?? [];

    if (validSpotCentroids.length === 0) {
      throw new IBError({
        type: 'NOTEXISTDATA',
        message: '충분한 수의 여행지 클러스터가 형성되지 못하였습니다.',
      });
    }

    // if (validFoodCentroids.length === 0) {
    //   throw new IBError({
    //     type: 'NOTEXISTDATA',
    //     message: '충분한 수의 식당 클러스터가 형성되지 못하였습니다.',
    //   });
    // }

    ctx.hotelTransition = validSpotCentroids.length - 1;
    ctx.travelNights = Number(period) - 1;
    if (ctx.travelNights < ctx.hotelTransition) {
      validSpotCentroids = validSpotCentroids.splice(0, ctx.travelNights);
      // validFoodCentroids = validFoodCentroids.splice(0, ctx.travelNights);
    }

    ctx.travelDays = Number(period);

    const validCentNSpots = (() => {
      /// 각 validSpotCentroids 에 범위에 속하는 spot들을 모아 clusteredSpots에 담는다.
      const ret = validSpotCentroids.map(cent => {
        const rangedFromSpot = (curSpot: TourPlaceGeoLoc) => {
          const spotLatLng = getLatLng(curSpot);
          if (!spotLatLng) return null;
          const dist = degreeToMeter(
            spotLatLng.lat,
            spotLatLng.lng,
            cent.lat,
            cent.lng,
          );
          if (dist <= ctx.spotClusterRes!.r)
            return {
              distFromSpotCent: dist,
              inSpotCentroid: cent,
              ...curSpot,
            };
          return null;
        };

        // const clusteredHotel = [...ctx.hotels!][centIdx];
        const clusteredSpot = [...ctx.spots!]
          .map(rangedFromSpot)
          .filter(v => v) as TourPlaceGeoLoc[]; /// ctx.spots는 위의 코드에서 여행일에 필요한 수만큼 확보되지 않으면 에러를 뱉도록 예외처리하여 undefined일수 없다.
        // const clusteredFood = [...ctx.foods!].filter(rangedCond);

        /// 현재 여행지 클러스터와 가장 가까운 식당 클러스터 구하기
        const closestFoodCluster = (() => {
          const foodCluster = validFoodCentroids.map(fCent => {
            /// 여행지 클러스터들을 중심으로한 레스토랑 선정하기 절차
            /// 1. food cluster와 spot cluster 중심들간의 거리를 구함
            const foodLatLng = { lat: fCent.lat, lng: fCent.lng };
            const distWithSpotCent = degreeToMeter(
              foodLatLng.lat,
              foodLatLng.lng,
              cent.lat,
              cent.lng,
            );
            return {
              ...fCent,
              distWithSpotCent,
            };
          });
          const closest =
            foodCluster.length === 0
              ? {
                  distWithSpotCent: -99999,
                  lat: -999,
                  lng: -999,
                  idx: -1,
                  numOfPointLessThanR: 0,
                  randNum: -1,
                }
              : foodCluster.sort((a, b) => {
                  /// 2. 식당 클러스터와 여행지 클러스터간 중심거리가 가까운순으로 정렬
                  return a.distWithSpotCent - b.distWithSpotCent;
                })[0];
          return closest;
        })();

        const rangedFromFood = (curFood: TourPlaceGeoLoc) => {
          const spotLatLng = getLatLng(curFood);
          if (!spotLatLng) return null;
          const dist = degreeToMeter(
            spotLatLng.lat,
            spotLatLng.lng,
            closestFoodCluster.lat,
            closestFoodCluster.lng,
          );
          if (dist <= ctx.spotClusterRes!.r)
            return {
              distFromSpotCent: dist,
              inFoodCentroid: closestFoodCluster,
              ...curFood,
            };
          return null;
        };

        /// 가장 가까운 식당 클러스터 안에 속하는 식당들 리스트 구하기
        const clusteredFood = [...ctx.foods!]
          .map(rangedFromFood)
          .filter(v => v) as TourPlaceGeoLoc[];

        return {
          centroidNHotel: {
            // transitionNo: clusteredHotel.transitionNo,
            // stayPeriod: clusteredHotel.stayPeriod,
            // checkin: clusteredHotel.checkin,
            // checkout: clusteredHotel.checkout,
            // hotels: clusteredHotel.hotels,
            cent,
          },
          nearbySpots: clusteredSpot,
          nearbyFoods: clusteredFood,
        } as IValidCentResources | null;
      });
      return ret;
    })();

    const numOfValidSpot = validCentNSpots.reduce((acc, cur) => {
      return acc + cur!.nearbySpots.length;
    }, 0);

    // const hotelSrchOpts = validSpotCentroids.map(centGeo => {
    //   return {
    //     orderBy: 'review_score',
    //     adultsNumber,
    //     roomNumber,
    //     checkinDate: startDate,
    //     checkoutDate: endDate,
    //     filterByCurrency: 'KRW',
    //     latitude: centGeo.lat.toString(),
    //     longitude: centGeo.lng.toString(),
    //     pageNumber: 0,
    //     includeAdjacency: false,
    //     childrenAges,
    //     childrenNumber,
    //     categoriesFilterIds: ['property_type::204'],
    //     // randNum: centGeo.randNum, /// !! makeCluster단계에서 생성된 클러스터들을 랜덤하게 섞기 위해 참조했던 랜덤 변수값. 아래에서 수행될 각 클러스터별 numOfVisitSpotInCluster와 stayPeriod 결정중에 numOfSpotInCluster / stayPeriod 반올림과정에서 numOfNrbySpot 가 많은 순으로 수행되지 않으면 오차가 뒤로 갈수록 점점 커져 restSpot이 부족해지는 현상이 나타나는데 이를 방지하기 위해 일시적으로 다시 보유한 스팟순으로 정렬했다가 다시 랜덤하게 섞어주기 위해 쓰인다.
    //   } as BKCSrchByCoordReqOpt;
    // });

    // const hotelPromises = (() => {
    //   let prevCheckout = '';
    //   let transitionNo = -1;
    //   let restSpot = ctx.numOfWholeTravelSpot;
    //   const clusters = hotelSrchOpts.map((hotelSrchOpt, clusterNo) => {
    //     const numOfNrbySpot = validCentNSpots[clusterNo]!.nearbySpots.length; /// 특정 군집내에 속한 관광지의 수
    //     const ratio = numOfNrbySpot / numOfValidSpot; /// 해당 클러스터가 보유한 여행지 비율 = 생성된 모든 군집중 선택된 군집 전체의 방문 가능한 여행지(numOfValidSpoo) 대비 해당 군집의 여행지 수가 차지하는 비율
    //     return {
    //       hotelSrchOpt,
    //       ratio,
    //       numOfNrbySpot,
    //     };
    //   });
    //   // .sort((a, b) => b.numOfNrbySpot - a.numOfNrbySpot);

    //   let restSumOfRatio = clusters.reduce((acc, cur) => {
    //     return acc + cur.ratio;
    //   }, 0); /// 처리된 클러스터의 비율을 제한 클러스터들이 차지한 비율의 총합 <= 초기값은 전체 클러스터 비율의 총합이므로 100%다.

    //   const clusters2 = clusters.map(v => {
    //     const { ratio, numOfNrbySpot, hotelSrchOpt } = v;

    //     const numOfVisitSpotInCluster = Math.round(
    //       (restSpot * ratio) / restSumOfRatio,
    //     ); /// 해당 클러스터에서 방문해야할 여행지 수
    //     restSumOfRatio -= ratio;
    //     restSpot -= numOfVisitSpotInCluster;
    //     return {
    //       hotelSrchOpt,
    //       numOfNrbySpot,
    //       ratio,
    //       numOfVisitSpotInCluster,
    //     };
    //   });

    //   let restSumOfVisitSpot = /// (초기)남은 방문해야할 여행지 수 = 클러스터별로 방문해야할 여행지의 총합 = 전체기간중 방문해야할 목표 여행지 총수
    //     clusters2.reduce((acc, cur) => {
    //       return acc + cur.numOfVisitSpotInCluster;
    //     }, 0);

    //   let restPeriod = Number(period); /// 전체 여행일정중 앞 클러스터에서 사용한 일정을 제한 나머지 일정

    //   // clusters2.sort((a, b) => a.hotelSrchOpt.randNum - b.hotelSrchOpt.randNum); /// 아래에서 수행될 각 클러스터별 numOfVisitSpotInCluster와 stayPeriod 결정중에 numOfSpotInCluster / stayPeriod 반올림과정에서 numOfNrbySpot 가 많은 순으로 수행되지 않으면 오차가 뒤로 갈수록 점점 커져 restSpot이 부족해지는 현상이 나타나는데 이를 방지하기 위해 일시적으로 다시 보유한 스팟순으로 정렬했다가 다시 랜덤하게 섞어준다.

    //   return clusters2.map(async (v, i) => {
    //     const { ratio, numOfVisitSpotInCluster, hotelSrchOpt } = v;
    //     const stayPeriod = Math.round(
    //       (restPeriod * numOfVisitSpotInCluster) / restSumOfVisitSpot,
    //     );
    //     restSumOfVisitSpot -= numOfVisitSpotInCluster;
    //     restPeriod -= stayPeriod;

    //     if (stayPeriod === 0 || isNaN(stayPeriod)) {
    //       validCentNSpots[i] = null;
    //       return null;
    //     }

    //     const curCheckin = isEmpty(prevCheckout)
    //       ? moment(hotelSrchOpt.checkinDate).toISOString()
    //       : prevCheckout;

    //     let curCheckout = moment(
    //       moment(curCheckin).add(stayPeriod, 'd'),
    //     ).toISOString();
    //     prevCheckout = curCheckout;

    //     if (
    //       moment(curCheckout).diff(moment(hotelSrchOpt.checkoutDate), 'd') > 0
    //     )
    //       curCheckout = hotelSrchOpt.checkoutDate;

    //     // const curHotels = await getHotelDataFromBKC({
    //     //   ...hotelSrchOpt,
    //     //   checkinDate: curCheckin,
    //     //   checkoutDate: curCheckout,
    //     //   store: true,
    //     // });

    //     await new Promise(resolve => {
    //       resolve(true);
    //     });
    //     transitionNo += 1;

    //     return {
    //       transitionNo,
    //       stayPeriod: moment(curCheckout).diff(curCheckin, 'd'),
    //       checkin: curCheckin,
    //       checkout: curCheckout,
    //       numOfVisitSpotInCluster,
    //       ratio,
    //       // hotels: curHotels,
    //     } as IHotelInMakeSchedule;
    //   });
    // })();

    const hWithoutData = (() => {
      let prevCheckout = '';
      let transitionNo = -1;
      let restSpot = ctx.numOfWholeTravelSpot;

      const hotelSrchOpts = validSpotCentroids.map(centGeo => {
        return {
          orderBy: 'distance',
          adultsNumber,
          roomNumber,
          checkinDate: startDate,
          checkoutDate: endDate,
          filterByCurrency: 'KRW',
          latitude: centGeo.lat.toString(),
          longitude: centGeo.lng.toString(),
          pageNumber: 0,
          includeAdjacency: false,
          childrenAges,
          childrenNumber,
          categoriesFilterIds: ['property_type::204'],
          // randNum: centGeo.randNum, /// !! makeCluster단계에서 생성된 클러스터들을 랜덤하게 섞기 위해 참조했던 랜덤 변수값. 아래에서 수행될 각 클러스터별 numOfVisitSpotInCluster와 stayPeriod 결정중에 numOfSpotInCluster / stayPeriod 반올림과정에서 numOfNrbySpot 가 많은 순으로 수행되지 않으면 오차가 뒤로 갈수록 점점 커져 restSpot이 부족해지는 현상이 나타나는데 이를 방지하기 위해 일시적으로 다시 보유한 스팟순으로 정렬했다가 다시 랜덤하게 섞어주기 위해 쓰인다.
        } as BKCSrchByCoordReqOpt;
      });

      const clusters = validCentNSpots.map(centNSpot => {
        const numOfNrbySpot = centNSpot!.nearbySpots.length; /// 특정 군집내에 속한 관광지의 수
        const ratio = numOfNrbySpot / numOfValidSpot; /// 해당 클러스터가 보유한 여행지 비율 = 생성된 모든 군집중 선택된 군집 전체의 방문 가능한 여행지(numOfValidSpoo) 대비 해당 군집의 여행지 수가 차지하는 비율
        return {
          ratio,
          numOfNrbySpot,
        };
      });

      let restSumOfRatio = clusters.reduce((acc, cur) => {
        return acc + cur.ratio;
      }, 0); /// 처리된 클러스터의 비율을 제한 클러스터들이 차지한 비율의 총합 <= 초기값은 전체 클러스터 비율의 총합이므로 100%다.

      const clusters2 = clusters.map(v => {
        const { ratio, numOfNrbySpot } = v;

        const numOfVisitSpotInCluster = Math.round(
          (restSpot * ratio) / restSumOfRatio,
        ); /// 해당 클러스터에서 방문해야할 여행지 수
        restSumOfRatio -= ratio;
        restSpot -= numOfVisitSpotInCluster;
        return {
          numOfNrbySpot,
          ratio,
          numOfVisitSpotInCluster,
        };
      });

      let restSumOfVisitSpot = /// (초기)남은 방문해야할 여행지 수 = 클러스터별로 방문해야할 여행지의 총합 = 전체기간중 방문해야할 목표 여행지 총수
        clusters2.reduce((acc, cur) => {
          return acc + cur.numOfVisitSpotInCluster;
        }, 0);

      let restPeriod = Number(period); /// 전체 여행일정중 앞 클러스터에서 사용한 일정을 제한 나머지 일정

      // clusters2.sort((a, b) => a.hotelSrchOpt.randNum - b.hotelSrchOpt.randNum); /// 아래에서 수행될 각 클러스터별 numOfVisitSpotInCluster와 stayPeriod 결정중에 numOfSpotInCluster / stayPeriod 반올림과정에서 numOfNrbySpot 가 많은 순으로 수행되지 않으면 오차가 뒤로 갈수록 점점 커져 restSpot이 부족해지는 현상이 나타나는데 이를 방지하기 위해 일시적으로 다시 보유한 스팟순으로 정렬했다가 다시 랜덤하게 섞어준다.

      return clusters2
        .map((v, i) => {
          const { ratio, numOfVisitSpotInCluster } = v;
          const stayPeriod = Math.round(
            (restPeriod * numOfVisitSpotInCluster) / restSumOfVisitSpot,
          );
          restSumOfVisitSpot -= numOfVisitSpotInCluster;
          restPeriod -= stayPeriod;

          if (stayPeriod === 0 || isNaN(stayPeriod)) {
            validCentNSpots[i] = null;
            return null;
          }

          const curCheckin = isEmpty(prevCheckout)
            ? moment(startDate).toISOString()
            : prevCheckout;

          let curCheckout = moment(
            moment(curCheckin).add(stayPeriod, 'd'),
          ).toISOString();
          prevCheckout = curCheckout;

          if (moment(curCheckout).diff(moment(endDate), 'd') > 0)
            curCheckout = endDate;

          transitionNo += 1;

          return {
            transitionNo,
            stayPeriod: moment(curCheckout).diff(curCheckin, 'd'),
            checkin: curCheckin,
            checkout: curCheckout,
            numOfVisitSpotInCluster,
            ratio,
            hotelSrchOpt: hotelSrchOpts[i],
            // hotels: curHotels,
          } as IHotelInMakeSchedule;
        })
        .filter((v): v is IHotelInMakeSchedule => {
          return v !== null;
        });
    })();

    // const queryPromises = new Promise<GetHotelDataFromBKCRETParamPayload[]>(
    //   resolve => {
    //     const hotelResult = Array<GetHotelDataFromBKCRETParamPayload>();

    //     HotelQueryEventEmitter.on(
    //       `doQuery`,
    //       // eslint-disable-next-line @typescript-eslint/no-misused-promises
    //       async (hQParam: {
    //         index: number;
    //         hQMetaData: IHotelInMakeSchedule[];
    //         prevStartTime: number;
    //       }) => {
    //         const { index, hQMetaData, prevStartTime } = hQParam;

    //         hotelResult.push(
    //           await getHotelDataFromBKC({
    //             ...hQMetaData[index].hotelSrchOpt,
    //             checkinDate: hQMetaData[index].checkin,
    //             checkoutDate: hQMetaData[index].checkout,
    //             store: true,
    //           }),
    //         );

    //         const startTime = moment(prevStartTime);
    //         const endTime = new Date();
    //         console.log(
    //           `[${index}]: ${moment(endTime).diff(startTime, 'millisecond')}ms`,
    //         );

    //         if (index + 1 < hQMetaData.length) {
    //           const timeId = setTimeout(() => {
    //             HotelQueryEventEmitter.emit('doQuery', {
    //               index: index + 1,
    //               hQMetaData,
    //               prevStartTime: endTime,
    //             });
    //             clearTimeout(timeId);
    //           }, 0);
    //         } else {
    //           resolve(hotelResult);
    //         }
    //       },
    //     );

    //     HotelQueryEventEmitter.emit('doQuery', {
    //       index: 0,
    //       hQMetaData: hWithoutData,
    //       prevStartTime: new Date(),
    //     });
    //   },
    // );

    let tempValidCents = /// 클러스터간 거리를 측정하고 이를 바탕으로 클러스터 방문 순서를 결정하기 위해 클러스터별 메타데이터(stayPeriod, numOfVisitSpotInClusteer, ...)를 클러스터에 넣고
      /// 위에서 null 표시된 클러스터는 제외하고 (클러스터내 포함된 여행지가 너무 적어 (=해당 클러스터에서 머무를 여행일정이 너무 적어))
      /// 남은 클러스터간 방문 순서를 결정하도록 한다.
      validCentNSpots
        .filter((v): v is IValidCentResources => v !== null)
        .map((v, idx) => {
          const clusteredHotel = [...hWithoutData][idx];

          if (isUndefined(clusteredHotel)) return null;
          return {
            ...v,
            centroidNHotel: {
              ...v.centroidNHotel,
              transitionNo: clusteredHotel.transitionNo,
              stayPeriod: clusteredHotel.stayPeriod,
              checkin: clusteredHotel.checkin,
              checkout: clusteredHotel.checkout,
              numOfVisitSpotInCluster: clusteredHotel.numOfVisitSpotInCluster,
              ratio: clusteredHotel.ratio,
              // hotels: clusteredHotel.hotels, //// 이 시점에는 호텔 쿼리가 다끝나지 않아 아래에서 호텔 쿼리 데이터를 따로 비동기 처리하여 합친다.
            },
          };
        })
        .filter(v => {
          return v !== null;
        }) as IValidCentResources[];

    tempValidCents = /// 클러스터간 방문 순서 선정 알고리즘..
      (() => {
        let distMap = /// 클러스터간 거리맵
          tempValidCents
            .map(v1 => {
              const cent1 = v1.centroidNHotel.cent!;
              return tempValidCents.map(v2 => {
                const cent2 = v2.centroidNHotel.cent!;
                let dist = degreeToMeter(
                  cent1.lat,
                  cent1.lng,
                  cent2.lat,
                  cent2.lng,
                );
                dist = dist === 0 ? Infinity : dist;
                return {
                  startCentIdx: cent1.idx,
                  endCentIdx: cent2.idx,
                  dist,
                  visited: false,
                };
              });
            })
            .flat();

        const rand = Math.floor(8 * Math.random()) % 3;
        const firstCent = tempValidCents.sort(
          (a, b) =>
            b.centroidNHotel.cent!.numOfPointLessThanR -
            a.centroidNHotel.cent!.numOfPointLessThanR,
        )[rand];

        type DistBetweenClusters = {
          startCentIdx: number;
          endCentIdx: number;
          dist: number;
          visited: boolean;
        };
        let presentCent: DistBetweenClusters = {
          startCentIdx: 0,
          endCentIdx: firstCent.centroidNHotel.cent!.idx,
          dist: 0,
          visited: true,
        };
        let nextCent: DistBetweenClusters = { ...presentCent };
        const ret = Array.from({ length: tempValidCents.length }).reduce(
          (acc: IValidCentResources[], _, i) => {
            const newOrderValidCent = tempValidCents.find(
              v => v.centroidNHotel.cent!.idx === presentCent.endCentIdx,
            ) as IValidCentResources;

            acc.push({
              ...newOrderValidCent,
              centroidNHotel: {
                ...newOrderValidCent.centroidNHotel,
                transitionNo: i, /// 호텔 검색시에 생성했던 트랜지션 넘버가 순서가 바뀐다.
              },
            });

            /// 거리맵중에서 현재 클러스터에서 다른 클러스터들간의 거리맵을 뽑는다.
            const distMapByStart = distMap.filter(
              v =>
                v.visited === false &&
                v.startCentIdx === presentCent.endCentIdx,
            );
            [nextCent] = distMapByStart.sort((a, b) => a.dist - b.dist); /// 이번 스테이지의 클러스터인 presentCent 의 idx로부터 가장 가까운 클러스터를 다음 클러스터로 정한다.

            distMap = /// 방문해서 사용한 거리맵 삭제. A=>B로 움직였는데 B클러스터 입장에서도 가장 가까운거리가 A라면 A<=>B 만 무한 반복할것이다
              distMap.map(v => {
                if (
                  v.startCentIdx === nextCent.startCentIdx ||
                  v.endCentIdx === nextCent.startCentIdx
                )
                  return {
                    ...v,
                    visited: true,
                  };
                return v;
              });

            presentCent = nextCent;
            return acc;
          },
          [],
        ) as IValidCentResources[];
        return ret;
      })();

    // const hotelData = await queryPromises;

    ctx.spotClusterRes!.validCentNSpots = tempValidCents.map(v => {
      /// 호텔 검색결과와 클러스터 방문 순서를 정렬한 결과의 검색 메타데이터를 합쳐서 ctx에 저장한다.

      return {
        ...v,
        centroidNHotel: {
          ...v.centroidNHotel,
          // hotels: hotelData[i],
        },
      };
    });

    ctx.hotels = hWithoutData.map(v => {
      return {
        ...v,
        // hotels: hotelData[i],
      };
    });
  })(); /// end of hotel srch part

  /// 여행일수에 따른 visitSchedule 배열 생성
  const visitSchedules = (() => {
    /// 직전 위치와 가까운 순서대로 정렬

    // let visitMeasure = 0; /// spotPerDay를 일마다 더하여 정수부만큼 그날 방문 수로 정하는데 이때 참조하는 누적 측정값
    let clusterNo = 0; /// 스케쥴 생성루프에서 참조해야할 군집번호
    let acc = ctx.spotClusterRes!.validCentNSpots[0].centroidNHotel.stayPeriod!; /// 일자별 루프에서 해당 일자에서 참조해야할 군집 번호를 파악하기 위해 현재까지 거쳐온 군집배열마다 머무를 일수를 누적시켜 놓은 값. dayNo와 비교하여 이 값보다 크면 다음 군집 번호로 넘어가고 이 값에 더하여 누적한 값으로 업데이트한다.
    let curRestSpot =
      ctx.spotClusterRes!.validCentNSpots[0].centroidNHotel
        .numOfVisitSpotInCluster!;
    let curRestDay =
      ctx.spotClusterRes!.validCentNSpots[0].centroidNHotel.stayPeriod!;
    return Array(ctx.travelDays)
      .fill(null)
      .map((day, dayNo) => {
        let mealOrder: MealOrder;
        let nextMealOrder: number;
        let prevGeoLoc: GeoFormat; /// 직전에 방문했던 곳 위경도값

        if (dayNo + 1 > acc) {
          /// dayNo와 비교하여 acc보다 크면 다음 군집 번호로 넘어가고 이 값에 더하여 누적한 값으로 업데이트한다.
          /// acc: 일자별 루프에서 해당 일자에서 참조해야할 군집 번호를 파악하기 위해 현재까지 거쳐온 군집배열마다 머무를 일수를 누적시켜 놓은 값
          clusterNo += 1;
          const { stayPeriod, numOfVisitSpotInCluster } =
            ctx.spotClusterRes!.validCentNSpots![clusterNo].centroidNHotel;
          acc += stayPeriod!;
          curRestSpot = numOfVisitSpotInCluster!;
          curRestDay = stayPeriod!;
        }

        /// spotPerDay가 소수점일 경우 어떤날은 n개 방문
        /// 또 다른 어떤 날은 n+a 개의 여행지를 방문해야한다.
        /// 이를 계산한것이 numOfTodaySpot
        let numOfTodaySpot = Math.round(curRestSpot / curRestDay);
        if (numOfTodaySpot >= 1) curRestSpot -= numOfTodaySpot;
        curRestDay -= 1;

        const tmpArr = Array(ctx.mealPerDay! + 1 + numOfTodaySpot).fill(null);

        return {
          planType: 'MIN' as PlanType,
          dayNo,
          titleList: tmpArr
            .map((v, orderNo) => {
              const curResources =
                ctx.spotClusterRes!.validCentNSpots![clusterNo];

              const { nearbySpots, nearbyFoods } = curResources;

              let ret: Partial<IVisitOneSchedule> = {
                orderNo,
                dayNo,
                transitionNo: curResources.centroidNHotel.transitionNo,
                stayPeriod: curResources.centroidNHotel.stayPeriod,
                checkin: curResources.centroidNHotel.checkin,
                checkout: curResources.centroidNHotel.checkout,
              };

              /// 하루일정중 첫번째는 언제나 숙소이다.
              if (
                orderNo === 0
                // || orderNo === tmpArr.length - 1
              ) {
                const centNHotel = curResources.centroidNHotel;
                ret = {
                  ...ret,
                  cent: centNHotel.cent,
                  placeType: 'HOTEL',
                  data: centNHotel.hotels?.hotelSearchResult, /// 호텔은 정해지지 않았으므로 검색한 중심점을 데이터로 넣는다.
                };

                prevGeoLoc = {
                  lat: centNHotel.cent!.lat,
                  lng: centNHotel.cent!.lng,
                };

                mealOrder = new MealOrder();
                nextMealOrder = mealOrder.getNextMealOrder();

                return ret;
              }

              /// 레스토랑
              if (nextMealOrder === orderNo) {
                nearbyFoods.sort(nearestWithBaseLoc(prevGeoLoc));
                let data = nearbyFoods.shift();
                if (isUndefined(data)) {
                  if (
                    isUndefined(
                      ctx.spotClusterRes!.validCentNSpots![clusterNo + 1],
                    ) ||
                    isEmpty(
                      ctx.spotClusterRes!.validCentNSpots![clusterNo + 1]
                        .nearbyFoods,
                    )
                  )
                    return null;

                  clusterNo += 1;
                  /// 만약 해당 클러스터 내에서 방문할 여행지가 더이상 없을 경우에는
                  /// 다음날 이동해야 할 클러스터의 여행지에서 하나를 빌려온다.
                  data = ctx
                    .spotClusterRes!.validCentNSpots![
                      clusterNo
                    ].nearbyFoods.sort(nearestWithBaseLoc(prevGeoLoc))
                    .shift();
                }

                ret = {
                  ...ret,
                  placeType: 'RESTAURANT',
                  data: data ? [data] : ([] as TourPlaceGeoLoc[]),
                };
                prevGeoLoc = data ? getLatLng(data) : prevGeoLoc;
                nextMealOrder = mealOrder.getNextMealOrder();
                return ret;
              }

              /// 스팟(여행지)
              if (numOfTodaySpot > 0) {
                nearbySpots.sort(nearestWithBaseLoc(prevGeoLoc));
                let data = nearbySpots.shift();

                if (isUndefined(data)) {
                  if (
                    isUndefined(
                      ctx.spotClusterRes!.validCentNSpots![clusterNo + 1],
                    )
                  )
                    return null;
                  clusterNo += 1;
                  /// 만약 해당 클러스터 내에서 방문할 여행지가 더이상 없을 경우에는
                  /// 다음날 이동해야 할 클러스터의 여행지에서 하나를 빌려온다.
                  data = ctx
                    .spotClusterRes!.validCentNSpots![
                      clusterNo
                    ].nearbySpots.sort(nearestWithBaseLoc(prevGeoLoc))
                    .shift();
                }

                ret = {
                  ...ret,
                  placeType: 'SPOT',
                  data: data ? [data] : ([] as TourPlaceGeoLoc[]),
                };
                prevGeoLoc = getLatLng(data!);
                numOfTodaySpot -= 1;
                return ret;
              }
              return null;
            })
            .filter((v): v is Partial<IVisitOneSchedule> => v !== null),
        };
      });
  })();
  ctx.visitSchedules = visitSchedules;

  /// QueryParams, tourPlace, visitSchedule DB 생성
  const queryParams = await prisma.queryParams.create({
    data: {
      ingNow: isNow,
      companion,
      familyOpt: familyOpt.toString(),
      minFriend: Number(minFriend),
      maxFriend: Number(maxFriend),
      travelType: travelType.toString(),
      period: Number(period),
      adult: Number(adultsNumber),
      travelHard: Number(travelHard),
      destination,
      tourPlace: {
        connect: [
          // ...(() => {
          //   const result = ctx
          //     .hotels!.map(c => {
          //       const hotelIds = c.hotels.hotelSearchResult
          //         .map(h => {
          //           if (h.id)
          //             return {
          //               id: h.id,
          //             };
          //           return undefined;
          //         })
          //         .filter((x): x is { id: number } => x !== undefined);
          //       return hotelIds;
          //     })
          //     .flat();
          //   return result;
          // })(),
          ...ctx.foods.map(v => {
            return { id: v.id };
          }),
          ...ctx.spots.map(v => {
            return { id: v.id };
          }),
        ],
      },
      userTokenId: ctx.userTokenId,
      visitSchedule: {
        createMany: {
          data: flattenDeep(
            visitSchedules.map(v => {
              return v.titleList.map(t => {
                const tmp =
                  !t.data || isEmpty(t.data) ? undefined : t.data[0].id;
                const ret = {
                  dayNo: v.dayNo,
                  orderNo: t.orderNo!,
                  planType: v.planType,
                  placeType: t.placeType!,
                  transitionNo: t.transitionNo,
                  stayPeriod: t.stayPeriod,
                  checkin: t.checkin,
                  checkout: t.checkout,
                  tourPlaceId: tmp,
                  // queryParamsId
                };

                return ret;
              });
            }),
          ),
        },
      },
      metaScheduleInfo: {
        create: {
          totalHotelSearchCount: ctx.hotels[0].hotels?.hotelSearchResult.length,
          totalRestaurantSearchCount: ctx.foods.length,
          totalSpotSearchCount: ctx.spots.length,
          spotPerDay: ctx.spotPerDay,
          mealPerDay: ctx.mealPerDay,
          mealSchedule: new MealOrder().mealOrder.toString(),
          travelNights: ctx.travelNights,
          travelDays: ctx.travelDays,
          hotelTransition: ctx.hotelTransition,
          transitionTerm: ctx
            .spotClusterRes!.validCentNSpots.map(
              v => v.centroidNHotel.stayPeriod!,
            )
            .toString(),
        },
      },
      scheduleCluster: {
        create: ctx.spotClusterRes?.validCentNSpots.map(v => {
          return {
            lat: v.centroidNHotel.cent?.lat!,
            lng: v.centroidNHotel.cent?.lng!,
            transitionNo: v.centroidNHotel.transitionNo!,
            stayPeriod: v.centroidNHotel.stayPeriod!,
            checkin: v.centroidNHotel.checkin!,
            checkout: v.centroidNHotel.checkout!,
            numOfVisitSpotInCluster: v.centroidNHotel.numOfVisitSpotInCluster!,
            ratio: v.centroidNHotel.ratio!,
          };
        }),
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
    queryParamsId: queryParams.id,
    spotPerDay: ctx.spotPerDay,
    calibUserLevel,
    spotClusterRes: ctx.spotClusterRes,
    foodClusterRes: ctx.foodClusterRes,
    // validCentNSpots: ctx.spotClusterRes!.validCentNSpots,
    // hotels: ctx.hotels,
    // spots: ctx.spots,
    // foods: ctx.foods,
    visitSchedules: (() => {
      let cnt = 0;
      return visitSchedules.map(v => {
        const retDayArr = {
          ...v,
          titleList: v.titleList.map(t => {
            return {
              visitScheduleId: (() => {
                const visitScheduleId = queryParams.visitSchedule.at(cnt)?.id;
                if (visitScheduleId) cnt += 1;
                return visitScheduleId;
              })(),
              title: (() => {
                if (
                  (t.placeType!.includes('RESTAURANT') ||
                    t.placeType!.includes('SPOT')) &&
                  t.data &&
                  t.data.length > 0
                ) {
                  if (t.data[0].gl_name) return t.data[0].gl_name;
                  if (t.data[0].vj_title) return t.data[0].vj_title;
                }
                // if (t.placeType!.includes('HOTEL')) {
                //   return ctx
                //     .hotels!.map(h => {
                //       return h.hotels.hotelSearchResult.map(
                //         v2 => v2.bkc_hotel_name!,
                //       );
                //     })
                //     .toString();
                // }
                return '';
              })(),
              ...t,
            };
          }),
        };
        return retDayArr;
      });
    })(),
    queryParams,
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

  const retValue = queryParams.visitSchedule.reduce(
    visitScheduleToDayScheduleType,
    [] as DayScheduleType[],
  );

  return {
    ...omit(queryParams, 'visitSchedule'),
    plan: retValue,
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
    // skip: Number(skip),
    // take: Number(take),
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
        queryParamsId: q.id.toString(),
      };
    })
    .filter(v => v)
    .filter(v => v)
    .splice(Number(skip), Number(take)) as GetScheduleListRETParamPayload[];

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
            googlePlace.gl_photos.length > 0 &&
            googlePlace.gl_photos[0].photo_reference
              ? googlePlace.gl_photos[0].photo_reference
              : 'none',
          spotName: googlePlace.gl_name ?? 'none',
          spotAddr:
            googlePlace.gl_vicinity ??
            googlePlace.gl_formatted_address ??
            'none',
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

      if (vType.includes('VISITJEJU_')) {
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

/**
 * google place/detail api 호출 후 결과값을 리턴하는 함수
 */
export const getPlaceDetail = async (params: {
  placeId: string;
}): Promise<GglPlaceDetailType> => {
  try {
    const { placeId } = params;
    const queryUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&key=${
      process.env.GCP_MAPS_APIKEY as string
    }`;
    const rawResponse = await axios.get(encodeURI(queryUrl));
    const fetchedData = rawResponse.data as GetPlaceDetailRawData;
    return fetchedData.result;
  } catch (err) {
    throw new IBError({
      type: 'EXTERNALAPI',
      message: `google place detail api 요청중 문제가 발생했습니다.`,
    });
  }
};

/**
 * google 의 priceLevel 숫자 코드를 읽을 수 있는 문자로 변환하는 함수
 */
export const transPriceLevel = (
  data: unknown,
): keyof typeof GooglePriceLevel | null => {
  const priceLevel = (data as { price_level?: number }).price_level;
  if (priceLevel)
    return GooglePriceLevel[priceLevel] as keyof typeof GooglePriceLevel;
  return null;
};

/**
 * 일정중 지정한 하나의 장소에 대한 상세 조회 요청 api
 */
export const getDetailSchedule = async (
  param: GetDetailScheduleREQParam,
  ctx: IBContext,
): Promise<GetDetailScheduleRETParamPayload> => {
  const { visitScheduleId } = param;
  const { userTokenId } = ctx;

  const visitSchedule = await prisma.visitSchedule.findUnique({
    where: {
      id: Number(visitScheduleId),
    },
    include: {
      tourPlace: {
        include: {
          gl_photos: true,
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
      message: 'visitScheduleId에 대응하는 일정 데이터가 존재하지 않습니다.',
    });
  }

  if (visitSchedule.queryParams?.userTokenId !== userTokenId) {
    throw new IBError({
      type: 'NOTEXISTDATA',
      message: '다른 유저의 visitSchedule 데이터입니다.',
    });
  }

  const retValue =
    await (async (): Promise<GetDetailScheduleRETParamPayload | null> => {
      if (!visitSchedule.tourPlace)
        throw new IBError({
          type: 'INVALIDSTATUS',
          message: '저장된 Data의 논리적 결함이 있습니다.',
        });
      const tourPlaceType = visitSchedule.tourPlace?.tourPlaceType;
      if (tourPlaceType.toUpperCase().includes('BKC_HOTEL')) {
        const { tourPlace: hotel } = visitSchedule;
        const hotelPhotos = await (async () => {
          const options = {
            method: 'GET' as Method,
            url: 'https://booking-com.p.rapidapi.com/v1/hotels/photos',
            params: { locale: 'ko', hotel_id: hotel?.bkc_hotel_id },
            headers: {
              'X-RapidAPI-Key': `${process.env.RAPID_API_KEY as string}`,
              'X-RapidAPI-Host': 'booking-com.p.rapidapi.com',
            },
          };
          const rawResponse = await axios.request(options);
          const hPhotos = rawResponse.data as {
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
          return hPhotos;
        })();

        return {
          id: visitSchedule.id.toString(),
          dayCount: visitSchedule.dayNo,
          orderCount: visitSchedule.orderNo,
          planType: visitSchedule.planType,
          spotType: tourPlaceType,
          previewImg: hotel.bkc_main_photo_url ?? 'none',
          spotName: hotel.bkc_hotel_name ?? 'none',
          roomType: hotel.bkc_unit_configuration_label,
          spotAddr: hotel.bkc_address,
          hotelBookingUrl: hotel.bkc_url,
          placeId: null,
          startDate: moment(visitSchedule.checkin).format('YYYY-MM-DD') ?? null,
          endDate: moment(visitSchedule.checkout).format('YYYY-MM-DD') ?? null,
          night:
            visitSchedule.queryParams?.metaScheduleInfo?.travelNights ?? -1,
          days: visitSchedule.queryParams?.metaScheduleInfo?.travelDays ?? -1,
          checkIn: hotel.bkc_checkin,
          checkOut: hotel.bkc_checkout,
          price: hotel.bkc_min_total_price
            ? hotel.bkc_min_total_price.toString()
            : null,
          priceLevel: null,
          rating: hotel.bkc_review_score ? hotel.bkc_review_score / 2.0 : null,
          lat: hotel.bkc_latitude,
          lng: hotel.bkc_longitude,
          hotelClass: hotel.bkc_hotelClass,
          website: hotel.bkc_url,
          language: hotel.bkc_default_language,
          cityNameEN: hotel.bkc_city_name_en,
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
          reviewScoreWord: hotel.bkc_review_score_word,
        };
      }
      if (tourPlaceType.includes('GL_')) {
        const { tourPlace: googlePlace } = visitSchedule;

        const detailData: GglPlaceDetailType = await getPlaceDetail({
          placeId: googlePlace.gl_place_id ?? '',
        });

        return {
          id: visitSchedule.id.toString(),
          dayCount: visitSchedule.dayNo,
          orderCount: visitSchedule.orderNo,
          planType: visitSchedule.planType,
          spotType: tourPlaceType,
          previewImg: (() => {
            return googlePlace.gl_photos.length > 0 &&
              googlePlace.gl_photos[0].url
              ? googlePlace.gl_photos[0].url
              : 'none';
          })(),
          spotName: (detailData as { name: string }).name,
          roomType: null,
          spotAddr:
            googlePlace.gl_vicinity ?? googlePlace.gl_formatted_address ?? null,
          // spotAddr: (detailData as { formatted_address: string })
          //   .formatted_address,
          hotelBookingUrl: null,
          placeId: googlePlace.gl_place_id,
          startDate: moment(visitSchedule.checkin).format('YYYY-MM-DD') ?? null,
          endDate: moment(visitSchedule.checkout).format('YYYY-MM-DD') ?? null,
          night:
            visitSchedule.queryParams?.metaScheduleInfo?.travelNights ?? null,
          days: visitSchedule.queryParams?.metaScheduleInfo?.travelDays ?? null,
          checkIn: null,
          checkOut: null,
          price: null,
          priceLevel: transPriceLevel(detailData),
          rating: googlePlace.gl_rating,
          lat: googlePlace.gl_lat,
          lng: googlePlace.gl_lng,
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
                html_attributions: string[];
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

      if (tourPlaceType.includes('VISITJEJU_')) {
        const { tourPlace: visitJejuPlace } = visitSchedule;
        return {
          id: visitSchedule.id.toString(),
          dayCount: visitSchedule.dayNo,
          orderCount: visitSchedule.orderNo,
          planType: visitSchedule.planType,
          spotType: tourPlaceType,
          previewImg: 'none',
          spotName: visitJejuPlace.vj_title ?? 'none',
          roomType: null,
          spotAddr: visitJejuPlace.vj_address ?? 'none',
          hotelBookingUrl: null,
          placeId: visitJejuPlace.vj_contentsid ?? 'none',
          startDate: moment(visitSchedule.checkin).format('YYYY-MM-DD') ?? null,
          endDate: moment(visitSchedule.checkout).format('YYYY-MM-DD') ?? null,
          night:
            visitSchedule.queryParams?.metaScheduleInfo?.travelNights ?? -1,
          days: visitSchedule.queryParams?.metaScheduleInfo?.travelDays ?? -1,
          checkIn: null,
          checkOut: null,
          price: null,
          priceLevel: null,
          rating: null,
          lat: visitJejuPlace.vj_latitude ?? -1,
          lng: visitJejuPlace.vj_longitude ?? -1,
          hotelClass: null,
          website: null,
          language: null,
          cityNameEN: null,
          imageList: [],
          contact: null,
          weekdayOpeningHours: null,
          reviews: null,
          takeout: null,
          googlePlaceTypes: null,
          url: null,
          userRatingsTotal: null,
          reviewScoreWord: null,
        };
      }
      return null;
    })();

  return retValue as GetDetailScheduleRETParamPayload;
};

/**
 * 생성된 스케쥴의 변경 후보 리스트를 요청하는 함수
 *  생성일정의 고유 값으로 간주되는 queryParamsId 값으로 일정을 특정하여 해당 일정의 후보군을 응답한다.
 */
export const getCandidateSchedule = async (
  param: GetCandidateScheduleREQParam,
): Promise<GetCandidateScheduleRETParamPayload> => {
  const { queryParamsId, spotType = '', skip = 0, take = 10 } = param;

  const retValue: GetCandidateScheduleRETParamPayload = await (async () => {
    const queryParams = await prisma.queryParams.findUnique({
      where: {
        id: Number(queryParamsId),
      },
      include: {
        metaScheduleInfo: true,
        tourPlace: {
          where: {
            visitSchedule: { none: {} },
            tourPlaceType: (() => {
              if (spotType.toUpperCase().includes('HOTEL'))
                return { equals: 'BKC_HOTEL' };
              if (spotType.toUpperCase().includes('RESTAURANT'))
                return { in: ['GL_RESTAURANT', 'VISITJEJU_RESTAURANT'] };
              if (spotType.toUpperCase().includes('SPOT'))
                return { in: ['GL_SPOT', 'VISITJEJU_SPOT'] };
              return { in: [] };
            })(),
            status: {
              equals: 'IN_USE',
            },
          },
          include: {
            gl_photos: true,
          },
        },
      },
    });

    const candidateList = queryParams?.tourPlace
      .map(tp => {
        if (!tp) return undefined;

        const vType: PlaceType = tp.tourPlaceType;
        // const night = queryParams.metaScheduleInfo?.travelNights ?? 0;
        // const days = queryParams.metaScheduleInfo?.travelDays ?? 0;
        if (vType.includes('BKC_HOTEL')) {
          const hotel = tp;
          return {
            id: tp.id.toString(),
            spotType: vType as string,
            previewImg: hotel.bkc_main_photo_url ?? 'none',
            spotName: hotel.bkc_hotel_name ?? 'none',
            roomType: hotel.bkc_unit_configuration_label ?? 'none',
            spotAddr: hotel.bkc_address ?? 'none',
            hotelBookingUrl: hotel.bkc_url ?? 'none',
            // startDate: tp.checkin
            //   ? moment(tp.checkin).format('YYYY-MM-DD')
            //   : '',
            // endDate: tp.checkout
            //   ? moment(tp.checkout).format('YYYY-MM-DD')
            //   : '',
            // night,
            // days,
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
          const googlePlace = tp;
          return {
            id: tp.id.toString(),
            spotType: vType as string,
            previewImg:
              googlePlace.gl_photos.length > 0 && googlePlace.gl_photos[0].url
                ? googlePlace.gl_photos[0].url
                : 'none',
            spotName: googlePlace.gl_name ?? 'none',
            spotAddr:
              googlePlace.gl_vicinity ??
              googlePlace.gl_formatted_address ??
              'none',
            // contact: 'none',
            placeId: googlePlace.gl_place_id ?? 'none',
            // startDate: tp.checkin
            //   ? moment(tp.checkin).format('YYYY-MM-DD')
            //   : '',
            // endDate: tp.checkout
            //   ? moment(tp.checkout).format('YYYY-MM-DD')
            //   : '',
            // night,
            // days,
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

        if (vType.includes('VISITJEJU_')) {
          const visitJejuPlace = tp;
          return {
            id: tp.id.toString(),
            spotType: vType as string,
            previewImg: 'none',
            spotName: visitJejuPlace.vj_title ?? 'none',
            spotAddr: visitJejuPlace.vj_address ?? 'none',
            // contact: 'none',
            placeId: visitJejuPlace.vj_contentsid ?? 'none',
            // startDate: tp.checkin
            //   ? moment(tp.checkin).format('YYYY-MM-DD')
            //   : '',
            // endDate: tp.checkout
            //   ? moment(tp.checkout).format('YYYY-MM-DD')
            //   : '',
            // night,
            // days,
            lat: visitJejuPlace.vj_latitude ?? -1,
            lng: visitJejuPlace.vj_longitude ?? -1,
          };
        }
        return undefined;
      })
      .filter(v => v !== undefined) as BriefScheduleType[];
    const takedList =
      candidateList.length > skip + take
        ? candidateList.splice(skip, take)
        : candidateList;

    return {
      id: queryParams ? Number(queryParams.id) : 0,
      contentsCountAll: takedList.length,
      candidateList: takedList,
    };
  })();

  return retValue;
};

/**
 * 생성된 스케쥴의 변경 후보 리스트중 1개 후보 항목의 자세한 정보(tourPlace) 요청
 */
export const getCandDetailSchd = async (
  param: GetCandDetailSchdREQParam,
): Promise<GetCandDetailSchdRETParamPayload | null> => {
  const { candidateId } = param;

  const tourPlace = await prisma.tourPlace.findUnique({
    where: { id: Number(candidateId) },
    include: {
      gl_photos: true,
    },
  });

  const retValue =
    await (async (): Promise<GetCandDetailSchdRETParamPayload | null> => {
      if (!tourPlace) {
        throw new IBError({
          type: 'NOTEXISTDATA',
          message: 'candidateId에 해당하는 tourPlace가 존재하지 않습니다.',
        });
      }

      const { tourPlaceType } = tourPlace;
      if (tourPlaceType.toUpperCase().includes('BKC_HOTEL')) {
        const hotel = tourPlace;
        const hotelPhotos = await (async () => {
          const options = {
            method: 'GET' as Method,
            url: 'https://booking-com.p.rapidapi.com/v1/hotels/photos',
            params: { locale: 'ko', hotel_id: hotel.bkc_hotel_id },
            headers: {
              'X-RapidAPI-Key': `${process.env.RAPID_API_KEY as string}`,
              'X-RapidAPI-Host': 'booking-com.p.rapidapi.com',
            },
          };
          const rawResponse = await axios.request(options);
          const hPhotos = rawResponse.data as {
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
          return hPhotos;
        })();

        return {
          id: hotel.id.toString(),
          spotType: tourPlaceType,
          previewImg: hotel.bkc_main_photo_url ?? 'none',
          spotName: hotel.bkc_hotel_name ?? 'none',
          roomType: hotel.bkc_unit_configuration_label,
          spotAddr: hotel.bkc_address,
          hotelBookingUrl: hotel.bkc_url,
          placeId: null,
          startDate: null,
          endDate: null,
          night: null,
          days: null,
          checkIn: hotel.bkc_checkin,
          checkOut: hotel.bkc_checkout,
          price: hotel.bkc_min_total_price
            ? hotel.bkc_min_total_price.toString()
            : null,
          priceLevel: null,
          rating: hotel.bkc_review_score ? hotel.bkc_review_score / 2.0 : null,
          lat: hotel.bkc_latitude,
          lng: hotel.bkc_longitude,
          hotelClass: hotel.bkc_hotelClass,
          website: hotel.bkc_url,
          language: hotel.bkc_default_language,
          cityNameEN: hotel.bkc_city_name_en,
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
          reviewScoreWord: hotel.bkc_review_score_word,
        };
      }
      if (tourPlaceType.includes('GL_')) {
        const googlePlace = tourPlace;

        const detailData: GglPlaceDetailType = await getPlaceDetail({
          placeId: googlePlace.gl_place_id ?? '',
        });

        return {
          id: googlePlace.id.toString(),
          spotType: tourPlaceType,
          previewImg: (() => {
            return googlePlace.gl_photos.length > 0 &&
              googlePlace.gl_photos[0].url
              ? googlePlace.gl_photos[0].url
              : 'none';
          })(),
          spotName: (detailData as { name: string }).name,
          roomType: null,
          spotAddr:
            googlePlace.gl_vicinity ??
            googlePlace.gl_formatted_address ??
            'none',
          // spotAddr: (detailData as { formatted_address: string })
          //   .formatted_address,
          hotelBookingUrl: null,
          placeId: googlePlace.gl_place_id,
          startDate: null,
          endDate: null,
          night: null,
          days: null,
          checkIn: null,
          checkOut: null,
          price: null,
          priceLevel: transPriceLevel(detailData),
          rating: googlePlace.gl_rating,
          lat: googlePlace.gl_lat,
          lng: googlePlace.gl_lng,
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
                html_attributions: string[];
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

      if (tourPlaceType.includes('VISITJEJU_')) {
        const visitJejuPlace = tourPlace;
        return {
          id: visitJejuPlace.id.toString(),
          spotType: tourPlaceType,
          previewImg: 'none',
          spotName: visitJejuPlace.vj_title ?? 'none',
          roomType: null,
          spotAddr: visitJejuPlace.vj_address ?? 'none',
          hotelBookingUrl: null,
          placeId: visitJejuPlace.vj_contentsid ?? 'none',
          startDate: null,
          endDate: null,
          night: null,
          days: null,
          checkIn: null,
          checkOut: null,
          price: null,
          priceLevel: null,
          rating: null,
          lat: visitJejuPlace.vj_latitude ?? -1,
          lng: visitJejuPlace.vj_longitude ?? -1,
          hotelClass: null,
          website: null,
          language: null,
          cityNameEN: null,
          imageList: [],
          contact: null,
          weekdayOpeningHours: null,
          reviews: null,
          takeout: null,
          googlePlaceTypes: null,
          url: null,
          userRatingsTotal: null,
          reviewScoreWord: null,
        };
      }
      return null;
    })();

  return retValue;
};

/**
 * 생성된 스케쥴의 변경 후보 리스트중 1개 후보 항목의 자세한 정보(tourPlace) 요청
 */
export const modifySchedule = async (
  param: ModifyScheduleREQParam,
): Promise<ModifyScheduleRETParamPayload | null> => {
  const { visitScheduleId, candidateId } = param;

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

  const updateRes: VisitSchedule = await prisma.visitSchedule.update({
    where: {
      id: Number(visitScheduleId),
    },
    data: {
      // type: candidateSpotType.toUpperCase() as PlaceType,
      tourPlaceId: Number(candidateId),
    },
    include: {
      tourPlace: true,
    },
  });

  return updateRes;
};

/**
 * makeSchedule로 인한 클러스터 형성 후
 * 관련 호텔 데이터를 반환하는 api
 */
export const getHotelList = async (
  param: GetHotelListREQParam,
): Promise<GetHotelListRETParamPayload> => {
  const { queryParamsId, transitionNo } = param;

  const queryParams = await prisma.queryParams.findUnique({
    where: {
      id: Number(queryParamsId),
    },
    include: {
      scheduleCluster: true,
    },
  });

  if (isEmpty(queryParams))
    throw new IBError({
      type: 'NOTMATCHEDDATA',
      message: 'queryParamsId에 해당하는 데이터가 존재하지 않습니다.',
    });

  const {
    adult,
    maxFriend,
    companion,
    familyOpt,
    period,
    // roomNumber,
    startDate,
    endDate,
    scheduleCluster,
  } = queryParams;

  const { childrenNumber, childrenAges, roomNumber } = getBKCHotelSrchOpts({
    companion: companion!,
    familyOpt: familyOpt!.split(','),
    maxFriend: maxFriend!.toString(),
    period: period!.toString(),
  });

  const withHMetaData = scheduleCluster.map(cluster => {
    const hotelSrchOpt = {
      orderBy: 'distance',
      adultsNumber: adult!,
      roomNumber,
      checkinDate: moment(startDate).toISOString(),
      checkoutDate: moment(endDate).toISOString(),
      filterByCurrency: 'KRW',
      latitude: cluster.lat.toString(),
      longitude: cluster.lng.toString(),
      pageNumber: 0,
      includeAdjacency: false,
      childrenAges,
      childrenNumber,
      categoriesFilterIds: ['property_type::204'],
      // randNum: centGeo.randNum, /// !! makeCluster단계에서 생성된 클러스터들을 랜덤하게 섞기 위해 참조했던 랜덤 변수값. 아래에서 수행될 각 클러스터별 numOfVisitSpotInCluster와 stayPeriod 결정중에 numOfSpotInCluster / stayPeriod 반올림과정에서 numOfNrbySpot 가 많은 순으로 수행되지 않으면 오차가 뒤로 갈수록 점점 커져 restSpot이 부족해지는 현상이 나타나는데 이를 방지하기 위해 일시적으로 다시 보유한 스팟순으로 정렬했다가 다시 랜덤하게 섞어주기 위해 쓰인다.
    } as BKCSrchByCoordReqOpt;
    return {
      ...cluster,
      hotelSrchOpt,
    };
  });

  // const HotelQueryEventEmitter = new EventEmitter();
  // const queryPromises = new Promise<GetHotelListRETParamPayload[]>(resolve => {
  //   const hotelResult = Array<GetHotelListRETParamPayload>();

  //   HotelQueryEventEmitter.on(
  //     `doQuery`,
  //     // eslint-disable-next-line @typescript-eslint/no-misused-promises
  //     async (hQParam: {
  //       index: number;
  //       hQMetaData: IHotelInMakeSchedule[];
  //       prevStartTime: number;
  //     }) => {
  //       const { index, hQMetaData, prevStartTime } = hQParam;

  //       hotelResult.push({
  //         checkin: hQMetaData[index].checkin,
  //         checkout: hQMetaData[index].checkout,
  //         transitionNo: hQMetaData[index].transitionNo,
  //         stayPeriod: hQMetaData[index].stayPeriod,
  //         hotels: await getHotelDataFromBKC({
  //           ...hQMetaData[index].hotelSrchOpt,
  //           checkinDate: hQMetaData[index].checkin,
  //           checkoutDate: hQMetaData[index].checkout,
  //           store: true,
  //         }),
  //       });

  //       const startTime = moment(prevStartTime);
  //       const endTime = new Date();
  //       console.log(
  //         `hotelQuery [${index}]: ${moment(endTime).diff(
  //           startTime,
  //           'millisecond',
  //         )}ms`,
  //       );

  //       if (index + 1 < hQMetaData.length) {
  //         const timeId = setTimeout(() => {
  //           HotelQueryEventEmitter.emit('doQuery', {
  //             index: index + 1,
  //             hQMetaData,
  //             prevStartTime: endTime,
  //           });
  //           clearTimeout(timeId);
  //         }, 0);
  //       } else {
  //         resolve(hotelResult);
  //       }
  //     },
  //   );

  //   HotelQueryEventEmitter.emit('doQuery', {
  //     index: 0,
  //     hQMetaData: withHMetaData,
  //     prevStartTime: new Date(),
  //   });
  // });

  // const hotelData = await queryPromises;
  // return hotelData
  const tNo = Number(transitionNo);

  return {
    checkin: moment(withHMetaData[tNo].checkin).toISOString(),
    checkout: moment(withHMetaData[tNo].checkout).toISOString(),
    transitionNo: withHMetaData[tNo].transitionNo,
    stayPeriod: withHMetaData[tNo].stayPeriod,
    hotels: await getHotelDataFromBKC({
      ...withHMetaData[tNo].hotelSrchOpt,
      checkinDate: moment(withHMetaData[tNo].checkin).toISOString(),
      checkoutDate: moment(withHMetaData[tNo].checkout).toISOString(),
      store: true,
    }),
  };
};

/**
 * makeSchedule로 인한 클러스터 형성 후
 * 일정반환까지 띄워줄 로딩화면 창 img 반환
 */
export const getScheduleLoadingImg =
  async (): Promise<GetScheduleLoadingImgRETParamPayload> => {
    const count = await prisma.cardNewsGroup.count();
    if (count === 0)
      throw new IBError({
        type: 'NOTEXISTDATA',
        message: '카드 뉴스 데이터가 데이터가 존재하지 않습니다.',
      });

    const skip = Math.floor(Math.random() * (count - 1));
    const cardNewsGroup = await prisma.cardNewsGroup.findMany({
      take: 1,
      skip,
      select: {
        cardNewsContent: {
          select: {
            bgPicUri: true,
          },
        },
      },
    });

    return {
      cardImgs: cardNewsGroup[0].cardNewsContent.map(v => v.bgPicUri),
    };
  };

// /**
//  * 저장된 내 스케쥴 수 반환
//  */
// export const getMyScheduleCount =
// async (): Promise<GetMyScheduleCountRETParamPayload> => {

//   const queryParams = await prisma.queryParams.findMany({
//     // skip: Number(skip),
//     // take: Number(take),
//     where: {
//       userTokenId,
//       savedSchedule: {
//         NOT: undefined,
//       },
//     },
//     include: {
//       visitSchedule: {
//         include: {
//           tourPlace: true,
//         },
//       },
//       // metaScheduleInfo: true,
//       savedSchedule: {
//         include: {
//           hashTag: true,
//         },
//       },
//     },
//   });

//   if (count === 0)
//     throw new IBError({
//       type: 'NOTEXISTDATA',
//       message: '카드 뉴스 데이터가 데이터가 존재하지 않습니다.',
//     });

//   const skip = Math.floor(Math.random() * (count - 1));
//   const cardNewsGroup = await prisma.cardNewsGroup.findMany({
//     take: 1,
//     skip,
//     select: {
//       cardNewsContent: {
//         select: {
//           bgPicUri: true,
//         },
//       },
//     },
//   });

//   return {
//     cardImgs: cardNewsGroup[0].cardNewsContent.map(v => v.bgPicUri),
//   };
// };
