import { getNDaysLater } from '@src/utils';

export const minMoney = 1000000;
export const maxMoney = 3000000;
// export const travelStartDate = '2022-11-30T00:00:00';
// export const travelEndDate = '2022-12-02T00:00:00';
export const startDate = getNDaysLater(30);
export const endDate = getNDaysLater(33);
export const hotelTransition = 1;
export const childrenNumber = 2;
export const childrenAges = [1, 3];
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
    minMoney: '600000',
    maxMoney: '1200000',
    startDate: '2023-01-01T15:00:00.000Z',
    endDate: '2023-01-06T15:00:00.000Z',
    adult: '2',
    child: '0',
    infant: '0',
    travelHard: '5',
    favoriteTravelType: ['golf', 'learn', 'food'],
    favoriteAccommodation: ['hotel', 'resort'],
    favoriteAccommodationLocation: ['nature', 'city'],
    hotelTransition: 1,
    hotelSrchOpt: {
      orderBy: 'popularity',
      adultsNumber: 2,
      roomNumber: 1,
      checkinDate: '2023-01-01T15:00:00.000Z',
      checkoutDate: '2023-01-06T15:00:00.000Z',
      latitude: '33.389464',
      longitude: '126.554401',
      pageNumber: 0,
      includeAdjacency: true,
      childrenAges: [5, 3],
      childrenNumber: 2,
      mock: false,
      store: false,
    },
  },
};
