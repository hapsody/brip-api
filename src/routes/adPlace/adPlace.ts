import express, { Request, Response } from 'express';

import {
  // AppStoreServerAPI,
  // Environment,
  // decodeRenewalInfo,
  decodeTransaction,
  // decodeTransactions,
  decodeNotificationPayload,
  decodeRenewalInfo,
} from 'app-store-server-api';

import prisma from '@src/prisma';
import {
  PrismaClient,
  AdPlace,
  IBPhotos,
  IBTravelTag,
  TourPlace,
  ShareTripMemory,
  TripMemoryCategory,
  AdPlaceStatus,
  AdPlaceDraftStatus,
  DataStageStatus,
  AdPlaceDraft,
  GoogleInAppPurchaseLog,
  AppleInAppPurchaseLog,
} from '@prisma/client';
import {
  ibDefs,
  asyncWrapper,
  IBResFormat,
  IBError,
  accessTokenValidCheck,
  getIBPhotoUrl,
  addrToGeoCode,
  ibTravelTagToTourPlaceType,
  getAccessableUrl,
  getUserProfileUrl,
  // getS3SignedUrl,
  IBContext,
  // getIBPhotoUrl,
  getImgUrlListFromIBPhotos,
  validateSubscriptionReceipt,
  retrieveLastSubscriptionReceipt,
  retrieveReceiptHistory,
} from '@src/utils';
import moment from 'moment';
import { isNil, isEmpty, isNaN, omit } from 'lodash';
import { delAdPlacePhoto } from '../myPage/myPage';

const adPlaceRouter: express.Application = express();

/**
 * apple 결제가 일어나면 애플 서버로부터 호출되는 hook 함수
 * 관련 결제 정보가 signedPayload 형태로(JWS) 넘어온다.
 */
export const appleSubscriptionHook = asyncWrapper(
  async (req: Request, res: Response): Promise<void> => {
    // console.log(req);

    const updateSubsStatus = async (params: {
      tx: Partial<PrismaClient>;
      adPlaceId: number;
    }) => {
      const { tx, adPlaceId } = params;
      const lastPurchaseLog = await tx.appleInAppPurchaseLog!.findFirst({
        where: {
          adPlaceId,
        },
        orderBy: {
          id: 'desc',
        },
        select: {
          // expiresDate: true,
          expireDateFormat: true,
          adPlaceId: true,
        },
      });

      console.log(`now: `, moment().format('YYYY-MM-D hh:mm:ss'));
      console.log(
        `expireDateFormat:`,
        moment(lastPurchaseLog!.expireDateFormat).format('YYYY-MM-D hh:mm:ss'),
      );

      /// adPlace 구독 상태 업데이트 로직
      /// lastPurchaseLog는 최소 방금 생성한 GoogleInAppPurchaseLog 데이터가 있기 때문에 null일수 없음
      await prisma.adPlace.update({
        where: {
          id: lastPurchaseLog?.adPlaceId,
        },
        data: {
          subscribe:
            moment().diff(moment(lastPurchaseLog!.expireDateFormat)) < 0,
          // moment().diff(moment(lastPurchaseLog!.expiresDate * 1000)) < 0,
        },
      });
    };

    // // Your signed payload from Apple
    const { signedPayload } = req.body as { signedPayload: string };
    if (isNil(signedPayload)) {
      throw new IBError({
        type: 'INVALIDPARAMS',
        message: 'this not contains signedPayload in body',
      });
    }

    const payload = await decodeNotificationPayload(signedPayload);

    if (isNil(payload) || isNil(payload.data)) {
      throw new IBError({
        type: 'INVALIDPARAMS',
        message:
          'this not contains data object field decoded from signedPayload',
      });
    }

    if (payload.data.bundleId !== process.env.APPLE_APP_BUNDLE_ID) {
      throw new IBError({
        type: 'INVALIDPARAMS',
        message: "this is not a brip's app bundle id",
      });
    }

    const transactionInfo = await decodeTransaction(
      payload.data.signedTransactionInfo,
    );
    const renewalInfo = await decodeRenewalInfo(payload.data.signedRenewalInfo);

    console.log(`[appleSubsHook] payload:`, {
      ...payload,
      data: omit(payload.data, ['signedRenewalInfo', 'signedTransactionInfo']),
    });
    console.log(`[appleSubsHook] transactionInfo: `, {
      ...transactionInfo,
      expiresDateFormat: moment(transactionInfo.expiresDate).format(
        'YYYY-MM-D hh:mm:ss',
      ),
    });
    console.log(`[appleSubsHook] renewalInfo: `, {
      ...renewalInfo,
      renewalDateFormat: moment(renewalInfo.renewalDate).format(
        'YYYY-MM-D hh:mm:ss',
      ),
    });

    const retreiveSubsResult = await retrieveLastSubscriptionReceipt(
      transactionInfo.originalTransactionId,
    );

    /// 애플 서버로부터 noti된 transactionId가 속하는 거래원점(originalTransaction)이 새로운 구독으로 대체되면 기존 originalTransactionId로는 애플서버 조회 안됨
    if (retreiveSubsResult === null) res.status(200).send();

    const { transactionInfo: latestTransactionInfo } = retreiveSubsResult;
    const { originalTransactionId } = transactionInfo;

    /// DB에 transaction 로그 기록 - original 구매기록(parentPurchaseLog) 확인
    const parentPurchaseLog = await prisma.appleInAppPurchaseLog.findUnique({
      where: {
        originalTransactionId,
      },
    });

    if (isNil(parentPurchaseLog)) {
      await prisma.appleInAppPurchaseAutoHookLog.create({
        data: {
          TIappAccountToken: transactionInfo.appAccountToken,
          TIbundleId: transactionInfo.bundleId,
          TIenvironment: transactionInfo.environment,
          TIexpiresDate: !isNil(transactionInfo.expiresDate)
            ? Math.ceil(transactionInfo.expiresDate / 1000)
            : undefined,
          TIinAppOwnershipType: transactionInfo.inAppOwnershipType,
          TIisUpgraded: transactionInfo.isUpgraded,
          TIofferIdentifier: transactionInfo.offerIdentifier,
          TIofferType: transactionInfo.offerType,
          TIoriginalPurchaseDate: Math.ceil(
            transactionInfo.originalPurchaseDate / 1000,
          ),
          TIoriginalTransactionId: transactionInfo.originalTransactionId,
          TIproductId: transactionInfo.productId,
          TIpurchaseDate: Math.ceil(transactionInfo.purchaseDate / 1000),
          TIquantity: transactionInfo.quantity,
          TIrevocationDate: !isNil(transactionInfo.revocationDate)
            ? Math.ceil(transactionInfo.revocationDate / 1000)
            : undefined,
          TIrevocationReason: transactionInfo.revocationReason,
          TIsignedDate: Math.ceil(transactionInfo.signedDate / 1000),
          TIstorefront: transactionInfo.storefront,
          TIstorefrontId: transactionInfo.storefrontId,
          TIsubscriptionGroupIdentifier:
            transactionInfo.subscriptionGroupIdentifier,
          TItransactionId: transactionInfo.transactionId,
          TItransactionReason: transactionInfo.transactionReason,
          TItype: transactionInfo.type,
          TIwebOrderLineItemId: transactionInfo.webOrderLineItemId,

          RIautoRenewProductId: renewalInfo.autoRenewProductId,
          RIautoRenewStatus: renewalInfo.autoRenewStatus,
          RIenvironment: renewalInfo.environment,
          RIexpirationIntent: renewalInfo.expirationIntent,
          RIgracePeriodExpiresDate: !isNil(renewalInfo.gracePeriodExpiresDate)
            ? Math.ceil(renewalInfo.gracePeriodExpiresDate / 1000)
            : undefined,
          RIisInBillingRetryPeriod: renewalInfo.isInBillingRetryPeriod,
          RIofferIdentifier: renewalInfo.offerIdentifier,
          RIofferType: renewalInfo.offerType,
          RIoriginalTransactionId: renewalInfo.originalTransactionId,
          RIpriceIncreaseStatus: renewalInfo.priceIncreaseStatus,
          RIproductId: renewalInfo.productId,
          RIrecentSubscriptionStartDate: Math.ceil(
            renewalInfo.recentSubscriptionStartDate / 1000,
          ),
          RIrenewalDate: Math.ceil(renewalInfo.renewalDate / 1000),
          RIsignedDate: Math.ceil(renewalInfo.signedDate / 1000),
        },
      });
      res.status(200).send();
      return;
    }

    // const alreadyExistLog =
    //   await prisma.appleInAppPurchaseAutoHookLog.findUnique({
    //     where: {
    //       TItransactionId: transactionId,
    //     },
    //   });

    // if (!isNil(alreadyExistLog)) {
    //   /// 같은 transactionId가 존재하면 subscribe 상태만 변경하고 끝냄
    //   await updateSubsStatus({
    //     tx: prisma,
    //     adPlaceId: parentPurchaseLog?.adPlaceId,
    //   });
    //   console.log('this transactionId already exists');
    //   res.status(200).send();
    //   return;
    // }

    await prisma.$transaction(async tx => {
      /// parentPurchaseLog가 존재하지 않는 경우는 최초 결제 이후 brip 앱에서 appleSubscribeAdPlace를 호출한것보다 먼저 본 hook함수가 실행된 경우다.

      await tx.appleInAppPurchaseLog.update({
        where: {
          id: parentPurchaseLog?.id,
        },
        data: {
          // expiresDate: Math.ceil(Number(transactionInfo.expiresDate) / 1000),
          expireDateFormat: new Date(
            Number(latestTransactionInfo.expiresDate),
          ).toISOString(),
        },
      });

      await updateSubsStatus({ tx, adPlaceId: parentPurchaseLog?.adPlaceId });

      await tx.appleInAppPurchaseAutoHookLog.create({
        data: {
          TIappAccountToken: transactionInfo.appAccountToken,
          TIbundleId: transactionInfo.bundleId,
          TIenvironment: transactionInfo.environment,
          TIexpiresDate: !isNil(transactionInfo.expiresDate)
            ? Math.ceil(transactionInfo.expiresDate / 1000)
            : undefined,
          TIinAppOwnershipType: transactionInfo.inAppOwnershipType,
          TIisUpgraded: transactionInfo.isUpgraded,
          TIofferIdentifier: transactionInfo.offerIdentifier,
          TIofferType: transactionInfo.offerType,
          TIoriginalPurchaseDate: Math.ceil(
            transactionInfo.originalPurchaseDate / 1000,
          ),
          TIoriginalTransactionId: transactionInfo.originalTransactionId,
          TIproductId: transactionInfo.productId,
          TIpurchaseDate: Math.ceil(transactionInfo.purchaseDate / 1000),
          TIquantity: transactionInfo.quantity,
          TIrevocationDate: !isNil(transactionInfo.revocationDate)
            ? Math.ceil(transactionInfo.revocationDate / 1000)
            : undefined,
          TIrevocationReason: transactionInfo.revocationReason,
          TIsignedDate: Math.ceil(transactionInfo.signedDate / 1000),
          TIstorefront: transactionInfo.storefront,
          TIstorefrontId: transactionInfo.storefrontId,
          TIsubscriptionGroupIdentifier:
            transactionInfo.subscriptionGroupIdentifier,
          TItransactionId: transactionInfo.transactionId,
          TItransactionReason: transactionInfo.transactionReason,
          TItype: transactionInfo.type,
          TIwebOrderLineItemId: transactionInfo.webOrderLineItemId,

          RIautoRenewProductId: renewalInfo.autoRenewProductId,
          RIautoRenewStatus: renewalInfo.autoRenewStatus,
          RIenvironment: renewalInfo.environment,
          RIexpirationIntent: renewalInfo.expirationIntent,
          RIgracePeriodExpiresDate: !isNil(renewalInfo.gracePeriodExpiresDate)
            ? Math.ceil(renewalInfo.gracePeriodExpiresDate / 1000)
            : undefined,
          RIisInBillingRetryPeriod: renewalInfo.isInBillingRetryPeriod,
          RIofferIdentifier: renewalInfo.offerIdentifier,
          RIofferType: renewalInfo.offerType,
          RIoriginalTransactionId: renewalInfo.originalTransactionId,
          RIpriceIncreaseStatus: renewalInfo.priceIncreaseStatus,
          RIproductId: renewalInfo.productId,
          RIrecentSubscriptionStartDate: Math.ceil(
            renewalInfo.recentSubscriptionStartDate / 1000,
          ),
          RIrenewalDate: Math.ceil(renewalInfo.renewalDate / 1000),
          RIsignedDate: Math.ceil(renewalInfo.signedDate / 1000),

          appleInAppPurchaseLog: {
            connect: {
              id: parentPurchaseLog.id,
            },
          },
        },
      });
    });

    res.status(200).send();
  },
);

