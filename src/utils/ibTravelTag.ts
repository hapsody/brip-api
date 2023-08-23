import prisma from '@src/prisma';
import {
  TripMemoryCategory,
  PlaceType,
  IBTravelTag,
  PrismaClient,
  RModelBetweenTravelType,
} from '@prisma/client';
import { isNull, isNil, isEmpty } from 'lodash';
import * as runtime from '@prisma/client/runtime/library';

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
  const types = typePath.split('>').reverse();
  let firstCreatedId = 0;
  let subType: IBTravelTag | null = null;

  if (isNil(transaction)) {
    // eslint-disable-next-line no-restricted-syntax
    for await (const type of types) {
      // eslint-disable-next-line @typescript-eslint/no-loop-func
      const curIBTType = await prisma.$transaction(async tx => {
        let cur = await tx.iBTravelTag.findUnique({
          where: {
            value: type,
          },
        });
        if (!cur) {
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
      });
      subType = curIBTType!;
    }
    return firstCreatedId;
  }

  // eslint-disable-next-line no-restricted-syntax
  for await (const type of types) {
    // eslint-disable-next-line @typescript-eslint/no-loop-func
    const curIBTType = await (async (): Promise<IBTravelTag> => {
      let cur = await transaction.iBTravelTag.findUnique({
        where: {
          value: type,
        },
      });
      if (!cur) {
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
    const result = await Promise.all(
      subTags.map(async v => {
        const newHistory = [...history, v];
        const subHistories = await addSubTags(v.id, newHistory);
        return subHistories;
      }),
    );
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
    const result = await Promise.all(
      superTags.map(async v => {
        const newHistory = [v, ...history];
        const subHistories = await addSuperTags(v.id, newHistory);
        return subHistories;
      }),
    );
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
export const doAllTagTreeTraversal = async (
  tagId: number,
  direction: 'up' | 'down' = 'down',
): Promise<IBTravelTag[][]> => {
  if (direction === 'down') {
    const rootTags = await getRootTags(tagId);
    const result = await Promise.all(
      rootTags.map(v => doSubTreeTraversal(v.id)),
    );
    return result.flat();
  }

  const leafTags = await getLeafTags(tagId);
  const result = await Promise.all(
    leafTags.map(v => doSuperTreeTraversal(v.id)),
  );
  return result.flat();
};

/// food > dining > etc 등과 같이 tag 이름 배열과 존재하는 Tag Path중 pathArr와 매칭되는 경로들을 찾아 해당 IBTravelTag 배열들을 반환한다.(tag tree의 경로중 일부만 일치하여도 된다.)
export const getPartialMatchedPathTags = async (params: {
  pathArr: string[];
}): Promise<IBTravelTag[][]> => {
  const { pathArr } = params;

  /// path로 비교 매칭하는것이기 때문이 2개 이상은 태그가 주어져야한다.
  if (isNil(pathArr) || pathArr.length < 2) return [];

  const firstTags = await prisma.iBTravelTag.findMany({
    where: {
      value: pathArr[0],
    },
  });

  if (isNil(firstTags) || isEmpty(firstTags)) return [];

  const matchedPathResult = (
    await Promise.all(
      firstTags.map(async v => {
        const subTreePathes = await doSubTreeTraversal(v.id);
        const matchedPath = subTreePathes.filter(
          eachPath =>
            pathArr.every((str, index) => str === eachPath[index].value),
          // eachPath.every((tag, index) => tag.value === pathArr[index]),
        );
        if (!isNil(matchedPath) && !isEmpty(matchedPath)) return matchedPath;
        return null;
      }),
    )
  ).find((v): v is IBTravelTag[][] => v !== null);
  return matchedPathResult ?? [];
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
    const firstTags = await prisma.iBTravelTag.findMany({
      where: {
        value: pathArr[0],
      },
    });
    if (isNil(firstTags) || isEmpty(firstTags)) return [];
    const matchedPathResult = (
      await Promise.all(
        firstTags.map(async v => {
          /// 제시된 pathArr의 처음이 root 태그여야 하는데 부모가 있다는것은 root가 아니라는 뜻
          const superTags = await getSuperTags(v.id);
          if (superTags.length > 0) return [];

          const subTreePathes = await doSubTreeTraversal(v.id);
          const matchedPath = subTreePathes.find(eachPath =>
            eachPath.every((tag, index) => tag.value === pathArr[index]),
          );
          if (!isNil(matchedPath) && !isEmpty(matchedPath)) return matchedPath;
          return null;
        }),
      )
    ).find((v): v is IBTravelTag[] => v !== null);
    return matchedPathResult ?? [];
  }

  if (!isNil(tagIdArr) && tagIdArr.length >= 2) {
    const firstTag = await prisma.iBTravelTag.findUnique({
      where: {
        id: tagIdArr[0],
      },
    });
    if (isNil(firstTag)) return [];
    const matchedPathResult = await (async () => {
      const superTags = await getSuperTags(firstTag.id);
      if (superTags.length > 0) return [];

      const subTreePathes = await doSubTreeTraversal(firstTag.id);
      const matchedPath = subTreePathes.find(eachPath =>
        eachPath.every((tag, index) => tag.id === tagIdArr[index]),
      );
      if (!isNil(matchedPath) && !isEmpty(matchedPath)) return matchedPath;
      return null;
    })();

    return matchedPathResult ?? [];
  }

  return [];
};
