import fbAdmin from '@src/firebase';
import prisma from '@src/prisma';
import redis from '@src/redis';
import {
  BookingChatMessageType,
  BookingActionInputParam,
  BookingChatMessageActionType,
} from '@src/routes/noti/types';
import { isNil, isEmpty } from 'lodash';
// import flatted from 'flatted';
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
    sysNotiPushAlarm: boolean;
    bookingChatPushAlarm: boolean;
  }[];
  nickName: string;
  // email: string;
  // profileImg: string;
  // phone: string;
} | null;

type CompanyUserInfoType = {
  id: number;
  userFCMToken: {
    token: string;
    sysNotiPushAlarm: boolean;
    bookingChatPushAlarm: boolean;
  }[];
  nickName: string;
  // email: string;
  // profileImg: string;
  // phone: string;
} | null;
const getUserInfoFromCacheNDB = async <
  T extends CustomerUserInfoType | CompanyUserInfoType | ToUserInfoType,
>(
  userId: string,
): Promise<T> => {
  const cachedCustomerInfo = await redis.get(`userInfo:${userId}`);
  if (!isNil(cachedCustomerInfo) && !isEmpty(cachedCustomerInfo)) {
    const cachedObj = JSON.parse(cachedCustomerInfo) as T;
    const { id, nickName, userFCMToken } = cachedObj!;

    /// redis에 캐시되어 있던 데이터중 누락된것이 하나도 없어야 한다. 만약 하나라도 있으면 계속 아래로 진행하여 DB 조회를 다시해야하므로 return 을 하면 안된다..
    if (
      !isNil(id) &&
      !isEmpty(id) &&
      !isNil(nickName) &&
      !isEmpty(nickName) &&
      !isNil(userFCMToken) &&
      !isEmpty(userFCMToken) &&
      !isNil((cachedObj! as ToUserInfoType)!.email) &&
      !isEmpty((cachedObj! as ToUserInfoType)!.email) &&
      !userFCMToken.find(v => isNil(v.token) || isEmpty(v.token)) /// token이 비어있는게 하나도 없어야함.
    ) {
      return cachedObj;
    }
  }

  const dbUserInfo = await prisma.user.findUnique({
    where: {
      id: Number(userId),
    },
    select: {
      id: true,
      nickName: true,
      // email: true,
      // profileImg: true,
      // phone: true,
      userFCMToken: {
        select: {
          token: true,
          sysNotiPushAlarm: true,
          bookingChatPushAlarm: true,
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
    const cachedObj = JSON.parse(cachedCustomerInfo) as AdPlaceInfoType;
    const { id, title } = cachedObj!;

    /// redis에 캐시되어 있던 데이터중 누락된것이 하나도 없어야 한다. 만약 하나라도 있으면 계속 아래로 진행하여 DB 조회를 다시해야하므로 return 을 하면 안된다..
    if (!isNil(id) && !isEmpty(id) && !isNil(title) && !isEmpty(title)) {
      return cachedObj;
    }
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

type BookingAppPushMsgType = Partial<BookingChatMessageType> & {
  companyNickName?: string;
  customerNickName?: string;
  adPlaceTitle?: string;
  pushType: 'BOOKINGCHAT' | 'SYSTEMNOTI';
};

const allPropTypeToString = (data: BookingAppPushMsgType) => {
  return Object.keys(data).reduce((acc, key) => {
    const value = data[key] as
      | string
      | number
      | boolean
      | undefined
      | BookingActionInputParam
      | BookingChatMessageActionType;

    if (isNil(value)) return acc;
    if (key === 'bookingActionInputParams' && typeof value === 'object') {
      acc[key] = data[key];
      return acc;
    }
    acc[key] = value.toString();
    return acc;
  }, {});
  // return Object.fromEntries(
  //   new Map(
  //     Object.entries(data).map(([key, value]) => {
  //       if (key === 'bookingActionInputParams' && typeof value === 'object') {
  //         // const obj = value;
  //         // const objWithStringValue = Object.fromEntries(
  //         //   new Map(
  //         //     Object.entries(obj).map(([k, v]) => {
  //         //       if (!isNil(v)) {
  //         //         return [k, v.toString()];
  //         //       }
  //         //       return [k, 'null'];
  //         //     }),
  //         //   ),
  //         // );
  //         // return [key, JSON.stringify(objWithStringValue)];
  //         return [key, value]
  //       }

  //       return [key, value.toString()];
  //     }),
  //   ),
  // );
};

/// 예약문의 관련 메시지 앱 push 중 고객측으로 보내는 함수. 고객이 여러 디바이스를 연결했다면 연결한 디바이스 모두에 메시지를 보낸다.
export const sendAppPushToBookingCustomer = async (params: {
  /// BookingChatMessageType fields..
  message: string;
  customerId: string;
  companyId: string;
  adPlaceId: string;
}): Promise<void> => {
  // try {
  const { customerId, message, companyId, adPlaceId } = params;

  console.log('[sendAppPushToBookingCustomer]: ');
  const customerUser = await getUserInfoFromCacheNDB<CustomerUserInfoType>(
    customerId,
  );
  const companyUser = await getUserInfoFromCacheNDB<CompanyUserInfoType>(
    companyId,
  );
  const adPlace = await getAdPlaceInfoFromCacheNDB(adPlaceId);

  if (
    !isNil(adPlace) &&
    !isNil(companyUser) &&
    !isNil(customerUser) &&
    !isNil(customerUser.userFCMToken) &&
    !isEmpty(customerUser.userFCMToken)
  ) {
    const messageInfo: BookingAppPushMsgType = {
      ...params,
      companyNickName: companyUser.nickName,
      adPlaceTitle: adPlace.title,
      pushType: 'BOOKINGCHAT',
    };
    const result = await fbAdmin.messaging().sendEach(
      customerUser.userFCMToken.map(v => {
        const { token, bookingChatPushAlarm } = v;
        const r = {
          data: {
            // serializedData: flatted.stringify(messageInfo),
            serializedData: JSON.stringify(allPropTypeToString(messageInfo)),
          },
          ...(bookingChatPushAlarm && {
            notification: {
              title: adPlace.title,
              body: message,
            },
          }),
          android: {
            priority: 'high' as 'high',
          },
          apns: {
            payload: {
              aps: {
                contentAvailable: true,
              },
            },
            headers: {
              // 'apns-push-type': 'background',
              'apns-push-type': 'alert',
              'apns-priority': '10',
              'apns-topic': '', // your app bundle identifier
            },
          },
          token,
        };
        console.log(JSON.stringify(r, null, 2));
        return r;
      }),
    );
    console.log(JSON.stringify(result, null, 2), '\n\n');
  }
  // } catch (err) {
  //   throw new IBError({
  //     type: 'EXTERNALAPI',
  //     message: `앱 Push 중 문제가 발생했습니다. \n\n ${(err as Error).message}`,
  //   });
  // }
};

/// 예약문의 관련 메시지 앱 push 중 사업자측으로 보내는 함수. 사업자가 여러 디바이스를 연결했다면 연결한 디바이스 모두에 메시지를 보낸다.
export const sendAppPushToBookingCompany = async (params: {
  /// BookingChatMessageType fields..
  message: string;
  customerId: string;
  companyId: string;
  adPlaceId: string;
}): Promise<void> => {
  // try {
  const { customerId, companyId, message, adPlaceId } = params;

  console.log('[sendAppPushToBookingCompany]: ');
  const customerUser = await getUserInfoFromCacheNDB<CustomerUserInfoType>(
    customerId,
  );
  const companyUser = await getUserInfoFromCacheNDB<CompanyUserInfoType>(
    companyId,
  );
  const adPlace = await getAdPlaceInfoFromCacheNDB(adPlaceId);

  if (
    !isNil(customerUser) &&
    !isNil(companyUser) &&
    !isNil(companyUser.userFCMToken) &&
    !isEmpty(companyUser.userFCMToken) &&
    !isNil(adPlace)
  ) {
    const messageInfo: BookingAppPushMsgType = {
      ...params,
      customerNickName: customerUser.nickName,
      adPlaceTitle: adPlace.title,
      pushType: 'BOOKINGCHAT',
    };

    const result = await fbAdmin.messaging().sendEach(
      companyUser.userFCMToken.map(v => {
        const { token, bookingChatPushAlarm } = v;
        const r = {
          data: {
            // serializedData: flatted.stringify(messageInfo),
            serializedData: JSON.stringify(allPropTypeToString(messageInfo)),
          },
          ...(bookingChatPushAlarm && {
            notification: {
              title: customerUser.nickName,
              body: message,
            },
          }),

          android: {
            priority: 'high' as 'high',
          },
          apns: {
            payload: {
              aps: {
                contentAvailable: true,
              },
            },
            headers: {
              // 'apns-push-type': 'background',
              'apns-push-type': 'alert',
              'apns-priority': '10',
              'apns-topic': '', // your app bundle identifier
            },
          },
          token,
        };
        console.log(JSON.stringify(r, null, 2));
        return r;
      }),
    );
    console.log(JSON.stringify(result, null, 2), '\n\n');
  }
  // } catch (err) {
  //   throw new IBError({
  //     type: 'EXTERNALAPI',
  //     message: `앱 Push 중 문제가 발생했습니다. \n\n ${(err as Error).message}`,
  //   });
  // }
};

type ToUserInfoType = {
  id: number;
  userFCMToken: {
    token: string;
    sysNotiPushAlarm: boolean;
    bookingChatPushAlarm: boolean;
  }[];
  nickName: string;
  email: string;
} | null;

/// 알림(noti) 메시지 App Push
export const sendNotiMsgAppPush = async (params: {
  /// BookingChatMessageType fields..
  message: string;
  userId: string;
}): Promise<void> => {
  // try {
  const { message, userId } = params;

  console.log('[sendNotiMsgAppPush]: ');
  const toUser = await getUserInfoFromCacheNDB<ToUserInfoType>(userId);

  if (
    !isNil(toUser) &&
    !isNil(toUser.userFCMToken) &&
    !isEmpty(toUser.userFCMToken)
  ) {
    const messageInfo: BookingAppPushMsgType = {
      ...params,
      pushType: 'SYSTEMNOTI',
    };

    const result = await fbAdmin.messaging().sendEach(
      toUser.userFCMToken.map(v => {
        const { token, sysNotiPushAlarm } = v;
        const r = {
          data: {
            // serializedData: flatted.stringify(messageInfo),
            serializedData: JSON.stringify(allPropTypeToString(messageInfo)),
          },
          ...(sysNotiPushAlarm && {
            notification: {
              title: 'brip 시스템 알림',
              body: message,
            },
          }),

          android: {
            priority: 'high' as 'high',
          },

          apns: {
            payload: {
              aps: {
                contentAvailable: true,
              },
            },
            headers: {
              // 'apns-push-type': 'background',
              'apns-push-type': 'alert',
              'apns-priority': '10',
              'apns-topic': '', // your app bundle identifier
            },
          },
          token,
        };
        console.log(JSON.stringify(r, null, 2));
        return r;
      }),
    );
    console.log(JSON.stringify(result, null, 2), '\n\n');
  }
  // } catch (err) {
  //   throw new IBError({
  //     type: 'EXTERNALAPI',
  //     message: `앱 Push 중 문제가 발생했습니다. \n\n ${(err as Error).message}`,
  //   });
  // }
};
