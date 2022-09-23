import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const alreadyOne = await prisma.cardNewsGroup.findFirst({
    where: {
      title: {
        contains: '사라지기 전에 꼭 가봐야 할 장소 1편 - 몰디브',
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
      title: '사라지기 전에 꼭 가봐야 할 장소 1편 - 몰디브',
      thumbnailUri:
        'https://www.ttlnews.com/upload/editor_content_images/1550201354466_editor_image.jpg',

      cardNewsContent: {
        create: [
          {
            no: 1,
            title: '몰디브의 수도 "말레"',
            content:
              '말레 수산 시장과 로컬 레스토랑 등 실제 몰디브 사람들의 생활을 엿볼 수 있는 곳',
            bgPicUri:
              'https://post-phinf.pstatic.net/MjAyMTExMDlfMTE2/MDAxNjM2NDI1OTMzODc5.yYXOGDINYIna7Z0fFhzxD9sCs8xppU6a0y76PMU2FuAg.r6Dh1G45ZNepuatRvjy0cMc21Iedre1IftiN1EFMEJ4g.JPEG/Maldives_Male.jpg?type=w1200',
          },
          {
            no: 2,
            title: '다채로운 해상 액티비티의 섬 "마푸시 아일랜드"',
            content:
              '가볍게 즐기는 스노클링을 비롯해 배를 타고 바다로 나가 석양을 즐긴 후 낚시까지 겸하는 선셋피싱도 가능해요',
            bgPicUri:
              'https://post-phinf.pstatic.net/MjAyMTExMDlfNCAg/MDAxNjM2NDI1OTQwNTUx.XothkNoJ5EpUeica3koK1lCHn_54q3hRTWX_BFwnCZgg.PUdYvhtQmysrpkuy6IOxAUMhiER1hQwH3sqAdFralfsg.JPEG/Maldives_Maafushi_Island.jpg?type=w1200',
          },
          {
            no: 2,
            title: '다양한 해양생물을 볼 수 있는 "다라반두 아일랜드"',
            content:
              '유네스코 생물권 보호구역으로 지정되어 섬에서 보트를 타고 조금만 나가도 고래상어와 만타가오리를 볼 수 있어요',
            bgPicUri:
              'https://post-phinf.pstatic.net/MjAyMTExMDlfMjA3/MDAxNjM2NDI1OTc5MTIy.hJVcUIGHzSHK3mn6uMDxMBKC0DJ6Wzr4piU6nds-KdAg.uWEmGJBI1UkNA8rvJlxn8hRS9a2GGfoeuSqzNL2aJAQg.JPEG/Maldives_dharavandhoo_Dolphins.jpg?type=w1200',
          },
        ],
      },
    },
    include: {
      cardNewsContent: true,
    },
  });
  console.log(exCardGroup);
}

const wrapper = (func: () => Promise<void>): (() => void) => {
  return () => {
    func().catch(e => console.log(e));
  };
};

const seeder = (): void => {
  main()
    .catch(e => {
      console.error(e);
      process.exit(1);
    })
    .finally(
      wrapper(async () => {
        await prisma.$disconnect();
      }),
    );
};

export default seeder;
