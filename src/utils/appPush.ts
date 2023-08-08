import fbAdmin from '@src/firebase';
import prisma from '@src/prisma';
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

/// 예약문의 관련 메시지 앱 push 중 고객측으로 보내는 함수. 고객이 여러 디바이스를 연결했다면 연결한 디바이스 모두에 메시지를 보낸다.
export const sendAppPushToBookingCustomer = async (params: {
  /// BookingChatMessageType fields..
  message: string;
  customerId: string;
  adPlaceId: string;
}): Promise<void> => {
  try {
    const { customerId, message, adPlaceId } = params;
    const customerUser = await prisma.user.findUnique({
      where: {
        id: Number(customerId),
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

    const adPlace = await prisma.adPlace.findUnique({
      where: {
        id: Number(adPlaceId),
      },
      select: {
        id: true,
        title: true,
      },
    });

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
    const customerUser = await prisma.user.findUnique({
      where: {
        id: Number(customerId),
      },
      select: {
        id: true,
        nickName: true,
        email: true,
      },
    });
    const companyUser = await prisma.user.findUnique({
      where: {
        id: Number(companyId),
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

    const adPlace = await prisma.adPlace.findUnique({
      where: {
        id: Number(adPlaceId),
      },
      select: {
        id: true,
        title: true,
      },
    });

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
