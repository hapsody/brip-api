import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const seedData = [
  {
    name: '하와이 신혼여행 패키지',
    desc: '가장 즐겁게 떠나는 하와이 환상여행 패키지',
    byWhom: 'TRAVA',
  },
  {
    name: '하와이 영어캠프',
    desc: '',
    byWhom: 'TRAVA',
  },
];

async function main(): Promise<void> {
  await prisma.iBEventPromotion.createMany({
    data: seedData,
  });

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
