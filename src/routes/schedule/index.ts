import scheduleRouter, {
  getHotelDataFromBKCWrapper,
  getPlaceDataFromGGLWrapper,
} from './wrapper';

scheduleRouter.post('/searchHotel', getHotelDataFromBKCWrapper);
scheduleRouter.post('/searchPlace', getPlaceDataFromGGLWrapper);
export default scheduleRouter;
