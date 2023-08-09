import fbAdmin from '@src/firebase';
import prisma from '@src/prisma';
import redis from '@src/redis';
import { isNil, isEmpty } from 'lodash';
import { IBError } from './IBDefinitions';

export const sendAppPush = async (params: {
  fcmDeviceToken: string[];
  message: string;
}): Promise<void> => {
  try {
    const { fcmDeviceToken, message } = params;

    await fbAdmin.messaging().sendEach(
      fcmDeviceToken.map(token => {
        return {
          notification: {
            // title: 'test',
            body: message,
          },
          token,
        };
      }),
    );

    // const message: fbAdmin.messaging.Message = {
    //   notification: {
    //     title: '시범 데이터 발송',
    //     body: '클라우드 메시지 전송이 잘 되는지 확인하기 위한, 메시지 입니다.',
    //   },
    //   token: fcmDeviceToken,
    // };

    // await fbAdmin.messaging().send(message);
  } catch (err) {
    throw new IBError({
      type: 'EXTERNALAPI',
      message: `앱 Push 중 문제가 발생했습니다. \n\n ${(err as Error).message}`,
    });
  }
};

type CustomerUserInfoType = {
  id: number;
  userFCMToken: {
    token: string;
  }[];
  nickName?: string;
  email?: string;
} | null;

type CompanyUserInfoType = {
  id: number;
  userFCMToken: {
    token: string;
  }[];
} | null;
const getUserInfoFromCacheNDB = async <T>(userId: string): Promise<T> => {
  const cachedCustomerInfo = await redis.get(`userInfo:${userId}`);
  if (!isNil(cachedCustomerInfo) && !isEmpty(cachedCustomerInfo)) {
    return JSON.parse(cachedCustomerInfo) as T;
  }

  const dbUserInfo = await prisma.user.findUnique({
    where: {
      id: Number(userId),
    },
    select: {
      id: true,
      userFCMToken: {
        select: {
          token: true,
        },
      },
    },
  });

  await redis.set(`userInfo:${userId}`, JSON.stringify(dbUserInfo));
  return dbUserInfo as T;
};

type AdPlaceInfoType = {
  id: number;
  title: string;
} | null;

const getAdPlaceInfoFromCacheNDB = async (
  adPlaceId: string,
): Promise<AdPlaceInfoType> => {
  const cachedCustomerInfo = await redis.get(`adPlaceInfo:${adPlaceId}`);
  if (!isNil(cachedCustomerInfo) && !isEmpty(cachedCustomerInfo)) {
    return JSON.parse(cachedCustomerInfo) as AdPlaceInfoType;
  }

  const dbAdPlaceInfo = await prisma.adPlace.findUnique({
    where: {
      id: Number(adPlaceId),
    },
    select: {
      id: true,
      title: true,
    },
  });

  await redis.set(`adPlaceInfo:${adPlaceId}`, JSON.stringify(dbAdPlaceInfo));
  return dbAdPlaceInfo;
};

/// 예약문의 관련 메시지 앱 push 중 고객측으로 보내는 함수. 고객이 여러 디바이스를 연결했다면 연결한 디바이스 모두에 메시지를 보낸다.
export const sendAppPushToBookingCustomer = async (params: {
  /// BookingChatMessageType fields..
  message: string;
  customerId: string;
  adPlaceId: string;
}): Promise<void> => {
  try {
    const { customerId, message, adPlaceId } = params;

    const customerUser = await getUserInfoFromCacheNDB<CustomerUserInfoType>(
      customerId,
    );

    const adPlace = await getAdPlaceInfoFromCacheNDB(adPlaceId);

    const allPropTypeToString = (
      data: Parameters<typeof sendAppPushToBookingCustomer>,
    ) => {
      return Object.fromEntries(
        new Map(
          Object.entries(data).map(([key, value]) => {
            return [key, value.toString()];
          }),
        ),
      );
    };

    if (
      !isNil(customerUser) &&
      !isNil(adPlace) &&
      !isNil(customerUser.userFCMToken) &&
      !isEmpty(customerUser.userFCMToken)
    ) {
      await fbAdmin.messaging().sendEach(
        customerUser.userFCMToken.map(v => {
          const { token } = v;
          return {
            data: {
              serializedData: JSON.stringify(allPropTypeToString([params])),
            },
            notification: {
              title: adPlace.title,
              body: message,
            },
            token,
          };
        }),
      );
    }
  } catch (err) {
    throw new IBError({
      type: 'EXTERNALAPI',
      message: `앱 Push 중 문제가 발생했습니다. \n\n ${(err as Error).message}`,
    });
  }
};

