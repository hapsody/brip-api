import { PrismaClient } from '@prisma/client';
import { genBcryptHash } from '../../../utils';

const prisma = new PrismaClient();

const userData: {
  email: string;
  password: string;
  phone: string;
  nickName: string;
  profileImg: string;
  countryCode: string;
  userTokenId: string;
}[] = [
  {
    email: 'hawaii@gmail.com',
    password: 'qwer1234',
    phone: '+82-1012345678',
    nickName: '유쾌한인어',
    profileImg: 'public/user/profileImg/starbucks.png',
    countryCode: 'KR',
    userTokenId: '0',
  },
  {
    email: 'admin@gmail.com',
    password: 'qwer1234!',
    phone: '+82-1072371091',
    nickName: '윤디니',
    countryCode: 'KR',
    profileImg: 'public/user/profileImg/profile.jpeg',
    userTokenId: '2',
  },
];

const creatorData: {
  email: string;
  password: string;
  phone: string;
  nickName: string;
  countryCode: string;
  userTokenId: string;
  profileImg: string;
  tripCreator: {
    nickName: string;
    // phone: string;
    area: string;
    // proposal: string;
    domain: string;
  };
}[] = [
  {
    email: 'chimchakman@gmail.com',
    password: 'qwer1234',
    phone: '+82-1012345678',
    nickName: '침착맨',
    countryCode: 'KR',
    userTokenId: '1',
    profileImg: 'public/user/profileImg/starbucks.png',
    tripCreator: {
      nickName: 'chimd',
      // phone: '+821012345678',
      area: '서울',
      // proposal: '거 크리에이터 함 시켜주쇼',
      domain: '1,4',
    },
  },
  {
    email: 'yjshim@gmail.com',
    password: 'qwer1234',
    phone: '+82-1012345678',
    nickName: '윤진',
    countryCode: 'KR',
    userTokenId: '1',
    profileImg: 'public/user/profileImg/고양이.png',
    tripCreator: {
      nickName: 'yjshim',
      // phone: '+821012345678',
      area: '서울',
      // proposal: '크리에이터에용',
      domain: '5,6,9,10',
    },
  },
];

async function main(): Promise<void> {
  // eslint-disable-next-line no-restricted-syntax
  for await (const user of userData) {
    const alreadyExist = await prisma.user.findFirst({
      where: {
        email: user.email,
      },
    });
    if (!alreadyExist) {
      const userTokenId = await prisma.nonMembersCount.create({
        data: {},
      });
      const hash = genBcryptHash(user.password);
      const res = await prisma.user.create({
        data: {
          ...user,
          password: hash,
          userTokenId: userTokenId.id.toString(),
        },
      });
      console.log(res);
    }
  }

  // eslint-disable-next-line no-restricted-syntax
  for await (const user of creatorData) {
    const alreadyExist = await prisma.user.findFirst({
      where: {
        email: user.email,
      },
    });
    if (!alreadyExist) {
      const userTokenId = await prisma.nonMembersCount.create({
        data: {},
      });
      const hash = genBcryptHash(user.password);
      const res = await prisma.user.create({
        data: {
          ...user,
          password: hash,
          userTokenId: userTokenId.id.toString(),
          tripCreator: {
            create: {
              ...user.tripCreator,
            },
          },
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
