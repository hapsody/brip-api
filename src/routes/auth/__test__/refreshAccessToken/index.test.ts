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
  RefreshAccessTokenResType,
  RefreshAccessTokenSuccessResType,
} from '../../auth';
import { params } from '../testData';

const { signUp, signIn } = params;
let signUpRawResult: SignUpResponseType;
let signInRes: SaveScheduleResponsePayload;
let user: User;
let refreshToken: string;
let userId: string;
beforeAll(async () => {
  // 기존 테스트 유저가 존재하는지 확인 => 존재하면 삭제
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

  // signUp
  const userTokenRawRes = await request(app)
    .post('/auth/reqNonMembersUserToken')
    .send();
  const userTokenRes = userTokenRawRes.body as ReqNonMembersUserTokenResType;
  const userToken =
    userTokenRes.IBparams as ReqNonMembersUserTokenSuccessResType;

  let response = await request(app)
    .post('/auth/signUp')
    .set('Authorization', `Bearer ${userToken.userToken}`)
    .send(signUp.correctParam);

  signUpRawResult = response.body as SignUpResponseType;
  user = signUpRawResult.IBparams as User;
  expect(user.id).not.toBeUndefined();

  // signIn
  response = await request(app).post('/auth/signIn').send(signIn.correctParam);
  const signInRawRes = response.body as SignInResponse;
  signInRes = signInRawRes.IBparams as SaveScheduleResponsePayload;
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

  refreshToken = signInRes.refreshToken;
  userId = dbUser ? dbUser.id.toString() : '';
});

describe('POST /refreshAccessToken api 테스트', () => {
  it('정상 요청 예시', async () => {
    const response = await request(app).post('/auth/refreshAccessToken').send({
      refreshToken,
      userId,
    });
    const refreshAccessTokenRawRes = response.body as RefreshAccessTokenResType;
    const refreshAccessTokenRes =
      refreshAccessTokenRawRes.IBparams as RefreshAccessTokenSuccessResType;

    expect(refreshAccessTokenRes.email).toBe(signInRes.email);
    expect(refreshAccessTokenRes.nickName).toBe(signInRes.nickName);
    expect(refreshAccessTokenRes.token).not.toBe(undefined);
    expect(refreshAccessTokenRes.userId).toBe(signInRes.userId);
    const newAccessToken = refreshAccessTokenRes.token;

    const checkResponse = await request(app)
      .post('/auth/authGuardTest')
      .set('Authorization', `Bearer ${newAccessToken}`);

    expect(checkResponse.statusCode).toBe(200);
  });
});
