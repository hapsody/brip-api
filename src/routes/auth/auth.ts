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
  sendEmail,
} from '@src/utils';
import _, { isEmpty, isEqual, isNil } from 'lodash';
import jwt from 'jsonwebtoken';
import passport from 'passport';
import {
  User,
  TripCreator,
  AdPlace,
  TourPlace,
  ServerVersion,
  ClientVersion,
} from '@prisma/client';
import axios, { Method, AxiosError } from 'axios';
import CryptoJS from 'crypto-js';
import moment from 'moment';
import 'moment/locale/ko';
import { compare } from 'bcrypt';
import randomstring from 'randomstring';
import redis from '@src/redis';

const authRouter: express.Application = express();

let gIamportAccessKey = '';

export interface SaveScheduleResponsePayload {
  token: string;
  refreshToken: string;
  nickName: string;
  userId: number;
  email: string;
  isCreator: boolean;
  isTempPasswd: boolean;
  pleaseUpdatePasswd: boolean;
  // isAdvertiser: boolean;
  adPlace: (Partial<AdPlace> & { tourPlace: TourPlace[] })[];
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
      user: User & { tripCreator: TripCreator[]; adPlace: { id: number }[] },
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
          console.error(err);
          res.status(404).json({
            ...ibDefs.NOTEXISTDATA,
            IBdetail: info.message,
          });
          return;
        }
        if (info.message === 'Incorrect password.') {
          console.error(err);
          res.status(404).json({
            ...ibDefs.NOTMATCHEDDATA,
            IBdetail: info.message,
          });
          return;
        }
        if (info.message === 'Expired Password.') {
          console.error(err);
          res.status(400).json({
            ...ibDefs.EXPIREDDATA,
            IBdetail: info.message,
          });
          return;
        }

        if (info.message === 'Missing credentials') {
          console.error(err);
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

          /// adPlace
          adPlace: user.adPlace,
        },
      });
    },
  )(req, res, next);

  // return res.status(200).send('hello world');
};

