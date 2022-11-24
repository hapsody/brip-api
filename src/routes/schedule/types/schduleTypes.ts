import { isUndefined } from 'lodash';
import {
  PlanType,
  TourPlace,
  QueryParams,
  VisitSchedule,
} from '@prisma/client';
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
  // mock?: boolean; // default true, true일 경우 개발중 빈번한 외부 api 호출을 막기위해 자체 mocking db에서 값을 가져다 쓴다. => mock 옵션이 없어도 기본적용되도록 수정함
  // loadAll?: boolean; // default false, true 일 경우 전체 페이지를 로드하는 로직을 수행하도록 한다.
  store?: boolean;
}
/// rapid api booking.com search hotels by coordinates 검색 결과
export interface BKCHotelRawData {
  unit_configuration_label: string;
  min_total_price: number;
  countrycode: string;
  default_language: string;
  address: string;
  city: string;
  city_name_en: string;
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
  review_score_word: string;
  review_score: number;
  currencycode: string;
  timezone: string;
  urgency_message?: string;
  hotel_id: number;
  hotel_name: string;
  latitude: number;
  longitude: number;
  url: string;
  accommodation_type_name: string;
  zip: string;
  main_photo_url: string;
  max_photo_url?: string;
  hotel_facilities?: string;
  has_swimming_pool?: number;
}
export interface GetHotelDataFromBKCRETParamPayload {
  hotelSearchCount: number;
  // hotelSearchResult: BKCHotelRawData[];
  hotelSearchResult: Partial<TourPlace>[];
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
export interface GetPlaceByGglNrbyREQParam extends GglNearbySearchReqOpt {
  batchJobCtx: {
    batchQueryParamsId?: number;
    latitude?: number;
    longitude?: number;
    radius?: number;
    keyword?: string;
  };
  // batchJobId?: number; // batchJob을 통해 호출되는 경우 data model들에 batchQueryParam이 전달받은 batchJobId 번째로 생성된다. 본 파라미터를 통해 batchJob 스크립트로 실행인지 일반 함수 호출인지를 판별한다.
  loadAll?: boolean; // 뒤에 있는 모든 페이지를 구글에 반복해서 쿼리하도록 요청함
  store?: boolean; // true면 검색결과를 DB에 저장한다.
}
export interface GetPlaceByGglNrbyRETParamPayload {
  placeSearchCount: number;
  placeSearchResult: GglPlaceResultRawData[];
  nextPageToken?: string;
}
export type GetPlaceByGglNrbyRETParam = Omit<IBResFormat, 'IBparams'> & {
  IBparams: GetPlaceByGglNrbyRETParamPayload | {};
};
export interface GetPlaceByGglTxtSrchREQParam extends GglTextSearchReqOpt {
  batchJobCtx: {
    batchQueryParamsId?: number;
    latitude?: number;
    longitude?: number;
    radius?: number;
    keyword?: string;
  };
  // batchJobId?: number; // batchJob을 통해 호출되는 경우 data model들에 batchQueryParam이 전달받은 batchJobId 번째로 생성된다. 본 파라미터를 통해 batchJob 스크립트로 실행인지 일반 함수 호출인지를 판별한다.
  loadAll?: boolean; // 뒤에 있는 모든 페이지를 구글에 반복해서 쿼리하도록 요청함
  store?: boolean; // true면 검색결과를 DB에 저장한다.
}
export interface GetPlaceByGglTxtSrchRETParamPayload {
  placeSearchCount: number;
  placeSearchResult: GglPlaceResultRawData[];
  nextPageToken?: string;
}
export type GetPlaceByGglTxtSrchRETParam = Omit<IBResFormat, 'IBparams'> & {
  IBparams: GetPlaceByGglTxtSrchRETParamPayload | {};
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
  batchJobCtx: {
    batchQueryParamsId?: number;
    latitude?: number;
    longitude?: number;
    radius?: number;
    keyword?: string;
  };
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

/**
 * GetRecommendList Type
 */

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

export type VisitPlaceType = 'HOTEL' | 'SPOT' | 'RESTAURANT';

/// 일별 추천 일정 타입
export interface IVisitSchedule {
  dayNo: number;
  orderNo: number;
  transitionNo: number;
  stayPeriod: number;
  checkin: string;
  checkout: string;
  placeType: VisitPlaceType;
  planType: PlanType;
  data: Partial<TourPlace>;
}
// export interface GetRcmdListRETParamPayload extends QueryParams {
//   // export interface GetRcmdListRETParamPayload {
//   // metaInfo: MetaScheduleInfo;
//   visitSchedulesCount: number;
//   visitSchedules: Partial<VisitSchedule>[];
//   // queryParamId: number;
// }

export type GetRcmdListRETParamPayload = QueryParams & {
  visitSchedule: (VisitSchedule & {
    tourPlace: TourPlace | null;
  })[];
};

export type GetRcmdListRETParam = Omit<IBResFormat, 'IBparams'> & {
  IBparams: GetRcmdListRETParamPayload | {};
};

export type HotelOptType = BKCSrchByCoordReqOpt;
export type PlaceOptType = GglNearbySearchReqOpt | VisitJejuReqOpt;
export type GetRcmdListHotelOpt<T extends AddMockBKCHotelResourceREQParam> =
  T & {
    store?: boolean;
  };
export type GetRcmdListPlaceOpt<T extends PlaceOptType> = T;

export interface QueryReqParams<H extends HotelOptType> {
  // searchLocation?: string; // ex) o'ahu ex) seoul
  minMoney?: number; /// ex) 4000000,
  maxMoney?: number; /// ex) 5000000,
  startDate: string; // 여행일정 시작일 ex) '2022-09-30T00:00:00' default today;
  endDate: string; // 여행일정 종료일 ex) '2022-10-03T00:00:00' default today + 1;
  adult?: number;
  child?: number;
  infant?: number;
  // travelType: FavoriteTravelType; ///
  travelHard?: number; // 여행강도 0~10 ex) 6; default 5
  currency: Currency; /// "USD" | "KRW" default USD
  hotelTransition?: number; // 여행중 호텔을 바꾸는 횟수
  hotelSrchOpt: GetRcmdListHotelOpt<H>;
  // placeSrchOpt: GetRcmdListPlaceOpt<P>;
  store?: boolean;
}

export type GetRcmdListREQParam<H extends HotelOptType> = QueryReqParams<H>;

/**
 * reqSchedule
 */
export type ReqScheduleREQParam<H extends HotelOptType> = QueryReqParams<H>;
export interface DayScheduleType {
  dayNo: string;
  titleList: {
    visitScheduleId: string;
    orderNo: string;
    title: string;
    transitionNo: number | null;
    stayPeriod: number | null;
    checkin: string | null;
    checkout: string | null;
    tourPlaceData: TourPlace | null;
  }[];
}
export interface ReqScheduleRETParamPayload {
  queryParamsId: string;
  plan: {
    planType: PlanType;
    day: DayScheduleType[];
  }[];
}
export type ReqScheduleRETParam = Omit<IBResFormat, 'IBparams'> & {
  IBparams: ReqScheduleRETParamPayload | {};
};

/**
 * getSchedule
 */
export interface GetScheduleREQParam {
  queryParamsId: string;
}
export interface GetScheduleRETParamPayload
  extends ReqScheduleRETParamPayload {}

export type GetScheduleRETParam = Omit<IBResFormat, 'IBparams'> & {
  IBparams: GetScheduleRETParamPayload | {};
};
