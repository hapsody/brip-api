import request from 'supertest';
import app from '@src/app';
import { params } from './testData';
import {
  SignUpResponseType,
  ReqNonMembersUserTokenResType,
  ReqNonMembersUserTokenSuccessResType,
} from '../../../auth';

const { invalidParam } = params;

let userToken: string;
beforeAll(async () => {
  const userTokenRawRes = await request(app)
    .post('/auth/reqNonMembersUserToken')
    .send();
  const userTokenRes = userTokenRawRes.body as ReqNonMembersUserTokenResType;
  userToken = (userTokenRes.IBparams as ReqNonMembersUserTokenSuccessResType)
    .userToken;
});

describe('InvalidParams test', () => {
  describe('null or undefined params', () => {
    it('undefined request body', async () => {
      const undefinedBodyRawRes = await request(app)
        .post('/auth/signUp')
        .set('Authorization', `Bearer ${userToken}`)
        .send(invalidParam.undefinedBody);

      const undefinedBodyRes = undefinedBodyRawRes.body as SignUpResponseType;

      expect(undefinedBodyRes.IBcode).toBe('3001');
      expect(undefinedBodyRes.IBdetail).toBe('파라미터가 제공되지 않았습니다.');
      expect(undefinedBodyRawRes.statusCode).toBe(400);
    });
    describe('required 파라미터 부분적 누락', () => {
      it('id, nickName 제외 undefined', async () => {
        const undefinedBodyRawRes = await request(app)
          .post('/auth/signUp')
          .set('Authorization', `Bearer ${userToken}`)
          .send(invalidParam.partNullOrUndefined);

        const undefinedBodyRes = undefinedBodyRawRes.body as SignUpResponseType;

        expect(undefinedBodyRes.IBcode).toBe('3001');
        expect(undefinedBodyRes.IBdetail).toBe(
          'password,phone,phoneAuthCode,countryCode 파라미터가 제공되지 않았습니다.',
        );
        expect(undefinedBodyRawRes.statusCode).toBe(400);
      });
    });
  });
});
