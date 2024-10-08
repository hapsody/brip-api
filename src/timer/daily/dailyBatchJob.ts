import { PrismaClient } from '@prisma/client';
// import registTPFromAdPlace from '../scripts/registTPFromAdPlace/registTPFromAdPlace';
import {
  // validateSubscriptionReceipt,
  retrieveLastSubscriptionReceipt,
} from '@src/utils';
import moment from 'moment';

const prisma = new PrismaClient();

async function batchJob(): Promise<void> {
  // await registTPFromAdPlace();
  // const nowTimestamp = new Date().getTime();
  // /adPlace/googleSubscriptionHook api 추가로 인해 (구글 RTDN) 실시간 상태 업데이트가 되어 구글은 별도의 batch 과정이 필요없음
  // const googleExpiredSubscriptions =
  //   await prisma.googleInAppPurchaseLog.findMany({
  //     where: {
  //       expiryTime: {
  //         lt: Math.ceil(nowTimestamp / 1000),
  //       },
  //     },
  //   });

  const appleExpiredSubscriptions = await prisma.appleInAppPurchaseLog.findMany(
    {
      where: {
        expireDateFormat: {
          lt: new Date(),
        },
        // expiresDate: {
        //   lt: Math.ceil(nowTimestamp / 1000),
        // },
      },
    },
  );

  // // eslint-disable-next-line no-restricted-syntax
  // for await (const v of googleExpiredSubscriptions) {
  //   console.log(`google purchaseToken: ${v.purchaseToken}`);
  //   const validationResult = await validateSubscriptionReceipt({
  //     purchaseToken: v.purchaseToken,
  //   });

  //   if (moment().diff(moment(Number(validationResult.expiryTimeMillis))) >= 0) {
  //     /// expired
  //     await prisma.adPlace.update({
  //       where: {
  //         id: v.adPlaceId,
  //       },
  //       data: {
  //         subscribe: false,
  //       },
  //     });
  //   } else {
  //     /// not expired, revised expiryTime
  //     await prisma.googleInAppPurchaseLog.update({
  //       where: {
  //         id: v.id,
  //       },
  //       data: {
  //         expiryTime: Math.ceil(
  //           Number(validationResult.expiryTimeMillis) / 1000,
  //         ),
  //       },
  //     });
  //   }
  // }

  // eslint-disable-next-line no-restricted-syntax
  for await (const v of appleExpiredSubscriptions) {
    console.log(`apple originalTransactionId: ${v.originalTransactionId}`);
    const validationResult = await retrieveLastSubscriptionReceipt(
      v.originalTransactionId,
    );

    if (
      moment().diff(
        moment(Number(validationResult.transactionInfo.expiresDate)),
      ) >= 0
    ) {
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
      await prisma.appleInAppPurchaseLog.update({
        where: {
          id: v.id,
        },
        data: {
          expireDateFormat: moment(
            Number(validationResult.transactionInfo.expiresDate),
          ).toISOString(),
          // expiresDate: Math.ceil(
          //   Number(validationResult.transactionInfo.expiresDate) / 1000,
          // ),
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