/**
 * google 결제가 일어나면 google 서버로부터 호출되는 hook 함수
 * 관련 결제 정보가 signedPayload 형태로(JWS) 넘어온다.
 * 참조 구글 메뉴얼: https://developer.android.com/google/play/billing/getting-ready?hl=ko#configure-rtdn
 * google cloud platform - pub/sub api(구독) push 구독
 *
 */
export const googleSubscriptionHook = asyncWrapper(
  async (req: Request, res: Response): Promise<void> => {
    console.log('\n\n');

    // // Your signed payload from Apple
    const { message } = req.body as {
      message: {
        messageId: string;
        publishTime: string;
        data: string;
      };
      subscription: string;
    };
    if (isNil(message)) {
      throw new IBError({
        type: 'INVALIDPARAMS',
        message: 'this not contains message in body',
      });
    }

    const data = JSON.parse(Buffer.from(message.data, 'base64').toString()) as {
      /// https://developer.android.com/google/play/billing/rtdn-reference?hl=ko
      version: string;
      packageName: string;
      eventTimeMillis: number;
      oneTimeProductNotification?: {
        version: string;
        notificationType: number;
        purchaseToken: string;
        sku: string;
      };
      subscriptionNotification: {
        version: string;
        notificationType: number;
        purchaseToken: string;
        subscriptionId: string;
      };
      testNotification?: {
        version: string;
      };
    };

    const validationResult = await validateSubscriptionReceipt({
      purchaseToken: data.subscriptionNotification.purchaseToken,
    });
    console.log(
      omit(
        {
          ...message,
          data: {
            ...data,
            subscriptionNotification: {
              ...data.subscriptionNotification,
              validationResult: JSON.stringify(validationResult, null, 2),
            },
          },
          publishTime: moment(message.publishTime).format('YYYY-MM-DD H:mm:ss'),
        },
        'message_id',
        'publish_time',
      ),
    );

    const purchaseLog = await prisma.googleInAppPurchaseLog.findUnique({
      where: {
        purchaseToken: data.subscriptionNotification.purchaseToken,
      },
    });

    if (isNil(purchaseLog)) {
      console.log('Not Exist purchaseToken in DB');
      console.log('\n');
      res.status(400).send();
      return;
    }

    await prisma.googleInAppPurchaseAutoHookLog.create({
      data: {
        // packageName: data.packageName,
        notificationType: data.subscriptionNotification.notificationType,
        purchaseToken: data.subscriptionNotification.purchaseToken,
        // subscriptionId: data.subscriptionNotification.subscriptionId,

        messageId: message.messageId,
        publishTime: message.publishTime,
        GoogleInAppPurchaseLog: {
          connect: {
            id: purchaseLog.id,
          },
        },
      },
    });

    await prisma.googleInAppPurchaseLog.update({
      where: {
        purchaseToken: data.subscriptionNotification.purchaseToken,
      },
      data: {
        // expiryTime: Math.ceil(Number(validationResult.expiryTimeMillis) / 1000),
        expireDateFormat: new Date(
          Number(validationResult.expiryTimeMillis),
        ).toISOString(),
      },
    });

    const lastPurchaseLog = await prisma.googleInAppPurchaseLog.findFirst({
      where: {
        adPlaceId: purchaseLog.adPlaceId,
      },
      orderBy: {
        id: 'desc',
      },
      select: {
        // expiryTime: true,
        expireDateFormat: true,
        adPlaceId: true,
      },
    });

    /// adPlace 구독 상태 업데이트 로직
    /// lastPurchaseLog는 최소 방금 생성한 GoogleInAppPurchaseLog 데이터가 있기 때문에 null일수 없음
    await prisma.adPlace.update({
      where: {
        id: lastPurchaseLog?.adPlaceId,
      },
      data: {
        subscribe: moment().diff(moment(lastPurchaseLog!.expireDateFormat)) < 0,
        // moment().diff(moment(lastPurchaseLog!.expiryTime * 1000)) < 0,
      },
    });

    res.status(200).send();

    // if (moment().diff(moment(Number(validationResult.expiryTimeMillis))) >= 0) {
    //   /// expired
    //   console.log('[Expired case]');
    //   console.log('now: ', moment().format('YYYY-MM-D HH:mm:ss'));
    //   console.log(
    //     'expire time: ',
    //     moment(Number(validationResult.expiryTimeMillis)).format(
    //       'YYYY-MM-D HH:mm:ss',
    //     ),
    //   );
    // } else {
    //   console.log('[Not expired case]');
    //   console.log('now: ', moment().format('YYYY-MM-D HH:mm:ss'));
    //   console.log(
    //     'expire time: ',
    //     moment(Number(validationResult.expiryTimeMillis)).format(
    //       'YYYY-MM-D HH:mm:ss',
    //     ),
    //   );
    // }

    // res.status(200).send();
  },
);

