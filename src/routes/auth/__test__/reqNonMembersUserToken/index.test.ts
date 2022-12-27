import request from 'supertest';
import server from '@src/server';
import jwt from 'jsonwebtoken';
import {
  ReqNonMembersUserTokenResType,
  ReqNonMembersUserTokenSuccessResType,
} from '../../auth';

afterAll(done => {
  server.close(err => {
    if (err) console.error(err);
    done();
  });
});

describe('POST /reqNonMembersUserToken api 테스트', () => {
  it('정상 요청 예시', async () => {
    const rawRes = await request(server)
      .post('/auth/reqNonMembersUserToken')
      .send();
    const res = rawRes.body as ReqNonMembersUserTokenResType;

    expect(res.IBparams).toHaveProperty('userToken');

    const decoded = jwt.verify(
      (res.IBparams as ReqNonMembersUserTokenSuccessResType).userToken,
      process.env.JWT_SECRET as string,
    );
    expect(decoded).not.toBeUndefined();
  });
});
