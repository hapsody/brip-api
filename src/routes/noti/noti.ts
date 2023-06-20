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

const notiRouter: express.Application = express();

type SSEClientType = {
  [userId: string]: express.Response | null;
};

const sseClients: SSEClientType = {
  '0': null,
};

type ChatMessageActionType =
  | 'BOOKINGAVAILABLE'
  | 'ANSBOOKINGAVAILABLE'
  | 'CONFIRMBOOKING'
  | 'PRIVACYAGREE'
  | 'FINALBOOKINGCHECK'
  | 'TEXT';

type ChatMessageType = {
  uuid: string;
  createdAt: string;
  order: number;
  message: string;
  actionType: ChatMessageActionType;
  from: string;
  to: string;
};

const messageBox: {
  [userId: string]: {
    [fromUserId: string]: ChatMessageType[];
  };
} = {
  '0': {
    '67': [],
  },
};

const putInMessage = async (params: {
  from: string; /// userId 기준
  to: string; /// userId
  data: {
    createdAt: string;
    order: string;
    message: string;
    type: ChatMessageActionType;
  }[];
}) => {
  const {
    to, /// toUserId
    from, /// fromUserId
    data,
  } = params;

  /// 보내려고 하는 유저의 메시지 박스를 찾는다.
  const herMessages = messageBox[to];

  /// 첫 메시지라면 초기화
  if (
    isNil(herMessages) ||
    isEmpty(herMessages) ||
    isNil(herMessages[from]) ||
    isEmpty(herMessages[from])
  ) {
    const a = {};
    a[from] = [];
    messageBox[to] = a;
  }

  /// 보내려고 하는 사람의 메시지함중 나와의 대화 메시지 큐에 새로운 메시지 추가
  // data.map(v => {
  // return messageBox[to][from].push({
  //   uuid: uuidv4(),
  //   createdAt: v.createdAt,
  //   order: Number(v.order),
  //   message: v.message,
  //   actionType: v.type,
  //   from,
  //   to,
  // });
  // });

  await redis.sAdd(from, to);

  await Promise.all(
    data.map(v => {
      return redis.rPush(
        `${from}=>${to}`,
        JSON.stringify({
          uuid: uuidv4(),
          createdAt: v.createdAt,
          order: Number(v.order),
          message: v.message,
          actionType: v.type,
          from,
          to,
        }),
      );
    }),
  );
};