export type GetAdPlaceRequestType = {
  adPlaceId?: string; /// 검색할 adPlaceId
  userId?: string; /// 검색할 광고주의 userId
};
export type GetAdPlaceSuccessResType = AdPlace & {
  photos: IBPhotos[];
  category: IBTravelTag[];
  relatedShareTripMemoryCategory: TripMemoryCategory[]; /// adPlace와 연관이 있는 tourPlace들을 기반으로 게시된 shareTripMemory 들이 갖는 태그들을 중복없이 반환.
};
export type GetAdPlaceResType = Omit<IBResFormat, 'IBparams'> & {
  IBparams: GetAdPlaceSuccessResType[] | {};
};

/**
 * AdPlace 정보를 요청한다.
 * 구독상태이고 status가 IN_USE 상태인것만 찾는다.
 * 공유글은 adPlace와 연관된 모든 tourPlace에 달린 공유글을 노출한다.
 * https://www.figma.com/file/Tdpp5Q2J3h19NyvBvZMM2m/brip?type=design&node-id=3537-2478&mode=design&t=2AIO8OM26WPo3dXs-4
 */
export const getAdPlace = asyncWrapper(
  async (
    req: Express.IBTypedReqQuery<GetAdPlaceRequestType>,
    res: Express.IBTypedResponse<GetAdPlaceResType>,
  ) => {
    try {
      const { locals } = req;
      const userTokenId = (() => {
        if (locals && locals?.grade === 'member')
          return locals?.user?.userTokenId;
        return locals?.tokenId;
      })();
      if (!userTokenId) {
        throw new IBError({
          type: 'NOTEXISTDATA',
          message: '정상적으로 부여된 userTokenId를 가지고 있지 않습니다.',
        });
      }

      const { adPlaceId, userId } = req.query;

      if (
        (isNil(adPlaceId) || isEmpty(adPlaceId) || isNaN(Number(adPlaceId))) &&
        (isNil(userId) || isEmpty(userId) || isNaN(Number(userId)))
      ) {
        throw new IBError({
          type: 'INVALIDPARAMS',
          message: 'adPlaceId나 userId 두 파라미터중 하나는 제공되어야 합니다.',
        });
      }

      const adPlaces = await prisma.adPlace.findMany({
        where: {
          status: {
            in: ['IN_USE', 'STOP'],
          },
          ...(!isNil(adPlaceId) &&
            !isEmpty(adPlaceId) &&
            !isNaN(Number(adPlaceId)) && {
              id: Number(adPlaceId),
            }),
          ...(!isNil(userId) &&
            !isEmpty(userId) &&
            !isNaN(Number(userId)) && {
              userId: Number(userId),
            }),
          mainTourPlaceId: { not: null },
        },
        include: {
          mainPhoto: true,
          photos: true,
          category: true,
          tourPlace: {
            select: {
              id: true,
              shareTripMemory: {
                include: {
                  tripMemoryCategory: true,
                  user: {
                    select: {
                      id: true,
                      nickName: true,
                      profileImg: true,
                    },
                  },
                },
              },
            },
          },
          AdPlaceDraft: true,
        },
      });

      const categoryIds = adPlaces
        .map(adP => {
          return adP.tourPlace
            .map(tp => {
              return tp.shareTripMemory
                .map(shtm => {
                  return shtm.tripMemoryCategory.map(cate => cate.id);
                })
                .flat();
            })
            .flat();
        })
        .flat();

      const tripMemoryCategories = await prisma.tripMemoryCategory.findMany({
        where: {
          id: { in: categoryIds },
        },
      });

      const result = await Promise.all(
        adPlaces.map(async v => {
          return {
            ...omit(v, ['tourPlace']),
            relatedShareTripMemoryCategory: tripMemoryCategories,
            mainPhoto: isNil(v.photos)
              ? null
              : await getIBPhotoUrl(v.mainPhoto),
            photos: isNil(v.photos)
              ? null
              : await Promise.all(v.photos.map(getIBPhotoUrl)),
            shareTripMemory: await Promise.all(
              v.tourPlace
                .map(k =>
                  k.shareTripMemory.map(async stm => {
                    return {
                      ...stm,
                      img: await getAccessableUrl(stm.img),
                      user: {
                        ...stm.user,
                        profileImg: await getUserProfileUrl(stm.user),
                      },
                    };
                  }),
                )
                .flat(1),
            ),
          };
        }),
      );

      res.json({
        ...ibDefs.SUCCESS,
        IBparams: result,
      });
    } catch (err) {
      if (err instanceof IBError) {
        if (err.type === 'INVALIDPARAMS') {
          console.error(err);
          res.status(400).json({
            ...ibDefs.INVALIDPARAMS,
            IBdetail: (err as Error).message,
            IBparams: {} as object,
          });
          return;
        }
        if (err.type === 'DUPLICATEDDATA') {
          console.error(err);
          res.status(409).json({
            ...ibDefs.DUPLICATEDDATA,
            IBdetail: (err as Error).message,
            IBparams: {} as object,
          });
          return;
        }
      }

      throw err;
    }
  },
);

export interface GetMyAdPlaceDraftRequestType {
  adPlaceDraftId?: string; /// 검색할 adPlaceId
}
export interface GetMyAdPlaceDraftSuccessResType extends AdPlaceDraft {
  photos: IBPhotos[];
  category: (IBTravelTag & {})[];
  mainPhoto: IBPhotos & {};
  tourPlace: (TourPlace & {})[];
  adPlace: AdPlace | null;
}
export type GetMyAdPlaceDraftResType = Omit<IBResFormat, 'IBparams'> & {
  IBparams: GetMyAdPlaceDraftSuccessResType[] | {};
};

/**
 * 자신이 소유한 AdPlaceDraft 정보를 요청한다.
 */
