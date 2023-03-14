/* eslint-disable no-restricted-syntax */
import request from 'supertest';
import server from '@src/server';
// import moment from 'moment';
import prisma from '@src/prisma';
import { QueryParams } from '@prisma/client';
// import { isEmpty } from 'lodash';
import { ibDefs } from '@src/utils';
import {
  ReqNonMembersUserTokenSuccessResType,
  ReqNonMembersUserTokenResType,
} from '@src/routes/auth';
import {
  ReqScheduleRETParam,
  ReqScheduleRETParamPayload,
  // MealOrder,
} from '../types/schduleTypes';
import { params } from './testData';

// const travelDays = travelNights + 1;

jest.setTimeout(120000);

let rawResult: ReqScheduleRETParam;
let callRes: ReqScheduleRETParamPayload;
let queryParams: QueryParams | null;
beforeAll(async () => {
  const userTokenRawRes = await request(server)
    .post('/auth/reqNonMembersUserToken')
    .send();
  const userTokenRes = userTokenRawRes.body as ReqNonMembersUserTokenResType;
  const userToken =
    userTokenRes.IBparams as ReqNonMembersUserTokenSuccessResType;

  const response = await request(server)
    .post('/schedule/reqSchedule')
    .set('Authorization', `Bearer ${userToken.userToken}`)
    .send(params.reqScheduleReqOpt);

  rawResult = response.body as ReqScheduleRETParam;
  callRes = rawResult.IBparams as ReqScheduleRETParamPayload;
  expect(rawResult.IBcode).toEqual({ ...ibDefs.SUCCESS }.IBcode);

  expect(callRes).toHaveProperty('id'); /// <= queryParams.id
  queryParams = await prisma.queryParams.findUnique({
    where: {
      id: Number(callRes.id),
    },
    include: {
      visitSchedule: {
        include: {
          tourPlace: true,
        },
      },
    },
  });
  expect(queryParams).toBeDefined();
});

