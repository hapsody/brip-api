import { PrismaClient } from '@prisma/client';
import registTPFromAdBusinessPlace from '../scripts/registTPFromAdBusinessPlace/registTPFromAdBusinessPlace';

const prisma = new PrismaClient();

async function batchJob(): Promise<void> {
  await registTPFromAdBusinessPlace();
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
