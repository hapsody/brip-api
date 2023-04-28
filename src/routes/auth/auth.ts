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
import _, { isEmpty, isEqual, isNil } from 'lodash';
import jwt from 'jsonwebtoken';
import passport from 'passport';
import { User, TripCreator } from '@prisma/client';
import axios, { Method } from 'axios';
import CryptoJS from 'crypto-js';
import moment from 'moment';
import { compare } from 'bcrypt';
import randomstring from 'randomstring';

const authRouter: express.Application = express();

export interface SaveScheduleResponsePayload {
  token: string;
  refreshToken: string;
  nickName: string;
  userId: number;
  email: string;
  isCreator: boolean;
  isTempPasswd: boolean;
  pleaseUpdatePasswd: boolean;
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
    (
      err: Error,
      user: User & { tripCreator: TripCreator[] },
      info: { message: string },
    ) => {
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
        if (info.message === 'Expired Password.') {
          res.status(400).json({
            ...ibDefs.EXPIREDDATA,
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
          isCreator: !isEmpty(user.tripCreator),
          isTempPasswd: !isNil(user.pwExpireDate),
          /// 마지막 비밀번호 변경일로부터 180일 이상 경과한 경우 true
          pleaseUpdatePasswd:
            moment().diff(moment(user.pwLastUpdateDate), 'days') > 180,
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
  IBparams: Omit<User, 'password'> | {};
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

    const interCode = phone.split('-')[0].slice(1);
    const formattedPhone = phone.split('-').reduce((acc, cur) => {
      if (cur.includes('+')) return acc;
      return `${acc}${cur}`;
    }, '');
    const userWithoutPw = await prisma.$transaction(async tx => {
      const smsAuthCode = await tx.sMSAuthCode.findMany({
        where: {
          phone: `+${interCode}-${formattedPhone}`,
          code: phoneAuthCode,
          userTokenId,
        },
        orderBy: {
          id: 'desc',
        },
      });

      if (smsAuthCode.length === 0) {
        throw new IBError({
          type: 'NOTEXISTDATA',
          message:
            '해당 번호와 코드가 일치하는 문자 인증 요청 내역이 존재하지 않습니다.',
        });
      }

      await tx.sMSAuthCode.deleteMany({
        where: {
          OR: [{ phone }, { userTokenId }],
        },
      });

      const createdUser = await tx.user.create({
        data: {
          email,
          password: hash,
          pwLastUpdateDate: moment().toISOString(),
          pwExpireDate: null,
          phone,
          nickName,
          countryCode,
          userTokenId: locals?.tokenId?.toString() ?? 'error',
        },
      });
      const user = _.omit(createdUser, ['password']);
      return user;
    });

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
  phone: string;
};
export interface SendSMSAuthCodeRETParamPayload {}

export type SendSMSAuthCodeRETParam = Omit<IBResFormat, 'IBparams'> & {
  IBparams: SendSMSAuthCodeRETParamPayload | {};
};

/**
 * 문자 인증번호 발송
 *
 */
export const sendSMSAuthCode = asyncWrapper(
  async (
    req: Express.IBTypedReqBody<SendSMSAuthCodeREQParam>,
    res: Express.IBTypedResponse<SendSMSAuthCodeRETParam>,
  ) => {
    try {
      const { phone } = req.body;
      const { locals } = req;
      const userTokenId = (() => {
        if (locals && locals?.grade === 'member')
          return locals?.user?.userTokenId;
        return locals?.tokenId;
      })();

      if (isEmpty(phone)) {
        throw new IBError({
          type: 'INVALIDPARAMS',
          message: '파라미터가 제공되지 않았습니다',
        });
      }

      if (!phone.includes('+')) {
        throw new IBError({
          type: 'INVALIDPARAMS',
          message: '국제코드가 포함되어야 합니다.',
        });
      }

      if (!userTokenId) {
        throw new IBError({
          type: 'NOTEXISTDATA',
          message: '정상적으로 부여된 userTokenId를 가지고 있지 않습니다.',
        });
      }

      const randNum = Math.random().toString().substring(2, 8);
      const authCode =
        randNum.length < 6
          ? `${randNum}${Array<number>(6 - randNum.length)
              .fill(0)
              .reduce(
                (acc: string, cur: number) => `${acc}${cur.toString()}`,
                '' as string,
              )}`
          : randNum;
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

      const interCode = phone.split('-')[0].slice(1);
      const formattedPhone = phone.split('-').reduce((acc, cur) => {
        if (cur.includes('+')) return acc;
        return `${acc}${cur}`;
      }, '');

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
          countryCode: interCode,
          from: `${process.env.NAVER_SENS_CALLING_NUMBER as string}`,
          content: `brip SMS 문자인증 코드: ${authCode}`,
          messages: [
            {
              to: formattedPhone,
              subject: 'brip SMS 문자인증 코드',
              content: `brip SMS 문자인증 코드: ${authCode}`,
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

      await prisma.sMSAuthCode.create({
        data: {
          phone: `+${interCode}-${formattedPhone}`,
          code: authCode,
          userTokenId,
        },
      });

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
          res.status(404).json({
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

export type SubmitSMSAuthCodeREQParam = {
  phone: string;
  authCode: string;
};
export interface SubmitSMSAuthCodeRETParamPayload {}

export type SubmitSMSAuthCodeRETParam = Omit<IBResFormat, 'IBparams'> & {
  IBparams: SubmitSMSAuthCodeRETParamPayload | {};
};

/**
 * 문자 인증번호 제출
 *
 */
export const submitSMSAuthCode = asyncWrapper(
  async (
    req: Express.IBTypedReqBody<SubmitSMSAuthCodeREQParam>,
    res: Express.IBTypedResponse<SubmitSMSAuthCodeRETParam>,
  ) => {
    try {
      const { phone, authCode } = req.body;
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

      const interCode = phone.split('-')[0].slice(1);
      const formattedPhone = phone.split('-').reduce((acc, cur) => {
        if (cur.includes('+')) return acc;
        return `${acc}${cur}`;
      }, '');
      const smsAuthCode = await prisma.sMSAuthCode.findMany({
        where: {
          phone: `+${interCode}-${formattedPhone}`,
          code: authCode,
          userTokenId,
        },
        orderBy: {
          id: 'desc',
        },
      });

      if (smsAuthCode.length === 0) {
        throw new IBError({
          type: 'NOTEXISTDATA',
          message:
            '해당 번호와 코드가 일치하는 문자 인증 요청 내역이 존재하지 않습니다.',
        });
      }

      if (moment().diff(moment(smsAuthCode[0].updatedAt), 's') > 180) {
        throw new IBError({
          type: 'EXPIREDDATA',
          message: '인증 시간이 만료되었습니다. 다시 인증 코드를 요청해주세요',
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
          res.status(404).json({
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

export type ChangePasswordREQParam = {
  password: string;
  newPassword: string;
  authCode: string;
};
export interface ChangePasswordRETParamPayload {}

export type ChangePasswordRETParam = Omit<IBResFormat, 'IBparams'> & {
  IBparams: ChangePasswordRETParamPayload | {};
};

/**
 * 비밀번호 변경
 *
 */
export const changePassword = asyncWrapper(
  async (
    req: Express.IBTypedReqBody<ChangePasswordREQParam>,
    res: Express.IBTypedResponse<ChangePasswordRETParam>,
  ) => {
    try {
      const { password, newPassword, authCode } = req.body;
      const { locals } = req;
      const userTokenId = (() => {
        if (locals && locals?.grade === 'member')
          return locals?.user?.userTokenId;
        return null;
      })();

      if (!userTokenId) {
        throw new IBError({
          type: 'NOTEXISTDATA',
          message:
            '회원 userTokenId가 아니거나 정상적으로 부여된 userTokenId를 가지고 있지 않습니다.',
        });
      }

      const user = await prisma.user.findFirst({
        where: {
          userTokenId,
        },
        include: {
          UserPasswordHistory: true,
        },
      });

      if (!user) {
        throw new IBError({
          type: 'NOTEXISTDATA',
          message: '존재하지 않는 회원입니다.',
        });
      }

      const compareResult: Boolean = await compare(password, user.password);
      if (!compareResult) {
        throw new IBError({
          type: 'NOTMATCHEDDATA',
          message: '기존 password가 일치하지 않습니다.',
        });
      }

      const checkHistory = await (async () => {
        // eslint-disable-next-line no-restricted-syntax
        for await (const history of user.UserPasswordHistory) {
          const compareRes = await compare(newPassword, history.password);
          if (compareRes) return true;
        }
        return false;
      })();

      if (checkHistory) {
        throw new IBError({
          type: 'DUPLICATEDDATA',
          message: '사용하였던 password입니다.',
        });
      }

      const interCode = user.phone.split('-')[0].slice(1);
      const formattedPhone = user.phone.split('-').reduce((acc, cur) => {
        if (cur.includes('+')) return acc;
        return `${acc}${cur}`;
      }, '');

      const smsAuthCode = await prisma.sMSAuthCode.findMany({
        where: {
          phone: `+${interCode}-${formattedPhone}`,
          code: authCode,
          userTokenId,
        },
        orderBy: {
          id: 'desc',
        },
      });

      if (smsAuthCode.length === 0) {
        throw new IBError({
          type: 'NOTEXISTDATA',
          message:
            '회원 정보에 기재된 전화번호와 코드가 일치하는 문자 인증 요청 내역이 존재하지 않습니다.',
        });
      }

      if (moment().diff(moment(smsAuthCode[0].updatedAt), 's') > 180) {
        throw new IBError({
          type: 'EXPIREDDATA',
          message: '인증 시간이 만료되었습니다. 다시 인증 코드를 요청해주세요',
        });
      }

      const hash = genBcryptHash(newPassword);

      await prisma.$transaction(async tx => {
        await tx.user.update({
          where: {
            userTokenId,
          },
          data: {
            password: hash,
            pwExpireDate: null,
            pwLastUpdateDate: moment().toISOString(),
          },
        });

        await tx.sMSAuthCode.deleteMany({
          where: {
            OR: [{ phone: user.phone }, { userTokenId }],
          },
        });

        await tx.userPasswordHistory.create({
          data: {
            password: user.password,
            userId: user.id,
          },
        });
      });

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
          res.status(404).json({
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

export type ResetPasswordREQParam = {
  email: string;
  authCode: string;
};
export interface ResetPasswordRETParamPayload {
  newPassword: string;
}

export type ResetPasswordRETParam = Omit<IBResFormat, 'IBparams'> & {
  IBparams: ResetPasswordRETParamPayload | {};
};

/**
 * 임시 비밀번호로 reset
 *
 */
export const resetPassword = asyncWrapper(
  async (
    req: Express.IBTypedReqBody<ResetPasswordREQParam>,
    res: Express.IBTypedResponse<ResetPasswordRETParam>,
  ) => {
    try {
      const { email, authCode } = req.body;
      const { locals } = req;

      const userTokenId = (() => {
        if (locals?.grade === 'member') {
          throw new IBError({
            type: 'NOTAUTHORIZED',
            message:
              '회원 등급은 권한이 없습니다. 비회원 등급으로 재요청해주세요',
          });
        }
        if (locals?.grade === 'nonMember') return locals?.tokenId;
        return null;
      })();

      if (isNil(userTokenId)) {
        throw new IBError({
          type: 'NOTEXISTDATA',
          message: '정상적으로 부여된 비회원 tokenId를 가지고 있지 않습니다.',
        });
      }

      if (
        isNil(email) ||
        isEmpty(email) ||
        isNil(authCode) ||
        isEmpty(authCode)
      ) {
        throw new IBError({
          type: 'INVALIDPARAMS',
          message: 'email 파라미터와 authCode는 필수 제출 파라미터 입니다.',
        });
      }

      const user = await prisma.user.findFirst({
        where: {
          email,
        },
      });

      if (isNil(user)) {
        throw new IBError({
          type: 'NOTEXISTDATA',
          message: '존재하지 않는 email 입니다.',
        });
      }

      const interCode = user.phone.split('-')[0].slice(1);
      const formattedPhone = user.phone.split('-').reduce((acc, cur) => {
        if (cur.includes('+')) return acc;
        return `${acc}${cur}`;
      }, '');

      const smsAuthCode = await prisma.sMSAuthCode.findMany({
        where: {
          phone: `+${interCode}-${formattedPhone}`,
          code: authCode,
          userTokenId,
        },
        orderBy: {
          id: 'desc',
        },
      });

      if (smsAuthCode.length === 0) {
        throw new IBError({
          type: 'NOTEXISTDATA',
          message:
            '회원 정보에 기재된 전화번호와 코드가 일치하는 문자 인증 요청 내역이 존재하지 않습니다.',
        });
      }

      if (moment().diff(moment(smsAuthCode[0].updatedAt), 's') > 180) {
        throw new IBError({
          type: 'EXPIREDDATA',
          message: '인증 시간이 만료되었습니다. 다시 인증 코드를 요청해주세요',
        });
      }

      const tempPassword = randomstring.generate({ length: 12 });
      const hash = genBcryptHash(tempPassword);

      const now = moment();
      await prisma.$transaction(async tx => {
        await tx.user.update({
          where: {
            id: user.id,
          },
          data: {
            password: hash,
            pwLastUpdateDate: now.toISOString(),
            pwExpireDate: now.add(15, 'minutes').toISOString(), /// 임시비밀번호 유효시간 15분
          },
        });

        await tx.sMSAuthCode.deleteMany({
          where: {
            OR: [{ phone: user.phone }, { userTokenId }],
          },
        });
      });

      res.json({
        ...ibDefs.SUCCESS,
        IBparams: {
          newPassword: tempPassword,
        },
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
          res.status(404).json({
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
authRouter.post('/submitSMSAuthCode', accessTokenValidCheck, submitSMSAuthCode);
authRouter.post('/changePassword', accessTokenValidCheck, changePassword);
authRouter.post('/resetPassword', accessTokenValidCheck, resetPassword);

export default authRouter;
