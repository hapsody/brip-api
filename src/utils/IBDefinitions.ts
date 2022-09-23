import { User } from '@prisma/client';

export class IBError extends Error {
  type: keyof IBResFormats;

  message: string;

  constructor({
    type,
    message,
  }: {
    type: keyof IBResFormats;
    message: string;
  }) {
    super(message);
    this.name = 'IBError';
    this.type = type;
    this.message = message;
  }
}

export interface IBResFormat {
  IBcode: string;
  IBmessage: string;
  IBdetail: string;
  IBparams: object | {};
}

// export interface IBTypedReqBody<T> extends Express.Request {
//   locals?: {
//     resMessages: IBResFormat;
//   };
//   body: T;
// }

// # 성공
// 200 : OK, 요청 정상 처리
// 201 : Created, 생성 요청 성공, 클라이언트의 요청을 서버가 정상적으로 처리했고 새로운 리소스가 생겼다.
// 202 : Accepted, 비동기 요청, 클라이언트의 요청은 정상적이나, 서버가 아직 요청을 완료하지 못했다.
// 204 : No Content, 클라이언트의 요청은 정상적이다. 하지만 컨텐츠를 제공하지 않는다.
// # 실패
// 400 : Bad Request, 요청이 부적절 할 때, 유효성 검증 실패, 필수 값 누락 등.
// 401 : Unauthorized, 인증 실패, 로그인하지 않은 사용자 또는 권한 없는 사용자 처리
// 402 : Payment Required
// 403 : Forbidden, 인증 성공 그러나 자원에 대한 권한 없음. 삭제, 수정시 권한 없음.
// 404 : Not Found, 요청한 URI에 대한 리소스 없을 때 사용.
// 405 : Method Not Allowed, 사용 불가능한 Method를 이용한 경우.
// 406 : Not Acceptable, 요청된 리소스의 미디어 타입을 제공하지 못할 때 사용.
// 408 : Request Timeout
// 409 : Conflict, 리소스 상태에 위반되는 행위 시 사용., 해당 요청의 처리 중 비지니스 로직상 불가능하거나 모순이 생긴 경우
// 413 : Payload Too Large
// 423 : Locked
// 428 : Precondition Required
// 429 : Too Many Requests, 클라이언트가 일정 시간 동안 너무 많은 요청을 보낸 경우
//
// 500 : 서버 에러

export interface IBResFormats {
  SUCCESS: IBResFormat; // http error 200
  TOKENEXPIRED: IBResFormat; // 401
  JWTERROR: IBResFormat; // 401
  NOAUTHTOKEN: IBResFormat; // 401
  TOKENNOTEXPIRED: IBResFormat; // 401
  NOTREFRESHTOKEN: IBResFormat; // 401
  NOTAUTHORIZED: IBResFormat; // 403
  KAKAOTOKENERROR: IBResFormat; // 401
  DBTRANSACTIONERROR: IBResFormat; // 500
  NOTEXISTDATA: IBResFormat; // 404, 기존에 정의되지 않은 데이터 응답을 요청함. 클라이언트 요청 오류
  NOTMATCHEDDATA: IBResFormat; // 404, 서버가 정상적으로 요청을 수신했으나 DB가 존재하지 않는 정상상황이다.
  DUPLICATEDDATA: IBResFormat; // 409
  EXPIREDDATA: IBResFormat; // 400
  INVALIDSTATUS: IBResFormat; // 400
  INVALIDPARAMS: IBResFormat; // 400
  UNEXPECTED: IBResFormat; // 500
  INVALIDENVPARAMS: IBResFormat; // 500
  EXTERNALAPI: IBResFormat; // 500
}

export const ibDefs: IBResFormats = {
  SUCCESS: {
    IBcode: '1000',
    IBmessage: 'Success',
    IBdetail: '',
    IBparams: {},
  },
  TOKENEXPIRED: {
    IBcode: '1001',
    IBmessage: 'token is expired',
    IBdetail: '',
    IBparams: {},
  },
  JWTERROR: {
    IBcode: '1002',
    IBmessage: 'token error',
    IBdetail: '',
    IBparams: {},
  },
  NOAUTHTOKEN: {
    IBcode: '1003',
    IBmessage: 'No auth Token',
    IBdetail: '',
    IBparams: {},
  },
  TOKENNOTEXPIRED: {
    IBcode: '1004',
    IBmessage: 'token is not expired yet',
    IBdetail: '',
    IBparams: {},
  },
  NOTREFRESHTOKEN: {
    IBcode: '1004',
    IBmessage: 'Not a refreshToken',
    IBdetail: '',
    IBparams: {},
  },
  NOTAUTHORIZED: {
    IBcode: '1005',
    IBmessage: '해당 계정으로 접근할수 없는 권한의 기능입니다.',
    IBdetail: '',
    IBparams: {},
  },
  KAKAOTOKENERROR: {
    // social token
    IBcode: '1101',
    IBmessage: 'From kakao auth message',
    IBdetail: '',
    IBparams: {},
  },
  DBTRANSACTIONERROR: {
    IBcode: '2000',
    IBmessage: 'DB transactin Error',
    IBdetail: '',
    IBparams: {},
  },
  NOTEXISTDATA: {
    IBcode: '2001',
    IBmessage: 'DB에서 데이터를 찾을 수 없습니다.',
    IBdetail: '',
    IBparams: {},
  },
  NOTMATCHEDDATA: {
    IBcode: '2002',
    IBmessage: 'DB 데이터와 값이 일치하지 않습니다',
    IBdetail: '',
    IBparams: {},
  },
  DUPLICATEDDATA: {
    IBcode: '2003',
    IBmessage: 'DB 데이터에 중복된 값이 존재합니다.',
    IBdetail: '',
    IBparams: {},
  },
  EXPIREDDATA: {
    IBcode: '2004',
    IBmessage: 'DB 데이터가 만료되었습니다.',
    IBdetail: '',
    IBparams: {},
  },
  INVALIDSTATUS: {
    IBcode: '2005',
    IBmessage: 'DB값이 유효하지 않은 상태입니다.',
    IBdetail: '',
    IBparams: {},
  },
  INVALIDPARAMS: {
    IBcode: '3001',
    IBmessage: '올바르지 않은 파라미터 값 입니다.',
    IBdetail: '',
    IBparams: {},
  },
  UNEXPECTED: {
    IBcode: '5000',
    IBmessage: '예기치 못한 에러가 발생했습니다.',
    IBdetail: '',
    IBparams: {},
  },
  INVALIDENVPARAMS: {
    IBcode: '5001',
    IBmessage: '올바르지 않은 서버 환경변수 값으로 인한 에러 입니다.',
    IBdetail: '',
    IBparams: {},
  },
  EXTERNALAPI: {
    IBcode: '6000',
    IBmessage: '외부 API와 관련한 문제가 발생했습니다.',
    IBdetail: '',
    IBparams: {},
  },
};

export type MemberGrade = 'nonMember' | 'member';
export interface UserTokenPayload {
  grade: MemberGrade;
  email?: string; // grade가 member 일 경우 존재
  tokenId: number;
}

export interface GuardRes {
  grade: MemberGrade;
  tokenId?: number;
  user?: User;
}
