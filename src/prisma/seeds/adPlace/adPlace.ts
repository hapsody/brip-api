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

  const existCheck = await prisma.adPlace.findFirst({
    where: {
      title: '테스트 비즈니스 스토어',
    },
  });

  if (!isNil(existCheck)) {
    await prisma.$disconnect();
    return;
  }

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

  await prisma.$disconnect();
}

export default main;
