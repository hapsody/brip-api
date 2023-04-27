import request from 'supertest';
import app from '@src/app';
import { ibDefs } from '@src/utils';
// import moment from 'moment';
// import prisma from '@src/prisma';
// import { isEmpty } from 'lodash';
import {
  GetPlaceByGglNrbyRETParam,
  GetPlaceByGglNrbyRETParamPayload,
} from '../types/schduleTypes';
import { params } from './testData';

jest.setTimeout(120000);

describe('Schedule Express Router E2E Test', () => {
  describe('POST /getPlaceByGglNrby', () => {
    it('Case: Correct', async () => {
      const response = await request(app)
        .post('/schedule/getPlaceByGglNrby')
        .send(params.gglNearbySearchOpt);

      const result = response.body as GetPlaceByGglNrbyRETParam;
      const IBparams = result.IBparams as GetPlaceByGglNrbyRETParamPayload;
      expect(result.IBcode).toEqual({ ...ibDefs.SUCCESS }.IBcode);

      expect(IBparams.placeSearchCount).not.toBeFalsy();
      expect(IBparams.placeSearchCount).toBeGreaterThan(0);
      expect(IBparams.placeSearchResult).not.toBeFalsy();
      expect(IBparams.placeSearchResult).toHaveLength(
        IBparams.placeSearchCount,
      );
      // const { placeSearchResult } = IBparams;
      // eslint-disable-next-line no-restricted-syntax
      // for await (const item of placeSearchResult) {
      //   expect(item).toHaveProperty('business_status');
      //   expect(item).toHaveProperty('geometry');
      //   expect(item.geometry).toHaveProperty('location');
      //   expect(item.geometry?.location).toHaveProperty('lat');
      //   expect(item.geometry?.location).toHaveProperty('lng');
      //   expect(item.geometry).toHaveProperty('viewport');
      //   expect(item.geometry?.viewport).toHaveProperty('northeast');
      //   expect(item.geometry?.viewport).toHaveProperty('southwest');
      //   expect(item.geometry?.viewport?.northeast).toHaveProperty('lat');
      //   expect(item.geometry?.viewport?.northeast).toHaveProperty('lng');
      //   expect(item.geometry?.viewport?.southwest).toHaveProperty('lat');
      //   expect(item.geometry?.viewport?.southwest).toHaveProperty('lng');
      //   expect(item).toHaveProperty('icon');
      //   expect(item).toHaveProperty('icon_background_color');
      //   expect(item).toHaveProperty('icon_mask_base_uri');
      //   expect(item).toHaveProperty('name');
      //   // expect(item).toHaveProperty('opening_hours');
      //   // expect(item).toHaveProperty('photos');

      //   if (item.photos && item.photos.length > 0) {
      //     for (let i = 0; i < item.photos.length; i += 1) {
      //       expect(item.photos[i]).toHaveProperty('height');
      //       expect(item.photos[i]).toHaveProperty('html_attributions');
      //       expect(item.photos[i]).toHaveProperty('photo_reference');
      //       expect(item.photos[i]).toHaveProperty('width');
      //     }
      //   }
      //   expect(item).toHaveProperty('place_id');
      //   // expect(item).toHaveProperty('plus_code');
      //   expect(item).toHaveProperty('rating');
      //   expect(item).toHaveProperty('reference');
      //   expect(item).toHaveProperty('scope');
      //   expect(item).toHaveProperty('types');
      //   expect(item).toHaveProperty('user_ratings_total');
      //   expect(item).toHaveProperty('vicinity');
      // }
    });
    it('Case: Correct - store 옵션 true 테스트', async () => {
      // const response = await request(app)
      //   .post('/schedule/getPlaceByGglNrby')
      //   .send({ ...params.gglNearbySearchOpt, store: true });
      // const result = response.body as GetPlaceByGglNrbyRETParam;
      // const IBparams = result.IBparams as GetPlaceByGglNrbyRETParamPayload;
      // expect(result.IBcode).toEqual({ ...ibDefs.SUCCESS }.IBcode);
      // expect(IBparams.placeSearchCount).not.toBeFalsy();
      // expect(IBparams.placeSearchCount).toBeGreaterThan(0);
      // expect(IBparams.placeSearchResult).not.toBeFalsy();
      // expect(IBparams.placeSearchResult).toHaveLength(
      //   IBparams.placeSearchCount,
      // );
      // const { placeSearchResult } = IBparams;
      // const placeIds = placeSearchResult
      //   .map(v => v.place_id)
      //   .filter(i => i) as string[];
      // const fromGoogleCount = placeIds.length;
      // const tourPlace = await prisma.tourPlace.findMany({
      //   where: {
      //     AND: [
      //       {
      //         OR: [
      //           { tourPlaceType: 'GL_RESTAURANT' },
      //           { tourPlaceType: 'GL_SPOT' },
      //         ],
      //         gl_place_id: {
      //           in: placeIds,
      //         },
      //       },
      //       {
      //         updatedAt: {
      //           gte: moment().subtract(2000, 'milliseconds').toISOString(),
      //         },
      //       },
      //     ],
      //   },
      //   include: {
      //     gl_types: true,
      //     gl_photos: true,
      //   },
      // });
      // /// 검색된 결과를 DB에 저장하면 중복된 place_id가 DB에 있는 경우 새로 저장이 되지는 않는다.
      // /// 구글로부터의 결과중 place_id가 만약 undefined 인 경우는 제외하고 실제 저장이 되어야하는 결과들은 placeIds다.
      // /// 때문에 placeIds.length만큼 DB에서 찾은 결과 숫자가 정확히 같아야한다.
      // expect(tourPlace.length).toBe(fromGoogleCount);
      // const deleteTPDBListToRestore: number[] = [];
      // // eslint-disable-next-line no-restricted-syntax
      // for await (const item of placeSearchResult) {
      //   const tpDB = tourPlace.find(tp => tp.gl_place_id === item.place_id);
      //   expect(tpDB).not.toBeUndefined();
      //   // const gglDB = tpDB?.gglNearbySearchRes;
      //   if (tpDB) {
      //     if (moment().diff(moment(tpDB.updatedAt)) < 2000) {
      //       deleteTPDBListToRestore.push(tpDB.id);
      //     }
      //     /// 최근 업데이트가 된 DB항목만 새로 추가된 것이라고 가정
      //     expect(item.geometry.location.lat).toBe(tpDB.gl_lat);
      //     expect(item.geometry.location.lng).toBe(tpDB.gl_lng);
      //     if (item.opening_hours && !isEmpty(item.opening_hours)) {
      //       expect((item.opening_hours as { open_now: boolean }).open_now).toBe(
      //         tpDB.gl_opening_hours,
      //       );
      //     }
      //     // photo_reference는 매번 검색때마다 달라진다는점을 발견했다..
      //     if (item.photos && item.photos.length > 0) {
      //       for (let i = 0; i < item.photos.length; i += 1) {
      //         // const photoFoundIdx = tpDB.photos.findIndex(
      //         //   v =>
      //         //     item &&
      //         //     item.photos &&
      //         //     (item.photos[i] as Partial<{ photo_reference: string }>)
      //         //       .photo_reference === v.photo_reference,
      //         // );
      //         // expect(photoFoundIdx).not.toBe(-1);
      //         const photoFoundIdx = tpDB.gl_photos.findIndex(
      //           v =>
      //             (item &&
      //               item.photos &&
      //               item.photos[i].html_attributions[0]) ===
      //             (JSON.parse(v.html_attributions as string) as string[])[0],
      //         );
      //         expect(photoFoundIdx).not.toBe(-1);
      //       }
      //     }
      //     expect(item.place_id).toBe(tpDB.gl_place_id?.toString() ?? undefined);
      //     expect(item.rating).toBe(tpDB.gl_rating ?? undefined);
      //     const typeMatched =
      //       item.types
      //         ?.map(gglType => {
      //           const found = tpDB?.gl_types.findIndex(
      //             dbType => dbType.value === gglType,
      //           );
      //           return found > -1;
      //         })
      //         ?.findIndex(v => v === false) ?? -1;
      //     expect(typeMatched).toBe(-1); /// typeMatched가 -1이어야 tpDB에 type으로 존재한다는 말이다.
      //     expect(item.user_ratings_total).toBe(
      //       tpDB.gl_user_ratings_total ?? undefined,
      //     );
      //   }
      // }
      // const deleteTPPromise = prisma.tourPlace.deleteMany({
      //   where: {
      //     id: {
      //       in: deleteTPDBListToRestore,
      //     },
      //   },
      // });
      // const deleteRes = await prisma.$transaction([deleteTPPromise]);
      // console.log(
      //   `test data(gglNearbySearchRes) deletion done ${JSON.stringify(
      //     deleteRes,
      //   )}`,
      // );
    });
  });
});
