import { PassportStatic } from 'passport';
import * as passportLocal from 'passport-local';
import { isEmpty, isNull } from 'lodash';
import { compare } from 'bcrypt';
import { User } from '@prisma/client';
import prisma from '@src/prisma';

const LocalStrategy = passportLocal.Strategy;

declare type LocalStrategyCBFunc = (
  error: unknown,
  user?: User,
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
            tripCreator: true,
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
        done(null, user);
      } catch (error) {
        console.error(error);
        done(error);
      }
    },
  );
  passport.use(local);
};
