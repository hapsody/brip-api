import express, { Request, Response } from 'express';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import passport from 'passport';
import path from 'path';
import compression from 'compression';
import dotenv from 'dotenv';
// import cors from 'cors';
import authRouter from './routes/auth';
import scheduleRouter from './routes/schedule';
import contentRouter from './routes/content';
import settingRouter from './routes/setting';
import tripNetworkRouter from './routes/tripNetwork';
import devRouter from './routes/dev';

import passportConfig from './passport';

const app: express.Application = express();

function shouldCompress(req: Request, res: Response) {
  if (req.headers['x-no-compression']) {
    // don't compress responses with this request header
    return false;
  }

  // fallback to standard filter function
  return compression.filter(req, res);
}

app.use(compression({ filter: shouldCompress }));
dotenv.config();
app.use(express.json());
app.use(morgan('dev'));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser(process.env.COOKIE_SECRET || 'default_cookie_secret_16'));

app.use(passport.initialize());
// app.use(passport.session());
passportConfig(passport);

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept',
  );
  next();
});

// app.use(
//   cors({
//     origin: 'https://map.vworld.kr',
//     credentials: true,
//   }),
// );

app.use('/auth', authRouter);
app.use('/schedule', scheduleRouter);
app.use('/content', contentRouter);
app.use('/setting', settingRouter);
app.use('/tripNetwork', tripNetworkRouter);
app.use('/dev', devRouter);

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
// app.engine('html', ejs.renderFile);
// app.set('view engine', 'html');

app.get('/', (req: Request, res: Response) => {
  res.send('hello world!!!');
});

app.get('/mapTest', (req: Request, res: Response) => {
  const { type } = req.query;
  res.render(`mapSample`, { type });
});

// app.get('/resJsonTest', (req: express.Request, res: express.Response) => {
//     res.json([
//       { id: 1, content: 'hello' },
//       { id: 2, content: 'hello2' },
//       { id: 3, content: 'hello3' },
//     ]);
// });

// app.listen(process.env.PORT, () => {
//   console.log(`ts-express Server listening on port: ${process.env.PORT}`);
// });

export default app;
