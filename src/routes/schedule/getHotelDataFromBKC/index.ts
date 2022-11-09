import scheduleRouter, { getHotelDataFromBKCWrapper } from '../wrapper';

scheduleRouter.post('/searchHotel', getHotelDataFromBKCWrapper);

export default scheduleRouter;
