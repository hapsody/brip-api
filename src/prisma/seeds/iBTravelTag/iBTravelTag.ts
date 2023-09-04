import { PrismaClient, IBTravelTag } from '@prisma/client';
import {
  IBTravelTagList,
  // ibTravelTagCategorize,
  addTagWithParentPath,
  // addTagPath,
} from '@src/utils';
import { isNil } from 'lodash';

const prisma = new PrismaClient();

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
  {
    ibType: {
      typePath: 'oceanActivity>etc',
      minDifficulty: 1,
      maxDifficulty: 8,
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
  {
    ibType: {
      typePath: 'landActivity>etc',
      minDifficulty: 2,
      maxDifficulty: 10,
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
  /// cave
  {
    /// new
    ibType: {
      typePath: 'naturalSpot>cave',
      minDifficulty: 3,
      maxDifficulty: 5,
    },
  },
  /// lake
  {
    /// new
    ibType: {
      typePath: 'naturalSpot>lake',
      minDifficulty: 1,
      maxDifficulty: 2,
    },
  },
  /// etc
  {
    ibType: {
      typePath: 'naturalSpot>etc',
      minDifficulty: 1,
      maxDifficulty: 7,
    },
  },
  /// biome
  {
    /// new
    ibType: {
      typePath: 'naturalSpot>biome', /// 동식물
      minDifficulty: 2,
      maxDifficulty: 3,
    },
  },
  /// temple
  {
    /// new
    ibType: {
      typePath: 'culturalSpot>temple',
      minDifficulty: 1,
      maxDifficulty: 2,
    },
  },
  /// buildingAndStructure
  {
    /// new
    ibType: {
      typePath: 'culturalSpot>buildingAndStructure',
      minDifficulty: 1,
      maxDifficulty: 3,
    },
  },
  /// festival
  {
    /// new
    ibType: {
      typePath: 'culturalSpot>festival',
      minDifficulty: 2,
      maxDifficulty: 7,
    },
  },
  /// culturalSpot>etc
  {
    /// new
    ibType: {
      typePath: 'culturalSpot>etc',
      minDifficulty: 1,
      maxDifficulty: 4,
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
      typePath: 'recreation>themePark', /// 휴양>테마파크
      minDifficulty: 3,
      maxDifficulty: 5,
    },
  },
  /// new
  {
    ibType: {
      typePath: 'recreation>tourComplex', /// 휴양>관광단지
      minDifficulty: 2,
      maxDifficulty: 4,
    },
  },
  /// sauna
  {
    /// new
    ibType: {
      typePath: 'recreation>sauna',
      minDifficulty: 1,
      maxDifficulty: 2,
    },
  },
  /// healthTour
  {
    /// new
    ibType: {
      typePath: 'recreation>etc',
      minDifficulty: 1,
      maxDifficulty: 5,
    },
  },

  /// traditionalActivity
  {
    /// new
    ibType: {
      typePath: 'activity>traditional',
      minDifficulty: 2,
      maxDifficulty: 4,
    },
  },
  /// activity etc
  {
    /// new
    ibType: {
      typePath: 'activity>etc',
      minDifficulty: 1,
      maxDifficulty: 9,
    },
  },
  /// industrialComplex
  {
    /// new
    ibType: {
      typePath: 'industrialComplex>etc',
      minDifficulty: 2,
      maxDifficulty: 4,
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
  /// museum
  {
    ibType: {
      typePath: 'museum',
      minDifficulty: 1,
      maxDifficulty: 3,
    },
  },
  /// convention
  {
    /// new
    ibType: {
      typePath: 'convention',
      minDifficulty: 2,
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

  /// food
  {
    /// new
    ibType: {
      typePath: 'food>dining>western',
      minDifficulty: 1,
      maxDifficulty: 1,
    },
  },
  {
    /// new
    ibType: {
      typePath: 'food>dining>chinese',
      minDifficulty: 1,
      maxDifficulty: 1,
    },
  },
  {
    /// new
    ibType: {
      typePath: 'food>dining>korean',
      minDifficulty: 1,
      maxDifficulty: 1,
    },
  },
  {
    /// new
    ibType: {
      typePath: 'food>dining>japanese',
      minDifficulty: 1,
      maxDifficulty: 1,
    },
  },
  {
    /// new
    ibType: {
      typePath: 'food>dining>etc',
      minDifficulty: 1,
      maxDifficulty: 1,
    },
  },
  {
    /// new
    ibType: {
      typePath: 'food>beverage>cafe',
      minDifficulty: 1,
      maxDifficulty: 1,
    },
  },
  {
    /// new
    ibType: {
      typePath: 'food>beverage>club',
      minDifficulty: 1,
      maxDifficulty: 1,
    },
  },
  // {
  //   /// new
  //   ibType: {
  //     typePath: 'lodging', /// 숙박시설
  //     minDifficulty: 1,
  //     maxDifficulty: 1,
  //   },
  // },

  /// for test
  // {
  //   ibType: {
  //     typePath: '대한민국>서울특별시>성동구>성수동', /// 숙박시설
  //     minDifficulty: 1,
  //     maxDifficulty: 1,
  //   },
  // },
  // {
  //   ibType: {
  //     typePath: '대한민국>서울특별시>성동구>화양동', /// 숙박시설
  //     minDifficulty: 1,
  //     maxDifficulty: 1,
  //   },
  // },
  // {
  //   ibType: {
  //     typePath: '대한민국>서울특별시>성동구>왕십리', /// 숙박시설
  //     minDifficulty: 1,
  //     maxDifficulty: 1,
  //   },
  // },
  // {
  //   ibType: {
  //     typePath: '대한민국>서울특별시>구로구>가산동', /// 숙박시설
  //     minDifficulty: 1,
  //     maxDifficulty: 1,
  //   },
  // },
  // {
  //   ibType: {
  //     typePath: '대한민국>충청남도>천안시>서북구>봉서동', /// 숙박시설
  //     minDifficulty: 1,
  //     maxDifficulty: 1,
  //   },
  // },
  // {
  //   ibType: {
  //     typePath: '대한민국>충청남도>공주시', /// 숙박시설
  //     minDifficulty: 1,
  //     maxDifficulty: 1,
  //   },
  // },
];

async function main(): Promise<void> {
  /// pathArr로 주어지는 food>dining>etc 패스에서 food>dining이 path가 존재한다면 존재하는 food>dining 패스와 etc를 생성해서 연결해준다.
  /// 만약 존재하지 않는다면 food>dining에서 상위 패스가 있는지 찾고(food) 있으면 해당 패스와 dining을 연결하며 없다면 또 다시 상위 패스가 있는지 찾는 등의 작업을 반복한다.
  /// 결국 패스의 길이가 1일때까지 거슬러 올라가게 되는데 예제에서는 food이다. 이 태그가 존재하지 않는다면 food를 생성하고 dining을 생성해서 연결하고 다시 etc를 생성해서 연결해주게 된다.
  const addTagWithParentPathCreatedOrConnected = async (data: {
    pathArr: string[];
    leafTagData: {
      value: string;
      minDifficulty: number;
      maxDifficulty: number;
    };
  }): Promise<IBTravelTag> => {
    let result: IBTravelTag | null = null;
    result = await addTagWithParentPath(data);
    if (!isNil(result)) {
      return result;
    }

    let parentPathData = {
      ...data,
      pathArr: [...data.pathArr].splice(0, data.pathArr.length - 1),
    };

    parentPathData = {
      ...parentPathData,
      leafTagData: {
        ...parentPathData.leafTagData,
        value: [...parentPathData.pathArr].pop()!,
      },
    };

    await addTagWithParentPathCreatedOrConnected(parentPathData);
    result = await addTagWithParentPath(data);

    return result!;
  };

  // eslint-disable-next-line no-restricted-syntax
  for await (const seed of seedData) {
    // await ibTravelTagCategorize(seed);

    const data = {
      pathArr: seed.ibType.typePath.split('>'),
      leafTagData: {
        value: seed.ibType.typePath.split('>').pop()!,
        minDifficulty: seed.ibType.minDifficulty,
        maxDifficulty: seed.ibType.maxDifficulty,
      },
    };
    const createdLeafTag = await addTagWithParentPathCreatedOrConnected(data);
    console.log(createdLeafTag);
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
