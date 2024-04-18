import { VerifiedCallback } from 'passport-jwt';
// import { wrapper } from './jwtStrategy';

describe('jwtStrategy E2E Test', () => {
  it('Case: UNEXPECTED Exception Handling', async () => {
    const logSpy = jest.spyOn(console, 'error');
    // const testWrapper = wrapper(
    //   // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/require-await
    //   async (jwtPayload: unknown, done: VerifiedCallback) => {
    //     throw new Error('test Error');
    //   },
    // );
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const verifiedCb: VerifiedCallback = err => {
      // nothing to mean. just to provide parameter to run wrapper's catch section
    };
    const mockedVerifiedCb = jest.fn().mockImplementation(verifiedCb);

    // testWrapper(null, mockedVerifiedCb);
    await new Promise(resolve => {
      // jwtStrategy.wrapper 의 catch절에서
      // console.error의 발생이 비동기적으로 동작하기 때문에 잠시 wait한다.
      setTimeout(() => {
        resolve(true);
      }, 1000);
    });

    expect(logSpy).toHaveBeenCalledWith(Error('test Error'));
    expect(mockedVerifiedCb).toBeCalledTimes(1);
  });
});
