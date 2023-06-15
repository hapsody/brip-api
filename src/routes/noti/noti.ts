import express from 'express';
import {
  ibDefs,
  asyncWrapper,
  IBResFormat,
  IBError,
  accessTokenValidCheck,
} from '@src/utils';
import { isNil, isNaN } from 'lodash';

const notiRouter: express.Application = express();

type SSEClientType = {
  [userId: string]: express.Response | null;
};

const sseClients: SSEClientType = {
  '1': null,
};

export type SseSubscribeRequestType = {};
// export type SseSubscribeSuccessResType = {};
export type SseSubscribeResType = Omit<IBResFormat, 'IBparams'> & {
  IBparams: {};
};

export const sseSubscribe = (
  req: Express.IBTypedReqQuery<SseSubscribeRequestType>,
  res: Express.IBTypedResponse<SseSubscribeResType>,
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

notiRouter.get('/sseSubscribe', accessTokenValidCheck, sseSubscribe);

notiRouter.post(
  '/askBookingAvailable',
  accessTokenValidCheck,
  askBookingAvailable,
);
export default notiRouter;
