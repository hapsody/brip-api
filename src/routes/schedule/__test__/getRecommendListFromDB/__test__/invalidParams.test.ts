import request from 'supertest';
import app from '@src/app';
import prisma from '@src/prisma';
import { IBResFormat } from '@src/utils';

import { params } from './testData';

jest.setTimeout(120000);

beforeAll(async () => {
  const mockData = await prisma.mockBookingDotComHotelResource.findMany();
  if (mockData.length === 0) {
    const addMockTransactionRawRes = await request(app)
      .post('/schedule/addMockHotelResource')
      .send({ ...params.mockHotelResource.searchCond, mock: undefined });
    const { IBcode } = addMockTransactionRawRes.body as IBResFormat;
    expect(IBcode).toBe('1000');
  }
});

describe('Invalid parameter case tests', () => {
  describe('Case: null이나 undefined 파라미터 전달 부분', () => {
    it('구현 필요_ params 자체가 전달되지 않음(undefined)', async () => {
      // const response = await request(app)
      //   .post('/schedule/getRecommendListFromDB')
      //   .send()
      //   .expect(400);
      // const recommendRawResult =
      //   response.body as GetRecommendListWithLatLngtRetParams;
      // expect(recommendRawResult.IBcode).toBe('3001');
    });
  });
});
