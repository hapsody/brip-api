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
  | 'ASKBOOKINGWELCOME'
  | 'ASKBOOKINGAVAILABLE'
  | 'NEWBOOKINGMSG'
  | 'ANSNEWBOOKINGMSG'
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
  from: string; /// 보내는 UserId
  to: string; /// 보낼 UserId
  createdAt: string; /// 메시지 전송된 시각
  order: string; /// 채팅방에서의 메시지 순번
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
const putInMessage = async (params: ChatMessageType) => {
  const data = params;
  const { from, to } = data;

  const { key } = await (async () => {
    const candKey1 = `${from}<=>${to}`;
    const candKey2 = `${to}<=>${from}`;

    const result = await redis.llen(candKey1);
    if (result > 0) return { key: candKey1, len: result };

    // result = await redis.llen(candKey1);
    return { key: candKey2, len: result };
  })();

  await redis.rpush(key, JSON.stringify({ uuid: uuidv4(), ...data }));
  return data.order;

  // /**
  //  * 레디스 Set 데이터타입에 키를 메시지 수신처(to), Sets의 value 집합은 송신자 (from)을 기록해둔다.
  //  * 이렇게 되면 수신자에게 송신자로부터 과거 메시지를 송신한적이 있는지 여부를 알수 있다.
  //  * 이것은 실제 메시지가 저장되는 redis의 Lists 타입과 함께 사용된다.
  //  * Lists 타입은 실제 'from=>to' 란 이름의 key값을 가지게 되며,
  //  * takeOutMessage 함수 호출시에 llen을 통해 먼저 from으로부터 to로의 메시지가 쌓여있는게 있는지를 확인할수 있다.
  //  * 수신자가 열린 채팅방을 모두 조회하고 싶을 경우에는 Lists만으로는 키값을 알수 없어서 조회가 불가능하다.
  //  * 이럴경우 Sets를 사용하여 저장된 송수신자와의 관계를 먼저 파악하고 후에 Lists 키값을 추측하여 조회할수 있다.
  //  */
  // await redis.sAdd(to, from);
  // const len = await redis.llen(`${from}=>${to}`);
  // if (len === 0) {
  //   await redis.rpush(`${from}=>${to}`, [
  //     '1', /// list 좌측 맨 첫번째는 (0번째 자리) 메시지를 수신할때 다음에 읽어가야할 커서인 인덱스 번호를 써준다. len이 0인상황(메시지 큐에 아무 값도 없는 상태)이므로 다음 읽어야 할 인덱스 값은 현재 집어넣는 데이터인 1이다.
  //     JSON.stringify({ uuid: uuidv4(), ...data }),
  //   ]);
  //   return;
  // }

  // await redis.rpush(
  //   `${from}=>${to}`,
  //   JSON.stringify({ uuid: uuidv4(), ...data }),
  // );
};

type RetrieveMessageParamType = {
  from: string; /// userId 기준
  userId: string; /// userId 기준
  startOrder: string; /// redis에서 내가 받고자 하는 메시지가 삭제됐을 경우(DB sync하면 redis에서는 삭제됨.) DB에서 메시지를 찾기 위한 메시지 순번
  startCursor: string; /// redis에서 해당 인덱스를 포함한 이후의 메시지를 모두 읽는다.
};

