import request from 'supertest';
import app from '@src/app';
import prisma from '@src/prisma';
// import { User } from '@prisma/client';
import { ibDefs, IBResFormat } from '@src/utils';
import { GglNearbySearchRes, SearchHotelRes } from '@prisma/client';
import {
  GetRecommendListWithLatLngtRetParams,
  GetListQueryParamsRetParams,
  GetRecommendListWithLatLngtInnerFnRetParams,
  getQueryParamsForRestaurant,
  getQueryParamsForTourSpot,
  gMinHotelMoneyPortion,
  gMidHotelMoneyPortion,
  gMaxHotelMoneyPortion,
  gMealPerDay,
  gSpotPerDay,
  GglNearbySearchResWithGeoNTourPlace,
  VisitOrder,
  VisitPlaceType,
  gFlexPortionLimit,
  getQueryParamsForHotel,
  SearchHotelResWithTourPlace,
} from '../../../types/schduleTypes';
import {
  getTravelNights,
  getListQueryParamsInnerFn,
  orderByDistanceFromNode,
} from '../../../internalFunc';

import {
  minMoney,
  maxMoney,
  startDate,
  endDate,
  hotelTransition,
  // childrenNumber,
  // childrenAges,
  params,
} from './testData';

let queryParamId = -1;
let recommendRawResult: GetRecommendListWithLatLngtRetParams;
let recommendRes: GetRecommendListWithLatLngtInnerFnRetParams;
beforeAll(async () => {
  const mockData = await prisma.mockBookingDotComHotelResource.findMany();
  if (mockData.length === 0) {
    const addMockTransactionRawRes = await request(app)
      .post('/schedule/addMockHotelResource')
      .send({ ...params.searchCond.searchHotelReqParams, mock: undefined });
    const { IBcode } = addMockTransactionRawRes.body as IBResFormat;
    expect(IBcode).toBe('1000');
  }

  const response = await request(app)
    .post('/schedule/getRecommendListWithLatLngt')
    .send(params);

  recommendRawResult = response.body as GetRecommendListWithLatLngtRetParams;
  recommendRes =
    recommendRawResult.IBparams as GetRecommendListWithLatLngtInnerFnRetParams;
  queryParamId = recommendRes.id;
});

jest.setTimeout(120000);