export const getMyAdPlaceDraft = asyncWrapper(
  async (
    req: Express.IBTypedReqQuery<GetMyAdPlaceDraftRequestType>,
    res: Express.IBTypedResponse<GetMyAdPlaceDraftResType>,
  ) => {
    try {
      const { locals } = req;
      const userTokenId = (() => {
        if (locals && locals?.grade === 'member')
          return locals?.user?.userTokenId;
        return locals?.tokenId;
      })();
      if (!userTokenId) {
        throw new IBError({
          type: 'NOTEXISTDATA',
          message: '정상적으로 부여된 userTokenId를 가지고 있지 않습니다.',
        });
      }

      const { adPlaceDraftId } = req.query;

      if (
        isNil(adPlaceDraftId) ||
        isEmpty(adPlaceDraftId) ||
        isNaN(Number(adPlaceDraftId))
      ) {
        const adPlaceDrafts = await prisma.adPlaceDraft.findMany({
          where: {
            user: {
              userTokenId,
            },
          },
          include: {
            photos: true,
            category: true,
            mainPhoto: true,
            tourPlace: true,
            adPlace: true,
          },
        });
        res.json({
          ...ibDefs.SUCCESS,
          IBparams: await Promise.all(
            adPlaceDrafts.map(async v => {
              return {
                ...v,
                mainPhoto: await getIBPhotoUrl(v.mainPhoto),
                photos: await getImgUrlListFromIBPhotos(v.photos),
              };
            }),
          ),
        });
        return;
      }

      const adPlaceDraft = await prisma.adPlaceDraft.findUnique({
        where: {
          id: Number(adPlaceDraftId),
        },
        include: {
          user: {
            select: {
              userTokenId: true,
            },
          },
          photos: true,
          category: true,
          mainPhoto: true,
          tourPlace: true,
          adPlace: true,
        },
      });

      if (isNil(adPlaceDraft)) {
        throw new IBError({
          type: 'NOTEXISTDATA',
          message:
            'adPlaceDraftId에 해당하는 adPlaceDraft 정보가 존재하지 않습니다.',
        });
      }

      if (adPlaceDraft.user.userTokenId !== userTokenId) {
        throw new IBError({
          type: 'NOTAUTHORIZED',
          message: '조회 권한이 없는 유저의 adPlaceDraft입니다.',
        });
      }

      res.json({
        ...ibDefs.SUCCESS,
        IBparams: {
          ...omit(adPlaceDraft, 'user'),
          mainPhoto: await getIBPhotoUrl(adPlaceDraft.mainPhoto),
          photos: await getImgUrlListFromIBPhotos(adPlaceDraft.photos),
        },
      });
    } catch (err) {
      if (err instanceof IBError) {
        if (err.type === 'INVALIDPARAMS') {
          console.error(err);
          res.status(400).json({
            ...ibDefs.INVALIDPARAMS,
            IBdetail: (err as Error).message,
            IBparams: {} as object,
          });
          return;
        }
        if (err.type === 'NOTEXISTDATA') {
          console.error(err);
          res.status(404).json({
            ...ibDefs.NOTEXISTDATA,
            IBdetail: (err as Error).message,
            IBparams: {} as object,
          });
          return;
        }
        if (err.type === 'NOTAUTHORIZED') {
          console.error(err);
          res.status(403).json({
            ...ibDefs.NOTAUTHORIZED,
            IBdetail: (err as Error).message,
            IBparams: {} as object,
          });
          return;
        }
      }

      throw err;
    }
  },
);

export type GetAdPlaceStatisticsRequestType = {
  adPlaceId: string; /// 조회하려는 adPlaceId
  day?: string; /// 조회하려는 날짜 기준일 ex) 2023-06-20이면 daily는 전날인 2023-06-19일이 조회되고 weekly는 6/20일 기준으로 전주인 2023년 24번째 주간통계가, 월간 통계는 2023-06-20일이 속한 해인 2023년 통계가 월간치로 뽑힌다.
};
export type GetAdPlaceStatisticsSuccessResType = {
  daily: {
    targetYear: number;
    targetMonth: number;
    targetDay: number;
    /// 전일 통계
    exposure: number; /// 노출수: 스케쥴에  뽑힌것, 실시간 추천, 네트워크 일반 노출 수
    validClicks: number; /// 유효 클릭 수
    validConversions: number; /// 유효 전환 수
  };
  weekly: {
    targetYear: number;
    targetWeek: number;
    /// 전주 통계
    exposure: number; /// 노출수: 스케쥴에  뽑힌것, 실시간 추천, 네트워크 일반 노출 수
    validClicks: number; /// 유효클릭수: 광고 비즈니스 문의 페이지까지 들어온것 https://www.figma.com/file/Tdpp5Q2J3h19NyvBvZMM2m/brip?type=design&node-id=3537-2711&mode=design&t=9lNcRGkkddcykgox-4
    validConversions: number; /// 유효전환수: 광고 비즈니스 문의 페이지까지 들어와서 문의 버튼까지 누른 수 https://www.figma.com/file/Tdpp5Q2J3h19NyvBvZMM2m/brip?type=design&node-id=3537-2711&mode=design&t=9lNcRGkkddcykgox-4
  };
  monthly: {
    targetYear: number;
    month: string; /// 당년 몇월통계인지 표시
    exposure: number; /// 노출수: 스케쥴에  뽑힌것, 실시간 추천, 네트워크 일반 노출 수
    validClicks: number; /// /// 유효클릭수: 광고 비즈니스 문의 페이지까지 들어온것 https://www.figma.com/file/Tdpp5Q2J3h19NyvBvZMM2m/brip?type=design&node-id=3537-2711&mode=design&t=9lNcRGkkddcykgox-4
    validConversions: number; /// 유효전환수: 광고 비즈니스 문의 페이지까지 들어와서 문의 버튼까지 누른 수 https://www.figma.com/file/Tdpp5Q2J3h19NyvBvZMM2m/brip?type=design&node-id=3537-2711&mode=design&t=9lNcRGkkddcykgox-4
  }[];
};
export type GetAdPlaceStatisticsResType = Omit<IBResFormat, 'IBparams'> & {
  IBparams: GetAdPlaceStatisticsSuccessResType | {};
};

