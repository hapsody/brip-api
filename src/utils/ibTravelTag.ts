import prisma from '@src/prisma';

import {
  TripMemoryCategory,
  PlaceType,
  IBTravelTag,
  PrismaClient,
  RModelBetweenTravelType,
  // Prisma,
} from '@prisma/client';
import { isNull, isNil, isEmpty } from 'lodash';
import * as runtime from '@prisma/client/runtime/library';

/// IBTravelTag 관계중 한단계 아래 sub tag들을 반환한다.
export const getSubTags = async (tagId: number): Promise<IBTravelTag[]> => {
  const ibTravelTag = await prisma.iBTravelTag.findUnique({
    where: {
      id: tagId,
    },
    select: {
      related: {
        select: {
          to: true,
        },
      },
    },
  });
  const result = ibTravelTag?.related.map(v => v.to) ?? [];
  return result;
};

/// IBTravelTag 관계중 한단계 상위 super tag들을 반환한다.
export const getSuperTags = async (tagId: number): Promise<IBTravelTag[]> => {
  const ibTravelTag = await prisma.iBTravelTag.findUnique({
    where: {
      id: tagId,
    },
    select: {
      noPtr: {
        select: {
          from: true,
        },
      },
    },
  });
  const result = ibTravelTag?.noPtr.map(v => v.from) ?? [];
  return result;
};

/// 해당 IBTravelTag 가 속한 트리의 가장 상위 root 태그들을 반환한다.
export const getRootTags = async (tagId: number): Promise<IBTravelTag[]> => {
  const superTags = await getSuperTags(tagId);
  if (superTags.length === 0) {
    const tag = await prisma.iBTravelTag.findUnique({
      where: {
        id: tagId,
      },
    });

    return tag ? [tag] : [];
  }
  const result = await Promise.all(superTags.map(v => getRootTags(v.id)));

  return result.flat();
};

/// 해당 IBTravelTag 가 속한 트리의 가장 말단 태그들을 반환한다.
export const getLeafTags = async (tagId: number): Promise<IBTravelTag[]> => {
  const subTags = await getSubTags(tagId);
  if (subTags.length === 0) {
    const tag = await prisma.iBTravelTag.findUnique({
      where: {
        id: tagId,
      },
    });

    return tag ? [tag] : [];
  }
  const result = await Promise.all(subTags.map(v => getLeafTags(v.id)));

  return result.flat();
};

/// tagId 자신을 포함하고 해당 IBTravelTag 가 갖는 subTree를 아래방향으로 전부 순회한 결과를 반환한다.
export const doSubTreeTraversal = async (
  tagId: number,
): Promise<IBTravelTag[][]> => {
  const addSubTags = async (
    tid: number,
    history: IBTravelTag[],
  ): Promise<IBTravelTag[][]> => {
    const subTags = await getSubTags(tid);
    if (subTags.length === 0) return [history];
    let newHistory: IBTravelTag[] = [];
    let subHistories: IBTravelTag[][] = [[]];
    let result: IBTravelTag[][][] = [[]];
    // eslint-disable-next-line no-restricted-syntax
    for await (const v of subTags) {
      newHistory = [...history, v];
      subHistories = await addSubTags(v.id, newHistory);
      result = [...result, subHistories];
    }
    // const result = await Promise.all(
    //   subTags.map(async v => {
    //     const newHistory = [...history, v];
    //     const subHistories = await addSubTags(v.id, newHistory);
    //     return subHistories;
    //   }),
    // );
    return result.flat();
  };

  const tag = await prisma.iBTravelTag.findUnique({
    where: {
      id: tagId,
    },
  });
  if (isNil(tag)) return [[]];

  const result = await addSubTags(tagId, [tag]);
  return result;
};

