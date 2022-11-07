import request from 'supertest';
import server from '@src/server';
import prisma from '@src/prisma';
import {
  QueryParams,
  TourPlace,
  VisitSchedule,
  ScheduleBank,
  MetaScheduleInfo,
  GglNearbySearchRes,
  SearchHotelRes,
} from '@prisma/client';
import { getTravelNights } from '@src/routes/schedule/internalFunc';
import { ibDefs, IBResFormat } from '@src/utils';
import {
  ReqNonMembersUserTokenResType,
  ReqNonMembersUserTokenSuccessResType,
} from '@src/routes/auth';
import {
  ReqScheduleRetParams,
  ReqScheduleResponsePayload,
  gSpotPerDay,
  gMealPerDay,
  gHotelTransition,
} from '../../../types/schduleTypes';

import { hotelTransition, params } from './testData';

let reqScheduleRawResult: ReqScheduleRetParams;
let reqScheduleRes: ReqScheduleResponsePayload;
let queryParams: QueryParams & {
  metaScheduleInfo: MetaScheduleInfo | null;
  tourPlace: (TourPlace & {
    gglNearbySearchRes: GglNearbySearchRes | null;
    searchHotelRes: SearchHotelRes | null;
  })[];
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

  reqScheduleRawResult = response.body as ReqScheduleRetParams;
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

/// 생성된 queryParams 필드 검증 > tourPlace > 장소 중복 저장 검사
const isDuplicated = (arr: SearchHotelRes[] | GglNearbySearchRes[]) => {
  /// 중복이면 true 리턴
  const bufferArr: string[] = [];
  const dupCheckRes = arr
    .map((v: SearchHotelRes | GglNearbySearchRes) => {
      if ((v as SearchHotelRes).hotel_id !== undefined) {
        const value = v as SearchHotelRes;
        const findIndex = bufferArr.findIndex(
          e => e === value.hotel_id.toString(),
        );
        if (findIndex === -1) {
          bufferArr.push(value.hotel_id.toString());
          return false;
        }
        return true;
      }

      const value = v as GglNearbySearchRes;
      const findIndex = bufferArr.findIndex(e => e === value.place_id);
      if (findIndex === -1) {
        bufferArr.push(value.place_id as string);
        return false;
      }
      return true;
    })
    .findIndex(e => e);

  if (dupCheckRes === -1) return false;
  return true;
};

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
      /// 생성이 완료될때까지 polling
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
                tourPlace: {
                  include: {
                    gglNearbySearchRes: true,
                    searchHotelRes: true,
                  },
                },
                metaScheduleInfo: true,
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

      /// 생성된 queryParams 필드 검증
      expect(queryParams.savedSchedule).toBeNull(); /// 아직 saveSchedule 호출하지 않은 상태
      /// 생성된 queryParams 필드 검증 > metaScheduleInfo
      expect(queryParams.metaScheduleInfo).not.toBeNull();
      expect(queryParams.metaScheduleInfo?.spotPerDay).toBe(gSpotPerDay);
      expect(queryParams.metaScheduleInfo?.mealPerDay).toBe(gMealPerDay);
      expect(queryParams.metaScheduleInfo?.hotelTransition).toBe(
        gHotelTransition,
      );
      const travelNights = getTravelNights(
        params.mainParam.startDate,
        params.mainParam.endDate,
      );
      expect(queryParams.metaScheduleInfo?.travelNights).toBe(travelNights);
      expect(queryParams.metaScheduleInfo?.travelDays).toBe(travelNights + 1);
      expect(
        queryParams.metaScheduleInfo?.recommendedMinHotelCount,
      ).toBeGreaterThanOrEqual(hotelTransition);

      /// 생성된 queryParams 필드 검증 > tourPlace
      const hotelTP = queryParams.tourPlace
        .map(v => {
          if (v.tourPlaceType === 'HOTEL') {
            if (v.gglNearbySearchRes !== null)
              expect(v.gglNearbySearchRes).toBeNull(); /// tourPlaceType이 HOTEL일때 tourPlace가 구글 장소관련 정보를 갖진 않는지
            return v.searchHotelRes;
          }
          return null;
        })
        .filter(v => v) as SearchHotelRes[];

      if (queryParams.metaScheduleInfo) {
        expect(hotelTP.length).toBeGreaterThanOrEqual(
          queryParams.metaScheduleInfo.recommendedMinHotelCount,
        );
      }
      expect(isDuplicated(hotelTP)).toBe(false);

      const restaurantTP = queryParams.tourPlace
        .map(v => {
          if (v.tourPlaceType === 'RESTAURANT') {
            if (v.searchHotelRes !== null) expect(v.searchHotelRes).toBeNull(); /// tourPlaceType이 RESTAURANT일때 tourPlace가 hotel쪽 결과를 가지지 않는지
            return v.gglNearbySearchRes;
          }
          return null;
        })
        .filter(v => v) as GglNearbySearchRes[];
      expect(isDuplicated(restaurantTP)).toBe(false);
      expect(restaurantTP.length).toBeGreaterThanOrEqual(
        gMealPerDay * travelNights + 1,
      );

      const spotTP = queryParams.tourPlace
        .map(v => {
          if (v.tourPlaceType === 'SPOT') {
            if (v.searchHotelRes !== null) expect(v.searchHotelRes).toBeNull(); /// tourPlaceType이 SPOT일때 tourPlace가 hotel쪽 결과를 가지지 않는지
            return v.gglNearbySearchRes;
          }
          return null;
        })
        .filter(v => v) as GglNearbySearchRes[];
      expect(isDuplicated(spotTP)).toBe(false);
      expect(spotTP.length).toBeGreaterThanOrEqual(
        gSpotPerDay * travelNights + 1,
      );
    });
  });
});
