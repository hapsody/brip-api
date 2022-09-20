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

import { params } from './testData';

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
    // it('params 내의 모든 프로퍼티 값이 => null', async () => {}); // not need case
    // it('params 내의 모든 프로퍼티 값이 => undefined', async () => {});  //not need case

    it('params 중 일부의 타입이 잘못 전달됨', async () => {
      // minBudget 또는 maxBudget 누락
      const emptyMinBudgetResponse = await request(app)
        .post('/schedule/getRecommendListWithLatLngt')
        .send({
          ...params,
          searchCond: {
            ...params.searchCond,
            minBudget: undefined,
          },
        })
        .expect(400);

      const emptyMinBudgetResult =
        emptyMinBudgetResponse.body as GetRecommendListWithLatLngtResponse;

      expect(emptyMinBudgetResult.IBcode).toBe('3001');
      expect(emptyMinBudgetResult.IBdetail).toBe(
        'minBudget, maxBudget은 모두 0이상의 값이 제공되어야 합니다.',
      );

      const emptyMaxBudgetResponse = await request(app)
        .post('/schedule/getRecommendListWithLatLngt')
        .send({
          ...params,
          searchCond: {
            ...params.searchCond,
            minBudget: undefined,
          },
        })
        .expect(400);

      const emptyMaxBudgetResult =
        emptyMaxBudgetResponse.body as GetRecommendListWithLatLngtResponse;

      expect(emptyMaxBudgetResult.IBcode).toBe('3001');
      expect(emptyMaxBudgetResult.IBdetail).toBe(
        'minBudget, maxBudget은 모두 0이상의 값이 제공되어야 합니다.',
      );
    });
  });
});