/// tagId 자신을 포함하고 해당 IBTravelTag 가 갖는 SuperTree를 윗방향으로 전부 순회한 결과를 반환한다.
export const doSuperTreeTraversal = async (
  tagId: number,
): Promise<IBTravelTag[][]> => {
  const addSuperTags = async (
    tid: number,
    history: IBTravelTag[],
  ): Promise<IBTravelTag[][]> => {
    const superTags = await getSuperTags(tid);
    if (superTags.length === 0) return [history];
    let newHistory: IBTravelTag[] = [];
    let superHistories: IBTravelTag[][] = [[]];
    let result: IBTravelTag[][][] = [[]];
    // eslint-disable-next-line no-restricted-syntax
    for await (const v of superTags) {
      newHistory = [v, ...history];
      superHistories = await addSuperTags(v.id, newHistory);
      result = [superHistories, ...result];
    }
    // const result = await Promise.all(
    //   superTags.map(async v => {
    //     const newHistory = [v, ...history];
    //     const subHistories = await addSuperTags(v.id, newHistory);
    //     return subHistories;
    //   }),
    // );
    return result.flat();
  };

  const tag = await prisma.iBTravelTag.findUnique({
    where: {
      id: tagId,
    },
  });
  if (isNil(tag)) return [[]];

  const result = await addSuperTags(tagId, [tag]);
  return result;
};

/// tagId 자신을 포함하고  해당 IBTravelTag 가 속한 트리의 root 또는 leaf를 찾고 윗방향 또는 아랫방향으로(default: 아랫방향) 전부 순회한 결과를 반환한다.
export const doAllTagTreeTraversal = async (params: {
  tagId?: number;
  tagName?: string;
}): Promise<IBTravelTag[][]> => {
  const singleAllTagTreeTraversal = async (tagId: number) => {
    const rootTags = await getRootTags(tagId);
    const result = await Promise.all(
      rootTags.map(v => doSubTreeTraversal(v.id)),
    );
    return result;
  };

  const { tagId, tagName } = params;

  if (!isNil(tagId)) {
    const result = await singleAllTagTreeTraversal(tagId);
    return result.flat();
  }

  if (!isNil(tagName) && !isEmpty(tagName)) {
    const tags = await prisma.iBTravelTag.findMany({
      where: {
        value: tagName,
      },
    });

    if (isEmpty(tags)) return [];

    let result: IBTravelTag[][] = [];
    // eslint-disable-next-line no-restricted-syntax
    for await (const tag of tags) {
      const singleResult = (await singleAllTagTreeTraversal(tag.id)).flat();

      result = [...result, ...singleResult];
    }

    return result;
  }
  return [];
};

/// food > dining > etc 등과 같이 tag 이름 배열과 존재하는 Tag Path중 pathArr와 매칭되는 경로들을 찾아 해당 IBTravelTag 배열들을 반환한다.(tag tree의 연속되는 경로중 일부만 일치하여도 된다.)
export const getPartialMatchedPathTags = async (params: {
  pathArr?: string[];
  tagIdArr?: number[];
}): Promise<IBTravelTag[][]> => {
  const { pathArr, tagIdArr } = params;

  if (!isNil(pathArr) && !isEmpty(pathArr)) {
    /// path로 비교 매칭하는것이기 때문이 2개 이상은 태그가 주어져야한다.
    // if (isNil(pathArr) || pathArr.length < 2) return [];

    const firstTags = await prisma.iBTravelTag.findMany({
      where: {
        value: pathArr[0],
      },
    });

    if (isNil(firstTags) || isEmpty(firstTags)) return [];

    const matchedPathResult = (
      await Promise.all(
        firstTags.map(async v => {
          // const treePaths = await doAllTagTreeTraversal({ tagId: v.id });
          const treePaths = await doAllTagTreeTraversal({ tagName: v.value });
          const matchedPath = treePaths.filter(eachPath => {
            const firstTagIdx = eachPath.findIndex(
              tag => tag.value === pathArr[0],
            );
            if (firstTagIdx < 0) return false;
            return pathArr.every(
              (str, index) => str === eachPath[firstTagIdx + index].value,
            );
          });
          if (!isNil(matchedPath) && !isEmpty(matchedPath)) return matchedPath;
          return null;
        }),
      )
    ).find((v): v is IBTravelTag[][] => v !== null);
    return matchedPathResult ?? [];
  }

  if (!isNil(tagIdArr) && !isEmpty(tagIdArr)) {
    const matchedPathResult = await (async () => {
      // const treePaths = await doAllTagTreeTraversal({ tagId: v.id });
      const treePaths = await doAllTagTreeTraversal({ tagId: tagIdArr[0] });
      const matchedPath = treePaths.filter(eachPath => {
        const firstTagIdx = eachPath.findIndex(tag => tag.id === tagIdArr[0]);
        if (firstTagIdx < 0) return false;
        return tagIdArr.every(
          (id, index) => id === eachPath[firstTagIdx + index].id,
        );
      });
      if (!isNil(matchedPath) && !isEmpty(matchedPath)) return matchedPath;
      return null;
    })();
    return matchedPathResult ?? [];
  }
  return [];
};

