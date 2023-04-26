/* eslint-disable @typescript-eslint/naming-convention */
import moment from 'moment';
import prisma from '@src/prisma';
// import { EventEmitter } from 'events';
import {
  IBError,
  getToday,
  getTomorrow,
  getNDaysLater,
  IBContext,
  getS3SignedUrl,
  ibTravelTagCategorize,
  // getBoundingBox,
  getDistFromTwoGeoLoc,
} from '@src/utils';
import axios, { Method } from 'axios';
import {
  TourPlace,
  PlanType,
  VisitSchedule,
  PlaceType,
  IBPhotos,
  IBTravelTag,
  Prisma,
} from '@prisma/client';
import { krRegionToCode, krCodeToRegion } from '@src/utils/IBDefinitions';
import {
  isNumber,
  isEmpty,
  isNaN,
  isUndefined,
  omit,
  flattenDeep,
  isNil,
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
  DelScheduleREQParam,
  GetDayScheduleREQParam,
  GetDayScheduleRETParamPayload,
  GetDetailScheduleREQParam,
  GetDetailScheduleRETParamPayload,
  GglPlaceDetailType,
  GetPlaceDetailRawData,
  GooglePriceLevel,
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
  GetScheduleCountRETParamPayload,
  SuperCentroid,
  FixHotelREQParam,
  FixHotelRETParamPayload,
  RefreshScheduleREQParam,
  RefreshScheduleRETParamPayload,
  VisitPlaceType,
  GetEstimatedCostREQParam,
  GetEstimatedCostRETParamPayload,
  ChangeScheduleTitleREQParam,
  ChangeScheduleTitleRETParamPayload,
} from './types/schduleTypes';

/**
 *  IBPhotos 배열 형식으로부터 presignedUrl 또는 직접 접근 URL을 반환하는 함수
 * @param param
 * @returns
 */
export const getThumbnailUrlFromIBPhotos = async (
  photos: IBPhotos[],
): Promise<string> => {
  if (photos.length > 0) {
    if (!isNil(photos[0].url) && !isEmpty(photos[0].url)) {
      /// 직접접근 링크 url이 존재하는 경우
      return photos[0].url;
    }

    if (!isNil(photos[0].key) && !isEmpty(photos[0].key)) {
      /// s3 key가 존재하는 경우
      const signedUrl = await getS3SignedUrl(photos[0].key);
      return signedUrl;
    }
  }
  return 'none';
};

/**
 *  IBPhotos 배열 형식으로부터 presignedUrl 또는 직접 접근 URL을 반환하는 함수
 * @param param
 * @returns
 */
export const getImgUrlListFromIBPhotos = async (
  photos: IBPhotos[],
): Promise<
  // {
  //   id: string;
  //   url: string;
  // }[]
  Partial<IBPhotos>[]
> => {
  const result = await Promise.all(
    photos.map(async p => {
      return {
        id: p.id,
        url: await (async (): Promise<string> => {
          if (photos.length > 0) {
            if (!isNil(p.url) && !isEmpty(p.url)) {
              /// 직접접근 링크 url이 존재하는 경우
              return p.url;
            }

            if (!isNil(p.key) && !isEmpty(p.key)) {
              /// s3 key가 존재하는 경우
              const signedUrl = await getS3SignedUrl(p.key);
              return signedUrl;
            }
          }
          return 'none';
        })(),
      } as Partial<IBPhotos>;
    }),
  );
  return result;
};

/**
 * inner utils
 *  */
/**
 * google place/detail api 호출 후 결과값을 리턴하는 함수
 */
