import express from 'express';
import prisma from '@src/prisma';
import { v4 as uuidv4 } from 'uuid';
import {
  ibDefs,
  asyncWrapper,
  IBResFormat,
  IBError,
  accessTokenValidCheck,
} from '@src/utils';
import redis from '@src/redis';
import moment from 'moment';
import { isNil, isNaN, isEmpty } from 'lodash';
// import 'moment/locale/ko';

const notiRouter: express.Application = express();

type SSEClientType = {
  [userId: string]: express.Response | null;
};

const sseClients: SSEClientType = {
  '0': null,
};

type ChatMessageActionType =
  | 'ASKBOOKINGAVAILABLE'
  | 'ANSBOOKINGAVAILABLE'
  | 'CONFIRMBOOKING'
  | 'PRIVACYAGREE'
  | 'FINALBOOKINGCHECK'
  | 'TEXT';

// type ChatMessageType = {
//   uuid: string;
//   createdAt: string;
//   order: number;
//   message: string;
//   actionType: ChatMessageActionType;
//   from: string;
//   to: string;
// };
type ChatMessageType = {
  createdAt: string; /// 메시지 전송된 시각
  order: string; /// 메시지 순번
  message: string; /// 메시지 본문
  type: ChatMessageActionType; /// 메시지 타입
  actionInputParams?: {
    // askBookingAvailable
    date?: string; /// 예약일(문의일x)
    numOfPeople?: string; /// 예약 인원

    /// ansBookingAvailable
    answer?: 'APPROVE' | 'REJECT'; /// 예약문의 응답
    rejectReason?: BookingRejectReasonType; /// 예약문의가 거절일경우 거절사유

    /// confirmBooking
    confirmAnswer?: 'CONFIRM' | 'CANCEL'; /// 예약 확정 여부

    /// privacyAgree
    agreeAnswer?: 'TRUE' | 'FALSE'; /// 개인정보 이용동의

    /// finalBookingCheck
    reqUserNickname?: string;
    reqUserContact: string;
    /// date?: string;
    /// numOfPeople?: string;
  };
};

/**
 * 메시지 송신시에 보내고자 하는 상대(to)의 메시지 큐 중(실제는 redis Lists 데이터타입에 저장) from으로부터의 메시지 큐에
 * 보내고자 하는 메시지 data를 등록해두는 함수
 */
const putInMessage = async (params: {
  from: string; /// userId 기준
  to: string; /// userId
  data: ChatMessageType;
}) => {
  const {
    to, /// toUserId
    from, /// fromUserId
    data,
  } = params;

  /**
   * 레디스 Set 데이터타입에 키를 메시지 수신처(to), Sets의 value 집합은 송신자 (from)을 기록해둔다.
   * 이렇게 되면 수신자에게 송신자로부터 과거 메시지를 송신한적이 있는지 여부를 알수 있다.
   * 이것은 실제 메시지가 저장되는 redis의 Lists 타입과 함께 사용된다.
   * Lists 타입은 실제 'from=>to' 란 이름의 key값을 가지게 되며,
   * takeOutMessage 함수 호출시에 lLen을 통해 먼저 from으로부터 to로의 메시지가 쌓여있는게 있는지를 확인할수 있다.
   * 수신자가 열린 채팅방을 모두 조회하고 싶을 경우에는 Lists만으로는 키값을 알수 없어서 조회가 불가능하다.
   * 이럴경우 Sets를 사용하여 저장된 송수신자와의 관계를 먼저 파악하고 후에 Lists 키값을 추측하여 조회할수 있다.
   */
  await redis.sAdd(to, from);
  const len = await redis.lLen(`${from}=>${to}`);
  if (len === 0) {
    await redis.rPush(`${from}=>${to}`, [
      '1', /// list 좌측 맨 첫번째는 (0번째 자리) 메시지를 수신할때 다음에 읽어가야할 커서인 인덱스 번호를 써준다.
      JSON.stringify({ uuid: uuidv4(), ...data }),
    ]);
    return;
  }

  await redis.rPush(
    `${from}=>${to}`,
    JSON.stringify({ uuid: uuidv4(), ...data }),
  );
};

