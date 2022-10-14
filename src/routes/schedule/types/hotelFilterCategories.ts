// import {
//   FavoriteTravelType,
//   FavoriteAccommodationLocation,
//   FavoriteAccommodationType,
// } from './schduleTypes';

const filters = {
  hotelFilters: {
    regionFilters: [
      {
        id: 'previous',
        type: 'multiple_intersection',
        categories: [
          { id: 'property_type::204', name: 'Hotels' },
          { id: 'property_type::201', name: 'Apartments' },
          { id: 'facility::28', name: 'Family rooms' },
          { id: 'room_facility::93', name: 'Private pool' },
          { id: 'free_cancellation::1', name: 'Free Cancellation' },
          { id: 'class::0', name: 'Unrated' },
          { id: 'class::2', name: '2 stars/other ratings' },
          { id: 'class::3', name: '3 stars/other ratings' },
          { id: 'class::4', name: '4 stars/other ratings' },
          { id: 'class::5', name: '5 stars/other ratings' },
        ],
      },
      {
        id: 'price_category',
        type: 'multiple_union',
        categories: [
          { id: 'price_category::100', name: 'US$50 - US$100' },
          { id: 'price_category::150', name: 'US$100 - US$150' },
          { id: 'price_category::200', name: 'US$150 - US$200' },
          { id: 'price_category::250', name: 'US$200 + ' },
        ],
      },
      {
        id: 'health_and_hygiene',
        type: 'single_option',
        categoriess: [
          {
            id: 'health_and_hygiene::1',
            name: 'Properties that take health & safety measures',
          },
        ],
      },
      {
        id: 'class',
        type: 'multiple_union',
        categories: [
          { id: 'class::0', name: 'Unrated' },
          { id: 'class::2', name: '2 stars/other ratings' },
          { id: 'class::3', name: '3 stars/other ratings' },
          { id: 'class::4', name: '4 stars/other ratings' },
          { id: 'class::5', name: '5 stars/other ratings' },
        ],
      },
      {
        id: 'property_type',
        type: 'multiple_union',
        categories: [
          { id: 'property_type::204', name: 'Hotels' },
          { id: 'property_type::201', name: 'Apartments' },
          { id: 'property_type::206', name: 'Resorts' },
          { id: 'property_type::220', name: 'Vacation Homes' },
          { id: 'property_type::203', name: 'Hostels' },
          { id: 'property_type::208', name: 'Bed and Breakfasts' },
          { id: 'property_type::213', name: 'Villas' },
          { id: 'property_type::222', name: 'Homestays' },
        ],
      },
      {
        id: 'facility',
        type: 'multiple_intersection',
        categories: [
          {
            id: 'facility::17',
            name: 'Airport shuttle',
          },
          {
            id: 'facility::139',
            name: 'Airport shuttle (free)',
          },
          {
            id: 'facility::72',
            name: 'BBQ facilities',
          },
          {
            id: 'facility::182',
            name: 'Electric vehicle charging station',
          },
          {
            id: 'facility::25',
            name: 'Facilities for disabled guests',
          },
          {
            id: 'facility::28',
            name: 'Family rooms',
          },
          {
            id: 'facility::11',
            name: 'Fitness center',
          },
          {
            id: 'facility::46',
            name: 'Free parking',
          },
          {
            id: 'facility::107',
            name: 'Free WiFi',
          },
          {
            id: 'facility::16',
            name: 'Non-smoking rooms',
          },
          {
            id: 'facility::2',
            name: 'Parking',
          },
          {
            id: 'facility::4',
            name: 'Pet friendly',
          },
          {
            id: 'facility::3',
            name: 'Restaurant',
          },
          {
            id: 'facility::5',
            name: 'Room service',
          },
          {
            id: 'facility::54',
            name: 'Spa',
          },
          {
            id: 'facility::301',
            name: 'Swimming pool',
          },
        ],
      },
      {
        id: 'mealplan',
        type: 'multiple_union',
        categories: [
          {
            id: 'mealplan::breakfast_included',
            name: 'Breakfast Included',
          },
          {
            id: 'mealplan::breakfast_and_lunch',
            name: 'Breakfast & lunch included',
          },
          { id: 'mealplan::999', name: 'Kitchen facilities' },
        ],
      },
      {
        id: 'reviewscorebuckets',
        type: 'multiple_single_selection',
        categories: [
          { id: 'reviewscorebuckets::50', name: 'Fair: 5+' },
          { id: 'reviewscorebuckets::60', name: 'Pleasant: 6+' },
          { id: 'reviewscorebuckets::70', name: 'Good: 7+' },
          { id: 'reviewscorebuckets::80', name: 'Very Good: 8+' },
          { id: 'reviewscorebuckets::90', name: 'Wonderful: 9+' },
          { id: 'reviewscorebuckets::999', name: 'No rating' },
        ],
      },
      {
        id: 'room_facility::93',
        type: 'multiple_intersection',
        categories: [
          { id: 'room_facility::38', name: 'Private bathroom' },
          { id: 'room_facility::11', name: 'Air conditioning' },
          { id: 'room_facility::75', name: 'Flat-screen TV' },
          { id: 'room_facility::17', name: 'Balcony' },
          { id: 'room_facility::5', name: 'Bathtub' },
          { id: 'room_facility::20', name: 'Spa tub' },
          { id: 'room_facility::998', name: 'Coffee/Tea maker' },
          { id: 'room_facility::108', name: 'Ocean view' },
          { id: 'room_facility::999', name: 'Kitchen/Kitchenette' },
          { id: 'room_facility::81', name: 'View' },
          { id: 'room_facility::123', name: 'Terrace' },
          { id: 'room_facility::34', name: 'Washing machine' },
          { id: 'room_facility::93', name: 'Private pool' },
          { id: 'room_facility::37', name: 'Patio' },
          { id: 'room_facility::79', name: 'Soundproof' },
          { id: 'room_facility::86', name: 'Electric kettle' },
          { id: 'room_facility::120', name: 'Coffee machine' },
        ],
      },
      {
        id: 'twin_double_bed',
        type: 'multiple_union',
        categories: [
          { id: 'twin_double_bed::2', name: 'Bed Preference' },
          { id: 'twin_double_bed::3', name: 'Double bed' },
        ],
      },
      {
        id: 'city',
        type: 'multiple_union',
        categories: [
          { id: 'city::20030887', name: 'Hauula' },
          { id: 'city::20030916', name: 'Honolulu' },
          { id: 'city::20030948', name: 'Kahuku' },
          { id: 'city::900048303', name: 'Kapolei' },
          { id: 'city::20031075', name: 'Laie' },
          { id: 'city::20031269', name: 'Waialua' },
          { id: 'city::20031270', name: 'Waianae' },
        ],
      },
    ],
    hotelFilters: [
      {
        id: 'distance', // from city
        type: 'multiple_single_selection',
        categories: [
          { id: 'distance::1000', name: 'Less than 1 km' },
          { id: 'distance::3000', name: 'Less than 3 km' },
          { id: 'distance::5000', name: 'Less than 5 km' },
        ],
      },
      {
        id: 'BeachAccessFacilityFilter',
        type: 'multiple_union',
        categories: [
          { id: 'BeachAccessFacilityFilter::0', name: 'Private beach' },
          { id: 'BeachAccessFacilityFilter::1', name: 'Beachfront' },
          { id: 'BeachAccessFacilityFilter::2', name: 'Less than 1 km' },
          { id: 'BeachAccessFacilityFilter::3', name: 'Less than 2 km' },
          { id: 'BeachAccessFacilityFilter::4', name: 'Less than 3 km' },
        ],
      },
    ],
  },
  googleFilters: {},
  idealblooomFilters: {
    favoriteTravelType: {
      landActivity: {
        relatedHotelFiltersId: [],
        relatedGoogleFiltersId: [],
      },
      golf: {
        relatedHotelFiltersId: [],
        relatedGoogleFiltersId: [],
      },
      relaxation: {
        relatedHotelFiltersId: [],
        relatedGoogleFiltersId: [],
      },
      oceanActivity: {
        relatedHotelFiltersId: [],
        relatedGoogleFiltersId: [],
      },
      groupActivity: {
        relatedHotelFiltersId: [],
        relatedGoogleFiltersId: [],
      },
      learn: {
        relatedHotelFiltersId: [],
        relatedGoogleFiltersId: [],
      },
      food: {
        relatedHotelFiltersId: [],
        relatedGoogleFiltersId: [],
      },
      experience: {
        relatedHotelFiltersId: [],
        relatedGoogleFiltersId: [],
      },
      visitTourSpot: {
        relatedHotelFiltersId: [],
        relatedGoogleFiltersId: [],
      },
      packageTour: {
        relatedHotelFiltersId: [],
        relatedGoogleFiltersId: [],
      },
      shopping: {
        relatedHotelFiltersId: [],
        relatedGoogleFiltersId: [],
      },
      waterPark: {
        relatedHotelFiltersId: [],
        relatedGoogleFiltersId: [],
      },
      noIdea: {
        relatedHotelFiltersId: [],
        relatedGoogleFiltersId: [],
      },
    },
    favoriteAccommodationType: {
      hotel: {
        relatedHotelFiltersId: [],
        relatedGoogleFiltersId: [],
      },
      resort: {
        relatedHotelFiltersId: [],
        relatedGoogleFiltersId: [],
      },
      houseRent: {
        relatedHotelFiltersId: [],
        relatedGoogleFiltersId: [],
      },
      roomRent: {
        relatedHotelFiltersId: [],
        relatedGoogleFiltersId: [],
      },
      bedRent: {
        relatedHotelFiltersId: [],
        relatedGoogleFiltersId: [],
      },
      apartRent: {
        relatedHotelFiltersId: [],
        relatedGoogleFiltersId: [],
      },
      poolVilla: {
        relatedHotelFiltersId: [],
        relatedGoogleFiltersId: [],
      },
      camping: {
        relatedHotelFiltersId: [],
        relatedGoogleFiltersId: [],
      },
      mixed: {
        relatedHotelFiltersId: [],
        relatedGoogleFiltersId: [],
      },
      dontCare: {
        relatedHotelFiltersId: [],
        relatedGoogleFiltersId: [],
      },
    },
    favoriteAccommodationLocation: {
      nature: {
        relatedHotelFiltersId: [],
        relatedGoogleFiltersId: [],
      },
      downtown: {
        relatedHotelFiltersId: [],
        relatedGoogleFiltersId: [],
      },
      oceanView: {
        relatedHotelFiltersId: [],
        relatedGoogleFiltersId: [],
      },
      mountainView: {
        relatedHotelFiltersId: [],
        relatedGoogleFiltersId: [],
      },
      cityView: {
        relatedHotelFiltersId: [],
        relatedGoogleFiltersId: [],
      },
      mixed: {
        relatedHotelFiltersId: [],
        relatedGoogleFiltersId: [],
      },
      dontCare: {
        relatedHotelFiltersId: [],
        relatedGoogleFiltersId: [],
      },
    },
  },
};

export default filters;