const retrieveFromDb = async (
  params: RetrieveMessageParamType,
): Promise<{
  messages: ChatMessageType[];
  nextOrder: number;
  nextCursor: number;
}> => {
  const { from, userId, startOrder, startCursor } = params;
  // const msgWithOrder = await prisma.userChatLog.findFirst({
  //   where: {
  //     order: Number(startOrder),
  //     OR: [
  //       { AND: [{ userId: Number(from) }, { toUserId: Number(userId) }] },
  //       { AND: [{ userId: Number(userId) }, { toUserId: Number(from) }] },
  //     ],
  //   },
  //   select: {
  //     id: true,
  //   },
  // });

  // if (isNil(msgWithOrder)) {
  //   return {
  //     messages: [],
  //     nextOrder: 0,
  //     nextCursor: 0,
  //   };
  // }

  const targetMsgsFromDB = await prisma.userChatLog.findMany({
    where: {
      order: { gte: Number(startOrder) },
      OR: [
        { AND: [{ userId: Number(from) }, { toUserId: Number(userId) }] },
        { AND: [{ userId: Number(userId) }, { toUserId: Number(from) }] },
      ],
    },
    include: {
      actionInputParam: true,
      user: true,
    },
  });
  if (isNil(targetMsgsFromDB) || isEmpty(targetMsgsFromDB)) {
    return {
      messages: [],
      nextOrder: Number(startOrder),
      nextCursor: 0,
    };
  }

  const orderedTypedReturn = targetMsgsFromDB
    .map<ChatMessageType | null>(v => {
      if (v.order < Number(startOrder)) return null;
      return {
        createdAt: new Date(v.date).toISOString(),
        from: `${v.userId}`,
        to: `${v.toUserId}`,
        order: `${v.order}`,
        message: v.message,
        type: v.actionType as ChatMessageActionType,
        ...(!isNil(v.actionInputParam) && {
          actionInputParams: {
            // askBookingAvailable
            ...(!isNil(v.actionInputParam.bkDate) && {
              date: new Date(v.actionInputParam.bkDate).toISOString(),
            }),
            ...(!isNil(v.actionInputParam.bkNumOfPeople) && {
              numOfPeople: `${v.actionInputParam.bkNumOfPeople}`,
            }),

            /// ansBookingAvailable
            ...(!isNil(v.actionInputParam.bkAnswer) && {
              answer: v.actionInputParam.bkAnswer ? 'APPROVE' : 'REJECT',
            }),
            ...(!isNil(v.actionInputParam.bkRejectReason) && {
              rejectReason: v.actionInputParam
                .bkRejectReason as BookingRejectReasonType,
            }),

            /// confirmBooking
            ...(!isNil(v.actionInputParam.bkConfirmAnswer) && {
              confirmAnswer: v.actionInputParam.bkConfirmAnswer
                ? 'CONFIRM'
                : 'CANCEL',
            }),

            /// privacyAgree
            ...(!isNil(v.actionInputParam.bkAgreeAnswer) && {
              agreeAnswer: v.actionInputParam.bkAgreeAnswer ? 'TRUE' : 'FALSE',
            }),

            /// finalBookingCheck
            reqUserNickname: v.user.nickName,
            reqUserContact: v.user.phone,
          },
        }),
      };
    })
    .filter((v): v is ChatMessageType => v !== null)
    .sort((a, b) => Number(a.order) - Number(b.order));

  return {
    nextOrder:
      Number(orderedTypedReturn[orderedTypedReturn.length - 1].order) + 1,

    nextCursor: Number(startCursor),
    messages: orderedTypedReturn,
  };
};

/**
 * 메시지 수신시에 수신하고자하는 대상(userId)의 메시지 큐 중(실제는 redis Lists 데이터타입에 저장) from 으로부터의 메시지 큐를 조회하여 쌓여있는 데이터를 모두 꺼내오는 함수, 꺼내고 바로 지우지는 않는다
 */
