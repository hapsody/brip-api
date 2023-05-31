import { isNil, isEmpty } from 'lodash';
import { PrismaClient, DataStageStatus, PlaceType } from '@prisma/client';

const prisma = new PrismaClient();

async function tourPlaceDupChecker(): Promise<void> {
  // const pageSize = 1000;
  // const lastId = 1;

  const items = await prisma.tourPlace.findMany({
    where: {
      status: 'IN_USE',
    },
    select: {
      id: true,
      title: true,
      lat: true,
      lng: true,
      status: true,
      tourPlaceType: true,
    },
    // take: pageSize,
    // cursor: {
    //   id: Number(lastId),
    // },
    orderBy: [{ title: 'desc' }, { lat: 'desc' }, { lng: 'desc' }],
  });
  type TPItem = {
    status: DataStageStatus;
    id: number;
    title: string | null;
    lat: number | null;
    lng: number | null;
    tourPlaceType: PlaceType;
  };

  let buf: TPItem[] = [];

  const newItems: (TPItem & { dup: boolean })[] = [];
  // eslint-disable-next-line no-restricted-syntax
  for (const v of items) {
    if (!isEmpty(buf) && v.title !== buf[0].title) {
      buf = [];
    }
    const alreadyExist = buf.find(k => {
      if (v.title === k.title && v.lat === k.lat && v.lng === k.lng) {
        return true;
      }
      return false;
    });
    if (isNil(alreadyExist)) {
      buf.push(v);
      newItems.push({
        ...v,
        dup: false,
      });
    } else {
      newItems.push({
        ...v,
        dup: true,
      });
    }
  }

  const dupList = newItems
    .map(v => {
      if (v.dup) {
        return v.id;
      }
      return null;
    })
    .filter((v): v is number => v !== null);

  console.log(`dupList.length: ${dupList.length}`);
  const updated = await prisma.tourPlace.updateMany({
    where: {
      id: {
        in: dupList,
      },
    },
    data: {
      status: 'DUPLICATED' as DataStageStatus,
    },
  });
  console.log(`num Of updated items:${updated.count}`);
}

function wrapper(func: () => Promise<void>): () => void {
  return () => {
    func().catch(e => console.error(e));
  };
}

tourPlaceDupChecker()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(
    wrapper(async () => {
      await prisma.$disconnect();
    }),
  );

export default tourPlaceDupChecker;
