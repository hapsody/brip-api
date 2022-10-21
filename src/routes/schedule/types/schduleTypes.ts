import {
  SearchHotelRes,
  GglNearbySearchRes,
  QueryParams,
  Prisma,
  Gglgeometry,
  PlanType,
  PlaceType,
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

export type TextSearchReqParams = Partial<NearBySearchReqParams>;
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

export interface FavoriteTravelType {
  // default { noIdea: true }
  landActivity?: boolean; /// 육상 액티비티
  golf?: boolean; /// 골프
  relaxation?: boolean; /// 휴양
  oceanActivity?: boolean; /// 해양 액티비티
  groupActivity?: boolean; /// 그룹 액티비티
  learn?: boolean; /// 교습
  food?: boolean; /// 음식
  experience?: boolean; /// 체험
  visitTourSpot?: boolean; /// 관광명소 방문
  packageTour?: boolean; /// 패키지 투어
  shopping?: boolean; /// 쇼핑
  waterPark?: boolean; /// 워터파크
  noIdea?: boolean; /// 모르겠음
  // nativeExperience?: boolean; /// 현지 문화체험
}

export interface FavoriteAccommodationType {
  hotel?: boolean;
  resort?: boolean; /// 리조트
  houseRent?: boolean; /// 하우스 렌트
  roomRent?: boolean; /// 룸렌트
  bedRent?: boolean; /// 베드 렌트
  apartRent?: boolean; /// 아파트 렌트
  poolVilla?: boolean; /// 풀빌라
  camping?: boolean; /// 캠핑
  mixed?: boolean; /// 적절히 믹스
  dontCare?: boolean; /// 상관없음
}

export interface FavoriteAccommodationLocation {
  nature?: boolean; /// 자연과 함께
  downtown?: boolean; /// 중심지
  oceanView?: boolean; /// 오션뷰
  mountainView?: boolean; /// 마운틴 뷰
  cityView?: boolean; /// 시티뷰
  mixed?: boolean; /// 적절히 믹스
  dontCare?: boolean; /// 상관없음
}

export interface QueryReqParams {
  // searchLocation?: string; // ex) o'ahu ex) seoul
  minBudget?: number; /// ex) 4000000,
  maxBudget?: number; /// ex) 5000000,
  currency: Currency; /// "USD" | "KRW" default USD
  travelType: FavoriteTravelType; ///
  travelIntensity?: number; // 여행강도 0~10 ex) 6; default 5
  travelStartDate: string; // 여행일정 시작일 ex) '2022-09-30T00:00:00' default today;
  travelEndDate: string; // 여행일정 종료일 ex) '2022-10-03T00:00:00' default today + 1;
  hotelTransition?: number; // 여행중 호텔을 바꾸는 횟수
  searchHotelReqParams: SearchHotelReqParams;
  nearbySearchReqParams: NearBySearchReqParams;
  textSearchReqParams?: TextSearchReqParams;
}

export type SearchedData = Omit<
  SearchHotelRes,
  | 'hotelClass'
  | 'distance'
  | 'gross_amount'
  | 'included_taxes_and_charges_amount'
  | 'net_amount'
  | 'checkout'
  | 'checkin'
> & {
  class: number;
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

export type TextSearchResponse = Omit<IBResFormat, 'IBparams'> & {
  IBparams: {
    textSearchCount: number;
    // textSearchResult: google.maps.places.IBPlaceResult[];
    textSearchResult: (string | undefined)[];
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
  favoriteTravelType: (keyof FavoriteTravelType)[];
  favoriteAccommodation: (keyof FavoriteAccommodationType)[];
  favoriteAccommodationLocation: (keyof FavoriteAccommodationLocation)[];
  mock?: boolean;
}

export type ReqScheduleResponse = Omit<IBResFormat, 'IBparams'> & {
  IBparams:
    | {
        scheduleHash: string;
      }
    | {};
};

export interface GetScheduleParams {
  scheduleHash: string;
}

export type GetScheduleResponsePayload = {
  queryParamsId: string; // 일정 요청 DB ID
  scheduleHash: string; // 일정 요청 고유번호
  plan: {
    planType: PlanType; // 플랜 경비에 따른 분류 ex) MIN, MID, MAX
    day: {
      dayNo: string; // ex) x일차 일정인지 표기 '01', '02', ...
      titleList: {
        visitScheduleId: string; // ex)  171273
        dayNo?: string; // test code에서 확인용으로
        orderNo: string; // x일차 y번째 일정인지 표기 1,2,3,4,...
        title: string; // ex) Turtle Bay Resort, Sunset House, T-shirt Restaurant, Great war Memorial tower
      }[];
    }[];
  }[];
};

export type GetScheduleResponse = Omit<IBResFormat, 'IBparams'> & {
  IBparams: GetScheduleResponsePayload | {};
};

export interface GetScheduleListParams {
  skip: number;
  take: number;
}

export type GetScheduleListResponsePayload = {
  // queryParamsId: string; // 일정 요청 DB ID
  // scheduleHash: string; // 일정 요청 고유번호
  // plan: {
  //   planType: PlanType; // 플랜 경비에 따른 분류 ex) MIN, MID, MAX
  //   day: {
  //     dayNo: string; // ex) x일차 일정인지 표기 '01', '02', ...
  //     titleList: {
  //       visitScheduleId: string; // ex)  171273
  //       dayNo?: string; // test code에서 확인용으로
  //       orderNo: string; // x일차 y번째 일정인지 표기 1,2,3,4,...
  //       title: string; // ex) Turtle Bay Resort, Sunset House, T-shirt Restaurant, Great war Memorial tower
  //     }[];
  //   }[];
  // }[];
  id: string; /// ex) 112345
  tag: string[]; ///  태그 ex) "가족여행", "한달살기"
  title: string; /// 타이틀 ex) "하와이 가족여행"
  createdAt: string; /// 생성일 ex) '2020-09-20T00:00:000Z'
  thumbnail: string; /// 썸네일 주소 ex) "http://m-url.short.jdffasd-thjh"
  scheduleHash: string; // 일정 고유 id값 ex) 16b7adbfda87687ad8b7daf98b
  planType: string; /// 저장한 일정의 플랜 타입 min | mid | max
};

export type GetScheduleListResponse = Omit<IBResFormat, 'IBparams'> & {
  IBparams: GetScheduleListResponsePayload[] | {};
};

export interface SaveScheduleParams {
  title: string; /// 영구 저장시 표현할 일정 제목 ex) "5월 강릉 일정계획"
  keyword: string[]; /// 영구 저장시 함께 저장될 태그 ex) ["가족여행", "1박2일 일정"]
  planType: PlanType;
  scheduleHash: string; ///  저장할 schedule의 고유 hash ex) "1bgfjv1asdnn1gbbnaidi125nh5hb1fh"
}

export type SaveScheduleResponsePayload = {
  queryParamsId: string; // 일정 요청 DB ID
  scheduleHash: string; // 일정 요청 고유번호
  plan: {
    planType: PlanType; // 플랜 경비에 따른 분류 ex) MIN, MID, MAX
    day: {
      dayNo: string; // ex) x일차 일정인지 표기 '01', '02', ...
      titleList: {
        visitScheduleId: string; // ex)  171273
        dayNo?: string; // test code에서 확인용으로
        orderNo: string; // x일차 y번째 일정인지 표기 1,2,3,4,...
        title: string; // ex) Turtle Bay Resort, Sunset House, T-shirt Restaurant, Great war Memorial tower
      }[];
    }[];
  }[];
};

export type SaveScheduleResponse = Omit<IBResFormat, 'IBparams'> & {
  IBparams: SaveScheduleResponsePayload | {};
};

export interface GetDayScheduleParams {
  scheduleHash: string; /// reqSchedule을 통한 생성요청후 응답값으로 전달된 고유 scheduleHash ex)
  day: string; /// 여행중 몇일째 날짜를 조회하길 원하는가, 만약 3이라면 3일차 일정을 조회하길 원한다는 의미 ex) "1"
  planType: PlanType; /// 비용에 따른 일정 분류중 어떤 계획을 요구하는지 ex) 'min' , 'mid', 'max'
}

export type GetDayScheduleResponsePayload = {
  id: string; /// ex) 1273712
  dayCount: number; /// 몇일째 정보인지 ex) 1, 2, 3
  contentsCountAll: number; /// ex) 11
  spotList: {
    id: string; /// ex) 22748
    spotType: string; /// ex) 'hotel', 'spot', 'restaurant'
    previewImg: string; /// ex) http://jtjtbasdhtja;dfakjsdf
    spotName: string; /// ex) 'Turtle Bay Resort'
    roomType?: string; /// ex)
    spotAddr: string; /// ex) '383 Kalaimoku St, Waikiki, HI 96815 미국'
    // contact: string; /// ex) '+18089228111'
    hotelBookingUrl?: string; /// 호텔일경우 contact가 없어서 대신 해당 호텔 예약 페이지 링크 주소 ex) https://www.booking.com/hotel/kr/alice-and-trunk.html
    placeId?: string; /// 장소나 식당일 경우 google 맵에 위치와 상세 정보를 표시해주기 위한 placeId ex) ChIJrRc-m4LjDDURgGLY3LPdjE0
    //    stayDate: string; // 1박2일 ex) "2022. 12. 22 ~ 2022. 12. 24"
    startDate: string; /// 숙박 시작'일' ISO string 포맷의 Date ex) 2022-12-22T00:00:00.000Z
    endDate: string; ///  ISO string 포맷의 Date ex) 2022-12-24T00:00:00.000Z
    night?: Number; /// 1박 ex)
    days?: Number; /// 2일 ex)
    checkIn?: String; /// ex) 15:00
    checkOut?: String; ///  ex)  11:00
    price?: String; ///  1박당? 전체?
    rating?: number; /// ex) 8.7
    lat?: number; /// ex) 33.47471823
    lng?: number; /// ex) 126.17273718239
    imageList?: {
      id: string; /// ex) 18184
      url: string; /// ex) http://ba6s6ddtnbkj120f-abashbdt.com
      text: string; /// ex) ??
    }[];
  }[];
};

export type GetDayScheduleResponse = Omit<IBResFormat, 'IBparams'> & {
  IBparams: GetDayScheduleResponsePayload | {};
};

export interface GetDetailScheduleParams {
  visitScheduleId: string; /// 스케쥴중 특정 일정 하나를 지칭하는 고유 id. getDaySchedule을 통한 하루 일정 정보에서 특정 장소에 대한 id를 얻어 이를 파라미터로 제공한다. ex) "10"
}

export type GooglePlaceReview = {
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
};

export enum GooglePriceLevel {
  'Free',
  'Moderate',
  'Expensive',
  'VeryExpensive',
}

export type GetDetailScheduleResponsePayload = {
  id: string; /// ex) 22748
  dayCount: number; /// x일째 정보인지 ex) 1, 2, 3
  orderCount: number; /// x일째 y번째 방문 정보인지 ex) 0,1,2,3,...
  planType: PlanType; /// 해당 장소는 비용타입중 min | mid | max중 어디에 속하는가
  spotType: string; /// ex) 'hotel', 'spot', 'restaurant'
  previewImg: string; /// ex) http://jtjtbasdhtja;dfakjsdf
  spotName: string; /// ex) 'Turtle Bay Resort'
  roomType: string | null; /// ex)
  spotAddr: string | null; /// ex) '383 Kalaimoku St, Waikiki, HI 96815 미국'
  // contact: string; /// ex) '+18089228111'
  hotelBookingUrl: string | null; /// 호텔일경우 contact가 없어서 대신 해당 호텔 예약 페이지 링크 주소 ex) https://www.booking.com/hotel/kr/alice-and-trunk.html
  placeId: string | null; /// 장소나 식당일 경우 google 맵에 위치와 상세 정보를 표시해주기 위한 placeId ex) ChIJrRc-m4LjDDURgGLY3LPdjE0
  //    stayDate: string; // 1박2일 ex) "2022. 12. 22 ~ 2022. 12. 24"
  startDate: string | null; /// 숙박 시작'일' ISO string 포맷의 Date ex) 2022-12-22T00:00:00.000Z
  endDate: string | null; ///  ISO string 포맷의 Date ex) 2022-12-24T00:00:00.000Z
  night: Number | null; /// 1박 ex)
  days: Number | null; /// 2일 ex)
  checkIn: String | null; /// ex) 15:00
  checkOut: String | null; ///  ex)  11:00
  price: String | null; ///  1박당? 전체?
  priceLevel: keyof typeof GooglePriceLevel | null; ///  식당이나 장소일경우 구글에서 평가한 가격 레벨 ex) 0(Free), 1(Inexpensive), 2(Moderate), 3(Expensive), 4(Very Expensive)
  rating: number | null; /// ex) 8.7
  lat: number | null; /// ex) 33.47471823
  lng: number | null; /// ex) 126.17273718239
  hotelClass: number | null; /// 호텔성급 ex) 3
  reviewScoreWord: string | null; /// booking.com hotel => 리뷰 점수를 한마디로 표현 ex) wonderful
  language: string | null; /// booking.com hotel => 호텔 언어
  cityNameEN: string | null; /// booking.com hotel => 호텔 위치 도시명
  imageList:
    | {
        url?: string; /// idealbloom server에서 포맷 변경한 직접 접근 가능한 대표 url ex) http://ba6s6ddtnbkj120f-abashbdt.com
        reference?: string; /// google photo reference

        /// 이하 booking.com photos of hotel 리턴값 양식
        ml_tags?: {
          confidence: number;
          tag_id: number;
          tag_type: string;
          tag_name: string;
          photo_id: number;
        }[];
        tags?: {
          tag: string; /// booking.com photo tag ex) Bed, Photo of the whole room, Room
          id: number;
        }[];
        photo_id?: number; /// booking.com photo id ex)  54631278
        url_square60?: string;
        url_max?: string;
        url_1440?: string;
      }[]
    | null;
  contact: string | null; /// 연락처 Google Place Detail => formatted_phone_number ex) 02-6369-4603
  weekdayOpeningHours: string[] | null; /// Google Place Detail => weekday_text를 이름을 바꿨음. ex) ["월요일: 오전 11:30 ~ 오후 10:00", "화요일: 오전 11:30 ~ 오후 10:00", "수요일: 오전 11:30 ~ 오후 10:00", "목요일: 오전 11:30 ~ 오후 10:00", "금요일: 오전 11:30 ~ 오후 10:00", "토요일: 오전 11:30 ~ 오후 10:00", "일요일: 오전 11:30 ~ 오후 10:00"]
  reviews: GooglePlaceReview[] | null; /// Google Place Detail => 리뷰들 노출 5개
  takeout: boolean | null; /// Google Place Detail => 테이크아웃 여부
  googlePlaceTypes: string[] | null; /// Google Place Detail => 장소 타입 ex) [ "restaurant", "food", "point_of_interest", "establishment" ]
  url: string | null; /// Google Place Detail => 구글맵 url ex) https://maps.google.com/?cid=18118321410210469991
  userRatingsTotal: number | null; /// Google Place Detail => 유저 평점 총 투표자 수
  website: string | null; /// Google Place Detail => 해당 장소에서 운영하는 자체 웹사이트 , hotel의 웹사이트로도 쓴다.
};

export type GetDetailScheduleResponse = Omit<IBResFormat, 'IBparams'> & {
  IBparams: GetDetailScheduleResponsePayload | {};
};

export type GglPlaceDetailType = {
  /// google place detail types...
};
export type GetPlaceDetailResponse = {
  result: GglPlaceDetailType[];
};

export type GetCandidateScheduleParams = {
  scheduleHash: string; /// reqSchedule을 통한 생성요청후 응답값으로 전달된 고유 scheduleHash ex)
  // planType: PlanType; /// 변경 후보리스트의 planType ex) 'min' , 'mid', 'max'
  spotType: PlaceType; /// 변경하고자 하는 항목의 spotType ex) 'hotel', 'spot', 'restaurant'
};
export type GetCandidateScheduleResponsePayload = {
  result: GglPlaceDetailType[] | {};
};

export type GetCandidateScheduleResponse = Omit<IBResFormat, 'IBparams'> & {
  IBparams: GetCandidateScheduleResponsePayload | {};
};

export type ModifyScheduleParams = {
  visitScheduleId: string; /// 변경전 생성되어 있던 추천 항목 ex) "4"
  candidateSpotType: PlaceType; /// 변경하고자 하는 항목의 spotType ex) 'hotel', 'spot', 'restaurant'
  candidateId: string; /// 변경하고자 하는 호텔(SearchHotelRes Id) 또는 장소, 식당(GglNearbySearchRes Id) Id ex) "19"
};
export type ModifyScheduleResponsePayload = {
  result: GglPlaceDetailType[] | {};
};

export type ModifyScheduleResponse = Omit<IBResFormat, 'IBparams'> & {
  IBparams: ModifyScheduleResponsePayload | {};
};

export type GetCandidateDetailScheduleParams = {
  candidateSpotType: PlaceType; /// 변경하고자 하는 항목의 spotType ex) 'hotel', 'spot', 'restaurant'
  candidateId: string; /// 변경하고자 하는 대체 후보 장소인 호텔(SearchHotelRes Id) 또는 장소, 식당(GglNearbySearchRes Id) Id ex) "19"
};
export type GetCandidateDetailScheduleResponsePayload = Omit<
  GetDetailScheduleResponsePayload,
  'dayCount' | 'orderCount' | 'planType'
>;

export type GetCandidateDetailScheduleResponse = Omit<
  IBResFormat,
  'IBparams'
> & {
  IBparams: GetCandidateDetailScheduleResponsePayload | {};
};

export type SyncVisitJejuDataReqParams = {
  locale: string; /// 언어코드, ex) kr, en, jp, cn(중국간체), zh(중국번체), my(말레이)
  page?: number; /// 페이지번호, ex) 1
  cid?: string; /// 콘텐츠ID ex) CONT_000000000500513
};

export interface VisitJejuClassCode {
  value: string;
  /// 1. 콘텐츠 코드 값일 경우, ex) c1
  /// 2. 1차 지역코드 값일 경우, ex) region2
  /// 3. 2차 지역코드 값일 경우, ex) 17
  label: string;
  /// 1. 콘텐츠코드 라벨일 경우, ex) 관광지,
  /// 2. 1차 지역코드 라벨일 경우, ex) 서귀포시
  /// 3. 2차 지역코드 라벨일 경우, ex) 성산
  refId: string;
  /// 1. 콘텐츠코드 Reference ID, ex) contentscd>c1,
  /// 2. 1차 지역코드 레퍼런스 ID 일 경우, ex) region>region2
  /// 3. 2차 지역코드 레퍼런스 ID 일 경우, ex) region2>17
}
export interface SyncVisitJejuDataResponsePayload {
  result: string; /// 결과코드 ex) 00
  resultMessage: string; /// 결과메시지 ex) success
  totalCount: number; /// 전체 결과 개수 ex) 1152
  resultCount: number; /// 현재 결과 개수 ex) 100
  pageSize: number; /// 페이지당 결과 개수 ex) 100
  pageCount: number; /// 전체 페이지 ex) 12
  currentPage: number; /// 현재 페이지 ex) 1
  items: {
    alltag: string; /// 관련 태그 전체 ex) 일출,오름,경관/포토,부모,공용주차장,현금결제,카드결제
    contentsid: string; /// 콘텐츠 ID ex) CONT_000000000500349
    contentscd: VisitJejuClassCode; /// 콘텐츠 코드
    title: string; /// 콘텐츠명 ex) 성산일출봉(UNESCO 세계자연유산)
    region1cd: VisitJejuClassCode; /// 1차 지역코드
    region2cd: VisitJejuClassCode; /// 2차 지역코드
    address: string; /// 주소 ex) 제주특별자치도 서귀포시 성산읍 성산리 1
    roadaddress: string; /// 도로명 주소 ex) 제주특별자치도 서귀포시 성산읍 일출로 284-12
    tag: string; /// 태그 ex) 일출,오름,경관/포토,부모
    introduction: string; /// 간단소개 ex) 바다위에 우뚝 솟아난 수성화산·유네스코 세계자연유산, 천연기념물 제420호, 올레1코스
    latitude: number; /// 위도 ex) 33.462147
    longitude: number; /// 경도 ex) 126.936424
    postcode: string; /// 우편번호 ex) 63643
    phoneno: string; /// 전화번호 ex) 064-783-0959
    reqPhoto: {
      /// 대표 등록사진
      descseo: string; /// 검색엔진 최적화 키워드, ex) 성산일출봉(UNESCO 세계자연유산)
      photoid: string; /// 사진 ID, ex) 2018052306801
      imgpath: string; /// 일반 이미지 경로, ex) https://api.cdn.visitjeju.net/photomng/imgpath/201810/17/c072ee1a-2a02-4be7-b0cd-62f4daf2f847.gif
      thumbnailpath: string; /// 썸네일 이미지경로, ex) https://api.cdn.visitjeju.net/photomng/thumbnailpath/201810/17/e798d53c-1c8a-4d44-a8ab-111beae96db4.gif
    };
  }[];
}

export type SyncVisitJejuDataResponse = Omit<IBResFormat, 'IBparams'> & {
  IBparams: SyncVisitJejuDataResponsePayload | {};
};
