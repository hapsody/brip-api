import { getNDaysLater } from '@src/utils';

export const minMoney = 1000000;
export const maxMoney = 3000000;
// export const startDate = '2022-11-30T00:00:00';
// export const endDate = '2022-12-02T00:00:00';
export const startDate = getNDaysLater(30);
export const endDate = getNDaysLater(33);
export const hotelTransition = 1;
export const childrenNumber = 2;
export const childrenAges = [1, 3];
export const adultsNumber = 2;

export const params = {
  addMockParam: {
    radius: 4000,
    orderBy: 'review_score', // popularity,class_ascending,class_descending,distance,upsort_bh,review_score,price
    adultsNumber,
    childrenNumber,
    childrenAges,
    roomNumber: 1,
    // checkinDate: startDate,
    // checkoutDate: endDate,
    latitude: '33.501298',
    longitude: '126.525482',
    pageNumber: 0,
    includeAdjacency: true,
    categoriesFilterIds: ['property_type::204'], /// hotel filter
    mock: true,
  },
  mainParam: {
    minMoney,
    maxMoney,
    startDate,
    endDate,
    adult: adultsNumber.toString(),
    child: childrenNumber.toString(),
    infant: '0',
    travelHard: '5',
    favoriteTravelType: ['golf', 'learn', 'food'],
    favoriteAccommodation: ['hotel'],
    favoriteAccommodationLocation: ['nature', 'city'],
    mock: true,
  },
};
