import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  // eslint-disable-next-line no-restricted-syntax

  const result = await prisma.adPlaceCategory.createMany({
    data: [
      {
        primary: '음식점',
        secondary: '한식',
      },
      {
        primary: '음식점',
        secondary: '일식',
      },
      {
        primary: '음식점',
        secondary: '중식',
      },
      {
        primary: '음식점',
        secondary: '양식',
      },
      {
        primary: '음식점',
        secondary: '분식',
      },
      {
        primary: '음식점',
        secondary: '레스토랑',
      },
      {
        primary: '음식점',
        secondary: '아시안음식',
      },
      {
        primary: '음식점',
        secondary: '퓨전음식',
      },
      {
        primary: '음식점',
        secondary: '뷔페',
      },
      {
        primary: '카페',
        secondary: '카페',
      },
      {
        primary: '카페',
        secondary: '베이커리',
      },
      {
        primary: '카페',
        secondary: '디저트',
      },
      {
        primary: '기타',
        secondary: '술집',
      },
      {
        primary: '기타',
        secondary: '바',
      },
    ],
    skipDuplicates: true,
  });

  if (result.count > 0) {
    const res = await prisma.adPlaceCategory.findMany();
    console.log(res);
  }

  await prisma.$disconnect();
}

export default main;
