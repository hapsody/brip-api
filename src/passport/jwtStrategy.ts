import { Request } from 'express';
import { PassportStatic } from 'passport';
import {
  Strategy,
  ExtractJwt,
  VerifiedCallback,
  // VerifyCallback,
  VerifyCallbackWithRequest,
} from 'passport-jwt';
import prisma from '@src/prisma';
import { AccessTokenPayload, GuardRes, IBError } from '@src/utils';
import { isEmpty, isNil } from 'lodash';

type JwtAsyncFn = (
  req: Request,
  jwtPayload: unknown,
  done: VerifiedCallback,
) => Promise<void>;

export const wrapper = (jwtAsyncFn: JwtAsyncFn): VerifyCallbackWithRequest => {
  return (req: Request, jwtPayload: unknown, done: VerifiedCallback): void => {
    jwtAsyncFn(req, jwtPayload, done).catch((e: Error) => {
      console.error(e);
      done(e);
    });
  };
};

export default (passport: PassportStatic): void => {
  passport.use(
    'jwt',
    new Strategy(
      {
        // jwtFromRequest: ExtractJwt.fromHeader('Authorization'),
        jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
        secretOrKey: process.env.JWT_SECRET,
        passReqToCallback: true,
      },
      wrapper(
        async (req: Request, jwtPayload: unknown, done: VerifiedCallback) => {
          // try {
          const userTokenPayload = jwtPayload as AccessTokenPayload;

          // console.log(JSON.stringify(req.headers.authorization, null, 2));
          const accessToken = (() => {
            const { authorization } = req.headers;
            if (!isNil(authorization) && !isEmpty(authorization)) {
              const chunks = authorization.split('Bearer ');
              if (!isEmpty(chunks)) {
                return chunks[1];
              }
            }
            return undefined;
          })();

          if (userTokenPayload?.grade === 'member') {
            const { email } = userTokenPayload;

            const user = await prisma.user.findFirst({
              where: { email },
              include: {
                tripCreator: {
                  where: {
                    status: 'APPROVED',
                  },
                },
              },
            });
            if (!user) {
              done(
                new IBError({
                  type: 'NOTEXISTDATA',
                  message: '존재하지 않는 회원정보를 가진 토큰입니다.',
                }),
              );
              return;
            }

            const guardRes: GuardRes = {
              grade: 'member',
              user,
              accessToken,
            };
            if (user) {
              done(null, guardRes);
              return;
            }
          } else {
            if (userTokenPayload?.grade !== 'nonMember') {
              done(
                new IBError({
                  type: 'INVALIDAUTHTOKEN',
                  message: '회원 또는 비회원 토큰이 아닙니다.',
                }),
              );
              return;
            }
            const guardRes: GuardRes = {
              grade: 'nonMember',
              tokenId: userTokenPayload.tokenId,
              accessToken,
            };
            done(null, guardRes);
            return;
          }

          done(new Error('NOTEXISTDATA'));
          // done(null, false, { reason: 'Invalid or Non authentication data' });
          // } catch (error) {
          //   console.error(error);
          //   done(error);
          // }
        },
      ),
    ),
  );
};
