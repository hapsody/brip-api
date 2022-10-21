import request from 'supertest';
import app from '@src/app';
import prisma from '@src/prisma';
import { compare } from 'bcrypt';
import { User } from '@prisma/client';
import jwt from 'jsonwebtoken';
import {
  SaveScheduleResponsePayload,
  SignInResponse,
  SignUpResponseType,
  ReqNonMembersUserTokenResType,
  ReqNonMembersUserTokenSuccessResType,
} from '@src/routes/auth';
import { params } from '../../testData';

const { signIn, signUp } = params;
let signUpRawResult: SignUpResponseType;
let user: User;
beforeAll(async () => {
  const preCheckIfAlreadyExist = await prisma.user.findFirst({
    where: {
      email: signUp.correctParam.id,
    },
  });
  if (preCheckIfAlreadyExist) {
    await prisma.user.delete({
      where: {
        id: preCheckIfAlreadyExist.id,
      },
    });
  }
  const userTokenRawRes = await request(app)
    .post('/auth/reqNonMembersUserToken')
    .send();
  const userTokenRes = userTokenRawRes.body as ReqNonMembersUserTokenResType;
  const userToken =
    userTokenRes.IBparams as ReqNonMembersUserTokenSuccessResType;

  const response = await request(app)
    .post('/auth/signUp')
    .set('Authorization', `Bearer ${userToken.userToken}`)
    .send(signUp.correctParam);

  signUpRawResult = response.body as SignUpResponseType;
  user = signUpRawResult.IBparams as User;
  expect(user.id).not.toBeUndefined(); // User DB 생성 실패
});

describe('Correct case test', () => {
  describe('정상 요청 예시', () => {
    it('파라미터 입력값이 제대로 반영된 결과인지 파라미터 값과 응답값 비교', async () => {
      const response = await request(app)
        .post('/auth/signIn')
        .send(signIn.correctParam);
      const signInRawRes = response.body as SignInResponse;
      const signInRes = signInRawRes.IBparams as SaveScheduleResponsePayload;
      const tokenPayload = (() => {
        try {
          return jwt.verify(signInRes.token, process.env.JWT_SECRET as string);
        } catch (e) {
          expect(e).toBe(undefined);
        }
        return null;
      })();
      const refreshTokenPayload = (() => {
        try {
          return jwt.verify(signInRes.token, process.env.JWT_SECRET as string);
        } catch (e) {
          expect(e).toBe(undefined);
        }
        return null;
      })();

      expect(tokenPayload).not.toBe(null);
      expect(refreshTokenPayload).not.toBe(null);
      expect(signInRes.nickName).toBe(signUp.correctParam.nickName);
      expect(signInRes.email).toBe(signUp.correctParam.id);

      const dbUser = await prisma.user.findFirst({
        where: {
          id: signInRes.userId,
        },
      });
      expect(dbUser).not.toBeNull();
      if (dbUser) {
        const compareResult: Boolean = await compare(
          signIn.correctParam.password,
          dbUser.password,
        );
        expect(compareResult).toBe(true);
      }
    });
  });
});