/// food > dining > etc 등과 같이 tag 이름 배열과 존재하는 Tag Path중 최상단부터 말단까지 '정확히' 모두 매칭되어야 해당 IBTravelTag 배열을 반환한다.
/// 부분만 일치하면 반환하지 않는다.
export const getMatchedAllPathTags = async (params: {
  pathArr?: string[];
  tagIdArr?: number[];
}): Promise<IBTravelTag[]> => {
  const { pathArr, tagIdArr } = params;

  /// path로 비교 매칭하는것이기 때문이 2개 이상은 태그가 주어져야한다.
  if (!isNil(pathArr) && pathArr.length >= 2) {
    let matchedPathResult: IBTravelTag[] = [];
    const result = await (async () => {
      const firstTags = await prisma.iBTravelTag.findMany({
        where: {
          value: pathArr[0],
        },
      });

      if (isNil(firstTags) || isEmpty(firstTags)) return [];

      // eslint-disable-next-line no-restricted-syntax
      for await (const v of firstTags) {
        const curRes = await (async () => {
          let superTags: IBTravelTag[] = [];
          let subTreePaths: IBTravelTag[][] = [[]];
          let matchedPath: IBTravelTag[] | undefined = [];

          /// 제시된 pathArr의 처음이 root 태그여야 하는데 부모가 있다는것은 root가 아니라는 뜻
          superTags = await getSuperTags(v.id);
          if (superTags.length > 0) return [];

          subTreePaths = await doSubTreeTraversal(v.id);
          matchedPath = subTreePaths.find(
            eachPath =>
              !isEmpty(eachPath) &&
              eachPath.every((tag, index) => tag.value === pathArr[index]),
          );
          if (!isNil(matchedPath) && !isEmpty(matchedPath)) return matchedPath;

          return null;
        })();
        if (!isNil(curRes)) {
          matchedPathResult = curRes;
          break;
        }
      }

      return matchedPathResult ?? [];
    })();

    return result ?? [];
  }

  if (!isNil(tagIdArr) && tagIdArr.length >= 2) {
    let matchedPathResult: IBTravelTag[] = [];
    const result = await (async () => {
      const firstTags = await prisma.iBTravelTag.findMany({
        where: {
          id: tagIdArr[0],
        },
      });

      if (isNil(firstTags) || isEmpty(firstTags)) return [];

      // eslint-disable-next-line no-restricted-syntax
      for await (const v of firstTags) {
        const curRes = await (async () => {
          let superTags: IBTravelTag[] = [];
          let subTreePaths: IBTravelTag[][] = [[]];
          let matchedPath: IBTravelTag[] | undefined = [];

          /// 제시된 pathArr의 처음이 root 태그여야 하는데 부모가 있다는것은 root가 아니라는 뜻
          superTags = await getSuperTags(v.id);
          if (superTags.length > 0) return [];

          subTreePaths = await doSubTreeTraversal(v.id);
          matchedPath = subTreePaths.find(
            eachPath =>
              !isEmpty(eachPath) &&
              eachPath.every((tag, index) => tag.id === tagIdArr[index]),
          );
          if (!isNil(matchedPath) && !isEmpty(matchedPath)) return matchedPath;

          return null;
        })();
        if (!isNil(curRes)) {
          matchedPathResult = curRes;
          break;
        }
      }

      return matchedPathResult ?? [];
    })();

    return result ?? [];
  }

  return [];
};

