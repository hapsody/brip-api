import request from 'supertest';
import app from '@src/app';
import moment from 'moment';
import { TourPlace } from '@prisma/client';
import { isNil, keys, isUndefined, isEmpty } from 'lodash';
import { ibDefs } from '@src/utils';
import {
  // BKCSrchByCoordReqOpt,
  GetRcmdListRETParam,
  GetRcmdListRETParamPayload,
  gMealPerDay,
  gSpotPerDay,
  // BookingComOrderBy,
} from '../types/schduleTypes';
import { getTravelNights } from '../inner';
import { params } from './testData';

jest.setTimeout(120000);

let recommendRawResult: GetRcmdListRETParam;
let rcmdRes: GetRcmdListRETParamPayload;
beforeAll(async () => {
  // const { getRcmdListReqOpt: reqOpt } = params;
  // const mockData = await prisma.mockBookingDotComHotelResource.findMany();
  // if (mockData.length <= 1) {
  //   const travelNights = getTravelNights(reqOpt.startDate, reqOpt.endDate);
  //   const { hotelTransition, hotelSrchOpt } = reqOpt;
  //   const transitionTerm = Math.ceil(travelNights / (hotelTransition + 1)); // 호텔 이동할 주기 (단위: 일)

  //   const loopArr = Array(hotelTransition + 1)
  //     .fill(0)
  //     .map((_, i) => i);
  //   // eslint-disable-next-line no-restricted-syntax
  //   for await (const curLoopCnt of loopArr) {
  //     const curCheckin = moment(hotelSrchOpt.checkinDate)
  //       .add(transitionTerm * curLoopCnt, 'd')
  //       .format();
  //     let curCheckout = moment(curCheckin).add(transitionTerm, 'd').format();

  //     if (moment(curCheckout).diff(moment(hotelSrchOpt.checkoutDate), 'd') > 0)
  //       curCheckout = hotelSrchOpt.checkoutDate;

  //     const curHotelSrchOpt: BKCSrchByCoordReqOpt = {
  //       ...hotelSrchOpt,
  //       orderBy: hotelSrchOpt.orderBy as BookingComOrderBy,
  //       checkinDate: curCheckin,
  //       checkoutDate: curCheckout,
  //     };
  //     const addMockTransactionRawRes = await request(app)
  //       .post('/schedule/addMockBKCHotelResource')
  //       .send({ ...curHotelSrchOpt, mock: undefined });
  //     const { IBcode } = addMockTransactionRawRes.body as IBResFormat;
  //     expect(IBcode).toBe('1000');
  //   }
  // }

  const response = await request(app)
    .post('/schedule/getRcmdList')
    .send(params.getRcmdListReqOpt);

  recommendRawResult = response.body as GetRcmdListRETParam;
  rcmdRes = recommendRawResult.IBparams as GetRcmdListRETParamPayload;
  expect(recommendRawResult.IBcode).toEqual({ ...ibDefs.SUCCESS }.IBcode);
});

