import { childInfantToChildrenAges } from '@src/routes/schedule/internalFunc';
import { getNDaysLater } from '@src/utils';

export const minMoney = 1000000;
export const maxMoney = 3000000;
// export const travelStartDate = '2022-11-30T00:00:00';
// export const travelEndDate = '2022-12-02T00:00:00';
export const travelStartDate = getNDaysLater(30);
export const travelEndDate = getNDaysLater(33);
export const adult = 2;
export const child = 1;
export const infant = 1;

export const hotelTransition = 1;
export const childrenNumber = child + infant;
export const childrenAges = childInfantToChildrenAges({
  child,
  infant,
});

export const params = {
  mockHotelResource: {
    searchCond: {
      radius: 4000,
      orderBy: 'review_score', // popularity,class_ascending,class_descending,distance,upsort_bh,review_score,price
      adultsNumber: 2,
      childrenNumber,
      childrenAges,
      roomNumber: 1,
      // checkinDate: travelStartDate,
      // checkoutDate: travelEndDate,
      latitude: '33.501298',
      longitude: '126.525482',
      pageNumber: 0,
      includeAdjacency: true,
      categoriesFilterIds: ['property_type::204'],
      mock: true,
    },
  },
  mainResource: {
    minMoney: minMoney.toString(),
    maxMoney: maxMoney.toString(),
    startDate: travelStartDate,
    endDate: travelEndDate,
    adult,
    child,
    infant,
    travelHard: '5',
    favoriteTravelType: ['golf', 'learn', 'food'],
    favoriteAccommodation: ['hotel', 'resort'],
    favoriteAccommodationLocation: ['nature', 'city'],
    mock: true,
  },
};
