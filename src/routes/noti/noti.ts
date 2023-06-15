import express from 'express';
import prisma from '@src/prisma';
import {
  ibDefs,
  asyncWrapper,
  IBResFormat,
  IBError,
  accessTokenValidCheck,
} from '@src/utils';
import { isNil, isNaN, isEmpty } from 'lodash';

const notiRouter: express.Application = express();
// const clients: { sseKey: string; userTokenId: string; res: express.Response }[] = [];
type SSEClientType = {
  [sseKey: string]: {
    userTokenId: string;
    res: express.Response | null;
  };
};

let sseClients: SSEClientType = {
  dummySseKey: {
    userTokenId: 'dummyUserTokneId',
    res: null,
  },
};
type UserTokenIdToSSEKEyType = {
  [userTokenId: string]: string;
};
let userTokenIdToSSEKey: UserTokenIdToSSEKEyType = {
  dummyUserTokenId: 'dummySseKey',
};

(async () => {
  const sseKeyMap = await prisma.sSEKeyMap.findMany({});
  if (isEmpty(sseKeyMap)) return;
  if (!isNil(sseKeyMap[0].sseClients) && !isEmpty(sseKeyMap[0].sseClients))
    sseClients = {
      ...sseClients,
      ...(JSON.parse(sseKeyMap[0].sseClients) as SSEClientType),
    };

  if (
    !isNil(sseKeyMap[0].userTokenIdToSSEKey) &&
    !isEmpty(sseKeyMap[0].userTokenIdToSSEKey)
  )
    userTokenIdToSSEKey = {
      ...userTokenIdToSSEKey,
      ...(JSON.parse(
        sseKeyMap[0].userTokenIdToSSEKey,
      ) as UserTokenIdToSSEKEyType),
    };
})().catch((err: Error) => {
  console.error(err);
});

/**
 * server sent event를 활용한 채팅형식의 게시판에 사용할 클라이언트 식별 key를 부여하는 api
 * 이 sseKey를 통해 클라이언트는 sse 에 접속된 전체 클라이언트로 브로드캐스팅된 이벤트중 자신의 메시지를 식별한다.
 */
export type GetSSEKeyRequestType = {};
export type GetSSEKeySuccessResType = {
  sseKey: string;
};
export type GetSSEKeyResType = Omit<IBResFormat, 'IBparams'> & {
  IBparams: GetSSEKeySuccessResType | {};
};

