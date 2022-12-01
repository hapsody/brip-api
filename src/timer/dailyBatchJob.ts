import { PrismaClient } from '@prisma/client';
import dataGatherList from './dataGatherList';

// import { getAllTextSearchPages } from '@src/routes/schedule/schedule';
// import { TextSearchReqParams } from '@src/routes/schedule/types/schduleTypes';
import {
  getPlaceByGglTxtSrch,
  getPlaceDataFromVJ,
} from '../routes/schedule/inner';
import {
  // GglTextSearchReqOpt,
  GglPlaceResultRawData,
} from '../routes/schedule/types/schduleTypes';
import dummyRestaurants from './restaurantDummyData';

const prisma = new PrismaClient();
// const locationTitle = 'jeju';

// const textSearchReqParams: GglTextSearchReqOpt[] = [
//   {
//     /// 육지 액티비티 > 테마파크
//     keyword: searchKeyword.themePark,
//   },
//   {
//     /// 육지 액티비티 > 카트장
//     keyword: searchKeyword.cart,
//   },
//   {
//     /// 육지 액티비티 > 육지 레포츠
//     keyword: `leisure in ${locationTitle}`,
//   },
//   // {
//   //   /// 육지 액티비티 > 패러 글라이딩
//   //   keyword: `paragliding in ${locationTitle}`,
//   // },
//   // {
//   //   /// 육지 액티비티 > 패러 글라이딩
//   //   keyword: `paragliding in ${locationTitle}`,
//   // },
//   // {
//   //   /// 골프 > 골프 cc
//   //   keyword: `golf cc in ${locationTitle}`,
//   // },
//   // {
//   //   /// 골프 > 골프 클럽
//   //   keyword: `golfclub in ${locationTitle}`,
//   // },
//   // {
//   //   /// 휴양 > 휴양림
//   //   keyword: `recreation forest in ${locationTitle}`,
//   // },
//   // {
//   //   /// 휴양 > 숲길
//   //   keyword: `숲길 in ${locationTitle}`,
//   // },
//   // {
//   //   /// 휴양 > 요트
//   //   keyword: `yacht tour in ${locationTitle}`,
//   // },
//   // {
//   //   /// 휴양 > 오름
//   //   keyword: `오름 in ${locationTitle}`,
//   // },
//   // {
//   //   /// 휴양 > 자연경관
//   //   keyword: `natural landscape in ${locationTitle}`,
//   // },
//   // {
//   //   /// 휴양 > 해안선
//   //   keyword: `shoreline trail in ${locationTitle}`,
//   // },
//   // {
//   //   /// 바다 액티비티 > 해양 레포츠
//   //   keyword: `해양 레포츠 in ${locationTitle}`,
//   // },
//   // {
//   //   /// 바다 액티비티 > 서핑
//   //   keyword: `surf in ${locationTitle}`,
//   // },
//   // {
//   //   /// 바다 액티비티 > 해양 스포츠
//   //   keyword: `해양스포츠 in ${locationTitle}`,
//   // },
//   // {
//   //   /// 바다 액티비티 > 보트
//   //   keyword: `boat in ${locationTitle}`,
//   // },
//   // {
//   //   /// 그룹 액티비티 > 골프
//   //   keyword: `golf in ${locationTitle}`,
//   // },
//   // {
//   //   /// 그룹 액티비티 > 체험
//   //   keyword: `activity in ${locationTitle}`,
//   // },
//   // {
//   //   /// 그룹 액티비티 > 오름
//   //   keyword: `oruem in ${locationTitle}`,
//   // },
//   // {
//   //   /// 그룹 액티비티 > 단체 체험
//   //   keyword: `체험 in ${locationTitle}`,
//   // },
//   // {
//   //   /// 방문 > 제주 방문지
//   //   keyword: `방문지 in ${locationTitle}`,
//   // },
//   // {
//   //   /// 방문 > 제주 관광명소
//   //   keyword: `관광명소 in ${locationTitle}`,
//   // },
//   // {
//   //   /// 방문 > 제주 테마파크
//   //   keyword: `theme park in ${locationTitle}`,
//   // },
//   // {
//   //   /// 방문 > 제주 숲길
//   //   keyword: `숲길 in ${locationTitle}`,
//   // },
//   // {
//   //   /// 방문 > 제주 오름
//   //   keyword: `oruem in ${locationTitle}`,
//   // },
//   // {
//   //   /// 방문 > 자연경관
//   //   keyword: `natural landscape in ${locationTitle}`,
//   // },
//   // {
//   //   /// 방문 > 해안선
//   //   keyword: `shoreline trail in ${locationTitle}`,
//   // },
//   // {
//   //   /// 명소 > 관광명소
//   //   keyword: `관광명소 in ${locationTitle}`,
//   // },
//   // {
//   //   /// 명소 > 관광명소
//   //   keyword: `관광명소 in ${locationTitle}`,
//   // },
// ];

async function batchJob(): Promise<void> {
  const lastOne = await prisma.batchQueryParams.findFirst({
    orderBy: { id: 'desc' },
  });
  const nextBatchJobId = lastOne ? Number(lastOne.id) + 1 : 1;

  const totalResult: GglPlaceResultRawData[] = [];
  // eslint-disable-next-line no-restricted-syntax
  for await (const v of dataGatherList) {
    const result = await getPlaceByGglTxtSrch({
      batchJobCtx: {
        batchQueryParamsId: nextBatchJobId,
        keyword: v.keyword,
        ibType: v.ibType,
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
    const geoLocation = JSON.parse(v.geoLocation) as {
      lat: number;
      lngt: number;
    };
    const geoViewPort = JSON.parse(v.geoViewport) as {
      northeast: {
        lat: number;
        lngt: number;
      };
      southwest: {
        lat: number;
        lngt: number;
      };
    };

    await prisma.tourPlace.updateMany({
      where: {
        gl_place_id: v.place_id,
        status: 'IN_USE',
        tourPlaceType: 'GL_RESTAURANT',
      },
      data: {
        status: 'ARCHIVED',
      },
    });

    await prisma.tourPlace.create({
      data: {
        status: 'IN_USE',
        gl_icon: v.icon,
        gl_icon_background_color: v.icon_background_color,
        gl_icon_mask_base_uri: v.icon_mask_base_uri,
        gl_name: v.name,
        gl_opening_hours: v.opening_hours === 1,
        gl_place_id: v.place_id,
        gl_price_level: v.price_level,
        gl_rating: v.rating,
        gl_user_ratings_total: v.user_ratings_total,
        gl_vicinity: v.vicinity,
        gl_lat: geoLocation.lat,
        gl_lng: geoLocation.lngt,
        gl_viewport_ne_lat: geoViewPort.northeast.lat,
        gl_viewport_ne_lng: geoViewPort.northeast.lngt,
        gl_viewport_sw_lat: geoViewPort.northeast.lat,
        gl_viewport_sw_lng: geoViewPort.northeast.lngt,
        gl_formatted_address: v.formatted_address,
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
        tourPlaceType: 'GL_RESTAURANT',
      },
    });
  }

  console.log('restaurant dummy data created too');

  await getPlaceDataFromVJ({
    locale: 'kr',
    page: 44,
    loadAll: true,
    store: true,
    batchJobCtx: {
      batchQueryParamsId: nextBatchJobId,
    },
  });

  console.log('fetching visitjeju data job is done');
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

export default batchJob;
