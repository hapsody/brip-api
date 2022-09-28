import {
  SearchHotelRes,
  GglNearbySearchRes,
  QueryParams,
  Prisma,
  Gglgeometry,
} from '@prisma/client';
import { IBResFormat, getToday, getTomorrow } from '@src/utils';
import moment from 'moment';
import { isUndefined } from 'lodash';

export const mealPerDay = 2;
export const spotPerDay = 2;
export const minHotelBudgetPortion = 0.5;
export const midHotelBudgetPortion = 0.6;
export const maxHotelBudgetPortion = 0.7;
export const flexPortionLimit = 1.3;
// const hotelPerDay = 1;

export interface NearBySearchReqParams {
  keyword: string;
  location: {
    latitude: string; // 위도
    longitude: string; // 경도
  };
  radius: number;
  pageToken?: string;
  loadAll?: boolean; // 뒤에 있는 모든 페이지를 구글에 반복해서 쿼리하도록 요청함
}
export type Currency = 'USD' | 'KRW';

export type BookingComOrderBy =
  | 'popularity'
  | 'class_ascending'
  | 'class_descending'
  | 'distance'
  | 'upsort_bh'
  | 'review_score'
  | 'price';

export interface SearchHotelReqParams {
  orderBy: BookingComOrderBy; // default popularity
  adultsNumber: number;
  // units: 'metric';
  roomNumber?: number; // Number of rooms
  checkinDate: string; // '2022-09-30';
  checkoutDate: string; // '2022-10-01';
  filterByCurrency?: Currency; // default USD;
  // locale: 'en-us';
  latitude: string; // 위도좌표 ex) 21.4286856;
  longitude: string; // 경도 ex) -158.1389763;
  pageNumber?: number; // default 0;
  includeAdjacency?: boolean; // default false. Include nearby places. If there are few hotels in the selected location, nearby locations will be added. You should pay attention to the `primary_count` parameter - it is the number of hotels from the beginning of the array that matches the strict filter.
  childrenNumber?: number;
  childrenAges?: number[];
  categoriesFilterIds?: string[];
  mock?: boolean; // default true
}

export interface TravelType {
  // default { noIdea: true }
  landActivity?: boolean; // 육상 액티비티
  golf?: boolean;
  relaxation?: boolean; // 휴양
  resort?: boolean; // 리조트
  hotel?: boolean;
  oceanActivity?: boolean; // 해양 액티비티
  experience?: boolean; // 체험
  groupActivity?: boolean; // 그룹 액티비티
  learning?: boolean; // 교습
  shopping?: boolean; // 쇼핑
  waterPark?: boolean; // 워터파크
  visitTourSpot?: boolean; // 관광명소 방문
  packageTour?: boolean; // 패키지 투어
  nativeExperience?: boolean; // 현지 문화체험
  noIdea?: boolean; // 모르겠음
}

export interface QueryReqParams {
  // searchLocation?: string; // ex) o'ahu ex) seoul
  minBudget?: number; // ex) 4000000,
  maxBudget?: number; // ex) 5000000,
  currency: Currency; // "USD" | "KRW" default USD
  travelType: TravelType;
  travelIntensity?: number; // 여행강도 0~10 ex) 6; default 5
  travelStartDate: string; // 여행일정 시작일 ex) '2022-09-30T00:00:00' default today;
  travelEndDate: string; // 여행일정 종료일 ex) '2022-10-03T00:00:00' default today + 1;
  hotelTransition?: number; // 여행중 호텔을 바꾸는 횟수
  searchHotelReqParams: SearchHotelReqParams;
  nearbySearchReqParams: NearBySearchReqParams;
}

export type SearchedData = Omit<
  SearchHotelRes,
  | 'distance'
  | 'gross_amount'
  | 'included_taxes_and_charges_amount'
  | 'net_amount'
  | 'checkout'
  | 'checkin'
> & {
  distance: string;
  composite_price_breakdown: {
    product_price_breakdowns: {
      gross_amount: {
        value: number;
      };
    }[];
    included_taxes_and_charges_amount: {
      value: number;
    };
    net_amount: {
      value: number;
    };
    gross_amount_per_night: {
      value: number;
    };
  };
  checkin: {
    from: string;
  };
  checkout: {
    until: string;
  };
};

export type NearbySearchResponse = Omit<IBResFormat, 'IBparams'> & {
  IBparams: {
    nearbySearchCount: number;
    nearbySearchResult: google.maps.places.IBPlaceResult[];
  };
};

export type SearchHotelResponse = Omit<IBResFormat, 'IBparams'> & {
  IBparams: {
    hotelSearchCount: number;
    hotelSearchResult: SearchedData[];
  };
};

export interface NearbySearchInnerAsyncFnRes {
  nearbySearchResult: google.maps.places.IBPlaceResult[];
  queryParamId: number;
  pageToken: string | undefined;
}

