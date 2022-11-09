import scheduleRouter, {
  getHotelDataFromBKCWrapper,
  getPlaceDataFromGGLWrapper,
} from './wrapper';
import { addMockBKCHotelResource } from './devWrapper';

scheduleRouter.post('/searchHotel', getHotelDataFromBKCWrapper);
scheduleRouter.post('/searchPlace', getPlaceDataFromGGLWrapper);

/**
 * 내부 개발용
 */
scheduleRouter.post('/addMockHotelResource', addMockBKCHotelResource);

export default scheduleRouter;