describe('Schedule Express Router E2E Test', () => {
  it('temp', () => {});
  // describe('POST /reqSchedule', () => {
  //   it('Case: Correct - 파라미터-결과간 검증', () => {
  //     /**
  //      * 1. 응답값이 queryParamsId, plan 을 갖는가
  //      * 2. plan은 min, mid, max로 세개를 갖는가
  //      * 3. 각 plan별로 여행일수 (travelDays)에 해당하는 추천 일정들을 갖고 잇는가
  //      */
  //     expect(callRes).toHaveProperty('id'); /// <= queryParamsId
  //     expect(callRes).toHaveProperty('plan');
  //     expect(callRes.plan.length).toBe(3);
  //     expect(callRes.plan[0].planType).toBe('MIN');
  //     expect(callRes.plan[1].planType).toBe('MID');
  //     expect(callRes.plan[2].planType).toBe('MAX');
  //     expect(callRes.plan[0].day.length).toBe(travelDays);
  //     expect(callRes.plan[1].day.length).toBe(travelDays);
  //     expect(callRes.plan[2].day.length).toBe(travelDays);
  //   });

  //   it('Case: Correct - titleList의 tourPlace Type이 order 순서에 맞게 배치되어 있는가', async () => {
  //     /**
  //      * 1. 각 날짜별 일정의 순서가 mealOrder에 제시된 대로 배치되었는가
  //      * 2.
  //      */
  //     const { day: minDay } = callRes.plan[0];
  //     const { day: midDay } = callRes.plan[1];
  //     const { day: maxDay } = callRes.plan[2];

  //     for await (const day of minDay) {
  //       const mealOrder = new MealOrder();
  //       let nextMealOrder = mealOrder.getNextMealOrder();
  //       for await (const order of day.titleList) {
  //         expect(order).toBeDefined();
  //         if (order.orderNo === '0') {
  //           expect(order.tourPlaceData?.tourPlaceType.includes('HOTEL')).toBe(
  //             true,
  //           );
  //         } else if (order.orderNo === nextMealOrder.toString()) {
  //           expect(
  //             order.tourPlaceData?.tourPlaceType.includes('RESTAURANT'),
  //           ).toBe(true);
  //           nextMealOrder = mealOrder.getNextMealOrder();
  //         } else {
  //           expect(order.tourPlaceData?.tourPlaceType.includes('SPOT')).toBe(
  //             true,
  //           );
  //         }
  //       }
  //     }

  //     for await (const day of midDay) {
  //       const mealOrder = new MealOrder();
  //       let nextMealOrder = mealOrder.getNextMealOrder();
  //       for await (const order of day.titleList) {
  //         expect(order).toBeDefined();
  //         if (order.orderNo === '0') {
  //           expect(order.tourPlaceData?.tourPlaceType.includes('HOTEL')).toBe(
  //             true,
  //           );
  //         } else if (order.orderNo === nextMealOrder.toString()) {
  //           expect(
  //             order.tourPlaceData?.tourPlaceType.includes('RESTAURANT'),
  //           ).toBe(true);
  //           nextMealOrder = mealOrder.getNextMealOrder();
  //         } else {
  //           expect(order.tourPlaceData?.tourPlaceType.includes('SPOT')).toBe(
  //             true,
  //           );
  //         }
  //       }
  //     }

  //     for await (const day of maxDay) {
  //       const mealOrder = new MealOrder();
  //       let nextMealOrder = mealOrder.getNextMealOrder();
  //       for await (const order of day.titleList) {
  //         expect(order).toBeDefined();
  //         if (order.orderNo === '0') {
  //           expect(order.tourPlaceData?.tourPlaceType.includes('HOTEL')).toBe(
  //             true,
  //           );
  //         } else if (order.orderNo === nextMealOrder.toString()) {
  //           expect(
  //             order.tourPlaceData?.tourPlaceType.includes('RESTAURANT'),
  //           ).toBe(true);
  //           nextMealOrder = mealOrder.getNextMealOrder();
  //         } else {
  //           expect(order.tourPlaceData?.tourPlaceType.includes('SPOT')).toBe(
  //             true,
  //           );
  //         }
  //       }
  //     }
  //   });

  //   it('Case: Correct - titleList에 예약 추천되는 hotel 들의 일정이 잘 분할 됐는가', async () => {
  //     /**
  //      * 1. queryParams에 저장된 startDate와 endDate의 날짜와, 일정중 첫 호텔의 checkin, 일정중 마지막 호텔의 checkout 날짜가 일치하는지 여부 확인
  //      * 2. 각 호텔의 stayPeriod 유효성 검증
  //      * 3. 각 숙소가 변경될때 이전 숙소의 checkout날짜와 다음 숙소의 checkin 날짜가 같은지
  //      */
  //     const { day: minDay } = callRes.plan[0];
  //     const { day: midDay } = callRes.plan[1];
  //     const { day: maxDay } = callRes.plan[2];

  //     let firstCheckin: string = '';
  //     let lastCheckout: string = '';
  //     for await (const day of minDay) {
  //       let nextCheckin: string = '';
  //       for await (const order of day.titleList) {
  //         expect(order).toBeDefined();
  //         if (order.orderNo === '0') {
  //           expect(order.checkin).toBeDefined();
  //           expect(order.checkout).toBeDefined();

  //           if (isEmpty(firstCheckin)) firstCheckin = order.checkin as string;
  //           lastCheckout = order.checkout as string;

  //           if (!isEmpty(nextCheckin)) expect(order.checkin).toBe(nextCheckin);
  //           nextCheckin = order.checkout as string;

  //           const calculatedCurCheckout = moment(order.checkin)
  //             .add(order.stayPeriod, 'd')
  //             .toISOString();
  //           expect(order.checkout).toBe(calculatedCurCheckout);
  //         }
  //       }
  //     }
  //     expect(firstCheckin.toString()).toBe(
  //       queryParams?.startDate?.toISOString(),
  //     );
  //     expect(lastCheckout.toString()).toBe(queryParams?.endDate?.toISOString());

  //     for await (const day of midDay) {
  //       let nextCheckin: string = '';
  //       for await (const order of day.titleList) {
  //         expect(order).toBeDefined();
  //         if (order.orderNo === '0') {
  //           expect(order.checkin).toBeDefined();
  //           expect(order.checkout).toBeDefined();

  //           if (isEmpty(firstCheckin)) firstCheckin = order.checkin as string;
  //           lastCheckout = order.checkout as string;

  //           if (!isEmpty(nextCheckin)) expect(order.checkin).toBe(nextCheckin);
  //           nextCheckin = order.checkout as string;

  //           const calculatedCurCheckout = moment(order.checkin)
  //             .add(order.stayPeriod, 'd')
  //             .toISOString();
  //           expect(order.checkout).toBe(calculatedCurCheckout);
  //         }
  //       }
  //     }

  //     expect(firstCheckin.toString()).toBe(
  //       queryParams?.startDate?.toISOString(),
  //     );
  //     expect(lastCheckout.toString()).toBe(queryParams?.endDate?.toISOString());

  //     for await (const day of maxDay) {
  //       let nextCheckin: string = '';
  //       for await (const order of day.titleList) {
  //         expect(order).toBeDefined();
  //         if (order.orderNo === '0') {
  //           expect(order.checkin).toBeDefined();
  //           expect(order.checkout).toBeDefined();

  //           if (isEmpty(firstCheckin)) firstCheckin = order.checkin as string;
  //           lastCheckout = order.checkout as string;

  //           if (!isEmpty(nextCheckin)) expect(order.checkin).toBe(nextCheckin);
  //           nextCheckin = order.checkout as string;

  //           const calculatedCurCheckout = moment(order.checkin)
  //             .add(order.stayPeriod, 'd')
  //             .toISOString();
  //           expect(order.checkout).toBe(calculatedCurCheckout);
  //         }
  //       }
  //     }

  //     expect(firstCheckin.toString()).toBe(
  //       queryParams?.startDate?.toISOString(),
  //     );
  //     expect(lastCheckout.toString()).toBe(queryParams?.endDate?.toISOString());
  //   });

  //   it('Case: Correct - 리턴값의 visitScheduleId와 tourPlaceData가 맞는 데이터를 제시하는가', async () => {
  //     const { day: minDay } = callRes.plan[0];
  //     const { day: midDay } = callRes.plan[1];
  //     const { day: maxDay } = callRes.plan[2];

  //     for await (const day of minDay) {
  //       for await (const order of day.titleList) {
  //         expect(order).toBeDefined();
  //         const crossChkSchdRes = await prisma.visitSchedule.findUnique({
  //           where: {
  //             id: Number(order.visitScheduleId),
  //           },
  //           include: {
  //             tourPlace: {
  //               select: { id: true },
  //             },
  //           },
  //         });
  //         expect(crossChkSchdRes).toBeDefined();
  //         expect(crossChkSchdRes?.queryParamsId).toBe(queryParams?.id);
  //         expect(crossChkSchdRes?.tourPlaceId).toBe(order.tourPlaceData?.id);
  //       }
  //     }

  //     for await (const day of midDay) {
  //       for await (const order of day.titleList) {
  //         expect(order).toBeDefined();
  //         const crossChkSchdRes = await prisma.visitSchedule.findUnique({
  //           where: {
  //             id: Number(order.visitScheduleId),
  //           },
  //           include: {
  //             tourPlace: {
  //               select: { id: true },
  //             },
  //           },
  //         });
  //         expect(crossChkSchdRes).toBeDefined();
  //         expect(crossChkSchdRes?.queryParamsId).toBe(queryParams?.id);
  //         expect(crossChkSchdRes?.tourPlaceId).toBe(order.tourPlaceData?.id);
  //       }
  //     }

  //     for await (const day of maxDay) {
  //       for await (const order of day.titleList) {
  //         expect(order).toBeDefined();
  //         const crossChkSchdRes = await prisma.visitSchedule.findUnique({
  //           where: {
  //             id: Number(order.visitScheduleId),
  //           },
  //           include: {
  //             tourPlace: {
  //               select: { id: true },
  //             },
  //           },
  //         });
  //         expect(crossChkSchdRes).toBeDefined();
  //         expect(crossChkSchdRes?.queryParamsId).toBe(queryParams?.id);
  //         expect(crossChkSchdRes?.tourPlaceId).toBe(order.tourPlaceData?.id);
  //       }
  //     }
  //   });
  // });
});