// export type OrderSortType = 'desc' | 'asc';
// export interface GetListQueryParamsReqParams {
//   id?: number;
//   hotelSearch?: {
//     orderBy?: {
//       column: keyof SearchHotelRes;
//       sort?: OrderSortType;
//     }[];
//     // select?: [keyof SearchHotelRes];
//     select?: Record<keyof SearchHotelRes, boolean>;
//   };
//   nearbySearch?: {
//     orderBy?: {
//       column: keyof GglNearbySearchRes;
//       sort?: OrderSortType;
//     }[];
//     // select?: [keyof NearBySearchReqParams];
//     select?: Record<keyof GglNearbySearchRes, boolean>;
//   };
// }
export type GetListQueryParamsReqParams = Prisma.QueryParamsFindManyArgs;

export interface GetRecommendListReqParams {
  searchCond: QueryReqParams & { searchLocation: string };
  evalCond: GetListQueryParamsReqParams;
}

export interface GetRecommendListWithLatLngtReqParams {
  searchCond: QueryReqParams;
  // evalCond: GetListQueryParamsReqParams;
}

export interface SearchLocationsFromBookingComReqParams {
  // locale: 'en-us';
  name: string;
  mock?: boolean;
}
export interface FiltersForSearchFromBookingComReqParams {
  adultsNumber: number;
  destType:
    | 'city'
    | 'region'
    | 'landmark'
    | 'district'
    | 'hotel'
    | 'country'
    | 'airport'
    | 'latlong';
  orderBy: BookingComOrderBy; // #default popularity
  checkoutDate: Date; // default today
  checkinDate: Date; // default tomorrow
  // locale: 'en-us' # default 'en-us'
  // units: 'metric' | 'imperial'
  filterByCurrency?: Currency;
  destId: number;
  roomNumber?: number;
  categoriesFilterIds?: string[];
  childrenNumber?: number;
  includeAdjacency?: boolean;
  pageNumber?: number;
  childrenAges?: number[];
}

export type VisitPlaceType = 'hotel' | 'spot' | 'restaurant';
export type VisitOrder = {
  type: VisitPlaceType;
  data: SearchHotelRes | GglNearbySearchResIncludedGeometry;
};
export type VisitSchedules = {
  // spot: GglNearbySearchRes[];
  // restaurant: GglNearbySearchRes[];
  visitOrder: {
    ordersFromMinHotel: VisitOrder[];
    ordersFromMidHotel: VisitOrder[];
    ordersFromMaxHotel: VisitOrder[];
  };
  spot: {
    spotsFromMinHotel: GglNearbySearchResIncludedGeometry[];
    spotsFromMidHotel: GglNearbySearchResIncludedGeometry[];
    spotsFromMaxHotel: GglNearbySearchResIncludedGeometry[];
  };
  restaurant: {
    restaurantsFromMinHotel: GglNearbySearchResIncludedGeometry[];
    restaurantsFromMidHotel: GglNearbySearchResIncludedGeometry[];
    restaurantsFromMaxHotel: GglNearbySearchResIncludedGeometry[];
  };
  hotel: {
    minBudgetHotel: SearchHotelRes | undefined;
    midBudgetHotel: SearchHotelRes | undefined;
    maxBudgetHotel: SearchHotelRes | undefined;
  };
}[];

export type GetRecommendListWithLatLngtInnerAsyncFnResponse = QueryParams & {
  metaInfo: {
    // totalNearbySearchCount: number;
    totalHotelSearchCount: number;
    totalRestaurantSearchCount: number;
    totalSpotSearchCount: number;
    spotPerDay: number;
    mealPerDay: number;
    mealSchedule: number[];
    travelNights: number;
    travelDays: number;
    hotelTransition: number;
    transitionTerm: number;
    // recommendedNearbySearchCount: number;
    // recommendedSpotCount: number;
    // recommendedRestaurantCount: number;
    recommendedMinHotelCount: number;
    recommendedMidHotelCount: number;
    recommendedMaxHotelCount: number;
  };

  visitSchedulesCount: number;
  visitSchedules: VisitSchedules;
  queryParamId: number;
};
export type GetRecommendListInnerAsyncFnResponse =
  | (GetRecommendListWithLatLngtInnerAsyncFnResponse & {
      searchLocation: string;
    })
  | void;

export type GetRecommendListWithLatLngtResponse = Omit<
  IBResFormat,
  'IBparams'
> & {
  IBparams: GetRecommendListWithLatLngtInnerAsyncFnResponse | {};
};

export type GetRecommendListResponse = Omit<IBResFormat, 'IBparams'> & {
  IBparams: GetRecommendListInnerAsyncFnResponse | {};
};

