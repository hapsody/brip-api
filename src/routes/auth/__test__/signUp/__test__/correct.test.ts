import request from 'supertest';
import server from '@src/server';
import prisma from '@src/prisma';
import { compare } from 'bcrypt';
import { User } from '@prisma/client';
import { params } from '../../testData';
import {
  SignUpResponseType,
  ReqNonMembersUserTokenResType,
  ReqNonMembersUserTokenSuccessResType,
} from '../../../auth';

const { signUp } = params;
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
  const userTokenRawRes = await request(server)
    .post('/auth/reqNonMembersUserToken')
    .send();
  const userTokenRes = userTokenRawRes.body as ReqNonMembersUserTokenResType;
  const userToken =
    userTokenRes.IBparams as ReqNonMembersUserTokenSuccessResType;

  const response = await request(server)
    .post('/auth/signUp')
    .set('Authorization', `Bearer ${userToken.userToken}`)
    .send(signUp.correctParam);

  signUpRawResult = response.body as SignUpResponseType;
  user = signUpRawResult.IBparams as User;
  expect(user.id).not.toBeUndefined();
});

afterAll(done => {
  server.close(err => {
    if (err) console.error(err);
    done();
  });
});

describe('Correct case test', () => {
  describe('정상 요청 예시', () => {
    it('파라미터 입력값이 제대로 반영된 결과인지 파라미터 값과 응답값 비교', async () => {
      expect(user.email).toBe(signUp.correctParam.id);
      expect(user.phone).toBe(signUp.correctParam.phone);
      expect(user.nickName).toBe(signUp.correctParam.nickName);
      expect(user.countryCode).toBe(signUp.correctParam.cc);
      // expect(user.userTokenId).toBe(signUp.correctParam.userToken);
      expect(user.password).toBeUndefined();

      const dbUser = await prisma.user.findFirst({
        where: {
          id: user.id,
        },
      });
      expect(dbUser).not.toBeNull();
      if (dbUser) {
        const compareResult: Boolean = await compare(
          signUp.correctParam.password,
          dbUser.password,
        );
        expect(compareResult).toBe(true);
      }
    });
  });
});
