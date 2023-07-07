// import { createClient } from 'redis';
import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

const redisClient = new Redis(
  `redis://${process.env.REDIS_URL as string}:${
    process.env.REDIS_PORT as string
  }`,
  {
    ...((process.env.EXECUTE_ENV as string) !== 'localhost' && {
      tls: { rejectUnauthorized: false },
    }),
  },
);

// const redisClient = (() => {
//   // if ((process.env.EXECUTE_ENV as string) !== 'localhost') {
//   //   const redis = new Redis(
//   //     `redis://${process.env.REDIS_URL as string}:${
//   //       process.env.REDIS_PORT as string
//   //     }`,
//   //     {
//   //       tls: { rejectUnauthorized: false },
//   //     },
//   //   );
//   //   return redis;
//   // }
//   console.log(
//     `redis://${process.env.REDIS_URL as string}:${
//       process.env.REDIS_PORT as string
//     }`,
//   );
//   const redis = new Redis(
//     `redis://${process.env.REDIS_URL as string}:${
//       process.env.REDIS_PORT as string
//     }`,
//   );
//   return redis;
// })();

// const redisClient = new Redis(6379, '127.0.0.1', {
//   tls: {
//     rejectUnauthorized: false,
//   },
// });

dotenv.config();

// const redisClient = createClient({

//   url: `redis://${process.env.REDIS_URL as string}:${
//     process.env.REDIS_PORT as string
//   }`,
// });

export default redisClient;