export type SignUpRequestType = {
  id: string;
  password: string;
  phone?: string;
  // phoneAuthCode?: string;
  impUid: string;
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
        // phoneAuthCode,
        impUid,
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
    // if (isEmpty(phoneAuthCode)) emptyCheckArr.push('phoneAuthCode');
    if (isEmpty(impUid)) emptyCheckArr.push('impUid');
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

    /// +82-1012345678
    if (
      !isNil(phone) &&
      !isEmpty(phone) &&
      !isNil(impUid) &&
      !isEmpty(impUid)
    ) {
      const identityVerificationResult = await reqAuthenticateResultToIamport(
        impUid,
      );
      if (`0${phone.split('-')[1]}` !== identityVerificationResult.phone) {
        throw new IBError({
          type: 'INVALIDPARAMS',
          message: '제출한 전화번호와 본인인증한 전화번호가 일치하지 않습니다.',
        });
      }
    }

    /// 통신사 번호인증으로 SMS 번호인증은 제거함
    // if (
    //   !isNil(phone) &&
    //   !isEmpty(phone) &&
    //   !isNil(phoneAuthCode) &&
    //   !isEmpty(phoneAuthCode)
    // ) {
    //   const interCode = phone.split('-')[0].slice(1);
    //   const formattedPhone = phone.split('-').reduce((acc, cur) => {
    //     if (cur.includes('+')) return acc;
    //     return `${acc}${cur}`;
    //   }, '');

    //   const smsAuthCode = await prisma.sMSAuthCode.findMany({
    //     where: {
    //       phone: `+${interCode}-${formattedPhone}`,
    //       // code: phoneAuthCode,
    //       userTokenId,
    //     },
    //     orderBy: {
    //       id: 'desc',
    //     },
    //   });

    //   if (smsAuthCode.length === 0) {
    //     throw new IBError({
    //       type: 'NOTEXISTDATA',
    //       message:
    //         '해당 번호와 코드가 일치하는 문자 인증 요청 내역이 존재하지 않습니다.',
    //     });
    //   }

    //   if (smsAuthCode[0].code !== phoneAuthCode) {
    //     throw new IBError({
    //       type: 'EXPIREDDATA',
    //       message: '가장 마지막으로 발송된 인증번호가 아닙니다.',
    //     });
    //   }
    // }

    const userWithoutPw = await prisma.$transaction(async tx => {
      /// 통신사 번호인증으로 SMS 번호인증은 제거함
      // if (
      //   !isNil(phone) &&
      //   !isEmpty(phone) &&
      //   !isNil(phoneAuthCode) &&
      //   !isEmpty(phoneAuthCode)
      // ) {
      //   await tx.sMSAuthCode.deleteMany({
      //     where: {
      //       OR: [{ phone }, { userTokenId }],
      //     },
      //   });
      // }

      const createdUser = await tx.user.create({
        data: {
          email,
          password: hash,
          pwLastUpdateDate: moment().toISOString(),
          pwExpireDate: null,
          // ...(!isNil(phone) &&
          //   !isEmpty(phone) &&
          //   !isNil(phoneAuthCode) &&
          //   !isEmpty(phoneAuthCode) && {
          //     phone,
          //   }),
          ...(!isNil(phone) &&
            !isEmpty(phone) && {
              phone,
            }),
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
          console.error(err);
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
    } catch (err) {
      if (err instanceof IBError) {
        if (err.type === 'INVALIDENVPARAMS') {
          console.error(err);
          res.status(500).json({
            ...ibDefs.INVALIDENVPARAMS,
            IBdetail: (err as Error).message,
            IBparams: {} as object,
          });
          return;
        }
        if (err.type === 'INVALIDPARAMS') {
          console.error(err);
          res.status(400).json({
            ...ibDefs.INVALIDPARAMS,
            IBdetail: (err as Error).message,
            IBparams: {} as object,
          });
          return;
        }
        if (err.type === 'TOKENEXPIRED') {
          console.error(err);
          res.status(401).json({
            ...ibDefs.TOKENEXPIRED,
            IBdetail: (err as Error).message,
            IBparams: {} as object,
          });
          return;
        }

        if (err.type === 'NOTREFRESHTOKEN') {
          console.error(err);
          res.status(401).json({
            ...ibDefs.NOTREFRESHTOKEN,
            IBdetail: (err as Error).message,
            IBparams: {} as object,
          });
          return;
        }

        if (err.type === 'NOTMATCHEDDATA') {
          console.error(err);
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
          console.error(err);
          res.status(400).json({
            ...ibDefs.INVALIDPARAMS,
            IBdetail: (err as Error).message,
            IBparams: {} as object,
          });
          return;
        }
        if (err.type === 'NOTEXISTDATA') {
          console.error(err);
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

export type SendEmailAuthCodeREQParam = {
  email?: string; /// 회원이 아닌경우 email 필요
};
export interface SendEmailAuthCodeRETParamPayload {}

export type SendEmailAuthCodeRETParam = Omit<IBResFormat, 'IBparams'> & {
  IBparams: SendEmailAuthCodeRETParamPayload | {};
};

/**
 * 이메일 인증번호 발송
 *
 */
export const sendEmailAuthCode = asyncWrapper(
  async (
    req: Express.IBTypedReqBody<SendEmailAuthCodeREQParam>,
    res: Express.IBTypedResponse<SendEmailAuthCodeRETParam>,
  ) => {
    try {
      const { email: nonMemberEmail } = req.body;
      const { locals } = req;
      const { userTokenId, memberEmail } = (() => {
        if (locals && locals?.grade === 'member')
          return {
            memberEmail: locals?.user?.email ?? null,
            userTokenId: locals?.user?.userTokenId,
          };
        return { memberEmail: null, userTokenId: locals?.tokenId };
      })();

      if (!userTokenId) {
        throw new IBError({
          type: 'NOTEXISTDATA',
          message: '정상적으로 부여된 userTokenId를 가지고 있지 않습니다.',
        });
      }

      const email = (() => {
        if (
          (isNil(nonMemberEmail) || isEmpty(nonMemberEmail)) &&
          (isNil(memberEmail) || isEmpty(memberEmail))
        ) {
          throw new IBError({
            type: 'INVALIDPARAMS',
            message: 'email 파라미터가 제공되지 않았습니다',
          });
        }

        if (!isNil(memberEmail) && !isEmpty(memberEmail)) return memberEmail;
        return nonMemberEmail as string;
      })();

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

      await sendEmail({
        from: `${process.env.SYSTEM_EMAIL_SENDER as string}`,
        to: `${email}`,
        subject: 'BRiP System - Email Authenticate code',
        html: `brip Email 문자인증 코드: ${authCode}`,
      });

      await prisma.emailAuthCode.create({
        data: {
          email,
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
          console.error(err);
          res.status(400).json({
            ...ibDefs.INVALIDPARAMS,
            IBdetail: (err as Error).message,
            IBparams: {} as object,
          });
          return;
        }
        if (err.type === 'NOTEXISTDATA') {
          console.error(err);
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
          console.error(err);
          res.status(400).json({
            ...ibDefs.INVALIDPARAMS,
            IBdetail: (err as Error).message,
            IBparams: {} as object,
          });
          return;
        }
        if (err.type === 'NOTEXISTDATA') {
          console.error(err);
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

export type SubmitEmailAuthCodeREQParam = {
  email?: string; /// 회원이 아닌경우 email 필요
  authCode: string;
};
export interface SubmitEmailAuthCodeRETParamPayload {}

export type SubmitEmailAuthCodeRETParam = Omit<IBResFormat, 'IBparams'> & {
  IBparams: SubmitEmailAuthCodeRETParamPayload | {};
};

/**
 * 이메일 인증번호 제출
 * /auth/sendEmailAuthCode 호출후 이메일로로 발급받은 코드를 제출하는 api
 *
 */
export const submitEmailAuthCode = asyncWrapper(
  async (
    req: Express.IBTypedReqBody<SubmitEmailAuthCodeREQParam>,
    res: Express.IBTypedResponse<SubmitEmailAuthCodeRETParam>,
  ) => {
    try {
      const { email: nonMemberEmail, authCode } = req.body;
      const { locals } = req;
      const { userTokenId, memberEmail } = (() => {
        if (locals && locals?.grade === 'member')
          return {
            memberEmail: locals?.user?.email ?? null,
            userTokenId: locals?.user?.userTokenId,
          };
        return { memberEmail: null, userTokenId: locals?.tokenId };
      })();

      if (!userTokenId) {
        throw new IBError({
          type: 'NOTEXISTDATA',
          message: '정상적으로 부여된 userTokenId를 가지고 있지 않습니다.',
        });
      }

      const email = (() => {
        if (
          (isNil(nonMemberEmail) || isEmpty(nonMemberEmail)) &&
          (isNil(memberEmail) || isEmpty(memberEmail))
        ) {
          throw new IBError({
            type: 'INVALIDPARAMS',
            message: 'email 파라미터가 제공되지 않았습니다',
          });
        }

        if (!isNil(memberEmail) && !isEmpty(memberEmail)) return memberEmail;
        return nonMemberEmail as string;
      })();

      const emailAuthCode = await prisma.emailAuthCode.findFirst({
        where: {
          email,
          code: authCode,
          userTokenId,
        },
        orderBy: {
          id: 'desc',
        },
      });

      if (isNil(emailAuthCode)) {
        throw new IBError({
          type: 'NOTEXISTDATA',
          message:
            '해당 번호와 코드가 일치하는 이메일 인증 요청 내역이 존재하지 않습니다.',
        });
      }

      if (moment().diff(moment(emailAuthCode.updatedAt), 's') > 180) {
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
          console.error(err);
          res.status(400).json({
            ...ibDefs.INVALIDPARAMS,
            IBdetail: (err as Error).message,
            IBparams: {} as object,
          });
          return;
        }
        if (err.type === 'NOTEXISTDATA') {
          console.error(err);
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

      const { phone } = user;

      if (isNil(phone) || isEmpty(phone)) {
        throw new IBError({
          type: 'INVALIDSTATUS',
          message: '회원정보중 phone이 누락되어 있습니다.',
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
            OR: [{ phone }, { userTokenId }],
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
          console.error(err);
          res.status(400).json({
            ...ibDefs.INVALIDPARAMS,
            IBdetail: (err as Error).message,
            IBparams: {} as object,
          });
          return;
        }
        if (err.type === 'NOTEXISTDATA') {
          console.error(err);
          res.status(404).json({
            ...ibDefs.NOTEXISTDATA,
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
      }
      throw err;
    }
  },
);

export type ResetPasswordREQParam = {
  email: string;
};
export interface ResetPasswordRETParamPayload {}

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
      const { email } = req.body;
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
        isEmpty(email)
        // isNil(authCode) ||
        // isEmpty(authCode)
      ) {
        throw new IBError({
          type: 'INVALIDPARAMS',
          message: 'email 파라미터는 필수 제출 파라미터 입니다.',
          // message: 'email 파라미터와 authCode는 필수 제출 파라미터 입니다.',
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

      const { phone } = user;
      if (isNil(phone) || isEmpty(phone)) {
        throw new IBError({
          type: 'INVALIDSTATUS',
          message: '회원정보중 phone이 누락되어 있습니다.',
        });
      }

      // const interCode = user.phone.split('-')[0].slice(1);
      // const formattedPhone = user.phone.split('-').reduce((acc, cur) => {
      //   if (cur.includes('+')) return acc;
      //   return `${acc}${cur}`;
      // }, '');

      // const smsAuthCode = await prisma.sMSAuthCode.findMany({
      //   where: {
      //     phone: `+${interCode}-${formattedPhone}`,
      //     code: authCode,
      //     userTokenId,
      //   },
      //   orderBy: {
      //     id: 'desc',
      //   },
      // });

      // if (smsAuthCode.length === 0) {
      //   throw new IBError({
      //     type: 'NOTEXISTDATA',
      //     message:
      //       '회원 정보에 기재된 전화번호와 코드가 일치하는 문자 인증 요청 내역이 존재하지 않습니다.',
      //   });
      // }

      // if (moment().diff(moment(smsAuthCode[0].updatedAt), 's') > 180) {
      //   throw new IBError({
      //     type: 'EXPIREDDATA',
      //     message: '인증 시간이 만료되었습니다. 다시 인증 코드를 요청해주세요',
      //   });
      // }

      const tempPassword = randomstring.generate({ length: 12 });
      const hash = genBcryptHash(tempPassword);

      const now = moment();
      const expiration = now.add(15, 'minutes').toISOString();
      await prisma.$transaction(async tx => {
        await tx.user.update({
          where: {
            id: user.id,
          },
          data: {
            password: hash,
            pwLastUpdateDate: now.toISOString(),
            pwExpireDate: expiration, /// 임시비밀번호 유효시간 15분
          },
        });

        await tx.sMSAuthCode.deleteMany({
          where: {
            OR: [{ phone }, { userTokenId }],
          },
        });
      });

      moment.locale('ko');
      await sendEmail({
        from: `BRiP Admin" <${process.env.SYSTEM_EMAIL_SENDER as string}>`,
        to: `${email}`,
        subject: 'BRiP System - Temporay Password was created',
        html: `변경된 임시 비밀번호는 <b>${tempPassword} </b> 입니다. <br>
        해당 비밀번호의 만료시한은 보안상 15분으로 <b>${moment(
          expiration,
        ).format('lll')}</b> 까지입니다. <br>
        로그인 후에는 <b>반드시 비밀번호를 변경해주시길 부탁드립니다.</b>`,
      });

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
        if (err.type === 'NOTEXISTDATA') {
          console.error(err);
          res.status(404).json({
            ...ibDefs.NOTEXISTDATA,
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
      }
      throw err;
    }
  },
);

export type UnRegisterRequestType = {
  password: string;
};
export type UnRegisterSuccessResType = {};
export type UnRegisterResType = Omit<IBResFormat, 'IBparams'> & {
  IBparams: UnRegisterSuccessResType | {};
};

/**
 * 회원탈퇴 요청 api
 */
export const unRegister = asyncWrapper(
  async (
    req: Express.IBTypedReqBody<UnRegisterRequestType>,
    res: Express.IBTypedResponse<UnRegisterResType>,
  ) => {
    try {
      const { locals } = req;
      const user = (() => {
        if (locals && locals?.grade === 'member') return locals?.user;
        // return locals?.tokenId;
        throw new IBError({
          type: 'NOTAUTHORIZED',
          message: 'member 등급만 접근 가능합니다.',
        });
      })();
      if (isNil(user)) {
        throw new IBError({
          type: 'NOTEXISTDATA',
          message: '정상적으로 부여된 userTokenId를 가지고 있지 않습니다.',
        });
      }

      const { password } = req.body;
      if (isNil(password) || isEmpty(password)) {
        throw new IBError({
          type: 'INVALIDPARAMS',
          message: 'password 파라미터는 반드시 제공되어야 합니다.',
        });
      }

      const compareResult: Boolean = await compare(password, user.password);
      if (!compareResult) {
        throw new IBError({
          type: 'NOTMATCHEDDATA',
          message: 'password가 일치하지 않습니다.',
        });
      }

      await prisma.user.delete({
        where: {
          id: user.id,
        },
      });

      res.json({
        ...ibDefs.SUCCESS,
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

        if (err.type === 'NOTEXISTDATA') {
          console.error(err);
          res.status(404).json({
            ...ibDefs.NOTEXISTDATA,
            IBdetail: (err as Error).message,
            IBparams: {} as object,
          });
          return;
        }
        if (err.type === 'NOTAUTHORIZED') {
          console.error(err);
          res.status(403).json({
            ...ibDefs.NOTAUTHORIZED,
            IBdetail: (err as Error).message,
            IBparams: {} as object,
          });
          return;
        }
        if (err.type === 'NOTMATCHEDDATA') {
          console.error(err);
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

/// userFCMTokens를 redis에 cache 한다.
const cacheUserInfoToRedis = async (userId: number) => {
  if (!isNil(userId)) {
    const userFCMTokens = await prisma.userFCMToken.findMany({
      where: {
        userId,
      },
      select: {
        userTokenId: true,
        token: true,
        user: {
          select: {
            id: true,
            email: true,
            nickName: true,
            profileImg: true,
            phone: true,
          },
        },
      },
    });

    /// 기존에 userInfo가 redis에 있었다면 userFCMToken 부분만 교체해서 cache하고
    const userInfo = await redis.get(`userInfo:${userId}`);
    if (!isNil(userInfo) && !isEmpty(userInfo)) {
      const userInfoObj = JSON.parse(userInfo) as {
        userFCMToken: { token: string }[];
      };
      userInfoObj.userFCMToken = userFCMTokens;
      await redis.set(`userInfo:${userId}`, JSON.stringify(userInfoObj));
    }

    /// 기존에 userInfo가 redis에 없었다면 새로 만들어서 cache.
    await redis.set(
      `userInfo:${userId}`,
      JSON.stringify({
        id: userId,
        userFCMToken: userFCMTokens,
      }),
    );
  }
};

export type RegistAppPushTokenRequestType = {
  myDeviceToken: string;
};
export type RegistAppPushTokenSuccessResType = {};
export type RegistAppPushTokenResType = Omit<IBResFormat, 'IBparams'> & {
  IBparams: RegistAppPushTokenSuccessResType | {};
};

/**
 * Firebase Cloud Messaging 서비스의 앱 push 기능을 위해 FCM으로부터 발급받은 각 단말의 토큰값을 서버에 저장요청하는 api
 */
export const registAppPushToken = asyncWrapper(
  async (
    req: Express.IBTypedReqBody<RegistAppPushTokenRequestType>,
    res: Express.IBTypedResponse<RegistAppPushTokenResType>,
  ) => {
    try {
      const { locals } = req;
      const { userId, userTokenId } = (() => {
        if (locals && locals?.grade === 'member')
          return {
            userId: locals?.user?.id,
            userTokenId: locals?.user?.userTokenId,
          };
        return { userId: null, userTokenId: locals?.tokenId };
        // throw new IBError({
        //   type: 'NOTAUTHORIZED',
        //   message: 'member 등급만 접근 가능합니다.',
        // });
      })();
      if (isNil(userTokenId)) {
        throw new IBError({
          type: 'NOTEXISTDATA',
          message: '정상적으로 부여된 userTokenId를 가지고 있지 않습니다.',
        });
      }

      const { myDeviceToken } = req.body;
      if (isNil(myDeviceToken) || isEmpty(myDeviceToken)) {
        throw new IBError({
          type: 'INVALIDPARAMS',
          message: 'myDeviceToken 파라미터는 반드시 제공되어야 합니다.',
        });
      }

      await prisma.userFCMToken.create({
        data: {
          token: myDeviceToken,
          ...(!isNil(userId) && {
            user: {
              connect: {
                id: userId,
              },
            },
          }),
          userTokenId,
        },
      });

      if (!isNil(userId)) await cacheUserInfoToRedis(userId);

      res.json({
        ...ibDefs.SUCCESS,
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

        if (err.type === 'NOTEXISTDATA') {
          console.error(err);
          res.status(404).json({
            ...ibDefs.NOTEXISTDATA,
            IBdetail: (err as Error).message,
            IBparams: {} as object,
          });
          return;
        }
        if (err.type === 'NOTAUTHORIZED') {
          console.error(err);
          res.status(403).json({
            ...ibDefs.NOTAUTHORIZED,
            IBdetail: (err as Error).message,
            IBparams: {} as object,
          });
          return;
        }
        if (err.type === 'NOTMATCHEDDATA') {
          console.error(err);
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

export type DeleteAppPushTokenRequestType = {
  targetDeviceToken: string;
};
export type DeleteAppPushTokenSuccessResType = {};
export type DeleteAppPushTokenResType = Omit<IBResFormat, 'IBparams'> & {
  IBparams: DeleteAppPushTokenSuccessResType | {};
};

/**
 * Firebase Cloud Messaging 서비스의 앱 push 기능을 위해 FCM으로부터 발급받은 각 단말의 토큰값을 서버에서 삭제요청하는 api
 */
export const deleteAppPushToken = asyncWrapper(
  async (
    req: Express.IBTypedReqBody<DeleteAppPushTokenRequestType>,
    res: Express.IBTypedResponse<DeleteAppPushTokenResType>,
  ) => {
    try {
      const { locals } = req;
      const { userId, userTokenId } = (() => {
        if (locals && locals?.grade === 'member')
          return {
            userId: locals?.user?.id,
            userTokenId: locals?.user?.userTokenId,
          };
        return { userId: null, userTokenId: locals?.tokenId };
        // throw new IBError({
        //   type: 'NOTAUTHORIZED',
        //   message: 'member 등급만 접근 가능합니다.',
        // });
      })();
      if (isNil(userTokenId)) {
        throw new IBError({
          type: 'NOTEXISTDATA',
          message: '정상적으로 부여된 userTokenId를 가지고 있지 않습니다.',
        });
      }

      const { targetDeviceToken } = req.body;
      if (isNil(targetDeviceToken) || isEmpty(targetDeviceToken)) {
        throw new IBError({
          type: 'INVALIDPARAMS',
          message: 'targetDeviceToken 파라미터는 반드시 제공되어야 합니다.',
        });
      }

      const userFCMToken = await prisma.userFCMToken.findUnique({
        where: {
          token: targetDeviceToken,
        },
        select: {
          userTokenId: true,
        },
      });

      if (
        isNil(userFCMToken?.userTokenId) &&
        userFCMToken?.userTokenId !== userTokenId
      ) {
        throw new IBError({
          type: 'NOTAUTHORIZED',
          message: '삭제 권한이 없는 토큰입니다.',
        });
      }

      await prisma.userFCMToken.delete({
        where: {
          token: targetDeviceToken,
        },
      });

      if (!isNil(userId)) await cacheUserInfoToRedis(userId);

      res.json({
        ...ibDefs.SUCCESS,
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

        if (err.type === 'NOTEXISTDATA') {
          console.error(err);
          res.status(404).json({
            ...ibDefs.NOTEXISTDATA,
            IBdetail: (err as Error).message,
            IBparams: {} as object,
          });
          return;
        }
        if (err.type === 'NOTAUTHORIZED') {
          console.error(err);
          res.status(403).json({
            ...ibDefs.NOTAUTHORIZED,
            IBdetail: (err as Error).message,
            IBparams: {} as object,
          });
          return;
        }
        if (err.type === 'NOTMATCHEDDATA') {
          console.error(err);
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

export type UserNickDupCheckRequestType = {
  nickName: string;
};
export type UserNickDupCheckSuccessResType = {
  isDup: boolean; /// true이면 중복, false이면 미중복
};
export type UserNickDupCheckResType = Omit<IBResFormat, 'IBparams'> & {
  IBparams: UserNickDupCheckSuccessResType | {};
};

/**
 * 회원 nickName이 존재하는지 중복 체크를 요청하는 api
 * code(1000) Success이면 중복되지 않음
 */
export const userNickDupCheck = asyncWrapper(
  async (
    req: Express.IBTypedReqBody<UserNickDupCheckRequestType>,
    res: Express.IBTypedResponse<UserNickDupCheckResType>,
  ) => {
    try {
      const { locals } = req;
      const userTokenId = (() => {
        if (locals && locals?.grade === 'member') {
          return locals?.user?.userTokenId;
        }

        return locals?.tokenId;
        // throw new IBError({
        //   type: 'NOTAUTHORIZED',
        //   message: 'member 등급만 접근 가능합니다.',
        // });
      })();
      if (isNil(userTokenId)) {
        throw new IBError({
          type: 'NOTEXISTDATA',
          message: '정상적으로 부여된 userTokenId를 가지고 있지 않습니다.',
        });
      }

      const { nickName } = req.body;
      if (isNil(nickName) || isEmpty(nickName)) {
        throw new IBError({
          type: 'INVALIDPARAMS',
          message: 'nickName 파라미터는 반드시 제공되어야 합니다.',
        });
      }

      const user = await prisma.user.findUnique({
        where: {
          nickName,
        },
        select: {
          id: true,
        },
      });

      res.json({
        ...ibDefs.SUCCESS,
        IBparams: {
          isDup: !isNil(user),
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

export type UserEmailDupCheckRequestType = {
  email: string;
};
export type UserEmailDupCheckSuccessResType = {
  isDup: boolean; /// true이면 중복, false이면 미중복
};
export type UserEmailDupCheckResType = Omit<IBResFormat, 'IBparams'> & {
  IBparams: UserEmailDupCheckSuccessResType | {};
};

/**
 * 회원 email이 존재하는지 중복 체크를 요청하는 api
 * code(1000) Success이면 중복되지 않음
 */
export const userEmailDupCheck = asyncWrapper(
  async (
    req: Express.IBTypedReqBody<UserEmailDupCheckRequestType>,
    res: Express.IBTypedResponse<UserEmailDupCheckResType>,
  ) => {
    try {
      const { locals } = req;
      const userTokenId = (() => {
        if (locals && locals?.grade === 'member') {
          return locals?.user?.userTokenId;
        }

        return locals?.tokenId;
        // throw new IBError({
        //   type: 'NOTAUTHORIZED',
        //   message: 'member 등급만 접근 가능합니다.',
        // });
      })();
      if (isNil(userTokenId)) {
        throw new IBError({
          type: 'NOTEXISTDATA',
          message: '정상적으로 부여된 userTokenId를 가지고 있지 않습니다.',
        });
      }

      const { email } = req.body;
      if (isNil(email) || isEmpty(email)) {
        throw new IBError({
          type: 'INVALIDPARAMS',
          message: 'email 파라미터는 반드시 제공되어야 합니다.',
        });
      }

      const user = await prisma.user.findUnique({
        where: {
          email,
        },
        select: {
          id: true,
        },
      });

      res.json({
        ...ibDefs.SUCCESS,
        IBparams: {
          isDup: !isNil(user),
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

export type GetServerNClientVersionRequestType = {};
export type GetServerNClientVersionSuccessResType = ServerVersion & {
  pairClientVersion: ClientVersion | null;
};
export type GetServerNClientVersionResType = Omit<IBResFormat, 'IBparams'> & {
  IBparams: GetServerNClientVersionSuccessResType | {};
};

/**
 * 서버와 클라이언트 버전 확인 요청
 * 서버버전중 isUsing이 true인 것을 찾기 때문에 하나의 버전만 반환된다.(ServerVersion의 isUsing은 전체중 하나만 true인것을 유지해야한다.)
 */
export const getServerNClientVersion = asyncWrapper(
  async (
    req: Express.IBTypedReqQuery<GetServerNClientVersionRequestType>,
    res: Express.IBTypedResponse<GetServerNClientVersionResType>,
  ) => {
    try {
      const { locals } = req;
      const userTokenId = (() => {
        if (locals && locals?.grade === 'member') {
          return locals?.user?.userTokenId;
        }

        return locals?.tokenId;
        // throw new IBError({
        //   type: 'NOTAUTHORIZED',
        //   message: 'member 등급만 접근 가능합니다.',
        // });
      })();
      if (isNil(userTokenId)) {
        throw new IBError({
          type: 'NOTEXISTDATA',
          message: '정상적으로 부여된 userTokenId를 가지고 있지 않습니다.',
        });
      }

      const usingVersion = await prisma.serverVersion.findFirst({
        where: {
          isUsing: true,
        },
        include: {
          pairClientVersion: true,
        },
      });

      if (isNil(usingVersion)) {
        throw new IBError({
          type: 'INVALIDSTATUS',
          message: 'using Version이 하나도 존재하지 않는 상태입니다.',
        });
      }

      res.json({
        ...ibDefs.SUCCESS,
        IBparams: usingVersion,
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

export type AddServerVersionRequestType = {
  // type: string;
  versionName: string;
  clientVersionNames?: string[];
};
export type AddServerVersionSuccessResType = ServerVersion & {
  pairClientVersion: ClientVersion | null;
};
export type AddServerVersionResType = Omit<IBResFormat, 'IBparams'> & {
  IBparams: AddServerVersionSuccessResType | {};
};

/**
 * 서버와 클라이언트 버전 추가 (어드민용)
 */
export const addServerVersion = asyncWrapper(
  async (
    req: Express.IBTypedReqBody<AddServerVersionRequestType>,
    res: Express.IBTypedResponse<AddServerVersionResType>,
  ) => {
    try {
      const { locals } = req;
      const userTokenId = (() => {
        if (!isNil(locals) && locals.grade === 'member' && locals.user?.admin)
          return locals?.user?.userTokenId;
        // return locals?.tokenId;
        throw new IBError({
          type: 'NOTAUTHORIZED',
          message: 'admin member 등급만 접근 가능합니다.',
        });
      })();
      if (!userTokenId) {
        throw new IBError({
          type: 'NOTEXISTDATA',
          message: '정상적으로 부여된 userTokenId를 가지고 있지 않습니다.',
        });
      }
      const params = req.body;
      const { versionName, clientVersionNames } = params;

      if (
        // isNil(type) ||
        // isEmpty(type) ||
        isNil(versionName) ||
        isEmpty(versionName)
      ) {
        throw new IBError({
          type: 'INVALIDPARAMS',
          message: 'versionName은 필수 파라미터입니다.',
        });
      }

      const usingVersion = await prisma.serverVersion.create({
        data: {
          isUsing: false,
          versionName,
          ...(!isNil(clientVersionNames) &&
            !isEmpty(clientVersionNames) && {
              pairClientVersion: {
                connectOrCreate: clientVersionNames.map(v => {
                  return {
                    where: {
                      versionName: v,
                    },
                    create: {
                      versionName: v,
                    },
                  };
                }),
              },
            }),
        },
        include: {
          pairClientVersion: true,
        },
      });

      res.json({
        ...ibDefs.SUCCESS,
        IBparams: usingVersion,
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

interface IiamportCerificationAnotationType {
  code: number;
  message: string | null;
  response: {
    /// https://developers.portone.io/api/rest-v1/type-def#CertificationAnnotation
    /// 포트원 인증 고유번호 (필수)
    imp_uid: string;
    /// 본인인증 결과건의 포트원 인증 고유번호

    /// 가맹점 주문번호 (선택)
    merchant_uid: string;
    // 본인인증 결과건의 포트원 가맹점 주문번호

    // PG사 본인인증결과 고유번호 (선택)
    pg_tid: string;
    // 본인인증 결과건의 PG사 본인인증결과 고유번호

    // pg사 구분코드 (필수)
    pg_provider: string;
    // 본인인증 제공 PG사의 명칭

    // 성명 (선택)
    name: string;
    // 인증된 사용자의 성명

    // 성별 (선택)
    gender: string;
    // 인증된 사용자의 성별

    // 생년월일 (선택)
    birthday: string;
    // 인증된 사용자의 생년월일 ISO8601 형식의 문자열. YYYY-MM-DD 10자리 문자열

    // 외국인 여부 (필수)
    foreigner: boolean;
    // 인증된 사용자의 외국인 여부

    // 휴대폰번호 (선택)
    phone: string;
    // 인증에 사용된 휴대폰 번호 (신용카드 본인인증의 경우 해당사항 없음

    // 통신사 (선택)
    carrier: string;
    // 인증에 사용된 휴대폰번호의 통신사 (신용카드 본인인증의 경우 해당사항없음)

    // 인증성공여부 (선택)
    certified: boolean;
    // 본인인증 성공여부

    // 인증처리시각 (선택)
    certified_at: number;
    // 본인인증 처리시각 UNIX timestamp

    // 개인 고유구분 식별키 (선택)
    unique_key: string;
    // 개인별로 고유하게 부여하는 개인 식별키(CI)

    // 가맹점 내 개인 고유구분 식별키 (선택)
    unique_in_site: string;
    // 가맹점 내 개인별로 고유하게 부여하는 개인 식별키(DI)

    // 웹 페이지 URL (선택)
    origin: string;
    // 본인인증 프로세스가 진행된 웹 페이지의 URL

    // 외국인 여부(nullable) (선택)
    foreigner_v2: boolean;
    // 본인인증 결과 외국인 여부(nullable)
  };
}

/// iamport로 본인인증 여부를 조회하는 함수
const reqAuthenticateResultToIamport = async (impUid: string) => {
  try {
    /// 본인인증 여부 조회
    const r = await axios.get<IiamportCerificationAnotationType>(
      `https://api.iamport.kr/certifications/${impUid}?_token=${gIamportAccessKey}`,
    );
    return r.data.response;
  } catch (e) {
    /// Unauthorized - iamport access 토큰 에러
    if ((e as AxiosError).response?.status === 401) {
      /// iamport accesskey 획득
      /// api 문서: https://api.iamport.kr/#/
      const authResult = await axios.post<{
        code: number;
        message: string | null;
        response: {
          access_token: string;
          expired_at: number;
          now: number;
        };
      }>(`https://api.iamport.kr/users/getToken`, {
        imp_key: process.env.IAMPORT_API_KEY as string,
        imp_secret: process.env.IAMPORT_API_SECRET as string,
      });

      const { access_token: accessToken } = authResult.data.response;
      gIamportAccessKey = accessToken;

      const r = await axios.get<IiamportCerificationAnotationType>(
        `https://api.iamport.kr/certifications/${impUid}?_token=${gIamportAccessKey}`,
      );
      return r.data.response;
    }

    throw new IBError({
      type: 'EXTERNALAPI',
      message: 'iamport 본인인증 조회중 예기치 못한 에러가 발생했습니다.',
    });
  }
};

export type SubmitIdVerificationResultRequestType = {
  impUid: string;
};
export type SubmitIdVerificationResultSuccessResType = ServerVersion & {
  pairClientVersion: ClientVersion | null;
};
export type SubmitIdVerificationResultResType = Omit<
  IBResFormat,
  'IBparams'
> & {
  IBparams: SubmitIdVerificationResultSuccessResType | {};
};

/**
 * 클라이언트의 통신사 본인인증 결과를 brip 서버로 알리는 api
 * brip 서버는 iamport api를 요청하여 본인인증이 이루어졌는지 확인한다.
 */
export const submitIdVerificationResult = asyncWrapper(
  async (
    req: Express.IBTypedReqBody<SubmitIdVerificationResultRequestType>,
    res: Express.IBTypedResponse<SubmitIdVerificationResultResType>,
  ) => {
    try {
      const { locals } = req;
      const userTokenId = (() => {
        if (!isNil(locals) && locals.grade === 'member' && locals.user?.admin)
          return locals?.user?.userTokenId;
        return locals?.tokenId;
        // throw new IBError({
        //   type: 'NOTAUTHORIZED',
        //   message: 'admin member 등급만 접근 가능합니다.',
        // });
      })();
      if (!userTokenId) {
        throw new IBError({
          type: 'NOTEXISTDATA',
          message: '정상적으로 부여된 userTokenId를 가지고 있지 않습니다.',
        });
      }
      const params = req.body;
      const { impUid } = params;

      const { phone } = await reqAuthenticateResultToIamport(impUid);

      res.json({
        ...ibDefs.SUCCESS,
        IBparams: phone,
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
authRouter.post('/sendEmailAuthCode', accessTokenValidCheck, sendEmailAuthCode);
authRouter.post('/submitSMSAuthCode', accessTokenValidCheck, submitSMSAuthCode);
authRouter.post(
  '/submitEmailAuthCode',
  accessTokenValidCheck,
  submitEmailAuthCode,
);
authRouter.post('/changePassword', accessTokenValidCheck, changePassword);
authRouter.post('/resetPassword', accessTokenValidCheck, resetPassword);
authRouter.post('/unRegister', accessTokenValidCheck, unRegister);
authRouter.post(
  '/registAppPushToken',
  accessTokenValidCheck,
  registAppPushToken,
);
authRouter.post(
  '/registAppPushToken',
  accessTokenValidCheck,
  registAppPushToken,
);
authRouter.post(
  '/deleteAppPushToken',
  accessTokenValidCheck,
  deleteAppPushToken,
);
authRouter.post('/userNickDupCheck', accessTokenValidCheck, userNickDupCheck);
authRouter.post('/userEmailDupCheck', accessTokenValidCheck, userEmailDupCheck);
authRouter.get(
  '/getServerNClientVersion',
  accessTokenValidCheck,
  getServerNClientVersion,
);
authRouter.post('/addServerVersion', accessTokenValidCheck, addServerVersion);
authRouter.post(
  '/submitIdVerificationResult',
  accessTokenValidCheck,
  submitIdVerificationResult,
);
export default authRouter;
