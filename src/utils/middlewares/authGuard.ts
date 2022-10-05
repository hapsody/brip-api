/* eslint-disable @typescript-eslint/no-unsafe-call */
// import prisma from '@src/prisma';
import { PrismaClient } from '@prisma/client';
import passport from 'passport';
import { NextFunction } from 'express';
import { ibDefs, IBResFormat, GuardRes } from '../IBDefinitions';

const prisma = new PrismaClient();

const accessTokenValidCheck = (
  req: Express.IBAuthGuardRequest,
  res: Express.IBTypedResponse<IBResFormat>,
  next: NextFunction,
): void => {
  passport.authenticate(
    'jwt',
    async (
      authError: Error,
      user: GuardRes,
      info: { name: string; message: string },
    ) => {
      // console.log(authError, user, info);
      if (authError && authError instanceof Error) {
        if (authError.message === 'NOTEXISTDATA') {
          res.status(404).json({
            ...ibDefs[authError.message],
          });
          return;
        }
        res.status(500).json({
          ...ibDefs.UNEXPECTED,
        });
        return;
      }
      if (info && info.name === 'TokenExpiredError') {
        res.status(401).json({
          ...ibDefs.TOKENEXPIRED,
        });
        return;
      }
      if (info && info.name === 'JsonWebTokenError') {
        res.json({
          ...ibDefs.JWTERROR,
          IBdetail: info.message,
        });
        return;
      }
      if (info && info.name === 'Error') {
        res.status(401).json({
          ...ibDefs.NOAUTHTOKEN,
        });
        return;
      }

      try {
        const existUser = await prisma.user.findFirst({
          where: {
            userTokenId: user.tokenId,
          },
        });
        if (!existUser) {
          res.status(404).json({
            ...ibDefs.NOTEXISTDATA,
            IBdetail:
              'accessToken에 대응하는 User 정보가 DB 에 존재하지 않습니다.',
          });
          return;
        }
      } catch (err) {
        console.error(err);
        res.status(404).json({
          ...ibDefs.UNEXPECTED,
          IBdetail: (err as Error).message,
        });
        return;
      }

      req.locals = {
        ...req.locals,
        grade: user.grade,
        tokenId: user.tokenId,
        user: user.user, // for member
      };
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      next();
    },
  )(req, res);
};
export default accessTokenValidCheck;