export const getAdPlaceStatistics = asyncWrapper(
  async (
    req: Express.IBTypedReqQuery<GetAdPlaceStatisticsRequestType>,
    res: Express.IBTypedResponse<GetAdPlaceStatisticsResType>,
  ) => {
    try {
      const { locals } = req;
      const userId = (() => {
        if (locals && locals?.grade === 'member')
          return locals?.user?.id.toString();
        return locals?.tokenId;
        // throw new IBError({
        //   type: 'NOTAUTHORIZED',
        //   message: 'member 등급만 접근 가능합니다.',
        // });
      })();
      if (isNil(userId)) {
        throw new IBError({
          type: 'NOTEXISTDATA',
          message: '정상적으로 부여된 userId를 가지고 있지 않습니다.',
        });
      }

      const { adPlaceId, day } = req.query;
      if (isNil(adPlaceId) || isEmpty(adPlaceId) || isNaN(Number(adPlaceId))) {
        throw new IBError({
          type: 'INVALIDPARAMS',
          message:
            'adPlaceId 파라미터가 제공되지 않거나 number로 변환할수 없는 string 타입입니다.',
        });
      }

      const today = moment(day).startOf('d');
      // const where = {
      //   adPlaceId: Number(adPlaceId),
      //   ...(() => {
      //     /// daily condition
      //     const yesterday = moment(today.subtract(1, 'd'));
      //     const targetYear = Number(yesterday.format('YYYY'));
      //     const targetMonth = Number(yesterday.format('MM')) - 1; /// 이번달.
      //     const targetDay = Number(yesterday.format('DD')) - 1; /// 전날

      //     return {
      //       daily: {
      //         every: {
      //           targetYear,
      //           targetMonth,
      //           targetDay,
      //         },
      //       },
      //     };
      //   })(),
      //   ...(() => {
      //     /// weekly condition
      //     /// 당해년도 1주차면 전해년도 52주차를 반환
      //     const prevWeek = moment(today.subtract(1, 'w'));
      //     const targetYear = Number(prevWeek.format('YYYY'));
      //     const targetWeek = Number(prevWeek.format('WW')) - 1; /// 전 주

      //     return {
      //       weekly: {
      //         every: {
      //           targetYear,
      //           targetWeek,
      //         },
      //       },
      //     };
      //   })(),
      //   ...(() => {
      //     /// monthly condition
      //     const targetYear = Number(today.format('YYYY'));

      //     return {
      //       monthly: {
      //         every: {
      //           targetYear,
      //         },
      //       },
      //     };
      //   })(),
      // };
      const yesterday = moment(today).subtract(1, 'd');
      const prevWeek = moment(today).subtract(1, 'w');
      const adPlaceStatistics = await prisma.adPlaceStatistics.findFirst({
        where: {
          adPlaceId: Number(adPlaceId),
        },
        include: {
          // daily: true,
          // weekly: true,
          // monthly: true,
          ...(() => {
            /// daily condition

            const targetYear = Number(yesterday.format('YYYY'));
            const targetMonth = Number(yesterday.format('MM')); /// 이번달.
            const targetDay = Number(yesterday.format('DD')); /// 전날

            return {
              daily: {
                where: {
                  targetYear,
                  targetMonth,
                  targetDay,
                },
              },
            };
          })(),
          ...(() => {
            /// weekly condition
            /// 당해년도 1주차면 전해년도 52주차를 반환

            const targetYear = Number(prevWeek.format('YYYY'));
            const targetWeek = Number(prevWeek.format('WW')); /// 전 주

            return {
              weekly: {
                where: {
                  targetYear,
                  targetWeek,
                },
              },
            };
          })(),
          ...(() => {
            /// monthly condition
            const targetYear = Number(today.format('YYYY'));

            return {
              monthly: {
                where: {
                  targetYear,
                },
              },
            };
          })(),
        },
      });

      if (isNil(adPlaceStatistics)) {
        throw new IBError({
          type: 'NOTEXISTDATA',
          message:
            '존재하지 않는 adPlaceId이거나 통계가 생성되지 않은 adPlaceId입니다..',
        });
      }

      const { daily, monthly, weekly } = adPlaceStatistics;
      const result: GetAdPlaceStatisticsSuccessResType = {
        daily:
          isNil(daily) || isEmpty(daily)
            ? {
                targetYear: Number(yesterday.format('YYYY')),
                targetMonth: Number(yesterday.format('MM')),
                targetDay: Number(yesterday.format('DD')),
                exposure: 0,
                validClicks: 0,
                validConversions: 0,
              }
            : {
                targetYear: daily[0].targetYear,
                targetMonth: daily[0].targetMonth,
                targetDay: daily[0].targetDay,
                exposure: daily[0].exposureCnt,
                validClicks: daily[0].validClickCnt,
                validConversions: daily[0].validConversionCnt,
              },
        weekly:
          isNil(weekly) || isEmpty(weekly)
            ? {
                targetYear: Number(prevWeek.format('YYYY')),
                targetWeek: Number(prevWeek.format('w')),
                exposure: 0,
                validClicks: 0,
                validConversions: 0,
              }
            : {
                targetYear: weekly[0].targetYear,
                targetWeek: weekly[0].targetWeek,
                exposure:
                  isNil(weekly) ?? isEmpty(weekly) ? 0 : weekly[0].exposureCnt,
                validClicks:
                  isNil(weekly) ?? isEmpty(weekly)
                    ? 0
                    : weekly[0].validClickCnt,
                validConversions:
                  isNil(weekly) ?? isEmpty(weekly)
                    ? 0
                    : weekly[0].validConversionCnt,
              },
        monthly: monthly.map(v => {
          return {
            targetYear: v.targetYear,
            month: v.targetMonth.toString(),
            exposure: v.exposureCnt,
            validClicks: v.validClickCnt,
            validConversions: v.validConversionCnt,
          };
        }),
      };

      res.json({
        ...ibDefs.SUCCESS,
        IBparams: result,
      });
    } catch (err) {
      if (err instanceof IBError) {
        if (err.type === 'INVALIDPARAMS') {
          console.error(err);
          res.status(400).json({
            ...ibDefs.INVALIDPARAMS,
            IBdetail: (err as Error).message,
            IBparams: {} as object,
          });
          return;
        }
        if (err.type === 'NOTEXISTDATA') {
          console.error(err);
          res.status(404).json({
            ...ibDefs.NOTEXISTDATA,
            IBdetail: (err as Error).message,
            IBparams: {} as object,
          });
          return;
        }
      }

      throw err;
    }
  },
);

export type ApproveAdPlaceDraftRequestType = {
  adPlaceDraftId: string;
};
export type ApproveAdPlaceDraftSuccessResType = AdPlace & {
  mainPhoto: IBPhotos;
  photos: IBPhotos[];
  tourPlace: TourPlace & {
    ibTravelTag: IBTravelTag[];
    photos: IBPhotos[];
    shareTripMemory: ShareTripMemory[];
  };
};
export type ApproveAdPlaceResType = Omit<IBResFormat, 'IBparams'> & {
  IBparams: ApproveAdPlaceDraftSuccessResType | {};
};

/**
 * 광고주 사업자가 신청한 AdPlaceDraft를 idealbloom이 승인하는 api.
 * 정보수정을 요청해도 approveAdPlaceDraft를 요청해야 한다.
 * 승인하는 과정에서 adPlace와 대응하는 mainTourPlace가 생성된다. 기 존재한다면 adPlace를 업데이트 하는것일텐데 업데이트하려는 draft 정보에 맞춰 tourPlace 정보가 update 된다.
 * 승인하려는 draft 상태가 staging 상태여야한다.
 */
