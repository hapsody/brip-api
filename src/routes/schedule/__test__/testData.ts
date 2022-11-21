import { getNDaysLater } from '@src/utils';

export const minMoney = 600000;
export const maxMoney = 1200000;
// export const travelStartDate = '2022-11-30T00:00:00';
// export const travelEndDate = '2022-12-02T00:00:00';
export const startDate = getNDaysLater(30);
export const endDate = getNDaysLater(33);
export const adult = 2;
export const child = 1;
export const infant = 1;
export const travelHard = 5;
export const hotelTransition = 1;
export const childrenAges = [5, 3];
// export const childrenNumber = 2;
// export const childrenAges = [1, 3];
const latitude = '33.501298';
const longitude = '126.525482';

export const params = {
  searchHotelOpt: {
    radius: 4000,
    orderBy: 'review_score', // popularity,class_ascending,class_descending,distance,upsort_bh,review_score,price
    adultsNumber: 2,
    // childrenNumber,
    // childrenAges,
    roomNumber: 1,
    // checkinDate: travelStartDate,
    // checkoutDate: travelEndDate,
    latitude,
    longitude,
    pageNumber: 0,
    includeAdjacency: true,
    categoriesFilterIds: ['property_type::204'],
    mock: true,
  },

  gglNearbySearchOpt: {
    location: {
      latitude,
      longitude,
    },
    radius: 50000,
    loadAll: false,
    store: false,
  },

  gglTxtSearchOpt: {
    keyword: '카트 in 제주',
    loadAll: false,
    store: false,
  },

  getRcmdListReqOpt: {
    minMoney,
    maxMoney,
    startDate,
    endDate,
    adult,
    child,
    infant,
    travelHard,
    favoriteTravelType: ['golf', 'learn', 'food'],
    favoriteAccommodation: ['hotel', 'resort'],
    favoriteAccommodationLocation: ['nature', 'city'],
    hotelTransition: 1,
    mock: true,
    store: true,
    hotelSrchOpt: {
      orderBy: 'review_score',
      adultsNumber: adult,
      roomNumber: 1,
      checkinDate: startDate,
      checkoutDate: endDate,
      latitude,
      longitude,
      pageNumber: 0,
      includeAdjacency: true,
      childrenAges,
      childrenNumber: child + infant,
    },
  },
};
