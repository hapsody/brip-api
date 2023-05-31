import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  // eslint-disable-next-line no-restricted-syntax

  const result = await prisma.adBusinessPlaceCategory.createMany({
    data: [
      {
        primaryCategory: '음식점',
        secondaryCategory: '한식',
      },
      {
        primaryCategory: '음식점',
        secondaryCategory: '일식',
      },
      {
        primaryCategory: '음식점',
        secondaryCategory: '중식',
      },
      {
        primaryCategory: '음식점',
        secondaryCategory: '양식',
      },
      {
        primaryCategory: '음식점',
        secondaryCategory: '분식',
      },
      {
        primaryCategory: '음식점',
        secondaryCategory: '레스토랑',
      },
      {
        primaryCategory: '음식점',
        secondaryCategory: '아시안음식',
      },
      {
        primaryCategory: '음식점',
        secondaryCategory: '퓨전음식',
      },
      {
        primaryCategory: '음식점',
        secondaryCategory: '뷔페',
      },
      {
        primaryCategory: '카페',
        secondaryCategory: '카페',
      },
      {
        primaryCategory: '카페',
        secondaryCategory: '베이커리',
      },
      {
        primaryCategory: '카페',
        secondaryCategory: '디저트',
      },
      {
        primaryCategory: '기타',
        secondaryCategory: '술집',
      },
      {
        primaryCategory: '기타',
        secondaryCategory: '바',
      },
    ],
    skipDuplicates: true,
  });

  if (result.count > 0) {
    const res = await prisma.adBusinessPlaceCategory.findMany();
    console.log(res);
  }

  await prisma.$disconnect();
}

export default main;
