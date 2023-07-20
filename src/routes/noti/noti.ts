import express from 'express';
import prisma from '@src/prisma';
import { UserChatLog, UserChatActionInputParam, User } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import {
  ibDefs,
  asyncWrapper,
  IBResFormat,
  IBError,
  accessTokenValidCheck,
  getS3SignedUrl,
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
  | 'ASKBOOKINGWELCOME' /// 예약문의 첫 환영 인사 ex) 안녕하세요!궁금하신 내용을 보내주세요.가게에서 내용에 대한 답변을 드려요.
  | 'NEWBOOKINGMSG' /// ex) 예약하기
  | 'ANSNEWBOOKINGMSG' /// ex) 원하는 일자와 시간에 예약문의를 남겨주시면 가게에서 예약 가능여부를 확인해드려요!
  | 'ASKBOOKINGAVAILABLE' /// 예약문의 고객 => 사업자 ex) 유쾌한인어님이7/3 월 14시 2명예약 가능여부를 문의했어요!
  | 'ANSBOOKINGAVAILABLE' /// 예약문의답변 사업자 => 고객 ex) 예약이 불가능해요.같은 날짜에 예약이 꽉찼어요.
  | 'ASKBOOKINGCANCEL' /// 예약 문의 취소 ex) 예약 취소
  | 'ASKBOOKINGCANCELCHK' /// 예약문의 취소 system 확인 메시지 ex) 예약이 취소 되었어요.
  | 'CONFIRMBOOKING' /// 예약확정 고객 => 사업자 ex) 네, 확정할게요
  | 'ANSCONFIRMBOOKING' /// 예약확정 system 확인 메시지 ex) 예약 확정을 위해 연락처가 가게에 전달돼요.
  | 'PRIVACYAGREE' /// 정보동의 고객 => 사업자 ex) 동의
  | 'FINALBOOKINGCHECK' /// 예약 확정 system 확인 메시지 ex) 예약이 확정되었어요!확정된 예약은 마이북에서 볼 수 있어요.잊지 않고 예약일에 봬요!
  | 'TEXT'; /// 일반 유저 채팅 메시지

type ActionInputParam = {
  // askBookingAvailable
  date?: string; /// 예약일(문의일x)
  numOfPeople?: string; /// 예약 인원

  /// ansBookingAvailable
  answer?: 'APPROVE' | 'REJECT'; /// 예약문의 응답
  rejectReason?: BookingRejectReasonType; /// 예약문의가 거절일경우 거절사유

  /// askBookingCancel
  customerCancel?: 'TRUE' | 'FALSE'; /// 유저측 예약문의 취소여부

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
type ChatMessageType = {
  adPlaceId: string | null; /// 문의 업체,장소(adPlace) id, 사실상 예약문의 대화에서는 필수이다.
  from: string; /// 보내는 UserId
  to: string; /// 보낼 UserId
  createdAt: string; /// 메시지 전송된 시각
  order: string; /// 채팅방에서의 메시지 순번
  message: string; /// 메시지 본문
  type: ChatMessageActionType; /// 메시지 타입
  actionInputParams?: ActionInputParam;
};

export type SysNotiActionType =
  | 'REPLYFORMYSHARETRIPMEM'
  | 'REPLYFORMYREPLY'
  | 'BOOKINGCOMPLETE';
export type SysNotiMessageType = {
  userId: string; /// 수신인 UserId
  userRole?: string; /// 수신인 유저의 역할( 크리에이터, 광고주, 일반유저) 추후 추가예정
  createdAt: string; /// 메시지 전송된 시각
  message: string; /// 메시지 본문
  type: SysNotiActionType; /// 메시지 타입
  // actionInputParams?: ActionInputParam;
};
export const putInSysNotiMessage = async (
  params: SysNotiMessageType,
): Promise<number> => {
  const data = params;
  const { userId } = data;

  const key = `sysNoti:${userId}`;
  const msgData = JSON.stringify({ uuid: uuidv4(), ...data });
  const nextCursor = await redis.rpush(key, msgData);

  // await redis.hset(`lastMsg:iam:${from}`, `${to}`, msgData); /// from's lastMsg with to
  // await redis.hset(`lastMsg:iam:${to}`, `${from}`, msgData); /// to's lastMsg with from

  return nextCursor;
};

export const takeOutSysNotiMessage = async (params: {
  userId: string;
  startCursor: string;
}): Promise<{
  messages: SysNotiMessageType[];
  nextCursor: number;
}> => {
  const { userId, startCursor } = params;

  const key = `sysNoti:${userId}`;
  const rawSysNotiMsgs = await redis.lrange(key, Number(startCursor), -1);

  const sysNotiMsgs = rawSysNotiMsgs.map(v => {
    return JSON.parse(v) as SysNotiMessageType;
  });
  return {
    messages: sysNotiMsgs,
    nextCursor: Number(startCursor) + rawSysNotiMsgs.length,
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
  const msgData = JSON.stringify({ uuid: uuidv4(), ...data });
  await redis.rpush(key, msgData);

  await redis.hset(`lastMsg:iam:${from}`, `${to}`, msgData); /// from's lastMsg with to
  await redis.hset(`lastMsg:iam:${to}`, `${from}`, msgData); /// to's lastMsg with from

  return data.order;
};

const userChatLogToChatMsg = (
  params: UserChatLog & {
    actionInputParam: UserChatActionInputParam | null;
    user: User;
  },
): ChatMessageType | null => {
  return {
    adPlaceId: isNil(params.adPlaceId) ? null : `${params.adPlaceId}`,
    createdAt: new Date(params.date).toISOString(),
    from: `${params.userId}`,
    to: `${params.toUserId}`,
    order: `${params.order}`,
    message: params.message,
    type: params.actionType as ChatMessageActionType,
    ...(!isNil(params.actionInputParam) && {
      actionInputParams: {
        // askBookingAvailable
        ...(!isNil(params.actionInputParam.bkDate) && {
          date: new Date(params.actionInputParam.bkDate).toISOString(),
        }),
        ...(!isNil(params.actionInputParam.bkNumOfPeople) && {
          numOfPeople: `${params.actionInputParam.bkNumOfPeople}`,
        }),

        /// ansBookingAvailable
        ...(!isNil(params.actionInputParam.bkAnswer) && {
          answer: params.actionInputParam.bkAnswer ? 'APPROVE' : 'REJECT',
        }),
        ...(!isNil(params.actionInputParam.bkRejectReason) && {
          rejectReason: params.actionInputParam
            .bkRejectReason as BookingRejectReasonType,
        }),

        /// confirmBooking
        ...(!isNil(params.actionInputParam.bkConfirmAnswer) && {
          confirmAnswer: params.actionInputParam.bkConfirmAnswer
            ? 'CONFIRM'
            : 'CANCEL',
        }),

        /// privacyAgree
        ...(!isNil(params.actionInputParam.bkAgreeAnswer) && {
          agreeAnswer: params.actionInputParam.bkAgreeAnswer ? 'TRUE' : 'FALSE',
        }),

        /// finalBookingCheck
        reqUserNickname: params.user.nickName,
        reqUserContact: params.user.phone,
      },
    }),
  };
};

/**
 * me에 해당하는 유저가 대화한 사람들과의 마지막 메시지들을 반환하는 함수.
 * 현재까지 구현된 메커니즘은 다음과 같다.
 * 1. redis hash 에(lastMsg:iam:${me}) 저장된 마지막 메시지들을 찾는다. 만약 redis가 정상적인 데이터들을 유지하고 있다면 1단계에서 끝난다. (현재 putIntMessage 할 때마다 마지막 메시지들을 갱신해 놓도록 해놓음.)
 * 2. 그러나 redis의 데이터가 유실된 상황일 경우 해당 유저의 redis 메시지 큐들을 모두 검색해서 가장 마지막 메시지들을 뽑는다.
 * 3. 현재 시스템은 redis의 대화 로그들을 주기적으로 mysql db로 sync한후 redis 버퍼를 비워놓기 때문에 redis 메세지큐 채널에 대화가 쌓여있지 않다고 해서 대화가 없었다를 보장하지 않는다. 그렇기 때문에 2번에서 뽑은 데이터가 존재하는 대화 채널( me<=>x간 대화 )을 제외하고(이것은 redis가 최신의 데이터기 때문에 redis 메시지 큐에 대화가 존재하는 채널은 굳이 mysql에서 검색할 필요가 없기 때문) db에 sync되어 있는 데이터가 있는지도 전체 검색한다.
 * 4. 2+3 결과를 종합하여 반환
 *
 * !!!주의 제약사항) 현재까지 구현된 시스템은 기본적으로 메모리 db인 redis 데이터의 영속성이 완전하지 않다는것을 가정하고 구축되었다. 때문에 redis lastMsg 버퍼가 날아간다거나 하는 경우에는 mysql + redis msgQ 데이터 풀 스캔 후 가장 큰 order값을 갖는 데이터를 마지막 메시지로 간주한다.
 * 그러나 아직 커버되지 않는 경우가 존재하는데 redis 데이터 유실 후 다시 채팅 시스템을 재가동하는 경우 부분적으로 메시지 큐 채널들과 lastMsg 버퍼가 쓰여진 상황이다.
 * 이 경우에는 redis lastMsg를 조회했을때 값이 하나이상 존재할 수 있기 때문에 2번 이후의 과정을 진행하지 않게 되며 때문에 일부만 대화채널이 열려있는 것으로 착각할수 있다.
 * 추가적인 수정이 필요하.
 *  */
const getMyLastMsgs = async (me: string): Promise<LastMessageType[]> => {
  const asyncIterable = {
    [Symbol.asyncIterator]() {
      let firstLoop = true;
      let cursor = '0';
      return {
        async next() {
          const scanResult = await redis.scan(cursor);
          if (!firstLoop && cursor === '0') {
            return { value: scanResult[1], done: true };
          }
          firstLoop = false;
          // eslint-disable-next-line prefer-destructuring
          cursor = scanResult[0];
          return { value: scanResult[1], done: false };
        },
      };
    },
  };

  const redisLastMsgBuffer = await redis.hgetall(`lastMsg:iam:${me}`);

  if (!isNil(redisLastMsgBuffer) && !isEmpty(redisLastMsgBuffer)) {
    const lastMsgs = Object.keys(redisLastMsgBuffer).map(v => {
      const other = v;
      const lastMsg = redisLastMsgBuffer[other];
      return {
        me,
        other,
        lastMsg: JSON.parse(lastMsg) as ChatMessageType,
      };
    });
    return lastMsgs;
  }

  /// redis에  lastMsg hash가 존재하지 않으면 아래와 같이 redis와 mysql을 전부 뒤져야 한다.
  /// redis 전체 채널키 중 me가 수신 또는 송신측 하나라도 위치한 메시지큐 검색
  const redisMyMsgQKeys = await (async () => {
    let matchedKeys: {
      key: string;
      me: string;
      other: string;
    }[] = [];

    // eslint-disable-next-line no-restricted-syntax
    for await (const scanRes of asyncIterable) {
      matchedKeys = [
        ...matchedKeys,
        ...scanRes
          .filter(v => {
            const regex = new RegExp(`^${me}<=>[0-9]+$|^[0-9]+<=>${me}$`);
            const matchResult = v.match(regex);
            return !isNil(matchResult) && matchResult.length > 0;
          })
          .map(v => {
            if (v.split('<=>')[0] === me)
              return {
                key: v,
                me,
                other: v.split('<=>')[1],
              };
            return {
              key: v,
              me,
              other: v.split('<=>')[0],
            };
          }),
      ];
    }
    return matchedKeys;
  })();

  const redisLastMsgs = await Promise.all(
    redisMyMsgQKeys.map(async v => {
      const serializedLastMsg = (await redis.lrange(v.key, -1, -1))[0];
      return {
        lastMsg: JSON.parse(serializedLastMsg) as ChatMessageType,
        me: v.me,
        other: v.other,
      };
    }),
  );

  /// mysql searching
  // const mysqlMsgs = await prisma.userChatLog.findMany({
  //   where: {
  //     AND: [
  //       { OR: [{ userId: Number(me) }, { toUserId: Number(me) }] },

  //       {
  //         NOT: {
  //           OR: redisLastMsgs.map(v => {
  //             return {
  //               OR: [
  //                 {
  //                   userId: Number(v.me),
  //                   toUserId: Number(v.other),
  //                 },
  //                 {
  //                   userId: Number(v.other),
  //                   toUserId: Number(v.me),
  //                 },
  //               ],
  //             };
  //           }),
  //         },
  //       },
  //     ],
  //   },
  //   orderBy: {
  //     order: 'desc',
  //   },
  // });
  const mysqlMsgs = await prisma.userChatLog.findMany({
    where: {
      OR: [{ userId: Number(me) }, { toUserId: Number(me) }],
      redisKey: {
        notIn: redisLastMsgs.map(v => {
          return Number(v.me) > Number(v.other)
            ? `${v.me}<=>${v.other}`
            : `${v.other}<=>${v.me}`;
        }),
      },
    },
    orderBy: {
      order: 'desc',
    },
    include: {
      actionInputParam: true,
      user: true,
    },
  });

  /// db에서 찾은 데이터를 redisKey별 order가 가장 높은 메시지만 추림.
  const lastMsgsGroupByRedisKey = mysqlMsgs.reduce<
    (UserChatLog & {
      actionInputParam: UserChatActionInputParam | null;
      user: User;
    })[]
  >((acc, cur) => {
    const alreadyExist = acc.find(v => v.redisKey === cur.redisKey);
    if (isNil(alreadyExist)) {
      return [...acc, cur];
    }

    return acc;
  }, []);

  const dbLastMsgs = lastMsgsGroupByRedisKey
    .map(v => {
      const lastMsg = userChatLogToChatMsg(v);
      if (isNil(lastMsg)) {
        return null;
      }
      return {
        me,
        other: v.userId === Number(me) ? `${v.toUserId}` : `${v.userId}`,
        lastMsg,
      } as LastMessageType;
    })
    .filter((v): v is LastMessageType => v !== null);

  return [...redisLastMsgs, ...dbLastMsgs];
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

      return userChatLogToChatMsg(v);
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

const syncToMainDB = async (params: {
  adPlaceId: string; /// 사업자측 사업장
  from: string; /// 고객
  to: string; /// 사업자
}) => {
  const { adPlaceId, from, to } = params;

  if (
    isNil(adPlaceId) ||
    isEmpty(adPlaceId) ||
    isNaN(adPlaceId) ||
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

  await prisma.$transaction(async tx => {
    /// 직전에 sync했던곳 이후부터 DB sync
    await Promise.all(
      messages.map(v => {
        const data = JSON.parse(v) as ChatMessageType;
        const { actionInputParams } = data;

        return tx.userChatLog.create({
          data: {
            adPlaceId: isNil(data.adPlaceId)
              ? undefined
              : Number(data.adPlaceId),
            date: data.createdAt,
            order: Number(data.order),
            message: data.message,
            toUserId: Number(data.to),
            userId: Number(data.from),
            actionType: data.type,
            subjectGroupId: nextSubjectGroupId,
            redisKey: key,
            ...(!isNil(actionInputParams) &&
              (() => {
                const {
                  date,
                  numOfPeople,
                  answer,
                  rejectReason,
                  confirmAnswer,
                  agreeAnswer,
                  customerCancel,
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
                      ...(!isNil(customerCancel) && {
                        customerCancel: customerCancel === 'TRUE',
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

    /// move bookingInfo from redis to mysql
    await (async () => {
      // const bookingInfo = await redis.get(
      //   `bookingInfo:${from}=>${to}`, /// userId는 고객, d.to는 사업자
      // );
      const bookingInfo = await redis.hget(
        `bookingInfo:${from}=>${to}`, /// userId는 고객, d.to는 사업자
        `${adPlaceId}`,
      );

      const date = bookingInfo?.split(',')[0]!;
      const numOfPeople = Number(bookingInfo?.split(',')[1]);

      await tx.bookingInfo.create({
        data: {
          date,
          numOfPeople,
          subjectGroupId: nextSubjectGroupId,
          customerId: Number(from),
          companyId: Number(to),
          adPlaceId: Number(adPlaceId),
        },
      });

      // await redis.del(`bookingInfo:${key}`);
      await redis.hdel(`bookingInfo:${key}`, `${adPlaceId}`);
    })();
  });
  return true;
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
      'X-Accel-Buffering': 'no',
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
      'X-Accel-Buffering': 'no',
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

export const pubSSEvent = (params: { from: string; to: string }): void => {
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
  if (from.toUpperCase().includes('SYSTEM')) {
    sseClients[to]!.write(`event: noti:userId${to}\n`);
  } else {
    sseClients[to]!.write(`event: chat:userId${to}\n`);
  }

  sseClients[to]!.write(
    `data: {"message" : "[sse meesage][${new Date().toISOString()}]: from:${from}, lastOrderId:"}\n\n`,
  );
};

export type SendMessageRequestType = (ChatMessageType & {
  actionInputParams?: Omit<
    ActionInputParam,
    'reqUserNickname' | 'reqUserContact'
  >;
})[]; /// 보낼 메시지

// export type SendMessageSuccessResType = {};
export type SendMessageResType = Omit<IBResFormat, 'IBparams'> & {
  IBparams: {};
};

/**
 * bookingChat 채팅창에서 메시지 전송시에 호출할 api
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
        if (
          isNil(v.adPlaceId) ||
          isEmpty(v.adPlaceId) ||
          isNaN(Number(v.adPlaceId))
        ) {
          throw new IBError({
            type: 'INVALIDPARAMS',
            message:
              'data 배열중 adPlaceId 파라미터는 숫자형태의 string으로 제공되어야 합니다.',
          });
        }

        if (
          isNil(v.from) ||
          isEmpty(v.from) ||
          isNaN(Number(v.from)) ||
          isNil(v.to) ||
          isEmpty(v.to) ||
          isNaN(Number(v.to))
        ) {
          throw new IBError({
            type: 'INVALIDPARAMS',
            message:
              'data 배열중 from와 to 파라미터는 숫자형태의 string으로 제공되어야 합니다.',
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
                // await redis.set(
                //   `bookingInfo:${userId}=>${d.to}`, /// userId는 고객, d.to는 사업자
                //   `${date},${numOfPeople}`,
                // );
                await redis.hset(
                  `bookingInfo:${userId}=>${d.to}`, /// userId는 고객, d.to는 사업자
                  `${d.adPlaceId!}`,
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
            case 'ASKBOOKINGCANCEL':
              await (async () => {
                await putInMessage(d);
                const systemGuideMsg: ChatMessageType = {
                  adPlaceId: d.adPlaceId,
                  from: d.to, /// 사업자
                  to: d.from, /// 고객
                  createdAt: new Date().toISOString(),
                  type: 'ASKBOOKINGCANCELCHK',
                  order: `${Number(d.order) + 1}`,
                  message: '예약이 취소 되었어요',
                };

                await putInMessage(systemGuideMsg);
                pubSSEvent(systemGuideMsg);
              })();
              await syncToMainDB({
                adPlaceId: d.adPlaceId!,
                from: d.from,
                to: d.to,
              });
              break;
            case 'CONFIRMBOOKING':
              await (async () => {
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
                await putInMessage(d);

                /// 확정했을 경우
                if (
                  d.actionInputParams?.confirmAnswer &&
                  d.actionInputParams?.confirmAnswer === 'CONFIRM'
                ) {
                  const systemGuideMsg: ChatMessageType = {
                    adPlaceId: d.adPlaceId,
                    from: d.to, /// 사업자
                    to: d.from, /// 고객
                    createdAt: new Date().toISOString(),
                    type: 'ANSCONFIRMBOOKING',
                    order: `${Number(d.order) + 1}`,
                    message: '예약 확정을 위해 연락처가 가게에 전달돼요.',
                  };
                  await putInMessage(systemGuideMsg);
                  pubSSEvent(systemGuideMsg);
                  return;
                }

                /// 확정하지 않았을 경우
                const systemGuideMsg: ChatMessageType = {
                  adPlaceId: d.adPlaceId,
                  from: d.to, /// 사업자
                  to: d.from, /// 고객
                  createdAt: new Date().toISOString(),
                  type: 'ASKBOOKINGCANCELCHK',
                  order: `${Number(d.order) + 1}`,
                  message: '예약이 취소 되었어요',
                };

                await putInMessage(systemGuideMsg);
                pubSSEvent(systemGuideMsg);
                await syncToMainDB({
                  adPlaceId: d.adPlaceId!,
                  from: d.from,
                  to: d.to,
                });
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

                const adPlace = await prisma.adPlace.findUnique({
                  where: {
                    id: Number(d.adPlaceId!),
                  },
                });

                if (isNil(adPlace)) {
                  throw new IBError({
                    type: 'INVALIDSTATUS',
                    message:
                      'adPlaceId에 해당하는 adPlace가 존재하지 않습니다.',
                  });
                }

                await putInMessage(d);

                /// 동의했을 경우
                if (
                  d.actionInputParams?.agreeAnswer &&
                  d.actionInputParams.agreeAnswer === 'TRUE'
                ) {
                  const bookingInfo = await redis.hget(
                    `bookingInfo:${d.from}=>${d.to}`,
                    `${d.adPlaceId!}`,
                  );
                  if (isNil(bookingInfo)) {
                    throw new IBError({
                      type: 'INVALIDSTATUS',
                      message: `bookingInfo 데이터가 유실되었습니다.`,
                    });
                  }

                  const [date, numOfPeople] = bookingInfo.split(',');

                  const finalBookingCheckMsgData: ChatMessageType = {
                    adPlaceId: d.adPlaceId,
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

                  await putInSysNotiMessage({
                    userId: finalBookingCheckMsgData.to, // 고객
                    createdAt: finalBookingCheckMsgData.createdAt,
                    type: 'BOOKINGCOMPLETE',
                    message: `${adPlace.title}에 예약이 확정되었어요.`,
                  });
                  pubSSEvent({
                    from: 'system',
                    to: finalBookingCheckMsgData.to,
                  });
                  return;
                }

                /// 동의하지 않았을 경우
                const systemGuideMsg: ChatMessageType = {
                  adPlaceId: d.adPlaceId,
                  from: d.to, /// 사업자
                  to: d.from, /// 고객
                  createdAt: new Date().toISOString(),
                  type: 'ASKBOOKINGCANCELCHK',
                  order: `${Number(d.order) + 1}`,
                  message: '예약이 취소 되었어요',
                };

                await putInMessage(systemGuideMsg);
                pubSSEvent(systemGuideMsg);
              })();
              await syncToMainDB({
                adPlaceId: d.adPlaceId!,
                from: d.from,
                to: d.to,
              });
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
    } catch (err) {
      if (err instanceof IBError) {
        if (err.type === 'INVALIDPARAMS') {
          console.error(err);
          res.status(400).json({
            ...ibDefs.INVALIDPARAMS,
            IBdetail: (err as Error).message,
            IBparams: {} as object,
          });
          return;
        }
        if (err.type === 'INVALIDSTATUS') {
          console.error(err);
          res.status(400).json({
            ...ibDefs.INVALIDSTATUS,
            IBdetail: (err as Error).message,
            IBparams: {} as object,
          });
          return;
        }
        if (err.type === 'DUPLICATEDDATA') {
          console.error(err);
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
    } catch (err) {
      if (err instanceof IBError) {
        if (err.type === 'INVALIDPARAMS') {
          console.error(err);
          res.status(400).json({
            ...ibDefs.INVALIDPARAMS,
            IBdetail: (err as Error).message,
            IBparams: {} as object,
          });
          return;
        }
        if (err.type === 'DUPLICATEDDATA') {
          console.error(err);
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
  adPlaceId: string; /// 문의 업체/장소 id
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
 * api 호출을하면 1. 고객측=>사업자측: '예약하기', 2. 사업자측=>고객측: '원하는 일자와 시간에 예약문의를 남겨주시면 가게에서 예약 가능여부를 확인해드려요!' 메시지를 발송한다.
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
      const { adPlaceId, toUserId, startOrder, startCursor } = params;

      if (
        isNil(adPlaceId) ||
        isEmpty(adPlaceId) ||
        isNaN(Number(adPlaceId)) ||
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

      // if (isNil(sseClients[toUserId])) {
      //   throw new IBError({
      //     type: 'INVALIDSTATUS',
      //     message: 'toUserId 해당하는 유저의 sse 연결이 존재하지 않습니다. ',
      //   });
      // }

      const result = await takeOutMessage({
        from: userId,
        userId: toUserId,
        startCursor,
        startOrder,
      });

      const bookingData = {
        adPlaceId,
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
        adPlaceId,
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
    } catch (err) {
      if (err instanceof IBError) {
        if (err.type === 'INVALIDPARAMS') {
          console.error(err);
          res.status(400).json({
            ...ibDefs.INVALIDPARAMS,
            IBdetail: (err as Error).message,
            IBparams: {} as object,
          });
          return;
        }
        if (err.type === 'DUPLICATEDDATA') {
          console.error(err);
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
  adPlaceId: string;
  toUserId: string; /// 보낼사용자 userId
  startCursor: string; /// 본 메시지가 redis의 메시지 리스트에서 위치할 index. 최초 대화 시작이라면 0
  startOrder: string; /// 보내는 메시지 order. 최초 대화 시작이라면 0
};
export type ReqBookingChatWelcomeSuccessResType = {};
export type ReqBookingChatWelcomeResType = Omit<IBResFormat, 'IBparams'> & {
  IBparams: ReqBookingChatWelcomeSuccessResType | {};
};

/**
 * 고객측(사용자)가 최초 채팅방입장시에 호출할 api
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
      const { adPlaceId, toUserId, startOrder, startCursor } = params;

      if (
        isNil(adPlaceId) ||
        isEmpty(adPlaceId) ||
        isNaN(Number(adPlaceId)) ||
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
          message:
            'adPlaceId와 toUserId와 startOrder와 startCursor가 제공되어야 합니다.',
        });
      }

      // if (isNil(sseClients[toUserId])) {
      //   throw new IBError({
      //     type: 'INVALIDSTATUS',
      //     message: 'toUserId 해당하는 유저의 sse 연결이 존재하지 않습니다. ',
      //   });
      // }

      const result = await takeOutMessage({
        from: userId,
        userId: toUserId,
        startCursor,
        startOrder,
      });

      const data = {
        adPlaceId,
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
    } catch (err) {
      if (err instanceof IBError) {
        if (err.type === 'INVALIDPARAMS') {
          console.error(err);
          res.status(400).json({
            ...ibDefs.INVALIDPARAMS,
            IBdetail: (err as Error).message,
            IBparams: {} as object,
          });
          return;
        }
        if (err.type === 'DUPLICATEDDATA') {
          console.error(err);
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

type LastMessageType = {
  lastMsg: ChatMessageType;
  me: string;
  other: string;
};
export type GetMsgListToMeRequestType = {};
export type GetMsgListToMeSuccessResType = (LastMessageType & {
  other: {
    id: string;
    nickName: string;
    profileImg: string;
  };
})[];
export type GetMsgListToMeResType = Omit<IBResFormat, 'IBparams'> & {
  IBparams: GetMsgListToMeSuccessResType | {};
};

/**
 * 나(고객, 사업자 모두가능)에게 온 메시지 리스트를 마지막 메시지 배열로 보여줄 api
 * https://www.figma.com/file/Tdpp5Q2J3h19NyvBvZMM2m/brip?type=design&node-id=3537-2981&mode=design&t=WWpW8rSQrIW8iCUV-4
 */
export const getMsgListToMe = asyncWrapper(
  async (
    req: Express.IBTypedReqQuery<GetMsgListToMeRequestType>,
    res: Express.IBTypedResponse<GetMsgListToMeResType>,
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

      const myLastMsgs = await getMyLastMsgs(userId);

      const userInfo = await Promise.all(
        myLastMsgs.map(v => {
          return prisma.user.findUnique({
            where: {
              id: Number(v.other),
            },
            select: {
              id: true,
              nickName: true,
              profileImg: true,
            },
          });
        }),
      );

      const ret = await Promise.all(
        myLastMsgs.map(async (v, idx) => {
          return {
            ...v,
            other: {
              id: userInfo[idx]?.id,
              nickName: userInfo[idx]?.nickName,
              profileImg:
                !isNil(userInfo[idx]) &&
                userInfo[idx]!.profileImg &&
                userInfo[idx]!.profileImg!.toLowerCase().includes('http')
                  ? userInfo[idx]!.profileImg
                  : await getS3SignedUrl(userInfo[idx]!.profileImg!),
            },
          };
        }),
      );

      res.json({
        ...ibDefs.SUCCESS,
        IBparams: ret,
      });
    } catch (err) {
      if (err instanceof IBError) {
        if (err.type === 'INVALIDPARAMS') {
          console.error(err);
          res.status(400).json({
            ...ibDefs.INVALIDPARAMS,
            IBdetail: (err as Error).message,
            IBparams: {} as object,
          });
          return;
        }
        if (err.type === 'DUPLICATEDDATA') {
          console.error(err);
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

export type GetSysNotiMessageRequestType = {
  startCursor: string; /// redis에서 해당 인덱스를 포함한 이후의 메시지를 모두 읽는다.
};
export type GetSysNotiMessageSuccessResType = {
  nextCursor: string;
  sysNotiMessages: SysNotiMessageType[];
};
export type GetSysNotiMessageResType = Omit<IBResFormat, 'IBparams'> & {
  IBparams: GetSysNotiMessageSuccessResType | {};
};

/**
 * 사용자에게 알림 메시지로 전달되는 메시지를 요청하는 api
 * 기본적으로 sse 를 통한 이벤트 발생시 해당 API 호출을 통해 메시지를 확인한다.
 * getMessage와 사용법은 동일하게 startCursor 이후의 값을 가져온다.
 */
export const getSysNotiMessage = asyncWrapper(
  async (
    req: Express.IBTypedReqBody<GetSysNotiMessageRequestType>,
    res: Express.IBTypedResponse<GetSysNotiMessageResType>,
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
      const { startCursor } = params;
      if (
        isNil(startCursor) ||
        isEmpty(startCursor) ||
        isNaN(Number(startCursor))
      ) {
        throw new IBError({
          type: 'INVALIDSTATUS',
          message: 'startCursor가 제공되어야 합니다.',
        });
      }

      const result = await takeOutSysNotiMessage({
        userId,
        startCursor,
      });

      res.json({
        ...ibDefs.SUCCESS,
        IBparams: result,
      });
    } catch (err) {
      if (err instanceof IBError) {
        if (err.type === 'INVALIDPARAMS') {
          console.error(err);
          res.status(400).json({
            ...ibDefs.INVALIDPARAMS,
            IBdetail: (err as Error).message,
            IBparams: {} as object,
          });
          return;
        }
        if (err.type === 'DUPLICATEDDATA') {
          console.error(err);
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
notiRouter.get('/getMsgListToMe', accessTokenValidCheck, getMsgListToMe);
notiRouter.post('/getSysNotiMessage', accessTokenValidCheck, getSysNotiMessage);
export default notiRouter;