/// 부분적으로라도 매칭된 path의 superTag들을 반환한다.
/// 예를들어 ["dining"]으로 요청했다면
/// food>dining>korean, food>dining>chinese, festival>dining>한식 ... 등의 경로들이 partialMatch 된다.
/// 이럴경우 반환값은 food, festival ... 이다.
export const getSuperTagsOfPath = async (params: {
  pathArr: string[];
}): Promise<IBTravelTag[]> => {
  const { pathArr } = params;
  const matchedPathTags = await getPartialMatchedPathTags({ pathArr });
  const foundSuperTags = matchedPathTags
    .map(path => {
      const firstTagIdx = path.findIndex(tag => tag.value === pathArr[0]);
      return firstTagIdx > 0 ? path[firstTagIdx - 1] : null;
    })
    .filter((v): v is IBTravelTag => v !== null);

  const nonDupResult = foundSuperTags.reduce((acc, cur) => {
    if (isEmpty(acc)) return [cur];
    const dupCheck = acc.find(v => v.id === cur.id);
    if (!dupCheck) return [...acc, cur];
    return acc;
  }, [] as IBTravelTag[]);
  return nonDupResult;
};

/**
 * shareTripMemory에 설정하는 category를 IBtravelTag와 tourPlaceType으로 변환하는 함수
 * @param tripMemoryCategory shareTripMemory의 복수 카테고리 배열
 * @return {
 *  tourPlaceType: TourPlace의 tourPlaceType
 *  ibTravelTagIds: TourPlace의 IBTravelTag id 배열
 * }
 * */
