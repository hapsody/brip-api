import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const exampleUser = await prisma.user.upsert({
    where: { email: 'hapsody@gmail.com' },
    update: {},
    create: {
      email: 'hapsody@gmail.com',
      password: 'qwer1234!',
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
