import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const exampleUser = await prisma.user.upsert({
    where: { email: 'hawaii@gmail.com' },
    update: {},
    create: {
      email: 'hawaii@gmail.com',
      password: 'qwer1234',
      phone: '+821012345678',
      nickName: '유쾌한인어',
      countryCode: 'KR',
      userTokenId: '0',
    },
  });
  console.log(exampleUser);
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
