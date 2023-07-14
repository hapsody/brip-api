import request from 'supertest';
import server from '@src/app';
import { isNil } from 'lodash';
import { SignInResponse, SaveScheduleResponsePayload } from '@src/routes/auth';
import {
  AddShareTripMemoryResType,
  AddShareTripMemorySuccessResType,
} from '@src/routes/tripNetwork/tripNetwork';
import { PrismaClient } from '@prisma/client';
import tripMemoryCategory from '../tripMemoryCategory/tripMemoryCategory';
import iBTravelTag from '../iBTravelTag/iBTravelTag';
import userSeedModule from '../user/user';

const prisma = new PrismaClient();

const seedData = [
  {
    tripMemoryParam: {
      title: '혼자가서 봐도 좋은 용두암',
      comment: '제주도 첫코스로 용두암을 보는것도 괜찮네요',
      hashTag: ['혼자하는여행', '아싸', '인생샷'],
      address: '제주특별자치도 제주시 용담2동 용두암길 15',
      lat: '33.516134',
      lng: '126.512128',
      img: 'private/tripNetwork/shareTripMemory/용두암.jpeg',
      // groupId: 7
      photos: [
        {
          key: 'private/tripNetwork/shareTripMemory/용두암.jpeg',
          photoMetaInfo: {
            type: 'MAIN',
            title: '용두암 전경',
            lat: '33.516134',
            lng: '126.512128',
            shotTime: '2023-04-20T03:11:23Z',
            keyword: ['죽이는 전경', '장관'],
            feature: [
              {
                super: '관광',
                name: '숲',
              },
              {
                super: '관광',
                name: '둘레길',
              },
            ],
            eval: '적극추천',
            desc: '제주도 도착하면 바로 볼 1순위 용두암 전경 사진',
          },
        },
        {
          key: 'private/tripNetwork/shareTripMemory/용두암가는길.jpg',
          photoMetaInfo: {
            type: 'DETAIL',
            title: '용두암 가는길 안내지도',
            lat: '33.516134',
            lng: '126.512128',
            shotTime: '2023-04-20T03:13:23Z',
            keyword: ['여행지 정보', '지도'],
            feature: [
              {
                super: '관광',
                name: '숲',
              },
              {
                super: '관광',
                name: '둘레길',
              },
            ],
            publicInfo: 'info',
          },
        },
        {
          key: 'private/tripNetwork/shareTripMemory/용두암주변맛집.jpeg',
          photoMetaInfo: {
            type: 'SUB',
            title: '용두암 주변맛집',
            lat: '33.516139',
            lng: '126.506763',
            shotTime: '2023-04-20T04:28:40Z',
            keyword: ['맛집 탐방'],
            feature: [
              {
                super: '관광',
                name: '숲',
              },
              {
                super: '관광',
                name: '둘레길',
              },
            ],
          },
        },
      ],
    },
    recommendGrade: 'good',
    //   categoryIds: ['1', '2', '3'],
    //   tourPlaceId: null
  },
];

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

const createGroup = async (name: string, userId: number) => {
  let memoryGroup = await prisma.tripMemoryGroup.findFirst({
    where: {
      name,
      user: {
        id: userId,
      },
    },
  });

  if (isNil(memoryGroup)) {
    memoryGroup = await prisma.tripMemoryGroup.create({
      data: {
        name,
        user: {
          connect: {
            id: userId,
          },
        },
      },
    });
  }
  return memoryGroup;
};

async function main(): Promise<void> {
  const user = await login();
  await tripMemoryCategory();
  await iBTravelTag();
  const memoryCategory = await prisma.tripMemoryCategory.findMany({
    where: {
      super: '관광',
      name: '기타',
    },
  });
  // eslint-disable-next-line no-restricted-syntax
  for await (const seed of seedData) {
    const memoryGroup = await createGroup('나혼자 간다.', user.userId);
    const tourPlace = await prisma.tourPlace.findFirst({
      where: {
        status: 'IN_USE',
        tourPlaceType: 'GL_SPOT',
        title: { equals: '용두암' },
      },
    });

    const addShareTripMemoryRawRes = await request(server)
      .post('/tripNetwork/addShareTripMemory')
      .set('Authorization', `Bearer ${user.token}`)
      .send({
        ...seed,
        tripMemoryParam: {
          ...seed.tripMemoryParam,
          groupId: memoryGroup.id,
          categoryIds: memoryCategory.map(v => v.id),
        },

        tourPlaceId: tourPlace ? tourPlace.id : undefined,
      });

    const addShareTripMemoryRes =
      addShareTripMemoryRawRes.body as AddShareTripMemoryResType;
    const addShareTripMemory =
      addShareTripMemoryRes.IBparams as AddShareTripMemorySuccessResType;
    console.log(addShareTripMemory);
  }
  await prisma.$disconnect();
}

// const wrapper = (func: () => Promise<void>): (() => void) => {
//   return () => {
//     func().catch(e => console.log(e));
//   };
// };

// const seeder = (): void => {
//   main()
//     .catch(e => {
//       console.error(e);
//       process.exit(1);
//     })
//     .finally(
//       wrapper(async () => {
//         await prisma.$disconnect();
//       }),
//     );
// };

// seeder();

export default main;
