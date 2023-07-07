// reference https://javascript.plainenglish.io/typed-express-request-and-response-with-typescript-7277aea028c
import express from 'express';
import { IBResFormat, GuardRes } from '@src/utils';
import { Send } from '@types/express-serve-static-core';

export {};
declare global {
  // interface ISignUpRequest {
  //   email: string;
  //   password: string;
  //   name: string;
  // }

  namespace Express {
    export interface IBAuthGuardRequest extends express.Request {
      locals?: GuardRes & {
        resMessages?: IBResFormat;
      };
    }

    export interface IBTypedReqBody<T> extends IBAuthGuardRequest {
      body: T;
    }

    export interface IBTypedReqQuery<T> extends IBAuthGuardRequest {
      query: T;
    }

    export interface IBTypedResponse<ResBody> extends express.Response {
      status(code: StatusCode): this;
      json: Send<ResBody, this>;
    }
    // export interface Request {
    //   locals?: {
    //     resMessages: IBResFormat;
    //   };
    // }
  }
}
