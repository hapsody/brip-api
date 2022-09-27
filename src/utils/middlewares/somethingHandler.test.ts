import { Express, NextFunction } from 'express';
import app from '@src/app';
import request from 'supertest';
import { asyncWrapper, ibDefs } from '@src/utils';
import somethingHandler from './somethingHandler';
import { IBResFormat } from '../IBDefinitions';

describe('somethingHandler E2E Test', () => {
  describe('Calling asyncWrapper', () => {
    it('Case: normal', async () => {
      expect.assertions(3);
      const asyncTestFunc = async (
        req: Express.IBTypedReqBody<{}>,
        res: Express.Response,
        next: NextFunction,
      ) => {
        const testRet: IBResFormat = await new Promise(resolve => {
          for (let i = 0; i < 1000000; i += 1);
          resolve(
            (() => {
              expect(1).toBe(1);
              return { ...ibDefs.SUCCESS };
            })(),
          );
        });
        req.locals = {
          grade: 'nonMember',
          resMessages: testRet,
        };
        next();
      };
      app.post(
        '/asyncWrapperTest',
        asyncWrapper(asyncTestFunc),
        somethingHandler,
      );
      const response = await request(app).post('/asyncWrapperTest').send({});
      expect(response.statusCode).toBe(200);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(response.body.IBcode).toBe('1000');
    });
  });
});
