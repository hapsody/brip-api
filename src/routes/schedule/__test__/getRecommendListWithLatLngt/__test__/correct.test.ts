import request from 'supertest';
import app from '@src/app';
import prisma from '@src/prisma';
// import { User } from '@prisma/client';
import { ibDefs } from '@src/utils';
import { GglNearbySearchRes, SearchHotelRes } from '@prisma/client';
import {
  GetRecommendListWithLatLngtResponse,
  GetListQueryParamsResponse,
  GetRecommendListWithLatLngtInnerAsyncFnResponse,
  getQueryParamsForRestaurant,
  getQueryParamsForTourSpot,
  minHotelBudgetPortion,
  midHotelBudgetPortion,
  maxHotelBudgetPortion,
  mealPerDay,
  spotPerDay,
  GglNearbySearchResIncludedGeometry,
  VisitOrder,
  VisitPlaceType,
} from '../../../types/schduleTypes';
import {
  getTravelNights,
  getListQueryParamsInnerAsyncFn,
  orderByDistanceFromNode,
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

let queryParamId = -1;
let recommendRawResult: GetRecommendListWithLatLngtResponse;
let recommendRes: GetRecommendListWithLatLngtInnerAsyncFnResponse;
beforeAll(async () => {
  const response = await request(app)
    .post('/schedule/getRecommendListWithLatLngt')
    .send(params);

  recommendRawResult = response.body as GetRecommendListWithLatLngtResponse;
  recommendRes =
    recommendRawResult.IBparams as GetRecommendListWithLatLngtInnerAsyncFnResponse;
  queryParamId = recommendRes.id;
});

jest.setTimeout(100000);

describe('Correct case test', () => {
  describe('1차적 정상 요청 예시 검증', () => {
    it('First Case', async () => {
      // 파라미터 입력값이 제대로 반영된 결과인지 파라미터 값과 응답값 비교 part
      expect(recommendRawResult.IBcode).toEqual({ ...ibDefs.SUCCESS }.IBcode);
      expect(recommendRes.id).toBeGreaterThan(0);

      expect(typeof recommendRes.id).toBe('number');
      if (recommendRes.keyword === null || recommendRes.keyword === '') {
        expect([undefined, null, '']).toContain(
          params.searchCond.nearbySearchReqParams.keyword,
        );
      } else {
        expect(recommendRes.keyword).toBe(
          params.searchCond.nearbySearchReqParams.keyword,
        );
      }

      expect(recommendRes.latitude).toBeCloseTo(
        Number.parseFloat(
          params.searchCond.nearbySearchReqParams.location.latitude,
        ),
        6,
      );
      expect(recommendRes.longitude).toBeCloseTo(
        Number.parseFloat(
          params.searchCond.nearbySearchReqParams.location.longitude,
        ),
        6,
      );
      expect(recommendRes.radius).toBe(
        params.searchCond.nearbySearchReqParams.radius,
      );
      expect(recommendRes.hotelOrderBy).toBe(
        params.searchCond.searchHotelReqParams.orderBy,
      );
      expect(recommendRes.hotelAdultsNumber).toBe(
        params.searchCond.searchHotelReqParams.adultsNumber,
      );
      expect(recommendRes.hotelUnits).toBeNull();
      expect(recommendRes.hotelRoomNumber).toBe(
        params.searchCond.searchHotelReqParams.roomNumber,
      );
      expect(recommendRes.hotelCheckinDate).toBe(
        new Date(
          params.searchCond.searchHotelReqParams.checkinDate,
        ).toISOString(),
      );
      expect(recommendRes.hotelCheckoutDate).toBe(
        new Date(
          params.searchCond.searchHotelReqParams.checkoutDate,
        ).toISOString(),
      );
      expect(recommendRes.hotelFilterByCurrency).toBeNull();

      expect(typeof recommendRes.visitSchedulesCount).toBe('number');

      // 검색 된 호텔 결과값 확인 부분
      // 1. recommendedXXXHotelCount와 여행일수 및 hotelTransition 입력 파라미터에 따른 도출 결과 수와 일치하는지 비교
      // 2. 각 일자별 추천 호텔들이 min, mid, max 하루치 예산을 초과하지 않는지 확인
      // 3. 추천된 호텔이 없을 경우 실제 테스트때 검색된 호텔 결과들을 불러 예산을 초과하여 추천되지 않았는지 검증
      // 4. 추천된 호텔이 있을 경우 추천된 호텔의 일일 숙박비 총합이 하루 예산을 넘지 않는지 검증
      const checkResponse = await request(app)
        .post('/schedule/getListQueryParams')
        .send({
          where: {
            id: recommendRes.id,
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
        metaInfo: {
          recommendedMinHotelCount,
          recommendedMidHotelCount,
          recommendedMaxHotelCount,
        },
      } = recommendRes;

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
        expect(spot.spotsFromMinHotel.length).toBe(
          recommendRes.metaInfo.spotPerDay,
        );
        expect(spot.spotsFromMidHotel.length).toBe(
          recommendRes.metaInfo.spotPerDay,
        );
        expect(spot.spotsFromMaxHotel.length).toBe(
          recommendRes.metaInfo.spotPerDay,
        );
        // eslint-disable-next-line no-restricted-syntax
        for await (const aSpot of spot.spotsFromMinHotel) {
          expect(aSpot.queryParamsId).toBe(recommendRes.id);
        }

        if (minBudgetHotel && prevMinBudgetHotel?.id !== minBudgetHotel.id) {
          expect(minBudgetHotel.queryParamsId).toBe(recommendRes.id);
          prevMinBudgetHotel = minBudgetHotel;
          minBudgetHotelCount += 1;
        }

        if (midBudgetHotel && prevMidBudgetHotel?.id !== midBudgetHotel.id) {
          expect(midBudgetHotel.queryParamsId).toBe(recommendRes.id);
          prevMidBudgetHotel = midBudgetHotel;
          midBudgetHotelCount += 1;
        }

        if (maxBudgetHotel && prevMaxBudgetHotel?.id !== maxBudgetHotel.id) {
          expect(maxBudgetHotel.queryParamsId).toBe(recommendRes.id);
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
    it('체크인 체크 아웃 날짜 범주에 포함하는지 검증', async () => {
      // 개별 호텔 정보에 체크인 체크아웃 날짜가 씌여있지 않아 검증불가
      // const { visitSchedules } = recommendRes;
      // const hotels = visitSchedules.map(schedule => schedule.hotel);
    });
    it('카테고리에 해당하는 결과값이 맞는지 검증', () => {
      const { visitSchedules } = recommendRes;
      const hotels = visitSchedules.map(schedule => schedule.hotel);
      const categoryIdx =
        params.searchCond.searchHotelReqParams.categoriesFilterIds.findIndex(
          e => e === 'property_type::204', // Hotel
        );
      if (categoryIdx > -1) {
        hotels.forEach(hotel => {
          if (hotel.minBudgetHotel) {
            expect(hotel.minBudgetHotel?.accommodation_type_name).toContain(
              'Hotel',
            );
          }
          if (hotel.midBudgetHotel) {
            expect(hotel.midBudgetHotel?.accommodation_type_name).toContain(
              'Hotel',
            );
          }
          if (hotel.maxBudgetHotel) {
            expect(hotel.maxBudgetHotel?.accommodation_type_name).toContain(
              'Hotel',
            );
          }
        });
      }
    });
    it('동일한 조건에 page_number만 다를경우 page_number 마다의 호텔 결과가 중복되지 않고 바뀌는지 검증, ', async () => {
      // 호텔 외부 API 인 search-by-coordinates 수작업 검증 o, 테스트코드에 포함시켜 반복 쿼리 테스트할 필요 x
      // booking.com 로직에 오류가 없는한 동일한 기조의 결과값을 응답할 것임
    });
    it('evalCond 파라미터에 입력한 orderBy 결과값에 맞게 정렬되었는지 검증', () => {
      const { visitSchedules } = recommendRes;
      const hotels = visitSchedules.map(schedule => schedule.hotel);
      if (params.searchCond.searchHotelReqParams.orderBy === 'review_score') {
        let prevIdx = -1;
        hotels.forEach((hotel, index) => {
          if (prevIdx > -1) {
            const curMinHotelReviewScore = hotel.minBudgetHotel?.review_score;
            const prevMinHotelReviewScore =
              hotels[prevIdx].minBudgetHotel?.review_score;

            if (curMinHotelReviewScore && prevMinHotelReviewScore) {
              expect(curMinHotelReviewScore).not.toBeUndefined();
              expect(prevMinHotelReviewScore).not.toBeUndefined();
              if (index > prevIdx) {
                expect(prevMinHotelReviewScore).toBeGreaterThanOrEqual(
                  curMinHotelReviewScore,
                );
              } else {
                expect(curMinHotelReviewScore).toBeGreaterThanOrEqual(
                  prevMinHotelReviewScore,
                );
              }
            }
          }

          prevIdx = index;
        });
      }
    });
    it('전체 여행일정중 추천된 전체 장소들을 확인하여 같은날 추천된 장소들끼리 에 가장 최선의 선택(거리)이었는지 검증', async () => {
      const assertOrderType = (thisOrder: VisitOrder): VisitOrder => {
        switch (thisOrder.type) {
          case 'hotel': {
            return {
              type: 'hotel',
              data: thisOrder.data as SearchHotelRes,
            };
          }
          case 'spot':
            return {
              type: 'spot',
              data: thisOrder.data as GglNearbySearchResIncludedGeometry,
            };
          case 'restaurant':
          default: {
            return {
              type: 'restaurant',
              data: thisOrder.data as GglNearbySearchResIncludedGeometry,
            };
          }
        }
      };
      // 추천된 전체 장소 불러오기
      const restaurantQueryParamsDataFromDB =
        await getListQueryParamsInnerAsyncFn(
          getQueryParamsForRestaurant(queryParamId),
        );
      const spotQueryParamsDataFromDB = await getListQueryParamsInnerAsyncFn(
        getQueryParamsForTourSpot(queryParamId),
      );
      const {
        searchHotelRes,
        gglNearbySearchRes: restaurantGglNearbySearchRes,
      } = restaurantQueryParamsDataFromDB[0];
      const { gglNearbySearchRes: touringSpotGglNearbySearchRes } =
        spotQueryParamsDataFromDB[0];

      const travelNights = getTravelNights(
        new Date(params.searchCond.travelStartDate),
        new Date(params.searchCond.travelEndDate),
      );
      const travelDays = travelNights + 1;

      const minHotelBudget = minBudget * minHotelBudgetPortion;
      const dailyMinBudget = minHotelBudget / travelNights;
      const transitionTerm = Math.ceil(travelNights / (hotelTransition + 1));
      // api 호출 결과와 함께 분석
      const schedules = recommendRes.visitSchedules.map(
        schedule => schedule.visitOrder,
      );
      type CrossCheckResultType = {
        result: boolean;
        day: number;
        order: number;
        type: VisitPlaceType;
        data?: SearchHotelRes | GglNearbySearchRes;
      };
      const allDayBestMatch: CrossCheckResultType[] = [];

      let nodeLists = {
        hotel: searchHotelRes,
        restaurant: restaurantGglNearbySearchRes.slice(
          0,
          travelDays * mealPerDay,
        ),
        spot: touringSpotGglNearbySearchRes.slice(0, travelDays * spotPerDay),
      };

      let dayIdx = 0;
      // eslint-disable-next-line no-restricted-syntax
      for await (const schedule of schedules) {
        const { ordersFromMinHotel } = schedule;
        let prevMinOrder: VisitOrder = assertOrderType(ordersFromMinHotel[0]);
        // for (let i = 0; i < mealPerDay + spotPerDay + 1; i += 1) {
        let i = 0;
        // eslint-disable-next-line no-restricted-syntax
        for await (const todayMinOrders of ordersFromMinHotel) {
          // todayMinOrders = ordersFromMinHotel[i];
          const curMinOrder = assertOrderType(todayMinOrders);

          // eslint-disable-next-line @typescript-eslint/no-loop-func
          const matchPromise = (async ({
            type,
            curOrder,
            prevOrder,
          }): Promise<CrossCheckResultType> => {
            return new Promise<CrossCheckResultType>(resolve => {
              switch (type) {
                case 'hotel': {
                  prisma.searchHotelRes
                    .findMany({
                      where: {
                        queryParamsId: queryParamId,
                      },
                      orderBy: [
                        {
                          review_score: 'desc',
                        },
                        {
                          distance: 'asc',
                        },
                      ],
                    })
                    .then(hotels => {
                      if (hotels) {
                        const bestHotels = hotels.filter(
                          hotel =>
                            hotel.gross_amount_per_night < dailyMinBudget,
                        );

                        let hotelIdx = (dayIdx + 1) / transitionTerm - 1; // 여행중 n일째 묵고 있을 호텔은 기준에 맞춰 정렬한 리스트중 몇번째 호텔인가를 계산
                        hotelIdx =
                          hotelIdx > hotelTransition
                            ? hotelTransition
                            : hotelIdx;
                        if (
                          bestHotels &&
                          bestHotels.length > hotelIdx &&
                          curOrder.data.id === bestHotels[hotelIdx].id
                        ) {
                          resolve({
                            result: true,
                            day: dayIdx,
                            order: i,
                            type: 'hotel',
                            data: bestHotels[hotelIdx],
                          });
                        }
                      }
                      // if (res && res.id === curOrder.data.id) resolve(true);

                      resolve({
                        result: false,
                        day: dayIdx,
                        order: i,
                        type: 'hotel',
                        data: undefined,
                      });
                    })
                    .catch(() => {
                      resolve({
                        result: false,
                        day: dayIdx,
                        order: i,
                        type: 'hotel',
                        data: undefined,
                      });
                    });
                  break;
                }

                case 'spot': {
                  const distanceMap = orderByDistanceFromNode({
                    baseNode: prevOrder.data,
                    scheduleNodeLists: nodeLists,
                  });
                  nodeLists = {
                    ...nodeLists,
                    spot: distanceMap.withSpots
                      .map(e => e.data)
                      .slice(1, distanceMap.withSpots.length),
                  };
                  if (curOrder.data.id === distanceMap.withSpots[0].data.id) {
                    resolve({
                      result: true,
                      day: dayIdx,
                      order: i,
                      type: 'spot',
                      data: distanceMap.withSpots[0].data,
                    });
                    break;
                  }

                  resolve({
                    result: false,
                    day: dayIdx,
                    order: i,
                    type: 'spot',
                    data: distanceMap.withSpots[0].data,
                  });
                  break;
                }
                case 'restaurant':
                default: {
                  const distanceMap = orderByDistanceFromNode({
                    baseNode: prevOrder.data,
                    scheduleNodeLists: nodeLists,
                  });
                  nodeLists = {
                    ...nodeLists,
                    restaurant: distanceMap.withRestaurants
                      .map(e => e.data)
                      .slice(1, distanceMap.withRestaurants.length),
                  };
                  if (
                    curOrder.data.id === distanceMap.withRestaurants[0].data.id
                  ) {
                    resolve({
                      result: true,
                      day: dayIdx,
                      order: i,
                      type: 'restaurant',
                      data: distanceMap.withRestaurants[0].data,
                    });
                    break;
                  }

                  resolve({
                    result: false,
                    day: dayIdx,
                    order: i,
                    type: 'restaurant',
                    data: distanceMap.withRestaurants[0].data,
                  });
                  break;
                }
              }
            });
          })({
            type: curMinOrder.type,
            curOrder: curMinOrder,
            prevOrder: prevMinOrder,
          });
          const matchResult = await matchPromise;
          // eslint-disable-next-line no-await-in-loop
          allDayBestMatch.push(matchResult);
          prevMinOrder = curMinOrder;
          i += 1;
        }

        // }
        // return allDayBestMatchPromises;
        dayIdx += 1;
      }

      const finalMatchResult = allDayBestMatch.findIndex(e => !e);
      // const result = await Promise.all(allDayBestMatchPromises);
      // const finalMatchResult = result.findIndex(e => !e);
      expect(finalMatchResult).toBe(-1);
    });
  });
});
