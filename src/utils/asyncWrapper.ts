import { NextFunction, Request, Response } from 'express';
import { ibDefs } from './IBDefinitions';

/**
 * 라우터 함수로 async 함수를 직접 등록하면 void 리턴이 아닌
 * Promise<void> 리턴이기 때문에 아래같은 lint 에러가 발생한다.
 *
 * Promise returned in function argument where a void return was expected.
 * eslint @typescript-eslint/no-misused-promises
 *
 * 이를 방지하기 위해 아래와 같이 wrapper 함수를 쓰든가
 * express-async-handler 를 설치 사용하도록 한다.
 */
declare type AsyncFn = (
  req: Express.Request,
  res: Express.Response,
  next?: NextFunction,
) => Promise<void>;

const asyncWrapper = (asyncFn: AsyncFn) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    asyncFn(req, res, next).catch((e: Error) => {
      console.error(e);
      res.status(500).json({ ...ibDefs.UNEXPECTED, IBdetail: e.message });
    });
  };
};

export default asyncWrapper;