export type CompositeSearchResponse = Omit<IBResFormat, 'IBparams'> & {
  IBparams: {
    hotelSearchCount: number;
    nearbySearchCount: number;
    hotelSearchResult: SearchedData[];
    nearbySearchResult: google.maps.places.IBPlaceResult[];
  };
};

export type GetListQueryParamsInnerAsyncFnResponse = (QueryParams & {
  gglNearbySearchRes: GglNearbySearchResIncludedGeometry[];
  searchHotelRes: SearchHotelRes[];
})[];

export type GetListQueryParamsResponse = Omit<IBResFormat, 'IBparams'> & {
  IBparams: GetListQueryParamsInnerAsyncFnResponse;
};

/* 
GetListQueryParamsResponse ex) 
    "latitude": 21.33301,
    "country": "United States",
    "rtl": 0,
    "city_name": "",
    "dest_id": "3185",
    "lc": "en",
    "cc1": "us",
    "image_url": "https://cf.bstatic.com/xdata/images/region/150x150/25015.jpg?k=8c0d0a97b5e40cbb4f196a99c744dd2e169d9e57e8568e4a31457b60ac833a05&o=",
    "b_max_los_data": {
        "extended_los": 90,
        "max_allowed_los": 90,
        "is_fullon": 0,
        "has_extended_los": 1,
        "default_los": 45,
        "experiment": "long_stays_android_extend_los_2"
    },
    "nr_hotels": 1444,
    "dest_type": "region",
    "name": "O'ahu",
    "type": "re",
    "label": "O'ahu, United States",
    "longitude": -157.85654,
    "region": "O'ahu",
    "hotels": 1444,
    "city_ufi": null
*/

export type SearchLocationsFromBookingComRawResponse = Partial<{
  dest_id: string;
  lattitude: string;
  longitude: string;
  dest_type: string;
  region: string;
  name: string;
  country: string;
  label: string;
  lc: string;
  cc1: string;
}>;
export type SearchLocationsFromBookingComResponse = Omit<
  IBResFormat,
  'IBparams'
> & {
  IBparams: SearchLocationsFromBookingComRawResponse[];
};

export type FiltersForSearchFromBookingComResponse = Omit<
  IBResFormat,
  'IBparams'
> & {
  IBparams: FiltersForSearchFromBookingComInnerAsyncFnResponse;
};
export type SearchLocationsFromBookingComInnerAsyncFnResponse =
  SearchLocationsFromBookingComRawResponse;

export type FiltersForSearchFromBookingComRawFilterOfResponse = {
  id: string;
  type: string;
  title: string;
  any_text: string;
  is_group: string;
  categories: {
    selected: number;
    name: string;
    popular: string;
    count: number;
    id: string;
    style_for_count: number;
    popular_rank: string;
  }[];
};
export type FiltersForSearchFromBookingRawResponse = {
  filter: FiltersForSearchFromBookingComRawFilterOfResponse[];
  quick_filters_v2: string;
  primary_count: string;
  count: string;
  extended_count: string;
  unfiltered_primary_count: string;
};
export type FiltersForSearchFromBookingComInnerAsyncFnResponse =
  | FiltersForSearchFromBookingComRawFilterOfResponse[];

export const defaultNearbySearchReqParams = {
  keyword: undefined,
  radius: undefined,
  location: {
    latitude: undefined,
    longitude: undefined,
  },
  loadAll: false,
};

export const defaultSearchHotelReqParams: SearchHotelReqParams = {
  orderBy: 'popularity',
  adultsNumber: 2,
  roomNumber: 1,
  checkinDate: getToday(),
  checkoutDate: getTomorrow(),
  filterByCurrency: 'USD',
  latitude: '21.4286856',
  longitude: '-158.1389763',
  pageNumber: 0,
  includeAdjacency: false,
  childrenNumber: undefined,
  childrenAges: undefined,
  categoriesFilterIds: undefined,
  mock: true,
};

export const defaultQueryParams = {
  searchHotelReqParams: defaultSearchHotelReqParams,
  nearbySearchReqParams: defaultNearbySearchReqParams,
  currency: 'USD' as Currency, // "USD" | "KRW" default USD
  travelType: {
    // default { noIdea: true }
    noIdea: true, // 모르겠음
  },
  travelIntensity: 5, // 여행강도 0~10 ex) 6; default 5
  travelStartDate: moment(new Date()).startOf('day').format(), // 여행일정 시작일 ex) '2022-09-30T00:00:00';
  travelEndDate: moment(new Date()).startOf('day').add(1, 'day').format(),
  // 여행일정 종료일 ex) '2022-10-03T00:00:00';
};

export const bookingComFilterCategories = {
  apartments: 'property_type::201',
  hotels: 'property_type::204',
  resorts: 'property_type::206',
  vacationHome: 'property_type::220',
  hostels: 'property_type::203',
  bedAndBreakfasts: 'property_type::208',
  villas: 'property_type::213',
};

