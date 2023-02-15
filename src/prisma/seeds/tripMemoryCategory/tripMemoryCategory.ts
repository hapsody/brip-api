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
    superCategory: '카페',
    nameList: [
      '분위기좋은',
      '인스타감성',
      '케익맛집',
      '예쁜',
      '로컬카페',
      '다목적공간',
      '조용한',
      '힙한',
      '핫플',
    ],
  },
  {
    superCategory: '숙소',
    nameList: [
      '시티뷰',
      '바다뷰',
      '마운틴뷰',
      '깔끔한',
      '조용한',
      '친절한',
      '시내와인접한',
      '풀빌라',
      '에어비앤비',
      '독채',
      '펫동반',
      '가족단위',
    ],
  },
  {
    superCategory: '관광',
    nameList: [
      '쇼핑',
      '아쿠아리움',
      '테마파크',
      '놀이공원',
      '유적지',
      '박물관',
      '미술관',
      '국립공원',
      '해안경관',
      '공원/정원',
      '섬',
      '언덕',
      '산',
      '강',
      '수목원',
      '숲',
      '바위',
      '둘레길',
      '오름',
      '해안도로',
      '기타',
    ],
  },
  {
    superCategory: '액티비티',
    nameList: [
      '스노보드',
      '스키',
      '케이블카',
      '패러글라이딩',
      '짚라인',
      'UTV',
      'MTB',
      '암벽등반',
      '그룹하이킹',
      '등산',
      '루지레이스',
      '골프',
      '티켓',
      '농장',
      '승마',
      'ATV',
      '카트레이스',
      '크루즈',
      '카약',
      '패들보드',
      '서핑',
      '제트보트',
      '세일링',
      '낚시',
      '스노클링',
      '해수욕',
    ],
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
  const addCategoryRawRes = await request(server)
    .post('/tripNetwork/addTripMemCategory')
    .set('Authorization', `Bearer ${bearerToken}`)
    .send(seedData);
  const addCategoryRes = addCategoryRawRes.body as AddTripMemCategoryResType;
  return addCategoryRes.IBparams as AddTripMemCategorySuccessResType;
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
