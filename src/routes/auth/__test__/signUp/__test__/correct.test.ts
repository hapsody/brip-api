import request from 'supertest';
import app from '@src/app';
import prisma from '@src/prisma';
import { compare } from 'bcrypt';
import { User } from '@prisma/client';
import { params } from './testData';
import { SignUpResponse } from '../../../auth';

const { correctParam } = params;
let signUpRawResult: SignUpResponse;
let user: User;
beforeAll(async () => {
  const preCheckIfAlreadyExist = await prisma.user.findFirst({
    where: {
      email: correctParam.id,
    },
  });
  if (preCheckIfAlreadyExist) {
    await prisma.user.delete({
      where: {
        id: preCheckIfAlreadyExist.id,
      },
    });
  }
  const response = await request(app).post('/auth/signUp').send(correctParam);

  signUpRawResult = response.body as SignUpResponse;
  user = signUpRawResult.IBparams as User;
  expect(user.id).not.toBeUndefined(); // User DB 생성 실패
});

describe('Correct case test', () => {
  describe('정상 요청 예시', () => {
    it('파라미터 입력값이 제대로 반영된 결과인지 파라미터 값과 응답값 비교', async () => {
      expect(user.email).toBe(correctParam.id);
      expect(user.phone).toBe(correctParam.phone);
      expect(user.nickName).toBe(correctParam.nickName);
      expect(user.countryCode).toBe(correctParam.cc);
      expect(user.userToken).toBe(correctParam.userToken);
      expect(user.password).toBeUndefined();

      const dbUser = await prisma.user.findFirst({
        where: {
          id: user.id,
        },
      });
      expect(dbUser).not.toBeNull();
      if (dbUser) {
        const compareResult: Boolean = await compare(
          correctParam.password,
          dbUser.password,
        );
        expect(compareResult).toBe(true);
      }
    });
  });
});
