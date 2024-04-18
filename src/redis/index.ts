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

// dev-redis cli 명령과 데이터 포맷 예시
// dev-redis:6379> scan 0
// 1) "6"
// 2)  1) "lastMsg:company:8"
//     2) "dbSyncStartIdxNOrder:3=>5"
//     3) "3=>5"
//     4) "sysNoti:12"
//     5) "lastMsg:customer:12"
//     6) "tourPlaceInfo:19235"
//     7) "userInfo:1"
//     8) "sysNoti:3"
//     9) "userInfo:14"
//    10) "dbSyncStartIdxNOrder:8=>12"
// dev-redis:6379> hgetall lastMsg:company:8
// 1) "12"
// 2) "{\"uuid\":\"96bc4639-beb9-4307-98fb-270ad9411b76\",\"adPlaceId\":\"3\",\"isUnread\":false,\"from\":\"8\",\"to\":\"12\",\"customerId\":\"12\",\"companyId\":\"8\",\"createdAt\":\"2023-09-10T23:42:11.468Z\",\"type\":\"FINALBOOKINGCHECK\",\"order\":\"8\",\"message\":\"\xec\x98\x88\xec\x95\xbd\xec\x9d\xb4 \xed\x99\x95\xec\xa0\x95\xeb\x90\x98\xec\x97\x88\xec\x96\xb4\xec\x9a\x94!\\n\xed\x99\x95\xec\xa0\x95\xeb\x90\x9c \xec\x98\x88\xec\x95\xbd\xec\x9d\x80 \xeb\xa7\x88\xec\x9d\xb4\xeb\xb6\x81\xec\x97\x90\xec\x84\x9c \xeb\xb3\xbc \xec\x88\x98 \xec\x9e\x88\xec\x96\xb4\xec\x9a\x94.\\n\xec\x9e\x8a\xec\xa7\x80 \xec\x95\x8a\xea\xb3\xa0 \xec\x98\x88\xec\x95\xbd\xec\x9d\xbc\xec\x97\x90 \xeb\xb4\xac\xec\x9a\x94!\",\"bookingActionInputParams\":{\"reqUserNickname\":\"\xed\x85\x8c\xec\x8a\xa4\xed\x8a\xb82\",\"reqUserContact\":null,\"date\":\"2023-09-20T01:00:00.000Z\",\"numOfPeople\":\"2\"},\"adPlace\":{\"id\":3,\"title\":\"\xed\x85\x8c\xec\x8a\xa4\xed\x8a\xb81\xea\xb0\x80\xea\xb2\x8c\",\"mainTourPlaceId\":19235}}"
// dev-redis:6379> get dbSyncStartIdxNOrder:3=>5
// "0:8"
// dev-redis:6379> hgetall lastMsg:company:8
// 1) "12"
// 2) "{\"uuid\":\"96bc4639-beb9-4307-98fb-270ad9411b76\",\"adPlaceId\":\"3\",\"isUnread\":false,\"from\":\"8\",\"to\":\"12\",\"customerId\":\"12\",\"companyId\":\"8\",\"createdAt\":\"2023-09-10T23:42:11.468Z\",\"type\":\"FINALBOOKINGCHECK\",\"order\":\"8\",\"message\":\"\xec\x98\x88\xec\x95\xbd\xec\x9d\xb4 \xed\x99\x95\xec\xa0\x95\xeb\x90\x98\xec\x97\x88\xec\x96\xb4\xec\x9a\x94!\\n\xed\x99\x95\xec\xa0\x95\xeb\x90\x9c \xec\x98\x88\xec\x95\xbd\xec\x9d\x80 \xeb\xa7\x88\xec\x9d\xb4\xeb\xb6\x81\xec\x97\x90\xec\x84\x9c \xeb\xb3\xbc \xec\x88\x98 \xec\x9e\x88\xec\x96\xb4\xec\x9a\x94.\\n\xec\x9e\x8a\xec\xa7\x80 \xec\x95\x8a\xea\xb3\xa0 \xec\x98\x88\xec\x95\xbd\xec\x9d\xbc\xec\x97\x90 \xeb\xb4\xac\xec\x9a\x94!\",\"bookingActionInputParams\":{\"reqUserNickname\":\"\xed\x85\x8c\xec\x8a\xa4\xed\x8a\xb82\",\"reqUserContact\":null,\"date\":\"2023-09-20T01:00:00.000Z\",\"numOfPeople\":\"2\"},\"adPlace\":{\"id\":3,\"title\":\"\xed\x85\x8c\xec\x8a\xa4\xed\x8a\xb81\xea\xb0\x80\xea\xb2\x8c\",\"mainTourPlaceId\":19235}}"
// dev-redis:6379> hget dbSyncStartIdxNOrder:3=>5
// (error) ERR wrong number of arguments for 'hget' command
// dev-redis:6379> hgetall dbSyncStartIdxNOrder:3=>5
// (error) WRONGTYPE Operation against a key holding the wrong kind of value
// dev-redis:6379> \get dbSyncStartIdxNOrder:3=>5
// (error) ERR unknown command '\get', with args beginning with: 'dbSyncStartIdxNOrder:3=>5'
// dev-redis:6379> get dbSyncStartIdxNOrder:3=>5
// "0:8"
// dev-redis:6379> lrange 3=>5 0 -1
// 1) "{\"uuid\":\"06e13d5f-3d33-4da3-a69d-8bdbc8539eea\",\"adPlaceId\":\"5\",\"isUnread\":true,\"from\":\"5\",\"to\":\"3\",\"customerId\":\"3\",\"companyId\":\"5\",\"createdAt\":\"2023-09-08T11:47:24.119Z\",\"type\":\"FINALBOOKINGCHECK\",\"order\":\"8\",\"message\":\"\xec\x98\x88\xec\x95\xbd\xec\x9d\xb4 \xed\x99\x95\xec\xa0\x95\xeb\x90\x98\xec\x97\x88\xec\x96\xb4\xec\x9a\x94!\\n\xed\x99\x95\xec\xa0\x95\xeb\x90\x9c \xec\x98\x88\xec\x95\xbd\xec\x9d\x80 \xeb\xa7\x88\xec\x9d\xb4\xeb\xb6\x81\xec\x97\x90\xec\x84\x9c \xeb\xb3\xbc \xec\x88\x98 \xec\x9e\x88\xec\x96\xb4\xec\x9a\x94.\\n\xec\x9e\x8a\xec\xa7\x80 \xec\x95\x8a\xea\xb3\xa0 \xec\x98\x88\xec\x95\xbd\xec\x9d\xbc\xec\x97\x90 \xeb\xb4\xac\xec\x9a\x94!\",\"bookingActionInputParams\":{\"reqUserNickname\":\"\xec\xb9\xa8\xec\xb0\xa9\xeb\xa7\xa8\",\"reqUserContact\":\"+82-1012345678\",\"date\":\"2023-12-01T03:12:00.000Z\",\"numOfPeople\":\"1\"},\"adPlace\":{\"id\":5,\"title\":\"\xed\x9d\xac\xec\xa4\x80\xea\xb5\xad\xec\x88\x98\",\"mainTourPlaceId\":19237}}"
// 2) "{\"uuid\":\"e71c6041-866e-4f85-9e97-f1109ce91365\",\"adPlaceId\":\"5\",\"from\":\"3\",\"to\":\"5\",\"createdAt\":\"2023-09-08T11:50:31.783Z\",\"order\":\"9\",\"message\":\"Dd\",\"type\":\"TEXT\",\"companyId\":\"5\",\"customerId\":\"3\",\"isUnread\":true,\"adPlace\":{\"id\":5,\"title\":\"\xed\x9d\xac\xec\xa4\x80\xea\xb5\xad\xec\x88\x98\",\"mainTourPlaceId\":19237}}"
// dev-redis:6379> type sysNoti:12
// list
// dev-redis:6379> lrange sysNoti:12 0 -1
// 1) "{\"uuid\":\"c5742d03-c5e5-4b07-977d-0dc872a5afb5\",\"userId\":\"12\",\"createdAt\":\"2023-09-10T23:40:31.230Z\",\"type\":\"BOOKINGCOMPLETE\",\"message\":\"\xed\x85\x8c\xec\x8a\xa4\xed\x8a\xb81 \xeb\x8b\x98\xec\x9d\x98 9\xec\x9b\x94 11\xec\x9d\xbc 10\xec\x8b\x9c \xed\x85\x8c\xec\x8a\xa4\xed\x8a\xb82 \xec\x83\x81\xed\x98\xb8\xec\x9d\x98 \xec\x98\x88\xec\x95\xbd\xec\x9d\xb4 \xed\x99\x95\xec\xa0\x95\xeb\x90\x98\xec\x97\x88\xec\x96\xb4\xec\x9a\x94.\",\"additionalInfo\":{\"bookingChat\":{\"adPlaceId\":\"6\",\"customerId\":\"8\",\"companyId\":\"12\"}}}"
// 2) "{\"uuid\":\"7b032887-4b9d-437a-bd08-60c2880aac81\",\"userId\":\"12\",\"createdAt\":\"2023-09-10T23:41:03.165Z\",\"type\":\"BOOKINGCOMPLETE\",\"message\":\"\xed\x85\x8c\xec\x8a\xa4\xed\x8a\xb81 \xeb\x8b\x98\xec\x9d\x98 9\xec\x9b\x94 12\xec\x9d\xbc 10\xec\x8b\x9c \xed\x85\x8c\xec\x8a\xa4\xed\x8a\xb82 \xec\x83\x81\xed\x98\xb8\xec\x9d\x98 \xec\x98\x88\xec\x95\xbd\xec\x9d\xb4 \xed\x99\x95\xec\xa0\x95\xeb\x90\x98\xec\x97\x88\xec\x96\xb4\xec\x9a\x94.\",\"additionalInfo\":{\"bookingChat\":{\"adPlaceId\":\"6\",\"customerId\":\"8\",\"companyId\":\"12\"}}}"
// 3) "{\"uuid\":\"d9cc2915-7b00-4f63-9eda-5e8c6c49af7f\",\"userId\":\"12\",\"createdAt\":\"2023-09-10T23:42:11.468Z\",\"type\":\"BOOKINGCOMPLETE\",\"message\":\"9\xec\x9b\x94 20\xec\x9d\xbc 10\xec\x8b\x9c \xed\x85\x8c\xec\x8a\xa4\xed\x8a\xb81\xea\xb0\x80\xea\xb2\x8c\xec\x97\x90 \xec\x98\x88\xec\x95\xbd\xec\x9d\xb4 \xed\x99\x95\xec\xa0\x95\xeb\x90\x98\xec\x97\x88\xec\x96\xb4\xec\x9a\x94.\",\"additionalInfo\":{\"bookingChat\":{\"adPlaceId\":\"3\",\"customerId\":\"12\",\"companyId\":\"8\"}}}"
// 4) "{\"uuid\":\"46cf2e1f-e09e-4a24-bda4-dfa86d5d3381\",\"userId\":\"12\",\"createdAt\":\"2023-09-11T01:14:07.771Z\",\"type\":\"BOOKINGCOMPLETE\",\"message\":\"\xed\x85\x8c\xec\x8a\xa4\xed\x8a\xb81 \xeb\x8b\x98\xec\x9d\x98 9\xec\x9b\x94 13\xec\x9d\xbc 10\xec\x8b\x9c \xed\x85\x8c\xec\x8a\xa4\xed\x8a\xb82 \xec\x83\x81\xed\x98\xb8\xec\x9d\x98 \xec\x98\x88\xec\x95\xbd\xec\x9d\xb4 \xed\x99\x95\xec\xa0\x95\xeb\x90\x98\xec\x97\x88\xec\x96\xb4\xec\x9a\x94.\",\"additionalInfo\":{\"bookingChat\":{\"adPlaceId\":\"6\",\"customerId\":\"8\",\"companyId\":\"12\",\"bookingInfoId\":\"67\",\"bookingInfo\":{\"id\":67,\"createdAt\":\"2023-09-11T01:14:07.591Z\",\"updatedAt\":\"2023-09-11T01:14:07.591Z\",\"date\":\"2023-09-13T01:00:00.000Z\",\"numOfPeople\":2,\"subjectGroupId\":2,\"status\":\"RESERVED\",\"customerId\":8,\"companyId\":12,\"adPlaceId\":6}}}}"
// 5) "{\"uuid\":\"127adcd2-6564-42a2-b18e-9bc312378fa9\",\"userId\":\"12\",\"createdAt\":\"2023-09-11T01:18:17.839Z\",\"message\":\"\xeb\x82\xb4 \xea\xb2\x8c\xec\x8b\x9c\xeb\xac\xbc\xec\x97\x90 \xeb\x8c\x93\xea\xb8\x80\xec\x9d\xb4 \xeb\x8b\xac\xeb\xa0\xb8\xec\x96\xb4\xec\x9a\x94\",\"type\":\"REPLYFORMYREPLY\",\"additionalInfo\":{\"replyAlarm\":{\"tourPlaceId\":\"19239\",\"shareTripMemoryId\":\"10\",\"replyId\":\"19\"}}}"
// 6) "{\"uuid\":\"26d4c05d-81a1-4b2e-8ffe-a4369c640e0f\",\"userId\":\"12\",\"createdAt\":\"2023-09-11T01:19:07.587Z\",\"message\":\"\xeb\x82\xb4 \xea\xb2\x8c\xec\x8b\x9c\xeb\xac\xbc\xec\x97\x90 \xeb\x8c\x93\xea\xb8\x80\xec\x9d\xb4 \xeb\x8b\xac\xeb\xa0\xb8\xec\x96\xb4\xec\x9a\x94\",\"type\":\"REPLYFORMYREPLY\",\"additionalInfo\":{\"replyAlarm\":{\"tourPlaceId\":\"19239\",\"shareTripMemoryId\":\"10\",\"replyId\":\"20\"}}}"
// dev-redis:6379> get tourPlaceInfo:19235
// "{\"id\":19235,\"title\":\"\xed\x85\x8c\xec\x8a\xa4\xed\x8a\xb81\xea\xb0\x80\xea\xb2\x8c\"}"
// dev-redis:6379> get userInfo:1
// "{\"id\":1,\"userFCMToken\":[]}"