export const getQueryParamsForRestaurant = (
  queryParamId: number,
): GetListQueryParamsReqParams => {
  return {
    where: { id: queryParamId },
    include: {
      gglNearbySearchRes: {
        where: {
          types: {
            some: {
              value: {
                equals: 'restaurant',
              },
            },
          },
        },
        include: {
          geometry: true,
        },
        orderBy: [{ user_ratings_total: 'desc' }, { rating: 'desc' }],
      },
      searchHotelRes: {
        orderBy: [
          {
            review_score: 'desc',
          },
          {
            distance: 'asc',
          },
        ],
      },
    },
  };
};

export const getQueryParamsForTourSpot = (
  queryParamId: number,
): GetListQueryParamsReqParams => {
  return {
    where: { id: queryParamId },
    include: {
      gglNearbySearchRes: {
        where: {
          types: {
            none: {
              value: {
                equals: 'restaurant',
              },
            },
          },
        },
        include: {
          geometry: true,
        },
        orderBy: [{ user_ratings_total: 'desc' }, { rating: 'desc' }],
      },
    },
  };
};

export type LatLngt = { lat: number; lngt: number };
// export type MetaDataForSpike = {
//   distances: number[];
//   delta: number[];
//   deltaAvg: number[];
//   deltaSepAvg: number[];
//   seperatedIdxs: number[];
// };
// export type DistanceMap<
//   Type extends SearchHotelRes | GglNearbySearchResIncludedGeometry,
// > = {
//   me: Type;
//   withHotel: {
//     data: SearchHotelRes[];
//     metaDataForDistance: MetaDataForSpike;
//   };
//   withRestaurant: {
//     data: GglNearbySearchResIncludedGeometry[];
//     metaDataForDistance: MetaDataForSpike;
//   };
//   withSpot: {
//     data: GglNearbySearchResIncludedGeometry[];
//     metaDataForDistance: MetaDataForSpike;
//   };
// }[];

// export interface EvalSeperatedPlacesReqParams {
//   searchHotelRes: SearchHotelRes[];
//   touringSpotGglNearbySearchRes: GglNearbySearchResIncludedGeometry[];
//   restaurantGglNearbySearchRes: GglNearbySearchResIncludedGeometry[];
//   baseType?: 'hotel' | 'spot' | 'restaurant';
// }

export type DistanceMap = {
  data: SearchHotelRes | GglNearbySearchResIncludedGeometry;
  withHotels: {
    data: SearchHotelRes;
    distance: number;
  }[];
  withRestaurants: {
    data: GglNearbySearchResIncludedGeometry;
    distance: number;
  }[];
  withSpots: {
    data: GglNearbySearchResIncludedGeometry;
    distance: number;
  }[];
};

export type GglNearbySearchResIncludedGeometry = GglNearbySearchRes & {
  geometry: Gglgeometry;
};

export type ScheduleNodeList = {
  hotel: SearchHotelRes[];
  restaurant: GglNearbySearchResIncludedGeometry[];
  spot: GglNearbySearchResIncludedGeometry[];
};

export class MealOrder {
  mealOrder = [-1, 1, 3];

  getNextMealOrder = (): number => {
    // mealOrder로 받은 배열에서 다음 끼니의 일정 순서를 반환한다. 배열에 항목이 더이상 존재하지 않을 경우는 -2를 반환한다.
    // mealOrder는 해당 끼니의 일정 순서 인덱스이다. -1일 경우에는 해당 끼니는 없는것이다. 0부터 시작이다. ex) { breakfast: -1, lunch: 0, dinner: 2 } 라면 아침은 먹지 않고 점심은 그날 일정순서중 0번째, 저녁은 앞에 1곳의 일정을 소화하고 2번째 일정으로 먹게 됨을 의미함.
    // 만약 mealOrder로 [-1, 0, 2]가 들어오면 첫번재 끼니는 먹지 않으므로 -1이 나오지 않을때까지 while을 반복하여 0을 처음에 반환할것이다.

    let nextMealOrder: number | undefined;
    do {
      nextMealOrder = this.mealOrder.shift();
      if (isUndefined(nextMealOrder)) return -2;
    } while (nextMealOrder === -1);

    return nextMealOrder;
  };
}

export interface ReqScheduleParams {
  minMoney: string;
  maxMoney: string;
  startDate: string;
  endDate: string;
  adult: string;
  child: string;
  infant: string;
  travelHard: string;
  favoriteTravelType: string[];
  favoriteAccommodation: string[];
  favoriteAccommodationLocation: string[];
}

export type ReqScheduleResponse = Omit<IBResFormat, 'IBparams'> & {
  IBparams:
    | {
        scheduleHash: string;
      }
    | {};
};