export const approveAdPlaceDraft = asyncWrapper(
  async (
    req: Express.IBTypedReqBody<ApproveAdPlaceDraftRequestType>,
    res: Express.IBTypedResponse<ApproveAdPlaceResType>,
  ) => {
    try {
      const { locals } = req;
      const userTokenId = (() => {
        if (!isNil(locals) && locals.grade === 'member' && locals.user?.admin)
          return locals?.user?.userTokenId;
        // return locals?.tokenId;
        throw new IBError({
          type: 'NOTAUTHORIZED',
          message: 'admin member 등급만 접근 가능합니다.',
        });
      })();
      if (!userTokenId) {
        throw new IBError({
          type: 'NOTEXISTDATA',
          message: '정상적으로 부여된 userTokenId를 가지고 있지 않습니다.',
        });
      }

      const { adPlaceDraftId } = req.body;

      if (
        isNil(adPlaceDraftId) ||
        isEmpty(adPlaceDraftId) ||
        isNaN(Number(adPlaceDraftId))
      ) {
        throw new IBError({
          type: 'INVALIDPARAMS',
          message: 'adPlaceDraftId나 파라미터는 반드시 제공되어야 합니다.',
        });
      }

      const adPlaceDraft = await prisma.adPlaceDraft.findUnique({
        where: {
          id: Number(adPlaceDraftId),
        },
        include: {
          photos: true,
          category: {
            include: {
              related: {
                include: {
                  from: true,
                  to: true,
                },
              },
              noPtr: {
                include: {
                  from: true,
                  to: true,
                },
              },
            },
          },
          adPlace: {
            select: {
              id: true,
              photos: true,
              mainPhotoId: true,
            },
          },
        },
      });

      if (
        isNil(adPlaceDraft) ||
        isEmpty(adPlaceDraft) ||
        adPlaceDraft.status !== 'STAGING'
      ) {
        throw new IBError({
          type: 'NOTEXISTDATA',
          message:
            'adPlaceDraftId에 해당하는 STAGING 상태의 adPlaceDraft가 존재하지 않습니다.',
        });
      }

      const geoCode = await addrToGeoCode(
        !isNil(adPlaceDraft.address) && !isEmpty(adPlaceDraft.address)
          ? {
              address: adPlaceDraft.address,
              type: 'parcel',
            }
          : {
              address: adPlaceDraft.roadAddress!,
              type: 'road',
            },
      );

      if (isNil(geoCode) || isEmpty(geoCode)) {
        throw new IBError({
          type: 'EXTERNALAPI',
          message:
            'addrToGeoCode api 수행중 문제가 발생했습니다.(유효하지 않은 address 혹은 외부 api 문제입니다.)',
        });
      }

      const result = await prisma.$transaction(async tx => {
        const tpUpsertData = {
          title: adPlaceDraft.title,
          status: 'IN_USE' as DataStageStatus,
          tourPlaceType: ibTravelTagToTourPlaceType({
            tag: adPlaceDraft.category[0],
            subject: 'ADPLACE',
          }),
          photos: {
            set: [], /// 기존연결 모두 제거, Draft 연결로 모두 덮어씀
            connect: [
              { id: adPlaceDraft.mainPhotoId }, /// mainPhoto를 제일 앞으로
              ...adPlaceDraft.photos.map(v => {
                return {
                  id: v.id,
                };
              }),
            ],
          },
          lat: geoCode?.lat,
          lng: geoCode?.lng,
          regionCode1: geoCode.regionCode1,
          regionCode2: geoCode.regionCode2,
          desc: adPlaceDraft.desc,
          address: adPlaceDraft.address,
          roadAddress: adPlaceDraft.roadAddress,
          detailAddress: adPlaceDraft.detailAddress,
          openWeek: adPlaceDraft.openWeek,
          contact: adPlaceDraft.contact,
          AdPlaceDraft: {
            connect: {
              id: Number(adPlaceDraftId),
            },
          },

          /// nationalCode: '82'
        };

        const mainTourPlace = await tx.tourPlace.upsert({
          where: {
            id: adPlaceDraft.mainTourPlaceId ?? -1,
          },
          update: { ...omit(tpUpsertData, 'AdPlaceDraft') },
          create: {
            ...tpUpsertData,
            photos: {
              ...omit(tpUpsertData.photos, 'set'),
            },
          },
        });

        const adPlaceDraftRes = await tx.adPlaceDraft.update({
          where: {
            id: Number(adPlaceDraftId),
          },
          data: {
            status: 'APPLIED' as AdPlaceDraftStatus, /// 'IN_USE' 상태로 바로 전환하는것은 임시코드이다. 'APPROVED' 단계를 거쳐 batch 스크립트등을 통해 'IN_USE' 상태로 전환하는것을 원칙으로 한다.
            mainTourPlaceId: mainTourPlace.id,
            tourPlace: {
              connect: {
                id: mainTourPlace.id,
              },
            },
          },
          include: {
            mainPhoto: true,
            photos: true,
            tourPlace: {
              include: {
                ibTravelTag: true,
                photos: true,
                shareTripMemory: true,
              },
            },
            category: true,
            adPlace: true,
          },
        });

        const adPlaceRes = await (async () => {
          const adPlaceUpsertData = {
            status: 'IN_USE' as AdPlaceStatus, /// 'IN_USE' 상태로 바로 전환하는것은 임시코드이다. 'APPROVED' 단계를 거쳐 batch 스크립트등을 통해 'IN_USE' 상태로 전환하는것을 원칙으로 한다.
            title: adPlaceDraftRes.title,
            mainTourPlaceId: mainTourPlace.id,
            tourPlace: {
              set: [], /// 기존 연결 모두 끊고 draft 연결로 덮어씀
              connect: {
                id: mainTourPlace.id,
              },
            },
            mainPhoto: {
              connect: {
                id: adPlaceDraftRes.mainPhotoId,
              },
            },
            photos: {
              set: [], /// 기존 연결 모두 끊고 draft 연결로 덮어씀
              connect: [
                // { id: adPlaceDraftRes.mainPhotoId }, /// mainPhoto를 제일 앞으로
                ...adPlaceDraftRes.photos.map(v => {
                  return {
                    id: v.id,
                  };
                }),
              ],
            },
            category: {
              set: [], /// 기존 연결 모두 끊고 draft 연결로 덮어씀
              connect: [
                ...adPlaceDraftRes.category.map(v => {
                  return {
                    id: v.id,
                  };
                }),
              ],
            },
            desc: adPlaceDraftRes.desc,
            address: adPlaceDraftRes.address,
            roadAddress: adPlaceDraftRes.roadAddress,
            detailAddress: adPlaceDraftRes.detailAddress,
            openWeek: adPlaceDraftRes.openWeek,
            closedDay: adPlaceDraftRes.closedDay,
            contact: adPlaceDraftRes.contact,
            siteUrl: adPlaceDraftRes.siteUrl,
            businessNumber: adPlaceDraftRes.businessNumber,
            businessRegImgKey: adPlaceDraftRes.businessRegImgKey,
            nationalCode: adPlaceDraftRes.nationalCode,
            user: {
              connect: {
                id: adPlaceDraftRes.userId,
              },
            },
            AdPlaceDraft: {
              connect: {
                id: adPlaceDraftRes.id,
              },
            },
          };

          const adPlace = await tx.adPlace.upsert({
            where: {
              id: adPlaceDraftRes.adPlaceId ?? -1,
            },
            update: {
              ...adPlaceUpsertData,
            },
            create: {
              ...adPlaceUpsertData,
              tourPlace: {
                ...omit(adPlaceUpsertData.tourPlace, 'set'),
              },
              photos: {
                ...omit(adPlaceUpsertData.photos, 'set'),
              },
              category: {
                ...omit(adPlaceUpsertData.category, 'set'),
              },
            },
            include: {
              mainPhoto: true,
              photos: true,
              tourPlace: {
                include: {
                  ibTravelTag: true,
                  photos: true,
                  shareTripMemory: true,
                },
              },
              category: true,
            },
          });

          return adPlace;
        })();

        return adPlaceRes;
      });

      if (!isNil(adPlaceDraft.adPlace)) {
        const ctx: IBContext = {
          userTokenId,
          admin: true,
        };
        await delAdPlacePhoto(
          {
            adPlaceId: adPlaceDraft.adPlace.id.toString(),
            delPhotoListFromDB: adPlaceDraft.adPlace.photos.map(v =>
              v.id.toString(),
            ),
            delPhotoListFromS3: adPlaceDraft.adPlace.photos
              .filter(oldPhoto => {
                return isNil(
                  adPlaceDraft.photos.find(
                    newPhoto => newPhoto.key === oldPhoto.key,
                  ),
                );
              })
              .map(v => v.id.toString()),
          },
          ctx,
        );
      }

      res.json({
        ...ibDefs.SUCCESS,
        IBparams: await (async () => {
          return {
            ...result,
            mainPhoto: await getIBPhotoUrl(result.mainPhoto),
            photos: isNil(result.photos)
              ? null
              : await Promise.all(result.photos.map(getIBPhotoUrl)),
            tourPlace: await Promise.all(
              result.tourPlace.map(async v => {
                return {
                  ...v,
                  photos: isNil(v.photos)
                    ? null
                    : await Promise.all(v.photos.map(getIBPhotoUrl)),
                };
              }),
            ),
          };
        })(),
      });
    } catch (err) {
      if (err instanceof IBError) {
        if (err.type === 'INVALIDPARAMS') {
          console.error(err);
          res.status(400).json({
            ...ibDefs.INVALIDPARAMS,
            IBdetail: (err as Error).message,
            IBparams: {} as object,
          });
          return;
        }
        if (err.type === 'INVALIDSTATUS') {
          console.error(err);
          res.status(400).json({
            ...ibDefs.INVALIDSTATUS,
            IBdetail: (err as Error).message,
            IBparams: {} as object,
          });
          return;
        }
        if (err.type === 'NOTEXISTDATA') {
          console.error(err);
          res.status(404).json({
            ...ibDefs.NOTEXISTDATA,
            IBdetail: (err as Error).message,
            IBparams: {} as object,
          });
          return;
        }
        if (err.type === 'EXTERNALAPI') {
          console.error(err);
          res.status(500).json({
            ...ibDefs.EXTERNALAPI,
            IBdetail: (err as Error).message,
            IBparams: {} as object,
          });
          return;
        }
      }

      throw err;
    }
  },
);

