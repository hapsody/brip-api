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
// import { IBError } from './IBDefinitions';

/**
 * 애플 구독 결제 조회 api
 */
export const retrieveSubscriptionReceipt = async (
  originalTransactionId: string,
): Promise<{
  transactionInfo: JWSTransactionDecodedPayload;
  renewalInfo: JWSRenewalInfoDecodedPayload;
}> => {
  /// originalTransactionId로 조회
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

  const response = await api.getSubscriptionStatuses(originalTransactionId);

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

export const others = (): void => {};
