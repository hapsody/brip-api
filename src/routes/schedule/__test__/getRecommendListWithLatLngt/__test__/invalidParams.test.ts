import request from 'supertest';
import app from '@src/app';
import prisma from '@src/prisma';
import { IBResFormat } from '@src/utils';
// import { User } from '@prisma/client';
import {
  GetRecommendListWithLatLngtRetParams,
  // GetRecommendListWithLatLngtInnerAsyncFnRetParams,
} from '../../../types/schduleTypes';
import // getTravelNights,
// getListQueryParamsInnerAsyncFn,
// orderByDistanceFromNode,
'../../../schedule';

import { params } from './testData';

jest.setTimeout(120000);

beforeAll(async () => {
  const mockData = await prisma.mockBookingDotComHotelResource.findMany();
  if (mockData.length === 0) {
    const addMockTransactionRawRes = await request(app)
      .post('/schedule/addMockHotelResource')
      .send({ ...params.searchCond.searchHotelReqParams, mock: undefined });
    const { IBcode } = addMockTransactionRawRes.body as IBResFormat;
    expect(IBcode).toBe('1000');
  }
});

describe('Invalid parameter case tests', () => {
  describe('Case: null이나 undefined 파라미터 전달 부분', () => {
    it('params 자체가 전달되지 않음(undefined)', async () => {
      const response = await request(app)
        .post('/schedule/getRecommendListWithLatLngt')
        .send()
        .expect(400);

      const recommendRawResult =
        response.body as GetRecommendListWithLatLngtRetParams;

      expect(recommendRawResult.IBcode).toBe('3001');
    });
    // it('params 내의 모든 프로퍼티 값이 => null', async () => {}); // not need case
    // it('params 내의 모든 프로퍼티 값이 => undefined', async () => {});  //not need case

    it('params 중 minMoney 또는 maxMoney 누락', async () => {
      // # minMoney 또는 maxMoney 누락
      const emptyMinMoneyResponse = await request(app)
        .post('/schedule/getRecommendListWithLatLngt')
        .send({
          ...params,
          searchCond: {
            ...params.searchCond,
            minMoney: undefined,
          },
        })
        .expect(400);

      const emptyMinMoneyResult =
        emptyMinMoneyResponse.body as GetRecommendListWithLatLngtRetParams;

      expect(emptyMinMoneyResult.IBcode).toBe('3001');
      expect(emptyMinMoneyResult.IBdetail).toBe(
        'minMoney, maxMoney는 모두 0이상의 값이 제공되어야 합니다.',
      );

      const emptyMaxMoneyResponse = await request(app)
        .post('/schedule/getRecommendListWithLatLngt')
        .send({
          ...params,
          searchCond: {
            ...params.searchCond,
            maxMoney: undefined,
          },
        })
        .expect(400);

      const emptyMaxMoneyResult =
        emptyMaxMoneyResponse.body as GetRecommendListWithLatLngtRetParams;

      expect(emptyMaxMoneyResult.IBcode).toBe('3001');
      expect(emptyMaxMoneyResult.IBdetail).toBe(
        'minMoney, maxMoney는 모두 0이상의 값이 제공되어야 합니다.',
      );
    });

    it('params 중 startDate 또는 endDate 누락', async () => {
      const emptyDateResponse = await request(app)
        .post('/schedule/getRecommendListWithLatLngt')
        .send({
          ...params,
          searchCond: {
            ...params.searchCond,
            startDate: undefined,
            endDate: undefined,
          },
        })
        .expect(400);

      const emptyDateResult =
        emptyDateResponse.body as GetRecommendListWithLatLngtRetParams;

      expect(emptyDateResult.IBcode).toBe('3001');
      expect(emptyDateResult.IBdetail).toBe(
        'startDate, endDate 값은 모두 Date의 ISO string 형태로 제공되어야 합니다.',
      );
    });
    it('params 중 startDate 또는 endDate의 ISOString 타입이 아닌 startDate, endDate', async () => {
      // # ISOString 타입이 아닌 startDate, endDate
      const InvalidDateTypeResponse = await request(app)
        .post('/schedule/getRecommendListWithLatLngt')
        .send({
          ...params,
          searchCond: {
            ...params.searchCond,
            startDate: 'abcd',
            endDate: 1234,
          },
        })
        .expect(400);

      const InvalidDateTypeResult =
        InvalidDateTypeResponse.body as GetRecommendListWithLatLngtRetParams;

      expect(InvalidDateTypeResult.IBcode).toBe('3001');
      expect(InvalidDateTypeResult.IBdetail).toBe(
        'startDate, endDate 값은 모두 Date의 ISO string 형태로 제공되어야 합니다.',
      );
    });

    it('params 중 latitude, longitude 미제공', async () => {
      // # latitude, longitude 미제공
      const emptyLatLngtResponse = await request(app)
        .post('/schedule/getRecommendListWithLatLngt')
        .send({
          ...params,
          searchCond: {
            ...params.searchCond,
            nearbySearchReqParams: {
              ...params.searchCond.nearbySearchReqParams,
              location: {
                latitude: undefined,
                longitude: undefined,
              },
            },
          },
        })
        .expect(400);

      const emptyLatLngtResult =
        emptyLatLngtResponse.body as GetRecommendListWithLatLngtRetParams;

      expect(emptyLatLngtResult.IBcode).toBe('3001');
      expect(emptyLatLngtResult.IBdetail).toBe(
        '전달된 파라미터중 nearbySearchReqParams의 location(latitude, longitude) 값이 없거나 string으로 제공되지 않았습니다.',
      );
    });
    it('params 중 latitude, longitude null 제공', async () => {
      // # latitude, longitude 미제공
      const nullLatLngtResponse = await request(app)
        .post('/schedule/getRecommendListWithLatLngt')
        .send({
          ...params,
          searchCond: {
            ...params.searchCond,
            nearbySearchReqParams: {
              ...params.searchCond.nearbySearchReqParams,
              location: {
                latitude: null,
                longitude: null,
              },
            },
          },
        })
        .expect(400);

      const nullLatLngtResult =
        nullLatLngtResponse.body as GetRecommendListWithLatLngtRetParams;

      expect(nullLatLngtResult.IBcode).toBe('3001');
      expect(nullLatLngtResult.IBdetail).toBe(
        '전달된 파라미터중 nearbySearchReqParams의 location(latitude, longitude) 값이 없거나 string으로 제공되지 않았습니다.',
      );
    });
    it('params 중 location 미제공', async () => {
      // # location 미제공
      const emptyLocationResponse = await request(app)
        .post('/schedule/getRecommendListWithLatLngt')
        .send({
          ...params,
          searchCond: {
            ...params.searchCond,
            nearbySearchReqParams: {
              ...params.searchCond.nearbySearchReqParams,
              location: {},
            },
          },
        })
        .expect(400);

      const emptyLocationResult =
        emptyLocationResponse.body as GetRecommendListWithLatLngtRetParams;

      expect(emptyLocationResult.IBcode).toBe('3001');
      expect(emptyLocationResult.IBdetail).toBe(
        '전달된 파라미터중 nearbySearchReqParams의 location(latitude, longitude) 값이 없거나 string으로 제공되지 않았습니다.',
      );
    });

    it('params 중 hotel latitude, longitude 미제공', async () => {
      // # hotel latitude, longitude 미제공
      const emptyHotelLocationResponse = await request(app)
        .post('/schedule/getRecommendListWithLatLngt')
        .send({
          ...params,
          searchCond: {
            ...params.searchCond,
            searchHotelReqParams: {
              latitude: undefined,
              longitude: undefined,
            },
          },
        })
        .expect(400);

      const emptyHotelLocationResult =
        emptyHotelLocationResponse.body as GetRecommendListWithLatLngtRetParams;

      expect(emptyHotelLocationResult.IBcode).toBe('3001');
      expect(emptyHotelLocationResult.IBdetail).toBe(
        '전달된 파라미터중 searchHotelReqParams의 latitude, longitude 값이 없거나 string으로 제공되지 않았습니다.',
      );
    });
  });
});