type GoogleInAppPurchaseReceipt = {
  orderId: string; /// ex) google: GPA.3362-9672-9861-44566,
  packageName: string; /// ex) google: com.io.idealbloom.brip,
  productId: string; ///  ex) google: brip_business_subscribe
  purchaseTime: string; /// ex) google: 1694760310759
  purchaseState: string; /// ex) 0
  purchaseToken: string; /// ex google: eilgmemiflcnncbdbpkhjphj.AO-J1OwOO0bFvRUp8ryNSBLgVP0hQn1TgOoWirUrMDCKoGWTFy0jkVZomMpO6sSH9u7bRDk3Vmj_HKANZzTF6RybSPVWKjUBUodni-qM2ZKN-VnTq0omCf0
  quantity: string; /// ex) 1
  autoRenewing: string; /// ex) true
  acknowledged: string; /// ex) false
};
export type GoogleSubscribeAdPlaceRequestType = {
  adPlaceId: string;
  receipt: GoogleInAppPurchaseReceipt;
};
export type GoogleSubscribeAdPlaceSuccessResType = GoogleInAppPurchaseLog & {
  adPlace: AdPlace;
};
export type GoogleSubscribeAdPlaceResType = Omit<IBResFormat, 'IBparams'> & {
  IBparams: GoogleSubscribeAdPlaceSuccessResType | {};
};

/**
 * 구글 인앱 결제후 결제내역 저장과 함께 adPlce 구독 요청 api
 */
export const googleSubscribeAdPlace = asyncWrapper(
  async (
    req: Express.IBTypedReqBody<GoogleSubscribeAdPlaceRequestType>,
    res: Express.IBTypedResponse<GoogleSubscribeAdPlaceResType>,
  ) => {
    try {
      const { locals } = req;
      const { userTokenId, userId } = (() => {
        if (locals && locals?.grade === 'member') {
          return {
            userTokenId: locals?.user?.userTokenId,
            userId: locals?.user?.id,
          };
          // return locals?.tokenId;
        }

        throw new IBError({
          type: 'NOTAUTHORIZED',
          message: 'member 등급만 접근 가능합니다.',
        });
      })();
      if (isNil(userTokenId)) {
        throw new IBError({
          type: 'NOTEXISTDATA',
          message: '정상적으로 부여된 userTokenId를 가지고 있지 않습니다.',
        });
      }

      console.log(`\n\n[googleAdPlace]:`, req.body);
      const { adPlaceId, receipt } = req.body;
      if (
        isNil(adPlaceId) ||
        isEmpty(adPlaceId) ||
        isNaN(Number(adPlaceId)) ||
        isNil(receipt) ||
        isEmpty(receipt)
      ) {
        throw new IBError({
          type: 'INVALIDPARAMS',
          message:
            'adPlaceId와(number 형태 string) receipt 파라미터는 필수 파라미터입니다.',
        });
      }

      const {
        orderId,
        // packageName,
        // productId,
        purchaseState,
        purchaseTime,
        purchaseToken,
        quantity,
        autoRenewing,
        acknowledged,
      } = receipt;

      const adPlace = await prisma.adPlace.findUnique({
        where: {
          id: Number(adPlaceId),
        },
        select: {
          userId: true,
          status: true,
        },
      });

      if (adPlace?.userId !== userId) {
        throw new IBError({
          type: 'NOTAUTHORIZED',
          message:
            'adPlace 소유주 권한이 아니므로 subscribe 신청을 할수 없는 adPlaceId입니다.',
        });
      }

      if (adPlace?.status !== ('IN_USE' as AdPlaceStatus)) {
        throw new IBError({
          type: 'NOTAUTHORIZED',
          message:
            'adPlace 상태가 사용가능한 상태가 아니여서 subscribe 신청을 할수 없는 adPlaceId입니다.',
        });
      }

      const validationResult = await validateSubscriptionReceipt({
        purchaseToken,
      });

      if (
        moment().diff(moment(Number(validationResult.expiryTimeMillis))) >= 0
      ) {
        /// expired
        throw new IBError({
          type: 'EXPIREDDATA',
          message: '만료기일이 지난 purchaseToken입니다.',
        });
      }

      const purchaseLog = await prisma.$transaction(
        async (
          tx,
        ): Promise<
          GoogleInAppPurchaseLog & {
            adPlace: AdPlace;
          }
        > => {
          const log = await tx.googleInAppPurchaseLog.create({
            data: {
              startTime: Math.ceil(
                Number(validationResult.startTimeMillis) / 1000,
              ),
              // expiryTime: Math.ceil(
              //   Number(validationResult.expiryTimeMillis) / 1000,
              // ),
              expireDateFormat: new Date(
                Number(validationResult.expiryTimeMillis),
              ).toISOString(),
              orderId,
              // packageName,
              // productId,
              purchaseTime,
              purchaseState: Number(purchaseState),
              purchaseToken,
              quantity: Number(quantity),
              autoRenewing: autoRenewing === 'true',
              acknowledged: acknowledged === 'true',
              adPlace: {
                connect: {
                  id: Number(adPlaceId),
                },
              },
            },
          });

          const adP = await tx.adPlace.update({
            where: {
              id: Number(adPlaceId),
            },
            data: {
              subscribe: true,
            },
          });

          const result = {
            ...log,
            adPlace: adP,
          };
          return result;
        },
      );

      res.json({
        ...ibDefs.SUCCESS,
        IBparams: purchaseLog,
      });
    } catch (err) {
      if (err instanceof IBError) {
        if (err.type === 'INVALIDPARAMS') {
          console.error(err);
          res.status(400).json({
            ...ibDefs.INVALIDPARAMS,
            IBdetail: (err as Error).message,
            IBparams: {} as object,
          });
          return;
        }

        if (err.type === 'NOTEXISTDATA') {
          console.error(err);
          res.status(404).json({
            ...ibDefs.NOTEXISTDATA,
            IBdetail: (err as Error).message,
            IBparams: {} as object,
          });
          return;
        }

        if (err.type === 'NOTAUTHORIZED') {
          console.error(err);
          res.status(404).json({
            ...ibDefs.NOTAUTHORIZED,
            IBdetail: (err as Error).message,
            IBparams: {} as object,
          });
          return;
        }
      }

      throw err;
    }
  },
);

type AppleInAppPurchaseReceipt = {
  originalTransactionDateIOS: string; /// ex) 1695021683000;
  originalTransactionIdentifierIOS: string; /// ex) '2000000415594125';
  productId: string; /// ex) 'brip.adplace.subscribe.default';
  transactionDate: string; /// ex) '1695096993000';
  transactionId: string; /// ex) '2000000416416016';
};
export type AppleSubscribeAdPlaceRequestType = AppleInAppPurchaseReceipt & {
  adPlaceId: string;
};
export type AppleSubscribeAdPlaceSuccessResType = AppleInAppPurchaseLog & {
  adPlace: AdPlace;
};
export type AppleSubscribeAdPlaceResType = Omit<IBResFormat, 'IBparams'> & {
  IBparams: AppleSubscribeAdPlaceSuccessResType | {};
};

/**
 * transactionId에 해당하는 HookLog와 AppleInAppPurchaseLog를 연결해주는 함수
 * @param params
 */
const connectApplePurchaseLogAndHookLog = async (params: {
  tx: Partial<PrismaClient>;
  // transactionId: string;
  originalTransactionId: string;
  appleInAppPurchaseLogId: number;
}) => {
  const { tx, appleInAppPurchaseLogId, originalTransactionId } = params;
  /// 이하 hookLog와 appleInAppPurchaseLog 연결과정
  const appleHookLogs = await tx.appleInAppPurchaseAutoHookLog!.findMany({
    where: {
      // TItransactionId: transactionId,
      TIoriginalTransactionId: originalTransactionId,
      NOT: { appleInAppPurchaseLogId: null },
    },
    select: {
      id: true,
    },
  });

  /// brip 앱에서 호출하는 /adPlace/appleSubscribeAdPlace api 보다 apple 서버에서 hook으로 호출하는 /adPlace/appleSubscriptionHook가 먼저 호출될 경우 AppleInAppPurchase 데이터가 생성되어있지 않았기 때문에 appleSubscriptionHook 호출시점에는 AppleInAppPurchaseAutoHookLog와 AppleInAppPurchase 테이블간 관계를 형성하지 못했기 때문에 관계를 형성해준다.
  if (!isEmpty(appleHookLogs)) {
    await tx.appleInAppPurchaseAutoHookLog!.updateMany({
      where: {
        id: {
          in: appleHookLogs.map(v => v.id),
        },
      },
      data: {
        appleInAppPurchaseLogId,
      },
    });
  }
};