const takeOutMessage = async (params: {
  from: string; /// userId 기준
  userId: string; /// userId 기준
}) => {
  const { from, userId } = params;
  // if (
  //   isNil(messageBox[userId]) ||
  //   isNil(messageBox[userId][from]) ||
  //   isEmpty(messageBox[userId][from])
  // )
  //   return [];
  // const myMessageFromSpecificUser = [...messageBox[userId][from]];
  // messageBox[userId][from] = [];
  // return myMessageFromSpecificUser;
  const existRelation = await redis.sIsMember(from, userId);

  if (existRelation) {
    const len = await redis.lLen(`${from}=>${userId}`);
    const myMessageFromUserId = await redis.lPopCount(
      `${from}=>${userId}`,
      len,
    ); /// get all messages and delete all
    return isNil(myMessageFromUserId) ? [] : myMessageFromUserId;
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

export type AskBookingAvailableRequestType = {
  date: string;
  numOfPeople: string;
  toUserId: string;
};
export type AskBookingAvailableSuccessResType = {};
export type AskBookingAvailableResType = Omit<IBResFormat, 'IBparams'> & {
  IBparams: {};
};

/**
 *
 */
export const askBookingAvailable = asyncWrapper(
  async (
    req: Express.IBTypedReqBody<AskBookingAvailableRequestType>,
    res: Express.IBTypedResponse<AskBookingAvailableResType>,
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
      const { date, numOfPeople, toUserId } = params;

      if (
        isNil(date) ||
        isNil(numOfPeople) ||
        isNaN(Number(numOfPeople)) ||
        isNil(toUserId)
      ) {
        throw new IBError({
          type: 'INVALIDPARAMS',
          message:
            '올바른 형식의 date, numOfPeople, toUserId 파라미터가 제공되어야 합니다.',
        });
      }

      if (isNil(sseClients[toUserId])) {
        throw new IBError({
          type: 'INVALIDSTATUS',
          message: 'toUserId에 해당하는 유저의 sse 연결이 존재하지 않습니다. ',
        });
      }

      /// 보내려고 하는 유저의 메시지 박스에 넣어둔다.
      const herMessages = messageBox[toUserId];
      if (
        isNil(herMessages) ||
        isEmpty(herMessages) ||
        isNil(herMessages[userId]) ||
        isEmpty(herMessages[userId])
      ) {
        const a = {};
        a[userId] = [];
        messageBox[toUserId] = a;
      }
      const messageBetweenUs = messageBox[toUserId][userId];

      /// 보내려고 하는 사람의 메시지함에서 나한테서 온 메시지 함에 새로운 메시지 추가
      messageBox[toUserId][userId].push({
        uuid: uuidv4(),
        createdAt: new Date().toISOString(),
        order:
          messageBetweenUs.length === 0
            ? 0
            : messageBetweenUs[messageBetweenUs.length - 1].order + 1,

        message: `date:${date}, numOfPeople:${numOfPeople}`,
        actionType: 'TEXT',
        to: toUserId,
        from: userId,
      });

      sseClients[toUserId]!.write(`id: 00\n`);
      sseClients[toUserId]!.write(`event: userId${toUserId}\n`);
      sseClients[toUserId]!.write(
        `data: {"message" : "calledAPI:askBookingAvailable, nextAPI:ansForAskBookingAvailable, from:${userId}"}\n\n`,
      );

      await (async () => {})();
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

export type SendMessageRequestType = {
  toUserId: string;
  data: {
    createdAt: string;
    order: string;
    message: string;
    type: ChatMessageActionType;
    actionInputParams?: {
      [actionType: string]: {
        // askBookingAvailable
        date?: string;
        numOfPeople?: string;
      };
    };
  }[];
};
export type SendMessageSuccessResType = ChatMessageType[];
export type SendMessageResType = Omit<IBResFormat, 'IBparams'> & {
  IBparams: SendMessageSuccessResType | {};
};

/**
 *
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

      await putInMessage({
        from: userId,
        to: toUserId,
        data,
      });

      sseClients[toUserId]!.write(`id: 00\n`);
      sseClients[toUserId]!.write(`event: userId${toUserId}\n`);
      sseClients[toUserId]!.write(
        `data: {"message" : "[sse meesage]: count:${data.length}, from:${userId}"}\n\n`,
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
 *
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
          message: 'apiName과 fromUserId가 제공되어야 합니다.',
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
        IBparams: myMessageFromSpecificUser,
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

export type AnsBookingAvailableRequestType = {
  available: string;
  unavailableReason?:
    | 'CLOSEDTIME'
    | 'INVALIDTIME'
    | 'FULLBOOKINGATDATE'
    | 'FULLBOOKINGONTIME'
    | 'INVALIDNUMOFPERSON';
  toUserId: string;
};
export type AnsBookingAvailableSuccessResType = {};
export type AnsBookingAvailableResType = Omit<IBResFormat, 'IBparams'> & {
  IBparams: {};
};

/**
 *
 */
export const ansBookingAvailable = asyncWrapper(
  async (
    req: Express.IBTypedReqBody<AnsBookingAvailableRequestType>,
    res: Express.IBTypedResponse<AnsBookingAvailableResType>,
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
      const { available, unavailableReason, toUserId } = params;

      if (isNil(available) || isNil(toUserId)) {
        throw new IBError({
          type: 'INVALIDPARAMS',
          message:
            '"true"/"false" 형식의 avaiable string 파라미터와 toUserId가 제공되어야 합니다.',
        });
      }

      if (available === 'false' && isNil(unavailableReason)) {
        throw new IBError({
          type: 'INVALIDPARAMS',
          message:
            '"available이 false라면 unavailableReason은 반드시 제공되어야 합니다.',
        });
      }

      if (isNil(sseClients[toUserId])) {
        throw new IBError({
          type: 'INVALIDSTATUS',
          message: 'toUserId에 해당하는 유저의 sse 연결이 존재하지 않습니다. ',
        });
      }
      sseClients[toUserId]!.write(`id: 00\n`);
      sseClients[toUserId]!.write(`event: userId${toUserId}\n`);
      sseClients[toUserId]!.write(
        `data: {"message" : "calledAPI:ansBookingAvailable, nextAPI:ansForAskBookingAvailable, from:${userId}"}\n\n`,
      );

      await (async () => {})();
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

notiRouter.get('/testSSESubscribe', testSSESubscribe);
notiRouter.get('/sseSubscribe', accessTokenValidCheck, sseSubscribe);

notiRouter.post(
  '/askBookingAvailable',
  accessTokenValidCheck,
  askBookingAvailable,
);
notiRouter.post(
  '/ansBookingAvailable',
  accessTokenValidCheck,
  ansBookingAvailable,
);
notiRouter.post('/storeChatLog', accessTokenValidCheck, storeChatLog);
notiRouter.post('/getMessage', accessTokenValidCheck, getMessage);
notiRouter.post('/sendMessage', accessTokenValidCheck, sendMessage);
export default notiRouter;