export const getSSEKey = asyncWrapper(
  async (
    req: Express.IBTypedReqBody<GetSSEKeyRequestType>,
    res: Express.IBTypedResponse<GetSSEKeyResType>,
  ): Promise<void> => {
    try {
      const { locals } = req;
      const userTokenId = (() => {
        if (locals && locals?.grade === 'member')
          return locals?.user?.userTokenId;
        // return locals?.tokenId;
        throw new IBError({
          type: 'NOTAUTHORIZED',
          message: 'member 등급만 접근 가능합니다.',
        });
      })();
      if (!userTokenId) {
        throw new IBError({
          type: 'NOTEXISTDATA',
          message: '정상적으로 부여된 userTokenId를 가지고 있지 않습니다.',
        });
      }

      const sseKey = Math.floor(Math.random() * 10000).toString();

      sseClients[sseKey] = {
        userTokenId,
        res: null,
      };

      console.log(`[sseClients]::`, sseKey, sseClients[sseKey]);
      userTokenIdToSSEKey[userTokenId] = sseKey;

      await prisma.sSEKeyMap.upsert({
        where: {
          id: 1,
        },
        update: {
          userTokenIdToSSEKey: JSON.stringify(userTokenIdToSSEKey),
          sseClients: JSON.stringify(sseClients),
        },
        create: {
          userTokenIdToSSEKey: JSON.stringify(userTokenIdToSSEKey),
          sseClients: JSON.stringify(sseClients),
        },
      });
      res.json({
        ...ibDefs.SUCCESS,
        IBparams: {
          sseKey,
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
      }

      throw err;
    }
  },
);

export type SseSubscribeRequestType = {
  sseKey: string;
};
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
    const userTokenId = (() => {
      if (locals && locals?.grade === 'member')
        return locals?.user?.userTokenId;
      // return locals?.tokenId;
      throw new IBError({
        type: 'NOTAUTHORIZED',
        message: 'member 등급만 접근 가능합니다.',
      });
    })();
    if (!userTokenId) {
      throw new IBError({
        type: 'NOTEXISTDATA',
        message: '정상적으로 부여된 userTokenId를 가지고 있지 않습니다.',
      });
    }
    const sseKey = userTokenIdToSSEKey[userTokenId];
    console.log(
      `[userTokenIdToSSEKey]:: userTokenId: ${userTokenId}, sseKey=${sseKey}`,
      userTokenIdToSSEKey,
    );
    // const { sseKey } = req.query;

    if (isNil(sseKey)) {
      throw new IBError({
        type: 'INVALIDSTATUS',
        message: 'userTokenId에 대응하는 sseKey가 존재하지 않습니다.',
      });
    }

    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'text/event-stream',
      Connection: 'keep-alive',
      'Cache-Control': 'no-cache, no-transform',
    };
    res.set(headers);
    res.write(`sseKey:${sseKey} connected`);

    sseClients[sseKey] = {
      ...sseClients[sseKey],
      res,
    };
    console.log(sseClients);

    req.on('close', () => {
      console.log(`sseKey: ${sseKey} closed `);
      //   delete clients[Number(sseKey)];
      delete sseClients[sseKey];
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
  toUserTokenId: string;
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
      const userTokenId = (() => {
        if (locals && locals?.grade === 'member')
          return locals?.user?.userTokenId;
        // return locals?.tokenId;
        throw new IBError({
          type: 'NOTAUTHORIZED',
          message: 'member 등급만 접근 가능합니다.',
        });
      })();
      if (!userTokenId) {
        throw new IBError({
          type: 'NOTEXISTDATA',
          message: '정상적으로 부여된 userTokenId를 가지고 있지 않습니다.',
        });
      }

      const params = req.body;
      const { date, numOfPeople, toUserTokenId } = params;

      if (
        isNil(date) ||
        isNil(numOfPeople) ||
        isNaN(Number(numOfPeople)) ||
        isNil(toUserTokenId)
      ) {
        throw new IBError({
          type: 'INVALIDPARAMS',
          message:
            '올바른 형식의 date, numOfPeople, toUserTokenId 파라미터가 제공되어야 합니다.',
        });
      }

      // console.log(userTokenIdToSSEKey);

      const sseKey = userTokenIdToSSEKey[toUserTokenId];
      const fromSSEKey = userTokenIdToSSEKey[userTokenId];
      if (isNil(sseKey) || isNil(sseClients[sseKey].res)) {
        throw new IBError({
          type: 'INVALIDSTATUS',
          message:
            'toUserTokenId에 해당하는 유저의 sse 연결이 존재하지 않습니다. ',
        });
      }
      sseClients[sseKey].res!.write(`id: 00\n`);
      sseClients[sseKey].res!.write(`event: sseKey${sseKey}\n`);
      sseClients[sseKey].res!.write(
        `data: {"message" : "nextAPI:replyForAskBookingAvailable, from:${fromSSEKey}"}\n\n`,
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

export type ServerReadyEventTestRequestType = {};
export type ServerReadyEventTestSuccessResType = {};
export type ServerReadyEventTestResType = Omit<IBResFormat, 'IBparams'> & {
  IBparams: {};
};

/**
 *
 */
export const serverReadyEventTest = asyncWrapper(
  async (
    req: Express.IBTypedReqBody<ServerReadyEventTestRequestType>,
    res: Express.IBTypedResponse<ServerReadyEventTestResType>,
  ) => {
    try {
      const { locals } = req;
      const userTokenId = (() => {
        if (locals && locals?.grade === 'member')
          return locals?.user?.userTokenId;
        // return locals?.tokenId;
        throw new IBError({
          type: 'NOTAUTHORIZED',
          message: 'member 등급만 접근 가능합니다.',
        });
      })();
      if (!userTokenId) {
        throw new IBError({
          type: 'NOTEXISTDATA',
          message: '정상적으로 부여된 userTokenId를 가지고 있지 않습니다.',
        });
      }

      const sseKey = userTokenIdToSSEKey[userTokenId];
      if (isNil(sseClients[sseKey].res)) {
        throw new IBError({
          type: 'INVALIDSTATUS',
          message: 'sseKey 매핑값 상태에 문제가 있습니다. ',
        });
      }

      sseClients[sseKey].res!.write(`sseKey: ${sseKey}\n`);
      sseClients[sseKey].res!.write(`event: sseKey${sseKey}\n`);
      sseClients[sseKey].res!.write(
        `data: {"message" : "hello SSE ${sseKey}!"}\n\n`,
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

notiRouter.post('/getSSEKey', accessTokenValidCheck, getSSEKey);

notiRouter.get('/sseSubscribe', accessTokenValidCheck, sseSubscribe);

notiRouter.post(
  '/askBookingAvailable',
  accessTokenValidCheck,
  askBookingAvailable,
);
notiRouter.post(
  '/serverReadyEventTest',
  accessTokenValidCheck,
  serverReadyEventTest,
);
export default notiRouter;
