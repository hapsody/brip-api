// import { google } from 'googleapis';
import { androidpublisher, auth } from '@googleapis/androidpublisher';
import * as fs from 'fs';
import * as path from 'path';
import { IBError } from './IBDefinitions';

type GoogleSubscriptionReceiptType = {
  startTimeMillis: string; /// '1694760310759';
  expiryTimeMillis: string; /// '1694762109143';
  autoRenewing: boolean; /// false;
  priceCurrencyCode: string; /// 'KRW';
  priceAmountMicros: string; ///  '17800000000';
  countryCode: string; /// 'KR';
  developerPayload: string; /// '';
  cancelReason: number; /// 0;
  userCancellationTimeMillis: string; /// '1694762055593';
  orderId: string; /// 'GPA.3362-9672-9861-44566..4';
  purchaseType: number; /// 0;
  cancelSurveyResult: {
    cancelSurveyReason: number; /// 0;
    userInputCancelReason: string; /// '테스트';
  };
  acknowledgementState: number; /// 1;
  kind: string; ///  'androidpublisher#subscriptionPurchase';
};

/**
 * 구글 구독 결제 검증 api
 */
export const validateSubscriptionReceipt = async (params: {
  packageName?: string;
  productId?: string; /// === productId
  purchaseToken: string; /// === purchaseToken
}): Promise<GoogleSubscriptionReceiptType> => {
  const {
    packageName = 'com.io.idealbloom.brip',
    productId = 'brip_business_subscribe',
    purchaseToken,
  } = params;
  /// google 구독결제 검증
  const keyFilePath = path.join(
    // __dirname,
    './brip-399109-358bd070fe4e.json',
  );

  if (!fs.existsSync(keyFilePath)) {
    throw new IBError({
      type: 'NOTFOUNDRESOURCE',
      message: '키파일이 존재하지 않습니다.',
    });
  }

  const keys = JSON.parse(fs.readFileSync(keyFilePath, 'utf8')) as {
    private_key: string;
    client_email: string;
  };

  const jwtClient = new auth.JWT(
    keys.client_email,
    undefined,
    keys.private_key,
    ['https://www.googleapis.com/auth/androidpublisher'],
    undefined,
  );

  const androidpublisherV3 = androidpublisher({
    version: 'v3',
    auth: jwtClient,
  });

  const result = await androidpublisherV3.purchases.subscriptions.get({
    packageName,
    subscriptionId: productId, /// productId
    token: purchaseToken, /// purchaseToken
  });

  // console.log(result.data);

  if (result.status !== 200) {
    throw new IBError({
      type: 'EXTERNALAPI',
      message: 'google로 구독 결제를 확인하는 과정에서 오류가 발생했습니다.',
    });
  }

  return result.data as GoogleSubscriptionReceiptType;
};

export const others = (): void => {};
