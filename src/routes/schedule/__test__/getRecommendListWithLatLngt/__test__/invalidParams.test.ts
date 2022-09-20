import request from 'supertest';
import app from '@src/app';
// import { User } from '@prisma/client';
import {
  GetRecommendListWithLatLngtResponse,
  // GetRecommendListWithLatLngtInnerAsyncFnResponse,
} from '../../../types/schduleTypes';
import // getTravelNights,
// getListQueryParamsInnerAsyncFn,
// orderByDistanceFromNode,
'../../../schedule';

// import { params } from './testData';

jest.setTimeout(100000);

describe('Invalid parameter case tests', () => {
  describe('Case: null이나 undefined 파라미터 전달 부분', () => {
    it('params 자체가 전달되지 않음(undefined)', async () => {
      const response = await request(app)
        .post('/schedule/getRecommendListWithLatLngt')
        .send()
        .expect(400);

      const recommendRawResult =
        response.body as GetRecommendListWithLatLngtResponse;

      expect(recommendRawResult.IBcode).toBe('3001');
    });
    it('params 내의 모든 프로퍼티 값이 => null', async () => {});
    it('params 내의 모든 프로퍼티 값이 => undefined', async () => {});
    it('params 중 일부의 타입이 잘못 전달됨', async () => {});
  });
});
