import request from 'supertest';
import app from '@src/app';
import prisma from '@src/prisma';
import { User } from '@prisma/client';
import { ibDefs, IBResFormat, genBcryptHash } from '@src/utils';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

let testData: {
  email: string;
  password: string;
  name: string;
};
let testUser: User;

beforeAll(async () => {
  testData = {
    email: 'IBJestTest99@gmail.com',
    password: 'qwer1234',
    name: 'idealbloom',
  };

  testUser = await prisma.user.upsert({
    where: {
      email: testData.email,
    },
    update: {
      email: testData.email,
      password: genBcryptHash(testData.password),
      name: testData.name,
    },
    create: {
      email: testData.email,
      password: genBcryptHash(testData.password),
      name: testData.name,
    },
  });
});
afterAll(async () => {
  await prisma.user.delete({
    where: {
      email: testUser.email,
    },
  });
});

describe('Auth Express Router E2E Test', () => {
  describe('POST /signIn', () => {
    it('Case: Correct', async () => {
      const response = await request(app).post('/auth/signIn').send({
        email: testData.email,
        password: testData.password,
      });

      const result: IBResFormat = response.body as IBResFormat;
      expect(result.IBcode).toEqual({ ...ibDefs.SUCCESS }.IBcode);
    });
    it('Case: Incorrect email', async () => {
      const response = await request(app).post('/auth/signIn').send({
        email: 'errorAccount@error.test.com',
        password: 'errorrrrrr',
      });
      const result = response.body as IBResFormat;
      expect(response.statusCode).toEqual(404);
      expect(result.IBcode).toEqual({ ...ibDefs.NOTEXISTDATA }.IBcode);
    });

    it('Case: Incorrect password', async () => {
      const response = await request(app).post('/auth/signIn').send({
        email: testData.email,
        password: 'errorrrrrr',
      });
      const result = response.body as IBResFormat;
      expect(response.statusCode).toEqual(404);
      expect(result.IBcode).toEqual({ ...ibDefs.NOTMATCHEDDATA }.IBcode);
    });
    it('Case: No Params', async () => {
      const response = await request(app).post('/auth/signIn').send();
      const result = response.body as IBResFormat;
      expect(response.statusCode).toEqual(400);
      expect(result.IBcode).toEqual({ ...ibDefs.INVALIDPARAMS }.IBcode);
    });
    it('Case: UNEXPECTED Error', async () => {
      const response = await request(app).post('/auth/signIn').send();
      const result = response.body as IBResFormat;
      expect(response.statusCode).toEqual(400);
      expect(result.IBcode).toEqual({ ...ibDefs.INVALIDPARAMS }.IBcode);
    });
  });

  describe('POST /signup', () => {
    it('Case: Correct', async () => {
      const inputParams = {
        email: 'test@gmail.com',
        password: 'testPassword',
        name: 'testName',
      };
      const response = await request(app)
        .post('/auth/signUp')
        .send(inputParams);

      const { IBcode, IBparams }: IBResFormat = response.body as IBResFormat;
      expect(IBcode).toEqual('1000');
      // expect(IBparams).not.toMatch({});
      expect(IBparams).not.toBeNull();

      const { id }: { id: number } = IBparams as User;
      const [user] = await prisma.user.findMany({
        where: {
          id,
        },
      });
      // console.log(user);
      expect(response.statusCode).toEqual(200);
      expect(user.email).toBe(inputParams.email);
      const passwordMatch = await bcrypt.compare(
        inputParams.password,
        user.password,
      );
      expect(passwordMatch).toBe(true);
      expect(user.name).toBe(inputParams.name);
    });

    it('Case: Invalid Params', async () => {
      let inputParams = {
        email: 'test@gmail.com',
        password: '',
        name: 'testName',
      };
      let response = await request(app).post('/auth/signUp').send(inputParams);

      const { IBcode }: IBResFormat = response.body as IBResFormat;
      expect(response.statusCode).toEqual(400);
      expect(IBcode).toEqual({ ...ibDefs.INVALIDPARAMS }.IBcode);

      inputParams = {
        email: '',
        password: '1234',
        name: 'testName',
      };
      response = await request(app).post('/auth/signUp').send(inputParams);

      const { IBcode: case2IBcode }: IBResFormat = response.body as IBResFormat;
      expect(response.statusCode).toEqual(400);
      expect(case2IBcode).toEqual({ ...ibDefs.INVALIDPARAMS }.IBcode);

      const invalidCaseParams = {};
      response = await request(app)
        .post('/auth/signUp')
        .send(invalidCaseParams);

      const { IBcode: case3IBcode }: IBResFormat = response.body as IBResFormat;
      expect(response.statusCode).toEqual(400);
      expect(case3IBcode).toEqual({ ...ibDefs.INVALIDPARAMS }.IBcode);
    });
  });

  describe('POST /authGuardTest', () => {
    it('Case: Correct', async () => {
      const inputParams = {
        testParam: 'test',
      };

      const randNo = '1234';
      const accessToken: string = jwt.sign(
        { email: 'test@gmail.com', randNo },
        process.env.JWT_SECRET || 'test_secret',
        {
          expiresIn: '12h',
        },
      );

      const response = await request(app)
        .post('/auth/authGuardTest')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(inputParams);

      const { IBcode, IBparams }: IBResFormat = response.body as IBResFormat;
      expect(IBcode).toEqual('1000');
      // expect(IBparams).not.toMatch({});
      expect(IBparams).not.toBeNull();
    });
    it('Case: Not Existed email', async () => {
      const inputParams = {
        testParam: 'test',
      };

      const randNo = '1234';
      const accessToken: string = jwt.sign(
        { email: 'notexistedemail@gmail.com', randNo },
        process.env.JWT_SECRET || 'test_secret',
        {
          expiresIn: '12h',
        },
      );

      const response = await request(app)
        .post('/auth/authGuardTest')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(inputParams);

      const { IBcode }: IBResFormat = response.body as IBResFormat;
      expect(IBcode).toEqual('2001');
      expect(response.statusCode).toEqual(404);
    });
  });
});
