import { PassportStatic } from 'passport';
import {
  Strategy,
  ExtractJwt,
  VerifiedCallback,
  VerifyCallback,
} from 'passport-jwt';
import prisma from '@src/prisma';
import { AccessTokenPayload, GuardRes } from '@src/utils';

type JwtAsyncFn = (
  jwtPayload: unknown,
  done: VerifiedCallback,
) => Promise<void>;

export const wrapper = (jwtAsyncFn: JwtAsyncFn): VerifyCallback => {
  return (jwtPayload: unknown, done: VerifiedCallback): void => {
    jwtAsyncFn(jwtPayload, done).catch((e: Error) => {
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
      },
      wrapper(async (jwtPayload: unknown, done: VerifiedCallback) => {
        // try {
        const userTokenPayload = jwtPayload as AccessTokenPayload;
        if (userTokenPayload.grade === 'member') {
          const { email } = userTokenPayload;

          const user = await prisma.user.findFirst({
            where: { email },
            include: {
              tripCreator: true,
            },
          });
          if (!user) {
            done(new Error('NOTEXISTDATA'));
            return;
          }

          const guardRes: GuardRes = {
            grade: 'member',
            user,
          };
          if (user) {
            done(null, guardRes);
            return;
          }
        } else {
          // if userTokenPayload.grade member
          const guardRes: GuardRes = {
            grade: 'nonMember',
            tokenId: userTokenPayload.tokenId,
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
      }),
    ),
  );
};