export const categoryToIBTravelTag = async (
  tripMemoryCategory: TripMemoryCategory[],
): Promise<{
  tourPlaceType: PlaceType;
  ibTravelTagIds: number[];
}> => {
  const result = {
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
          if (v.super === '숙소') return 'lodging';
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
          return 'naturalSpot>nationalPark';
        case '해안경관':
          return 'naturalSpot>ocean';
        case '공원/정원':
          return 'naturalSpot>park';
        case '섬':
          return 'naturalSpot>island';
        case '언덕':
          return 'naturalSpot>hill';
        case '산':
          return 'naturalSpot>mountain';
        case '강':
          return 'naturalSpot>river';
        case '수목원':
          return 'naturalSpot>arboreteum';
        case '숲':
          return 'naturalSpot>forest';
        case '바위':
          return 'naturalSpot>rocks';
        case '둘레길':
          return 'naturalSpot>circumferenceTrail';
        case '오름':
          return 'naturalSpot>oreum';
        case '해안도로':
          return 'naturalSpot>shoreline';
        case '기타':
          return 'naturalSpot>etc';
        /// 액티비티
        case '스노보드':
          return 'mountainActivity>snowBoard';
        case '스키':
          return 'mountainActivity>ski';
        case '케이블카':
          return 'mountainActivity>cableCar';
        case '패러글라이딩':
          return 'mountainActivity>paragliding';
        case '짚라인':
          return 'mountainActivity>zipTrack';
        case 'UTV':
          return 'mountainActivity>UTV';
        case 'MTB':
          return 'mountainActivity>MTB';
        case '암벽등반':
          return 'mountainActivity>rockClimbing';
        case '그룹하이킹':
          return 'mountainActivity>groupHiking';
        case '등산':
          return 'mountainActivity>climbing';
        case '루지레이스':
          return 'landActivity>lugeRacing';
        case '골프':
          return 'landActivity>golf';
        case '티켓':
          return 'landActivity>ticket';
        case '농장':
          return 'landActivity>farm';
        case '승마':
          return 'landActivity>horseRiding';
        case 'ATV':
          return 'landActivity>ATV';
        case '카트레이스':
          return 'landActivity>cartRacing';
        case '크루즈':
          return 'oceanActivity>cruise';
        case '카약':
          return 'oceanActivity>kayak';
        case '패들보드':
          return 'oceanActivity>paddleBoard';
        case '서핑':
          return 'oceanActivity>surfing';
        case '제트보트':
          return 'oceanActivity>jetBoat';
        case '세일링':
          return 'oceanActivity>sailing';
        case '낚시':
          return 'oceanActivity>fishing';
        case '스노클링':
          return 'oceanActivity>snorkeling';
        case '해수욕':
          return 'oceanActivity>beach';
        default:
          return null;
      }
    }),
  };

  const { ibTravelTagNames } = result;

  if (isNil(ibTravelTagNames) || isEmpty(ibTravelTagNames))
    return { ...result, ibTravelTagIds: [] };

  const pathsLeafTags = (
    await Promise.all(
      ibTravelTagNames.map(async tagName => {
        if (isNil(tagName) || isEmpty(tagName)) return null;
        const pathArr = tagName.split('>');
        const matchedPath = await getMatchedAllPathTags({ pathArr });
        if (isEmpty(matchedPath)) return null;
        return matchedPath.pop() ?? null;
      }),
    )
  ).filter((v): v is IBTravelTag => v !== null);

  /// 각 태그 경로를 대표하는 말단 태그들 id 반환
  return {
    ...result,
    ibTravelTagIds: pathsLeafTags.map(v => v.id),
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

export type IBTravelTagList = {
  ibType: {
    typePath: string;
    minDifficulty: number;
    maxDifficulty: number;
  };
};

/**
 * IBTravelTagList 타입으로 전달되는 파라미터에 따라 ibTravelTag를 생성하는 공통 함수
 * 예를들어 landActivity>paragliding 의 typePath를 가진 seed일 경우
 * 상위 ibTravelTag 인 landActivity와 하위 ibTravelTag인 paragliding 태그가 생성된다.
 * 또한 상위태그의 minDifficulty와 maxDifficulty는 관계맺고 있는 하위 태그의 range를 모두 포용할수 있게 업데이트된다. (그러나 말단 태그가 아닌 경우에는 실제 tourPlace에서 태그로 사용되지는 않아야 한다.)
 * ex) 예를들어
 * {
 *  typePath: landActivity>paragliding,
 *  minDifficulty: 4
 *  maxDifficulty: 8
 * }
 * {
 *  typePath: landActivity>ticket,
 *  minDifficulty: 2,
 *  maxDifficulty: 5
 * }
 * 일 경우에는 landActivity의 min은 2, max는 8이다.
 * @param seed IBTravelTagList 타입으로 전달되는 파라미터
 * @return ibTravelTag들의 생성결과중 대표값으로 반환되는 가장 말단태그의 ibTravelTag id값
 */
// type PrismaTransaction = Omit<
//   PrismaClient<
//     Prisma.PrismaClientOptions,
//     never,
//     Prisma.RejectOnNotFound | Prisma.RejectPerOperation | undefined
//   >,
//   '$connect' | '$disconnect' | '$on' | '$transaction' | '$use'
// >;
type PrismaTransaction = Omit<PrismaClient, runtime.ITXClientDenyList>;
export const ibTravelTagCategorize = async (
  seed: IBTravelTagList,
  transaction?: PrismaTransaction,
): Promise<number> => {
  const {
    ibType: { typePath, minDifficulty, maxDifficulty },
  } = seed;
  const pathArr = typePath.split('>');

  /// 만약 기존의 DB에 같은 path를 가진 태그 path를 발견한다면(발견된 태그 Path는 설계원칙상 1개만 발견되도록 DB에 저장되어 있어야한다. 만약 중복 태그가 존재한다면 IBTravelTag 데이터가 corrupted 된 상태 또는 설계상의 오류이다.) 해당 path의 가장 말단 tag의 id를 반환한다.
  const matchedPath = await getMatchedAllPathTags({ pathArr });
  if (!isEmpty(matchedPath)) return matchedPath.pop()!.id;

  const types = typePath.split('>').reverse();

  let firstCreatedId = 0;
  let subType: IBTravelTag | null = null;
  if (isNil(transaction)) {
    // eslint-disable-next-line no-restricted-syntax
    for await (const [i, type] of types.entries()) {
      // eslint-disable-next-line @typescript-eslint/no-loop-func
      const curIBTType = await prisma.$transaction(
        // eslint-disable-next-line @typescript-eslint/no-loop-func
        async tx => {
          /// 이름이 동일한 여러 후보 태그들중에 부모까지 같은 태그를 동일한 태그로 본다.
          const candidateTags = await tx.iBTravelTag.findMany({
            where: {
              value: type,
            },
          });

          let cur = candidateTags.find(async v => {
            const superTags = await getSuperTags(v.id);
            const isParentMatch = superTags.find(k => k.value === types[i + 1]);
            return isParentMatch;
          });

          if (isNil(cur)) {
            cur = await tx.iBTravelTag.create({
              data: {
                value: type,
                minDifficulty,
                maxDifficulty,
              },
            });
            console.log(cur);
          }

          /// firstCreated는 가장 먼저 처리된 말단 태그(가장 세분류 태그 ex) oceanActivity>beach 이면 beach 태그)
          if (firstCreatedId === 0) {
            /// 말단태그인데 부모가 있으면 새로만듦(etc같은 같은 태그이름으로 모든 부모태그들에 붙는 경우 방지)
            const superTags = await getSuperTags(cur.id);
            if (superTags.length > 0) {
              cur = await tx.iBTravelTag.create({
                data: {
                  value: type,
                  minDifficulty,
                  maxDifficulty,
                },
              });
              console.log(cur);
            }
            firstCreatedId = cur.id;
          }

          /// 부모태그의 여행강도는 실질적으로 관계맺는 TourPlace가 없기 때문에 쓰지 않지만
          /// 하위 태그를 모두 범주에 두는 여행강도로 기록해두도록 한다.
          if (subType !== null) {
            cur = await tx.iBTravelTag.update({
              where: {
                id: cur.id,
              },
              data: {
                minDifficulty:
                  cur.minDifficulty! > subType.minDifficulty!
                    ? subType.minDifficulty
                    : cur.minDifficulty,
                maxDifficulty:
                  cur.maxDifficulty! < subType.maxDifficulty!
                    ? subType.maxDifficulty
                    : cur.maxDifficulty,
                ...(!isNull(subType) && {
                  related: {
                    connectOrCreate: {
                      where: {
                        fromId_toId: {
                          fromId: cur.id,
                          toId: subType.id,
                        },
                      },
                      create: {
                        toId: subType.id,
                      },
                    },
                  },
                }),
              },
            });
          }
          return cur;
        },
        {
          maxWait: 5000000, // default: 2000
          timeout: 10000000, // default: 5000
        },
      );
      subType = curIBTType!;
    }
    return firstCreatedId;
  }

  // eslint-disable-next-line no-restricted-syntax
  for await (const [i, type] of types.entries()) {
    // eslint-disable-next-line @typescript-eslint/no-loop-func
    const curIBTType = await (async (): Promise<IBTravelTag> => {
      // let cur = await transaction.iBTravelTag.findUnique({
      //   where: {
      //     value: type,
      //   },
      // });

      /// 이름이 동일한 여러 후보 태그들중에 부모까지 같은 태그를 동일한 태그로 본다.
      const candidateTags = await transaction.iBTravelTag.findMany({
        where: {
          value: type,
        },
      });

      let cur = candidateTags.find(async v => {
        const superTags = await getSuperTags(v.id);
        const isParentMatch = superTags.find(k => k.value === types[i + 1]);
        return isParentMatch;
      });

      if (isNil(cur)) {
        cur = await transaction.iBTravelTag.create({
          data: {
            value: type,
            minDifficulty,
            maxDifficulty,
          },
        });
        console.log(cur);
      }

      /// firstCreated는 가장 먼저 처리된 말단 태그(가장 세분류 태그 ex) oceanActivity>beach 이면 beach 태그)
      if (firstCreatedId === 0) {
        /// 말단태그인데 부모가 있으면 새로만듦(etc같은 같은 태그이름으로 모든 부모태그들에 붙는 경우 방지)
        const superTags = await getSuperTags(cur.id);
        if (superTags.length > 0) {
          cur = await transaction.iBTravelTag.create({
            data: {
              value: type,
              minDifficulty,
              maxDifficulty,
            },
          });
          console.log(cur);
        }
        firstCreatedId = cur.id;
      }

      /// 부모태그의 여행강도는 실질적으로 관계맺는 TourPlace가 없기 때문에 쓰지 않지만
      /// 하위 태그를 모두 범주에 두는 여행강도로 기록해두도록 한다.
      if (subType !== null) {
        cur = await transaction.iBTravelTag.update({
          where: {
            id: cur.id,
          },
          data: {
            minDifficulty:
              cur.minDifficulty! > subType.minDifficulty!
                ? subType.minDifficulty
                : cur.minDifficulty,
            maxDifficulty:
              cur.maxDifficulty! < subType.maxDifficulty!
                ? subType.maxDifficulty
                : cur.maxDifficulty,
            ...(!isNull(subType) && {
              related: {
                connectOrCreate: {
                  where: {
                    fromId_toId: {
                      fromId: cur.id,
                      toId: subType.id,
                    },
                  },
                  create: {
                    toId: subType.id,
                  },
                },
              },
            }),
          },
        });
      }
      return cur;
    })();
    subType = curIBTType!;
  }
  return firstCreatedId;
  // // eslint-disable-next-line no-restricted-syntax
  // for await (const type of types) {
  //   let curIBTType = await prisma.iBTravelTag.findUnique({
  //     where: {
  //       value: type,
  //     },
  //   });
  //   if (!curIBTType) {
  //     curIBTType = await prisma.iBTravelTag.create({
  //       data: {
  //         value: type,
  //         minDifficulty,
  //         maxDifficulty,
  //       },
  //     });
  //     console.log(curIBTType);
  //   }
  //   if (superTypeId > -1) {
  //     curIBTType = await prisma.iBTravelTag.update({
  //       where: {
  //         id: curIBTType.id,
  //       },
  //       data: {
  //         related: {
  //           connectOrCreate: {
  //             where: {
  //               fromId_toId: {
  //                 fromId: curIBTType.id,
  //                 toId: superTypeId,
  //               },
  //             },
  //             create: {
  //               toId: superTypeId,
  //             },
  //           },
  //         },
  //       },
  //     });

  //     /// 부모태그의 여행강도는 실질적으로 관계맺는 TourPlace가 없기 때문에 쓰지 않지만
  //     /// 하위 태그를 모두 범주에 두는 여행강도로 기록해두도록 한다.
  //     const superTag = await prisma.iBTravelTag.findUnique({
  //       where: {
  //         id: superTypeId,
  //       },
  //     });

  //     await prisma.iBTravelTag.update({
  //       where: {
  //         id: superTypeId,
  //       },
  //       data: {
  //         minDifficulty:
  //           Number(superTag!.minDifficulty) > minDifficulty
  //             ? minDifficulty
  //             : Number(superTag!.minDifficulty),
  //         maxDifficulty:
  //           Number(superTag!.maxDifficulty) < maxDifficulty
  //             ? maxDifficulty
  //             : Number(superTag!.maxDifficulty),
  //       },
  //     });
  //   }
  //   superTypeId = curIBTType.id;
  // }
};
