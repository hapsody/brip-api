import request from 'supertest';
import app from '@src/app';
import { ibDefs } from '@src/utils';
import {
  GetPlaceDataFromVJRETParam,
  GetPlaceDataFromVJRETParamPayload,
} from '../types/schduleTypes';
import { params } from './testData';

jest.setTimeout(120000);

describe('Schedule Express Router E2E Test', () => {
  describe('POST /getPlaceDataFromVJ', () => {
    it('Case: Correct', async () => {
      const response = await request(app)
        .post('/schedule/getPlaceDataFromVJ')
        .send(params.placeSearchOpt);

      const result = response.body as GetPlaceDataFromVJRETParam;
      const IBparams = result.IBparams as GetPlaceDataFromVJRETParamPayload;
      expect(result.IBcode).toEqual({ ...ibDefs.SUCCESS }.IBcode);

      expect(IBparams.result).toBe('200');
      expect(IBparams.resultMessage).toBe('SUCCESS');
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
