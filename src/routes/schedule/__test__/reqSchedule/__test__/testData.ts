import { getNDaysLater } from '@src/utils';

export const minBudget = 1000000;
export const maxBudget = 3000000;
// export const travelStartDate = '2022-11-30T00:00:00';
// export const travelEndDate = '2022-12-02T00:00:00';
export const travelStartDate = getNDaysLater(30);
export const travelEndDate = getNDaysLater(33);
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
    // checkinDate: travelStartDate,
    // checkoutDate: travelEndDate,
    latitude: '33.501298',
    longitude: '126.525482',
    pageNumber: 0,
    includeAdjacency: true,
    categoriesFilterIds: ['property_type::204'], /// hotel filter
    mock: true,
  },
  mainParam: {
    minMoney: minBudget,
    maxMoney: maxBudget,
    startDate: travelStartDate,
    endDate: travelEndDate,
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
