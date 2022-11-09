import { SearchHotelRes } from '@prisma/client';
import { IBResFormat } from '@src/utils';

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

export type BookingComOrderBy =
  | 'popularity'
  | 'class_ascending'
  | 'class_descending'
  | 'distance'
  | 'upsort_bh'
  | 'review_score'
  | 'price';
export type Currency = 'USD' | 'KRW';

export interface GetHotelDataFromBKCREQParam {
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
  IBparams: GetHotelDataFromBKCRETParamPayload;
};
