import fbAdmin from '@src/firebase';
// import serialize from 'serialize-javascript';
import prisma from '@src/prisma';
import redis from '@src/redis';
import {
  BookingAppPushType,
  SysNotiAppPushType,
  AdPlaceInfoType,
  TourPlaceInfoType,
} from '@src/routes/noti/types';
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
export const getUserInfoFromCacheNDB = async <
  T extends CustomerUserInfoType | CompanyUserInfoType | ToUserInfoType,
>(
  userId: string,
): Promise<T> => {
  const cachedAdPlaceInfo = await redis.get(`userInfo:${userId}`);
  if (!isNil(cachedAdPlaceInfo) && !isEmpty(cachedAdPlaceInfo)) {
    const cachedObj = JSON.parse(cachedAdPlaceInfo) as T;
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
      !userFCMToken.find(
        v =>
          isNil(v.token) ||
          isEmpty(v.token) ||
          isNil(v.sysNotiPushAlarm) ||
          isEmpty(v.sysNotiPushAlarm) ||
          isNil(v.bookingChatPushAlarm) ||
          isEmpty(v.bookingChatPushAlarm),
      ) /// token이 비어있는게 하나도 없어야함.
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

export const getAdPlaceInfoFromCacheNDB = async (
  adPlaceId: string,
): Promise<AdPlaceInfoType> => {
  const cachedCustomerInfo = await redis.get(`adPlaceInfo:${adPlaceId}`);
  if (!isNil(cachedCustomerInfo) && !isEmpty(cachedCustomerInfo)) {
    const cachedObj = JSON.parse(cachedCustomerInfo) as AdPlaceInfoType;
    const { id, title, mainTourPlaceId } = cachedObj!;

    /// redis에 캐시되어 있던 데이터중 누락된것이 하나도 없어야 한다. 만약 하나라도 있으면 계속 아래로 진행하여 DB 조회를 다시해야하므로 return 을 하면 안된다..
    if (
      !isNil(id) &&
      !isEmpty(id) &&
      !isNil(title) &&
      !isEmpty(title) &&
      !isNil(mainTourPlaceId) &&
      !isEmpty(mainTourPlaceId)
    ) {
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
      mainTourPlaceId: true,
    },
  });

  await redis.set(`adPlaceInfo:${adPlaceId}`, JSON.stringify(dbAdPlaceInfo));
  return dbAdPlaceInfo;
};

export const getTourPlaceInfoFromCacheNDB = async (
  tourPlaceId: string,
): Promise<TourPlaceInfoType> => {
  const cachedTourPlaceInfo = await redis.get(`tourPlaceInfo:${tourPlaceId}`);
  if (!isNil(cachedTourPlaceInfo) && !isEmpty(cachedTourPlaceInfo)) {
    const cachedObj = JSON.parse(cachedTourPlaceInfo) as TourPlaceInfoType;
    const { id, title } = cachedObj!;

    /// redis에 캐시되어 있던 데이터중 누락된것이 하나도 없어야 한다. 만약 하나라도 있으면 계속 아래로 진행하여 DB 조회를 다시해야하므로 return 을 하면 안된다..
    if (!isNil(id) && !isEmpty(id) && !isNil(title) && !isEmpty(title)) {
      return cachedObj;
    }
  }

  const dbTourPlaceInfo = await prisma.tourPlace.findUnique({
    where: {
      id: Number(tourPlaceId),
    },
    select: {
      id: true,
      title: true,
    },
  });

  await redis.set(
    `tourPlaceInfo:${tourPlaceId}`,
    JSON.stringify(dbTourPlaceInfo),
  );
  return dbTourPlaceInfo;
};

// const allPropTypeToString = (data: BookingAppPushType) => {
//   return Object.keys(data).reduce((acc, key) => {
//     const value = data[key] as
//       | string
//       | number
//       | boolean
//       | undefined
//       | BookingActionInputParam
//       | BookingChatActionType
//       | Partial<AdPlace>
//       | Partial<TourPlace>;

//     if (isNil(value)) return acc;
//     if (
//       (key === 'bookingActionInputParams' && typeof value === 'object') ||
//       (key === 'adPlace' && typeof value === 'object') ||
//       (key === 'tourPlace' && typeof value === 'object')
//     ) {
//       acc[key] = data[key];
//       return acc;
//     }

//     acc[key] = value.toString();
//     return acc;
//   }, {});
// };

/// 예약문의 관련 메시지 앱 push 중 고객측으로 보내는 함수. 고객이 여러 디바이스를 연결했다면 연결한 디바이스 모두에 메시지를 보낸다.
export const sendAppPushToBookingCustomer = async (
  params: BookingAppPushType,
): Promise<void> => {
  // try {
  const { customerId, message, companyId, adPlace } = params;

  console.log('[sendAppPushToBookingCustomer]: ');
  const customerUser = await getUserInfoFromCacheNDB<CustomerUserInfoType>(
    customerId,
  );
  const companyUser = await getUserInfoFromCacheNDB<CompanyUserInfoType>(
    companyId,
  );

  if (
    !isNil(adPlace) &&
    !isNil(companyUser) &&
    !isNil(customerUser) &&
    !isNil(customerUser.userFCMToken) &&
    !isEmpty(customerUser.userFCMToken)
  ) {
    const messageInfo: BookingAppPushType = {
      ...params,
      companyNickName: companyUser.nickName,
    };
    const result = await fbAdmin.messaging().sendEach(
      customerUser.userFCMToken.map(v => {
        const { token, bookingChatPushAlarm } = v;
        const r = {
          data: {
            // serializedData: flatted.stringify(messageInfo),
            // serializedData: serialize(messageInfo),
            serializedData: JSON.stringify(messageInfo),
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
              'apns-push-type': bookingChatPushAlarm ? 'alert' : 'background',
              'apns-priority': '5',
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
export const sendAppPushToBookingCompany = async (
  params: BookingAppPushType,
): Promise<void> => {
  // try {
  const { customerId, companyId, message, adPlace } = params;

  console.log('[sendAppPushToBookingCompany]: ');
  const customerUser = await getUserInfoFromCacheNDB<CustomerUserInfoType>(
    customerId,
  );
  const companyUser = await getUserInfoFromCacheNDB<CompanyUserInfoType>(
    companyId,
  );

  if (
    !isNil(adPlace) &&
    !isNil(customerUser) &&
    !isNil(companyUser) &&
    !isNil(companyUser.userFCMToken) &&
    !isEmpty(companyUser.userFCMToken)
  ) {
    const messageInfo: BookingAppPushType = {
      ...params,
      customerNickName: customerUser.nickName,
    };

    const result = await fbAdmin.messaging().sendEach(
      companyUser.userFCMToken.map(v => {
        const { token, bookingChatPushAlarm } = v;
        const r = {
          data: {
            // serializedData: flatted.stringify(messageInfo),
            // serializedData: serialize(messageInfo),
            serializedData: JSON.stringify(messageInfo),
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
              'apns-push-type': bookingChatPushAlarm ? 'alert' : 'background',
              'apns-priority': '5',
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

export type ToUserInfoType = {
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
export const sendNotiMsgAppPush = async (
  params: SysNotiAppPushType,
): Promise<void> => {
  const { message, userId } = params;
  const toUser = await getUserInfoFromCacheNDB<ToUserInfoType>(userId);

  if (
    !isNil(toUser) &&
    !isNil(toUser.userFCMToken) &&
    !isEmpty(toUser.userFCMToken)
  ) {
    const result = await fbAdmin.messaging().sendEach(
      toUser.userFCMToken.map(v => {
        const { token, sysNotiPushAlarm } = v;
        const r = {
          data: {
            // serializedData: flatted.stringify(messageInfo),
            // serializedData: serialize(params),
            serializedData: JSON.stringify(params),
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
              'apns-push-type': sysNotiPushAlarm ? 'alert' : 'background',
              'apns-priority': '5',
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
};
