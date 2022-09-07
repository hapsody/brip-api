import request from 'supertest';
import app from '@src/app';
// import prisma from '@src/prisma';
// import { User } from '@prisma/client';
import { ibDefs } from '@src/utils';
import { SearchHotelRes } from '@prisma/client';
import {
  GetRecommendListWithLatLngtResponse,
  GetListQueryParamsResponse,
  GetRecommendListWithLatLngtInnerAsyncFnResponse,
} from '../../../types/schduleTypes';
import {
  getTravelNights,
  minHotelBudgetPortion,
  midHotelBudgetPortion,
  maxHotelBudgetPortion,
} from '../../../schedule';

import {
  minBudget,
  maxBudget,
  travelStartDate,
  travelEndDate,
  hotelTransition,
  // childrenNumber,
  // childrenAges,
  params,
} from './testData';

jest.setTimeout(100000);

describe('Correct case test', () => {
  describe('1차적 정상 요청 예시 검증', () => {
    it('First Case', async () => {
      const response = await request(app)
        .post('/schedule/getRecommendListWithLatLngt')
        .send(params);

      const result = response.body as GetRecommendListWithLatLngtResponse;

      const iBparams =
        result.IBparams as GetRecommendListWithLatLngtInnerAsyncFnResponse;

      // 파라미터 입력값이 제대로 반영된 결과인지 파라미터 값과 응답값 비교 part
      expect(result.IBcode).toEqual({ ...ibDefs.SUCCESS }.IBcode);
      expect(iBparams.id).toBeGreaterThan(0);

      expect(typeof iBparams.id).toBe('number');
      if (iBparams.keyword === null || iBparams.keyword === '') {
        expect([undefined, null, '']).toContain(
          params.searchCond.nearbySearchReqParams.keyword,
        );
      } else {
        expect(iBparams.keyword).toBe(
          params.searchCond.nearbySearchReqParams.keyword,
        );
      }

      expect(iBparams.latitude).toBeCloseTo(
        Number.parseFloat(
          params.searchCond.nearbySearchReqParams.location.latitude,
        ),
        6,
      );
      expect(iBparams.longitude).toBeCloseTo(
        Number.parseFloat(
          params.searchCond.nearbySearchReqParams.location.longitude,
        ),
        6,
      );
      expect(iBparams.radius).toBe(
        params.searchCond.nearbySearchReqParams.radius,
      );
      expect(iBparams.hotelOrderBy).toBe(
        params.searchCond.searchHotelReqParams.orderBy,
      );
      expect(iBparams.hotelAdultsNumber).toBe(
        params.searchCond.searchHotelReqParams.adultsNumber,
      );
      expect(iBparams.hotelUnits).toBeNull();
      expect(iBparams.hotelRoomNumber).toBe(
        params.searchCond.searchHotelReqParams.roomNumber,
      );
      expect(iBparams.hotelCheckinDate).toBe(
        new Date(
          params.searchCond.searchHotelReqParams.checkinDate,
        ).toISOString(),
      );
      expect(iBparams.hotelCheckoutDate).toBe(
        new Date(
          params.searchCond.searchHotelReqParams.checkoutDate,
        ).toISOString(),
      );
      expect(iBparams.hotelFilterByCurrency).toBeNull();

      expect(typeof iBparams.visitSchedulesCount).toBe('number');

      // 검색 된 호텔 결과값 확인 부분
      // 1. recommendedXXXHotelCount와 여행일수 및 hotelTransition 입력 파라미터에 따른 도출 결과 수와 일치하는지 비교
      // 2. 각 일자별 추천 호텔들이 min, mid, max 하루치 예산을 초과하지 않는지 확인
      // 3. 추천된 호텔이 없을 경우 실제 테스트때 검색된 호텔 결과들을 불러 예산을 초과하여 추천되지 않았는지 검증
      // 4. 추천된 호텔이 있을 경우 추천된 호텔의 일일 숙박비 총합이 하루 예산을 넘지 않는지 검증
      const checkResponse = await request(app)
        .post('/schedule/getListQueryParams')
        .send({
          where: {
            id: iBparams.id,
          },
          include: {
            gglNearbySearchRes: true,
            searchHotelRes: true,
          },
        });
      const { searchHotelRes: checkHotelRes } = (
        checkResponse.body as GetListQueryParamsResponse
      ).IBparams[0];

      const {
        visitSchedules,
        recommendedMinHotelCount,
        recommendedMidHotelCount,
        recommendedMaxHotelCount,
      } = iBparams;

      let minBudgetHotelCount = 0;
      let midBudgetHotelCount = 0;
      let maxBudgetHotelCount = 0;

      let prevMinBudgetHotel: SearchHotelRes | undefined;
      let prevMidBudgetHotel: SearchHotelRes | undefined;
      let prevMaxBudgetHotel: SearchHotelRes | undefined;

      let totalMinHotelCharge = 0;
      let totalMidHotelCharge = 0;
      let totalMaxHotelCharge = 0;
      // eslint-disable-next-line no-restricted-syntax
      for await (const visitSchedule of visitSchedules) {
        const { spot, hotel } = visitSchedule;
        const { minBudgetHotel, midBudgetHotel, maxBudgetHotel } = hotel;
        // eslint-disable-next-line no-restricted-syntax
        for await (const aSpot of spot) {
          expect(aSpot.queryParamsId).toBe(iBparams.id);
        }
        expect(spot.length).toBe(iBparams.spotPerDay);

        if (minBudgetHotel && prevMinBudgetHotel?.id !== minBudgetHotel.id) {
          expect(minBudgetHotel.queryParamsId).toBe(iBparams.id);
          prevMinBudgetHotel = minBudgetHotel;
          minBudgetHotelCount += 1;
        }

        if (midBudgetHotel && prevMidBudgetHotel?.id !== midBudgetHotel.id) {
          expect(midBudgetHotel.queryParamsId).toBe(iBparams.id);
          prevMidBudgetHotel = midBudgetHotel;
          midBudgetHotelCount += 1;
        }

        if (maxBudgetHotel && prevMaxBudgetHotel?.id !== maxBudgetHotel.id) {
          expect(maxBudgetHotel.queryParamsId).toBe(iBparams.id);
          prevMaxBudgetHotel = maxBudgetHotel;
          maxBudgetHotelCount += 1;
        }

        totalMinHotelCharge += minBudgetHotel
          ? minBudgetHotel.min_total_price
          : 0;
        totalMidHotelCharge += midBudgetHotel
          ? midBudgetHotel.min_total_price
          : 0;
        totalMaxHotelCharge += maxBudgetHotel
          ? maxBudgetHotel.min_total_price
          : 0;
      }

      const travelNights = getTravelNights(
        // searchCond.searchHotelReqParams.checkinDate,
        // searchCond.searchHotelReqParams.checkoutDate,
        new Date(travelStartDate),
        new Date(travelEndDate),
      );
      // const travelDays = travelNights + 1;
      const transitionTerm = travelNights / hotelTransition; // 호텔 이동할 주기 (단위: 일)

      expect(recommendedMinHotelCount).toBe(minBudgetHotelCount);
      if (recommendedMinHotelCount === 0) {
        const minHotelBudget = minBudget * minHotelBudgetPortion;
        const dailyMinBudget = minHotelBudget / transitionTerm;
        const copiedCheckHotelRes = Array.from(checkHotelRes);
        const filtered = copiedCheckHotelRes.filter(
          item => item.min_total_price < dailyMinBudget,
        );
        expect(filtered).toHaveLength(0);
      } else {
        expect(recommendedMinHotelCount).toBe(hotelTransition + 1);
        expect(totalMinHotelCharge).toBeLessThan(minBudget);
      }

      expect(recommendedMidHotelCount).toBe(midBudgetHotelCount);
      const midBudget = (minBudget + maxBudget) / 2;
      if (recommendedMidHotelCount === 0) {
        const midHotelBudget = midBudget * midHotelBudgetPortion;
        const flexPortionLimit = 1.3;
        const dailyMidBudget =
          (midHotelBudget * flexPortionLimit) / transitionTerm;
        const copiedCheckHotelRes = Array.from(checkHotelRes);
        const filtered = copiedCheckHotelRes.filter(
          item => item.min_total_price < dailyMidBudget,
        );
        expect(filtered).toHaveLength(0);
      } else {
        expect(recommendedMidHotelCount).toBe(hotelTransition + 1);
        expect(totalMidHotelCharge).toBeLessThan(midBudget);
      }

      expect(recommendedMaxHotelCount).toBe(maxBudgetHotelCount);
      if (recommendedMidHotelCount === 0) {
        const maxHotelBudget = maxBudget * maxHotelBudgetPortion;
        const dailyMaxBudget = maxHotelBudget / transitionTerm;
        const copiedCheckHotelRes = Array.from(checkHotelRes);
        const filtered = copiedCheckHotelRes.filter(
          item => item.min_total_price < dailyMaxBudget,
        );
        expect(filtered).toHaveLength(0);
      } else {
        expect(recommendedMaxHotelCount).toBe(hotelTransition + 1);
        expect(totalMaxHotelCharge).toBeLessThan(maxBudget);
      }
    });
  });
  describe(' 호텔 결과값이 정상적인지 분석', () => {
    it('위경도 근방 호텔인지 검증', async () => {});
    it('체크인 체크 아웃 날짜 범주에 포함하는지 검증', async () => {});
    it('입력한 order_by 결과값에 맞게 정렬되었는지 검증', async () => {});
    it('카테고리에 해당하는 결과값이 맞는지 검증', async () => {});
    it('동일한 조건에 page_number만 다를경우 page_number 마다의 호텔 결과가 중복되지 않고 바뀌는지 검증, ', async () => {});
    it('evalCond 파라미터에 입력한 orderBy 결과값에 맞게 정렬되었는지 검증', async () => {});
  });
});
