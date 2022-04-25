import { PassportStatic } from 'passport';
import {
  Strategy,
  ExtractJwt,
  VerifiedCallback,
  VerifyCallback,
} from 'passport-jwt';
import { User } from '@prisma/client';
import prisma from '@src/prisma';

type JwtAsyncFn = (
  jwtPayload: unknown,
  done: VerifiedCallback,
) => Promise<void>;

const wrapper = (jwtAsyncFn: JwtAsyncFn): VerifyCallback => {
  return (jwtPayload: unknown, done: VerifiedCallback): void => {
    jwtAsyncFn(jwtPayload, done).catch((e: Error) => {
      console.error(e);
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
      },
      wrapper(async (jwtPayload: unknown, done: VerifiedCallback) => {
        try {
          // console.log(jwtPayload);
          const { email } = jwtPayload as { email: string };

          const user: User = await prisma.user.findFirst({
            where: { email },
          });

          if (user) {
            done(null, user);
            return;
          }
          done(null, false, { reason: 'Invalid or Non authentication data' });
        } catch (error) {
          console.error(error);
          done(error);
        }
      }),
    ),
  );
};
