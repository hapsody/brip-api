import request from 'supertest';
import server from '@src/app';
import { isNil } from 'lodash';
import { SignInResponse, SaveScheduleResponsePayload } from '@src/routes/auth';
import {
  AddShareTripMemoryResType,
  AddShareTripMemorySuccessResType,
} from '@src/routes/tripNetwork/tripNetwork';
import { PrismaClient } from '@prisma/client';
import tripMemoryCategory from '../tripMemoryCategory';

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
    },
    recommendGrade: 'good',
    //   categoryIds: ['1', '2', '3'],
    //   tourPlaceId: null
  },
];

const login = async () => {
  const userRawRes = await request(server).post('/auth/signIn').send({
    id: 'hawaii@gmail.com',
    password: 'qwer1234',
  });
  const userRes = userRawRes.body as SignInResponse;
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
  const memoryCategory = await prisma.tripMemoryCategory.findMany({
    where: {
      super: '관광',
      name: '자연경관',
    },
  });
  // eslint-disable-next-line no-restricted-syntax
  for await (const seed of seedData) {
    const memoryGroup = await createGroup('나혼자 간다.', user.userId);
    const tourPlace = await prisma.tourPlace.findFirst({
      where: {
        status: 'IN_USE',
        tourPlaceType: 'GL_SPOT',
        gl_name: { equals: '용두암' },
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
        },
        categoryIds: memoryCategory.map(v => v.id),
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
