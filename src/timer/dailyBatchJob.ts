import { PrismaClient } from '@prisma/client';

// import { getAllTextSearchPages } from '@src/routes/schedule/schedule';
// import { TextSearchReqParams } from '@src/routes/schedule/types/schduleTypes';
import { getPlaceByGglTxtSrch } from '../routes/schedule/inner';
import {
  GglTextSearchReqOpt,
  GglPlaceResultRawData,
} from '../routes/schedule/types/schduleTypes';
import dummyRestaurants from './restaurantDummyData';

const prisma = new PrismaClient();
const locationTitle = 'jeju';

const textSearchReqParams: GglTextSearchReqOpt[] = [
  {
    /// 육지 액티비티 > 테마파크
    keyword: `theme park in ${locationTitle}`,
  },
  {
    /// 육지 액티비티 > 카트장
    keyword: `카트 in ${locationTitle}`,
  },
  {
    /// 육지 액티비티 > 육지 레포츠
    keyword: `leisure in ${locationTitle}`,
  },
  {
    /// 육지 액티비티 > 패러 글라이딩
    keyword: `paragliding in ${locationTitle}`,
  },
  {
    /// 육지 액티비티 > 패러 글라이딩
    keyword: `paragliding in ${locationTitle}`,
  },
  // {
  //   /// 골프 > 골프 cc
  //   keyword: `golf cc in ${locationTitle}`,
  // },
  // {
  //   /// 골프 > 골프 클럽
  //   keyword: `golfclub in ${locationTitle}`,
  // },
  // {
  //   /// 휴양 > 휴양림
  //   keyword: `recreation forest in ${locationTitle}`,
  // },
  // {
  //   /// 휴양 > 숲길
  //   keyword: `숲길 in ${locationTitle}`,
  // },
  // {
  //   /// 휴양 > 요트
  //   keyword: `yacht tour in ${locationTitle}`,
  // },
  // {
  //   /// 휴양 > 오름
  //   keyword: `오름 in ${locationTitle}`,
  // },
  // {
  //   /// 휴양 > 자연경관
  //   keyword: `natural landscape in ${locationTitle}`,
  // },
  // {
  //   /// 휴양 > 해안선
  //   keyword: `shoreline trail in ${locationTitle}`,
  // },
  // {
  //   /// 바다 액티비티 > 해양 레포츠
  //   keyword: `해양 레포츠 in ${locationTitle}`,
  // },
  // {
  //   /// 바다 액티비티 > 서핑
  //   keyword: `surf in ${locationTitle}`,
  // },
  // {
  //   /// 바다 액티비티 > 해양 스포츠
  //   keyword: `해양스포츠 in ${locationTitle}`,
  // },
  // {
  //   /// 바다 액티비티 > 보트
  //   keyword: `boat in ${locationTitle}`,
  // },
  // {
  //   /// 그룹 액티비티 > 골프
  //   keyword: `golf in ${locationTitle}`,
  // },
  // {
  //   /// 그룹 액티비티 > 체험
  //   keyword: `activity in ${locationTitle}`,
  // },
  // {
  //   /// 그룹 액티비티 > 오름
  //   keyword: `oruem in ${locationTitle}`,
  // },
  // {
  //   /// 그룹 액티비티 > 단체 체험
  //   keyword: `체험 in ${locationTitle}`,
  // },
  // {
  //   /// 방문 > 제주 방문지
  //   keyword: `방문지 in ${locationTitle}`,
  // },
  // {
  //   /// 방문 > 제주 관광명소
  //   keyword: `관광명소 in ${locationTitle}`,
  // },
  // {
  //   /// 방문 > 제주 테마파크
  //   keyword: `theme park in ${locationTitle}`,
  // },
  // {
  //   /// 방문 > 제주 숲길
  //   keyword: `숲길 in ${locationTitle}`,
  // },
  // {
  //   /// 방문 > 제주 오름
  //   keyword: `oruem in ${locationTitle}`,
  // },
  // {
  //   /// 방문 > 자연경관
  //   keyword: `natural landscape in ${locationTitle}`,
  // },
  // {
  //   /// 방문 > 해안선
  //   keyword: `shoreline trail in ${locationTitle}`,
  // },
  // {
  //   /// 명소 > 관광명소
  //   keyword: `관광명소 in ${locationTitle}`,
  // },
  // {
  //   /// 명소 > 관광명소
  //   keyword: `관광명소 in ${locationTitle}`,
  // },
];

