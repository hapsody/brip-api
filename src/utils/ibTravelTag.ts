import prisma from '@src/prisma';
import { IBTravelTag, PrismaClient } from '@prisma/client';
import { isNull, isNil } from 'lodash';
import * as runtime from '@prisma/client/runtime/library';

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

/// 해당 IBTravelTag 가 갖는 subTree를 아래방향으로 전부 순회한 결과를 반환한다.
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

/// 해당 IBTravelTag 가 갖는 SuperTree를 윗방향으로 전부 순회한 결과를 반환한다.
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

/// 해당 IBTravelTag 가 속한 트리의 root를 찾고 아래방향으로 전부 순회한 결과를 반환한다.
export const doAllTagTreeTraversal = async (
  tagId: number,
  direction: 'up' | 'down' = 'down',
): Promise<IBTravelTag[][]> => {
  const rootTags = await getRootTags(tagId);

  if (direction === 'down') {
    const result = await Promise.all(
      rootTags.map(v => doSubTreeTraversal(v.id)),
    );
    return result.flat();
  }

  const result = await Promise.all(
    rootTags.map(v => doSuperTreeTraversal(v.id)),
  );
  return result.flat();
};
