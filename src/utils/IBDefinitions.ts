import { User, TripCreator } from '@prisma/client';

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

/**
 * 함수-함수 전달시 함수간 전달해야할 내부 변수들
 */
export interface IBContext {
  queryParamsId?: string;
  userTokenId?: string;
  memberId?: number;
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
  NOTAUTHORIZED: IBResFormat; // 403
  NOTREFRESHTOKEN: IBResFormat; // 401
  INVALIDAUTHTOKEN: IBResFormat; // 401
  KAKAOTOKENERROR: IBResFormat; // 401
  DBTRANSACTIONERROR: IBResFormat; // 500
  NOTEXISTDATA: IBResFormat; // 202, 404, 기존에 정의되지 않은 데이터 응답을 요청함. 클라이언트 요청 오류
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
    IBmessage: 'token format error',
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
  NOTAUTHORIZED: {
    IBcode: '1005',
    IBmessage: '해당 계정으로 접근할수 없는 권한의 기능입니다.',
    IBdetail: '',
    IBparams: {},
  },
  NOTREFRESHTOKEN: {
    IBcode: '1006',
    IBmessage: 'Not a refreshToken',
    IBdetail: '',
    IBparams: {},
  },
  INVALIDAUTHTOKEN: {
    IBcode: '1007',
    IBmessage: 'Invalid Auth Token',
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
export interface AccessTokenPayload {
  grade?: MemberGrade;
  email?: string; // grade가 member 일 경우 존재
  tokenId: string;
}

export interface RefreshTokenPayload {
  email: string;
  refTk: boolean;
}

export interface GuardRes {
  grade: MemberGrade;
  tokenId?: string;
  user?: User & {
    tripCreator: TripCreator[];
  };
  accessToken?: string;
}

export const krRegionToCode = {
  서울특별시: 11,
  부산광역시: 26,
  대구광역시: 27,
  인천광역시: 28,
  광주광역시: 29,
  대전광역시: 30,
  울산광역시: 31,
  세종특별자치시: 36,
  경기도: 41,
  강원도: 42,
  충청북도: 43,
  충청남도: 44,
  전라북도: 45,
  전라남도: 46,
  경상북도: 47,
  경상남도: 48,
  제주특별자치도: 50,
  '서울특별시 종로구': 11110,
  '서울특별시 중구': 11140,
  '서울특별시 용산구': 11170,
  '서울특별시 성동구': 11200,
  '서울특별시 광진구': 11215,
  '서울특별시 동대문구': 11230,
  '서울특별시 중랑구': 11260,
  '서울특별시 성북구': 11290,
  '서울특별시 강북구': 11305,
  '서울특별시 도봉구': 11320,
  '서울특별시 노원구': 11350,
  '서울특별시 은평구': 11380,
  '서울특별시 서대문구': 11410,
  '서울특별시 마포구': 11440,
  '서울특별시 양천구': 11470,
  '서울특별시 강서구': 11500,
  '서울특별시 구로구': 11530,
  '서울특별시 금천구': 11545,
  '서울특별시 영등포구': 11560,
  '서울특별시 동작구': 11590,
  '서울특별시 관악구': 11620,
  '서울특별시 서초구': 11650,
  '서울특별시 강남구': 11680,
  '서울특별시 송파구': 11710,
  '서울특별시 강동구': 11740,
  '부산광역시 중구': 26110,
  '부산광역시 서구': 26140,
  '부산광역시 동구': 26170,
  '부산광역시 영도구': 26200,
  '부산광역시 부산진구': 26230,
  '부산광역시 동래구': 26260,
  '부산광역시 남구': 26290,
  '부산광역시 북구': 26320,
  '부산광역시 해운대구': 26350,
  '부산광역시 사하구': 26380,
  '부산광역시 금정구': 26410,
  '부산광역시 강서구': 26440,
  '부산광역시 연제구': 26470,
  '부산광역시 수영구': 26500,
  '부산광역시 사상구': 26530,
  '부산광역시 기장군': 26710,
  '대구광역시 중구': 27110,
  '대구광역시 동구': 27140,
  '대구광역시 서구': 27170,
  '대구광역시 남구': 27200,
  '대구광역시 북구': 27230,
  '대구광역시 수성구': 27260,
  '대구광역시 달서구': 27290,
  '대구광역시 달성군': 27710,
  '인천광역시 중구': 28110,
  '인천광역시 동구': 28140,
  '인천광역시 미추홀구': 28177,
  '인천광역시 연수구': 28185,
  '인천광역시 남동구': 28200,
  '인천광역시 부평구': 28237,
  '인천광역시 계양구': 28245,
  '인천광역시 서구': 28260,
  '인천광역시 강화군': 28710,
  '인천광역시 옹진군': 28720,
  '광주광역시 동구': 29110,
  '광주광역시 서구': 29140,
  '광주광역시 남구': 29155,
  '광주광역시 북구': 29170,
  '광주광역시 광산구': 29200,
  '대전광역시 동구': 30110,
  '대전광역시 중구': 30140,
  '대전광역시 서구': 30170,
  '대전광역시 유성구': 30200,
  '대전광역시 대덕구': 30230,
  '울산광역시 중구': 31110,
  '울산광역시 남구': 31140,
  '울산광역시 동구': 31170,
  '울산광역시 북구': 31200,
  '울산광역시 울주군': 31710,
  '경기도 수원시': 41110,
  '경기도 수원시 장안구': 41111,
  '경기도 수원시 권선구': 41113,
  '경기도 수원시 팔달구': 41115,
  '경기도 수원시 영통구': 41117,
  '경기도 성남시': 41130,
  '경기도 성남시 수정구': 41131,
  '경기도 성남시 중원구': 41133,
  '경기도 성남시 분당구': 41135,
  '경기도 의정부시': 41150,
  '경기도 안양시': 41170,
  '경기도 안양시 만안구': 41171,
  '경기도 안양시 동안구': 41173,
  '경기도 부천시': 41190,
  '경기도 광명시': 41210,
  '경기도 평택시': 41220,
  '경기도 동두천시': 41250,
  '경기도 안산시': 41270,
  '경기도 안산시 상록구': 41271,
  '경기도 안산시 단원구': 41273,
  '경기도 고양시': 41280,
  '경기도 고양시 덕양구': 41281,
  '경기도 고양시 일산동구': 41285,
  '경기도 고양시 일산서구': 41287,
  '경기도 과천시': 41290,
  '경기도 구리시': 41310,
  '경기도 남양주시': 41360,
  '경기도 오산시': 41370,
  '경기도 시흥시': 41390,
  '경기도 군포시': 41410,
  '경기도 의왕시': 41430,
  '경기도 하남시': 41450,
  '경기도 용인시': 41460,
  '경기도 용인시 처인구': 41461,
  '경기도 용인시 기흥구': 41463,
  '경기도 용인시 수지구': 41465,
  '경기도 파주시': 41480,
  '경기도 이천시': 41500,
  '경기도 안성시': 41550,
  '경기도 김포시': 41570,
  '경기도 화성시': 41590,
  '경기도 광주시': 41610,
  '경기도 양주시': 41630,
  '경기도 포천시': 41650,
  '경기도 여주시': 41670,
  '경기도 연천군': 41800,
  '경기도 가평군': 41820,
  '경기도 양평군': 41830,
  '강원도 춘천시': 42110,
  '강원도 원주시': 42130,
  '강원도 강릉시': 42150,
  '강원도 동해시': 42170,
  '강원도 태백시': 42190,
  '강원도 속초시': 42210,
  '강원도 삼척시': 42230,
  '강원도 홍천군': 42720,
  '강원도 횡성군': 42730,
  '강원도 영월군': 42750,
  '강원도 평창군': 42760,
  '강원도 정선군': 42770,
  '강원도 철원군': 42780,
  '강원도 화천군': 42790,
  '강원도 양구군': 42800,
  '강원도 인제군': 42810,
  '강원도 고성군': 42820,
  '강원도 양양군': 42830,
  '충청북도 청주시': 43110,
  '충청북도 청주시 상당구': 43111,
  '충청북도 청주시 서원구': 43112,
  '충청북도 청주시 흥덕구': 43113,
  '충청북도 청주시 청원구': 43114,
  '충청북도 충주시': 43130,
  '충청북도 제천시': 43150,
  '충청북도 보은군': 43720,
  '충청북도 옥천군': 43730,
  '충청북도 영동군': 43740,
  '충청북도 증평군': 43745,
  '충청북도 진천군': 43750,
  '충청북도 괴산군': 43760,
  '충청북도 음성군': 43770,
  '충청북도 단양군': 43800,
  '충청남도 천안시': 44130,
  '충청남도 천안시 동남구': 44131,
  '충청남도 천안시 서북구': 44133,
  '충청남도 공주시': 44150,
  '충청남도 보령시': 44180,
  '충청남도 아산시': 44200,
  '충청남도 서산시': 44210,
  '충청남도 논산시': 44230,
  '충청남도 계룡시': 44250,
  '충청남도 당진시': 44270,
  '충청남도 금산군': 44710,
  '충청남도 부여군': 44760,
  '충청남도 서천군': 44770,
  '충청남도 청양군': 44790,
  '충청남도 홍성군': 44800,
  '충청남도 예산군': 44810,
  '충청남도 태안군': 44825,
  '전라북도 전주시': 45110,
  '전라북도 전주시 완산구': 45111,
  '전라북도 전주시 덕진구': 45113,
  '전라북도 군산시': 45130,
  '전라북도 익산시': 45140,
  '전라북도 정읍시': 45180,
  '전라북도 남원시': 45190,
  '전라북도 김제시': 45210,
  '전라북도 완주군': 45710,
  '전라북도 진안군': 45720,
  '전라북도 무주군': 45730,
  '전라북도 장수군': 45740,
  '전라북도 임실군': 45750,
  '전라북도 순창군': 45770,
  '전라북도 고창군': 45790,
  '전라북도 부안군': 45800,
  '전라남도 목포시': 46110,
  '전라남도 여수시': 46130,
  '전라남도 순천시': 46150,
  '전라남도 나주시': 46170,
  '전라남도 광양시': 46230,
  '전라남도 담양군': 46710,
  '전라남도 곡성군': 46720,
  '전라남도 구례군': 46730,
  '전라남도 고흥군': 46770,
  '전라남도 보성군': 46780,
  '전라남도 화순군': 46790,
  '전라남도 장흥군': 46800,
  '전라남도 강진군': 46810,
  '전라남도 해남군': 46820,
  '전라남도 영암군': 46830,
  '전라남도 무안군': 46840,
  '전라남도 함평군': 46860,
  '전라남도 영광군': 46870,
  '전라남도 장성군': 46880,
  '전라남도 완도군': 46890,
  '전라남도 진도군': 46900,
  '전라남도 신안군': 46910,
  '경상북도 포항시': 47110,
  '경상북도 포항시 남구': 47111,
  '경상북도 포항시 북구': 47113,
  '경상북도 경주시': 47130,
  '경상북도 김천시': 47150,
  '경상북도 안동시': 47170,
  '경상북도 구미시': 47190,
  '경상북도 영주시': 47210,
  '경상북도 영천시': 47230,
  '경상북도 상주시': 47250,
  '경상북도 문경시': 47280,
  '경상북도 경산시': 47290,
  '경상북도 군위군': 47720,
  '경상북도 의성군': 47730,
  '경상북도 청송군': 47750,
  '경상북도 영양군': 47760,
  '경상북도 영덕군': 47770,
  '경상북도 청도군': 47820,
  '경상북도 고령군': 47830,
  '경상북도 성주군': 47840,
  '경상북도 칠곡군': 47850,
  '경상북도 예천군': 47900,
  '경상북도 봉화군': 47920,
  '경상북도 울진군': 47930,
  '경상북도 울릉군': 47940,
  '경상남도 창원시': 48120,
  '경상남도 창원시 의창구': 48121,
  '경상남도 창원시 성산구': 48123,
  '경상남도 창원시 마산합포구': 48125,
  '경상남도 창원시 마산회원구': 48127,
  '경상남도 창원시 진해구': 48129,
  '경상남도 진주시': 48170,
  '경상남도 통영시': 48220,
  '경상남도 사천시': 48240,
  '경상남도 김해시': 48250,
  '경상남도 밀양시': 48270,
  '경상남도 거제시': 48310,
  '경상남도 양산시': 48330,
  '경상남도 의령군': 48720,
  '경상남도 함안군': 48730,
  '경상남도 창녕군': 48740,
  '경상남도 고성군': 48820,
  '경상남도 남해군': 48840,
  '경상남도 하동군': 48850,
  '경상남도 산청군': 48860,
  '경상남도 함양군': 48870,
  '경상남도 거창군': 48880,
  '경상남도 합천군': 48890,
  '제주특별자치도 제주시': 50110,
  '제주특별자치도 서귀포시': 50130,
};

export const krCodeToRegion = {
  11: '서울특별시',
  26: '부산광역시',
  27: '대구광역시',
  28: '인천광역시',
  29: '광주광역시',
  30: '대전광역시',
  31: '울산광역시',
  36: '세종특별자치시',
  41: '경기도',
  42: '강원도',
  43: '충청북도',
  44: '충청남도',
  45: '전라북도',
  46: '전라남도',
  47: '경상북도',
  48: '경상남도',
  50: '제주특별자치도',
  11110: '종로구',
  11140: '중구',
  11170: '용산구',
  11200: '성동구',
  11215: '광진구',
  11230: '동대문구',
  11260: '중랑구',
  11290: '성북구',
  11305: '강북구',
  11320: '도봉구',
  11350: '노원구',
  11380: '은평구',
  11410: '서대문구',
  11440: '마포구',
  11470: '양천구',
  11500: '강서구',
  11530: '구로구',
  11545: '금천구',
  11560: '영등포구',
  11590: '동작구',
  11620: '관악구',
  11650: '서초구',
  11680: '강남구',
  11710: '송파구',
  11740: '강동구',
  26110: '중구',
  26140: '서구',
  26170: '동구',
  26200: '영도구',
  26230: '부산진구',
  26260: '동래구',
  26290: '남구',
  26320: '북구',
  26350: '해운대구',
  26380: '사하구',
  26410: '금정구',
  26440: '강서구',
  26470: '연제구',
  26500: '수영구',
  26530: '사상구',
  26710: '기장군',
  27110: '중구',
  27140: '동구',
  27170: '서구',
  27200: '남구',
  27230: '북구',
  27260: '수성구',
  27290: '달서구',
  27710: '달성군',
  28110: '중구',
  28140: '동구',
  28177: '미추홀구',
  28185: '연수구',
  28200: '남동구',
  28237: '부평구',
  28245: '계양구',
  28260: '서구',
  28710: '강화군',
  28720: '옹진군',
  29110: '동구',
  29140: '서구',
  29155: '남구',
  29170: '북구',
  29200: '광산구',
  30110: '동구',
  30140: '중구',
  30170: '서구',
  30200: '유성구',
  30230: '대덕구',
  31110: '중구',
  31140: '남구',
  31170: '동구',
  31200: '북구',
  31710: '울주군',
  41110: '수원시',
  // 41111: '수원시 장안구',
  // 41113: '수원시 권선구',
  // 41115: '수원시 팔달구',
  // 41117: '수원시 영통구',
  41130: '성남시',
  // 41131: '성남시 수정구',
  // 41133: '성남시 중원구',
  // 41135: '성남시 분당구',
  41150: '의정부시',
  41170: '안양시',
  // 41171: '안양시 만안구',
  // 41173: '안양시 동안구',
  41190: '부천시',
  41210: '광명시',
  41220: '평택시',
  41250: '동두천시',
  41270: '안산시',
  // 41271: '안산시 상록구',
  // 41273: '안산시 단원구',
  41280: '고양시',
  // 41281: '고양시 덕양구',
  // 41285: '고양시 일산동구',
  // 41287: '고양시 일산서구',
  41290: '과천시',
  41310: '구리시',
  41360: '남양주시',
  41370: '오산시',
  41390: '시흥시',
  41410: '군포시',
  41430: '의왕시',
  41450: '하남시',
  41460: '용인시',
  // 41461: '용인시 처인구',
  // 41463: '용인시 기흥구',
  // 41465: '용인시 수지구',
  41480: '파주시',
  41500: '이천시',
  41550: '안성시',
  41570: '김포시',
  41590: '화성시',
  41610: '광주시',
  41630: '양주시',
  41650: '포천시',
  41670: '여주시',
  41800: '연천군',
  41820: '가평군',
  41830: '양평군',
  42110: '춘천시',
  42130: '원주시',
  42150: '강릉시',
  42170: '동해시',
  42190: '태백시',
  42210: '속초시',
  42230: '삼척시',
  42720: '홍천군',
  42730: '횡성군',
  42750: '영월군',
  42760: '평창군',
  42770: '정선군',
  42780: '철원군',
  42790: '화천군',
  42800: '양구군',
  42810: '인제군',
  42820: '고성군',
  42830: '양양군',
  43110: '청주시',
  // 43111: '청주시 상당구',
  // 43112: '청주시 서원구',
  // 43113: '청주시 흥덕구',
  // 43114: '청주시 청원구',
  43130: '충주시',
  43150: '제천시',
  43720: '보은군',
  43730: '옥천군',
  43740: '영동군',
  43745: '증평군',
  43750: '진천군',
  43760: '괴산군',
  43770: '음성군',
  43800: '단양군',
  44130: '천안시',
  // 44131: '천안시 동남구',
  // 44133: '천안시 서북구',
  44150: '공주시',
  44180: '보령시',
  44200: '아산시',
  44210: '서산시',
  44230: '논산시',
  44250: '계룡시',
  44270: '당진시',
  44710: '금산군',
  44760: '부여군',
  44770: '서천군',
  44790: '청양군',
  44800: '홍성군',
  44810: '예산군',
  44825: '태안군',
  45110: '전주시',
  // 45111: '전주시 완산구',
  // 45113: '전주시 덕진구',
  45130: '군산시',
  45140: '익산시',
  45180: '정읍시',
  45190: '남원시',
  45210: '김제시',
  45710: '완주군',
  45720: '진안군',
  45730: '무주군',
  45740: '장수군',
  45750: '임실군',
  45770: '순창군',
  45790: '고창군',
  45800: '부안군',
  46110: '목포시',
  46130: '여수시',
  46150: '순천시',
  46170: '나주시',
  46230: '광양시',
  46710: '담양군',
  46720: '곡성군',
  46730: '구례군',
  46770: '고흥군',
  46780: '보성군',
  46790: '화순군',
  46800: '장흥군',
  46810: '강진군',
  46820: '해남군',
  46830: '영암군',
  46840: '무안군',
  46860: '함평군',
  46870: '영광군',
  46880: '장성군',
  46890: '완도군',
  46900: '진도군',
  46910: '신안군',
  47110: '포항시',
  // 47111: '포항시 남구',
  // 47113: '포항시 북구',
  47130: '경주시',
  47150: '김천시',
  47170: '안동시',
  47190: '구미시',
  47210: '영주시',
  47230: '영천시',
  47250: '상주시',
  47280: '문경시',
  47290: '경산시',
  47720: '군위군',
  47730: '의성군',
  47750: '청송군',
  47760: '영양군',
  47770: '영덕군',
  47820: '청도군',
  47830: '고령군',
  47840: '성주군',
  47850: '칠곡군',
  47900: '예천군',
  47920: '봉화군',
  47930: '울진군',
  47940: '울릉군',
  48120: '창원시',
  // 48121: '창원시 의창구',
  // 48123: '창원시 성산구',
  // 48125: '창원시 마산합포구',
  // 48127: '창원시 마산회원구',
  // 48129: '창원시 진해구',
  48170: '진주시',
  48220: '통영시',
  48240: '사천시',
  48250: '김해시',
  48270: '밀양시',
  48310: '거제시',
  48330: '양산시',
  48720: '의령군',
  48730: '함안군',
  48740: '창녕군',
  48820: '고성군',
  48840: '남해군',
  48850: '하동군',
  48860: '산청군',
  48870: '함양군',
  48880: '거창군',
  48890: '합천군',
  50110: '제주시',
  50130: '서귀포시',
};
