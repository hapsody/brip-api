import { SearchHotelRes } from '@prisma/client';
import { IBResFormat, getToday, getTomorrow } from '@src/utils';

export const gMealPerDay = 2;
export const gSpotPerDay = 2;
export const gHotelTransition = 0;
export const gRadius = 4000;
export const gCurrency = 'KRW';
export const gMinHotelMoneyPortion = 0.5;
export const gMidHotelMoneyPortion = 0.6;
export const gMaxHotelMoneyPortion = 0.7;
export const gFlexPortionLimit = 1.3;
export const gLanguage = 'ko';
// const hotelPerDay = 1;

/**
 * GetHotelDataFromBKC Type
 */
export type BookingComOrderBy =
  | 'popularity'
  | 'class_ascending'
  | 'class_descending'
  | 'distance'
  | 'upsort_bh'
  | 'review_score'
  | 'price';
export type Currency = 'USD' | 'KRW';
export interface BKCSrchByCoordReqOpt {
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
}
export interface GetHotelDataFromBKCREQParam extends BKCSrchByCoordReqOpt {
  mock?: boolean; // default true, true일 경우 개발중 빈번한 외부 api 호출을 막기위해 자체 mocking db에서 값을 가져다 쓴다.
  loadAll?: boolean; // default false, true 일 경우 전체 페이지를 로드하는 로직을 수행하도록 한다.
}
/// rapid api booking.com search hotels by coordinates 검색 결과
export type BKCHotelRawData = Omit<
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
export interface GetHotelDataFromBKCRETParamPayload {
  hotelSearchCount: number;
  hotelSearchResult: BKCHotelRawData[];
}
export type GetHotelDataFromBKCRETParam = Omit<IBResFormat, 'IBparams'> & {
  IBparams: GetHotelDataFromBKCRETParamPayload | {};
};

/**
 * GetPlaceDataFromGGL Type
 */
export interface GglNearbySearchReqOpt {
  keyword: string;
  location: {
    latitude: string; // 위도
    longitude: string; // 경도
  };
  radius: number;
  pageToken?: string;
}
export type GglTextSearchReqOpt = Pick<
  GglNearbySearchReqOpt,
  'keyword' | 'pageToken'
>;
export type GglPlaceResultRawData = google.maps.places.IBPlaceResult;
export interface GetPlaceDataFromGGLREQParam
  extends GglNearbySearchReqOpt,
    GglTextSearchReqOpt {
  loadAll?: boolean; // 뒤에 있는 모든 페이지를 구글에 반복해서 쿼리하도록 요청함
}
export interface GetPlaceDataFromGGLRETParamPayload {
  placeSearchCount: number;
  placeSearchResult: GglPlaceResultRawData[];
  nextPageToken?: string;
}
export type GetPlaceDataFromGGLRETParam = Omit<IBResFormat, 'IBparams'> & {
  IBparams: GetPlaceDataFromGGLRETParamPayload;
};

/**
 * AddMockHotelResource
 */
export interface AddMockBKCHotelResourceREQParam extends BKCSrchByCoordReqOpt {
  mock?: boolean;
}
export const defaultBKCHotelReqParams: AddMockBKCHotelResourceREQParam = {
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
