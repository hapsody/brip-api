import { PrismaClient } from '@prisma/client';
// import registTPFromAdPlace from '../scripts/registTPFromAdPlace/registTPFromAdPlace';
import { validateSubscriptionReceipt } from '@src/utils';
import moment from 'moment';

const prisma = new PrismaClient();

async function batchJob(): Promise<void> {
  // await registTPFromAdPlace();
  const nowTimestamp = new Date().getTime();
  const googleExpiredSubscriptions =
    await prisma.googleInAppPurchaseLog.findMany({
      where: {
        expiryTime: {
          lt: Math.ceil(nowTimestamp / 1000),
        },
      },
    });

  // const appleExpiredSubscriptions = await prisma.appleIn

  console.log('메롱');
  // eslint-disable-next-line no-restricted-syntax
  for await (const v of googleExpiredSubscriptions) {
    const validationResult = await validateSubscriptionReceipt({
      purchaseToken: v.purchaseToken,
    });

    if (moment().diff(moment(Number(validationResult.expiryTimeMillis))) >= 0) {
      /// expired
      await prisma.adPlace.update({
        where: {
          id: v.adPlaceId,
        },
        data: {
          subscribe: false,
        },
      });
    } else {
      /// not expired, revised expiryTime
      await prisma.googleInAppPurchaseLog.update({
        where: {
          id: v.id,
        },
        data: {
          expiryTime: Math.ceil(
            Number(validationResult.expiryTimeMillis) / 1000,
          ),
        },
      });
    }
  }
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
      process.exit(0);
    }),
  );

export default batchJob;
