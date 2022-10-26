import request from 'supertest';
import server from '@src/server';
import prisma from '@src/prisma';
import {
  QueryParams,
  TourPlace,
  VisitSchedule,
  ScheduleBank,
} from '@prisma/client';
import { ibDefs, IBResFormat } from '@src/utils';
import {
  ReqNonMembersUserTokenResType,
  ReqNonMembersUserTokenSuccessResType,
} from '@src/routes/auth';
import {
  ReqScheduleResponse,
  ReqScheduleResponsePayload,
} from '../../../types/schduleTypes';

import { params } from './testData';

let reqScheduleRawResult: ReqScheduleResponse;
let reqScheduleRes: ReqScheduleResponsePayload;
let queryParams: QueryParams & {
  tourPlace: TourPlace[];
  visitSchedule: VisitSchedule[];
  savedSchedule: ScheduleBank | null;
};
let intervalId: ReturnType<typeof setInterval>;

beforeAll(async () => {
  const mockData = await prisma.mockBookingDotComHotelResource.findMany();
  if (mockData.length === 0) {
    const addMockTransactionRawRes = await request(server)
      .post('/schedule/addMockHotelResource')
      .send({
        ...params.addMockParam,
        mock: undefined,
      });
    const { IBmessage } = addMockTransactionRawRes.body as IBResFormat;
    expect(IBmessage).toBe('Success');
  }

  const userTokenRawRes = await request(server)
    .post('/auth/reqNonMembersUserToken')
    .send();
  const userTokenRes = userTokenRawRes.body as ReqNonMembersUserTokenResType;
  const userToken =
    userTokenRes.IBparams as ReqNonMembersUserTokenSuccessResType;

  const response = await request(server)
    .post('/schedule/reqSchedule')
    .set('Authorization', `Bearer ${userToken.userToken}`)
    .send(params.mainParam);

  reqScheduleRawResult = response.body as ReqScheduleResponse;
  reqScheduleRes = reqScheduleRawResult.IBparams as ReqScheduleResponsePayload;

  // const dbResult = await prisma.queryParams.findUnique({
  //   where: {
  //     scheduleHash: reqScheduleRes.scheduleHash,
  //   },
  // });
  // expect(dbResult).not.toBeNull();
  // queryParams = dbResult as QueryParams;
});

afterAll(done => {
  clearInterval(intervalId);
  if (queryParams)
    prisma.queryParams
      .delete({
        where: {
          scheduleHash: reqScheduleRes.scheduleHash,
        },
      })
      .then()
      .finally(() => {
        server.close(err => {
          if (err) console.error(err);
          done();
        });
      });
});

jest.setTimeout(120000);

describe('Correct case test', () => {
  describe('정상 요청 예시 검증', () => {
    it('일정 해시 생성 확인', () => {
      expect(reqScheduleRawResult.IBmessage).toEqual(
        { ...ibDefs.SUCCESS }.IBmessage,
      );
      expect(reqScheduleRes.scheduleHash).not.toBeUndefined();
      console.log(
        `reqSchedule makes scheduleHash: ${reqScheduleRes.scheduleHash}`,
      );
    });

    it('생성완료 후 결과값 유효성 확인', async () => {
      const result = await new Promise(resolve => {
        let count = 0;
        intervalId = setInterval(() => {
          count += 1;
          console.log(`check: ${count}`);
          prisma.queryParams
            .findMany({
              where: {
                scheduleHash: reqScheduleRes.scheduleHash,
                visitSchedule: {
                  some: {},
                },
              },
              include: {
                tourPlace: true,
                visitSchedule: true,
                savedSchedule: true,
              },
            })
            .then(qp => {
              if (qp.length > 1) {
                clearInterval(intervalId);
                resolve(false);
              }
              if (qp.length === 1) {
                expect(qp[0].savedSchedule).toBeNull();
                [queryParams] = qp;

                clearInterval(intervalId);
                resolve(true);
              }
            })
            .catch(err => {
              console.error(err);
              clearInterval(intervalId);
            });
        }, 5000);
      });

      expect(result).toBe(true);
      expect(queryParams).not.toBeUndefined();
      expect(queryParams).not.toBeNull();
      if (queryParams) {
        expect(queryParams.id).toBeGreaterThan(0);
      }
    });
  });
});
