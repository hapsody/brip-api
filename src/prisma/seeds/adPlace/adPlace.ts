import { PrismaClient } from '@prisma/client';
import { isNil } from 'lodash';
import request from 'supertest';
import { adPlaceCategoryToIBTravelTag } from '@src/routes/myPage/myPage';
import server from '@src/app';
import { SignInResponse, SaveScheduleResponsePayload } from '@src/routes/auth';
import userSeedModule from '../user/user';
import adPlaceCategory from '../adPlaceCategory/adPlaceCategory';

const prisma = new PrismaClient();

const login = async () => {
  let userRawRes = await request(server).post('/auth/signIn').send({
    id: 'hawaii@gmail.com',
    password: 'qwer1234',
  });

  let userRes = userRawRes.body as SignInResponse;
  if (userRes.IBcode === '1000')
    return userRes.IBparams as SaveScheduleResponsePayload;
  await userSeedModule();
  userRawRes = await request(server).post('/auth/signIn').send({
    id: 'hawaii@gmail.com',
    password: 'qwer1234',
  });
  userRes = userRawRes.body as SignInResponse;
  return userRes.IBparams as SaveScheduleResponsePayload;
};

async function main(): Promise<void> {
  const user = await login();
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
        status: 'NEW',
        subscribe: false,
        title: '테스트 비즈니스 스토어',
        mainImgUrl: 'public/tourPlace/fastfive.png',
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
        userId: user.userId,
      },
    });
    console.log(result);
  }

  /// case 2
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
        subscribe: false,
        title,
        mainImgUrl: 'public/tourPlace/fastfive.png',
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
        businessNumber: '249-12-01777',
        nationalCode: '82',
        userId: user.userId,
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
      },
    });
    console.log(result2);
  }

  await prisma.$disconnect();
}

export default main;
