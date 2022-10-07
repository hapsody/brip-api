import express, { Express, NextFunction } from 'express';
import prisma from '@src/prisma';
import {
  ibDefs,
  asyncWrapper,
  genBcryptHash,
  IBResFormat,
  accessTokenValidCheck,
  IBError,
  UserTokenPayload,
} from '@src/utils';
import _, { isEmpty } from 'lodash';
import jwt from 'jsonwebtoken';
import passport from 'passport';
import { User } from '@prisma/client';

const authRouter: express.Application = express();

export const signIn = (
  req: Express.IBTypedReqBody<{ email: string; password: string }>,
  res: Express.IBTypedResponse<IBResFormat>,
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

      const randNo = Math.random().toString().substr(2, 6);
      const userTokenPayload: UserTokenPayload = {
        grade: 'member',
        email: user.email,
        tokenId: user.userTokenId,
      };
      const accessToken = jwt.sign(
        // { email: user.email, randNo },
        userTokenPayload,
        process.env.JWT_SECRET || 'test_secret',
        {
          expiresIn: '14d',
        },
      );

      // const expiration = 1000;
      const refreshToken = jwt.sign(
        { email: user.email, randNo },
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

      const userTokenPayload: UserTokenPayload = {
        grade: 'nonMember',
        tokenId: newOne.id.toString(),
      };
      const userToken = jwt.sign(
        userTokenPayload,
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

export default authRouter;
