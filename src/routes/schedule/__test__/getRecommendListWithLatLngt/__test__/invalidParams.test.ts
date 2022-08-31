// import request from 'supertest';
// import app from '@src/app';
// // import prisma from '@src/prisma';
// // import { User } from '@prisma/client';
// import { ibDefs } from '@src/utils';
// import { SearchHotelRes } from '@prisma/client';
// import {
//   GetRecommendListWithLatLngtResponse,
//   GetListQueryParamsResponse,
//   GetRecommendListWithLatLngtInnerAsyncFnResponse,
// } from '../../../types/schduleTypes';
// import {
//   getTravelNights,
//   minHotelBudgetPortion,
//   midHotelBudgetPortion,
//   maxHotelBudgetPortion,
// } from '../../../schedule';
// import {
//   minBudget,
//   maxBudget,
//   travelStartDate,
//   travelEndDate,
//   hotelTransition,
//   // childrenNumber,
//   // childrenAges,
//   params,
// } from './testData';

jest.setTimeout(100000);

describe('Invalid parameter case tests', () => {
  describe('Case: null이나 undefined 파라미터 전달 부분', () => {
    it('params 자체가 전달되지 않음(undefined)', async () => {});
    it('params 내의 모든 프로퍼티 값이 => null', async () => {});
    it('params 내의 모든 프로퍼티 값이 => undefined', async () => {});
    it('params 중 일부의 타입이 잘못 전달됨', async () => {});
  });
});
