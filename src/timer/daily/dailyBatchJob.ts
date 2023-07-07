import { PrismaClient } from '@prisma/client';
import registTPFromAdPlace from '../scripts/registTPFromAdPlace/registTPFromAdPlace';

const prisma = new PrismaClient();

async function batchJob(): Promise<void> {
  await registTPFromAdPlace();
}

function wrapper(func: () => Promise<void>): () => void {
  return () => {
    func().catch(e => console.error(e));
  };
}

batchJob()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(
    wrapper(async () => {
      await prisma.$disconnect();
    }),
  );

export default batchJob;
