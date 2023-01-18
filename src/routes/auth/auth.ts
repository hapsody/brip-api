import express, { Express, NextFunction } from 'express';
import prisma from '@src/prisma';
import {
  ibDefs,
  asyncWrapper,
  genBcryptHash,
  IBResFormat,
  accessTokenValidCheck,
  IBError,
  AccessTokenPayload,
  RefreshTokenPayload,
} from '@src/utils';
import _, { isEmpty, isEqual } from 'lodash';
import jwt from 'jsonwebtoken';
import passport from 'passport';
import { User } from '@prisma/client';
import axios, { Method } from 'axios';
import CryptoJS from 'crypto-js';

const authRouter: express.Application = express();

export interface SaveScheduleResponsePayload {
  token: string;
  refreshToken: string;
  nickName: string;
  userId: number;
  email: string;
}

export interface SignInRequest {
  email: string;
  password: string;
}

export type SignInResponse = Omit<IBResFormat, 'IBparams'> & {
  IBparams: SaveScheduleResponsePayload | {};
};

export const signIn = (
  req: Express.IBTypedReqBody<SignInRequest>,
  res: Express.IBTypedResponse<SignInResponse>,
  next: NextFunction,
): void => {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  passport.authenticate(
    'local',
    (err: Error, user: User, info: { message: string }) => {
      if (err) {
        console.error(err);
        res.status(500).json({
          ...ibDefs.UNEXPECTED,
        });
        next(err);
        return;
      }
      if (!user) {
        console.log(info);
        if (info.message === 'Incorrect username.') {
          res.status(404).json({
            ...ibDefs.NOTEXISTDATA,
            IBdetail: info.message,
          });
          return;
        }
        if (info.message === 'Incorrect password.') {
          res.status(404).json({
            ...ibDefs.NOTMATCHEDDATA,
            IBdetail: info.message,
          });
          return;
        }

        if (info.message === 'Missing credentials') {
          res.status(400).json({
            ...ibDefs.INVALIDPARAMS,
            IBdetail: info.message,
          });
          // next();
          return;
        }
        res.status(500).json({
          ...ibDefs.UNEXPECTED,
        });
        next();
        return;
      }

      // const randNo = Math.random().toString().substr(2, 6);
      const accessTokenPayload: AccessTokenPayload = {
        grade: 'member',
        email: user.email,
        tokenId: user.userTokenId,
      };
      const accessToken = jwt.sign(
        // { email: user.email, randNo },
        accessTokenPayload,
        process.env.JWT_SECRET || 'test_secret',
        {
          expiresIn: '14d',
          // expiresIn: '1s',
        },
      );

      const refreshTokenPayload: RefreshTokenPayload = {
        email: user.email,
        refTk: true,
        // randNo
      };

      // const expiration = 1000;
      const refreshToken = jwt.sign(
        refreshTokenPayload,
        process.env.JWT_SECRET || 'test_secret',
        {
          expiresIn: '60d',
        },
      );

      // const refreshExpiration = 1000 * 3600 * 24 * 30;
      // res.cookie('refreshToken', refreshToken, {
      //   expires: new Date(new Date().getTime() + refreshExpiration),
      //   httpOnly: true,
      //   signed: true,
      //   // secure: true,
      // });

      res.status(200).json({
        ...ibDefs.SUCCESS,
        IBparams: {
          token: accessToken,
          refreshToken,
          nickName: user.nickName,
          userId: user.id,
          email: user.email,
        },
      });
    },
  )(req, res, next);

  // return res.status(200).send('hello world');
};

export type SignUpRequestType = {
  id: string;
  password: string;
  phone: string;
  phoneAuthCode: string;
  nickName: string;
  cc: string;
  // userToken: string;
};
export type SignUpResponseType = Omit<IBResFormat, 'IBparams'> & {
  IBparams: User | {};
};

