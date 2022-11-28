/* eslint-disable no-restricted-syntax */
import request from 'supertest';
import server from '@src/server';
import prisma from '@src/prisma';
import {
  QueryParams,
  MetaScheduleInfo,
  VisitSchedule,
  TourPlace,
} from '@prisma/client';
import { ibDefs } from '@src/utils';
import {
  ReqNonMembersUserTokenSuccessResType,
  ReqNonMembersUserTokenResType,
} from '@src/routes/auth';
import {
  ReqScheduleRETParam,
  ReqScheduleRETParamPayload,
  GetCandidateScheduleRETParamPayload,
} from '../types/schduleTypes';
import { params, travelNights } from './testData';

const travelDays = travelNights + 1;

jest.setTimeout(120000);

let getCandSchdRes: GetCandidateScheduleRETParamPayload;
let reqSchdRes: ReqScheduleRETParamPayload;
let queryParams:
  | (QueryParams & {
      metaScheduleInfo: MetaScheduleInfo | null;
      visitSchedule: (VisitSchedule & {
        tourPlace: TourPlace | null;
      })[];
    })
  | null;
let userToken: ReqNonMembersUserTokenSuccessResType;
beforeAll(async () => {
  const userTokenRawRes = await request(server)
    .post('/auth/reqNonMembersUserToken')
    .send();
  const userTokenRes = userTokenRawRes.body as ReqNonMembersUserTokenResType;
  userToken = userTokenRes.IBparams as ReqNonMembersUserTokenSuccessResType;

  const reqSchdResponse = await request(server)
    .post('/schedule/reqSchedule')
    .set('Authorization', `Bearer ${userToken.userToken}`)
    .send(params.reqScheduleReqOpt);

  const reqSchdRawResult = reqSchdResponse.body as ReqScheduleRETParam;
  reqSchdRes = reqSchdRawResult.IBparams as ReqScheduleRETParamPayload;
  expect(reqSchdRawResult.IBcode).toEqual({ ...ibDefs.SUCCESS }.IBcode);
  expect(reqSchdRes).toHaveProperty('id');
  queryParams = await prisma.queryParams.findUnique({
    where: {
      id: Number(reqSchdRes.id),
    },
    include: {
      visitSchedule: {
        include: {
          tourPlace: true,
        },
      },
      metaScheduleInfo: true,
    },
  });
  expect(queryParams).toBeDefined();

  const getCandSchdResponse = await request(server)
    .post('/schedule/getCandidateSchedule')
    .set('Authorization', `Bearer ${userToken.userToken}`)
    .send({
      ...params.getCandSchdReqOpt,
      queryParamsId: queryParams?.id,
    });

  const getCandSchdRawResult = getCandSchdResponse.body as ReqScheduleRETParam;
  getCandSchdRes =
    getCandSchdRawResult.IBparams as GetCandidateScheduleRETParamPayload;
  expect(getCandSchdRawResult.IBcode).toEqual({ ...ibDefs.SUCCESS }.IBcode);
});

describe('Schedule Express Router E2E Test', () => {
  describe('POST /getCandidateSchedule', () => {
    it('Case: Correct - 파라미터-결과간 검증', async () => {
      /**
       * 1. 응답값이 필수 리턴값을 갖는가
       */
      const { candidateList } = getCandSchdRes;
      for await (const cand of candidateList) {
        expect(cand.id).toBeDefined();
        expect(cand.spotType).toBeDefined();
        expect(cand.previewImg).toBeDefined();
        expect(cand.spotName).toBeDefined();
        expect(cand.spotAddr).toBeDefined();
        expect(cand.night).toBe(travelNights);
        expect(cand.days).toBe(travelDays);
      }
    });
  });
  it('Case: Correct - 이미 만들어진 일정의 tourPlace를 중복 리턴하진 않았는가', () => {
    const { candidateList } = getCandSchdRes;
    const tpIds = reqSchdRes.plan
      .map(p => p.day.map(d => d.titleList.map(l => l.tourPlaceData?.id)))
      .flat(10);

    const duplicateRes = tpIds.filter(
      tpId => tpId && candidateList.find(cand => Number(cand.id) === tpId),
    );
    console.log(`tpIds: ${JSON.stringify(tpIds)}`);
    console.log(
      `getCandSchdRes: ${JSON.stringify(candidateList.map(v => v.id))}`,
    );

    expect(duplicateRes.length).toBe(0);
  });

  it('Case: Correct - spotType에 따른 올바른 타입이 리턴되는가', async () => {
    const hotelCaseResponse = await request(server)
      .post('/schedule/getCandidateSchedule')
      .set('Authorization', `Bearer ${userToken.userToken}`)
      .send({
        ...params.getCandSchdReqOpt,
        spotType: 'HOTEL',
        queryParamsId: queryParams?.id,
      });

    const hotelCaseRawResponse = hotelCaseResponse.body as ReqScheduleRETParam;
    const hotelCaseRes =
      hotelCaseRawResponse.IBparams as GetCandidateScheduleRETParamPayload;
    expect(hotelCaseRawResponse.IBcode).toEqual({ ...ibDefs.SUCCESS }.IBcode);

    const restaurantCaseResponse = await request(server)
      .post('/schedule/getCandidateSchedule')
      .set('Authorization', `Bearer ${userToken.userToken}`)
      .send({
        ...params.getCandSchdReqOpt,
        spotType: 'RESTAURANT',
        queryParamsId: queryParams?.id,
      });

    const restaurantCaseRawResponse =
      restaurantCaseResponse.body as ReqScheduleRETParam;
    const restaurantCaseRes =
      restaurantCaseRawResponse.IBparams as GetCandidateScheduleRETParamPayload;
    expect(restaurantCaseRawResponse.IBcode).toEqual(
      { ...ibDefs.SUCCESS }.IBcode,
    );

    const spotCaseResponse = await request(server)
      .post('/schedule/getCandidateSchedule')
      .set('Authorization', `Bearer ${userToken.userToken}`)
      .send({
        ...params.getCandSchdReqOpt,
        spotType: 'SPOT',
        queryParamsId: queryParams?.id,
      });

    const spotCaseRawResponse = spotCaseResponse.body as ReqScheduleRETParam;
    const spotCaseRes =
      spotCaseRawResponse.IBparams as GetCandidateScheduleRETParamPayload;
    expect(spotCaseRawResponse.IBcode).toEqual({ ...ibDefs.SUCCESS }.IBcode);

    for await (const hotelCase of hotelCaseRes.candidateList) {
      hotelCase.spotType.includes('HOTEL');
    }
    for await (const restaurantCase of restaurantCaseRes.candidateList) {
      restaurantCase.spotType.includes('RESTAURANT');
    }
    for await (const spotCase of spotCaseRes.candidateList) {
      spotCase.spotType.includes('SPOT');
    }
  });
});