/**
 * 애플 인앱 결제후 adPlce 구독 요청 api
 */
export const appleSubscribeAdPlace = asyncWrapper(
  async (
    req: Express.IBTypedReqBody<AppleSubscribeAdPlaceRequestType>,
    res: Express.IBTypedResponse<AppleSubscribeAdPlaceResType>,
  ) => {
    try {
      const { locals } = req;
      const { userTokenId, userId } = (() => {
        if (locals && locals?.grade === 'member') {
          return {
            userTokenId: locals?.user?.userTokenId,
            userId: locals?.user?.id,
          };
          // return locals?.tokenId;
        }

        throw new IBError({
          type: 'NOTAUTHORIZED',
          message: 'member 등급만 접근 가능합니다.',
        });
      })();
      if (isNil(userTokenId)) {
        throw new IBError({
          type: 'NOTEXISTDATA',
          message: '정상적으로 부여된 userTokenId를 가지고 있지 않습니다.',
        });
      }

      const {
        adPlaceId,
        originalTransactionIdentifierIOS,
        originalTransactionDateIOS,
        productId,
        transactionDate,
        transactionId,
      } = req.body;
      if (
        isNil(adPlaceId) ||
        isEmpty(adPlaceId) ||
        isNaN(Number(adPlaceId)) ||
        isNil(transactionId) ||
        isEmpty(transactionId)
      ) {
        throw new IBError({
          type: 'INVALIDPARAMS',
          message:
            'adPlaceId와(number 형태 string) transactionId 파라미터는 필수 파라미터입니다.',
        });
      }

      console.log(`[appleSubsAdPlace]: `, req.body);
      const adPlace = await prisma.adPlace.findUnique({
        where: {
          id: Number(adPlaceId),
        },
        select: {
          userId: true,
          status: true,
        },
      });

      if (adPlace?.userId !== userId) {
        throw new IBError({
          type: 'NOTAUTHORIZED',
          message:
            'adPlace 소유주 권한이 아니므로 subscribe 신청을 할수 없는 adPlaceId입니다.',
        });
      }

      if (adPlace?.status !== ('IN_USE' as AdPlaceStatus)) {
        throw new IBError({
          type: 'NOTAUTHORIZED',
          message:
            'adPlace 상태가 사용가능한 상태가 아니여서 subscribe 신청을 할수 없는 adPlaceId입니다.',
        });
      }

      const alreadyExistLog = await prisma.appleInAppPurchaseLog.findUnique({
        where: {
          originalTransactionId: originalTransactionIdentifierIOS,
        },
      });

      // const { transactionInfo } = await retrieveLastSubscriptionReceipt(
      //   originalTransactionIdentifierIOS,
      // );

      // if (transactionInfo.transactionId !== transactionId) {
      //   throw new IBError({
      //     type: 'INVALIDSTATUS',
      //     message:
      //       'apple 서버에 해당 originalTranssactionId와 transactionId로 결제 내역이 조회되지 않습니다.',
      //   });
      // }
      const { history } = await retrieveReceiptHistory(
        originalTransactionIdentifierIOS,
      );

      const transactionInfo = history.find(
        v => v.transactionId === transactionId,
      );

      if (isNil(transactionInfo)) {
        throw new IBError({
          type: 'INVALIDSTATUS',
          message:
            'apple 서버에 해당 originalTranssactionId와 transactionId로 결제 내역이 조회되지 않습니다.',
        });
      }

      const purchaseLog = await prisma.$transaction(
        async (
          tx,
        ): Promise<
          AppleInAppPurchaseLog & {
            adPlace: AdPlace;
          }
        > => {
          const log = await (async () => {
            if (!isNil(alreadyExistLog)) {
              await connectApplePurchaseLogAndHookLog({
                tx,
                // transactionId: transactionInfo.transactionId!,
                originalTransactionId: transactionInfo.originalTransactionId!,
                appleInAppPurchaseLogId: alreadyExistLog.id,
              });
              return alreadyExistLog;
            }

            const createdLog = await tx.appleInAppPurchaseLog.create({
              data: {
                originalTransactionDate: Math.ceil(
                  Number(originalTransactionDateIOS) / 1000,
                ),
                originalTransactionId: originalTransactionIdentifierIOS,
                productId,
                transactionDate: Math.ceil(Number(transactionDate) / 1000),
                transactionId,
                // expiresDate: Math.ceil(
                //   Number(transactionInfo.expiresDate) / 1000,
                // ),
                expireDateFormat: new Date(
                  Number(transactionInfo.expiresDate),
                ).toISOString(),
                adPlace: {
                  connect: {
                    id: Number(adPlaceId),
                  },
                },
              },
            });

            await connectApplePurchaseLogAndHookLog({
              tx,
              originalTransactionId: transactionInfo.originalTransactionId!,
              appleInAppPurchaseLogId: createdLog.id,
            });
            return createdLog;
          })();

          const adP = await tx.adPlace.update({
            where: {
              id: Number(adPlaceId),
            },
            data: {
              subscribe: moment().diff(moment(transactionInfo.expiresDate)) < 0,
              // subscribe: true,
            },
          });

          const result = {
            ...log,
            adPlace: adP,
          };
          return result;
        },
      );

      res.json({
        ...ibDefs.SUCCESS,
        IBparams: purchaseLog,
      });
    } catch (err) {
      if (err instanceof IBError) {
        if (err.type === 'INVALIDPARAMS') {
          console.error(err);
          res.status(400).json({
            ...ibDefs.INVALIDPARAMS,
            IBdetail: (err as Error).message,
            IBparams: {} as object,
          });
          return;
        }

        if (err.type === 'NOTEXISTDATA') {
          console.error(err);
          res.status(404).json({
            ...ibDefs.NOTEXISTDATA,
            IBdetail: (err as Error).message,
            IBparams: {} as object,
          });
          return;
        }

        if (err.type === 'NOTAUTHORIZED') {
          console.error(err);
          res.status(404).json({
            ...ibDefs.NOTAUTHORIZED,
            IBdetail: (err as Error).message,
            IBparams: {} as object,
          });
          return;
        }

        if (err.type === 'DUPLICATEDDATA') {
          console.error(err);
          res.status(409).json({
            ...ibDefs.DUPLICATEDDATA,
            IBdetail: (err as Error).message,
            IBparams: {} as object,
          });
          return;
        }
      }

      throw err;
    }
  },
);

adPlaceRouter.post('/appleSubscriptionHook', appleSubscriptionHook);
adPlaceRouter.post('/googleSubscriptionHook', googleSubscriptionHook);
adPlaceRouter.get('/getAdPlace', accessTokenValidCheck, getAdPlace);
// adPlaceRouter.post('/approveAdPlace', accessTokenValidCheck, approveAdPlace);
adPlaceRouter.get(
  '/getMyAdPlaceDraft',
  accessTokenValidCheck,
  getMyAdPlaceDraft,
);
adPlaceRouter.post(
  '/approveAdPlaceDraft',
  accessTokenValidCheck,
  approveAdPlaceDraft,
);
adPlaceRouter.get(
  '/getAdPlaceStatistics',
  accessTokenValidCheck,
  getAdPlaceStatistics,
);
adPlaceRouter.post(
  '/googleSubscribeAdPlace',
  accessTokenValidCheck,
  googleSubscribeAdPlace,
);
adPlaceRouter.post(
  '/appleSubscribeAdPlace',
  accessTokenValidCheck,
  appleSubscribeAdPlace,
);

export default adPlaceRouter;
