import request from 'supertest';
import app from '@src/app';
import prisma from '@src/prisma';
// import prisma from '@src/prisma';
import { TourPlace } from '@prisma/client';
import { keys, isEmpty, isNil } from 'lodash';
import { ibDefs, IBResFormat } from '@src/utils';
import {
  GetHotelDataFromBKCRETParam,
  GetHotelDataFromBKCRETParamPayload,
} from '../types/schduleTypes';
import { params } from './testData';

jest.setTimeout(120000);

beforeAll(async () => {
  const mockData = await prisma.mockBookingDotComHotelResource.findMany();
  if (mockData.length === 0) {
    const addMockTransactionRawRes = await request(app)
      .post('/schedule/addMockBKCHotelResource')
      .send({ ...params.searchHotelOpt, mock: undefined });
    const { IBcode } = addMockTransactionRawRes.body as IBResFormat;
    expect(IBcode).toBe('1000');
  }
});

describe('Schedule Express Router E2E Test', () => {
  describe('POST /searchHotel', () => {
    it('Case: Correct', async () => {
      const { searchHotelOpt } = params;
      const response = await request(app)
        .post('/schedule/searchHotel')
        .send({
          ...searchHotelOpt,
          mock: true,
        });

      const result = response.body as GetHotelDataFromBKCRETParam;
      const IBparams = result.IBparams as GetHotelDataFromBKCRETParamPayload;
      expect(result.IBcode).toEqual({ ...ibDefs.SUCCESS }.IBcode);
      expect(IBparams.hotelSearchCount).toBeGreaterThan(0);
      expect(IBparams.hotelSearchResult).not.toBeFalsy();
      expect(IBparams.hotelSearchResult).toHaveLength(
        IBparams.hotelSearchCount,
      );
      const { hotelSearchResult } = IBparams;
      // eslint-disable-next-line no-restricted-syntax
      for await (const item of hotelSearchResult) {
        if (item && !isEmpty(item)) {
          const notUndefinedAtLeastOneBKCValue = keys(item)
            .filter(k => k.includes('bkc_'))
            .map((k: keyof Partial<TourPlace>) => item[k])
            .find(bkcPropValue => !isNil(bkcPropValue));
          expect(notUndefinedAtLeastOneBKCValue).toBeDefined();
        }
      }
    });
  });
});
