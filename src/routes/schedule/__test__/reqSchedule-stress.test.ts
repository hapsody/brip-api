/* eslint-disable no-restricted-syntax */

import { ibDefs } from '@src/utils';
import axios from 'axios';
import {
  ReqNonMembersUserTokenSuccessResType,
  ReqNonMembersUserTokenResType,
} from '@src/routes/auth';
import moment from 'moment';
import {
  ReqScheduleRETParam,
  // MealOrder,
} from '../types/schduleTypes';

jest.setTimeout(180000);

describe('Schedule Express Router E2E Test', () => {
  describe('POST /reqSchedule', () => {
    it('POST /reqSchedule', async () => {
      /**
       * 일정생성 로드 스트레스 테스트
       */

      /// N명 비회원 유저 동시 일정생성 요청
      const result = (
        await Promise.all(
          Array.from(Array(15)).map((_, i) => {
            return new Promise(resolve => {
              const start = moment();
              axios
                .post(
                  'https://dev-api.idealbloom.co.kr/auth/reqNonMembersUserToken',
                )
                .then(userTokenRawRes => {
                  const userTokenRes = (
                    userTokenRawRes as unknown as {
                      data: ReqNonMembersUserTokenResType;
                    }
                  ).data;
                  const userToken =
                    userTokenRes.IBparams as ReqNonMembersUserTokenSuccessResType;

                  axios
                    .request({
                      method: 'post',
                      maxBodyLength: Infinity,
                      url: 'https://dev-api.idealbloom.co.kr/schedule/reqSchedule',
                      headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${userToken.userToken}`,
                      },
                      data: JSON.stringify({
                        ingNow: 'ing',
                        companion: 'alone',
                        period: '2',
                        travelType: ['rest', 'healing'],
                        destination: 'recommend',
                        travelHard: '2',
                        scanRange: [
                          {
                            regionCode: {
                              regionCode2: '46130',
                            },
                            keyword: '시도및 시군구',
                            minLat: '33',
                            minLng: '33.2',
                            maxLat: '126',
                            maxLng: '126.4',
                          },
                          {
                            regionCode: {
                              regionCode2: '43110',
                            },
                          },
                        ],
                      }),
                    })
                    .then(response => {
                      const rawResult = (
                        response as unknown as { data: ReqScheduleRETParam }
                      ).data;
                      // const callRes =
                      //   rawResult.IBparams as ReqScheduleRETParamPayload;

                      expect(rawResult.IBcode).toEqual(
                        { ...ibDefs.SUCCESS }.IBcode,
                      );
                      console.log(
                        `[${i}] duration: ${moment().diff(
                          start,
                          'milliseconds',
                        )}ms`,
                      );
                      resolve(true);
                    })
                    .catch(error => {
                      throw error;
                    });
                })
                .catch(err => {
                  console.error(err);
                  resolve(false);
                });
            });
          }),
        )
      ).filter(v => v);

      expect(result).toHaveLength(10);
    });
  });
});
