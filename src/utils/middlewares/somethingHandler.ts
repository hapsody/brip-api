import { Express, Response } from 'express';

const somethingHandler = (
  req: Express.IBTypedReqBody<{}>,
  res: Response,
  //   next: NextFunction,
): void => {
  // const {
  //   locals: { resMessages },
  // } = req;

  if (req.locals?.resMessages) res.status(200).json(req.locals?.resMessages);
};

export default somethingHandler;
