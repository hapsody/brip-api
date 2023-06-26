import { createClient } from 'redis';
import dotenv from 'dotenv';

dotenv.config();

const redisClient = createClient({
  url: `redis://${process.env.REDIS_URL as string}:${
    process.env.REDIS_PORT as string
  }`,
});

export default redisClient;