export const signUp = asyncWrapper(
  async (
    req: Express.IBTypedReqBody<SignUpRequestType>,
    res: Express.IBTypedResponse<SignUpResponseType>,
  ) => {
    if (isEmpty(req.body)) {
      res.status(400).json({
        ...ibDefs.INVALIDPARAMS,
        IBdetail: `파라미터가 제공되지 않았습니다.`,
      });
      return;
    }

    const {
      locals,
      body: {
        id: email,
        password,
        phone,
        phoneAuthCode,
        nickName,
        cc: countryCode,
        // userToken,
      },
    } = req;

    const emptyCheckArr: string[] = [];
    if (isEmpty(email)) emptyCheckArr.push('id');
    if (isEmpty(password)) emptyCheckArr.push('password');
    if (isEmpty(phone)) emptyCheckArr.push('phone');
    if (isEmpty(phoneAuthCode)) emptyCheckArr.push('phoneAuthCode');
    if (isEmpty(nickName)) emptyCheckArr.push('nickName');
    if (isEmpty(countryCode)) emptyCheckArr.push('countryCode');
    // if (isEmpty(userToken)) emptyCheckArr.push('userToken');
    if (!isEmpty(emptyCheckArr)) {
      res.status(400).json({
        ...ibDefs.INVALIDPARAMS,
        IBdetail: `${emptyCheckArr.toString()} 파라미터가 제공되지 않았습니다.`,
      });
      return;
    }

    const hash = genBcryptHash(password);
    const preCheckIfAlreadyExist = await prisma.user.findFirst({
      where: {
        email,
      },
    });

    if (!isEmpty(preCheckIfAlreadyExist)) {
      res.status(409).json({ ...ibDefs.DUPLICATEDDATA });
      return;
    }

    if (locals && locals.grade === 'member') {
      res.status(409).json({ ...ibDefs.NOTAUTHORIZED });
      return;
    }

    const createdUser = await prisma.user.create({
      data: {
        email,
        password: hash,
        phone,
        nickName,
        countryCode,
        userTokenId: locals?.tokenId?.toString() ?? 'error',
      },
    });
    const userWithoutPw = _.omit(createdUser, ['password']);

    res.json({
      ...ibDefs.SUCCESS,
      IBparams: userWithoutPw,
    });
  },
);

export type ReqNonMembersUserTokenRequestType = {};
export interface ReqNonMembersUserTokenSuccessResType {
  userToken: string;
}

export type ReqNonMembersUserTokenResType = Omit<IBResFormat, 'IBparams'> & {
  IBparams: ReqNonMembersUserTokenSuccessResType | {};
};

/**
 * 비회원일 경우도 DB에 저장되는 모든 데이터들의 소유자를 특정할수 있도록
 * tokenId를 payload로 갖는 일종의 accessToken을 부여하는데
 * reqNonMembersUserToken을 통해 유저 레벨의 api함수를 사용하기 위해
 * 비회원이 사용할수 있는 비회원용 고유 토큰을 요청한다.
 */
