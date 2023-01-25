import { accessTokenValidCheck } from '@src/utils';
import scheduleRouter, {
  getHotelDataFromBKCWrapper,
  getPlaceByGglNrbyWrapper,
  getPlaceByGglTxtSrchWrapper,
  getScheduleWrapper,
  getScheduleListWrapper,
  saveScheduleWrapper,
  getDayScheduleWrapper,
  getDetailScheduleWrapper,
  getCandidateScheduleWrapper,
  getCandDetailSchdWrapper,
  modifyScheduleWrapper,
  reqScheduleWrapper,
  getHotelListWrapper,
  getScheduleLoadingImgWrapper,
  getScheduleCountWrapper,
  fixHotelWrapper,
  refreshScheduleWrapper,
} from './wrapper';
import {
  addMockBKCHotelResourceWrapper,
  getPlaceDataFromVJWrapper,
  prismaTestWrapper,
  getTourPlaceByTagWrapper,
  getTagRelationWrapper,
  makeClusterWrapper,
  makeScheduleWrapper,
} from './devWrapper';

scheduleRouter.post('/searchHotel', getHotelDataFromBKCWrapper);
scheduleRouter.post('/getPlaceByGglNrby', getPlaceByGglNrbyWrapper);
scheduleRouter.post('/getPlaceByGglTxtSrch', getPlaceByGglTxtSrchWrapper);
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

scheduleRouter.post('/reqSchedule', accessTokenValidCheck, reqScheduleWrapper);
scheduleRouter.post(
  '/getHotelList',
  accessTokenValidCheck,
  getHotelListWrapper,
);
scheduleRouter.post(
  '/getScheduleLoadingImg',
  accessTokenValidCheck,
  getScheduleLoadingImgWrapper,
);
scheduleRouter.post(
  '/getScheduleCount',
  accessTokenValidCheck,
  getScheduleCountWrapper,
);
scheduleRouter.post('/fixHotel', accessTokenValidCheck, fixHotelWrapper);
scheduleRouter.post(
  '/refreshSchedule',
  accessTokenValidCheck,
  refreshScheduleWrapper,
);
/**
 * 내부 개발용
 */
scheduleRouter.post('/addMockBKCHotelResource', addMockBKCHotelResourceWrapper);
scheduleRouter.post('/getPlaceDataFromVJ', getPlaceDataFromVJWrapper);
scheduleRouter.post('/prismaTest', prismaTestWrapper);
scheduleRouter.post('/getTourPlaceByTag', getTourPlaceByTagWrapper);
scheduleRouter.post('/getTagRelation', getTagRelationWrapper);
scheduleRouter.post('/makeCluster', makeClusterWrapper);
scheduleRouter.post(
  '/makeSchedule',
  accessTokenValidCheck,
  makeScheduleWrapper,
);

export default scheduleRouter;