/// 예약문의 관련 메시지 앱 push 중 사업자측으로 보내는 함수. 사업자가 여러 디바이스를 연결했다면 연결한 디바이스 모두에 메시지를 보낸다.
export const sendAppPushToBookingCompany = async (params: {
  /// BookingChatMessageType fields..
  message: string;
  customerId: string;
  companyId: string;
  adPlaceId: string;
}): Promise<void> => {
  try {
    const { customerId, companyId, message, adPlaceId } = params;
    // const customerUser = await prisma.user.findUnique({
    //   where: {
    //     id: Number(customerId),
    //   },
    //   select: {
    //     id: true,
    //     nickName: true,
    //     email: true,
    //   },
    // });
    // const companyUser = await prisma.user.findUnique({
    //   where: {
    //     id: Number(companyId),
    //   },
    //   select: {
    //     id: true,
    //     userFCMToken: {
    //       select: {
    //         token: true,
    //       },
    //     },
    //   },
    // });
    // const adPlace = await prisma.adPlace.findUnique({
    //   where: {
    //     id: Number(adPlaceId),
    //   },
    //   select: {
    //     id: true,
    //     title: true,
    //   },
    // });

    const customerUser = await getUserInfoFromCacheNDB<CustomerUserInfoType>(
      customerId,
    );
    const companyUser = await getUserInfoFromCacheNDB<CompanyUserInfoType>(
      companyId,
    );
    const adPlace = await getAdPlaceInfoFromCacheNDB(adPlaceId);

    const allPropTypeToString = (
      data: Parameters<typeof sendAppPushToBookingCompany>,
    ) => {
      return Object.fromEntries(
        new Map(
          Object.entries(data).map(([key, value]) => {
            return [key, value.toString()];
          }),
        ),
      );
    };

    if (
      !isNil(customerUser) &&
      !isNil(companyUser) &&
      !isNil(companyUser.userFCMToken) &&
      !isEmpty(companyUser.userFCMToken) &&
      !isNil(adPlace)
    ) {
      await fbAdmin.messaging().sendEach(
        companyUser.userFCMToken.map(v => {
          const { token } = v;
          return {
            data: {
              serializedData: JSON.stringify(allPropTypeToString([params])),
            },
            notification: {
              title: customerUser.nickName,
              body: message,
            },
            token,
          };
        }),
      );
    }
  } catch (err) {
    throw new IBError({
      type: 'EXTERNALAPI',
      message: `앱 Push 중 문제가 발생했습니다. \n\n ${(err as Error).message}`,
    });
  }
};

type ToUserInfoType = {
  id: number;
  userFCMToken: {
    token: string;
  }[];
  nickName?: string;
  email?: string;
} | null;

/// 알림(noti) 메시지 App Push
export const sendNotiMsgAppPush = async (params: {
  /// BookingChatMessageType fields..
  message: string;
  userId: string;
}): Promise<void> => {
  try {
    const { message, userId } = params;

    const toUser = await getUserInfoFromCacheNDB<ToUserInfoType>(userId);

    const allPropTypeToString = (
      data: Parameters<typeof sendNotiMsgAppPush>,
    ) => {
      return Object.fromEntries(
        new Map(
          Object.entries(data).map(([key, value]) => {
            return [key, value.toString()];
          }),
        ),
      );
    };

    if (
      !isNil(toUser) &&
      !isNil(toUser.userFCMToken) &&
      !isEmpty(toUser.userFCMToken)
    ) {
      await fbAdmin.messaging().sendEach(
        toUser.userFCMToken.map(v => {
          const { token } = v;
          return {
            data: {
              serializedData: JSON.stringify(allPropTypeToString([params])),
            },
            notification: {
              title: 'brip 시스템 알림',
              body: message,
            },
            token,
          };
        }),
      );
    }
  } catch (err) {
    throw new IBError({
      type: 'EXTERNALAPI',
      message: `앱 Push 중 문제가 발생했습니다. \n\n ${(err as Error).message}`,
    });
  }
};
