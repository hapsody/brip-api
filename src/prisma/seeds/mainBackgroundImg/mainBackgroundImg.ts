import { PrismaClient, MainBackgroundImgType } from '@prisma/client';
import { isNil, isEmpty } from 'lodash';

const prisma = new PrismaClient();

const data: {
  key: string;
  title: string;
  type: MainBackgroundImgType;
}[] = [
  {
    key: 'public/mainBackgroundImg/mainalps.webp',
    title: 'alps',
    type: MainBackgroundImgType.DAY,
  },
  {
    key: 'public/mainBackgroundImg/mainjeju.webp',
    title: 'jeju',
    type: MainBackgroundImgType.DAY,
  },
  {
    key: 'public/mainBackgroundImg/mainswiss.webp',
    title: 'swiss',
    type: MainBackgroundImgType.DAY,
  },
  {
    key: 'public/mainBackgroundImg/mainaurora.webp',
    title: 'aurora',
    type: MainBackgroundImgType.NIGHT,
  },
  {
    key: 'public/mainBackgroundImg/mainaustriaviennanight.webp',
    title: 'austria vienna',
    type: MainBackgroundImgType.NIGHT,
  },
  {
    key: 'public/mainBackgroundImg/mainczechpraguenight.webp',
    title: 'czech prague',
    type: MainBackgroundImgType.NIGHT,
  },
  {
    key: 'public/mainBackgroundImg/mainhawaii.webp',
    title: 'hawaii',
    type: MainBackgroundImgType.DAY,
  },
];

async function main(): Promise<void> {
  // eslint-disable-next-line no-restricted-syntax
  for await (const img of data) {
    const alreadyExist = await prisma.mainBackgroundImg.findMany({
      where: {
        key: img.key,
      },
    });

    if (isNil(alreadyExist) || isEmpty(alreadyExist)) {
      const res = await prisma.mainBackgroundImg.create({
        data: {
          ...img,
        },
      });
      console.log(res);
    }
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
