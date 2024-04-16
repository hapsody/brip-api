import {
  AppStoreServerAPI,
  Environment,
  // decodeRenewalInfo,
  decodeTransaction,
  // decodeTransactions,
  // decodeNotificationPayload,
  decodeRenewalInfo,
  JWSRenewalInfoDecodedPayload,
  JWSTransactionDecodedPayload,
} from 'app-store-server-api';
// import { google } from 'googleapis';

import * as fs from 'fs';
import * as path from 'path';
import { IBError } from './IBDefinitions';

const key = fs.readFileSync(
  path.join(
    process.env.BRIP_JSON_KEY_PATH as string,
    process.env.APPLE_PRIVATE_KEY_FILENAME as string,
  ),
  'utf-8',
);

const api = new AppStoreServerAPI(
  key,
  process.env.APPLE_KEY_ID as string,
  process.env.APPLE_ISSUER_ID as string,
  process.env.APPLE_APP_BUNDLE_ID as string,
  (process.env.EXECUTE_ENV as string).includes('prod')
    ? Environment.Production
    : Environment.Sandbox,
);

/**
 * 애플 구독 결제 조회 api
 */
export const retrieveLastSubscriptionReceipt = async (
  originalTransactionId: string,
): Promise<{
  transactionInfo: JWSTransactionDecodedPayload;
  renewalInfo: JWSRenewalInfoDecodedPayload;
}> => {
  const response = await api.getSubscriptionStatuses(originalTransactionId);

  if (response.data.length === 0) {
    throw new IBError({
      type: 'EXTERNALAPI',
      message: 'originalTransactionId와 관련된 데이터가 존재하지 않습니다.',
    });
  }

  // Find the transaction you're looking for
  const item = response.data[0].lastTransactions.find(
    v => v.originalTransactionId === originalTransactionId,
  );

  const transactionInfo = await decodeTransaction(item!.signedTransactionInfo);
  const renewalInfo = await decodeRenewalInfo(item!.signedRenewalInfo);

  return {
    transactionInfo,
    renewalInfo,
  };
};

/**
 * 애플 originalTransactionId로 결제 내역들 조회
 * @returns
 */
export const retrieveReceiptHistory = async (
  originalTransactionId: string,
): Promise<{
  history: Partial<JWSTransactionDecodedPayload>[];
}> => {
  const r1 = await api.getTransactionHistory(originalTransactionId);
  const decoded = await Promise.all(
    r1.signedTransactions.map(async (v, i) => {
      return {
        index: i,
        ...(await decodeTransaction(v)),
        // ...pick(await decodeTransaction(v), [
        //   'transactionId',
        //   // 'originalTransactionId',
        //   // 'inAppOwnershipType',
        //   'transactionReason',
        // ]),
      };
    }),
  );

  return {
    history: decoded,
  };
};