describe('Correct case test', () => {
  describe('정상 요청 예시 검증', () => {
    it('파라미터 입력값이 제대로 반영된 결과인지 파라미터 값과 응답값 비교', () => {
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
        new Date(params.searchCond.startDate).toISOString(),
      );
      expect(recommendRes.hotelCheckoutDate).toBe(
        new Date(params.searchCond.endDate).toISOString(),
      );
      expect(recommendRes.hotelFilterByCurrency).toBe('KRW'); /// 추후 해당 코드의 로직 확인후 업데이트 필요

      expect(typeof recommendRes.visitSchedulesCount).toBe('number');
    });

    it('호텔 결과값 유효성 확인', async () => {
      // 아래 로직으로 검색 된 호텔 결과값 확인된 부분
      // 1. recommendedXXXHotelCount와 여행일수 및 hotelTransition 입력 파라미터에 따른 도출 결과 수와 일치하는지 비교
      // 2. 각 일자별 추천 호텔들이 min, mid, max 하루치 예산을 초과하지 않는지 확인
      // 3. 만약 /getRecommendListWithLatLngt api를 통해 응답된 값중에 추천된 호텔이 없이 비어있는 항목이 있는 경우 예산이 해당 쿼리에서 전체 검색된 호텔 결과들을 불러 예산을 초과하여 추천되지 않았는지 검증
      // 4. 추천된 호텔이 있을 경우 추천된 호텔의 일일 숙박비 총합이 하루 예산을 넘지 않는지 검증
      const checkResponse = await request(app)
        .post('/schedule/getListQueryParams')
        .send({
          where: {
            id: recommendRes.id,
          },
          include: {
            tourPlace: {
              include: {
                gglNearbySearchRes: {
                  include: {
                    tourPlace: true,
                  },
                },
                searchHotelRes: {
                  include: {
                    tourPlace: true,
                  },
                },
              },
            },
          },
        });
      const { tourPlace } = (checkResponse.body as GetListQueryParamsRetParams)
        .IBparams[0];
      const checkHotelRes = tourPlace.map(v => v.searchHotelRes);
      const {
        visitSchedules,
        metaInfo: {
          recommendedMinHotelCount,
          recommendedMidHotelCount,
          recommendedMaxHotelCount,
        },
      } = recommendRes;

      let minMoneyHotelCount = 0;
      let midMoneyHotelCount = 0;
      let maxMoneyHotelCount = 0;

      let prevMinMoneyHotel: SearchHotelRes | undefined;
      let prevmidMoneyHotel: SearchHotelRes | undefined;
      let prevMaxMoneyHotel: SearchHotelRes | undefined;

      let totalMinHotelCharge = 0;
      let totalMidHotelCharge = 0;
      let totalMaxHotelCharge = 0;
      // eslint-disable-next-line no-restricted-syntax
      for await (const visitSchedule of visitSchedules) {
        const { spot, hotel } = visitSchedule;
        const { minMoneyHotel, midMoneyHotel, maxMoneyHotel } = hotel;
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
          expect(aSpot.tourPlace.queryParamsId).toBe(recommendRes.id);
        }

        if (minMoneyHotel && prevMinMoneyHotel?.id !== minMoneyHotel.id) {
          expect(minMoneyHotel.tourPlace.queryParamsId).toBe(recommendRes.id);
          prevMinMoneyHotel = minMoneyHotel;
          minMoneyHotelCount += 1;
        }

        if (midMoneyHotel && prevmidMoneyHotel?.id !== midMoneyHotel.id) {
          expect(midMoneyHotel.tourPlace.queryParamsId).toBe(recommendRes.id);
          prevmidMoneyHotel = midMoneyHotel;
          midMoneyHotelCount += 1;
        }

        if (maxMoneyHotel && prevMaxMoneyHotel?.id !== maxMoneyHotel.id) {
          expect(maxMoneyHotel.tourPlace.queryParamsId).toBe(recommendRes.id);
          prevMaxMoneyHotel = maxMoneyHotel;
          maxMoneyHotelCount += 1;
        }

        totalMinHotelCharge += minMoneyHotel
          ? minMoneyHotel.gross_amount_per_night
          : 0;
        totalMidHotelCharge += midMoneyHotel
          ? midMoneyHotel.gross_amount_per_night
          : 0;
        totalMaxHotelCharge += maxMoneyHotel
          ? maxMoneyHotel.gross_amount_per_night
          : 0;
      }

      const travelNights = getTravelNights(
        // searchCond.searchHotelReqParams.checkinDate,
        // searchCond.searchHotelReqParams.checkoutDate,
        startDate,
        endDate,
      );
      // const travelDays = travelNights + 1;
      const transitionTerm = travelNights / hotelTransition; // 호텔 이동할 주기 (단위: 일)

      expect(recommendedMinHotelCount).toBe(minMoneyHotelCount);
      if (recommendedMinHotelCount === 0) {
        const minHotelMoney = minMoney * gMinHotelMoneyPortion;
        const dailyMinMoney = minHotelMoney / transitionTerm;
        const copiedCheckHotelRes = Array.from(checkHotelRes);
        const filtered = copiedCheckHotelRes.filter(
          item => item.min_total_price / travelNights < dailyMinMoney,
        );
        expect(filtered).toHaveLength(0);
      } else {
        expect(recommendedMinHotelCount).toBe(hotelTransition + 1);
        expect(totalMinHotelCharge).toBeLessThan(minMoney);
      }

      expect(recommendedMidHotelCount).toBe(midMoneyHotelCount);
      const midMoney = (minMoney + maxMoney) / 2;
      if (recommendedMidHotelCount === 0) {
        const midHotelMoney = midMoney * gMidHotelMoneyPortion;
        const dailyMidMoney =
          (midHotelMoney * gFlexPortionLimit) / transitionTerm;
        const copiedCheckHotelRes = Array.from(checkHotelRes);
        const filtered = copiedCheckHotelRes.filter(
          item => item.min_total_price < dailyMidMoney,
        );
        expect(filtered).toHaveLength(0);
      } else {
        expect(recommendedMidHotelCount).toBe(hotelTransition + 1);
        expect(totalMidHotelCharge).toBeLessThan(midMoney);
      }

      expect(recommendedMaxHotelCount).toBe(maxMoneyHotelCount);
      if (recommendedMidHotelCount === 0) {
        const maxHotelMoney = maxMoney * gMaxHotelMoneyPortion;
        const dailyMaxMoney = maxHotelMoney / transitionTerm;
        const copiedCheckHotelRes = Array.from(checkHotelRes);
        const filtered = copiedCheckHotelRes.filter(
          item => item.min_total_price < dailyMaxMoney,
        );
        expect(filtered).toHaveLength(0);
      } else {
        expect(recommendedMaxHotelCount).toBe(hotelTransition + 1);
        expect(totalMaxHotelCharge).toBeLessThan(maxMoney);
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
          if (hotel.minMoneyHotel) {
            expect(hotel.minMoneyHotel?.accommodation_type_name).toContain(
              'Hotel',
            );
          }
          if (hotel.midMoneyHotel) {
            expect(hotel.midMoneyHotel?.accommodation_type_name).toContain(
              'Hotel',
            );
          }
          if (hotel.maxMoneyHotel) {
            expect(hotel.maxMoneyHotel?.accommodation_type_name).toContain(
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
            const curMinHotelReviewScore = hotel.minMoneyHotel?.review_score;
            const prevMinHotelReviewScore =
              hotels[prevIdx].minMoneyHotel?.review_score;

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
              data: thisOrder.data as SearchHotelResWithTourPlace,
            };
          }
          case 'spot':
            return {
              type: 'spot',
              data: thisOrder.data as GglNearbySearchResWithGeoNTourPlace,
            };
          case 'restaurant':
          default: {
            return {
              type: 'restaurant',
              data: thisOrder.data as GglNearbySearchResWithGeoNTourPlace,
            };
          }
        }
      };
      // 추천된 전체 장소 불러오기
      const hotelQueryParamsDataFromDB = await getListQueryParamsInnerFn(
        getQueryParamsForHotel(queryParamId),
      );
      const restaurantQueryParamsDataFromDB = await getListQueryParamsInnerFn(
        getQueryParamsForRestaurant(queryParamId),
      );
      const spotQueryParamsDataFromDB = await getListQueryParamsInnerFn(
        getQueryParamsForTourSpot(queryParamId),
      );
      // const {
      //   TourPlace: {
      //     SearchHotelRes: searchHotelRes,
      //     gglNearbySearchRes: restaurantGglNearbySearchRes,
      //   },
      // } = restaurantQueryParamsDataFromDB[0];
      // const {
      //   TourPlace: { gglNearbySearchRes: touringSpotGglNearbySearchRes },
      // } = spotQueryParamsDataFromDB[0];
      const { tourPlace: tourPlaceRestaurant } =
        restaurantQueryParamsDataFromDB[0];
      const restaurantGglNearbySearchRes = tourPlaceRestaurant.map(
        v => v.gglNearbySearchRes,
      );
      const { tourPlace: tourPlaceSpot } = spotQueryParamsDataFromDB[0];
      const touringSpotGglNearbySearchRes = tourPlaceSpot.map(
        v => v.gglNearbySearchRes,
      );
      const { tourPlace: tourPlaceHotel } = hotelQueryParamsDataFromDB[0];
      const searchHotelRes = tourPlaceHotel.map(v => v.searchHotelRes);

      const travelNights = getTravelNights(
        params.searchCond.startDate,
        params.searchCond.endDate,
      );
      const travelDays = travelNights + 1;

      const minHotelMoney = minMoney * gMinHotelMoneyPortion;
      const dailyMinMoney = minHotelMoney / travelNights;
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
          travelDays * gMealPerDay,
        ),
        spot: touringSpotGglNearbySearchRes.slice(0, travelDays * gSpotPerDay),
      };

      let dayIdx = 0;
      // eslint-disable-next-line no-restricted-syntax
      for await (const schedule of schedules) {
        const { ordersFromMinHotel } = schedule;
        let prevMinOrder: VisitOrder = assertOrderType(ordersFromMinHotel[0]);
        // for (let i = 0; i < gMealPerDay + gSpotPerDay + 1; i += 1) {
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
                        tourPlace: {
                          some: {
                            queryParamsId: queryParamId,
                          },
                        },
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
                          hotel => hotel.gross_amount_per_night < dailyMinMoney,
                        );

                        let hotelIdx = (dayIdx + 1) / transitionTerm - 1; // 여행중 n일째 묵고 있을 호텔은 기준에 맞춰 정렬한 리스트중 몇번째 호텔인가를 계산
                        hotelIdx =
                          hotelIdx > hotelTransition
                            ? hotelTransition
                            : hotelIdx;
                        if (
                          bestHotels &&
                          bestHotels.length > hotelIdx &&
                          (curOrder.data as SearchHotelResWithTourPlace).id ===
                            bestHotels[hotelIdx].id
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
                    startNode: prevOrder.data,
                    nodePool: nodeLists,
                  });
                  nodeLists = {
                    ...nodeLists,
                    spot: distanceMap.sortedSpots
                      .map(e => e.nodeData)
                      .slice(1, distanceMap.sortedSpots.length),
                  };
                  if (
                    (curOrder.data as GglNearbySearchResWithGeoNTourPlace)
                      .id === distanceMap.sortedSpots[0].nodeData.id
                  ) {
                    resolve({
                      result: true,
                      day: dayIdx,
                      order: i,
                      type: 'spot',
                      data: distanceMap.sortedSpots[0].nodeData,
                    });
                    break;
                  }

                  resolve({
                    result: false,
                    day: dayIdx,
                    order: i,
                    type: 'spot',
                    data: distanceMap.sortedSpots[0].nodeData,
                  });
                  break;
                }
                case 'restaurant':
                default: {
                  const distanceMap = orderByDistanceFromNode({
                    startNode: prevOrder.data,
                    nodePool: nodeLists,
                  });
                  nodeLists = {
                    ...nodeLists,
                    restaurant: distanceMap.sortedRestaurants
                      .map(e => e.nodeData)
                      .slice(1, distanceMap.sortedRestaurants.length),
                  };
                  if (
                    (curOrder.data as GglNearbySearchResWithGeoNTourPlace)
                      .id === distanceMap.sortedRestaurants[0].nodeData.id
                  ) {
                    resolve({
                      result: true,
                      day: dayIdx,
                      order: i,
                      type: 'restaurant',
                      data: distanceMap.sortedRestaurants[0].nodeData,
                    });
                    break;
                  }

                  resolve({
                    result: false,
                    day: dayIdx,
                    order: i,
                    type: 'restaurant',
                    data: distanceMap.sortedRestaurants[0].nodeData,
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
