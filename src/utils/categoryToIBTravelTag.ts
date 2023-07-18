import {
  TripMemoryCategory,
  PlaceType,
  IBTravelTag,
  RModelBetweenTravelType,
} from '@prisma/client';

/**
 * shareTripMemory에 설정하는 category를 IBtravelTag와 tourPlaceType으로 변환하는 함수
 * @param tripMemoryCategory shareTripMemory의 복수 카테고리 배열
 * @return {
 *  tourPlaceType: TourPlace의 tourPlaceType
 *  ibTravelTagName: TourPlace의 IBTravelTag 배열
 * }
 * */
export const categoryToIBTravelTag = (
  tripMemoryCategory: TripMemoryCategory[],
): {
  tourPlaceType: PlaceType;
  ibTravelTagNames: (string | null)[];
} => {
  return {
    tourPlaceType: (() => {
      switch (
        tripMemoryCategory[0].super /// 전달되는 tripMemoryCategory 배열은 모두 같은 상위 카테고리에서만 선택이 되었다고 가정하기 때문에 첫번째 값만 참조해도 무방하다. 예를들면 상위 카테고리인 음식 카테고리에서 하위 카테고리를 한식, 코스요리, 특별한 맛집 등으로 골랐다면 그것은 음식 카테고리에서만 뽑은 것이며, 여타 다음 상위 카테고리와 함께 선택되지 않았다고 가정한다(시나리오상 고를수 없다는 것)
      ) {
        case '음식':
        case '카페':
          return 'USER_RESTAURANT' as PlaceType;
        case '관광':
        case '액티비티':
        case '휴식':
        default:
          return 'USER_SPOT' as PlaceType;
        // case 'lodge':
      }
    })(),
    ibTravelTagNames: tripMemoryCategory.map(v => {
      switch (v.name) {
        /// 음식
        case '브런치':
        case '한식':
        case '중식':
        case '일식':
        case '양식':
        case '패스트푸드':
        case '코스요리':
        case '고기맛집':
        case '특별한맛집':
        case '나만의맛집':
        case '아이와함께먹을수있는':
        case '오래된맛집':
          return null;
        /// 카페
        case '분위기좋은':
        case '인스타감성':
        case '케익맛집':
        case '예쁜':
        case '로컬카페':
        case '다목적공간':
        case '힙한':
        case '핫플':
          return null;
        case '조용한':
          if (v.super === '숙소') return '';
          return null;
        /// 숙소
        case '시티뷰':
        case '바다뷰':
        case '마운틴뷰':
        case '깔끔한':
        case '친절한':
        case '시내와인접한':
        case '풀빌라':
        case '에어비앤비':
        case '독채':
        case '펫동반':
        case '가족단위':
          return null;
        /// 관광
        case '쇼핑':
          return 'shopping';
        case '아쿠아리움':
          return 'aquarium';
        case '테마파크':
          return 'themePark';
        case '놀이공원':
          return 'amusementPark';
        case '유적지':
          return 'historicalSpot';
        case '박물관':
        case '미술관':
          return 'museum';
        case '국립공원':
          return 'nationalPark';
        case '해안경관':
          return 'ocean';
        case '공원/정원':
          return 'park';
        case '섬':
          return 'island';
        case '언덕':
          return 'hill';
        case '산':
          return 'mountain';
        case '강':
          return 'river';
        case '수목원':
          return 'arboreteum';
        case '숲':
          return 'forest';
        case '바위':
          return 'rocks';
        case '둘레길':
          return 'circumferenceTrail';
        case '오름':
          return 'oreum';
        case '해안도로':
          return 'shoreline';
        case '기타':
          return 'etc';
        /// 액티비티
        case '스노보드':
          return 'snowBoard';
        case '스키':
          return 'ski';
        case '케이블카':
          return 'cableCar';
        case '패러글라이딩':
          return 'paragliding';
        case '짚라인':
          return 'zipTrack';
        case 'UTV':
          return 'UTV';
        case 'MTB':
          return 'MTB';
        case '암벽등반':
          return 'rockClimbing';
        case '그룹하이킹':
          return 'groupHiking';
        case '등산':
          return 'climbing';
        case '루지레이스':
          return 'lugeRacing';
        case '골프':
          return 'golf';
        case '티켓':
          return 'ticket';
        case '농장':
          return 'farm';
        case '승마':
          return 'horseRiding';
        case 'ATV':
          return 'ATV';
        case '카트레이스':
          return 'cartRacing';
        case '크루즈':
          return 'cruise';
        case '카약':
          return 'kayak';
        case '패들보드':
          return 'paddleBoard';
        case '서핑':
          return 'surfing';
        case '제트보트':
          return 'jetBoat';
        case '세일링':
          return 'sailing';
        case '낚시':
          return 'fishing';
        case '스노클링':
          return 'snorkeling';
        case '해수욕':
          return 'beach';
        default:
          return null;
      }
    }),
  };
};

type NestedTagRelation = IBTravelTag & {
  related: (RModelBetweenTravelType & {
    to: NestedTagRelation;
    from: NestedTagRelation;
  })[];
  noPtr: (RModelBetweenTravelType & {
    to: NestedTagRelation;
    from: NestedTagRelation;
  })[];
};

const tagToPlaceType = (
  tag: NestedTagRelation | IBTravelTag,
): 'SPOT' | 'RESTAURANT' => {
  if ('related' in tag && tag.value === 'etc') {
    /// tag 타입이 상위 부모 태그 타입을 갖으며, etc란 이름의 태그를 갖는 경우
    return tagToPlaceType(tag.noPtr[0].from); /// 부모타입도 본다.
  }

  /// tag 타입은 IBTravelTag인 경우
  switch (tag.value) {
    case 'food':
    case 'western':
    case 'chinese':
    case 'korean':
    case 'japanese':
    case 'cafe':
    case 'dining':
    case 'beverage':
      return 'RESTAURANT';
    case 'landActivity':
    case 'oceanActivity':
    case 'mountainActivity':
    case 'naturalSpot':
    case 'culturalSpot':
    case 'historicalSpot':
      return 'SPOT';
    // case 'etc': /// tag가 IBTravelTag 타입이라는것은 최상위 IBTravelTag 타입이라는 소린데 최상위 태그에 etc가 있는 경우는 없다.
    //   return ibTravelTagToTourPlaceType({
    //     tag: tag.noPtr[0].from,
    //     subject,
    //   });
    default:
      return 'SPOT';
  }
};

export const ibTravelTagToTourPlaceType = (param: {
  tag: NestedTagRelation | IBTravelTag;
  subject:
    | 'TOUR4'
    | 'ADPLACE'
    | 'GL'
    | 'USER'
    | 'VISITJEJU'
    | 'PUBLICDATAPORTAL';
}): PlaceType => {
  const { tag, subject } = param;

  const placeType = tagToPlaceType(tag);
  return `${subject}_${placeType}` as PlaceType;
};

export default null;
