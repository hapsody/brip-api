/* eslint-disable @typescript-eslint/naming-convention */
import moment from 'moment';
import prisma from '@src/prisma';
import { IBError, IBResFormat, asyncWrapper, ibDefs } from '@src/utils';
import axios, { Method } from 'axios';
import { isNumber, isNil, isEmpty } from 'lodash';
import {
  AddMockBKCHotelResourceREQParam,
  defaultBKCHotelReqParams,
} from './types/schduleTypes';
import { getNDaysLater } from './inner';

export const dummy = (
  req: Express.IBTypedReqBody<{}>,
  res: Express.IBTypedResponse<IBResFormat>,
): void => {
  res.json({
    ...ibDefs.SUCCESS,
    IBparams: {} as object,
  });
};

export const addMockBKCHotelResource = asyncWrapper(
  async (
    req: Express.IBTypedReqBody<AddMockBKCHotelResourceREQParam>,
    res: Express.IBTypedResponse<IBResFormat>,
  ) => {
    const {
      orderBy = 'popularity',
      adultsNumber = 2,
      roomNumber = 1,
      // checkinDate = getToday(),
      // checkoutDate = getTomorrow(),
      checkinDate = getNDaysLater(10),
      checkoutDate = getNDaysLater(11),
      filterByCurrency = 'USD',
      latitude: paramLat,
      longitude: paramLngt,
      pageNumber = 0,
      includeAdjacency = true,
      childrenAges,
      childrenNumber,
      categoriesFilterIds,
    } = req.body ?? defaultBKCHotelReqParams;

    if (childrenAges && childrenAges.length > 0 && !isNumber(childrenNumber)) {
      throw new IBError({
        type: 'INVALIDPARAMS',
        message:
          'childrenNumber 파라미터가 제공되지 않았거나 number 타입이 아닙니다.',
      });
    }
    if (
      (isNumber(childrenNumber) && isNil(childrenAges)) ||
      (isNumber(childrenNumber) &&
        childrenAges &&
        childrenAges.length < childrenNumber)
    ) {
      throw new IBError({
        type: 'INVALIDPARAMS',
        message:
          'childrenAges 파라미터가 제공되지 않았거나 childrenAges 배열의 요소의 수가 childrenNumber보다 적습니다.',
      });
    }

    const options = {
      method: 'GET' as Method,
      url: 'https://booking-com.p.rapidapi.com/v1/hotels/search-by-coordinates',
      params: {
        order_by: orderBy ?? 'popularity',
        adults_number: adultsNumber.toString(),
        units: 'metric',
        room_number: roomNumber ? roomNumber.toString() : '1',
        checkin_date: moment(checkinDate).format('YYYY-MM-DD'),
        checkout_date: moment(checkoutDate).format('YYYY-MM-DD'),
        filter_by_currency: filterByCurrency ?? 'USD',
        locale: 'en-us',
        latitude: paramLat.toString(),
        longitude: paramLngt.toString(),
        page_number: pageNumber ? pageNumber.toString() : '0',
        include_adjacency: includeAdjacency.valueOf().toString() ?? 'true',
        ...(isNumber(childrenNumber) &&
          childrenNumber > 0 && {
            children_number: childrenNumber.toString(),
          }),
        ...(childrenAges &&
          !isEmpty(childrenAges) && { children_ages: childrenAges.toString() }),
        ...(categoriesFilterIds &&
          !isEmpty(categoriesFilterIds) && {
            categories_filter_ids: categoriesFilterIds?.toString(),
          }),
        // categories_filter_ids: 'class::2,class::4,free_cancellation::1',
      },
      headers: {
        'X-RapidAPI-Key': (process.env.RAPID_API_KEY as string) ?? '',
        'X-RapidAPI-Host': 'booking-com.p.rapidapi.com',
      },
    };
    const response = await axios.request(options);

    const data = JSON.stringify(response.data);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    await prisma.mockBookingDotComHotelResource.create({
      data: {
        responseData: data,
      },
    });

    res.json({
      ...ibDefs.SUCCESS,
      IBparams: response.data as object,
    });
  },
);