export const reqNonMembersUserToken = asyncWrapper(
  async (
    req: Express.IBTypedReqBody<ReqNonMembersUserTokenRequestType>,
    res: Express.IBTypedResponse<ReqNonMembersUserTokenResType>,
  ) => {
    try {
      if (isEmpty(process.env.JWT_SECRET)) {
        throw new IBError({ type: 'INVALIDENVPARAMS', message: '' });
      }

      const newOne = await prisma.nonMembersCount.create({
        data: {},
      });

      const accessTokenPayload: AccessTokenPayload = {
        grade: 'nonMember',
        tokenId: newOne.id.toString(),
      };
      const userToken = jwt.sign(
        accessTokenPayload,
        process.env.JWT_SECRET as string,
      );

      res.json({
        ...ibDefs.SUCCESS,
        IBparams: {
          userToken,
        },
      });
    } catch (err) {
      if (err instanceof IBError) {
        if (err.type === 'INVALIDENVPARAMS') {
          res.status(500).json({
            ...ibDefs.INVALIDENVPARAMS,
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

export type RefreshAccessTokenRequestType = {
  userId: string;
  refreshToken: string;
};
export interface RefreshAccessTokenSuccessResType {
  token: string;
  userId: number;
  email: string;
  nickName: string;
}

export type RefreshAccessTokenResType = Omit<IBResFormat, 'IBparams'> & {
  IBparams: RefreshAccessTokenSuccessResType | {};
};

/**
 * 비회원일 경우도 DB에 저장되는 모든 데이터들의 소유자를 특정할수 있도록
 * tokenId를 payload로 갖는 일종의 accessToken을 부여하는데
 * reqNonMembersUserToken을 통해 유저 레벨의 api함수를 사용하기 위해
 * 비회원이 사용할수 있는 비회원용 고유 토큰을 요청한다.
 */
export const refreshAccessToken = asyncWrapper(
  async (
    req: Express.IBTypedReqBody<RefreshAccessTokenRequestType>,
    res: Express.IBTypedResponse<RefreshAccessTokenResType>,
  ) => {
    try {
      if (isEmpty(process.env.JWT_SECRET)) {
        throw new IBError({ type: 'INVALIDENVPARAMS', message: '' });
      }

      const { userId, refreshToken } = req.body;
      if (isEmpty(userId) || isEmpty(refreshToken)) {
        res.json({
          ...ibDefs.INVALIDPARAMS,
        });

        throw new IBError({
          type: 'INVALIDENVPARAMS',
          message: 'userId와 refreshToken 파라미터가 필요합니다.',
        });
      }

      let payload: RefreshTokenPayload | {} = {};
      try {
        payload = jwt.verify(refreshToken, process.env.JWT_SECRET as string);
      } catch (e) {
        if (isEqual((e as Error).name, 'TokenExpiredError')) {
          throw new IBError({
            type: 'TOKENEXPIRED',
            message: '',
          });
        }
      }

      if (isEmpty(payload) || !(payload as RefreshTokenPayload).refTk) {
        throw new IBError({
          type: 'NOTREFRESHTOKEN',
          message: 'refreshToken이 아닙니다.',
        });
      }

      const user = await prisma.user.findUnique({
        where: {
          email: (payload as RefreshTokenPayload).email,
        },
      });

      if (isEmpty(user)) {
        throw new IBError({
          type: 'NOTMATCHEDDATA',
          message:
            'refreshToken payload에 실린 email은 존재하지 않는 email 이거나, refreshToken과 유저 email 정보가 일치하지 않습니다.',
        });
      }

      const accessTokenPayload: AccessTokenPayload = {
        grade: 'member',
        email: user.email,
        tokenId: user.userTokenId,
      };
      const accessToken = jwt.sign(
        // { email: user.email, randNo },
        accessTokenPayload,
        process.env.JWT_SECRET || 'test_secret',
        {
          expiresIn: '14d',
        },
      );

      res.json({
        ...ibDefs.SUCCESS,
        IBparams: {
          token: accessToken,
          userId: user.id,
          email: user.email,
          nickName: user.nickName,
        },
      });
      return;
    } catch (err) {
      if (err instanceof IBError) {
        if (err.type === 'INVALIDENVPARAMS') {
          res.status(500).json({
            ...ibDefs.INVALIDENVPARAMS,
            IBdetail: (err as Error).message,
            IBparams: {} as object,
          });
          return;
        }
        if (err.type === 'INVALIDPARAMS') {
          res.status(400).json({
            ...ibDefs.INVALIDPARAMS,
            IBdetail: (err as Error).message,
            IBparams: {} as object,
          });
          return;
        }
        if (err.type === 'TOKENEXPIRED') {
          res.status(401).json({
            ...ibDefs.TOKENEXPIRED,
            IBdetail: (err as Error).message,
            IBparams: {} as object,
          });
          return;
        }

        if (err.type === 'NOTREFRESHTOKEN') {
          res.status(401).json({
            ...ibDefs.NOTREFRESHTOKEN,
            IBdetail: (err as Error).message,
            IBparams: {} as object,
          });
          return;
        }

        if (err.type === 'NOTMATCHEDDATA') {
          res.status(404).json({
            ...ibDefs.NOTMATCHEDDATA,
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

export type SendSMSAuthCodeREQParam = {
  userId: string;
  refreshToken: string;
};
export interface SendSMSAuthCodeRETParamPayload {
  token: string;
  userId: number;
  email: string;
  nickName: string;
}

export type SendSMSAuthCodeRETParam = Omit<IBResFormat, 'IBparams'> & {
  IBparams: SendSMSAuthCodeRETParamPayload | {};
};

/**
 * 인증번호 발송
 *
 */
export const sendSMSAuthCode = asyncWrapper(
  async (
    req: Express.IBTypedReqBody<SendSMSAuthCodeREQParam>,
    res: Express.IBTypedResponse<SendSMSAuthCodeRETParam>,
  ) => {
    try {
      const { locals } = req;
      const userTokenId = (() => {
        if (locals && locals?.grade === 'member')
          return locals?.user?.userTokenId;
        return locals?.tokenId;
      })();

      if (!userTokenId) {
        throw new IBError({
          type: 'NOTEXISTDATA',
          message: '정상적으로 부여된 userTokenId를 가지고 있지 않습니다.',
        });
      }

      const timestamp = `${new Date().getTime().toString()}`; // current timestamp (epoch)
      const makeSignature = () => {
        const space = ' '; // one space
        const newLine = '\n'; // new line
        const method = 'POST'; // method
        const url = `/sms/v2/services/${
          process.env.NAVER_SENS_SERVICE_ID as string
        }/messages`; // url (include query string)
        // const timestamp = `${new Date().getTime()}`; // current timestamp (epoch)
        const accessKey = `${process.env.NAVER_PLATFORM_ACCESS_KEY as string}`; // access key id (from portal or Sub Account)
        const secretKey = `${process.env.NAVER_PLATFORM_SECRET_KEY as string}`; // secret key (from portal or Sub Account)

        const hmac = CryptoJS.algo.HMAC.create(CryptoJS.algo.SHA256, secretKey);
        hmac.update(method);
        hmac.update(space);
        hmac.update(url);
        hmac.update(newLine);
        hmac.update(timestamp);
        hmac.update(newLine);
        hmac.update(accessKey);
        const hash = hmac.finalize();
        const signature = hash.toString(CryptoJS.enc.Base64);
        return signature;
      };

      const signature = makeSignature();
      const smsResult: Partial<{
        name: string;
        config: {
          data: string;
          headers: object;
        };
        status: number;
        statusText: string;
        data: {
          requestId: string;
          requestTime: string;
          statusCode: string;
          statusName: string;
        };
      }> = await axios.request({
        method: 'POST' as Method,
        url: `https://sens.apigw.ntruss.com/sms/v2/services/${
          process.env.NAVER_SENS_SERVICE_ID as string
        }/messages`,

        headers: {
          'Content-Type': 'application/json',
          'x-ncp-iam-access-key': `${
            process.env.NAVER_PLATFORM_ACCESS_KEY as string
          }`,
          'x-ncp-apigw-signature-v2': signature,
          'x-ncp-apigw-timestamp': timestamp,
        },
        data: {
          type: 'SMS',
          contentType: 'COMM',
          countryCode: '82',
          from: `${process.env.NAVER_SENS_CALLING_NUMBER as string}`,
          content: '테스트입니다.',
          messages: [
            {
              to: '01020595137',
              subject: '테스트제목',
              content: '테스트 컨텐츠',
            },
          ],
        },
      });

      const { status, statusText } = smsResult;
      if (status !== 202 || statusText !== 'Accepted') {
        throw new IBError({
          type: 'EXTERNALAPI',
          message: `SMS API 호출 에러`,
        });
      }

      res.json({
        ...ibDefs.SUCCESS,
        IBparams: {},
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
        if (err.type === 'NOTEXISTDATA') {
          res.status(202).json({
            ...ibDefs.NOTEXISTDATA,
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

export const authGuardTest = (
  req: Express.IBTypedReqBody<{
    testParam: string;
  }>,
  res: Express.IBTypedResponse<IBResFormat>,
): void => {
  const {
    locals,
    body: { testParam },
  } = req;

  console.log(locals);

  res.json({
    ...ibDefs.SUCCESS,
    IBparams: {
      ...locals,
      testParam,
    },
  });
};

// export const somethingFunc = asyncWrapper(
//   async (req: Request, res: Response, next: NextFunction) => {
//     /**
//      * do some async works in somethingFunc
//      */
//     /*
//      * somethingFunc-somethingHandler 예제와 같이 라우터 컨트롤러를 복수개 유지할 경우
//      * 다음 컨트롤러 함수로 변수를 넘길때 이용은 아래와 같이
//      * req 의 프로퍼티를 만들어 넘기는 것으로 한다.
//      * req.locals = {
//      *    resMessages: {
//      *    ...ibDefs.SUCCESS,
//      *  },
//      * };
//      * next(); // run next to somethingHandler...
//      */
//   },
// );
// authRouter.post('/somethingPath', somethingFunc, somethingHandler);

authRouter.post('/signIn', signIn);
authRouter.post('/signUp', accessTokenValidCheck, signUp);
authRouter.post('/authGuardTest', accessTokenValidCheck, authGuardTest);
authRouter.post('/reqNonMembersUserToken', reqNonMembersUserToken);
authRouter.post('/refreshAccessToken', refreshAccessToken);
authRouter.post('/sendSMSAuthCode', accessTokenValidCheck, sendSMSAuthCode);

export default authRouter;
