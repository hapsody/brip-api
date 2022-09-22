import request from 'supertest';
import app from '@src/app';
import { params } from './testData';
import { SignUpResponse } from '../../../auth';

const { invalidParam } = params;

describe('InvalidParams test', () => {
  describe('null or undefined params', () => {
    it('undefined request body', async () => {
      const undefinedBodyRawRes = await request(app)
        .post('/auth/signUp')
        .send(invalidParam.undefinedBody);

      const undefinedBodyRes = undefinedBodyRawRes.body as SignUpResponse;

      expect(undefinedBodyRawRes.statusCode).toBe(400);
      expect(undefinedBodyRes.IBcode).toBe('3001');
      expect(undefinedBodyRes.IBdetail).toBe('파라미터가 제공되지 않았습니다.');
    });
    describe('required 파라미터 부분적 누락', () => {
      it('id, nickName 제외 undefined', async () => {
        const undefinedBodyRawRes = await request(app)
          .post('/auth/signUp')
          .send(invalidParam.partNullOrUndefined);

        const undefinedBodyRes = undefinedBodyRawRes.body as SignUpResponse;

        expect(undefinedBodyRawRes.statusCode).toBe(400);
        expect(undefinedBodyRes.IBcode).toBe('3001');
        expect(undefinedBodyRes.IBdetail).toBe(
          'password,phone,phoneAuthCode,countryCode,userToken 파라미터가 제공되지 않았습니다.',
        );
      });
    });
  });
});