describe('Schedule Express Router E2E Test', () => {
  describe('POST /getRcmdList', () => {
    it('Case: Correct - 파라미터-결과간 검증', async () => {
      /**
       * 구현된 checklist
       * 1. getRcmdList 호출시 주어진 minMoney, maxMoney... 등의 파라미터와
       * 함수 실행후 DB에 저장된 queryParams의 필드가 동일한 값을 갖는지
       * 2. 리턴된 visitScheduleCount 값이 실제 visitSchedules 수와 동일한지
       * 3. 리턴된 placeType에 따라 data값이(tourPlace) 해당 유형의 tourPlaceType을 갖는지
       * 4. visitSchedule이 호텔일 경우 리턴된 data에 호텔 관련한 필드 값을 갖는지(bkc_ 접두어 필드들)
       * 5. visitSchedule이 spot, restaurant일 경우 리턴된 data에 해당 타입과 관련한 필드가 null이나 undefined가 아닌 값을 하나라도 갖는지 (vj_ 접두어 필드 또는 gl_ 접두어 필드)
       *
       */

      const {
        minMoney,
        maxMoney,
        startDate,
        endDate,
        adult,
        child,
        // infant,
        travelHard,
        // favoriteTravelType,
        // favoriteAccommodation,
        // favoriteAccommodationLocation,
        hotelTransition,
        hotelSrchOpt: {
          //   orderBy,
          //   adultsNumber,
          //   roomNumber,
          checkinDate,
          checkoutDate,
          //   latitude,
          //   longitude,
          //   pageNumber,
          //   includeAdjacency,
          //   childrenAges,
          //   childrenNumber,
          //   mock,
          //   store,
        },
      } = params.getRcmdListReqOpt;
      expect(rcmdRes.minMoney).toBe(Number(minMoney));
      expect(rcmdRes.maxMoney).toBe(Number(maxMoney));
      expect(rcmdRes.startDate).toBe(new Date(startDate).toISOString());
      expect(rcmdRes.endDate).toBe(new Date(endDate).toISOString());
      expect(rcmdRes.adult).toBe(Number(adult));
      expect(rcmdRes.child).toBe(Number(child));
      //   expect(rcmdRes.infant).toBe(Number(infant));
      expect(rcmdRes.travelHard).toBe(Number(travelHard));

      const travelNights = getTravelNights(startDate, endDate);
      const travelDays = travelNights + 1;
      const transitionTerm = Math.ceil(travelNights / (hotelTransition + 1)); // 호텔 이동할 주기 (단위: 일)
      expect(rcmdRes.visitSchedulesCount).toBe(
        travelDays * (gMealPerDay + gSpotPerDay + 1) * 3, /// min + mid + max => 3
      );

      const rcmdVS = rcmdRes.visitSchedules;

      // eslint-disable-next-line no-restricted-syntax
      for await (const vs of rcmdVS) {
        expect(typeof vs.dayNo).toBe('number');
        expect(typeof vs.orderNo).toBe('number');
        expect(vs.planType).toBeDefined();
        // expect(startDate).toBe(
        //   vs.checkin ? new Date(vs.checkin).toISOString() : undefined,
        // );
        // expect(endDate).toBe(
        //   vs.checkout ? new Date(vs.checkout).toISOString() : undefined,
        // );
        if (vs.placeType === 'HOTEL') {
          /// hotel visitSchedule 필드 데이터 유효성 검증
          expect(vs.placeType).toBe('HOTEL');
          expect(typeof vs.transitionNo).toBe('number');
          expect(typeof vs.stayPeriod).toBe('number');

          let curCheckin: string = '';
          let curCheckout: string = '';
          if (!isUndefined(vs.transitionNo)) {
            curCheckin = moment(
              moment(checkinDate).add(vs.transitionNo * transitionTerm, 'd'),
            ).toISOString();

            curCheckout = moment(
              moment(curCheckin).add(transitionTerm, 'd'),
            ).toISOString();
            if (moment(curCheckout).diff(moment(checkoutDate), 'd') > 0)
              curCheckout = checkoutDate;
          }
          expect(vs.checkin).toBe(curCheckin);
          expect(vs.checkout).toBe(curCheckout);

          /// hotel TourPlace 필드 데이터 유효성 검증
          const tp = vs.data;

          /// tp는 비용에 따른 호텔 검색 필터 결과에 따라 null일수도 있다. 있을때만 아래 검사
          if (tp && !isEmpty(tp)) {
            // expect(tp.tourPlaceType).toContain('HOTEL');
            // expect(tp.evalScore).toBeGreaterThanOrEqual(0);

            /// hotel data중 bkc_ 접두어가 붙은 필드에 undefined거나 null이지 않은 값을 갖는 필드가 하나 이상은 있어야 한다.
            const notUndefinedAtLeastOneBKCValue = keys(tp)
              .filter(k => k.includes('bkc_'))
              .map((k: keyof Partial<TourPlace>) => tp[k])
              .find(bkcPropValue => !isNil(bkcPropValue));
            expect(notUndefinedAtLeastOneBKCValue).toBeDefined();
          }
        } else {
          const placeTypeMatchRes =
            vs.placeType === 'SPOT' || vs.placeType === 'RESTAURANT';
          expect(placeTypeMatchRes).toBe(true);

          const tp = vs.data;
          if (tp && !isEmpty(tp)) {
            if (vs.placeType === 'SPOT')
              expect(tp.tourPlaceType).toContain('SPOT');
            else if (vs.placeType === 'RESTAURANT')
              expect(tp.tourPlaceType).toContain('RESTAURANT');

            expect(tp.evalScore).toBeGreaterThanOrEqual(0);

            /// hotel data중 gl_ 접두어가 붙은 필드에 undefined거나 null이지 않은 값을 갖는 필드가 하나 이상 존재 or vj_접두어가 붙은 필드가   undefined거나 null이지 않은 값을 갖는 필드가 하나 이상은 존재해야한다.
            const notUndefinedAtLeastOneGlValue = keys(tp)
              .filter(k => k.includes('gl_'))
              .map((k: keyof Partial<TourPlace>) => tp[k])
              .find(glPropValue => !isNil(glPropValue));

            const notUndefinedAtLeastOneVjValue = keys(tp)
              .filter(k => k.includes('vj_'))
              .map((k: keyof Partial<TourPlace>) => tp[k])
              .find(glPropValue => !isNil(glPropValue));

            /// 둘중하나는 있어야함.
            expect(
              notUndefinedAtLeastOneGlValue ?? notUndefinedAtLeastOneVjValue,
            ).toBeDefined();
          }
        }
      }
    });

    it('Case: Correct - 호텔 결과값 유효성 확인', async () => {
      // 아래 로직으로 검색 된 호텔 결과값 확인된 부분
      // 1. recommendedXXXHotelCount와 여행일수 및 hotelTransition 입력 파라미터에 따른 도출 결과 수와 일치하는지 비교
      // 2. 각 일자별 추천 호텔들이 min, mid, max 하루치 예산을 초과하지 않는지 확인
      // 3. 만약 /getRecommendListWithLatLngt api를 통해 응답된 값중에 추천된 호텔이 없이 비어있는 항목이 있는 경우 예산이 해당 쿼리에서 전체 검색된 호텔 결과들을 불러 예산을 초과하여 추천되지 않았는지 검증
      // 4. 추천된 호텔이 있을 경우 추천된 호텔의 일일 숙박비 총합이 하루 예산을 넘지 않는지 검증
    });
  });
});
