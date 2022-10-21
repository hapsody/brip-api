import request from 'supertest';
import server from '@src/server';
import prisma from '@src/prisma';
import { User } from '@prisma/client';
import { params } from '../../testData';
import {
  SignInResponse,
  SignUpResponseType,
  ReqNonMembersUserTokenResType,
  ReqNonMembersUserTokenSuccessResType,
} from '../../../auth';

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

describe('InvalidParams test', () => {
  describe('null or undefined params', () => {
    it('undefined request body', async () => {
      const undefinedBodyRawRes = await request(server)
        .post('/auth/signIn')
        .send(signIn.invalidParam.undefinedBody);

      const undefinedBodyRes = undefinedBodyRawRes.body as SignUpResponseType;

      expect(undefinedBodyRes.IBcode).toBe('3001');
      expect(undefinedBodyRes.IBdetail).toBe('Missing credentials');
      expect(undefinedBodyRawRes.statusCode).toBe(400);
    });
    it('incorrect email', async () => {
      const response = await request(server)
        .post('/auth/signIn')
        .send(signIn.invalidParam.incorrectEmail);
      const signInRawRes = response.body as SignInResponse;

      expect(signInRawRes.IBcode).toBe('2001');
      expect(signInRawRes.IBdetail).toBe('Incorrect username.');
      expect(response.statusCode).toBe(404);
    });
    it('incorrect password', async () => {
      const response = await request(server)
        .post('/auth/signIn')
        .send(signIn.invalidParam.incorrectPassword);
      const signInRawRes = response.body as SignInResponse;

      expect(signInRawRes.IBcode).toBe('2002');
      expect(signInRawRes.IBdetail).toBe('Incorrect password.');
      expect(response.statusCode).toBe(404);
    });
  });
});
