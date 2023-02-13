import request from 'supertest';
import server from '@src/app';
import { SignInResponse, SaveScheduleResponsePayload } from '@src/routes/auth';
import {
  // AddTripMemCategoryRequestType,
  AddTripMemCategoryResType,
  AddTripMemCategorySuccessResType,
} from '@src/routes/tripNetwork/tripNetwork';
import { PrismaClient } from '@prisma/client';
import { isNil } from 'lodash';

const prisma = new PrismaClient();

const seedData = [
  {
    superCategory: '음식',
    nameList: [
      '브런치',
      '한식',
      '중식',
      '일식',
      '양식',
      '패스트푸드',
      '코스요리',
      '고기맛집',
      '특별한맛집',
      '나만의맛집',
      '아이와함께먹을수있는',
      '오래된맛집',
    ],
  },
  {
    superCategory: '관광',
    nameList: ['자연경관'],
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

const createCategory = async (
  bearerToken: string,
): Promise<AddTripMemCategorySuccessResType | null> => {
  const categoryList = await prisma.tripMemoryCategory.findMany({});
  if (isNil(categoryList) || categoryList.length === 0) {
    const addCategoryRawRes = await request(server)
      .post('/tripNetwork/addTripMemCategory')
      .set('Authorization', `Bearer ${bearerToken}`)
      .send(seedData);
    const addCategoryRes = addCategoryRawRes.body as AddTripMemCategoryResType;
    return addCategoryRes.IBparams as AddTripMemCategorySuccessResType;
  }
  return null;
};

async function main(): Promise<void> {
  const user = await login();
  const createResult = await createCategory(user.token);
  if (isNil(createResult))
    console.log(`'tripMemoryCategory' seed is already exist!`);
  else console.log(createResult);

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
