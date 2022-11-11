import scheduleRouter, {
  getHotelDataFromBKCWrapper,
  getPlaceByGglNrbyWrapper,
  getPlaceByGglTxtSrchWrapper,
} from './wrapper';
import {
  addMockBKCHotelResourceWrapper,
  getPlaceDataFromVJWrapper,
} from './devWrapper';

scheduleRouter.post('/searchHotel', getHotelDataFromBKCWrapper);
scheduleRouter.post('/getPlaceByGglNrby', getPlaceByGglNrbyWrapper);
scheduleRouter.post('/getPlaceByGglTxtSrch', getPlaceByGglTxtSrchWrapper);

/**
 * 내부 개발용
 */
scheduleRouter.post('/addMockBKCHotelResource', addMockBKCHotelResourceWrapper);
scheduleRouter.post('/getPlaceDataFromVJ', getPlaceDataFromVJWrapper);
export default scheduleRouter;
