import { PrismaClient } from '@prisma/client';
import { isNil } from 'lodash';
import dataGatherList from './dataGatherList';

// import { getAllTextSearchPages } from '@src/routes/schedule/schedule';
// import { TextSearchReqParams } from '@src/routes/schedule/types/schduleTypes';
import {
  getPlaceByGglTxtSrch,
  getPlaceDataFromVJ,
  getPlaceDetail,
} from '../routes/schedule/inner';
import {
  // GglTextSearchReqOpt,
  GglPlaceResultRawData,
  GglPlaceDetailType,
} from '../routes/schedule/types/schduleTypes';
import dummyRestaurants from './restaurantDummyData';

const prisma = new PrismaClient();

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
        /// 통합 필수 필드
        title: v.name,
        lat: geoLocation.lat,
        lng: geoLocation.lngt,
        address: v.formatted_address ?? v.vicinity ?? undefined,
        roadAddress: undefined,
        openWeek: undefined,
        contact: undefined,
        postcode: undefined,
        photos: {
          create: await (async () => {
            if (!isNil(v.photoReference)) {
              return {
                url: v.photoReference,
              };
            }

            const detailData: GglPlaceDetailType = await getPlaceDetail({
              placeId: v.place_id ?? '',
            });

            return isNil(detailData.photos)
              ? undefined
              : detailData.photos.map(k => {
                  return {
                    url: k.photo_reference,
                  };
                });
          })(),
        },
        rating: isNil(v) ? undefined : v.rating,
        desc: undefined,

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
    page: 1,
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
