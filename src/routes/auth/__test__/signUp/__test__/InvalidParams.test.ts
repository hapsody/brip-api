import request from 'supertest';
import server from '@src/server';
import { params } from '../../testData';
import {
  SignUpResponseType,
  ReqNonMembersUserTokenResType,
  ReqNonMembersUserTokenSuccessResType,
} from '../../../auth';

const { signUp } = params;

let userToken: string;
beforeAll(async () => {
  const userTokenRawRes = await request(server)
    .post('/auth/reqNonMembersUserToken')
    .send();
  const userTokenRes = userTokenRawRes.body as ReqNonMembersUserTokenResType;
  userToken = (userTokenRes.IBparams as ReqNonMembersUserTokenSuccessResType)
    .userToken;
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
        .post('/auth/signUp')
        .set('Authorization', `Bearer ${userToken}`)
        .send(signUp.invalidParam.undefinedBody);

      const undefinedBodyRes = undefinedBodyRawRes.body as SignUpResponseType;

      expect(undefinedBodyRes.IBcode).toBe('3001');
      expect(undefinedBodyRes.IBdetail).toBe('파라미터가 제공되지 않았습니다.');
      expect(undefinedBodyRawRes.statusCode).toBe(400);
    });
    describe('required 파라미터 부분적 누락', () => {
      it('id, nickName 제외 undefined', async () => {
        const undefinedBodyRawRes = await request(server)
          .post('/auth/signUp')
          .set('Authorization', `Bearer ${userToken}`)
          .send(signUp.invalidParam.partNullOrUndefined);

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
