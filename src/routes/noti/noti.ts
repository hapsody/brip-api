import express from 'express';
import prisma from '@src/prisma';
import {
  ibDefs,
  asyncWrapper,
  IBResFormat,
  IBError,
  accessTokenValidCheck,
} from '@src/utils';
import moment from 'moment';
import { isNil, isNaN, isEmpty } from 'lodash';

const notiRouter: express.Application = express();

type SSEClientType = {
  [userId: string]: express.Response | null;
};

const sseClients: SSEClientType = {
  '1': null,
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

    console.log(userId);
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

      // if (isNil(sseClients[userId])) {
      //   throw new IBError({
      //     type: 'INVALIDSTATUS',
      //     message: 'userId에 해당하는 유저의 sse 연결이 존재하지 않습니다. ',
      //   });
      // }

      if (isNil(sseClients[toUserId])) {
        throw new IBError({
          type: 'INVALIDSTATUS',
          message: 'toUserId에 해당하는 유저의 sse 연결이 존재하지 않습니다. ',
        });
      }
      sseClients[toUserId]!.write(`id: 00\n`);
      sseClients[toUserId]!.write(`event: userId${toUserId}\n`);
      sseClients[toUserId]!.write(
        `data: {"message" : "nextAPI:replyForAskBookingAvailable, from:${userId}"}\n\n`,
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

      if (isNil(chatLogValidCheckResult)) {
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

notiRouter.get('/testSSESubscribe', testSSESubscribe);
notiRouter.get('/sseSubscribe', accessTokenValidCheck, sseSubscribe);

notiRouter.post(
  '/askBookingAvailable',
  accessTokenValidCheck,
  askBookingAvailable,
);
notiRouter.post('/storeChatLog', accessTokenValidCheck, storeChatLog);
export default notiRouter;
