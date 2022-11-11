import request from 'supertest';
import app from '@src/app';
import { ibDefs } from '@src/utils';
import moment from 'moment';
import prisma from '@src/prisma';
import { isEmpty } from 'lodash';
import {
  GetPlaceDataFromGGLRETParam,
  GetPlaceDataFromGGLRETParamPayload,
} from '../types/schduleTypes';
import { params } from './testData';

jest.setTimeout(120000);

describe('Schedule Express Router E2E Test', () => {
  describe('POST /searchPlace', () => {
    it('Case: Correct', async () => {
      const response = await request(app)
        .post('/schedule/searchPlace')
        .send(params.placeSearchOpt);

      const result = response.body as GetPlaceDataFromGGLRETParam;
      const IBparams = result.IBparams as GetPlaceDataFromGGLRETParamPayload;
      expect(result.IBcode).toEqual({ ...ibDefs.SUCCESS }.IBcode);

      expect(IBparams.placeSearchCount).not.toBeFalsy();
      expect(IBparams.placeSearchCount).toBeGreaterThan(0);
      expect(IBparams.placeSearchResult).not.toBeFalsy();
      expect(IBparams.placeSearchResult).toHaveLength(
        IBparams.placeSearchCount,
      );
      const { placeSearchResult } = IBparams;
      // eslint-disable-next-line no-restricted-syntax
      for await (const item of placeSearchResult) {
        expect(item).toHaveProperty('business_status');
        expect(item).toHaveProperty('geometry');
        expect(item.geometry).toHaveProperty('location');
        expect(item.geometry?.location).toHaveProperty('lat');
        expect(item.geometry?.location).toHaveProperty('lng');
        expect(item.geometry).toHaveProperty('viewport');
        expect(item.geometry?.viewport).toHaveProperty('northeast');
        expect(item.geometry?.viewport).toHaveProperty('southwest');
        expect(item.geometry?.viewport?.northeast).toHaveProperty('lat');
        expect(item.geometry?.viewport?.northeast).toHaveProperty('lng');
        expect(item.geometry?.viewport?.southwest).toHaveProperty('lat');
        expect(item.geometry?.viewport?.southwest).toHaveProperty('lng');
        expect(item).toHaveProperty('icon');
        expect(item).toHaveProperty('icon_background_color');
        expect(item).toHaveProperty('icon_mask_base_uri');
        expect(item).toHaveProperty('name');
        // expect(item).toHaveProperty('opening_hours');
        // expect(item).toHaveProperty('photos');

        if (item.photos && item.photos.length > 0) {
          for (let i = 0; i < item.photos.length; i += 1) {
            expect(item.photos[i]).toHaveProperty('height');
            expect(item.photos[i]).toHaveProperty('html_attributions');
            expect(item.photos[i]).toHaveProperty('photo_reference');
            expect(item.photos[i]).toHaveProperty('width');
          }
        }
        expect(item).toHaveProperty('place_id');
        // expect(item).toHaveProperty('plus_code');
        expect(item).toHaveProperty('rating');
        expect(item).toHaveProperty('reference');
        expect(item).toHaveProperty('scope');
        expect(item).toHaveProperty('types');
        expect(item).toHaveProperty('user_ratings_total');
        expect(item).toHaveProperty('vicinity');
      }
    });
    it('Case: Correct - store 옵션 true 테스트', async () => {
      const response = await request(app)
        .post('/schedule/searchPlace')
        .send({ ...params.placeSearchOpt, store: true });

      const result = response.body as GetPlaceDataFromGGLRETParam;
      const IBparams = result.IBparams as GetPlaceDataFromGGLRETParamPayload;
      expect(result.IBcode).toEqual({ ...ibDefs.SUCCESS }.IBcode);

      expect(IBparams.placeSearchCount).not.toBeFalsy();
      expect(IBparams.placeSearchCount).toBeGreaterThan(0);
      expect(IBparams.placeSearchResult).not.toBeFalsy();
      expect(IBparams.placeSearchResult).toHaveLength(
        IBparams.placeSearchCount,
      );
      const { placeSearchResult } = IBparams;

      const placeIds = placeSearchResult
        .map(v => v.place_id)
        .filter(i => i) as string[];
      const fromGoogleCount = placeIds.length;

      const tourPlace = await prisma.tourPlace.findMany({
        where: {
          AND: [
            {
              gglNearbySearchRes: {
                place_id: {
                  in: placeIds,
                },
              },
            },
            {
              updatedAt: {
                gte: moment().subtract(2000, 'milliseconds').toISOString(),
              },
            },
          ],
        },
        include: {
          gglNearbySearchRes: {
            include: {
              geometry: true,
              types: true,
              plus_code: true,
              photos: true,
            },
          },
        },
      });

      const gglNearbySearchRes = await prisma.gglNearbySearchRes.findMany({
        where: {
          place_id: { in: placeIds },
        },
      });
      /// 검색된 결과를 DB에 저장하면 중복된 place_id가 DB에 있는 경우 새로 저장이 되지는 않는다.
      /// 구글로부터의 결과중 place_id가 만약 undefined 인 경우는 제외하고 실제 저장이 되어야하는 결과들은 placeIds다.
      /// 때문에 placeIds.length만큼 DB에서 찾은 결과 숫자가 정확히 같아야한다.
      expect(gglNearbySearchRes.length).toBe(fromGoogleCount);
      expect(tourPlace.length).toBeGreaterThanOrEqual(
        gglNearbySearchRes.length,
      );

      const deleteTPDBListToRestore: number[] = [];
      const deleteNSDBListToRestore: number[] = [];
      // eslint-disable-next-line no-restricted-syntax
      for await (const item of placeSearchResult) {
        expect(item).toHaveProperty('business_status');
        expect(item).toHaveProperty('geometry');
        expect(item.geometry).toHaveProperty('location');
        expect(item.geometry?.location).toHaveProperty('lat');
        expect(item.geometry?.location).toHaveProperty('lng');
        expect(item.geometry).toHaveProperty('viewport');
        expect(item.geometry?.viewport).toHaveProperty('northeast');
        expect(item.geometry?.viewport).toHaveProperty('southwest');
        expect(item.geometry?.viewport?.northeast).toHaveProperty('lat');
        expect(item.geometry?.viewport?.northeast).toHaveProperty('lng');
        expect(item.geometry?.viewport?.southwest).toHaveProperty('lat');
        expect(item.geometry?.viewport?.southwest).toHaveProperty('lng');
        expect(item).toHaveProperty('icon');
        expect(item).toHaveProperty('icon_background_color');
        expect(item).toHaveProperty('icon_mask_base_uri');
        expect(item).toHaveProperty('name');
        // expect(item).toHaveProperty('opening_hours');
        // expect(item).toHaveProperty('photos');

        if (item.photos && item.photos.length > 0) {
          for (let i = 0; i < item.photos.length; i += 1) {
            expect(item.photos[i]).toHaveProperty('height');
            expect(item.photos[i]).toHaveProperty('html_attributions');
            expect(item.photos[i]).toHaveProperty('photo_reference');
            expect(item.photos[i]).toHaveProperty('width');
          }
        }
        expect(item).toHaveProperty('place_id');
        // expect(item).toHaveProperty('plus_code');
        expect(item).toHaveProperty('rating');
        expect(item).toHaveProperty('reference');
        expect(item).toHaveProperty('scope');
        expect(item).toHaveProperty('types');
        expect(item).toHaveProperty('user_ratings_total');
        expect(item).toHaveProperty('vicinity');

        const tpDB = tourPlace.find(
          tp => tp.gglNearbySearchRes?.place_id === item.place_id,
        );
        expect(tpDB).not.toBeUndefined();
        const gglDB = tpDB?.gglNearbySearchRes;
        expect(gglDB).not.toBeUndefined();
        if (gglDB) {
          deleteTPDBListToRestore.push(tpDB.id);
          if (moment().diff(moment(gglDB.updatedAt)) < 2000) {
            deleteNSDBListToRestore.push(gglDB.id);
          }

          /// 최근 업데이트가 된 DB항목만 새로 추가된 것이라고 가정
          const dbLocation = JSON.parse(
            gglDB?.geometry?.location as string,
          ) as {
            lat: string;
            lngt: string;
          };
          expect(item.geometry.location.lat).toBe(dbLocation.lat);
          expect(item.geometry.location.lng).toBe(dbLocation.lngt);

          if (item.opening_hours && !isEmpty(item.opening_hours)) {
            expect((item.opening_hours as { open_now: boolean }).open_now).toBe(
              gglDB?.opening_hours,
            );
          }

          if (item.photos && item.photos.length > 0) {
            for (let i = 0; i < item.photos.length; i += 1) {
              const photoFoundIdx = gglDB?.photos.findIndex(
                v =>
                  item &&
                  item.photos &&
                  (item.photos[i] as Partial<{ photo_reference: string }>)
                    .photo_reference === v.photo_reference,
              );
              expect(photoFoundIdx).not.toBe(-1);
            }
          }
          expect(item.place_id).toBe(gglDB?.place_id?.toString());
          expect(item.rating).toBe(gglDB?.rating);
          const typeMatch = item.types?.map(gglType => {
            const found = gglDB?.types.findIndex(
              dbType => dbType.value === gglType,
            );
            return found && found > -1;
          });
          expect(typeMatch?.findIndex(v => v === false)).toBe(-1);
          expect(item.user_ratings_total).toBe(gglDB?.user_ratings_total);
        }
      }

      const deleteTPPromise = prisma.tourPlace.deleteMany({
        where: {
          id: {
            in: deleteTPDBListToRestore,
          },
        },
      });
      const deleteNSPromise = prisma.gglNearbySearchRes.deleteMany({
        where: {
          id: {
            in: deleteNSDBListToRestore,
          },
        },
      });

      const deleteRes = await prisma.$transaction([
        deleteTPPromise,
        deleteNSPromise,
      ]);
      console.log(
        `test data(gglNearbySearchRes) deletion done ${JSON.stringify(
          deleteRes,
        )}`,
      );
    });
  });
});
