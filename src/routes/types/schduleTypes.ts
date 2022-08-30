import {
  SearchHotelRes,
  GglNearbySearchRes,
  QueryParams,
} from '@prisma/client';
import { IBResFormat, getToday, getTomorrow } from '@src/utils';
import moment from 'moment';

export interface NearBySearchReqParams {
  keyword: string;
  location: {
    latitude: string; // 위도
    longitude: string; // 경도
  };
  radius: number;
  pageToken: string;
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
  checkinDate: Date; // '2022-09-30';
  checkoutDate: Date; // '2022-10-01';
  filterByCurrency?: Currency; // default USD;
  // locale: 'en-us';
  latitude: string; // 위도좌표 ex) 21.4286856;
  longitude: string; // 경도 ex) -158.1389763;
  pageNumber?: number; // default 0;
  includeAdjacency?: boolean; // default false. Include nearby places. If there are few hotels in the selected location, nearby locations will be added. You should pay attention to the `primary_count` parameter - it is the number of hotels from the beginning of the array that matches the strict filter.
  childrenNumber?: number;
  childrenAges?: number[];
  categoriesFilterIds?: string;
  mock?: boolean; // default true
}

export interface QueryReqParams {
  minBudget?: number; // ex) 4000000,
  maxBudget?: number; // ex) 5000000,
  currency: Currency; // "USD" | "KRW" default USD
  travelType: {
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
  };
  travelIntensity?: number; // 여행강도 0~10 ex) 6; default 5
  travelStartDate: Date; // 여행일정 시작일 ex) '2022-09-30T00:00:00' default today;
  travelEndDate: Date; // 여행일정 종료일 ex) '2022-10-03T00:00:00' default today + 1;
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

export type OrderSortType = 'desc' | 'asc';
export interface GetListQueryParamsReqParams {
  id?: number;
  hotelSearch?: {
    orderBy?: {
      column: keyof SearchHotelRes;
      sort?: OrderSortType;
    }[];
    // select?: [keyof SearchHotelRes];
    select?: Record<keyof SearchHotelRes, boolean>;
  };
  nearbySearch?: {
    orderBy?: {
      column: keyof GglNearbySearchRes;
      sort?: OrderSortType;
    }[];
    // select?: [keyof NearBySearchReqParams];
    select?: Record<keyof GglNearbySearchRes, boolean>;
  };
}

export interface GetRecommendListReqParams {
  searchCond: QueryReqParams;
  evalCond: GetListQueryParamsReqParams;
}

export interface SearchLocationsFromBookingComReqParams {
  // locale: 'en-us';
  name: string;
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
  filterByCurrency: 'USD' | 'KRW';
  destId: number;
  roomNumber?: number;
  categoriesFilterIds?: string[];
  childrenNumber?: number;
  includeAdjacency?: boolean;
  pageNumber?: number;
  childrenAges?: number[];
}

export type VisitSchedules = {
  spot: GglNearbySearchRes[];
  hotel: {
    minBudgetHotel: SearchHotelRes | undefined;
    midBudgetHotel: SearchHotelRes | undefined;
    maxBudgetHotel: SearchHotelRes | undefined;
  };
}[];

export type GetRecommendListInnerAsyncFnResponse = QueryParams & {
  totalNearbySearchCount: number;
  totalHotelSearchCount: number;
  spotPerDay: number;
  travelNights: number;
  travelDays: number;
  hotelTransition: number;
  transitionTerm: number;
  visitSchedulesCount: number;
  visitSchedules: VisitSchedules;
  recommendedNearbySearchCount: number;
  recommendedMinHotelCount: number;
  recommendedMidHotelCount: number;
  recommendedMaxHotelCount: number;
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
  gglNearbySearchRes: GglNearbySearchRes[];
  searchHotelRes: SearchHotelRes[];
})[];

export type GetListQueryParamsResponse = Omit<IBResFormat, 'IBparams'> & {
  IBparams: GetListQueryParamsInnerAsyncFnResponse;
};

export type SearchLocationsFromBookingComResponse = Omit<
  IBResFormat,
  'IBparams'
> & {
  IBparams: {};
};

export type FiltersForSearchFromBookingComResponse = Omit<
  IBResFormat,
  'IBparams'
> & {
  IBparams: {};
};

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
  travelStartDate: new Date(moment(new Date()).startOf('day').format()), // 여행일정 시작일 ex) '2022-09-30T00:00:00';
  travelEndDate: new Date(
    moment(new Date()).startOf('day').add(1, 'day').format(),
  ), // 여행일정 종료일 ex) '2022-10-03T00:00:00';
};
