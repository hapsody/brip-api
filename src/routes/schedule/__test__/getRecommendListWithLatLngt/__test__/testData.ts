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

export const params = {
  // searchCond: {
  //   minBudget,
  //   maxBudget,
  //   currency: 'USD',
  //   travelType: {
  //     landActivity: true,
  //     golf: false,
  //     relaxation: false,
  //     resort: false,
  //     hotel: true,
  //     oceanActivity: false,
  //     experience: false,
  //     groupActivity: false,
  //     learning: false,
  //     shopping: false,
  //     waterPark: false,
  //     visitTourSpot: false,
  //     packageTour: false,
  //     nativeExperience: false,
  //     noIdea: false,
  //   },
  //   travelIntensity: 6,
  //   travelStartDate,
  //   travelEndDate,
  //   hotelTransition,

  //   nearbySearchReqParams: {
  //     keyword: '',
  //     location: {
  //       latitude: '21.471383921418447',
  //       longitude: '-158.02821312813884',
  //     },
  //     radius: 4000,
  //   },
  //   searchHotelReqParams: {
  //     radius: 4000,
  //     orderBy: 'popularity',
  //     adultsNumber: 2,

  //     childrenNumber,
  //     childrenAges,

  //     roomNumber: 1,
  //     checkinDate: '2022-09-30T00:00:00',
  //     checkoutDate: '2022-10-03T00:00:00',
  //     latitude: '21.4286856',
  //     longitude: '-158.1389763',
  //     pageNumber: 0,
  //     includeAdjacency: true,
  //     mock: true,
  //   },
  // },

  searchCond: {
    minBudget,
    maxBudget,
    currency: 'USD',
    travelType: {
      landActivity: true,
      golf: false,
      relaxation: false,
      resort: false,
      hotel: true,
      oceanActivity: false,
      experience: false,
      groupActivity: false,
      learning: false,
      shopping: false,
      waterPark: false,
      visitTourSpot: false,
      packageTour: false,
      nativeExperience: false,
      noIdea: false,
    },
    travelIntensity: 6,
    travelStartDate,
    travelEndDate,
    hotelTransition,
    nearbySearchReqParams: {
      keyword: '',
      location: {
        latitude: '33.501298',
        longitude: '126.525482',
      },
      radius: 4000,
      loadAll: true,
    },
    searchHotelReqParams: {
      radius: 4000,
      orderBy: 'review_score', // popularity,class_ascending,class_descending,distance,upsort_bh,review_score,price
      adultsNumber: 2,
      // childrenNumber,
      // childrenAges,
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
};
