import { accessTokenValidCheck } from '@src/utils';
import scheduleRouter, {
  getHotelDataFromBKCWrapper,
  getPlaceByGglNrbyWrapper,
  getPlaceByGglTxtSrchWrapper,
  reqScheduleWrapper,
  getScheduleWrapper,
  getScheduleListWrapper,
  saveScheduleWrapper,
  getDayScheduleWrapper,
  getDetailScheduleWrapper,
  getCandidateScheduleWrapper,
  getCandDetailSchdWrapper,
  modifyScheduleWrapper,
  makeScheduleWrapper,
} from './wrapper';
import {
  addMockBKCHotelResourceWrapper,
  getPlaceDataFromVJWrapper,
  prismaTestWrapper,
  getRcmdListWrapper,
  getTourPlaceByTagWrapper,
  getTagRelationWrapper,
} from './devWrapper';

scheduleRouter.post('/searchHotel', getHotelDataFromBKCWrapper);
scheduleRouter.post('/getPlaceByGglNrby', getPlaceByGglNrbyWrapper);
scheduleRouter.post('/getPlaceByGglTxtSrch', getPlaceByGglTxtSrchWrapper);
scheduleRouter.post('/reqSchedule', accessTokenValidCheck, reqScheduleWrapper);
scheduleRouter.post('/getSchedule', accessTokenValidCheck, getScheduleWrapper);
scheduleRouter.post(
  '/getScheduleList',
  accessTokenValidCheck,
  getScheduleListWrapper,
);
scheduleRouter.post(
  '/saveSchedule',
  accessTokenValidCheck,
  saveScheduleWrapper,
);

scheduleRouter.post(
  '/getDaySchedule',
  accessTokenValidCheck,
  getDayScheduleWrapper,
);

scheduleRouter.post(
  '/getDetailSchedule',
  accessTokenValidCheck,
  getDetailScheduleWrapper,
);

scheduleRouter.post(
  '/getCandidateSchedule',
  accessTokenValidCheck,
  getCandidateScheduleWrapper,
);

scheduleRouter.post(
  '/getCandidateDetailSchedule',
  accessTokenValidCheck,
  getCandDetailSchdWrapper,
);

scheduleRouter.post(
  '/modifySchedule',
  accessTokenValidCheck,
  modifyScheduleWrapper,
);

scheduleRouter.post(
  '/makeSchedule',
  accessTokenValidCheck,
  makeScheduleWrapper,
);

/**
 * 내부 개발용
 */
scheduleRouter.post('/addMockBKCHotelResource', addMockBKCHotelResourceWrapper);
scheduleRouter.post('/getPlaceDataFromVJ', getPlaceDataFromVJWrapper);
scheduleRouter.post('/prismaTest', prismaTestWrapper);
scheduleRouter.post('/getRcmdList', getRcmdListWrapper);
scheduleRouter.post('/getTourPlaceByTag', getTourPlaceByTagWrapper);
scheduleRouter.post('/getTagRelation', getTagRelationWrapper);

export default scheduleRouter;
