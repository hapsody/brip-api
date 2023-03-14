import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const seedData = [
  {
    question: '자주 묻는 질문 1',
    answer: '자주 묻는 질문에 대한 답변. 자주 묻는 질문에 대한 답변 1.',
  },
  {
    question: '자주 묻는 질문 2',
    answer: '자주 묻는 질문에 대한 답변. 자주 묻는 질문에 대한 답변 2.',
  },
  {
    question: '자주 묻는 질문 3',
    answer: '자주 묻는 질문에 대한 답변. 자주 묻는 질문에 대한 답변 3.',
  },
  {
    question: '자주 묻는 질문 4',
    answer: '자주 묻는 질문에 대한 답변. 자주 묻는 질문에 대한 답변 4.',
  },
];

async function main(): Promise<void> {
  // eslint-disable-next-line no-restricted-syntax
  for await (const data of seedData) {
    let alreadyFaq = await prisma.faqList.findFirst({
      where: {
        question: { equals: data.question },
      },
    });
    if (!alreadyFaq) {
      alreadyFaq = await prisma.faqList.create({
        data: {
          question: data.question,
          answer: data.answer,
        },
      });
    }
    console.log(alreadyFaq);
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