export const getPlaceDetail = async (
  params: {
    placeId: string;
  },
  retry: number = 0,
): Promise<GglPlaceDetailType> => {
  try {
    const { placeId } = params;
    const queryUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&key=${
      process.env.GCP_MAPS_APIKEY as string
    }`;

    if (retry > 0) {
      await new Promise(resolve => {
        setTimeout(() => {
          resolve(true);
        }, 500);
      });
    }
    const rawResponse = await axios.get(encodeURI(queryUrl));
    const fetchedData = rawResponse.data as GetPlaceDetailRawData;
    return fetchedData.result;
  } catch (err) {
    console.error(`${(err as Error).message}\n`);
    console.error(`getPlacedetail retry: ${retry + 1}\n`);

    const result = await getPlaceDetail(params, retry + 1);
    return result;
    // throw new IBError({
    //   type: 'EXTERNALAPI',
    //   message: `google place detail api 요청중 문제가 발생했습니다.`,
    // });
  }
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
    queryParamsId,
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

            title: hotel_name,
            lat: latitude,
            lng: longitude,
            address,
            rating: review_score,
            // coordinates: {
            //   // 경도와 위도 값을 넣어줍니다.
            //   // 예: 경도 126.9784, 위도 37.5665
            //   set: [longitude, latitude],
            // },

            queryParams: {
              connect: {
                id: queryParamsId,
              },
            },
            // queryParams: {
            //   connect: {
            //     id: 1,
            //   },
            // },
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
  retry: number = 0,
): Promise<GetPlaceByGglTxtSrchRETParamPayload> => {
  try {
    const { pageToken, batchJobCtx } = param;
    const keyword = (() => {
      if (batchJobCtx) return batchJobCtx.keyword;
      return param.keyword;
    })();

    if (retry > 0) {
      await new Promise(resolve => {
        setTimeout(() => {
          resolve(true);
        }, 500);
      });
    }

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
  } catch (err) {
    console.error(`${(err as Error).message} \n`);
    console.log(`google TextSearch retry: ${retry + 1}`);
    const result = await qryPlaceDataToGglTxtSrch(param, retry + 1);
    return result;
  }
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
 * updatedScheduleBank
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
    /// batchJobCtx가 있다면 배치 스크립트로 실행된 명령이다.
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

          /// 통합 필수 필드
          title: item.name!,
          lat: item.geometry?.location?.lat,
          lng: item.geometry?.location?.lng,
          address: item.formatted_address ?? item.vicinity ?? undefined,
          roadAddress: undefined,
          openWeek: undefined,
          contact: undefined,
          postcode: undefined,
          photos: {
            create: await (async () => {
              if (!isNil(item.photos) && !isEmpty(item.photos)) {
                return item.photos?.map(photo => {
                  return {
                    url:
                      (photo as Partial<{ photo_reference: string }>)
                        .photo_reference ?? '',
                  };
                });
              }

              if (item.place_id) {
                const detailData: GglPlaceDetailType = await getPlaceDetail({
                  placeId: item.place_id,
                });

                return isNil(detailData?.photos)
                  ? undefined
                  : detailData?.photos.map(v => {
                      return {
                        url: v.photo_reference,
                      };
                    });
              }
              return undefined;
            })(),
          },
          gl_place_id: item.place_id,
          rating: isNil(item.rating) ? 0 : item.rating,
          desc: undefined,
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
              ibTravelTag: {
                connect: {
                  id: await ibTravelTagCategorize(batchJobCtx),
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
          gl_place_id: item.place_id,
          /// 통합 필수 필드
          title: item.name!,
          lat: item.geometry?.location?.lat,
          lng: item.geometry?.location?.lng,
          address: item.formatted_address ?? item.vicinity ?? undefined,
          roadAddress: undefined,
          openWeek: undefined,
          contact: undefined,
          postcode: undefined,
          photos: {
            create: await (async () => {
              if (!isNil(item.photos) && !isEmpty(item.photos)) {
                return item.photos?.map(photo => {
                  return {
                    url:
                      (photo as Partial<{ photo_reference: string }>)
                        .photo_reference ?? '',
                  };
                });
              }

              if (item.place_id) {
                const detailData: GglPlaceDetailType = await getPlaceDetail({
                  placeId: item.place_id,
                });

                return isNil(detailData?.photos)
                  ? undefined
                  : detailData?.photos.map(v => {
                      return {
                        url: v.photo_reference,
                      };
                    });
              }
              return undefined;
            })(),
          },
          rating: isNil(item.rating) ? 0 : item.rating,
          desc: undefined,
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
  const { loadAll, batchJobCtx } = param;

  let curRes = await getVisitJejuData(param);
  // let nextPage = (curRes.currentPage ?? 1) + 1;
  const allRes: GetPlaceDataFromVJRETParamPayload = { ...curRes };

  const asyncIterable = {
    [Symbol.asyncIterator]() {
      let nextPage = (curRes.currentPage ?? 1) + 1;
      return {
        async next() {
          // eslint-disable-next-line no-await-in-loop
          const nextRes = await getVisitJejuData({
            ...param,
            page: nextPage,
          });
          nextPage += 1;

          if (
            curRes.currentPage &&
            curRes.pageCount &&
            curRes.currentPage < curRes.pageCount
          ) {
            return { value: nextRes, done: false };
          }
          return { value: nextRes, done: true };
        },
      };
    },
  };

  if (loadAll) {
    // while (
    //   curRes.currentPage &&
    //   curRes.pageCount &&
    //   curRes.currentPage < curRes.pageCount
    // ) {
    // // eslint-disable-next-line no-await-in-loop
    // const nextRes = await getVisitJejuData({
    //   ...param,
    //   page: nextPage,
    // });

    // eslint-disable-next-line no-restricted-syntax
    for await (const nextRes of asyncIterable) {
      if (
        allRes.items &&
        allRes.items.length > 0 &&
        nextRes.items &&
        nextRes.items.length > 0
      ) {
        if (param.store) {
          const { items: rawItems } = curRes;

          /// 숙박시설은 VISITJEJU_RESTAURANT나 VISITJEJU_SPOT에서 제외함
          const items = rawItems!.filter(
            v => !v.contentscd?.label.includes('숙박') ?? false,
          );

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
                    tourPlaceType: {
                      in: ['VISITJEJU_RESTAURANT', 'VISITJEJU_SPOT'],
                    },
                  },
                  data: {
                    status: 'ARCHIVED',
                  },
                });
                return promise;
              });
            // eslint-disable-next-line no-await-in-loop
            if (updatedPromises) {
              await prisma.$transaction(updatedPromises);
            }
          }

          console.log(
            `visitJeju page의 항목과 동일한 DB가 있는지 대조하여 상태값을 업데이트 완료.. in ${
              curRes.currentPage ?? 'undefined'
            } page `,
          );
          // eslint-disable-next-line no-await-in-loop
          await Promise.all([
            new Promise<void>(resolve => {
              setTimeout(() => {
                resolve();
              }, 50);
            }),
          ]);

          const createPromises =
            items &&
            items
              .map(item => {
                if (isNil(item.latitude) || isNil(item.longitude)) return null;
                const promise = prisma.tourPlace.create({
                  data: {
                    status:
                      batchJobCtx && !isEmpty(batchJobCtx) ? 'IN_USE' : 'NEW',
                    tourPlaceType:
                      item.contentscd?.label === '음식점'
                        ? 'VISITJEJU_RESTAURANT'
                        : 'VISITJEJU_SPOT',

                    /// 통합 필수 필드
                    title: item.title!,
                    lat: item.latitude,
                    lng: item.longitude,
                    address: item.address,
                    roadAddress: item.roadaddress,
                    openWeek: undefined,
                    contact: item.phoneno,
                    postcode: item.postcode,
                    ...(item.repPhoto?.photoid?.imgpath && {
                      photos: {
                        create: {
                          url: item.repPhoto?.photoid?.imgpath,
                        },
                      },
                    }),

                    rating: undefined,
                    desc: item.introduction,

                    vj_contentsid: item.contentsid as string,
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
              })
              .filter(
                (v): v is Prisma.Prisma__TourPlaceClient<TourPlace> =>
                  v !== null,
              );

          const createdList =
            // eslint-disable-next-line no-await-in-loop
            createPromises && (await prisma.$transaction(createPromises));

          console.log(
            `visitJeju page의 항목을 DB에 생성 완료 in ${
              curRes.currentPage ?? 'undefined'
            } page `,
          );

          // eslint-disable-next-line no-await-in-loop
          await Promise.all([
            new Promise<void>(resolve => {
              setTimeout(() => {
                resolve();
              }, 50);
            }),
          ]);

          if (!createdList) {
            console.error('반환된 visitJeju searchList 결과값이 없습니다.');
          }
        }
        // curRes = { ...nextRes };

        // allRes.items = [...allRes.items, ...nextRes.items];
        // if (allRes.resultCount) {
        //   allRes.resultCount += nextRes.resultCount ?? 0;
        // }
        // if (allRes.currentPage) {
        //   allRes.currentPage = nextRes.currentPage ?? 1;
        // }

        // curRes = { ...nextRes };
        // nextPage += 1;
      }
      curRes = { ...nextRes };
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
  // const { batchJobCtx } = param;

  const jejuRes = await getAllPlaceDataFromVJ(param);

  // /// store data to db
  // if (param.store) {
  //   const { items: rawItems } = jejuRes;

  //   /// 숙박시설은 VISITJEJU_RESTAURANT나 VISITJEJU_SPOT에서 제외함
  //   const items = rawItems!.filter(
  //     v => !v.contentscd?.label.includes('숙박') ?? false,
  //   );

  //   /// 배치 스크립트로 store 옵션과 함께 실행되면
  //   /// 기존 사용중인 데이터는 ARCHIVED가 되고
  //   /// 배치 스크립트로 새로 수집된 데이터가 IN_USE가 된다.
  //   if (batchJobCtx && !isEmpty(batchJobCtx)) {
  //     const updatedPromises =
  //       items &&
  //       items.map(item => {
  //         const promise = prisma.tourPlace.updateMany({
  //           where: {
  //             vj_contentsid: item.contentsid,
  //             status: 'IN_USE',
  //             tourPlaceType: { in: ['VISITJEJU_RESTAURANT', 'VISITJEJU_SPOT'] },
  //           },
  //           data: {
  //             status: 'ARCHIVED',
  //           },
  //         });
  //         return promise;
  //       });
  //     if (updatedPromises) await prisma.$transaction(updatedPromises);
  //   }

  //   const createPromises =
  //     items &&
  //     items.map(item => {
  //       const promise = prisma.tourPlace.create({
  //         data: {
  //           status: batchJobCtx && !isEmpty(batchJobCtx) ? 'IN_USE' : 'NEW',
  //           tourPlaceType:
  //             item.contentscd?.label === '음식점'
  //               ? 'VISITJEJU_RESTAURANT'
  //               : 'VISITJEJU_SPOT',

  //           /// 통합 필수 필드
  //           title: item.title,
  //           lat: item.latitude,
  //           lng: item.longitude,
  //           address: item.address,
  //           roadAddress: item.roadaddress,
  //           openWeek: undefined,
  //           contact: item.phoneno,
  //           postcode: item.postcode,
  //           ...(item.repPhoto?.photoid?.imgpath && {
  //             photos: {
  //               create: {
  //                 url: item.repPhoto?.photoid?.imgpath,
  //               },
  //             },
  //           }),

  //           rating: undefined,
  //           desc: item.introduction,

  //           vj_contentsid: item.contentsid as string,
  //           vj_contentscdLabel: item.contentscd?.label,
  //           vj_contentscdValue: item.contentscd?.value,
  //           vj_contentscdRefId: item.contentscd?.refId,
  //           vj_title: item.title,
  //           vj_region1cdLabel: item.region1cd?.label,
  //           vj_region1cdValue: item.region1cd?.value,
  //           vj_region1cdRefId: item.region1cd?.refId,
  //           vj_region2cdLabel: item.region2cd?.label,
  //           vj_region2cdValue: item.region2cd?.value,
  //           vj_region2cdRefId: item.region2cd?.refId,
  //           vj_address: item.address,
  //           vj_roadaddress: item.roadaddress,
  //           vj_tag: {
  //             ...(item.tag && {
  //               connectOrCreate: item.tag.split(',').map(v => {
  //                 return {
  //                   where: {
  //                     value: v,
  //                   },
  //                   create: {
  //                     value: v,
  //                   },
  //                 };
  //               }),
  //             }),
  //           },
  //           vj_introduction: item.introduction,
  //           vj_latitude: item.latitude,
  //           vj_longitude: item.longitude,
  //           vj_postcode: item.postcode,
  //           vj_phoneno: item.phoneno,
  //           ...(batchJobCtx &&
  //             batchJobCtx.batchQueryParamsId && {
  //               batchQueryParams: {
  //                 connectOrCreate: {
  //                   where: {
  //                     id: batchJobCtx.batchQueryParamsId,
  //                   },
  //                   create: {
  //                     // keyword: queryReqParams?.textSearchReqParams?.keyword,
  //                     latitude: undefined,
  //                     longitude: undefined,
  //                     radius: undefined,
  //                     searchkeyword: {
  //                       connectOrCreate: {
  //                         where: {
  //                           keyword: '',
  //                         },
  //                         create: {
  //                           keyword: '',
  //                         },
  //                       },
  //                     },
  //                   },
  //                 },
  //               },
  //             }),
  //         },
  //       });
  //       return promise;
  //     });

  //   const createdList =
  //     createPromises && (await prisma.$transaction(createPromises));

  //   if (!createdList)
  //     throw new IBError({
  //       type: 'EXTERNALAPI',
  //       message: '반환된 visitJeju searchList 결과값이 없습니다.',
  //     });
  // }
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

const visitScheduleToDayScheduleType = async (
  promise: Promise<DayScheduleType[]>,
  cur: VisitSchedule & {
    tourPlace: TourPlace & { photos: IBPhotos[] };
  },
) => {
  const acc = await promise;
  if (cur && !isUndefined(cur.dayNo) && !isUndefined(cur.orderNo)) {
    const alreadyDayExist = acc.find(
      v =>
        v.dayNo === (cur.dayNo === undefined ? 'error' : cur.dayNo.toString()),
    );
    if (!alreadyDayExist) {
      acc.push({
        dayNo: cur.dayNo.toString(),
        transitionNo: cur.transitionNo,
        stayPeriod: cur.stayPeriod,
        checkin: cur.checkin?.toISOString() ?? null,
        checkout: cur.checkout?.toISOString() ?? null,
        titleList: [
          {
            visitScheduleId: cur.id.toString(),
            orderNo: cur.orderNo.toString(),
            placeType: (cur.placeType ?? 'SPOT') as VisitPlaceType,
            title: cur.tourPlace?.title ?? 'none',
            tourPlaceData: isNil(cur.tourPlace)
              ? null
              : {
                  ...cur.tourPlace,
                  photos: await getImgUrlListFromIBPhotos(cur.tourPlace.photos),
                },
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
        placeType: (cur.placeType ?? 'SPOT') as VisitPlaceType,
        // transitionNo: cur.transitionNo,
        // stayPeriod: cur.stayPeriod,
        // checkin: cur.checkin?.toISOString() ?? null,
        // checkout: cur.checkout?.toISOString() ?? null,
        title: cur.tourPlace?.title ?? 'none',
        tourPlaceData: isNil(cur.tourPlace)
          ? null
          : {
              ...cur.tourPlace,
              photos: await getImgUrlListFromIBPhotos(cur.tourPlace.photos),
            },
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

const getLatLng = (spot: { lat: number; lng: number }): GeoFormat => {
  return {
    lat: spot.lat,
    lng: spot.lng,
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

  let temp: TourPlaceGeoLoc[] | undefined;

  if (type === 'spot') {
    /// spot일경우
    if (!spots || !paramByAvgCalibLevel) return undefined;
    temp = [...spots];
  } else {
    /// food일 경우
    if (!foods || !paramByAvgCalibLevel) return undefined;
    temp = [...foods];
  }

  const items = temp.sort(() => Math.random() - 0.5).splice(0, 1000); /// 성능문제로 랜덤 최대 1000개까지 뽑아서 클러스터링

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
      const center = items.reduce(
        (acc, curSpot) => {
          const spotLatLng = getLatLng(curSpot);
          if (!spotLatLng) return acc;
          // if (degreeToMeter(c.lat, c.lng, spotLatLng.lat, spotLatLng.lng) < r) {
          if (
            getDistFromTwoGeoLoc({
              aLat: c.lat,
              aLng: c.lng,
              bLat: spotLatLng.lat,
              bLng: spotLatLng.lng,
            }) < r
          ) {
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
        // nd =>
        //   nd === null || degreeToMeter(nd.lat, nd.lng, cur.lat, cur.lng) < r,
        nd =>
          nd === null ||
          getDistFromTwoGeoLoc({
            aLat: nd.lat,
            aLng: nd.lng,
            bLat: cur.lat,
            bLng: cur.lng,
          }) < r,
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
          id: v.id,
          name: v.title,
          lat: v.lat ?? -9999,
          lng: v.lng ?? -9999,
        };
      }),
    }),
    ...(type === 'food' && {
      foodsGeoLocation: items.map(v => {
        return {
          id: v.id,
          name: v.title,
          lat: v.lat,
          lng: v.lng,
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
    scanRange,
  } = param;

  /// spot  search part
  const calibUserLevel = (() => {
    const uInputTypeLevel = travelType.reduce(
      (acc, cur) => {
        const type = cur.toUpperCase();
        const typeDifficulty = { min: 9999, max: -1 };
        switch (type) {
          case 'REST': /// 휴식
            typeDifficulty.min = 1;
            typeDifficulty.max = 1;
            break;
          case 'HEALING': /// 힐링
            typeDifficulty.min = 1;
            typeDifficulty.max = 4;
            break;
          case 'NATUREEXPERIENCE': /// 자연체험
            typeDifficulty.min = 3;
            typeDifficulty.max = 8;
            break;
          case 'LEARNINGEXPERIENCE': /// 학습체험
            typeDifficulty.min = 3;
            typeDifficulty.max = 7;
            break;
          case 'SIGHT': /// 시각
            typeDifficulty.min = 3;
            typeDifficulty.max = 7;
            break;
          case 'MEETING': /// 만남
            typeDifficulty.min = 2;
            typeDifficulty.max = 6;
            break;
          case 'ACTIVITY': /// 액티비티
            typeDifficulty.min = 4;
            typeDifficulty.max = 9;
            break;
          case 'LEARNING': /// 학습
            typeDifficulty.min = 1;
            typeDifficulty.max = 3;
            break;
          case 'DELICIOUS': /// 미식여행
            typeDifficulty.min = 3;
            typeDifficulty.max = 7;
            break;
          case 'EXPLORATION': /// 탐험
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

    /// 유저 입력 여행강도가 여행 타입들로 정해진 여행강도값의 최대값보다 크면 최대 범위를 넓혀준다.
    if (Number(travelHard) > uInputTypeLevel.max) {
      return {
        ...uInputTypeLevel,
        max: Number(travelHard),
      };
    }

    /// 유저 입력 여행강도가 여행 타입들로 정해진 여행강도값의 최소값보다 작으면 최소 범위를 넓혀준다.
    if (Number(travelHard) < uInputTypeLevel.min) {
      return {
        ...uInputTypeLevel,
        min: Number(travelHard),
      };
    }

    return uInputTypeLevel;
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

  console.log(`\n\n[1. Get Spots from DB Scan]`);
  let stopWatch = moment();
  let trackRecord = '';

  console.log(calibUserLevel);

  /// 1. 임시적으로 scanRange 파라미터는 위경도값으로 제공된 데이터만 유효한 데이터가 제공된것으로 간주한다.
  /// 2. 배열의 모든 항목은 minLat ... maxLng 값 네가지를 모두 가지고 있어야 한다.
  /// 3. 유효하지 않다면 기본 default값인 제주도 범위로 한다.
  /// 향후 도시 코드가 정의되면 해당 조건도 추가할것
  const scanType: {
    type: string;
    regionalCodes?: {
      regionCode1?: number;
      regionCode2?: number;
    }[];
  } | null = (() => {
    const isGeocodeType =
      !isNil(scanRange) &&
      scanRange.every(range => {
        if (
          !isEmpty(range.minLat) &&
          !isEmpty(range.maxLat) &&
          !isEmpty(range.minLng) &&
          !isEmpty(range.maxLng)
        ) {
          return true;
        }
        return false;
      });

    if (isGeocodeType) return { type: 'geocode' };

    const isKeywordType =
      !isNil(scanRange) &&
      scanRange.every(range => {
        if (!isNil(range.keyword)) {
          return true;
        }
        return false;
      });

    if (isKeywordType) {
      const regionalCodes = scanRange
        .map<
          | {
              regionCode1?: number;
              regionCode2?: number;
            }
          | undefined
        >(range => {
          const { keyword } = range;
          const keywordArr = keyword!.split(' ');

          /// ex) 전라남도, 서울특별시, 제주특별자치도
          if (keywordArr.length === 1) {
            if (
              keywordArr[0].match(
                /.+[서울특별시|부산광역시|대구광역시|인천광역시|광주광역시|대전광역시|울산광역시|세종특별자치시|경기도|강원도|충청북도|충청남도|전라북도|전라남도|경상북도|경상남도|제주특별자치도]$/,
              )
            ) {
              const superRegion = keywordArr[0];
              const regionCode1 =
                krRegionToCode[superRegion as keyof typeof krRegionToCode];
              return {
                regionCode1,
              };
            }

            if (keywordArr[0].match(/.+[시|군|구]$/)) {
              const subRegion = keywordArr[0];
              const regionCode2 =
                krRegionToCode[subRegion as keyof typeof krRegionToCode];
              return {
                regionCode2,
              };
            }
          }
          /// ex) 전라남도 순천시, 서울특별시 중구
          if (keywordArr.length > 1) {
            const superRegion = keywordArr[0];
            const subRegion = keywordArr[1];

            let regionCode1: number | undefined;
            let regionCode2: number | undefined;
            if (!isNil(superRegion.match(/.+[도|시]$/))) {
              regionCode1 =
                krRegionToCode[superRegion as keyof typeof krRegionToCode];
            }

            if (!isNil(superRegion.match(/.+[시|군|구]$/))) {
              regionCode2 =
                krRegionToCode[subRegion as keyof typeof krRegionToCode];
            }

            return {
              regionCode1,
              regionCode2,
            };
          }

          return undefined;
        })
        .filter(
          (v): v is { regionCode1?: number; regionCode2?: number } =>
            v !== undefined,
        );

      return {
        type: 'keyword',
        regionalCodes,
      };
    }
    return null;
  })();

  const spots = await prisma.tourPlace.findMany({
    where: {
      ibTravelTag: {
        some: {
          OR: [
            {
              AND: [
                /// 유저가 원하는 여행강도 범위안에 완전히 포함되거나
                { minDifficulty: { gte: calibUserLevel.min } },
                { maxDifficulty: { lte: calibUserLevel.max } },
              ],
            },
            {
              AND: [
                /// 유저가 원하는 여행강도 범위를 완전히 포함할수 있는 넓은 범위의 장소들
                { minDifficulty: { lt: calibUserLevel.min } },
                { maxDifficulty: { gt: calibUserLevel.max } },
              ],
            },
          ],
        },
      },
      ...(() => {
        if (
          !isNil(scanType) &&
          scanType.type === 'geocode' &&
          !isEmpty(scanRange)
        ) {
          return {
            OR: scanRange!.map(v => {
              return {
                AND: [
                  { lat: { gte: Number(v.minLat) } },
                  { lat: { lt: Number(v.maxLat) } },
                  { lng: { gte: Number(v.minLng) } },
                  { lng: { lt: Number(v.maxLng) } },
                ],
              };
            }),
          };
        }

        if (
          !isNil(scanType) &&
          scanType.type === 'keyword' &&
          !isNil(scanType.regionalCodes) &&
          !isEmpty(scanType.regionalCodes)
        ) {
          const { regionalCodes } = scanType;
          const condition = regionalCodes.map(v => {
            return {
              regionCode1:
                krCodeToRegion[v.regionCode1 as keyof typeof krCodeToRegion],
              regionCode2:
                krCodeToRegion[v.regionCode2 as keyof typeof krCodeToRegion],
            };
          });
          return {
            OR: condition,
          };
        }

        return {
          /// default 제주도
          OR: [
            {
              AND: [
                { lat: { gte: 33.109684 } },
                { lat: { lt: 33.650946 } },
                { lng: { gte: 126.032175 } },
                { lng: { lt: 127.048411 } },
              ],
            },
          ],
        };
      })(),

      status: 'IN_USE',
      tourPlaceType: {
        in: ['TOUR4_SPOT', 'GL_SPOT', 'VISITJEJU_SPOT'],
      },
    },
    select: {
      id: true,
      tourPlaceType: true,
      status: true,
      title: true,
      lat: true,
      lng: true,
      address: true,
      roadAddress: true,
      openWeek: true,
      contact: true,
      postcode: true,
      rating: true,
      desc: true,
    },
  });

  trackRecord = moment().diff(stopWatch, 'ms').toString();
  console.log(
    `[!!! 1. Get Spots DB Scan end !!!]: duration: ${trackRecord}ms, spots.length = ${spots.length}`,
  );

  if (spots.length < ctx.numOfWholeTravelSpot)
    throw new IBError({
      type: 'NOTEXISTDATA',
      message: `조건에 맞고 여행일수에 필요한만큼 충분한 수의 관광 spot이 없습니다.
        (필요 관광지 수: ${ctx.numOfWholeTravelSpot}, 검색된 관광지 수:${spots.length}, 유저 최소 여행강도: ${calibUserLevel.min}, 유저 최대 여행강도: ${calibUserLevel.max})`,
    });

  ctx.spots = [...spots];
  ctx.paramByAvgCalibLevel = paramByAvgCalibLevel;

  /// spots clustering part
  console.log(`\n\n[2. spots clustering part]`);
  stopWatch = moment();
  ctx.spotClusterRes = makeCluster(ctx, 'spot');
  trackRecord = moment().diff(stopWatch, 'ms').toString();
  console.log(
    `[!!! 2. spots clustering part end !!!]: duration: ${trackRecord}ms, spot nonDupCentroids.length = `,
    ctx.spotClusterRes?.nonDupCentroids.length,
  );

  console.log(`\n\n[3. Get Food Data from DB Scan]`);
  stopWatch = moment();
  // const nonDupCentroidClipList = ctx.spotClusterRes!.validCentNSpots.map(
  //   v => {
  //     // /// spot NonDupCluster 기준 근처식당만 찾도록 클리핑
  //     const { minLat, minLng, maxLat, maxLng } = getBoundingBox(
  //       v.centroidNHotel.cent!.lat,
  //       v.centroidNHotel.cent!.lng,
  //       ctx.spotClusterRes!.r * 2, /// 클러스터안에 적절한 식당이 없을수도 있어서  반경 두배로 검색해본다.
  //     );

  //     return {
  //       AND: [
  //         { lat: { gte: minLat } },
  //         { lat: { lt: maxLat } },
  //         { lng: { gte: minLng } },
  //         { lng: { lt: maxLng } },
  //       ],
  //     };
  //   },
  // );

  const foods = await prisma.tourPlace.findMany({
    where: {
      status: 'IN_USE',
      tourPlaceType: {
        in: ['TOUR4_RESTAURANT', 'GL_RESTAURANT', 'VISITJEJU_RESTAURANT'],
      },
      ...(() => {
        if (
          !isNil(scanType) &&
          scanType.type === 'geocode' &&
          !isEmpty(scanRange)
        ) {
          return {
            OR: scanRange!.map(v => {
              return {
                AND: [
                  { lat: { gte: Number(v.minLat) } },
                  { lat: { lt: Number(v.maxLat) } },
                  { lng: { gte: Number(v.minLng) } },
                  { lng: { lt: Number(v.maxLng) } },
                ],
              };
            }),
          };
        }

        if (
          !isNil(scanType) &&
          scanType.type === 'keyword' &&
          !isNil(scanType.regionalCodes) &&
          !isEmpty(scanType.regionalCodes)
        ) {
          const { regionalCodes } = scanType;
          return {
            OR: regionalCodes.map(v => {
              return {
                regionCode1:
                  krCodeToRegion[v.regionCode1 as keyof typeof krCodeToRegion],
                regionCode2:
                  krCodeToRegion[v.regionCode2 as keyof typeof krCodeToRegion],
              };
            }),
          };
        }

        return {
          /// default 제주도
          OR: [
            {
              AND: [
                { lat: { gte: 33.109684 } },
                { lat: { lt: 33.650946 } },
                { lng: { gte: 126.032175 } },
                { lng: { lt: 127.048411 } },
              ],
            },
          ],
        };
      })(),
    },
    select: {
      id: true,
      tourPlaceType: true,
      title: true,
      status: true,
      lat: true,
      lng: true,
      address: true,
      roadAddress: true,
      openWeek: true,
      contact: true,
      postcode: true,
      rating: true,
      desc: true,
    },
  });

  // if (foods.length < Number(period) * 2)
  //   throw new IBError({
  //     type: 'NOTEXISTDATA',
  //     message: '여행일수에 필요한만큼 충분한 수의 관광 restaurant이 없습니다.',
  //   });

  trackRecord = moment().diff(stopWatch, 'ms').toString();
  console.log(
    `[!!! 3. Get Food Data from DB Scan end !!!]: duration: ${trackRecord}ms, food.length: ${foods.length}`,
  );

  ctx.foods = foods && foods.length > 0 ? [...foods] : [];
  console.log(`\n\n[4. foods clustering part start ]`);
  stopWatch = moment();

  ctx.foodClusterRes = makeCluster(ctx, 'food');
  trackRecord = moment().diff(stopWatch, 'ms').toString();
  console.log(
    `[!!! 4. foods clustering part end !!!]: duration: ${trackRecord}ms, food NonDupCentroid.length : `,
    ctx.foodClusterRes?.nonDupCentroids.length,
  );

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

    if (validFoodCentroids.length === 0) {
      throw new IBError({
        type: 'NOTEXISTDATA',
        message: '충분한 수의 식당 클러스터가 형성되지 못하였습니다.',
      });
    }

    ctx.hotelTransition = validSpotCentroids.length - 1;
    ctx.travelNights = Number(period) - 1;
    if (ctx.travelNights < ctx.hotelTransition) {
      if (ctx.travelNights === 0) {
        validSpotCentroids = validSpotCentroids.splice(0, 1);
      } else {
        validSpotCentroids = validSpotCentroids.splice(0, ctx.travelNights);
      }
    }

    ctx.travelDays = Number(period);

    const validCentNSpots = (() => {
      /// 각 validSpotCentroids 에 범위에 속하는 spot들을 모아 clusteredSpots에 담는다.
      const ret = validSpotCentroids.map(cent => {
        const rangedFromSpot = (curSpot: TourPlaceGeoLoc) => {
          const spotLatLng = getLatLng(curSpot);
          if (!spotLatLng) return null;
          // const dist = degreeToMeter(
          //   spotLatLng.lat,
          //   spotLatLng.lng,
          //   cent.lat,
          //   cent.lng,
          // );
          const dist = getDistFromTwoGeoLoc({
            aLat: spotLatLng.lat,
            aLng: spotLatLng.lng,
            bLat: cent.lat,
            bLng: cent.lng,
          });
          if (dist <= ctx.spotClusterRes!.r)
            return {
              distFromSpotCent: dist,
              inSpotCentroid: cent,
              ...curSpot,
            };
          return null;
        };

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
            // const distWithSpotCent = degreeToMeter(
            //   foodLatLng.lat,
            //   foodLatLng.lng,
            //   cent.lat,
            //   cent.lng,
            // );
            const distWithSpotCent = getDistFromTwoGeoLoc({
              aLat: foodLatLng.lat,
              aLng: foodLatLng.lng,
              bLat: cent.lat,
              bLng: cent.lng,
            });
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
          // const dist = degreeToMeter(
          //   spotLatLng.lat,
          //   spotLatLng.lng,
          //   closestFoodCluster.lat,
          //   closestFoodCluster.lng,
          // );
          const dist = getDistFromTwoGeoLoc({
            aLat: spotLatLng.lat,
            aLng: spotLatLng.lng,
            bLat: closestFoodCluster.lat,
            bLng: closestFoodCluster.lng,
          });
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

    console.log(`\n\n[5. create intermediate data(hotel query data)]`);
    stopWatch = moment();
    const hWithoutData = (() => {
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

          transitionNo += 1;

          return {
            transitionNo,
            stayPeriod,
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
    trackRecord = moment().diff(stopWatch, 'ms').toString();
    console.log(
      `[!!! 5. create intermediate data(hotel query data) End !!!]: duration: ${trackRecord}ms`,
    );

    console.log(`\n\n[6. determining visit order]`);
    stopWatch = moment();

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
                // let dist = degreeToMeter(
                //   cent1.lat,
                //   cent1.lng,
                //   cent2.lat,
                //   cent2.lng,
                // );
                let dist = getDistFromTwoGeoLoc({
                  aLat: cent1.lat,
                  aLng: cent1.lng,
                  bLat: cent2.lat,
                  bLng: cent2.lng,
                });
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

        const maxNum = tempValidCents.length;

        // if (maxNum === 0)
        //   throw new IBError({
        //     type: 'NOTMATCHEDDATA',
        //     message:
        //       '여행지 장소데이터가 부족하여 클러스터를 형성할수 없습니다.',
        //   });

        const topX = (() => {
          if (maxNum >= 3) return 3;
          return maxNum;
        })();

        const rand = Math.floor(maxNum * Math.random()) % topX;
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

    let prevCheckout = '';
    ctx.spotClusterRes!.validCentNSpots = tempValidCents.map(v => {
      /// 호텔 검색결과와 클러스터 방문 순서를 정렬한 결과의 검색 메타데이터를 합쳐서 ctx에 저장한다.

      const { stayPeriod } = v.centroidNHotel;

      const curCheckin = isEmpty(prevCheckout)
        ? moment(startDate).toISOString()
        : prevCheckout;

      let curCheckout = moment(
        moment(curCheckin).add(stayPeriod, 'd'),
      ).toISOString();
      prevCheckout = curCheckout;

      if (moment(curCheckout).diff(moment(endDate), 'd') > 0)
        curCheckout = endDate;

      return {
        ...v,
        centroidNHotel: {
          ...v.centroidNHotel,
          checkin: curCheckin,
          checkout: curCheckout,
          // hotels: hotelData[i],
        },
      };
    });

    trackRecord = moment().diff(stopWatch, 'ms').toString();
    console.log(
      `[!!! 6. determining visit order End !!!]: duration: ${trackRecord}ms, ctx.spotClusterRes!.validCentNSpots.length`,
      ctx.spotClusterRes!.validCentNSpots.length,
    );

    console.log(`\n\n[7. determining visit order]`);
    stopWatch = moment();

    /// super clustering (클러스터링 결과의 상위 그룹화)
    (() => {
      const sortedCents = ctx.spotClusterRes!.validCentNSpots.map(
        v => v.centroidNHotel.cent,
      );

      const distances = sortedCents.map((c, i) => {
        if (i === 0) return 0;

        // return degreeToMeter(
        //   c!.lat,
        //   c!.lng,
        //   sortedCents[i - 1]!.lat,
        //   sortedCents[i - 1]!.lng,
        // );

        return getDistFromTwoGeoLoc({
          aLat: c!.lat,
          aLng: c!.lng,
          bLat: sortedCents[i - 1]!.lat,
          bLng: sortedCents[i - 1]!.lng,
        });
      });
      const totalDistance = distances.reduce((acc, cur) => acc + cur, 0);
      const avgDistance = totalDistance / (distances.length - 1);

      let accDist = 0;
      const superClusterMap = distances.reduce<boolean[]>(
        (acc, dist, i): boolean[] => {
          if (i === 0) return acc;
          accDist += dist;
          if (dist > avgDistance * 2.5 || accDist > avgDistance * 4) {
            accDist = 0;
            acc.push(true); /// 클러스터 그룹 변경(=호텔 변경점)
            return acc;
          }
          acc.push(false);
          return acc;
        },
        [true],
      );
      // console.log(distances, avgDistance);

      const getMaxDistance = (
        superCentLat: number,
        superCentLng: number,
        startIdx: number,
        endIdx: number,
      ) => {
        let maxDistance = -1;
        for (let i = startIdx; i < endIdx; i += 1) {
          // const dist = degreeToMeter(
          //   superCentLat,
          //   superCentLng,
          //   sortedCents[i]!.lat,
          //   sortedCents[i]!.lng,
          // );

          const dist = getDistFromTwoGeoLoc({
            aLat: superCentLat,
            aLng: superCentLng,
            bLat: sortedCents[i]!.lat,
            bLng: sortedCents[i]!.lng,
          });
          if (maxDistance < dist) maxDistance = dist;
        }
        return maxDistance;
      };

      let accCnt = 0;
      let accLat = 0;
      let accLng = 0;

      let prevIdx = 0;
      const superCentroids = superClusterMap.reduce<SuperCentroid[]>(
        (acc, cur, i) => {
          if (i > 0 && cur === true) {
            const avgLat = accLat / accCnt;
            const avgLng = accLng / accCnt;
            acc.push({
              transitionIdx: prevIdx,
              superCent: {
                lat: avgLat,
                lng: avgLng,
                num: accCnt,
                maxDistance: getMaxDistance(avgLat, avgLng, prevIdx, i),
              },
            });
            prevIdx = i;

            accLat = 0;
            accLng = 0;
            accCnt = 0;
          }

          accLat += sortedCents[i]!.lat;
          accLng += sortedCents[i]!.lng;
          accCnt += 1;

          if (i === superClusterMap.length - 1) {
            const avgLat = accLat / accCnt;
            const avgLng = accLng / accCnt;
            acc.push({
              transitionIdx: prevIdx,
              superCent: {
                lat: avgLat,
                lng: avgLng,
                num: accCnt,
                maxDistance: getMaxDistance(avgLat, avgLng, prevIdx, i),
              },
            });
          }

          return acc;
        },
        [],
      );

      ctx.spotClusterRes!.superCentroids = superCentroids;
      ctx.spotClusterRes!.superClusterMap = superClusterMap;
      ctx.spotClusterRes!.validCentNSpots = /// 수퍼 클러스터링 결과에 따라 호텔 검색할 부분만 transitionNo를 재부여
        (() => {
          let transitionNoCnt = -1;
          return ctx.spotClusterRes!.validCentNSpots.map((v, i) => {
            const r = {
              ...v,
              // centroidNHotel: {
              //   ...v.centroidNHotel,
              // },
            };
            if (superClusterMap[i]) {
              transitionNoCnt += 1;
              r.centroidNHotel.transitionNo = transitionNoCnt;
              return r;
            }
            r.centroidNHotel.transitionNo = transitionNoCnt;
            return v;
          });
        })();
    })();

    ctx.hotels = [...hWithoutData];
  })(); /// end of hotel srch part

  /// visitSchedules 생성중 validCentNSpots.nearbyFoods, validCentNSpots.nearbySpots의 구성에 변경이 가해져 원본 유지를 위해 백업함
  const backupValidCentNSpots = [
    ...ctx.spotClusterRes!.validCentNSpots.map(v => {
      return {
        centroidNHotel: {
          cent: v.centroidNHotel.cent
            ? { ...v.centroidNHotel.cent }
            : undefined,
          ...v.centroidNHotel,
        },
        /// 푸드 클러스터링 절차 삭제 테스트
        nearbyFoods: [...v.nearbyFoods],
        nearbySpots: [...v.nearbySpots],
      };
    }),
  ];

  trackRecord = moment().diff(stopWatch, 'ms').toString();
  console.log(
    `[!!! determining visit order End !!!]: duration: ${trackRecord}ms`,
  );

  console.log(`\n\n[8. visitSchedule 데이터 생성 (DB x)]`);
  stopWatch = moment();
  /// 여행일수에 따른 visitSchedule 배열 생성
  const visitSchedules = (() => {
    /// 직전 위치와 가까운 순서대로 정렬

    let clusterNo = 0; /// 스케쥴 생성루프에서 참조해야할 군집번호
    let acc = ctx.spotClusterRes!.validCentNSpots[0].centroidNHotel.stayPeriod!; /// 일자별 루프에서 해당 일자에서 참조해야할 군집 번호를 파악하기 위해 현재까지 거쳐온 군집배열마다 머무를 일수를 누적시켜 놓은 값. dayNo와 비교하여 이 값보다 크면 다음 군집 번호로 넘어가고 이 값에 더하여 누적한 값으로 업데이트한다.
    let curRestSpot =
      ctx.spotClusterRes!.validCentNSpots[0].centroidNHotel
        .numOfVisitSpotInCluster!;
    let curRestDay =
      ctx.spotClusterRes!.validCentNSpots[0].centroidNHotel.stayPeriod!;
    const copiedFoods = isNil(ctx.foods) ? [] : [...ctx.foods];
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

        const validCent = ctx.spotClusterRes!.validCentNSpots![clusterNo];

        return {
          // planType: 'MIN' as PlanType,
          dayNo,
          transitionNo: validCent.centroidNHotel.transitionNo,
          stayPeriod: validCent.centroidNHotel.stayPeriod,
          checkin: validCent.centroidNHotel.checkin,
          checkout: validCent.centroidNHotel.checkout,
          titleList: tmpArr
            .map((v, orderNo) => {
              const curResources =
                ctx.spotClusterRes!.validCentNSpots![clusterNo];

              const { nearbySpots, nearbyFoods } = curResources;
              let ret: Partial<IVisitOneSchedule> = {
                orderNo,
              };

              /// 하루일정중 첫번째는 언제나 숙소이다.
              if (
                orderNo === 0
                // || orderNo === tmpArr.length - 1
              ) {
                const centNHotel = curResources.centroidNHotel;
                ret = {
                  ...ret,
                  placeType: 'HOTEL',
                  cent: centNHotel.cent,
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
                /// 푸드 클러스터링 절차 삭제 테스트
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

                /// 레스토랑
                if (nextMealOrder === orderNo) {
                  const { idx } = copiedFoods.reduce<{
                    idx: number;
                    dist: number;
                  }>(
                    (min, n: TourPlaceGeoLoc, index) => {
                      const { lat, lng } = n;
                      const newDist = getDistFromTwoGeoLoc({
                        aLat: lat,
                        aLng: lng,
                        bLat: prevGeoLoc.lat,
                        bLng: prevGeoLoc.lng,
                      });
                      if (newDist < min.dist)
                        return { dist: newDist, idx: index };

                      return min;
                    },
                    { idx: -1, dist: 9999999999 },
                  );
                  const food = copiedFoods.splice(idx, 1);

                  // copiedFoods.sort((a, b) => {
                  //   const prevGeoLocFromA = getDistFromTwoGeoLoc({
                  //     aLat: a.lat!,
                  //     aLng: a.lng!,
                  //     bLat: prevGeoLoc.lat,
                  //     bLng: prevGeoLoc.lng,
                  //   });

                  //   const prevGeoLocFromB = getDistFromTwoGeoLoc({
                  //     aLat: b.lat!,
                  //     aLng: b.lng!,
                  //     bLat: prevGeoLoc.lat,
                  //     bLng: prevGeoLoc.lng,
                  //   });
                  //   return prevGeoLocFromA - prevGeoLocFromB;
                  // });

                  // const food = copiedFoods.shift();

                  if (isNil(food) || isEmpty(food)) {
                    return null;
                  }
                  [data] = food;
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
  ctx.spotClusterRes!.validCentNSpots = backupValidCentNSpots;
  trackRecord = moment().diff(stopWatch, 'ms').toString();
  console.log(
    `[!!! 8. visitSchedule 데이터 생성 (DB x) End !!!]: duration: ${trackRecord}ms`,
  );

  console.log(
    `\n\n[9. visitSchedule spots 데이터들을 DB 재검색을 통해 IBTravelTag, photos와 조인한 결과로 교체]`,
  );
  stopWatch = moment();
  const tourPlacesFromVS = ctx.visitSchedules
    .map(vs => {
      return vs.titleList.map(tl => {
        return tl.placeType !== 'HOTEL' && tl.data ? tl.data[0] : null;
      });
    })
    .flat(2)
    .filter(
      (
        v,
      ): v is Partial<TourPlace> & {
        photos: Partial<IBPhotos>[];
        ibTravelTag: Partial<IBTravelTag>[];
      } => v !== null,
    );

  const tourPlaceWithTagNPhotos = await prisma.tourPlace.findMany({
    where: {
      id: {
        in: tourPlacesFromVS.map(v => v.id!),
      },
    },
    select: {
      id: true,
      ibTravelTag: {
        select: {
          value: true,
          minDifficulty: true,
          maxDifficulty: true,
        },
      },
      photos: true,
    },
  });
  tourPlacesFromVS.forEach((t, index) => {
    // if (tourPlacesFromVS[index].id !== tourPlaceWithTagNPhotos[index].id) {
    //   console.log(`matching Error`);
    //   return;
    // }

    const matchedTP = tourPlaceWithTagNPhotos.find(v => v.id === t.id);

    tourPlacesFromVS[index].photos = matchedTP!.photos;
    tourPlacesFromVS[index].ibTravelTag = matchedTP!.ibTravelTag;
  });
  trackRecord = moment().diff(stopWatch, 'ms').toString();
  console.log(
    `[!!! 9. visitSchedule spots 데이터들을 DB 재검색을 통해 IBTravelTag, photos와 조인한 결과로 교체 End !!!]: duration: ${trackRecord}ms 재검색 TourPlace: `,
    tourPlaceWithTagNPhotos.length,
  );

  console.log(`\n\n[10. create QueryParams to DB]`);
  stopWatch = moment();
  /// QueryParams, tourPlace, visitSchedule DB 생성
  const queryParams = await prisma.$transaction(async tx => {
    const createdQueryParams = await tx.queryParams.create({
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
        // /// 성능이슈로 필수가 아닌 queryParams_tourPlace 관계 데이터 생성은 제거
        // tourPlace: {
        //   connect: [
        //     /// getHotelList api에서 호텔 쿼리 후 결과를 추가하도록 할것.
        //     // ...(() => {
        //     //   const result = ctx
        //     //     .hotels!.map(c => {
        //     //       const hotelIds = c.hotels.hotelSearchResult
        //     //         .map(h => {
        //     //           if (h.id)
        //     //             return {
        //     //               id: h.id,
        //     //             };
        //     //           return undefined;
        //     //         })
        //     //         .filter((x): x is { id: number } => x !== undefined);
        //     //       return hotelIds;
        //     //     })
        //     //     .flat();
        //     //   return result;
        //     // })(),
        //     ...ctx.foods!.map(v => {
        //       return { id: v.id };
        //     }),
        //     ...ctx.spots!.map(v => {
        //       return { id: v.id };
        //     }),
        //   ],
        // },
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
                    // planType: v.planType,
                    placeType: t.placeType!,
                    transitionNo: v.transitionNo,
                    stayPeriod: v.stayPeriod,
                    checkin: v.checkin,
                    checkout: v.checkout,
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
            totalHotelSearchCount:
              ctx.hotels![0].hotels?.hotelSearchResult.length,
            totalRestaurantSearchCount: ctx.foods!.length,
            totalSpotSearchCount: ctx.spots!.length,
            spotPerDay: ctx.spotPerDay,
            mealPerDay: ctx.mealPerDay,
            mealSchedule: new MealOrder().mealOrder.toString(),
            travelNights: ctx.travelNights,
            travelDays: ctx.travelDays,
            hotelTransition: ctx.hotelTransition,
            transitionTerm: ctx
              .spotClusterRes!.validCentNSpots!.map(
                v => v.centroidNHotel.stayPeriod!,
              )
              .toString(),
          },
        },
        validCluster: {
          create: ctx.spotClusterRes?.validCentNSpots!.map(v => {
            return {
              lat: v.centroidNHotel.cent?.lat!,
              lng: v.centroidNHotel.cent?.lng!,
              transitionNo: v.centroidNHotel.transitionNo!,
              stayPeriod: v.centroidNHotel.stayPeriod!,
              checkin: v.centroidNHotel.checkin!,
              checkout: v.centroidNHotel.checkout!,
              numOfVisitSpotInCluster:
                v.centroidNHotel.numOfVisitSpotInCluster!,
              ratio: v.centroidNHotel.ratio!,
              tourPlace: {
                connect: [
                  /// 푸드 클러스터링 절차 삭제 테스트
                  ...v.nearbyFoods.map(n => {
                    return { id: n.id };
                  }),
                  ...v.nearbySpots.map(n => {
                    return { id: n.id };
                  }),
                ],
              },
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
        validCluster: true,
      },
    });
    trackRecord = moment().diff(stopWatch, 'ms').toString();
    console.log(
      `[!!! 10. create QueryParams to DB End !!!]: duration: ${trackRecord}ms`,
    );
    const { validCluster, visitSchedule } = createdQueryParams;

    const hotelVS = visitSchedule.filter(vs => vs.placeType!.includes('HOTEL'));
    /// visitSchedule <===> validCluster간 관계 형성
    let restStayPeriod = 0;
    let clusterIdx = -1;
    console.log(`\n\n[11. update visitSchedule to DB]`);
    stopWatch = moment();
    await Promise.all(
      hotelVS.map(vs => {
        if (restStayPeriod <= 0) {
          restStayPeriod = Number(vs.stayPeriod);
          clusterIdx += 1;
        }
        restStayPeriod -= 1;
        return tx.visitSchedule.update({
          where: {
            id: vs.id,
          },
          data: {
            validCluster: {
              connect: {
                id: validCluster[clusterIdx].id,
              },
            },
          },
        });
      }),
    );

    trackRecord = moment().diff(stopWatch, 'ms').toString();
    console.log(
      `[!!! 11. update visitSchedule to DB End !!!]: duration: ${trackRecord}ms`,
    );
    return createdQueryParams;
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
              title: !isNil(t.data) ? t.data[0].title : '',
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
          tourPlace: {
            include: {
              photos: true,
            },
          },
        },
      },
      metaScheduleInfo: true,
    },
  });

  if (isEmpty(queryParams))
    throw new IBError({
      type: 'NOTMATCHEDDATA',
      message: 'queryParamsId에 해당하는 데이터가 존재하지 않습니다.',
    });

  const retValue = await queryParams.visitSchedule.reduce(
    visitScheduleToDayScheduleType,
    Promise.resolve([] as DayScheduleType[]),
  );

  return {
    ...omit(queryParams, 'visitSchedule'),
    metaScheduleInfo: queryParams.metaScheduleInfo!,
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
      metaScheduleInfo: true,
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
        startDate: q.startDate ?? '',
        endDate: q.endDate ?? '',
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
  const { title, keyword, planType, queryParamsId, startDate, endDate } = param;
  const userTokenId = ctx?.userTokenId ?? '';

  const queryParams = await prisma.queryParams.findFirst({
    where: {
      id: Number(queryParamsId),
    },
    select: {
      id: true,
      period: true,
      startDate: true,
      endDate: true,
      savedSchedule: {
        select: {
          id: true,
        },
      },
      visitSchedule: true,
      userTokenId: true,
    },
  });

  if (!queryParams) {
    throw new IBError({
      type: 'NOTEXISTDATA',
      message: 'scheduleHash에 대응하는 일정 데이터가 존재하지 않습니다.',
    });
  }

  if (queryParams.userTokenId !== userTokenId) {
    throw new IBError({
      type: 'NOTAUTHORIZED',
      message: '다른 유저의 스케쥴에 저장을 시도할 수 없습니다.',
    });
  }

  if (queryParams.savedSchedule?.id) {
    throw new IBError({
      type: 'DUPLICATEDDATA',
      message: '이미 저장한 일정입니다.',
    });
  }
  const mStartDate = moment(startDate).startOf('d');
  const mEndDate = moment(endDate).startOf('d');

  if (mEndDate.diff(mStartDate, 'd') !== queryParams.period) {
    throw new IBError({
      type: 'INVALIDPARAMS',
      message: 'period 값과 startDate, endDate 사이 기간이 다릅니다.',
    });
  }

  const createResult = await prisma.$transaction(async tx => {
    const diffDate = mStartDate.diff(
      moment(queryParams.visitSchedule[0].checkin),
      'd',
    );
    /// queryParams의 전체 일정 날짜를 유저 입력 날짜들로 업데이트해준다.
    await tx.queryParams.update({
      where: {
        id: Number(queryParamsId),
      },
      data: {
        startDate,
        endDate,
      },
    });

    /// visitSchedule도 기존에 임시 생성되어 있던 각 스케쥴별 날짜를 유저 입력 날짜들로 업데이트해준다.
    const { visitSchedule: visitSchedules } = queryParams;
    await Promise.all(
      visitSchedules.map(async vs => {
        const visitSchedule = await tx.visitSchedule.findUnique({
          where: {
            id: vs.id,
          },
          select: {
            checkin: true,
            checkout: true,
          },
        });

        await tx.visitSchedule.update({
          where: {
            id: vs.id,
          },
          data: {
            checkin: moment(visitSchedule!.checkin)
              .add(diffDate, 'd')
              .toISOString(),
            checkout: moment(visitSchedule!.checkout)
              .add(diffDate, 'd')
              .toISOString(),
          },
        });
        return null;
      }),
    );

    const cRes = await tx.scheduleBank.create({
      data: {
        title,
        thumbnail:
          'https://www.lottehotel.com/content/dam/lotte-hotel/lotte/jeju/overview/introduction/g-0807.jpg.thumb.768.768.jpg',
        planType: planType.toUpperCase() as PlanType,
        ...(!isNil(keyword) && {
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
        }),
        userTokenId,
        queryParams: {
          connect: {
            id: queryParams.id,
          },
        },
      },
    });
    return cRes;
  });

  return { queryParamsId: createResult.queryParamsId.toString() };
};

/**
 * 저장된 일정을 지우는 기능을 담당하는 api
 * queryParamsId와 관계된 일체가 삭제된다. (visitSchedule, scheduleBank, metaScheduleInfo, validCluster) tourPlace는 삭제 안됨
 */
export const delSchedule = async (
  param: DelScheduleREQParam,
  ctx?: IBContext,
): Promise<void> => {
  const { queryParamsId } = param;
  const userTokenId = ctx?.userTokenId ?? '';

  const queryParams = await prisma.queryParams.findFirst({
    where: {
      id: Number(queryParamsId),
    },
    select: {
      id: true,
      savedSchedule: {
        select: {
          id: true,
        },
      },
      userTokenId: true,
    },
  });

  if (!queryParams) {
    throw new IBError({
      type: 'NOTEXISTDATA',
      message: 'queryParamsId에 대응하는 일정 데이터가 존재하지 않습니다.',
    });
  }

  if (queryParams.userTokenId !== userTokenId) {
    throw new IBError({
      type: 'NOTAUTHORIZED',
      message: '다른 유저의 저장 스케쥴의 삭제를 시도할 수 없습니다.',
    });
  }

  if (isNil(queryParams.savedSchedule)) {
    throw new IBError({
      type: 'INVALIDSTATUS',
      message: '저장되지 않은 일정입니다.',
    });
  }

  await prisma.queryParams.delete({
    where: {
      id: Number(queryParamsId),
    },
  });
};

/**
 * 생성된 스케쥴 이름 변경
 */
export const changeScheduleTitle = async (
  param: ChangeScheduleTitleREQParam,
  ctx?: IBContext,
): Promise<ChangeScheduleTitleRETParamPayload> => {
  const { queryParamsId, title } = param;
  const userTokenId = ctx?.userTokenId ?? '';

  const queryParams = await prisma.queryParams.findFirst({
    where: {
      id: Number(queryParamsId),
    },
    select: {
      id: true,
      savedSchedule: {
        select: {
          id: true,
        },
      },
      userTokenId: true,
    },
  });

  if (!queryParams) {
    throw new IBError({
      type: 'NOTEXISTDATA',
      message: 'queryParamsId에 대응하는 일정 데이터가 존재하지 않습니다.',
    });
  }

  if (queryParams.userTokenId !== userTokenId) {
    throw new IBError({
      type: 'NOTAUTHORIZED',
      message: '다른 유저의 저장 스케쥴에 변경을 시도할 수 없습니다.',
    });
  }

  if (isNil(queryParams.savedSchedule)) {
    throw new IBError({
      type: 'INVALIDSTATUS',
      message: '저장되지 않은 일정입니다.',
    });
  }

  const uRes = await prisma.scheduleBank.update({
    where: {
      id: Number(queryParams.savedSchedule.id),
    },
    data: {
      title,
    },
  });

  return { updatedScheduleBank: uRes };
};

/**
 * 생성된 스케쥴의 하루 일정 요청 api
 * 스케쥴에서 지정된 날짜의 데일리 계획을 조회 요청한다.
 */
export const getDaySchedule = async (
  param: GetDayScheduleREQParam,
): Promise<GetDayScheduleRETParamPayload> => {
  const { queryParamsId, day } = param;

  const queryParams = await prisma.queryParams.findFirst({
    where: {
      id: Number(queryParamsId),
    },
    include: {
      visitSchedule: {
        where: {
          dayNo: { equals: Number(day) },
          // planType: { equals: planType.toUpperCase() as PlanType },
        },
        include: {
          tourPlace: {
            include: {
              // gl_photos: true,
              photos: true,
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
    spotList: await Promise.all(
      queryParams.visitSchedule.map(async v => {
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
            contact: 'none',
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
            photos: [
              {
                url: hotel.bkc_main_photo_url ?? 'none',
              },
            ],
          };
        }

        /// NOT Hotel place
        const { tourPlace } = v;
        return {
          id: v.id.toString(), /// visitScheduleId
          spotType: vType as string,
          previewImg: await getThumbnailUrlFromIBPhotos(tourPlace.photos),

          spotName: tourPlace.title ?? 'none',
          spotAddr: tourPlace.address ?? tourPlace.roadAddress ?? 'none',
          // placeId: tourPlace.gl_place_id ?? 'none',
          contact: tourPlace.contact ?? 'none',
          startDate: v.checkin ? moment(v.checkin).format('YYYY-MM-DD') : '',
          endDate: v.checkout ? moment(v.checkout).format('YYYY-MM-DD') : '',
          night: night ?? -1,
          days: days ?? -1,
          // price: tourPlace.gl_price_level?.toString(),
          rating: tourPlace.rating ?? 0,
          lat: tourPlace.lat,
          lng: tourPlace.lng,
          imageList: [],
          photos: await getImgUrlListFromIBPhotos(tourPlace.photos),
        };
      }),
    ),
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
          // gl_photos: true,
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
          // planType: visitSchedule.planType,
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
          photos: [
            ...hotelPhotos.map(v => {
              return {
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

      const { tourPlace } = visitSchedule;
      return {
        id: visitSchedule.id.toString(),
        dayCount: visitSchedule.dayNo,
        orderCount: visitSchedule.orderNo,
        // planType: visitSchedule.planType,
        spotType: tourPlaceType,
        previewImg: await getThumbnailUrlFromIBPhotos(tourPlace.photos),
        spotName: tourPlace.title,
        roomType: null,
        spotAddr: tourPlace.address ?? 'none',
        hotelBookingUrl: null,
        placeId: 'none',
        // placeId: tourPlace.vj_contentsid ?? 'none',
        startDate: moment(visitSchedule.checkin).format('YYYY-MM-DD') ?? null,
        endDate: moment(visitSchedule.checkout).format('YYYY-MM-DD') ?? null,
        night: visitSchedule.queryParams?.metaScheduleInfo?.travelNights ?? -1,
        days: visitSchedule.queryParams?.metaScheduleInfo?.travelDays ?? -1,
        checkIn: null,
        checkOut: null,
        price: null,
        priceLevel: null,
        rating: null,
        lat: tourPlace.lat,
        lng: tourPlace.lng,
        hotelClass: null,
        website: null,
        language: null,
        cityNameEN: null,
        photos: await getImgUrlListFromIBPhotos(tourPlace.photos),
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
          photos: true,
        },
      },
    },
  });

  if (isNil(queryParams)) {
    throw new IBError({
      type: 'NOTEXISTDATA',
      message: `존재하지 않는 queryParamsId입니다.`,
    });
  }

  const retValue: GetCandidateScheduleRETParamPayload = await (async () => {
    const candidateList = (
      await Promise.all(
        queryParams?.tourPlace.map(async tp => {
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
              contact: 'none',
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
          // if (vType.includes('GL_')) {
          //   const googlePlace = tp;
          //   return {
          //     id: tp.id.toString(),
          //     spotType: vType as string,
          //     previewImg:
          //       googlePlace.gl_photos.length > 0 && googlePlace.gl_photos[0].url
          //         ? googlePlace.gl_photos[0].url
          //         : 'none',
          //     spotName: googlePlace.gl_name ?? 'none',
          //     spotAddr:
          //       googlePlace.gl_vicinity ??
          //       googlePlace.gl_formatted_address ??
          //       'none',
          //     // contact: 'none',
          //     placeId: googlePlace.gl_place_id ?? 'none',
          //     // startDate: tp.checkin
          //     //   ? moment(tp.checkin).format('YYYY-MM-DD')
          //     //   : '',
          //     // endDate: tp.checkout
          //     //   ? moment(tp.checkout).format('YYYY-MM-DD')
          //     //   : '',
          //     // night,
          //     // days,
          //     price: googlePlace.gl_price_level?.toString(),
          //     rating: googlePlace.gl_rating ?? undefined,
          //     lat: googlePlace.gl_lat ?? -1,
          //     lng: googlePlace.gl_lng ?? -1,
          //     imageList: googlePlace.gl_photos.map(p => {
          //       return {
          //         id: p.id.toString(),
          //         photo_reference: p.photo_reference,
          //       };
          //     }),
          //   };
          // }

          // if (vType.includes('VISITJEJU_')) {
          //   const visitJejuPlace = tp;
          //   return {
          //     id: tp.id.toString(),
          //     spotType: vType as string,
          //     previewImg: 'none',
          //     spotName: visitJejuPlace.vj_title ?? 'none',
          //     spotAddr: visitJejuPlace.vj_address ?? 'none',
          //     // contact: 'none',
          //     placeId: visitJejuPlace.vj_contentsid ?? 'none',
          //     // startDate: tp.checkin
          //     //   ? moment(tp.checkin).format('YYYY-MM-DD')
          //     //   : '',
          //     // endDate: tp.checkout
          //     //   ? moment(tp.checkout).format('YYYY-MM-DD')
          //     //   : '',
          //     // night,
          //     // days,
          //     lat: visitJejuPlace.vj_latitude ?? -1,
          //     lng: visitJejuPlace.vj_longitude ?? -1,
          //   };
          // }

          /// Not Hotel Place
          return {
            id: tp.id.toString(),
            spotType: vType as string,
            previewImg: await getThumbnailUrlFromIBPhotos(tp.photos),
            spotName: tp.title ?? 'none',
            spotAddr: tp.address ?? tp.roadAddress ?? 'none',
            // placeId: tp.gl_place_id ?? 'none',
            contact: 'none',
            // startDate: tp.checkin
            //   ? moment(tp.checkin).format('YYYY-MM-DD')
            //   : '',
            // endDate: tp.checkout
            //   ? moment(tp.checkout).format('YYYY-MM-DD')
            //   : '',
            // night,
            // days,
            // price: tp.gl_price_level?.toString(),
            rating: tp.rating ?? 0,
            lat: tp.lat ?? -1,
            lng: tp.lng ?? -1,
            imageList: await getImgUrlListFromIBPhotos(tp.photos),
          };
        }),
      )
    ).filter(v => v !== undefined) as BriefScheduleType[];
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
      photos: true,
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
          photos: hotelPhotos.map(v => {
            return {
              url: v.url_max,
            };
          }),
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

      return {
        id: tourPlace.id.toString(),
        spotType: tourPlaceType,
        previewImg: await getThumbnailUrlFromIBPhotos(tourPlace.photos),
        spotName: tourPlace.title,
        roomType: null,
        spotAddr: tourPlace.address ?? 'none',
        hotelBookingUrl: null,
        placeId: 'none',
        startDate: null,
        endDate: null,
        night: null,
        days: null,
        checkIn: null,
        checkOut: null,
        price: null,
        priceLevel: null,
        rating: null,
        lat: tourPlace.lat,
        lng: tourPlace.lng,
        hotelClass: null,
        website: null,
        language: null,
        cityNameEN: null,
        imageList: [],
        photos: await getImgUrlListFromIBPhotos(tourPlace.photos),
        contact: null,
        weekdayOpeningHours: null,
        reviews: null,
        takeout: null,
        googlePlaceTypes: null,
        url: null,
        userRatingsTotal: null,
        reviewScoreWord: null,
      };
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
      validCluster: true,
      tourPlace: {
        where: {
          tourPlaceType: 'BKC_HOTEL',
        },
      },
    },
  });

  if (isEmpty(queryParams))
    throw new IBError({
      type: 'NOTMATCHEDDATA',
      message: 'queryParamsId에 해당하는 데이터가 존재하지 않습니다.',
    });

  if (isNil(transitionNo) || isEmpty(transitionNo)) {
    throw new IBError({
      type: 'INVALIDPARAMS',
      message: 'transitionNo는 필수 파라미터입니다',
    });
  }

  const {
    adult,
    maxFriend,
    companion,
    familyOpt,
    period,
    // roomNumber,
    // startDate,
    // endDate,
    validCluster,
  } = queryParams;

  const { childrenNumber, childrenAges, roomNumber } = getBKCHotelSrchOpts({
    companion: companion!,
    familyOpt: familyOpt!.split(','),
    maxFriend: maxFriend!.toString(),
    period: period!.toString(),
  });

  let prevTransitionNo = 0;
  let curCheckin = new Date();
  let curCheckout = new Date();
  let stayPeriod = 0;
  let ratio = 0;
  let numOfVisitSpotInCluster = 0;
  let sumLat = 0;
  let sumLng = 0;
  let cnt = 0;

  const withHMetaData = validCluster
    .map((cluster, idx) => {
      if (idx === 0) {
        curCheckin = cluster.checkin;
        curCheckout = cluster.checkout;
        stayPeriod = cluster.stayPeriod;
        ratio = cluster.ratio;
        numOfVisitSpotInCluster = cluster.numOfVisitSpotInCluster;
        sumLat = cluster.lat;
        sumLng = cluster.lng;
        cnt = 1;
        // return null;
      }

      if (idx + 1 <= validCluster.length - 1) {
        const nextCluster = validCluster[idx + 1];

        if (nextCluster.transitionNo === prevTransitionNo) {
          curCheckout = nextCluster.checkout;
          stayPeriod += nextCluster.stayPeriod;
          ratio += nextCluster.ratio;
          numOfVisitSpotInCluster += nextCluster.numOfVisitSpotInCluster;
          sumLat += nextCluster.lat;
          sumLng += nextCluster.lng;
          cnt += 1;
          return null;
        }

        const avgLat = sumLat / cnt;
        const avgLng = sumLng / cnt;
        const metaData = {
          checkin: curCheckin,
          checkout: curCheckout,
          stayPeriod,
          ratio,
          numOfVisitSpotInCluster,
          transitionNo: prevTransitionNo,
          lat: avgLat,
          lng: avgLng,
        };
        prevTransitionNo = nextCluster.transitionNo;

        const hotelSrchOpt = {
          orderBy: 'distance',
          adultsNumber: adult!,
          roomNumber,
          checkinDate: moment(curCheckin).toISOString(),
          checkoutDate: moment(curCheckout).toISOString(),
          filterByCurrency: 'KRW',
          latitude: avgLat.toString(),
          longitude: avgLng.toString(),
          pageNumber: 0,
          includeAdjacency: false,
          childrenAges,
          childrenNumber,
          categoriesFilterIds: ['property_type::204'],
          // randNum: centGeo.randNum, /// !! makeCluster단계에서 생성된 클러스터들을 랜덤하게 섞기 위해 참조했던 랜덤 변수값. 아래에서 수행될 각 클러스터별 numOfVisitSpotInCluster와 stayPeriod 결정중에 numOfSpotInCluster / stayPeriod 반올림과정에서 numOfNrbySpot 가 많은 순으로 수행되지 않으면 오차가 뒤로 갈수록 점점 커져 restSpot이 부족해지는 현상이 나타나는데 이를 방지하기 위해 일시적으로 다시 보유한 스팟순으로 정렬했다가 다시 랜덤하게 섞어주기 위해 쓰인다.
        } as BKCSrchByCoordReqOpt;

        curCheckin = nextCluster.checkin;
        curCheckout = nextCluster.checkout;
        stayPeriod = nextCluster.stayPeriod;
        ratio = nextCluster.ratio;
        numOfVisitSpotInCluster = nextCluster.numOfVisitSpotInCluster;
        sumLat = nextCluster.lat;
        sumLng = nextCluster.lng;
        cnt = 1;

        return {
          ...metaData,
          hotelSrchOpt,
        };
      }

      /// 수퍼 클러스터의 마지막 호텔 검색 메타 데이터 처리
      const avgLat = sumLat / cnt;
      const avgLng = sumLng / cnt;
      const metaData = {
        checkin: curCheckin,
        checkout: curCheckout,
        stayPeriod,
        ratio,
        numOfVisitSpotInCluster,
        transitionNo: prevTransitionNo,
        lat: avgLat,
        lng: avgLng,
      };
      const hotelSrchOpt = {
        orderBy: 'distance',
        adultsNumber: adult!,
        roomNumber,
        checkinDate: moment(curCheckin).toISOString(),
        checkoutDate: moment(curCheckout).toISOString(),
        filterByCurrency: 'KRW',
        latitude: avgLat.toString(),
        longitude: avgLng.toString(),
        pageNumber: 0,
        includeAdjacency: false,
        childrenAges,
        childrenNumber,
        categoriesFilterIds: ['property_type::204'],
        // randNum: centGeo.randNum, /// !! makeCluster단계에서 생성된 클러스터들을 랜덤하게 섞기 위해 참조했던 랜덤 변수값. 아래에서 수행될 각 클러스터별 numOfVisitSpotInCluster와 stayPeriod 결정중에 numOfSpotInCluster / stayPeriod 반올림과정에서 numOfNrbySpot 가 많은 순으로 수행되지 않으면 오차가 뒤로 갈수록 점점 커져 restSpot이 부족해지는 현상이 나타나는데 이를 방지하기 위해 일시적으로 다시 보유한 스팟순으로 정렬했다가 다시 랜덤하게 섞어주기 위해 쓰인다.
      } as BKCSrchByCoordReqOpt;
      return {
        ...metaData,
        hotelSrchOpt,
      };
    })
    .filter(v => v);

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

  const tNo = Number(transitionNo);
  const matchedHotelNMetaData = withHMetaData.find(
    v => v!.transitionNo === tNo,
  );
  return {
    checkin: moment(matchedHotelNMetaData!.checkin).toISOString(),
    checkout: moment(matchedHotelNMetaData!.checkout).toISOString(),
    transitionNo: matchedHotelNMetaData!.transitionNo,
    stayPeriod: matchedHotelNMetaData!.stayPeriod,
    lat: matchedHotelNMetaData!.lat,
    lng: matchedHotelNMetaData!.lng,
    hotels: await (async () => {
      if (!isNil(queryParams.tourPlace) && queryParams.tourPlace.length > 0) {
        return {
          hotelSearchCount: queryParams.tourPlace.length,
          hotelSearchResult: queryParams.tourPlace,
        };
      }
      return getHotelDataFromBKC({
        ...matchedHotelNMetaData!.hotelSrchOpt,
        checkinDate: moment(matchedHotelNMetaData!.checkin).toISOString(),
        checkoutDate: moment(matchedHotelNMetaData!.checkout).toISOString(),
        store: true,
        queryParamsId: Number(queryParamsId),
      });
    })(),
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

/**
 * 저장된 내 스케쥴 수 반환
 */
export const getScheduleCount = async (
  ctx?: IBContext,
): Promise<GetScheduleCountRETParamPayload> => {
  const userTokenId = ctx?.userTokenId;

  const count = await prisma.queryParams.count({
    // skip: Number(skip),
    // take: Number(take),
    where: {
      userTokenId,
      savedSchedule: {
        NOT: [{ id: undefined }],
      },
    },
  });

  return { count };
};

/**
 * 생성된 일정기반 일자별 유저 호텔 선택 결과를 서버에 알리는 api
 * ex) ["5037","5037","5037","5037","5037", "5037","5037","5037","5037","5037", "5057","5057","5057","5077","5077" ]
 */
export const fixHotel = async (
  param: FixHotelREQParam,
): Promise<FixHotelRETParamPayload> => {
  const { queryParamsId, hotelPerDay: inputHotelPerDay } = param;
  const hotelPerDay = inputHotelPerDay;

  if (isNil(queryParamsId) || isEmpty(queryParamsId)) {
    throw new IBError({
      type: 'INVALIDPARAMS',
      message: 'queryParamsId는 필수 파라미터입니다',
    });
  }

  const queryParams = await prisma.queryParams.findUnique({
    where: {
      id: Number(queryParamsId),
    },
    select: {
      period: true,
      validCluster: true,
    },
  });

  if (isNil(queryParams)) {
    throw new IBError({
      type: 'NOTEXISTDATA',
      message: 'queryParamsId에 해당하는 생성된 일정이 없습니다.',
    });
  }

  if (
    isNil(hotelPerDay) ||
    isEmpty(hotelPerDay) ||
    hotelPerDay.length < queryParams.period! - 1
  ) {
    throw new IBError({
      type: 'INVALIDPARAMS',
      message:
        'hotelPerDay 가 파라미터는 string[] 형태로 반드시 제공되어야 합니다.',
    });
  }

  /// 생성할때 잡힌 여행일수 - 1보다(여행 마지막날은 숙소 없음) 제공된 파라미터의 숙소값 수가 적으면 에러
  if (hotelPerDay.length < queryParams.period! - 1) {
    throw new IBError({
      type: 'INVALIDPARAMS',
      message:
        'hotelPerDay는 여행일수(period)-1 만큼 제공되어야 합니다. (마지막날은 숙소에 머물지 않기 때문)',
    });
  }

  /// hotelPerDay가 숙소가 필요한 날(마지막날은 숙소가 없으므로: period - 1) 보다 많이 제공된다면 필요한 만큼만 남기고 뒤에는 잘라버린다.
  if (hotelPerDay.length > queryParams.period!) {
    hotelPerDay.splice(
      queryParams.period!,
      hotelPerDay.length - queryParams.period!,
    );
  }

  /// 마지막 날 숙소는 사용하지 않기 때문에 의미가 없지만 프론트에서 편의상 일괄적으로 여행 마지막날을 전날의 숙소와 동일하게 맞춰달라는 요구가 있어서 처리함
  if (hotelPerDay.length === queryParams.period!) {
    hotelPerDay[hotelPerDay.length - 1] = hotelPerDay[hotelPerDay.length - 2];
  } else if (hotelPerDay.length === queryParams.period! - 1) {
    hotelPerDay.push(hotelPerDay[hotelPerDay.length - 1]);
  }

  const removedDup = (() => {
    let prevTpId = -1;
    return hotelPerDay.reduce<number[]>((acc, curTpId) => {
      if (Number(prevTpId) !== Number(curTpId)) {
        acc.push(Number(curTpId));
        prevTpId = Number(curTpId);
      }
      return acc;
    }, []);
  })();

  // const queryParams = await prisma.queryParams.findUnique({
  //   where: {
  //     id: Number(queryParamsId),
  //   },
  //   select: {
  //     validCluster: true,
  //   },
  // });

  const updateList = await prisma.$transaction(async tx => {
    let estimatedCost = 0;
    let validClusterId = -1;
    const retList = await Promise.all(
      hotelPerDay.map((tpId, dayNo) => {
        const promise = new Promise<VisitSchedule>(resolve => {
          // eslint-disable-next-line no-void
          void (async () => {
            const [vs] = await tx.visitSchedule.findMany({
              where: {
                queryParamsId: Number(queryParamsId),
                dayNo,
                placeType: {
                  contains: 'HOTEL',
                },
              },
              select: {
                id: true,
                validCluster: true,
              },
            });

            const transitionNo = removedDup.findIndex(v => v === Number(tpId));
            const updateRes = await tx.visitSchedule.update({
              where: {
                id: vs.id,
              },
              data: {
                tourPlaceId: Number(tpId),
                transitionNo, /// -1은 존재할수 없는 상태값이다.
              },
            });

            if (validClusterId !== vs.validCluster!.id) {
              validClusterId = vs.validCluster!.id;
              await tx.validCluster.update({
                where: {
                  id: validClusterId,
                },
                data: {
                  transitionNo,
                },
              });
            }

            const tp = await tx.tourPlace.findUnique({
              where: {
                id: Number(tpId),
              },
            });

            if (dayNo !== queryParams.period! - 1) {
              estimatedCost += tp?.bkc_gross_amount_per_night ?? 0;
            }

            resolve(updateRes);
          })();
        });

        return promise;
      }),
    );
    await tx.metaScheduleInfo.update({
      where: {
        queryParamsId: Number(queryParamsId),
      },
      data: {
        estimatedCost,
      },
    });

    return retList;
  });

  return { updateList };
};

/**
 * 기본 생성된 일정들중 특정 일자의 추천 리스트를 새로고침 요청하는 api
 * fixedList에 전달되는 각 VisitSchedule 들은 그대로 리턴되고
 * 나머지는 기존 검색되었던 장소 또는 음식점들중에 다른것으로 교체(DB에도 그대로 적용된 후 ) 반환된다.
 *
 * "남은일정 새로고침" 클릭시에 요청됨
 * https://www.figma.com/file/Tdpp5Q2J3h19NyvBvZMM2m/brip?node-id=407:2587&t=dh22WyIeTTDtUTxg-4
 */
export const refreshSchedule = async (
  param: RefreshScheduleREQParam,
): Promise<RefreshScheduleRETParamPayload> => {
  const { queryParamsId, dayNo, fixedList } = param;

  const qp = await prisma.queryParams.findUnique({
    where: {
      id: Number(queryParamsId),
    },
    include: {
      visitSchedule: {
        where: {
          dayNo: Number(dayNo),
        },
      },
      validCluster: true,
    },
  });
  if (isNil(qp)) {
    throw new IBError({
      type: 'NOTEXISTDATA',
      message: '존재하지 않는 queryParamsId입니다.',
    });
  }
  const { visitSchedule: vs, validCluster } = qp;

  const fixedVS = vs.filter(
    (
      v,
    ): v is VisitSchedule & {
      tourPlace: TourPlace | null;
    } => {
      if (v !== null && fixedList.includes(v.id.toString())) return true;
      return false;
    },
  );

  let accDayNo = 0;
  const targetClusterIdx = validCluster.findIndex(v => {
    const prevAccDayNo = accDayNo;
    accDayNo += v.stayPeriod;

    if (Number(dayNo) >= prevAccDayNo && Number(dayNo) < accDayNo) return true;
    return false;
  });

  const { tourPlace: tp } = (await prisma.validCluster.findUnique({
    where: {
      id: validCluster[targetClusterIdx].id,
    },
    select: {
      /// 조건으로 fixed VisitScheduleId에 해당하는 TourPlace는 후보에서 제외되도록 한다.
      tourPlace: {
        where: {
          id: {
            notIn: vs.map(v => {
              return Number(v.tourPlaceId);
            }),
          },
        },
      },
    },
  }))!;

  const spot = tp.filter(t => t.tourPlaceType.includes('SPOT'));
  const food = tp.filter(t => t.tourPlaceType.includes('RESTAURANT'));

  /// randomize
  const randomSpot = spot
    .map(v => {
      return {
        ...v,
        randomNum: Math.random(),
      };
    })
    .sort((a, b) => a.randomNum - b.randomNum);

  const randomFood = food
    .map(v => {
      return {
        ...v,
        randomNum: Math.random(),
      };
    })
    .sort((a, b) => a.randomNum - b.randomNum);

  const refreshedList = await prisma.$transaction(
    vs.map(v => {
      const letItBeVS = fixedVS.find(f => v.id === f.id);

      return prisma.visitSchedule.update({
        where: {
          id: v.id,
        },
        data: {
          tourPlaceId: (() => {
            if (letItBeVS) return letItBeVS.tourPlaceId; /// fixedList에 있는 항목이면 원래 tourPlaceId 그대로 둔다.

            /// 이 api에서 호텔은 refresh 대상이 아니다.
            if (v.placeType!.includes('HOTEL')) return v.tourPlaceId;

            return v.placeType!.includes('SPOT')
              ? randomSpot.shift()!.id
              : randomFood.shift()!.id;
          })(),
        },
        include: {
          tourPlace: {
            include: {
              photos: true,
            },
          },
        },
      });
    }),
  );

  const spotList: Pick<RefreshScheduleRETParamPayload, 'spotList'> = {
    spotList: await Promise.all(
      refreshedList.map(async v => {
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
            contact: 'none',
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
            photos: [
              {
                url: hotel.bkc_main_photo_url ?? 'none',
              },
            ],
          };
        }

        /// Not Hotel Place
        const { tourPlace } = v;
        return {
          id: v.id.toString(),
          spotType: vType as string,
          previewImg: await getThumbnailUrlFromIBPhotos(tourPlace.photos),
          spotName: tourPlace.title,
          spotAddr: tourPlace.address ?? tourPlace.roadAddress ?? 'none',
          // placeId: tourPlace.gl_place_id ?? 'none',
          contact: 'none',
          // startDate: tourPlace.checkin
          //   ? moment(tourPlace.checkin).format('YYYY-MM-DD')
          //   : '',
          // endDate: tourPlace.checkout
          //   ? moment(tourPlace.checkout).format('YYYY-MM-DD')
          //   : '',
          // night,
          // days,
          // price: tourPlace.gl_price_level?.toString(),
          rating: tourPlace.rating ?? 0,
          lat: tourPlace.lat,
          lng: tourPlace.lng,
          imageList: [],
          photos: await getImgUrlListFromIBPhotos(tourPlace.photos),
        };
      }),
    ),
  };

  const retValue: RefreshScheduleRETParamPayload = {
    id: queryParamsId,
    dayCount: Number(dayNo),
    contentsCountAll: spotList.spotList.length,
    spotList: spotList.spotList,
  };
  return retValue;
};

/**
 * fixHotel api를 통해 호텔들이 선택되면 MetaScheduleInfo에 저장된  산출된 비용을 반환함
 */
export const getEstimatedCost = async (
  param: GetEstimatedCostREQParam,
): Promise<GetEstimatedCostRETParamPayload> => {
  const { queryParamsId } = param;

  const metaScheduleInfo = await prisma.metaScheduleInfo.findUnique({
    where: {
      queryParamsId: Number(queryParamsId),
    },
    select: {
      estimatedCost: true,
    },
  });

  if (!metaScheduleInfo) {
    throw new IBError({
      type: 'NOTEXISTDATA',
      message: '존재하지 않는 queryParamsId 입니다.',
    });
  }
  const { estimatedCost } = metaScheduleInfo;

  return { estimatedCost: estimatedCost ?? 0 };
};
