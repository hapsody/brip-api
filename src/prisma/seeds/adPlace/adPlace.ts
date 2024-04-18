import { PrismaClient } from '@prisma/client';
import moment from 'moment';
import { isNil } from 'lodash';
import request from 'supertest';
import { adPlaceCategoryToIBTravelTag } from '@src/routes/myPage/myPage';
import server from '@src/app';
import { SignInResponse, SaveScheduleResponsePayload } from '@src/routes/auth';
import userSeedModule from '../user/user';
import adPlaceCategory from '../adPlaceCategory/adPlaceCategory';

const prisma = new PrismaClient();

const login = async (params: { id: string; password: string }) => {
  let userRawRes = await request(server).post('/auth/signIn').send(params);

  let userRes = userRawRes.body as SignInResponse;
  if (userRes.IBcode === '1000')
    return userRes.IBparams as SaveScheduleResponsePayload;
  await userSeedModule();
  userRawRes = await request(server).post('/auth/signIn').send(params);
  userRes = userRawRes.body as SignInResponse;
  return userRes.IBparams as SaveScheduleResponsePayload;
};

async function main(): Promise<void> {
  let user = await login({
    id: 'hawaii@gmail.com',
    password: 'qwer1234',
  });
  await adPlaceCategory();
  // eslint-disable-next-line no-restricted-syntax

  /// case 1
  let existCheck = await prisma.adPlace.findFirst({
    where: {
      title: '테스트 비즈니스 스토어',
    },
  });

  if (isNil(existCheck)) {
    const result = await prisma.adPlace.create({
      data: {
        status: 'STOP',
        subscribe: false,
        title: '테스트 비즈니스 스토어',
        mainPhoto: {
          create: {
            key: 'public/tourPlace/fastfive.png',
          },
        },
        // mainPhotoKey: 'public/tourPlace/fastfive.png',
        category: await adPlaceCategoryToIBTravelTag({
          category: [
            {
              primary: '기타',
              secondary: '오피스',
            },
          ],
        }),
        photos: {
          createMany: {
            data: [
              { key: 'public/tourPlace/fastfive.png' },
              { key: 'public/tourPlace/fastfive-2.png' },
            ],
          },
        },
        desc: '장소 소개글',
        roadAddress: '서울특별시 성동구 성수일로8길 55',
        openWeek: 'Mon: 09:00~20:00',
        closedDay: 'SAT, SUN',
        contact: '010-1234-5678',
        siteUrl: 'https://www.google.com',
        businessNumber: '249-12-01776',
        nationalCode: '82',
        user: {
          connect: {
            id: user.userId,
          },
        },
        // userId: user.userId,
      },
    });
    console.log(result);
  }

  /// case 2
  user = await login({
    id: 'chimchakman@gmail.com',
    password: 'qwer1234',
  });
  const title = 'IN_USE 테스트 비즈니스 스토어2';
  existCheck = await prisma.adPlace.findFirst({
    where: {
      title,
    },
  });

  if (isNil(existCheck)) {
    const alreadyExist = await prisma.tourPlace.findFirst({
      where: {
        title,
      },
    });

    const result2 = await prisma.adPlace.create({
      data: {
        status: 'IN_USE',
        subscribe: true,
        title,
        mainPhoto: {
          create: {
            key: 'public/tourPlace/fastfive.png',
          },
        },
        category: await adPlaceCategoryToIBTravelTag({
          category: [
            {
              primary: '기타',
              secondary: '오피스',
            },
          ],
        }),
        photos: {
          createMany: {
            data: [
              { key: 'public/tourPlace/fastfive.png' },
              { key: 'public/tourPlace/fastfive-2.png' },
            ],
          },
        },
        desc: '장소 소개글',
        roadAddress: '서울특별시 성동구 성수일로8길 55',
        openWeek: 'Mon: 09:00~20:00',
        closedDay: 'SAT, SUN',
        contact: '010-1234-5678',
        siteUrl: 'https://www.google.com',
        businessNumber: '249-12-01477',
        nationalCode: '82',
        // userId: user.userId,
        user: {
          connect: {
            id: user.userId,
          },
        },
        tourPlace: {
          ...(isNil(alreadyExist)
            ? {
                create: {
                  tourPlaceType: 'ADPLACE_SPOT',
                  lat: 37.545181,
                  lng: 127.056716,
                  status: 'IN_USE',
                  title: 'IN_USE 테스트 비즈니스 스토어2',
                  ibTravelTag: await adPlaceCategoryToIBTravelTag({
                    category: [
                      {
                        primary: '기타',
                        secondary: '오피스',
                      },
                    ],
                  }),
                  photos: {
                    createMany: {
                      data: [
                        { key: 'public/tourPlace/fastfive.png' },
                        { key: 'public/tourPlace/fastfive-2.png' },
                      ],
                    },
                  },
                  desc: '장소 소개글',
                  roadAddress: '서울특별시 성동구 성수일로8길 55',
                  openWeek: 'Mon: 09:00~20:00',
                  contact: '010-1234-5678',
                },
              }
            : {
                connect: {
                  id: alreadyExist.id,
                },
              }),
        },
        adPlaceStatistics: {
          create: (() => {
            const dailyData = (() => {
              const endDate = moment().startOf('d').subtract(1, 'd');
              const startDate = moment(endDate).subtract(380, 'd');

              const dummyDayStatData: {
                targetYear: number;
                targetMonth: number;
                targetDay: number;
                exposureCnt: number;
                validClickCnt: number;
                validConversionCnt: number;
              }[] = [];
              for (
                let curDate = moment(startDate);
                endDate.diff(curDate) >= 0;
                curDate.add(1, 'd')
              ) {
                dummyDayStatData.push({
                  targetYear: Number(curDate.format('YYYY')),
                  targetMonth: Number(curDate.format('MM')),
                  targetDay: Number(curDate.format('DD')),
                  exposureCnt: Math.floor(100 * Math.random()),
                  validClickCnt: Math.floor(20 * Math.random()),
                  validConversionCnt: Math.floor(5 * Math.random()),
                });
              }
              return dummyDayStatData;
            })();

            /// weekly 모의통계 생성
            let prevWeekth = -1;
            let accExposure = 0;
            let accValidClick = 0;
            let accValidConversion = 0;
            const weeklyData = dailyData
              .map(v => {
                const curDate = moment({
                  year: v.targetYear,
                  month: v.targetMonth - 1,
                  day: v.targetDay,
                });
                const weekth = Number(curDate.format('w'));
                if (prevWeekth === -1) prevWeekth = weekth;
                if (prevWeekth !== weekth) {
                  const ret = {
                    targetYear: v.targetYear,
                    targetWeek: prevWeekth,
                    exposureCnt: accExposure,
                    validClickCnt: accValidClick,
                    validConversionCnt: accValidConversion,
                  };
                  accExposure = v.exposureCnt;
                  accValidClick = v.validClickCnt;
                  accValidConversion = v.validConversionCnt;

                  prevWeekth = weekth;
                  return ret;
                }
                accExposure += v.exposureCnt;
                accValidClick += v.validClickCnt;
                accValidConversion += v.validConversionCnt;
                return null;
              })
              .filter(
                (
                  v,
                ): v is {
                  targetYear: number;
                  targetWeek: number;
                  exposureCnt: number;
                  validClickCnt: number;
                  validConversionCnt: number;
                } => v !== null,
              );

            /// monthly 모의통계 생성
            let prevMonth = -1;
            accExposure = 0;
            accValidClick = 0;
            accValidConversion = 0;
            const monthlyData = dailyData
              .map(v => {
                const curDate = moment({
                  year: v.targetYear,
                  month: v.targetMonth - 1,
                  day: v.targetDay,
                });
                const month = Number(curDate.format('MM'));
                if (prevMonth === -1) prevMonth = month;
                if (prevMonth !== month) {
                  const ret = {
                    targetMonth: prevMonth,
                    targetYear:
                      prevMonth === 12 ? v.targetYear - 1 : v.targetYear,
                    exposureCnt: accExposure,
                    validClickCnt: accValidClick,
                    validConversionCnt: accValidConversion,
                  };
                  accExposure = v.exposureCnt;
                  accValidClick = v.validClickCnt;
                  accValidConversion = v.validConversionCnt;

                  prevMonth = month;
                  return ret;
                }
                accExposure += v.exposureCnt;
                accValidClick += v.validClickCnt;
                accValidConversion += v.validConversionCnt;
                return null;
              })
              .filter(
                (
                  v,
                ): v is {
                  targetYear: number;
                  targetMonth: number;
                  exposureCnt: number;
                  validClickCnt: number;
                  validConversionCnt: number;
                } => v !== null,
              );

            return {
              daily: {
                create: dailyData,
              },
              weekly: {
                create: weeklyData,
              },
              monthly: {
                create: monthlyData,
              },
            };
          })(),
        },
      },
      include: {
        tourPlace: true,
        adPlaceStatistics: true,
      },
    });

    const updateRes = await prisma.adPlace.update({
      where: {
        id: result2.id,
      },
      data: {
        mainTourPlaceId: result2.tourPlace[0].id,
      },
      include: {
        tourPlace: true,
      },
    });
    console.log(updateRes);
  }

  await prisma.$disconnect();
}

export default main;
