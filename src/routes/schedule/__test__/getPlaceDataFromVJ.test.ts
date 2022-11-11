import request from 'supertest';
import app from '@src/app';
import moment from 'moment';
import prisma from '@src/prisma';
import { ibDefs } from '@src/utils';
import {
  GetPlaceDataFromVJRETParam,
  GetPlaceDataFromVJRETParamPayload,
} from '../types/schduleTypes';
import { params } from './testData';

jest.setTimeout(120000);

describe('Schedule Express Router E2E Test', () => {
  describe('POST /getPlaceDataFromVJ', () => {
    it('Case: Correct - store true 테스트', async () => {
      const response = await request(app)
        .post('/schedule/getPlaceDataFromVJ')
        .send({ ...params.gglNearbySearchOpt, store: true });

      const result = response.body as GetPlaceDataFromVJRETParam;
      const IBparams = result.IBparams as GetPlaceDataFromVJRETParamPayload;
      expect(result.IBcode).toEqual({ ...ibDefs.SUCCESS }.IBcode);

      expect(IBparams.result).toBe('200');
      expect(IBparams.resultMessage).toBe('SUCCESS');

      const visitJejuItemByAPI = IBparams.items ?? [];
      const contentsIds = visitJejuItemByAPI
        .map(v => v.contentsid)
        .filter(i => i) as string[];
      const fromVJCount = contentsIds.length;

      const tourPlaceList = await prisma.tourPlace.findMany({
        where: {
          OR: [
            { tourPlaceType: 'VISITJEJU_SPOT' },
            { tourPlaceType: 'VISITJEJU_RESTAURANT' },
          ],
          visitJejuData: {
            contentsid: { in: contentsIds },
          },
          updatedAt: {
            gte: moment().subtract(2000, 'milliseconds').toISOString(),
          },
        },
        include: {
          visitJejuData: true,
        },
      });

      const visitJejuFromDB = await prisma.visitJejuData.findMany({
        where: {
          contentsid: { in: contentsIds },
        },
      });
      expect(visitJejuFromDB.length).toBe(fromVJCount);
      expect(tourPlaceList.length).toBeGreaterThanOrEqual(
        visitJejuFromDB.length,
      );

      const deleteTPDBListToRestore: number[] = [];
      const deleteVJDBListToRestore: number[] = [];

      // eslint-disable-next-line no-restricted-syntax
      for await (const vjAPI of visitJejuItemByAPI) {
        const tpDB = tourPlaceList.find(
          tp => tp.visitJejuData?.contentsid === vjAPI.contentsid,
        );
        const vjDB = tpDB?.visitJejuData;

        if (vjDB) {
          deleteTPDBListToRestore.push(tpDB.id);
          /// visitJejuData 중 최근에 updateAt 시간으로 기록된것, 즉 본 테스트 스크립트로 쿼리 후 생성된 결과값들에 대해 다시 삭제하여 원복한다.
          if (moment().diff(moment(vjDB.updatedAt)) < 2000) {
            deleteVJDBListToRestore.push(vjDB.id);

            if (vjAPI.contentsid) {
              expect(vjAPI.contentsid).toBe(vjDB.contentsid);
            } else {
              expect(vjDB.contentsid).toBeNull();
            }
          }
        }
      }

      const deleteTPPromise = prisma.tourPlace.deleteMany({
        where: {
          id: {
            in: deleteTPDBListToRestore,
          },
        },
      });
      const deleteVJPromise = prisma.visitJejuData.deleteMany({
        where: {
          id: {
            in: deleteVJDBListToRestore,
          },
        },
      });

      const deleteRes = await prisma.$transaction([
        deleteTPPromise,
        deleteVJPromise,
      ]);
      console.log(
        `test data(visitJejuData) deletion done ${JSON.stringify(deleteRes)}`,
      );

      // const { items } = IBparams;
      // if (items && !isEmpty(items)) {
      //   // eslint-disable-next-line no-restricted-syntax
      //   for await (const item of items) {
      //     expect(item).toHaveProperty('contentsid');
      //     expect(item).toHaveProperty('contentscd');
      //     expect(item.contentscd).toHaveProperty('value');
      //     expect(item.contentscd).toHaveProperty('label');
      //     expect(item.contentscd).toHaveProperty('refId');
      //     expect(item).toHaveProperty('title');
      //     if (item.region1cd) {
      //       expect(item.region1cd).toHaveProperty('value');
      //       expect(item.region1cd).toHaveProperty('label');
      //       expect(item.region1cd).toHaveProperty('refId');
      //     }

      //     if (item.region2cd) {
      //       expect(item.region2cd).toHaveProperty('value');
      //       expect(item.region2cd).toHaveProperty('label');
      //       expect(item.region2cd).toHaveProperty('refId');
      //     }

      //     expect(item).toHaveProperty('address');
      //     expect(item).toHaveProperty('roadaddress');
      //     expect(item).toHaveProperty('tag');
      //     expect(item).toHaveProperty('introduction');
      //     expect(item).toHaveProperty('latitude');
      //     expect(item).toHaveProperty('longitude');
      //     expect(item).toHaveProperty('postcode');
      //     expect(item).toHaveProperty('phoneno');
      //     expect(item).toHaveProperty('reqPhoto');
      //     expect(item.reqPhoto).toHaveProperty('descseo');
      //     if (item.reqPhoto) {
      //       expect(item.reqPhoto).toHaveProperty('photoid');
      //       expect(item.reqPhoto).toHaveProperty('imgpath');
      //       expect(item.reqPhoto).toHaveProperty('thumbnailpath');
      //     }
      //   }
      // }
    });
  });
});