const takeOutMessage = async (
  params: RetrieveMessageParamType,
): Promise<{
  messages: ChatMessageType[];
  nextOrder: number;
  nextCursor: number;
}> => {
  const { from, userId, startCursor, startOrder } = params;

  /// redis 에서 나와 그와의(n<=>m) 대화 메시지큐 key값 찾기
  const { key, len } = await (async () => {
    /// candKey1 아니면 candKey2 둘중 하나만 존재한다.
    const candKey1 = `${from}<=>${userId}`;
    const candKey2 = `${userId}<=>${from}`;

    /// candKey1이 존재하는경우
    let result = await redis.llen(candKey1);
    if (result > 0) return { key: candKey1, len: result };

    /// candKey2가 존재하는경우
    result = await redis.llen(candKey2);
    if (result > 0) return { key: candKey2, len: result };

    return {};
  })();

  if (isNil(key)) {
    const msgsFromDB = await retrieveFromDb(params);

    return {
      ...msgsFromDB,
      nextCursor: 0,
    };
  }

  /// startCursor 인덱스부터 메시지 큐에 있는 값들 다 가져오기.
  let rawMsgsFromRedis = await redis.lrange(key, Number(startCursor), -1);

  if (isNil(rawMsgsFromRedis) || isEmpty(rawMsgsFromRedis)) {
    /// redis 메시지큐가 비어있을 경우는 두가지다.
    ///  실제로 아무 메시지도 전송된적이 없거나 dbsync가 일어난 이후 메시지가 아직 쌓이지 않은 경우다.

    if (len! > 0) {
      /// 테스트 필요 부분
      return {
        messages: [],
        nextCursor: Number(startCursor),
        nextOrder: Number(startOrder),
      };
    }

    /// 후자의 경우는 DB도 뒤져봐야한다. 만약 DB에서도 찾을수 없다면 정말로 메시지 전송이 된적이 없는것이다.
    const msgsFromDB = await retrieveFromDb(params);
    return msgsFromDB;
  }

  const msgAtStartCursor = JSON.parse(rawMsgsFromRedis[0]) as ChatMessageType;

  /// redis의 startCursor 인덱스에 위치했었던 메시지값이 실제 찾고자 하는 메시지 order값과 같아야만 한다.
  if (msgAtStartCursor.order === startOrder) {
    const messages = rawMsgsFromRedis.map(
      v => JSON.parse(v) as ChatMessageType,
    );
    return {
      messages,
      nextOrder: Number(messages[messages.length - 1].order) + 1,
      nextCursor: Number(startCursor) + messages.length,
    };
  }

  /// 만약 다르다면 이전에 DB로 sync한 이후 redis에서는 현재 클라이언트가 요청하는 메시지는 삭제된 상태기 때문에
  /// 아래 과정대로 DB를 추가적으로 찾아봐야한다.
  const msgsFromDB = await retrieveFromDb(params);

  rawMsgsFromRedis = await redis.lrange(key, 0, -1);
  const msgsFromRedis = rawMsgsFromRedis.map(
    v => JSON.parse(v) as ChatMessageType,
  );

  return {
    messages: [
      ...msgsFromDB.messages,
      ...rawMsgsFromRedis.map(v => JSON.parse(v) as ChatMessageType),
    ],
    nextOrder: Number(msgsFromRedis[msgsFromRedis.length - 1].order) + 1,
    nextCursor: Number(len),
  };
};

