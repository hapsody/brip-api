import request from 'supertest';
import app from '@src/app';
import jwt from 'jsonwebtoken';
import {
  ReqNonMembersUserTokenResType,
  ReqNonMembersUserTokenSuccessResType,
} from '../../auth';

describe('POST /reqNonMembersUserToken api 테스트', () => {
  it('정상 요청 예시', async () => {
    const rawRes = await request(app)
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
