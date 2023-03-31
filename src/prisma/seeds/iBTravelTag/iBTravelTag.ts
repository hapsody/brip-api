import { PrismaClient, IBTravelTag } from '@prisma/client';
import { isNull } from 'lodash';

const prisma = new PrismaClient();

export type IBTravelTagList = {
  ibType: {
    typePath: string;
    minDifficulty: number;
    maxDifficulty: number;
  };
};

export const seedData: IBTravelTagList[] = [
  /// oceanActivity
  {
    ibType: {
      typePath: 'oceanActivity>beach',
      minDifficulty: 3,
      maxDifficulty: 5,
    },
  },
  {
    ibType: {
      typePath: 'oceanActivity>snorkeling',
      minDifficulty: 4,
      maxDifficulty: 6,
    },
  },
  {
    ibType: {
      typePath: 'oceanActivity>fishing',
      minDifficulty: 3,
      maxDifficulty: 5,
    },
  },
  {
    ibType: {
      typePath: 'oceanActivity>sailing',
      minDifficulty: 1,
      maxDifficulty: 3,
    },
  },
  {
    ibType: {
      typePath: 'oceanActivity>jetBoat',
      minDifficulty: 1,
      maxDifficulty: 3,
    },
  },
  {
    ibType: {
      typePath: 'oceanActivity>surfing',
      minDifficulty: 4,
      maxDifficulty: 7,
    },
  },

  {
    ibType: {
      typePath: 'oceanActivity>paddleBoard',
      minDifficulty: 3,
      maxDifficulty: 5,
    },
  },
  {
    ibType: {
      typePath: 'oceanActivity>kayak',
      minDifficulty: 2,
      maxDifficulty: 4,
    },
  },
  {
    ibType: {
      typePath: 'oceanActivity>cruise',
      minDifficulty: 1,
      maxDifficulty: 3,
    },
  },
  // {
  //
  //   ibType: {
  //     typePath: 'oceanActivity>uniqueExperience',
  //     minDifficulty: 3,
  //     maxDifficulty: 7,
  //   },
  // },

  /// landActivity
  {
    ibType: {
      typePath: 'landActivity>cartRacing',
      minDifficulty: 2,
      maxDifficulty: 5,
    },
  },
  {
    ibType: {
      typePath: 'landActivity>ATV',
      minDifficulty: 4,
      maxDifficulty: 6,
    },
  },
  {
    ibType: {
      typePath: 'landActivity>horseRiding',
      minDifficulty: 1,
      maxDifficulty: 4,
    },
  },
  {
    ibType: {
      typePath: 'landActivity>farm',
      minDifficulty: 1,
      maxDifficulty: 2,
    },
  },
  {
    ibType: {
      typePath: 'landActivity>ticket',
      minDifficulty: 1,
      maxDifficulty: 3,
    },
  },
  {
    ibType: {
      typePath: 'landActivity>cableCar',
      minDifficulty: 1,
      maxDifficulty: 2,
    },
  },
  {
    ibType: {
      typePath: 'landActivity>golf',
      minDifficulty: 4,
      maxDifficulty: 7,
    },
  },
  {
    ibType: {
      typePath: 'landActivity>lugeRacing',
      minDifficulty: 2,
      maxDifficulty: 5,
    },
  },
  // {
  //
  //   ibType: {
  //     typePath: 'landActivity>uniqueExperience',
  //     minDifficulty: 3,
  //     maxDifficulty: 7,
  //   },
  // },

  {
    ibType: {
      typePath: 'mountainActivity>climbing',
      minDifficulty: 7,
      maxDifficulty: 10,
    },
  },
  {
    ibType: {
      typePath: 'mountainActivity>groupHiking',
      minDifficulty: 7,
      maxDifficulty: 10,
    },
  },
  {
    ibType: {
      typePath: 'mountainActivity>rockClimbing',
      minDifficulty: 9,
      maxDifficulty: 10,
    },
  },
  {
    ibType: {
      typePath: 'mountainActivity>MTB',
      minDifficulty: 9,
      maxDifficulty: 10,
    },
  },
  {
    ibType: {
      typePath: 'mountainActivity>UTV',
      minDifficulty: 9,
      maxDifficulty: 10,
    },
  },
  {
    ibType: {
      typePath: 'mountainActivity>zipTrack',
      minDifficulty: 5,
      maxDifficulty: 7,
    },
  },
  {
    ibType: {
      typePath: 'mountainActivity>paragliding',
      minDifficulty: 9,
      maxDifficulty: 10,
    },
  },
  {
    ibType: {
      typePath: 'mountainActivity>cableCar',
      minDifficulty: 1,
      maxDifficulty: 3,
    },
  },
  {
    ibType: {
      typePath: 'mountainActivity>ski',
      minDifficulty: 6,
      maxDifficulty: 8,
    },
  },
  {
    ibType: {
      typePath: 'mountainActivity>snowBoard',
      minDifficulty: 6,
      maxDifficulty: 8,
    },
  },
  /// Natural spot
  {
    ibType: {
      typePath: 'naturalSpot>shoreline',
      minDifficulty: 1,
      maxDifficulty: 3,
    },
  },
  {
    ibType: {
      typePath: 'naturalSpot>oreum',
      minDifficulty: 3,
      maxDifficulty: 5,
    },
  },
  {
    ibType: {
      typePath: 'naturalSpot>circumferenceTrail',
      minDifficulty: 3,
      maxDifficulty: 7,
    },
  },
  {
    ibType: {
      typePath: 'naturalSpot>rocks',
      minDifficulty: 4,
      maxDifficulty: 6,
    },
  },
  {
    ibType: {
      typePath: 'naturalSpot>forest',
      minDifficulty: 1,
      maxDifficulty: 3,
    },
  },
  {
    ibType: {
      typePath: 'naturalSpot>arboreteum',
      minDifficulty: 1,
      maxDifficulty: 3,
    },
  },
  {
    ibType: {
      typePath: 'naturalSpot>river',
      minDifficulty: 1,
      maxDifficulty: 2,
    },
  },
  {
    ibType: {
      typePath: 'naturalSpot>mountain',
      minDifficulty: 5,
      maxDifficulty: 10,
    },
  },
  {
    ibType: {
      typePath: 'naturalSpot>hill',
      minDifficulty: 5,
      maxDifficulty: 10,
    },
  },
  {
    ibType: {
      typePath: 'naturalSpot>island',
      minDifficulty: 6,
      maxDifficulty: 8,
    },
  },
  {
    ibType: {
      typePath: 'naturalSpot>park',
      minDifficulty: 1,
      maxDifficulty: 4,
    },
  },
  {
    ibType: {
      typePath: 'naturalSpot>garden',
      minDifficulty: 1,
      maxDifficulty: 4,
    },
  },
  {
    ibType: {
      typePath: 'naturalSpot>ocean',
      minDifficulty: 1,
      maxDifficulty: 4,
    },
  },
  {
    ibType: {
      typePath: 'naturalSpot>nationalPark',
      minDifficulty: 4,
      maxDifficulty: 8,
    },
  },
  {
    /// new
    ibType: {
      typePath: 'naturalSpot>valley',
      minDifficulty: 2,
      maxDifficulty: 6,
    },
  },
  {
    /// new
    ibType: {
      typePath: 'naturalSpot>hotSpring',
      minDifficulty: 1,
      maxDifficulty: 3,
    },
  },
  {
    /// new
    ibType: {
      typePath: 'naturalSpot>cave',
      minDifficulty: 3,
      maxDifficulty: 5,
    },
  },
  {
    /// new
    ibType: {
      typePath: 'naturalSpot>lake',
      minDifficulty: 1,
      maxDifficulty: 2,
    },
  },
  {
    ibType: {
      typePath: 'naturalSpot>etc',
      minDifficulty: 3,
      maxDifficulty: 7,
    },
  },
  {
    /// new
    ibType: {
      typePath: 'culturalSpot>temple',
      minDifficulty: 1,
      maxDifficulty: 3,
    },
  },

  /// historical spot
  {
    ibType: {
      typePath: 'historicalSpot',
      minDifficulty: 1,
      maxDifficulty: 3,
    },
  },
  /// themePark
  {
    ibType: {
      typePath: 'themePark',
      minDifficulty: 3,
      maxDifficulty: 5,
    },
  },
  /// amusementPark
  {
    ibType: {
      typePath: 'amusementPark',
      minDifficulty: 4,
      maxDifficulty: 7,
    },
  },
  /// water park
  {
    ibType: {
      typePath: 'waterPark',
      minDifficulty: 5,
      maxDifficulty: 7,
    },
  },
  /// water park
  {
    ibType: {
      typePath: 'museum',
      minDifficulty: 1,
      maxDifficulty: 3,
    },
  },
  /// aquarium
  {
    ibType: {
      typePath: 'aquarium',
      minDifficulty: 1,
      maxDifficulty: 3,
    },
  },
  /// shopping
  {
    ibType: {
      typePath: 'shopping',
      minDifficulty: 2,
      maxDifficulty: 5,
    },
  },
];

async function main(): Promise<void> {
  // eslint-disable-next-line no-restricted-syntax
  for await (const seed of seedData) {
    await (async () => {
      const {
        ibType: { typePath, minDifficulty, maxDifficulty },
      } = seed;
      const types = typePath.split('>').reverse();
      // const leafType = types[types.length - 1];
      // let lastCreatedId = 0;
      let subType: IBTravelTag | null = null;

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
    })();
  }

  await prisma.$disconnect();
}

// const wrapper = (func: () => Promise<void>): (() => void) => {
//   return () => {
//     func().catch(e => console.log(e));
//   };
// };

// const seeder = (): void => {
//   main()
//     .catch(e => {
//       console.error(e);
//       process.exit(1);
//     })
//     .finally(
//       wrapper(async () => {
//         await prisma.$disconnect();
//       }),
//     );
// };

// seeder();

export default main;