/**
 * 메시지 수신시에 수신하고자하는 대상(userId)의 메시지 큐 중(실제는 redis Lists 데이터타입에 저장) from 으로부터의 메시지 큐를 조회하여 쌓여있는 데이터를 모두 꺼내오는 함수
 */
const takeOutMessage = async (params: {
  from: string; /// userId 기준
  userId: string; /// userId 기준
}): Promise<ChatMessageType[]> => {
  const { from, userId } = params;

  const existRelation = await redis.sIsMember(userId, from);

  if (existRelation) {
    const len = await redis.lLen(`${from}=>${userId}`);
    const startCursor = Number(
      (await redis.lRange(`${from}=>${userId}`, 0, 0))[0],
    );

    if (len === startCursor) return []; /// 읽을 데이터가 없음

    const myMessageFromUserId = await redis.lRange(
      `${from}=>${userId}`,
      startCursor,
      -1,
    ); /// startCursor index부터 끝까지 조회
    await redis.lSet(`${from}=>${userId}`, 0, len.toString()); /// 다음에 읽을 인덱스 재지정 (0번째 인덱스값이 cursor 표시값으로 쓰인다.)

    return myMessageFromUserId.map(v => JSON.parse(v) as ChatMessageType);
    // const myMessageFromUserId = await redis.lPopCount(
    //   `${from}=>${userId}`,
    //   len,
    // ); /// get all messages and delete all

    // return isNil(myMessageFromUserId)
    //   ? []
    //   : myMessageFromUserId.map(v => JSON.parse(v) as ChatMessageType);
  }

  return [];
};

export type SSESubscribeRequestType = {};
// export type SSESubscribeSuccessResType = {};
export type SSESubscribeResType = Omit<IBResFormat, 'IBparams'> & {
  IBparams: {};
};

export const sseSubscribe = (
  req: Express.IBTypedReqQuery<SSESubscribeRequestType>,
  res: Express.IBTypedResponse<SSESubscribeResType>,
): void => {
  try {
    const { locals } = req;
    const userId = (() => {
      if (locals && locals?.grade === 'member')
        return locals?.user?.id.toString();
      // return locals?.tokenId;
      throw new IBError({
        type: 'NOTAUTHORIZED',
        message: 'member 등급만 접근 가능합니다.',
      });
    })();
    if (isNil(userId)) {
      throw new IBError({
        type: 'NOTEXISTDATA',
        message: '정상적으로 부여된 userId 가지고 있지 않습니다.',
      });
    }

    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'text/event-stream',
      Connection: 'keep-alive',
      'Cache-Control': 'no-cache, no-transform',
    };
    res.set(headers);
    res.write(`userId:${userId} connected`);
    console.log(`userId: ${userId} is connected to sse`);

    sseClients[userId] = res;
    // console.log(sseClients);

    req.on('close', () => {
      console.log(`userId: ${userId} closed `);
      //   delete clients[Number(sseKey)];
      delete sseClients[userId];
    });
    return;
  } catch (err) {
    if (err instanceof IBError) {
      if (err.type === 'INVALIDPARAMS') {
        res.status(400).json({
          ...ibDefs.INVALIDPARAMS,
          IBdetail: (err as Error).message,
          IBparams: {} as object,
        });
        return;
      }
    }

    throw err;
  }
};

export type TestSSESubscribeRequestType = {
  userId: string;
};
// export type TestSSESubscribeSuccessResType = {};
export type TestSSESubscribeResType = Omit<IBResFormat, 'IBparams'> & {
  IBparams: {};
};

export const testSSESubscribe = (
  req: Express.IBTypedReqQuery<TestSSESubscribeRequestType>,
  res: Express.IBTypedResponse<TestSSESubscribeResType>,
): void => {
  try {
    const { userId } = req.query;
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'text/event-stream',
      Connection: 'keep-alive',
      'Cache-Control': 'no-cache, no-transform',
    };
    res.set(headers);
    res.write(`userId:${userId} connected`);

    console.log(`userId: ${userId} is connected to sse`);
    sseClients[userId] = res;
    // console.log(sseClients);

    req.on('close', () => {
      console.log(`userId: ${userId} closed `);
      //   delete clients[Number(sseKey)];
      delete sseClients[userId];
    });
    return;
  } catch (err) {
    if (err instanceof IBError) {
      if (err.type === 'INVALIDPARAMS') {
        res.status(400).json({
          ...ibDefs.INVALIDPARAMS,
          IBdetail: (err as Error).message,
          IBparams: {} as object,
        });
        return;
      }
    }

    throw err;
  }
};

