import { PrismaClient } from '@prisma/client';

// import { getAllTextSearchPages } from '@src/routes/schedule/schedule';
// import { TextSearchReqParams } from '@src/routes/schedule/types/schduleTypes';
import { getAllTextSearchPages } from '../routes/schedule/schedule';
import { TextSearchReqParams } from '../routes/schedule/types/schduleTypes';

const prisma = new PrismaClient();

async function batchJob() {
  const textSearchReqParams: TextSearchReqParams = {
    keyword: '(surf -(*협재*)) in jeju',
    loadAll: true,
  };

  const textSearchResult = await getAllTextSearchPages(
    textSearchReqParams,
    undefined,
    textSearchReqParams.loadAll,
  );

  console.log(textSearchResult);
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
