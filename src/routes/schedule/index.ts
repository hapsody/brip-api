import scheduleRouter, {
  getHotelDataFromBKCWrapper,
  getPlaceDataFromGGLWrapper,
} from './wrapper';
import {
  addMockBKCHotelResource,
  getPlaceDataFromVJWrapper,
} from './devWrapper';

scheduleRouter.post('/searchHotel', getHotelDataFromBKCWrapper);
scheduleRouter.post('/searchPlace', getPlaceDataFromGGLWrapper);

/**
 * 내부 개발용
 */
scheduleRouter.post('/addMockBKCHotelResource', addMockBKCHotelResource);
scheduleRouter.post('/getPlaceDataFromVJ', getPlaceDataFromVJWrapper);
export default scheduleRouter;
