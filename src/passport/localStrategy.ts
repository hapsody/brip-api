import { PassportStatic } from 'passport';
import * as passportLocal from 'passport-local';
import { isEmpty, isNull, isNil } from 'lodash';
import moment from 'moment';
import { compare } from 'bcrypt';
import { User, TripCreator, AdPlace, TourPlace } from '@prisma/client';
import prisma from '@src/prisma';

const LocalStrategy = passportLocal.Strategy;

declare type LocalStrategyCBFunc = (
  error: unknown,
  user?: User & {
    adPlace: (AdPlace & { tourPlace: TourPlace[] })[];
    tripCreator: TripCreator[];
  },
  options?: passportLocal.IVerifyOptions,
) => void;
export default (passport: PassportStatic): void => {
  const local = new LocalStrategy(
    {
      usernameField: 'id',
      passwordField: 'password',
    },
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    async (id, password, done: LocalStrategyCBFunc): Promise<void> => {
      try {
        const user = await prisma.user.findFirst({
          where: {
            email: id,
          },
          include: {
            tripCreator: {
              where: {
                status: 'APPROVED',
              },
            },
            adPlace: {
              include: {
                tourPlace: true,
              },
            },
          },
        });

        if (isEmpty(user) || isNull(user)) {
          done(null, undefined, { message: 'Incorrect username.' });
          return;
        }
        const compareResult: Boolean = await compare(password, user.password);
        if (!compareResult) {
          done(null, undefined, {
            message: 'Incorrect password.',
          });
          return;
        }

        if (
          !isNil(user.pwExpireDate) && /// 유저의 비밀번호가 임시 비밀번호일경우 만료일이 있음
          moment(user.pwExpireDate).diff(moment(), 'milliseconds') < 0 /// 만료일이 지났는지 체크
        ) {
          done(null, undefined, {
            message: 'Expired Password.',
          });
          return;
        }
        done(null, user);
      } catch (error) {
        console.error(error);
        done(error);
      }
    },
  );
  passport.use(local);
};
