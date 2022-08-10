import request from 'supertest';
import app from '@src/app';
import prisma from '@src/prisma';
import { User } from '@prisma/client';
import { ibDefs, IBResFormat, genBcryptHash } from '@src/utils';

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
  });
});
