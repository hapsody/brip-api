import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const creator = await prisma.user.findFirst({
    where: {
      tripCreator: {
        some: {},
      },
    },
  });

  const alreadyOne = await prisma.cardNewsGroup.findFirst({
    where: {
      title: {
        contains: '몰디브의 비밀',
      },
    },
  });

  if (alreadyOne) {
    await prisma.cardNewsGroup.delete({
      where: {
        id: alreadyOne.id,
      },
    });
  }

  const exCardGroup = await prisma.cardNewsGroup.create({
    data: {
      no: 1,
      title: '몰디브의 비밀',
      thumbnailUri:
        'https://www.ttlnews.com/upload/editor_content_images/1550201354466_editor_image.jpg',
      userId: creator!.id,
      // cardTag: {
      //   connectOrCreate: [
      //     {
      //       where: { value: '몰디브' },
      //       create: { value: '몰디브' },
      //     },
      //     {
      //       where: { value: '1인 여행' },
      //       create: { value: '1인 여행' },
      //     },
      //     {
      //       where: { value: '유통기한' },
      //       create: { value: '유통기한' },
      //     },
      //     {
      //       where: { value: '엔데믹여행' },
      //       create: { value: '엔데믹여행' },
      //     },
      //   ],
      // },
      cardNewsContent: {
        create: [
          {
            no: 1,
            title: '몰디브의 수도 "말레"',
            content:
              '말레 수산 시장과 로컬 레스토랑 등 실제 몰디브 사람들의 생활을 엿볼 수 있는 곳',
            bgPicUri:
              'https://post-phinf.pstatic.net/MjAyMTExMDlfMTE2/MDAxNjM2NDI1OTMzODc5.yYXOGDINYIna7Z0fFhzxD9sCs8xppU6a0y76PMU2FuAg.r6Dh1G45ZNepuatRvjy0cMc21Iedre1IftiN1EFMEJ4g.JPEG/Maldives_Male.jpg?type=w1200',
            cardTag: {
              connectOrCreate: [
                {
                  where: { value: '몰디브' },
                  create: { value: '몰디브' },
                },
                {
                  where: { value: '1인 여행' },
                  create: { value: '1인 여행' },
                },
              ],
            },
          },
          {
            no: 2,
            title: '다채로운 해상 액티비티의 섬 "마푸시 아일랜드"',
            content:
              '가볍게 즐기는 스노클링을 비롯해 배를 타고 바다로 나가 석양을 즐긴 후 낚시까지 겸하는 선셋피싱도 가능해요',
            bgPicUri:
              'https://post-phinf.pstatic.net/MjAyMTExMDlfNCAg/MDAxNjM2NDI1OTQwNTUx.XothkNoJ5EpUeica3koK1lCHn_54q3hRTWX_BFwnCZgg.PUdYvhtQmysrpkuy6IOxAUMhiER1hQwH3sqAdFralfsg.JPEG/Maldives_Maafushi_Island.jpg?type=w1200',
            cardTag: {
              connectOrCreate: [
                {
                  where: { value: '몰디브' },
                  create: { value: '몰디브' },
                },
                {
                  where: { value: '1인 여행' },
                  create: { value: '1인 여행' },
                },
                {
                  where: { value: '유통기한' },
                  create: { value: '유통기한' },
                },
              ],
            },
          },
          {
            no: 3,
            title: '다양한 해양생물을 볼 수 있는 "다라반두 아일랜드"',
            content:
              '유네스코 생물권 보호구역으로 지정되어 섬에서 보트를 타고 조금만 나가도 고래상어와 만타가오리를 볼 수 있어요',
            bgPicUri:
              'https://post-phinf.pstatic.net/MjAyMTExMDlfMjA3/MDAxNjM2NDI1OTc5MTIy.hJVcUIGHzSHK3mn6uMDxMBKC0DJ6Wzr4piU6nds-KdAg.uWEmGJBI1UkNA8rvJlxn8hRS9a2GGfoeuSqzNL2aJAQg.JPEG/Maldives_dharavandhoo_Dolphins.jpg?type=w1200',
            cardTag: {
              connectOrCreate: [
                {
                  where: { value: '몰디브' },
                  create: { value: '몰디브' },
                },
                {
                  where: { value: '유통기한' },
                  create: { value: '유통기한' },
                },
                {
                  where: { value: '엔데믹여행' },
                  create: { value: '엔데믹여행' },
                },
              ],
            },
          },
        ],
      },
    },
    include: {
      cardNewsContent: true,
    },
  });
  console.log(exCardGroup);

  const alreadyOne2 = await prisma.cardNewsGroup.findFirst({
    where: {
      title: {
        contains: '베네치아의 비밀',
      },
    },
  });

  if (alreadyOne2) {
    await prisma.cardNewsGroup.delete({
      where: {
        id: alreadyOne2.id,
      },
    });
  }

  const exCardGroup2 = await prisma.cardNewsGroup.create({
    data: {
      no: 2,
      title: '베네치아의 비밀',
      thumbnailUri:
        'https://img.freepik.com/premium-photo/historic-houses-traditional-venetian-architecture-on-grand-canal-in-venice-italy_87646-8192.jpg?w=1060',
      userId: creator!.id,
      // cardTag: {
      //   connectOrCreate: [
      //     {
      //       where: {
      //         value: '베니스',
      //       },
      //       create: {
      //         value: '베니스',
      //       },
      //     },
      //     {
      //       where: {
      //         value: '이탈리아',
      //       },
      //       create: {
      //         value: '이탈리아',
      //       },
      //     },
      //     {
      //       where: {
      //         value: '1인 여행',
      //       },
      //       create: {
      //         value: '1인 여행',
      //       },
      //     },
      //     {
      //       where: {
      //         value: '유통기한',
      //       },
      //       create: {
      //         value: '유통기한',
      //       },
      //     },
      //     {
      //       where: {
      //         value: '배낭여행',
      //       },
      //       create: {
      //         value: '배낭여행',
      //       },
      //     },
      //   ],
      // },
      cardNewsContent: {
        create: [
          {
            no: 1,
            title: '베네치아 여행의 시작점 - 산마르코 광장',
            content:
              '두칼레 궁전과 무어인의 종탑 그리고 산 마크로 성당등 베네치아의 대표 관광 명소들이 모두 모여 있는 곳',
            bgPicUri:
              'https://w.namu.la/s/beb2d1069c80b731ce2c51d96e9c699dbcaf2a03743ce0078dd7e5055e7bbb7fe7aaa0d72b730ac3dc2dd5595106450b77a7ef28f898ebd0f9f7f4892b0b2b8c5889c4415afec80e526435936d45f2febba140b6d5e7ed9aa4686155d0a94df9302fefdb6c88eb5a61c487f7e6fe5a87',
            cardTag: {
              connectOrCreate: [
                {
                  where: { value: '베니스' },
                  create: { value: '베니스' },
                },
                {
                  where: { value: '이탈리아' },
                  create: { value: '이탈리아' },
                },
              ],
            },
          },
          {
            no: 2,
            title: '베네치아 공화국의 총독 관저 - 두칼레 궁전"',
            content:
              '세계에서 가장 큰 유화인 틴토레토의 "천국" 베로네세의 "베네치아의 찬미" 등 다양한 베니스파 화가들의 작품을 만날수 있는 곳',
            bgPicUri:
              'https://media-cdn.sygictraveldata.com/media/800x600/612664395a40232133447d33247d3832343638393035',
          },
          {
            no: 3,
            title: '황금의 교회 - 산 마르코 대성당',
            content:
              '산 마르코 광장 동쪽 끝에 자리하고 있는 베네치아 여행자들에게 방문 필수 코스',
            bgPicUri:
              'https://w.namu.la/s/cde3ec8b881f4cc96e9de05e6b69dae5c144123844fe297888eee84d4333ae578db62a3c77d45b83fe6b4d75c307a28e8991413153149440791795f396755bb3166e409ddab9cc0b10132c7599bf643ddf967b224f6973d7ea6625addc9bbbda8a29fa4511af1c7840c39b6bfcf3340d',
            cardTag: {
              connectOrCreate: [
                {
                  where: { value: '베니스' },
                  create: { value: '베니스' },
                },
                {
                  where: { value: '이탈리아' },
                  create: { value: '이탈리아' },
                },
                {
                  where: { value: '1인 여행' },
                  create: { value: '1인 여행' },
                },
                {
                  where: { value: '유통기한' },
                  create: { value: '유통기한' },
                },
                {
                  where: { value: '배낭여행' },
                  create: { value: '배낭여행' },
                },
              ],
            },
          },
        ],
      },
    },
    include: {
      cardNewsContent: true,
    },
  });

  console.log(exCardGroup2);
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
