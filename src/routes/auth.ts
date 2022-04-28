import express, { Express, NextFunction } from 'express';
import prisma from '@src/prisma';
import {
  ibDefs,
  asyncWrapper,
  genBcryptHash,
  IBResFormat,
  accessTokenValidCheck,
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
      const accessToken = jwt.sign(
        { email: user.email, randNo },
        process.env.JWT_SECRET || 'test_secret',
        {
          expiresIn: '12h',
        },
      );

      // const expiration = 1000;
      const refreshToken = jwt.sign(
        { email: user.email, randNo },
        process.env.JWT_SECRET || 'test_secret',
        {
          expiresIn: '30d',
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

export const signUp = asyncWrapper(
  async (
    req: Express.IBTypedReqBody<{
      email: string;
      password: string;
      name: string;
    }>,
    res: Express.IBTypedResponse<IBResFormat>,
  ) => {
    const {
      body: { email, password, name },
    } = req;

    if (isEmpty(email) || isEmpty(password)) {
      res.status(400).json({ ...ibDefs.INVALIDPARAMS });
      return;
    }

    const hash = genBcryptHash(password);
    const createdUser = await prisma.user.upsert({
      where: {
        email,
      },
      update: {},
      create: {
        email,
        password: hash,
        name,
      },
    });

    const userWithoutPw = _.omit(createdUser, ['password']);

    res.json({
      ...ibDefs.SUCCESS,
      IBparams: userWithoutPw,
    });
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
authRouter.post('/signUp', signUp);
authRouter.post('/authGuardTest', accessTokenValidCheck, authGuardTest);

export default authRouter;