async function batchJob() {
  const lastOne = await prisma.batchQueryParams.findFirst({
    orderBy: { id: 'desc' },
  });
  const nextBatchJobId = lastOne ? Number(lastOne.id) + 1 : 1;

  const totalResult: GglPlaceResultRawData[] = [];
  // eslint-disable-next-line no-restricted-syntax
  for await (const v of textSearchReqParams) {
    const result = await getPlaceByGglTxtSrch({
      ...v,
      batchJobCtx: {
        batchQueryParamsId: nextBatchJobId,
        keyword: v.keyword,
      },
      loadAll: true,
      store: true,
    });

    totalResult.push(...result.placeSearchResult);
  }
  console.log(totalResult);

  const restaurantBatchJobCtx = {
    latitude: 33.501298,
    longitude: 126.525482,
    radius: 4000,
  };
  // eslint-disable-next-line no-restricted-syntax
  for await (const v of dummyRestaurants) {
    await prisma.gglNearbySearchRes.upsert({
      where: {
        place_id: v.place_id,
      },
      update: {},
      create: {
        icon: v.icon,
        icon_background_color: v.icon_background_color,
        icon_mask_base_uri: v.icon_mask_base_uri,
        name: v.name,
        opening_hours: v.opening_hours === 1,
        place_id: v.place_id,
        price_level: v.price_level,
        rating: v.rating,
        user_ratings_total: v.user_ratings_total,
        vicinity: v.vicinity,
        geometry: {
          create: {
            location: v.geoLocation,
            viewport: v.geoViewport,
          },
        },
        formatted_address: v.formatted_address,
        batchQueryParams: {
          connectOrCreate: {
            where: {
              id: nextBatchJobId,
            },
            create: restaurantBatchJobCtx,
          },
        },
        batchSearchKeyword: {
          connectOrCreate: {
            where: {
              keyword: '',
            },
            create: {
              keyword: '',
            },
          },
        },
        tourPlace: {
          create: {
            tourPlaceType: 'RESTAURANT',
          },
        },
      },
    });
  }
  // const promises = dummyRestaurants.map(v => {
  //   return prisma.gglNearbySearchRes.upsert({
  //     where: {
  //       place_id: v.place_id,
  //     },
  //     update: {},
  //     create: {
  //       icon: v.icon,
  //       icon_background_color: v.icon_background_color,
  //       icon_mask_base_uri: v.icon_mask_base_uri,
  //       name: v.name,
  //       opening_hours: v.opening_hours === 1,
  //       place_id: v.place_id,
  //       price_level: v.price_level,
  //       rating: v.rating,
  //       user_ratings_total: v.user_ratings_total,
  //       vicinity: v.vicinity,
  //       geometry: {
  //         create: {
  //           location: v.geoLocation,
  //           viewport: v.geoViewport,
  //         },
  //       },
  //       formatted_address: v.formatted_address,
  //       batchQueryParams: {
  //         create: {
  //           latitude: 33.501298,
  //           longitude: 126.525482,
  //           radius: 4000,
  //         },
  //       },
  //       tourPlace: {
  //         create: {
  //           tourPlaceType: 'RESTAURANT',
  //         },
  //       },
  //     },
  //   });
  // });
  // await Promise.all(promises);
  console.log('restaurant dummy data created too');
}

function wrapper(func: () => Promise<void>): () => void {
  return () => {
    func().catch(e => console.error(e));
  };
}

batchJob()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(
    wrapper(async () => {
      await prisma.$disconnect();
    }),
  );