export type StoreChatLogRequestType = {
  chatLog: {
    msg: string; /// 메시지 본문
    date: string; /// 메시지가 생성된 시각(유저에 노출 표기된 시각과 동일함)
    order: string; /// 메시지 순서(전체기준))
  }[];
  toUserId: string;
};
export type StoreChatLogSuccessResType = {};
export type StoreChatLogResType = Omit<IBResFormat, 'IBparams'> & {
  IBparams: {};
};

/**
 * 대화로그를 저장요청하는 api.
 * order는 각 메시지들의 순서를 말하며 해당 api 한번에 해당하지 않고 해당 유저가 보유한 chatLog 전체중의 순서를 말한다.
 * 클라이언트에서 이전 storeChatLog를 호출한적이 있고 성공했다면 해당 order 이후로 msg order를 부여하여 보내어야 한다.
 */
export const storeChatLog = asyncWrapper(
  async (
    req: Express.IBTypedReqBody<StoreChatLogRequestType>,
    res: Express.IBTypedResponse<StoreChatLogResType>,
  ) => {
    try {
      const { locals } = req;
      const userId = (() => {
        if (locals && locals?.grade === 'member')
          return locals?.user?.id.toString();
        // return locals?.tokenId;
        throw new IBError({
          type: 'NOTAUTHORIZED',
          message: 'member 등급만 접근 가능합니다.',
        });
      })();
      if (isNil(userId)) {
        throw new IBError({
          type: 'NOTEXISTDATA',
          message: '정상적으로 부여된 userId를 가지고 있지 않습니다.',
        });
      }

      const params = req.body;
      const { chatLog, toUserId } = params;

      if (
        isNil(chatLog) ||
        isEmpty(chatLog) ||
        isNil(toUserId) ||
        isNaN(Number(toUserId))
      ) {
        throw new IBError({
          type: 'INVALIDPARAMS',
          message:
            '올바른 형식의 chatLog, toUserId 파라미터가 제공되어야 합니다.',
        });
      }
      const chatLogValidCheckResult = chatLog.find(v => {
        const { msg, date, order } = v;
        if (isNil(msg) || isNil(date) || isNil(order)) {
          throw new IBError({
            type: 'INVALIDPARAMS',
            message:
              'chatLog의 msg, date, order는 undefined / null 이지 않은 파라미터가 제공되어야 합니다.',
          });
        }
        if (isNaN(Number(order))) {
          throw new IBError({
            type: 'INVALIDPARAMS',
            message: 'order는 숫자로 변환가능한 string이어야 합니다.',
          });
        }
        return false;
      });

      if (!isNil(chatLogValidCheckResult)) {
        throw new IBError({
          type: 'INVALIDPARAMS',
          message:
            'chatLog 배열 항목중 적어도 1개이상 파라미터의 값이 올바르지 않습니다.',
        });
      }

      await prisma.userChatLog.createMany({
        data: chatLog.map(v => {
          const { msg, date, order } = v;
          return {
            date: moment(date).toISOString(),
            order: Number(order),
            message: msg,
            userId: Number(userId),
            toUserId: Number(toUserId),
          };
        }),
        skipDuplicates: true, // Skip 'Bobo'
      });

      res.json({
        ...ibDefs.SUCCESS,
        IBparams: {},
      });
      return;
    } catch (err) {
      if (err instanceof IBError) {
        if (err.type === 'INVALIDPARAMS') {
          res.status(400).json({
            ...ibDefs.INVALIDPARAMS,
            IBdetail: (err as Error).message,
            IBparams: {} as object,
          });
          return;
        }
        if (err.type === 'DUPLICATEDDATA') {
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

export type BookingRejectReasonType =
  | 'CLOSEDTIME'
  | 'INVALIDTIME'
  | 'FULLBOOKINGATDATE'
  | 'FULLBOOKINGONTIME'
  | 'INVALIDNUMOFPERSON';

const pubSSEvent = (params: {
  from: string;
  to: string;
  data: ChatMessageType[];
}) => {
  const { from, to, data } = params;
  sseClients[to]!.write(`id: 00\n`);
  sseClients[to]!.write(`event: userId${to}\n`);
  sseClients[to]!.write(
    `data: {"message" : "[sse meesage]: count:${data.length}, from:${from}"}\n\n`,
  );
};

export type SendMessageRequestType = {
  toUserId: string; /// 보내고자하는 목적지 유저의 id
  data: ChatMessageType[]; /// 보낼 메시지
};
export type SendMessageSuccessResType = ChatMessageType[];
export type SendMessageResType = Omit<IBResFormat, 'IBparams'> & {
  IBparams: SendMessageSuccessResType | {};
};

/**
 * 채팅창에서 메시지 전송시에 호출할 api
 * 본 시스템에서 채팅은 Server sent event를 통해 채팅의 형태로 보여지지만 엄밀한의미의 동시성을 가진 채팅기능은 아니다.
 * sse 메시지로는 프론트에서 수신할 타이밍의 기준으로만 동작하며 실제 메시지는 보안상 sendMessage라는 본 REST API 호출로 이뤄진다.
 * 마찬가지로 보내어진 메시지는 sse 이벤트 수신후 getMessage 호출을 통해 실제 데이터를 받게된다.
 */
export const sendMessage = asyncWrapper(
  async (
    req: Express.IBTypedReqBody<SendMessageRequestType>,
    res: Express.IBTypedResponse<SendMessageResType>,
  ) => {
    try {
      const { locals } = req;
      const userId = (() => {
        if (locals && locals?.grade === 'member')
          return locals?.user?.id.toString();
        // return locals?.tokenId;
        throw new IBError({
          type: 'NOTAUTHORIZED',
          message: 'member 등급it만 접근 가능합니다.',
        });
      })();
      if (isNil(userId)) {
        throw new IBError({
          type: 'NOTEXISTDATA',
          message: '정상적으로 부여된 userId를 가지고 있지 않습니다.',
        });
      }

      const params = req.body;
      const { toUserId, data } = params;

      if (
        isNil(toUserId) ||
        isEmpty(toUserId) ||
        isNil(data) ||
        isEmpty(data)
      ) {
        throw new IBError({
          type: 'INVALIDPARAMS',
          message: 'toUserId와 data 배열이 제공되어야 합니다.',
        });
      }

      data.find(v => {
        if (isNil(v.createdAt) || isEmpty(v.createdAt)) {
          throw new IBError({
            type: 'INVALIDPARAMS',
            message: 'data 배열중 createdAt 파라미터는 제공되어야 합니다.',
          });
        }

        if (isNil(v.message) || isEmpty(v.message)) {
          throw new IBError({
            type: 'INVALIDPARAMS',
            message: 'data 배열중 message 파라미터는 제공되어야 합니다.',
          });
        }

        if (isNil(v.order) || isEmpty(v.order)) {
          throw new IBError({
            type: 'INVALIDPARAMS',
            message: 'data 배열중 order 파라미터는 제공되어야 합니다.',
          });
        }

        if (isNil(v.type) || isEmpty(v.type)) {
          throw new IBError({
            type: 'INVALIDPARAMS',
            message: 'data 배열중 type 파라미터는 제공되어야 합니다.',
          });
        }

        return false;
      });

      if (isNil(sseClients[toUserId])) {
        throw new IBError({
          type: 'INVALIDSTATUS',
          message: 'toUserId 해당하는 유저의 sse 연결이 존재하지 않습니다. ',
        });
      }

      await Promise.all(
        data.map(async d => {
          const { type, actionInputParams } = d;

          switch (type) {
            case 'TEXT':
              await (() => {
                return putInMessage({
                  from: userId,
                  to: toUserId,
                  data: d,
                });
              })();
              break;
            case 'ASKBOOKINGAVAILABLE':
              await (() => {
                if (isNil(actionInputParams) || isEmpty(actionInputParams)) {
                  throw new IBError({
                    type: 'INVALIDPARAMS',
                    message: `type이 ${type} 이면 actionInputParams는 필수입니다.`,
                  });
                }

                const { date, numOfPeople } = actionInputParams;

                if (isNil(date) || isEmpty(date) || !moment(date).isValid()) {
                  throw new IBError({
                    type: 'INVALIDPARAMS',
                    message: `type이 ${type} 이면 유효한 date string(ISO string)은 필수입니다.`,
                  });
                }

                if (
                  isNil(numOfPeople) ||
                  isEmpty(numOfPeople) ||
                  isNaN(numOfPeople)
                ) {
                  throw new IBError({
                    type: 'INVALIDPARAMS',
                    message: `type이 ${type} 이면 numOfPeople은 필수입니다.`,
                  });
                }

                // const mTargetDate = moment(date);
                // const targetMonth = mTargetDate.month() + 1;
                // const targetDay = mTargetDate.date();
                // const targetWeekday = mTargetDate.format('dddd');
                // const targetHour = mTargetDate.format('H');

                return putInMessage({
                  from: userId,
                  to: toUserId,
                  data: d,
                  // data: {
                  //   ...d,
                  //   message: `${
                  //     locals.user!.nickName
                  //   }님이\n${targetMonth}/${targetDay} ${targetWeekday} ${targetHour}시 ${numOfPeople}명\n예약 가능여부를 문의했어요!`,
                  // },
                });
              })();

              break;
            case 'ANSBOOKINGAVAILABLE':
              await (() => {
                if (isNil(actionInputParams) || isEmpty(actionInputParams)) {
                  throw new IBError({
                    type: 'INVALIDPARAMS',
                    message: `type이 ${type} 이면 actionInputParams는 필수입니다.`,
                  });
                }

                const { answer, rejectReason } = actionInputParams;

                if (isNil(answer) || isEmpty(answer)) {
                  throw new IBError({
                    type: 'INVALIDPARAMS',
                    message: `type이 ${type} 이면 유효한 actionInputParams의 answer 파라미터는 필수입니다.`,
                  });
                }

                if (
                  answer === 'REJECT' &&
                  (isNil(rejectReason) || isEmpty(rejectReason))
                ) {
                  throw new IBError({
                    type: 'INVALIDPARAMS',
                    message: `type이 ${type} 이면 actionInputParams의 rejectReason은 필수입니다.`,
                  });
                }

                return putInMessage({
                  from: userId,
                  to: toUserId,
                  data: d,
                });
              })();
              break;
            case 'CONFIRMBOOKING':
              await (() => {
                if (isNil(actionInputParams) || isEmpty(actionInputParams)) {
                  throw new IBError({
                    type: 'INVALIDPARAMS',
                    message: `type이 ${type} 이면 actionInputParams는 필수입니다.`,
                  });
                }

                const { confirmAnswer } = actionInputParams;

                if (isNil(confirmAnswer) || isEmpty(confirmAnswer)) {
                  throw new IBError({
                    type: 'INVALIDPARAMS',
                    message: `type이 ${type} 이면 유효한 confirmAnswer은 필수입니다.`,
                  });
                }

                return putInMessage({
                  from: userId,
                  to: toUserId,
                  data: d,
                });
              })();
              break;
            case 'PRIVACYAGREE':
              await (() => {
                if (isNil(actionInputParams) || isEmpty(actionInputParams)) {
                  throw new IBError({
                    type: 'INVALIDPARAMS',
                    message: `type이 ${type} 이면 actionInputParams는 필수입니다.`,
                  });
                }

                const { agreeAnswer } = actionInputParams;

                if (isNil(agreeAnswer) || isEmpty(agreeAnswer)) {
                  throw new IBError({
                    type: 'INVALIDPARAMS',
                    message: `type이 ${type} 이면 유효한 agreeAnswer 필수입니다.`,
                  });
                }

                const agreeMsgPromise = putInMessage({
                  from: userId,
                  to: toUserId,
                  data: d,
                });

                const finalBookingCheckMsgData: ChatMessageType = {
                  createdAt: new Date().toISOString(),
                  type: 'FINALBOOKINGCHECK',
                  order: '-1',
                  message:
                    '예약이 확정되었어요!\n확정된 예약은 마이북에서 볼 수 있어요.\n잊지 않고 예약일에 봬요!',
                  actionInputParams: {
                    reqUserNickname: locals.user!.nickName,
                    reqUserContact: locals.user!.phone,
                    date: '저장되어있는 예약날짜',
                    numOfPeople: '저장되어 있는 예약인원',
                  },
                };
                const finalBookingCheckMsgToCompany = putInMessage({
                  from: userId,
                  to: toUserId,
                  data: finalBookingCheckMsgData,
                });

                const finalBookingCheckMsgToCustomer = putInMessage({
                  from: toUserId,
                  to: userId,
                  data: finalBookingCheckMsgData,
                });

                return Promise.all([
                  agreeMsgPromise,
                  finalBookingCheckMsgToCompany,
                  finalBookingCheckMsgToCustomer,
                ]);
              })();
              break;

            default:
              throw new IBError({
                type: 'INVALIDPARAMS',
                message: 'ChatMessageActionType에 정의되지 않은 type입니다.',
              });
          }

          pubSSEvent({
            from: userId,
            to: toUserId,
            data,
          });
        }),
      );

      res.json({
        ...ibDefs.SUCCESS,
        IBparams: {},
      });
      return;
    } catch (err) {
      if (err instanceof IBError) {
        if (err.type === 'INVALIDPARAMS') {
          res.status(400).json({
            ...ibDefs.INVALIDPARAMS,
            IBdetail: (err as Error).message,
            IBparams: {} as object,
          });
          return;
        }
        if (err.type === 'DUPLICATEDDATA') {
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

export type GetMessageRequestType = {
  // apiName: string;
  fromUserId: string;
};
export type GetMessageSuccessResType = ChatMessageType[];
export type GetMessageResType = Omit<IBResFormat, 'IBparams'> & {
  IBparams: GetMessageSuccessResType | {};
};

/**
 * 채팅창에서 메시지 수신시에 호출할 api
 * 본 시스템에서 채팅은 Server sent event를 통해 채팅의 형태로 보여지지만 엄밀한의미의 동시성을 가진 채팅기능은 아니다.
 * sse 메시지로는 프론트에서 REST API 호출 수신할 타이밍의 기준으로만 동작하며 실제 메시지는 보안상 sendMessage라는 REST API 호출로 이뤄지고 해당 메시지는 상대 클라이언트의 sse 이벤트 수신후 getMessage 호출을 통해 실제 데이터를 받게된다.
 */
export const getMessage = asyncWrapper(
  async (
    req: Express.IBTypedReqBody<GetMessageRequestType>,
    res: Express.IBTypedResponse<GetMessageResType>,
  ) => {
    try {
      const { locals } = req;
      const userId = (() => {
        if (locals && locals?.grade === 'member')
          return locals?.user?.id.toString();
        // return locals?.tokenId;
        throw new IBError({
          type: 'NOTAUTHORIZED',
          message: 'member 등급만 접근 가능합니다.',
        });
      })();
      if (isNil(userId)) {
        throw new IBError({
          type: 'NOTEXISTDATA',
          message: '정상적으로 부여된 userId를 가지고 있지 않습니다.',
        });
      }

      const params = req.body;
      const { fromUserId } = params;

      if (
        // isNil(apiName) ||
        // isEmpty(apiName) ||
        isNil(fromUserId) ||
        isEmpty(fromUserId)
      ) {
        throw new IBError({
          type: 'INVALIDPARAMS',
          message: 'fromUserId가 제공되어야 합니다.',
        });
      }

      if (isNil(sseClients[fromUserId])) {
        throw new IBError({
          type: 'INVALIDSTATUS',
          message: 'fromUserId 해당하는 유저의 sse 연결이 존재하지 않습니다. ',
        });
      }

      // const myMessageFromSpecificUser = [...messageBox[userId][fromUserId]];
      // messageBox[userId][fromUserId] = [];
      const myMessageFromSpecificUser = await takeOutMessage({
        from: fromUserId,
        userId,
      });

      res.json({
        ...ibDefs.SUCCESS,
        IBparams: {
          fromUserId,
          data: myMessageFromSpecificUser,
        },
      });
      return;
    } catch (err) {
      if (err instanceof IBError) {
        if (err.type === 'INVALIDPARAMS') {
          res.status(400).json({
            ...ibDefs.INVALIDPARAMS,
            IBdetail: (err as Error).message,
            IBparams: {} as object,
          });
          return;
        }
        if (err.type === 'DUPLICATEDDATA') {
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

export type ReqBookingChagRequestType = {
  toUserId: string;
};
export type ReqBookingChagSuccessResType = {};
export type ReqBookingChagResType = Omit<IBResFormat, 'IBparams'> & {
  IBparams: ReqBookingChagSuccessResType | {};
};

/**
 * 고객측(사용자)가 채팅방입장시에 호출할 api
 * 이 api를 호출하면, 관련된 사업자측과 사용자측으로 모두 sse가 전달되며 getMessage를 통한 메시지 수신시에 예약/문의 안내메시지가 수신된다. (안녕하세요!\n궁금하신 내용을 보내주세요.\n가게에서 내용에 대한 답변을 드려요.)
 */
export const reqBookingChat = asyncWrapper(
  async (
    req: Express.IBTypedReqBody<ReqBookingChagRequestType>,
    res: Express.IBTypedResponse<ReqBookingChagResType>,
  ) => {
    try {
      const { locals } = req;
      const userId = (() => {
        if (locals && locals?.grade === 'member')
          return locals?.user?.id.toString();
        // return locals?.tokenId;
        throw new IBError({
          type: 'NOTAUTHORIZED',
          message: 'member 등급만 접근 가능합니다.',
        });
      })();
      if (isNil(userId)) {
        throw new IBError({
          type: 'NOTEXISTDATA',
          message: '정상적으로 부여된 userId를 가지고 있지 않습니다.',
        });
      }

      const params = req.body;
      const { toUserId } = params;

      if (isNil(toUserId) || isEmpty(toUserId)) {
        throw new IBError({
          type: 'INVALIDPARAMS',
          message: 'toUserId가 제공되어야 합니다.',
        });
      }

      if (isNil(sseClients[toUserId])) {
        throw new IBError({
          type: 'INVALIDSTATUS',
          message: 'toUserId 해당하는 유저의 sse 연결이 존재하지 않습니다. ',
        });
      }

      const data: ChatMessageType = {
        createdAt: new Date().toISOString(),
        message: `안녕하세요!\n궁금하신 내용을 보내주세요.\n가게에서 내용에 대한 답변을 드려요.`,
        order: '-1',
        type: 'TEXT',
      };

      /// 양측에 같이 날린다.
      await Promise.all([
        putInMessage({
          from: toUserId, /// 사업자
          to: userId, /// 고객
          data,
        }),
        putInMessage({
          from: userId, /// 고객
          to: toUserId, /// 사업자
          data,
        }),
      ]);

      pubSSEvent({
        from: toUserId, /// 사업자
        to: userId, /// 고객
        data: [data],
      });
      pubSSEvent({
        from: userId, /// 고객
        to: toUserId, /// 사업자
        data: [data],
      });

      res.json({
        ...ibDefs.SUCCESS,
        IBparams: {
          toUserId,
          data: {},
        },
      });
      return;
    } catch (err) {
      if (err instanceof IBError) {
        if (err.type === 'INVALIDPARAMS') {
          res.status(400).json({
            ...ibDefs.INVALIDPARAMS,
            IBdetail: (err as Error).message,
            IBparams: {} as object,
          });
          return;
        }
        if (err.type === 'DUPLICATEDDATA') {
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

notiRouter.get('/testSSESubscribe', testSSESubscribe);
notiRouter.get('/sseSubscribe', accessTokenValidCheck, sseSubscribe);
notiRouter.post('/storeChatLog', accessTokenValidCheck, storeChatLog);
notiRouter.post('/getMessage', accessTokenValidCheck, getMessage);
notiRouter.post('/sendMessage', accessTokenValidCheck, sendMessage);
notiRouter.post('/reqBookingChat', accessTokenValidCheck, reqBookingChat);
export default notiRouter;
