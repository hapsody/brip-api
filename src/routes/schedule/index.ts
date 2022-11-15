import scheduleRouter, {
  getHotelDataFromBKCWrapper,
  getPlaceByGglNrbyWrapper,
  getPlaceByGglTxtSrchWrapper,
} from './wrapper';
import {
  addMockBKCHotelResourceWrapper,
  getPlaceDataFromVJWrapper,
  prismaTestWrapper,
  getRcmdListWrapper,
} from './devWrapper';

scheduleRouter.post('/searchHotel', getHotelDataFromBKCWrapper);
scheduleRouter.post('/getPlaceByGglNrby', getPlaceByGglNrbyWrapper);
scheduleRouter.post('/getPlaceByGglTxtSrch', getPlaceByGglTxtSrchWrapper);

/**
 * 내부 개발용
 */
scheduleRouter.post('/addMockBKCHotelResource', addMockBKCHotelResourceWrapper);
scheduleRouter.post('/getPlaceDataFromVJ', getPlaceDataFromVJWrapper);
scheduleRouter.post('/prismaTest', prismaTestWrapper);
scheduleRouter.post('/getRcmdList', getRcmdListWrapper);
export default scheduleRouter;
