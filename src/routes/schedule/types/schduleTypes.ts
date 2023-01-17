import { isUndefined } from 'lodash';
import {
  PlanType,
  TourPlace,
  QueryParams,
  VisitSchedule,
  PlaceType,
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
export const gParamByTravelLevel = [
  {
    level: 1,
    actMultiplier: 3,
    minDist: 0, // 단위 m
    maxDist: 700,
  },
  {
    level: 2,
    actMultiplier: 2.5,
    minDist: 700, // 단위 m
    maxDist: 1200,
  },
  {
    level: 3,
    actMultiplier: 2.2,
    minDist: 1200, // 단위 m
    maxDist: 1700,
  },
  {
    level: 4,
    actMultiplier: 2,
    minDist: 1700, // 단위 m
    maxDist: 2500,
  },
  {
    level: 5,
    actMultiplier: 1,
    minDist: 2500, // 단위 m
    maxDist: 5000,
  },
  {
    level: 6,
    actMultiplier: 0.8,
    minDist: 5000, // 단위 m
    maxDist: 8000,
  },
  {
    level: 7,
    actMultiplier: 0.5,
    minDist: 8000, // 단위 m
    maxDist: 15000,
  },
  {
    level: 8,
    actMultiplier: 0,
    minDist: 15000, // 단위 m
    maxDist: 999999,
  },
  {
    level: 9,
    actMultiplier: 0,
    minDist: 999999, // 단위 m
    maxDist: 999999,
  },
  {
    level: 10,
    actMultiplier: 0,
    minDist: 999999, // 단위 m
    maxDist: 999999,
  },
];
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
 * 함수-함수 전달시 함수간 전달해야할 내부 변수들
 */
export interface IBContext {
  queryParamsId?: string;
  userTokenId?: string;
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
  keyword?: string;
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
    ibType: {
      typePath: string;
      minDifficulty: number;
      maxDifficulty: number;
    };
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
export interface IVisitOneSchedule {
  visitScheduleId: number; // ex)  171273
  orderNo: number; // x일차 y번째 일정인지 표기 1,2,3,4,..
  dayNo: number;
  placeType: VisitPlaceType;
  title: string; // ex) Turtle Bay Resort, Sunset House, T-shirt Restaurant, Great war Memorial tower
  transitionNo?: number; // 호텔일 경우 해당 호텔이 몇번째 숙소이동인지
  stayPeriod?: number; // 호텔일경우 해당 호텔에 머무르는 일 수
  checkin?: string; // 호텔일경우 해당 호텔에 체크인하는 날짜
  checkout?: string; // 호텔일경우 해당 호텔에 체크아웃하는 날짜
  cent?:
    | GeoFormat & {
        idx: number;
        numOfPointLessThanR: number;
      };
  data?: Partial<TourPlace>[]; // 해당 visitSchedule 과 관계되어있는 tourPlace 데이터
}

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
  dayNo: string; // ex) x일차 일정인지 표기 '01', '02', ...
  scheduleItem: {
    visitScheduleId: string; // ex)  171273
    orderNo: string; // x일차 y번째 일정인지 표기 1,2,3,4,..
    title: string; // ex) Turtle Bay Resort, Sunset House, T-shirt Restaurant, Great war Memorial tower
    transitionNo: number | null; // 호텔일 경우 해당 호텔이 몇번째 숙소이동인지
    stayPeriod: number | null; // 호텔일경우 해당 호텔에 머무르는 일 수
    checkin: string | null; // 호텔일경우 해당 호텔에 체크인하는 날짜
    checkout: string | null; // 호텔일경우 해당 호텔에 체크아웃하는 날짜
    tourPlaceData: TourPlace | null; // 해당 visitSchedule 과 관계되어있는 tourPlace 데이터
  }[];
}
export interface ReqScheduleRETParamPayload extends QueryParams {
  // queryParamsId: string;
  // plan: {
  //   planType: PlanType; // 플랜 경비에 따른 분류 ex) MIN, MID, MAX
  //   day: DayScheduleType[];
  // }[];
  plan: DayScheduleType[];
}
export type ReqScheduleRETParam = Omit<IBResFormat, 'IBparams'> & {
  IBparams: ReqScheduleRETParamPayload | {};
};

/**
 * makeSchedule (reqSchedule 변경스펙)
 */
export interface MakeScheduleREQParam {
  isNow: string;
  companion: string;
  familyOpt: string[];
  minFriend: string;
  maxFriend: string;
  period: string;
  travelType: string[];
  destination: string;
  travelHard: string;
}

// export interface MakeScheduleRETParamPayload extends QueryParams {
//   plan: {
//     planType: PlanType; // 플랜 경비에 따른 분류 ex) MIN, MID, MAX
//     day: DayScheduleType[];
//   }[];
// }
export type TourPlaceGeoLoc = Omit<
  Partial<TourPlace>,
  'gl_lat | gl_lng | vj_latitude | vj_longitude'
> & {
  gl_lat: number | null;
  gl_lng: number | null;
  vj_latitude: number | null;
  vj_longitude: number | null;
};

export interface IValidCentResources {
  centroidNHotel: {
    /// 군집정보와 해당 군집군내 호텔 검색 결과
    transitionNo?: number;
    stayPeriod?: number;
    checkin?: string;
    checkout?: string;
    numOfVisitSpotInCluster?: number;
    ratio?: number;
    hotels?: GetHotelDataFromBKCRETParamPayload;
    cent?: GeoFormat & {
      idx: number;
      numOfPointLessThanR: number;
    };
  };
  nearbySpots: TourPlaceGeoLoc[]; /// 해당 군집군에 속한 여행지
  nearbyFoods: TourPlaceGeoLoc[]; /// 해당 군집군에 속한 식당
}

export interface IHotelInMakeSchedule {
  transitionNo: number; /// 해당 클러스터에서 검색할 지역이 전체 여행중 몇번째 숙소 검색인지 나타내는 값(몇번째 군집인지와 일치함)
  stayPeriod: number; /// 검색한 숙소에서 며칠을 머무를지
  checkin: string; /// 검색한 숙소에 체크인할 날짜
  checkout: string; /// 검색한 숙소에 체크아웃할 날짜
  numOfVisitSpotInCluster: number; /// 해당 클러스터에서 체류 기간중 방문해야할 여행지 수
  ratio: number; /// 해당 숙소에서(해당 클러스터에서) 방문할 여행지들이 전체 방문할 여행지들 수에서 차지하는 비율. 이 수치들을 군집별로 비교하여 전체 여행일정중 각각의 군집군에서 체류할 기간들을 결정한다. ex) 전체 일정 20일 중 ratio가 clusterA: 0.4, clusterB: 0.2, clusterC: 0.4일 경우 각각 8일, 4일, 8일을 머무르는 일정을 갖게 된다.
  hotels: GetHotelDataFromBKCRETParamPayload; /// 해당 클러스터에서 검색된 후보 숙소들
  hotelSrchOpt: BKCSrchByCoordReqOpt;
}
export interface IVisitDaySchedule {
  planType: PlanType;
  dayNo: number;
  titleList: Partial<IVisitOneSchedule>[];
}
export interface ContextMakeSchedule extends IBContext {
  /// 검색된 클러스터별 호텔들
  hotels?: IHotelInMakeSchedule[];
  spots?: TourPlaceGeoLoc[]; /// 검색된 spot중 여행지로 선택된 spot들의 목록
  foods?: TourPlaceGeoLoc[]; /// 검색된 식당 목록
  paramByAvgCalibLevel?: typeof gParamByTravelLevel[number]; /// 최소, 최대 여행강도의 평균값에(내림)에 해당하는 미리 정의된 여행 파라미터값들.
  spotClusterRes?: MakeClusterRETParam; /// 클러스터링 결과
  foodClusterRes?: MakeClusterRETParam; /// 클러스터링 결과

  // validCentNSpots?: IValidCentResources[];
  numOfWholeTravelSpot?: number; /// 여행일 전체에 걸쳐 방문할 여행지 수
  spotPerDay?: number; /// 하루 평균 방문 여행지 수
  mealPerDay?: number; /// 하루 평균 방문할 식당수
  travelNights?: number; /// 여행 일정중 '일'수
  travelDays?: number; /// 여행 일정중 '박'수
  hotelTransition?: number; /// 여행일정중 숙소 변경횟수
  visitSchedules?: IVisitDaySchedule[];
}

export interface MakeScheduleRETParamPayload {
  queryParamsId: number;
  spotPerDay?: number;
  calibUserLevel?: {
    min: number;
    max: number;
  };
  spotClusterRes?: MakeClusterRETParam;
  foodClusterRes?: MakeClusterRETParam;
  validCentNSpots?: IValidCentResources[];
  hotels?: IHotelInMakeSchedule[];
  spots?: TourPlaceGeoLoc[];
  foods?: TourPlaceGeoLoc[];
  visitSchedules: {
    planType: PlanType;
    dayNo: number; // ex) x일차 일정인지 표기 '01', '02', ...
    titleList: Partial<IVisitOneSchedule>[];
  }[];
  queryParams: QueryParams & {
    visitSchedule: (VisitSchedule & {
      tourPlace: TourPlace | null;
    })[];
  };
}
export type MakeScheduleRETParam = Omit<IBResFormat, 'IBparams'> & {
  IBparams: MakeScheduleRETParamPayload | {};
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

/**
 * getScheduleList
 */
export interface GetScheduleListREQParam {
  skip: string;
  take: string;
}
export interface GetScheduleListRETParamPayload {
  id: string; /// scheduleBankId ex) 112345
  tag: string[]; ///  태그 ex) "가족여행", "한달살기"
  title: string; /// 타이틀 ex) "하와이 가족여행"
  createdAt: string; /// 생성일 ex) '2020-09-20T00:00:000Z'
  thumbnail: string; /// 썸네일 주소 ex) "http://m-url.short.jdffasd-thjh"
  // scheduleHash: string; // 일정 고유 id값 ex) 16b7adbfda87687ad8b7daf98b
  planType: string; /// 저장한 일정의 플랜 타입 min | mid | max
  queryParamsId: string; /// scheduleHash값을 대신하여 생성한 일정의 고유값으로 queryParamsId가 쓰임
}

export type GetScheduleListRETParam = Omit<IBResFormat, 'IBparams'> & {
  IBparams: GetScheduleListRETParamPayload[] | {};
};

/**
 * saveSchedule
 */
export interface SaveScheduleREQParam {
  title: string; /// 영구 저장시 표현할 일정 제목 ex) "5월 강릉 일정계획"
  keyword: string[]; /// 영구 저장시 함께 저장될 태그 ex) ["가족여행", "1박2일 일정"]
  planType: PlanType;
  queryParamsId: string; /// 저장할 schedule의 고유 Id
}
export interface SaveScheduleRETParamPayload {
  queryParamsId: string;
}

export type SaveScheduleRETParam = Omit<IBResFormat, 'IBparams'> & {
  IBparams: SaveScheduleRETParamPayload | {};
};

/**
 * getDaySchedule
 */
export interface GetDayScheduleREQParam {
  queryParamsId: string; /// reqSchedule을 통한 생성요청후 응답값으로 전달된 queryParamsId ex) "1"
  day: string; /// 여행중 몇일째 날짜를 조회하길 원하는가, 만약 3이라면 3일차 일정을 조회하길 원한다는 의미 ex) "1"
  planType: PlanType; /// 비용에 따른 일정 분류중 어떤 계획을 요구하는지 ex) 'min' , 'mid', 'max'
}

export interface BriefScheduleType {
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
  startDate?: string; /// 숙박 시작'일' ISO string 포맷의 Date ex) 2022-12-22T00:00:00.000Z
  endDate?: string; ///  ISO string 포맷의 Date ex) 2022-12-24T00:00:00.000Z
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
    url?: string; /// ex) http://ba6s6ddtnbkj120f-abashbdt.com
    photo_reference?: string;
    // text: string; /// ex) ??
  }[];
}

export interface DetailScheduleType {
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
}

export interface GetDayScheduleRETParamPayload {
  id: string; /// ex) 1273712
  dayCount: number; /// 몇일째 정보인지 ex) 1, 2, 3
  contentsCountAll: number; /// ex) 11
  spotList: (BriefScheduleType | undefined)[];
}

export type GetDayScheduleRETParam = Omit<IBResFormat, 'IBparams'> & {
  IBparams: GetDayScheduleRETParamPayload | {};
};

/**
 * getDetailSchedule
 */
export interface GetDetailScheduleREQParam {
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

export interface GetDetailScheduleRETParamPayload extends DetailScheduleType {}
export type GetDetailScheduleRETParam = Omit<IBResFormat, 'IBparams'> & {
  IBparams: GetDayScheduleRETParamPayload | {};
};

export type GglPlaceDetailType = {
  /// google place detail types...
};

export type GetPlaceDetailRawData = {
  result: GglPlaceDetailType[];
};

/**
 * getCandidateSchedule
 */
export interface GetCandidateScheduleREQParam {
  // scheduleHash: string; /// reqSchedule을 통한 생성요청후 응답값으로 전달된 고유 scheduleHash => queryParamsId로 대체됨
  // planType: PlanType; /// 변경 후보리스트의 planType ex) 'min' , 'mid', 'max'
  queryParamsId: string; /// 생성일정의 고유 값으로 간주되는 queryParamsId, 해당 값으로 일정을 특정하여 해당 일정의 후보군을 응답한다.
  spotType: PlaceType; /// 변경하고자 하는 항목의 spotType ex) 'hotel', 'spot', 'restaurant'
  skip: number;
  take: number;
}

export interface GetCandidateScheduleRETParamPayload {
  id: number; /// queryParamsId
  contentsCountAll: number;
  candidateList: BriefScheduleType[];
}

export type GetCandidateScheduleRETParam = Omit<IBResFormat, 'IBparams'> & {
  IBparams: GetCandidateScheduleRETParamPayload | {};
};

/**
 * getCandDetailSchd (getCandidateDetailSchedule )
 */
export interface GetCandDetailSchdREQParam {
  candidateId: string; /// 변경하고자 하는 대체 후보 장소인 호텔(SearchHotelRes Id) 또는 장소, 식당(GglNearbySearchRes Id) Id ex) "19"
  // candidateSpotType: PlaceType; /// 변경하고자 하는 항목의 spotType ex) 'hotel', 'spot', 'restaurant'
}

export type GetCandDetailSchdRETParamPayload = Omit<
  DetailScheduleType,
  'dayCount' | 'orderCount' | 'planType'
>;

export type GetCandDetailSchdRETParam = Omit<IBResFormat, 'IBparams'> & {
  IBparams: GetCandDetailSchdRETParamPayload | {};
};

/**
 * modifySchedule
 */
export interface ModifyScheduleREQParam {
  visitScheduleId: string; /// 변경전 생성되어 있던 추천 항목 ex) "4"
  // candidateSpotType: PlaceType; /// 변경하고자 하는 항목의 spotType ex) 'hotel', 'spot', 'restaurant'
  candidateId: string; /// 변경하고자 하는 호텔(SearchHotelRes Id) 또는 장소, 식당(GglNearbySearchRes Id) Id ex) "19"
}

export interface ModifyScheduleRETParamPayload extends VisitSchedule {}

export type ModifyScheduleRETParam = Omit<IBResFormat, 'IBparams'> & {
  IBparams: ModifyScheduleRETParamPayload | {};
};

/**
 * makeCluster
 */
export interface GeoFormat {
  lat: number;
  lng: number;
}

export interface MakeClusterRETParam {
  r: number;
  maxPhase: number;
  wholeSpotLatLngAvg?: GeoFormat & {
    length: number;
  }; /// 검색된 여행지 데이터들의 평균 위경도 값. 관측하기 위해 만든 개발용 결과
  nonDupCentroids: (GeoFormat & {
    idx: number;
    numOfPointLessThanR: number;
    randNum: number; /// 생성된 클러스터들을 랜덤하게 섞기 위해 참조할 랜덤 변수값
  })[]; /// 클러스터링 전체 결과중 (gCentroids) 충분히 가까운값은 하나의 클러스터링으로 간주하고 버린 결과. 즉 미중복 클러스터들이다. 이 결과를 기반으로 추가적인 필터를 거쳐(포함한 여행지 수 확인등) validCentroid 가 생성된다.

  centroids: (GeoFormat & {
    numOfPointLessThanR: number;
    histories: string;
  })[]; /// 최종 전체 클러스터링 결과들
  centHistoryByStage: {
    stageNo: number;
    centroids: GeoFormat[];
  }[]; ///  최종 전체 클러스터링이 형성된 과정을 관측하기 위해 만든 개발용 결과

  spotsGeoLocation?: (GeoFormat & {
    id: number;
    name: string;
  })[]; ///  makeSchedule 결과 검색된 여행지 배열
  foodsGeoLocation?: (GeoFormat & {
    id: number;
    name: string;
  })[]; /// makeSchedule 결과 검색된 식당 배열
  /// 클러스터링 최종 결과중 중복제외하고 하루 여행방문지수를 미달하는 여행지를 포함하는 군집인 경우를 제외한 유효한 군집 배열.
  validCentNSpots?: IValidCentResources[]; /// nonDupCentroids 결과중 해당 클러스터에서 머무는 기간동안 방문해야할 여행지수보다 충분히 큰 여행지를 보유한 결과만을 유효한 클러스터로 간주하고 나머지는 버린결과. 결국 최종적으로 이 값을 기반으로 여행 일정이 짜여진다.
  validCentNFoods?: IValidCentResources[];
}

/**
 * getHotelList
 */
export interface GetHotelListREQParam {
  queryParamsId: string;
  transitionNo: string;
}
export type GetHotelListRETParamPayload = {
  transitionNo: number; // 호텔일 경우 해당 호텔이 몇번째 숙소이동인지
  stayPeriod: number; // 호텔일경우 해당 호텔에 머무르는 일 수
  checkin: string; // 호텔일경우 해당 호텔에 체크인하는 날짜
  checkout: string; // 호텔일경우 해당 호텔에 체크아웃하는 날짜
  hotels: GetHotelDataFromBKCRETParamPayload;
};
export type GetHotelListRETParam = Omit<IBResFormat, 'IBparams'> & {
  IBparams: GetHotelListRETParamPayload[] | {};
};