const syncToMainDB = async (params: { from: string; to: string }) => {
  const { from, to } = params;

  if (
    isNil(from) ||
    isEmpty(from) ||
    isNaN(from) ||
    isNil(to) ||
    isEmpty(to) ||
    isNaN(to)
  ) {
    return false;
  }

  const {
    key,
    // len
  } = await (async () => {
    const candKey1 = `${from}<=>${to}`;
    const candKey2 = `${to}<=>${from}`;

    let result = await redis.llen(candKey1);
    if (result > 0) return { key: candKey1, len: result };

    result = await redis.llen(candKey1);
    return { key: candKey2, len: result };
  })();

  const startIdxNOrder = await redis.get(`dbSyncStartIdxNOrder:${key}`);
  const idxNOrder = isNil(startIdxNOrder) ? [] : startIdxNOrder.split(':');
  const startIndex = isEmpty(idxNOrder) ? 0 : Number(idxNOrder[0]);
  // const startOrder = isEmpty(cursor) ? 0 : Number(cursor[1]);
  const messages = await redis.lrange(key, startIndex, -1);

  const nextSubjectGroupId = await (async () => {
    const userChatLog = await prisma.userChatLog.findFirst({
      where: {
        subjectGroupId: { not: null },
        OR: [
          { AND: [{ userId: Number(from) }, { toUserId: Number(to) }] },
          { AND: [{ userId: Number(to) }, { toUserId: Number(from) }] },
        ],
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        subjectGroupId: true,
      },
    });

    if (isNil(userChatLog) || isNil(userChatLog.subjectGroupId)) {
      return 0;
    }
    return userChatLog.subjectGroupId + 1;
  })();

  /// 직전에 sync했던곳 이후부터 DB sync
  await Promise.all(
    messages.map(v => {
      const data = JSON.parse(v) as ChatMessageType;
      const { actionInputParams } = data;

      return prisma.userChatLog.create({
        data: {
          date: data.createdAt,
          order: Number(data.order),
          message: data.message,
          toUserId: Number(data.to),
          userId: Number(data.from),
          actionType: data.type,
          subjectGroupId: nextSubjectGroupId,
          ...(!isNil(actionInputParams) &&
            (() => {
              const {
                date,
                numOfPeople,
                answer,
                rejectReason,
                confirmAnswer,
                agreeAnswer,
              } = actionInputParams;
              return {
                actionInputParam: {
                  create: {
                    ...(!isNil(date) && {
                      bkDate: new Date(date).toISOString(),
                    }),
                    ...(!isNil(numOfPeople) && {
                      bkNumOfPeople: Number(numOfPeople),
                    }),
                    ...(!isNil(answer) && {
                      bkAnswer: answer === 'APPROVE',
                    }),
                    ...(!isNil(rejectReason) && {
                      bkRejectReason: rejectReason as string,
                    }),
                    ...(!isNil(confirmAnswer) && {
                      bkConfirmAnswer: confirmAnswer === 'CONFIRM',
                    }),
                    ...(!isNil(agreeAnswer) && {
                      bkAgreeAnswer: agreeAnswer === 'TRUE',
                    }),
                  },
                },
              };
            })()),
        },
      });
    }),
  );

  // await redis.lPopCount(key, len); /// delete all
  await redis.del(key);

  /// 다음번에 sync할 index 기록
  const lastMsg = messages.slice(-1);
  if (!isEmpty(lastMsg)) {
    const lastMsgObj = JSON.parse(lastMsg[0]) as ChatMessageType;

    await redis.set(
      `dbSyncStartIdxNOrder:${key}`,
      `${0}:${Number(lastMsgObj.order) + 1}`,
    ); /// 가장 최근에 DB에 저장된 메시지의(last message) redis list index+1값. 다음번 DB sync할때 이 index '부터'하면 된다.
  }

  return true;
  // const key = `${from}=>${to}`;
  // const len = await redis.llen(key);
  // if (len > 2) {
  //   /// sync할 값이 있을때만 sync
  //   const messages = await redis.lrange(key, 1, -1);
  //   await prisma.userChatLog.createMany({
  //     data: messages.map(v => {
  //       const data = JSON.parse(v) as ChatMessageType;

  //       return {
  //         date: data.createdAt,
  //         order: Number(data.order),
  //         message: data.message,
  //         toUserId: Number(to),
  //         userId: Number(from),
  //       };
  //     }),
  //   });
  //   await redis.lPopCount(key, len); /// delete all
  // }

  // return true;
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

// export type StoreChatLogRequestType = {
//   chatLog: {
//     msg: string; /// 메시지 본문
//     date: string; /// 메시지가 생성된 시각(유저에 노출 표기된 시각과 동일함)
//     order: string; /// 메시지 순서(전체기준))
//   }[];
//   toUserId: string;
// };
// export type StoreChatLogSuccessResType = {};
// export type StoreChatLogResType = Omit<IBResFormat, 'IBparams'> & {
//   IBparams: {};
// };

// /**
//  * 대화로그를 저장요청하는 api.
//  * order는 각 메시지들의 순서를 말하며 해당 api 한번에 해당하지 않고 해당 유저가 보유한 chatLog 전체중의 순서를 말한다.
//  * 클라이언트에서 이전 storeChatLog를 호출한적이 있고 성공했다면 해당 order 이후로 msg order를 부여하여 보내어야 한다.
//  */
// export const storeChatLog = asyncWrapper(
//   async (
//     req: Express.IBTypedReqBody<StoreChatLogRequestType>,
//     res: Express.IBTypedResponse<StoreChatLogResType>,
//   ) => {
//     try {
//       const { locals } = req;
//       const userId = (() => {
//         if (locals && locals?.grade === 'member')
//           return locals?.user?.id.toString();
//         // return locals?.tokenId;
//         throw new IBError({
//           type: 'NOTAUTHORIZED',
//           message: 'member 등급만 접근 가능합니다.',
//         });
//       })();
//       if (isNil(userId)) {
//         throw new IBError({
//           type: 'NOTEXISTDATA',
//           message: '정상적으로 부여된 userId를 가지고 있지 않습니다.',
//         });
//       }

//       const params = req.body;
//       const { chatLog, toUserId } = params;

//       if (
//         isNil(chatLog) ||
//         isEmpty(chatLog) ||
//         isNil(toUserId) ||
//         isNaN(Number(toUserId))
//       ) {
//         throw new IBError({
//           type: 'INVALIDPARAMS',
//           message:
//             '올바른 형식의 chatLog, toUserId 파라미터가 제공되어야 합니다.',
//         });
//       }
//       const chatLogValidCheckResult = chatLog.find(v => {
//         const { msg, date, order } = v;
//         if (isNil(msg) || isNil(date) || isNil(order)) {
//           throw new IBError({
//             type: 'INVALIDPARAMS',
//             message:
//               'chatLog의 msg, date, order는 undefined / null 이지 않은 파라미터가 제공되어야 합니다.',
//           });
//         }
//         if (isNaN(Number(order))) {
//           throw new IBError({
//             type: 'INVALIDPARAMS',
//             message: 'order는 숫자로 변환가능한 string이어야 합니다.',
//           });
//         }
//         return false;
//       });

//       if (!isNil(chatLogValidCheckResult)) {
//         throw new IBError({
//           type: 'INVALIDPARAMS',
//           message:
//             'chatLog 배열 항목중 적어도 1개이상 파라미터의 값이 올바르지 않습니다.',
//         });
//       }

//       await prisma.userChatLog.createMany({
//         data: chatLog.map(v => {
//           const { msg, date, order } = v;
//           return {
//             date: moment(date).toISOString(),
//             order: Number(order),
//             message: msg,
//             userId: Number(userId),
//             toUserId: Number(toUserId),
//           };
//         }),
//         skipDuplicates: true, // Skip 'Bobo'
//       });

//       res.json({
//         ...ibDefs.SUCCESS,
//         IBparams: {},
//       });
//       return;
//     } catch (err) {
//       if (err instanceof IBError) {
//         if (err.type === 'INVALIDPARAMS') {
//           res.status(400).json({
//             ...ibDefs.INVALIDPARAMS,
//             IBdetail: (err as Error).message,
//             IBparams: {} as object,
//           });
//           return;
//         }
//         if (err.type === 'DUPLICATEDDATA') {
//           res.status(409).json({
//             ...ibDefs.DUPLICATEDDATA,
//             IBdetail: (err as Error).message,
//             IBparams: {} as object,
//           });
//           return;
//         }
//       }

//       throw err;
//     }
//   },
// );

export type BookingRejectReasonType =
  | 'CLOSEDTIME'
  | 'INVALIDTIME'
  | 'FULLBOOKINGATDATE'
  | 'FULLBOOKINGONTIME'
  | 'INVALIDNUMOFPERSON';

const pubSSEvent = (params: ChatMessageType) => {
  const { from, to } = params;

  if (isNil(sseClients[to])) {
    // throw new IBError({
    //   type: 'INVALIDSTATUS',
    //   message: 'to 해당하는 유저의 sse 연결이 존재하지 않습니다. ',
    // });
    console.error('to 해당하는 유저의 sse 연결이 존재하지 않습니다. ');
    return;
  }
  sseClients[to]!.write(`id: 00\n`);
  sseClients[to]!.write(`event: userId${to}\n`);
  sseClients[to]!.write(
    `data: {"message" : "[sse meesage]: from:${from}, lastOrderId:"}\n\n`,
  );
};

export type SendMessageRequestType = ChatMessageType[]; /// 보낼 메시지

// export type SendMessageSuccessResType = {};
export type SendMessageResType = Omit<IBResFormat, 'IBparams'> & {
  IBparams: {};
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
      const data = params;

      data.find(v => {
        if (isNil(v.from) || isEmpty(v.from) || isNil(v.to) || isEmpty(v.to)) {
          throw new IBError({
            type: 'INVALIDPARAMS',
            message: 'data 배열중 from와 to 파라미터는 제공되어야 합니다.',
          });
        }

        // if (isNil(sseClients[v.to])) {
        //   throw new IBError({
        //     type: 'INVALIDSTATUS',
        //     message: 'to 해당하는 유저의 sse 연결이 존재하지 않습니다. ',
        //   });
        // }

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

      await Promise.all(
        data.map(async d => {
          const { type, actionInputParams } = d;

          switch (type) {
            case 'TEXT':
              await (() => {
                return putInMessage(d);
              })();
              break;
            case 'ASKBOOKINGAVAILABLE':
              await (async () => {
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

                // 문의 booking Info 임시저장
                await redis.set(
                  `bookingInfo:${userId}=>${d.to}`, /// userId는 고객, d.to는 사업자
                  `${date},${numOfPeople}`,
                );

                await putInMessage(d);
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

                return putInMessage(d);
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

                return putInMessage(d);
              })();
              break;
            case 'PRIVACYAGREE':
              await (async () => {
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

                await putInMessage(d);

                const bookingInfo = await redis.get(
                  `bookingInfo:${d.from}=>${d.to}`,
                );
                if (isNil(bookingInfo)) {
                  throw new IBError({
                    type: 'INVALIDSTATUS',
                    message: `bookingInfo 데이터가 유실되었습니다.`,
                  });
                }

                const [date, numOfPeople] = bookingInfo.split(',');

                const finalBookingCheckMsgData: ChatMessageType = {
                  from: d.to, /// 사업자
                  to: d.from, /// 고객
                  createdAt: new Date().toISOString(),
                  type: 'FINALBOOKINGCHECK',
                  order: `${Number(d.order) + 1}`,
                  message:
                    '예약이 확정되었어요!\n확정된 예약은 마이북에서 볼 수 있어요.\n잊지 않고 예약일에 봬요!',
                  actionInputParams: {
                    reqUserNickname: locals.user!.nickName,
                    reqUserContact: locals.user!.phone,
                    date,
                    numOfPeople,
                  },
                };
                await putInMessage(finalBookingCheckMsgData);
                pubSSEvent(finalBookingCheckMsgData);
              })();

              await syncToMainDB({ from: d.from, to: d.to });
              break;

            default:
              throw new IBError({
                type: 'INVALIDPARAMS',
                message: 'ChatMessageActionType에 정의되지 않은 type입니다.',
              });
          }

          pubSSEvent(d);
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
  from: string;
  startOrder: string; /// redis에서 내가 받고자 하는 메시지가 삭제됐을 경우(DB sync하면 redis에서는 삭제됨.) DB에서 메시지를 찾기 위한 메시지 순번
  startCursor: string; /// redis에서 해당 인덱스를 포함한 이후의 메시지를 모두 읽는다.
};
export type GetMessageSuccessResType = {
  messages: ChatMessageType[];
  nextCursor: number;
  nextOrder: number;
};
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
      const { from, startCursor, startOrder } = params;

      if (
        // isNil(apiName) ||
        // isEmpty(apiName) ||
        isNil(from) ||
        isEmpty(from)
      ) {
        throw new IBError({
          type: 'INVALIDPARAMS',
          message: 'from가 제공되어야 합니다.',
        });
      }

      if (
        isNil(startCursor) ||
        isEmpty(startCursor) ||
        isNaN(Number(startCursor)) ||
        isNil(startOrder) ||
        isEmpty(startOrder) ||
        isNaN(Number(startOrder))
      ) {
        throw new IBError({
          type: 'INVALIDSTATUS',
          message: 'startCursor와 startOrder가 제공되어야 합니다.',
        });
      }

      if (isNil(sseClients[from])) {
        throw new IBError({
          type: 'INVALIDSTATUS',
          message: 'from 해당하는 유저의 sse 연결이 존재하지 않습니다. ',
        });
      }

      const result = await takeOutMessage({
        from,
        userId,
        startCursor,
        startOrder,
      });

      res.json({
        ...ibDefs.SUCCESS,
        IBparams: result,
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

export type ReqNewBookingRequestType = {
  toUserId: string; /// 보낼사용자 userId
  startCursor: string; /// 본 메시지가 redis의 메시지 리스트에서 위치할 index. 최초 대화 시작이라면 0
  startOrder: string; /// 보내는 메시지 order. 최초 대화 시작이라면 0
};
export type ReqNewBookingSuccessResType = {};
export type ReqNewBookingResType = Omit<IBResFormat, 'IBparams'> & {
  IBparams: ReqNewBookingSuccessResType | {};
};

/**
 * 고객측(사용자)가 예약하기 버튼을 누르면 호출할 api
 * api 호출을하면 1. 고객측=>사업자측: '예약하기', 사업자측=>고객측: '원하는 일자와 시간에 예약문의를 남겨주시면 가게에서 예약 가능여부를 확인해드려요!' 메시지를 발송한다.
 */
export const reqNewBooking = asyncWrapper(
  async (
    req: Express.IBTypedReqBody<ReqNewBookingRequestType>,
    res: Express.IBTypedResponse<ReqNewBookingResType>,
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
      const { toUserId, startOrder, startCursor } = params;

      if (
        isNil(toUserId) ||
        isEmpty(toUserId) ||
        isNaN(Number(toUserId)) ||
        isNil(startOrder) ||
        isEmpty(startOrder) ||
        isNaN(Number(startOrder)) ||
        isNil(startCursor) ||
        isEmpty(startCursor) ||
        isNaN(Number(startCursor))
      ) {
        throw new IBError({
          type: 'INVALIDPARAMS',
          message: 'toUserId와 startOrder와 startCursor가 제공되어야 합니다.',
        });
      }

      if (isNil(sseClients[toUserId])) {
        throw new IBError({
          type: 'INVALIDSTATUS',
          message: 'toUserId 해당하는 유저의 sse 연결이 존재하지 않습니다. ',
        });
      }

      const result = await takeOutMessage({
        from: userId,
        userId: toUserId,
        startCursor,
        startOrder,
      });

      const bookingData = {
        createdAt: new Date().toISOString(),
        message: `예약하기`,
        order: `${result.nextOrder}`,
        type: 'NEWBOOKINGMSG' as ChatMessageActionType,
      };
      const forwardData: ChatMessageType = {
        ...bookingData,
        from: userId, /// 고객
        to: toUserId, /// 사업자
      };
      // const reverseData: ChatMessageType = {
      //   ...data,
      //   from: toUserId, /// 사업자
      //   to: userId, /// 고객
      // };

      /// 양측에 같이 날린다
      await putInMessage(forwardData); /// 고객 => 사업자 메시지 전송

      const ansBookingData = {
        createdAt: new Date().toISOString(),
        message: `원하는 일자와 시간에 예약문의를 남겨주시면 가게에서 예약 가능여부를 확인해드려요!`,
        order: `${result.nextOrder + 1}`,
        type: 'ANSNEWBOOKINGMSG' as ChatMessageActionType,
      };

      const reverseData: ChatMessageType = {
        ...ansBookingData,
        from: toUserId, /// 사업자
        to: userId, /// 고객
      };
      await putInMessage(reverseData); /// 사업자 => 고객 메시지 전송

      pubSSEvent(forwardData);
      pubSSEvent(reverseData);

      res.json({
        ...ibDefs.SUCCESS,
        IBparams: {
          toUserId,
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

export type ReqBookingChatWelcomeRequestType = {
  toUserId: string; /// 보낼사용자 userId
  startCursor: string; /// 본 메시지가 redis의 메시지 리스트에서 위치할 index. 최초 대화 시작이라면 0
  startOrder: string; /// 보내는 메시지 order. 최초 대화 시작이라면 0
};
export type ReqBookingChatWelcomeSuccessResType = {};
export type ReqBookingChatWelcomeResType = Omit<IBResFormat, 'IBparams'> & {
  IBparams: ReqBookingChatWelcomeSuccessResType | {};
};

/**
 * 고객측(사용자)가 채팅방입장시에 호출할 api
 * 이 api를 호출하면, 관련된 사업자측과 사용자측으로 모두 sse가 전달되며 getMessage를 통한 메시지 수신시에 예약/문의 안내메시지가 수신된다. (안녕하세요!\n궁금하신 내용을 보내주세요.\n가게에서 내용에 대한 답변을 드려요.)
 * 해당 사용자들끼리 최초 대화일때 단한번만 호출이된다.
 */
export const reqBookingChatWelcome = asyncWrapper(
  async (
    req: Express.IBTypedReqBody<ReqBookingChatWelcomeRequestType>,
    res: Express.IBTypedResponse<ReqBookingChatWelcomeResType>,
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
      const { toUserId, startOrder, startCursor } = params;

      if (
        isNil(toUserId) ||
        isEmpty(toUserId) ||
        isNaN(Number(toUserId)) ||
        isNil(startOrder) ||
        isEmpty(startOrder) ||
        isNaN(Number(startOrder)) ||
        isNil(startCursor) ||
        isEmpty(startCursor) ||
        isNaN(Number(startCursor))
      ) {
        throw new IBError({
          type: 'INVALIDPARAMS',
          message: 'toUserId와 startOrder와 startCursor가 제공되어야 합니다.',
        });
      }

      if (isNil(sseClients[toUserId])) {
        throw new IBError({
          type: 'INVALIDSTATUS',
          message: 'toUserId 해당하는 유저의 sse 연결이 존재하지 않습니다. ',
        });
      }

      const result = await takeOutMessage({
        from: userId,
        userId: toUserId,
        startCursor,
        startOrder,
      });

      const data = {
        createdAt: new Date().toISOString(),
        message: `안녕하세요!\n궁금하신 내용을 보내주세요.\n가게에서 내용에 대한 답변을 드려요.`,
        order: `${result.nextOrder}`,
        type: 'ASKBOOKINGWELCOME' as ChatMessageActionType,
      };
      const forwardData: ChatMessageType = {
        ...data,
        from: userId, /// 고객
        to: toUserId, /// 사업자
      };
      const reverseData: ChatMessageType = {
        ...data,
        from: toUserId, /// 사업자
        to: userId, /// 고객
      };

      /// 양측에 같이 날린다.
      await putInMessage(reverseData); /// 사업자 => 고객 메시지 전송
      pubSSEvent(forwardData);
      pubSSEvent(reverseData);

      res.json({
        ...ibDefs.SUCCESS,
        IBparams: {
          toUserId,
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
// notiRouter.post('/storeChatLog', accessTokenValidCheck, storeChatLog);
notiRouter.post('/getMessage', accessTokenValidCheck, getMessage);
notiRouter.post('/sendMessage', accessTokenValidCheck, sendMessage);
notiRouter.post('/reqNewBooking', accessTokenValidCheck, reqNewBooking);
notiRouter.post(
  '/reqBookingChatWelcome',
  accessTokenValidCheck,
  reqBookingChatWelcome,
);
export default notiRouter;
