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
  store?: boolean; // true면 검색결과를 DB에 저장한다.
}
export interface GetPlaceDataFromGGLRETParamPayload {
  placeSearchCount: number;
  placeSearchResult: GglPlaceResultRawData[];
  nextPageToken?: string;
}
export type GetPlaceDataFromGGLRETParam = Omit<IBResFormat, 'IBparams'> & {
  IBparams: GetPlaceDataFromGGLRETParamPayload | {};
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

/**
 * GetPlaceDataFromVJ Type
 */
export interface VisitJejuReqOpt {
  locale: string; /// 언어코드, ex) kr, en, jp, cn(중국간체), zh(중국번체), my(말레이)
  page?: number; /// 페이지번호, ex) 1
  cid?: string; /// 콘텐츠ID ex) CONT_000000000500513
}
export interface GetPlaceDataFromVJREQParam extends VisitJejuReqOpt {
  loadAll?: boolean;
  store?: boolean;
}
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
export interface VisitJejuResultRawData {
  result?: string; /// 결과코드 ex) 00
  resultMessage?: string; /// 결과메시지 ex) success
  totalCount?: number; /// 전체 결과 개수 ex) 1152
  resultCount?: number; /// 현재 결과 개수 ex) 100
  pageSize?: number; /// 페이지당 결과 개수 ex) 100
  pageCount?: number; /// 전체 페이지 ex) 12
  currentPage?: number; /// 현재 페이지 ex) 1
  items?: {
    alltag?: string; /// 관련 태그 전체 ex) 일출,오름,경관/포토,부모,공용주차장,현금결제,카드결제
    contentsid?: string; /// 콘텐츠 ID ex) CONT_000000000500349
    contentscd?: VisitJejuClassCode; /// 콘텐츠 코드
    title?: string; /// 콘텐츠명 ex) 성산일출봉(UNESCO 세계자연유산)
    region1cd?: VisitJejuClassCode; /// 1차 지역코드
    region2cd?: VisitJejuClassCode; /// 2차 지역코드
    address?: string; /// 주소 ex) 제주특별자치도 서귀포시 성산읍 성산리 1
    roadaddress?: string; /// 도로명 주소 ex) 제주특별자치도 서귀포시 성산읍 일출로 284-12
    tag?: string; /// 태그 ex) 일출,오름,경관/포토,부모
    introduction?: string; /// 간단소개 ex) 바다위에 우뚝 솟아난 수성화산·유네스코 세계자연유산, 천연기념물 제420호, 올레1코스
    latitude?: number; /// 위도 ex) 33.462147
    longitude?: number; /// 경도 ex) 126.936424
    postcode?: string; /// 우편번호 ex) 63643
    phoneno?: string; /// 전화번호 ex) 064-783-0959
    reqPhoto?: {
      /// 대표 등록사진
      descseo?: string; /// 검색엔진 최적화 키워드, ex) 성산일출봉(UNESCO 세계자연유산)
      photoid?: string; /// 사진 ID, ex) 2018052306801
      imgpath?: string; /// 일반 이미지 경로, ex) https://api.cdn.visitjeju.net/photomng/imgpath/201810/17/c072ee1a-2a02-4be7-b0cd-62f4daf2f847.gif
      thumbnailpath?: string; /// 썸네일 이미지경로, ex) https://api.cdn.visitjeju.net/photomng/thumbnailpath/201810/17/e798d53c-1c8a-4d44-a8ab-111beae96db4.gif
    };
  }[];
}
export interface GetPlaceDataFromVJRETParamPayload
  extends VisitJejuResultRawData {}
export type GetPlaceDataFromVJRETParam = Omit<IBResFormat, 'IBparams'> & {
  IBparams: GetPlaceDataFromVJRETParamPayload | {};
};
