import request from 'supertest';
import app from '@src/app';
// import prisma from '@src/prisma';
// import { User } from '@prisma/client';
import { ibDefs } from '@src/utils';
import {
  NearbySearchResponse,
  SearchHotelResponse,
  CompositeSearchResponse,
  GetRecommendListResponse,
} from './schedule';

jest.setTimeout(100000);

describe('Auth Express Router E2E Test', () => {
  describe('POST /nearbySearch', () => {
    it('Case: Correct', async () => {
      const response = await request(app)
        .post('/schedule/nearbySearch')
        .send({
          nearbySearchReqParams: {
            keyword: 'restaurant',
            location: {
              latitude: '21.471383921418447',
              longitude: '-158.02821312813884',
            },
            radius: 4000,
            loadAll: false,
          },
        });

      const result = response.body as NearbySearchResponse;
      expect(result.IBcode).toEqual({ ...ibDefs.SUCCESS }.IBcode);
      expect(result.IBparams.nearbySearchCount).not.toBeFalsy();
      expect(result.IBparams.nearbySearchCount).toBeGreaterThan(0);
      expect(result.IBparams.nearbySearchResult).not.toBeFalsy();
      expect(result.IBparams.nearbySearchResult).toHaveLength(
        result.IBparams.nearbySearchCount,
      );
      const { nearbySearchResult } = result.IBparams;
      // eslint-disable-next-line no-restricted-syntax
      for await (const item of nearbySearchResult) {
        expect(item).toHaveProperty('business_status');
        expect(item).toHaveProperty('geometry');
        expect(item.geometry).toHaveProperty('location');
        expect(item.geometry?.location).toHaveProperty('lat');
        expect(item.geometry?.location).toHaveProperty('lng');
        expect(item.geometry).toHaveProperty('viewport');
        expect(item.geometry?.viewport).toHaveProperty('northeast');
        expect(item.geometry?.viewport).toHaveProperty('southwest');
        expect(item.geometry?.viewport?.northeast).toHaveProperty('lat');
        expect(item.geometry?.viewport?.northeast).toHaveProperty('lng');
        expect(item.geometry?.viewport?.southwest).toHaveProperty('lat');
        expect(item.geometry?.viewport?.southwest).toHaveProperty('lng');
        expect(item).toHaveProperty('icon');
        expect(item).toHaveProperty('icon_background_color');
        expect(item).toHaveProperty('icon_mask_base_uri');
        expect(item).toHaveProperty('name');
        // expect(item).toHaveProperty('opening_hours');
        // expect(item).toHaveProperty('photos');

        if (item.photos && item.photos.length > 0) {
          expect(item.photos?.at(0)).toHaveProperty('height');
          expect(item.photos?.at(0)).toHaveProperty('html_attributions');
          expect(item.photos?.at(0)).toHaveProperty('photo_reference');
          expect(item.photos?.at(0)).toHaveProperty('width');
        }
        expect(item).toHaveProperty('place_id');
        expect(item).toHaveProperty('plus_code');
        expect(item).toHaveProperty('rating');
        expect(item).toHaveProperty('reference');
        expect(item).toHaveProperty('scope');
        expect(item).toHaveProperty('types');
        expect(item).toHaveProperty('user_ratings_total');
        expect(item).toHaveProperty('vicinity');
      }
    });
  });
  describe('POST /searchHotel', () => {
    it('Case: Correct', async () => {
      const response = await request(app)
        .post('/schedule/searchHotel')
        .send({
          searchHotelReqParams: {
            orderBy: 'popularity',
            adultsNumber: 2,
            roomNumber: 1,
            checkinDate: '2022-09-30T00:00:00',
            checkoutDate: '2022-10-01T00:00:00',
            latitude: '21.4286856',
            longitude: '-158.1389763',
            pageNumber: 0,
            includeAdjacency: true,
            mock: true,
          },
        });

      const result = response.body as SearchHotelResponse;
      expect(result.IBcode).toEqual({ ...ibDefs.SUCCESS }.IBcode);
      expect(result.IBparams.hotelSearchCount).toBeGreaterThan(0);
      expect(result.IBparams.hotelSearchResult).not.toBeFalsy();
      expect(result.IBparams.hotelSearchResult).toHaveLength(
        result.IBparams.hotelSearchCount,
      );
      const { hotelSearchResult } = result.IBparams;
      // eslint-disable-next-line no-restricted-syntax
      for await (const item of hotelSearchResult) {
        expect(item).toHaveProperty('id');
        expect(item).toHaveProperty('address_trans');
        expect(item).toHaveProperty('url');
        // expect(item).toHaveProperty('urgency_message');
        // expect(item).toHaveProperty('is_wholesaler_candidate');
        expect(item).toHaveProperty('preferred');
        expect(item).toHaveProperty('review_nr');
        expect(item).toHaveProperty('is_no_prepayment_block');
        expect(item).toHaveProperty('mobile_discount_percentage');
        expect(item).toHaveProperty('longitude');
        expect(item).toHaveProperty('hotel_facilities');
        expect(item).toHaveProperty('review_score');
        expect(item).toHaveProperty('extended');
        expect(item).toHaveProperty('default_language');
        expect(item).toHaveProperty('children_not_allowed');
        expect(item).toHaveProperty('currency_code');
        expect(item).toHaveProperty('hotel_name');
        expect(item).toHaveProperty('class');
        expect(item).toHaveProperty('preferred_plus');
        expect(item).toHaveProperty('is_genius_deal');
        expect(item).toHaveProperty('city_in_trans');
        expect(item).toHaveProperty('main_photo_id');
        expect(item).toHaveProperty('checkout');
        expect(item).toHaveProperty('native_ad_id');
        expect(item).toHaveProperty('distance_to_cc');
        expect(item).toHaveProperty('type');
        expect(item).toHaveProperty('distance');
        expect(item).toHaveProperty('default_wishlist_name');
        expect(item).toHaveProperty('countrycode');
        expect(item).toHaveProperty('class_is_estimated');
        expect(item).toHaveProperty('badges');
        expect(item).toHaveProperty('district_id');
        expect(item).toHaveProperty('is_mobile_deal');
        expect(item).toHaveProperty('in_best_district');
        expect(item).toHaveProperty('composite_price_breakdown');
        expect(item).toHaveProperty('native_ads_cpc');
        expect(item).toHaveProperty('timezone');
        expect(item).toHaveProperty('is_beach_front');
        expect(item).toHaveProperty('accommodation_type');
        expect(item).toHaveProperty('review_recommendation');
        expect(item).toHaveProperty('district');
        expect(item).toHaveProperty('is_city_center');
        expect(item).toHaveProperty('hotel_name_trans');
        expect(item).toHaveProperty('accommodation_type_name');
        // expect(item).toHaveProperty('ribbon_text');
        expect(item).toHaveProperty('latitude');
        // expect(item).toHaveProperty('cn_ranking_context');
        expect(item).toHaveProperty('hotel_has_vb_boost');
        expect(item).toHaveProperty('review_score_word');
        expect(item).toHaveProperty('ufi');
        expect(item).toHaveProperty('is_smart_deal');
        expect(item).toHaveProperty('city_trans');
        expect(item).toHaveProperty('cc1');
        expect(item).toHaveProperty('cc_required');
        expect(item).toHaveProperty('city_name_en');
        expect(item).toHaveProperty('cant_book');
        expect(item).toHaveProperty('min_total_price');
        expect(item).toHaveProperty('is_geo_rate');
        expect(item).toHaveProperty('country_trans');
        expect(item).toHaveProperty('unit_configuration_label');
        expect(item).toHaveProperty('price_breakdown');
        expect(item).toHaveProperty('districts');
        expect(item).toHaveProperty('wishlist_count');
        expect(item).toHaveProperty('hotel_id');
        expect(item).toHaveProperty('price_is_final');
        expect(item).toHaveProperty('genius_discount_percentage');
        expect(item).toHaveProperty('is_free_cancellable');
        // expect(item).toHaveProperty('has_swimming_pool');
        expect(item).toHaveProperty('bwallet');
        expect(item).toHaveProperty('native_ads_tracking');
        expect(item).toHaveProperty('checkin');
        expect(item).toHaveProperty('selected_review_topic');
        expect(item).toHaveProperty('distances');
        expect(item).toHaveProperty('zip');
        expect(item).toHaveProperty('block_ids');
        expect(item).toHaveProperty('max_photo_url');
        expect(item).toHaveProperty('max_1440_photo_url');
        expect(item).toHaveProperty('is_free_cancellable');
        expect(item).toHaveProperty('is_free_cancellable');
      }
    });
  });
  describe('POST /compositeSearch', () => {
    it('Case: Correct', async () => {
      const response = await request(app)
        .post('/schedule/compositeSearch')
        .send({
          nearbySearchReqParams: {
            keyword: 'restaurant',
            location: {
              latitude: '21.471383921418447',
              longitude: '-158.02821312813884',
            },
            radius: 4000,
            loadAll: true,
          },
          searchHotelReqParams: {
            radius: 4000,
            orderBy: 'popularity',
            adultsNumber: 2,
            roomNumber: 1,
            checkinDate: '2022-09-30T00:00:00',
            checkoutDate: '2022-10-01T00:00:00',
            latitude: '21.4286856',
            longitude: '-158.1389763',
            pageNumber: 0,
            includeAdjacency: true,
            mock: true,
          },
        });

      const result = response.body as CompositeSearchResponse;
      expect(result.IBcode).toEqual({ ...ibDefs.SUCCESS }.IBcode);
      expect(result.IBparams.hotelSearchCount).toBeGreaterThan(0);
      expect(result.IBparams.hotelSearchResult).toHaveLength(
        result.IBparams.hotelSearchCount,
      );

      expect(result.IBparams.nearbySearchCount).toBeGreaterThan(0);
      expect(result.IBparams.nearbySearchResult).not.toBeFalsy();
      expect(result.IBparams.nearbySearchResult).toHaveLength(
        result.IBparams.nearbySearchCount,
      );
      const { hotelSearchResult, nearbySearchResult } = result.IBparams;
      // eslint-disable-next-line no-restricted-syntax
      for await (const item of hotelSearchResult) {
        expect(item).toHaveProperty('id');
        expect(item).toHaveProperty('address_trans');
        expect(item).toHaveProperty('url');
        // expect(item).toHaveProperty('urgency_message');
        // expect(item).toHaveProperty('is_wholesaler_candidate');
        expect(item).toHaveProperty('preferred');
        expect(item).toHaveProperty('review_nr');
        expect(item).toHaveProperty('is_no_prepayment_block');
        expect(item).toHaveProperty('mobile_discount_percentage');
        expect(item).toHaveProperty('longitude');
        expect(item).toHaveProperty('hotel_facilities');
        expect(item).toHaveProperty('review_score');
        expect(item).toHaveProperty('extended');
        expect(item).toHaveProperty('default_language');
        expect(item).toHaveProperty('children_not_allowed');
        expect(item).toHaveProperty('currency_code');
        expect(item).toHaveProperty('hotel_name');
        expect(item).toHaveProperty('class');
        expect(item).toHaveProperty('preferred_plus');
        expect(item).toHaveProperty('is_genius_deal');
        expect(item).toHaveProperty('city_in_trans');
        expect(item).toHaveProperty('main_photo_id');
        expect(item).toHaveProperty('checkout');
        expect(item).toHaveProperty('native_ad_id');
        expect(item).toHaveProperty('distance_to_cc');
        expect(item).toHaveProperty('type');
        expect(item).toHaveProperty('distance');
        expect(item).toHaveProperty('default_wishlist_name');
        expect(item).toHaveProperty('countrycode');
        expect(item).toHaveProperty('class_is_estimated');
        expect(item).toHaveProperty('badges');
        expect(item).toHaveProperty('district_id');
        expect(item).toHaveProperty('is_mobile_deal');
        expect(item).toHaveProperty('in_best_district');
        expect(item).toHaveProperty('composite_price_breakdown');
        expect(item).toHaveProperty('native_ads_cpc');
        expect(item).toHaveProperty('timezone');
        expect(item).toHaveProperty('is_beach_front');
        expect(item).toHaveProperty('accommodation_type');
        expect(item).toHaveProperty('review_recommendation');
        expect(item).toHaveProperty('district');
        expect(item).toHaveProperty('is_city_center');
        expect(item).toHaveProperty('hotel_name_trans');
        expect(item).toHaveProperty('accommodation_type_name');
        // expect(item).toHaveProperty('ribbon_text');
        expect(item).toHaveProperty('latitude');
        // expect(item).toHaveProperty('cn_ranking_context');
        expect(item).toHaveProperty('hotel_has_vb_boost');
        expect(item).toHaveProperty('review_score_word');
        expect(item).toHaveProperty('ufi');
        expect(item).toHaveProperty('is_smart_deal');
        expect(item).toHaveProperty('city_trans');
        expect(item).toHaveProperty('cc1');
        expect(item).toHaveProperty('cc_required');
        expect(item).toHaveProperty('city_name_en');
        expect(item).toHaveProperty('cant_book');
        expect(item).toHaveProperty('min_total_price');
        expect(item).toHaveProperty('is_geo_rate');
        expect(item).toHaveProperty('country_trans');
        expect(item).toHaveProperty('unit_configuration_label');
        expect(item).toHaveProperty('price_breakdown');
        expect(item).toHaveProperty('districts');
        expect(item).toHaveProperty('wishlist_count');
        expect(item).toHaveProperty('hotel_id');
        expect(item).toHaveProperty('price_is_final');
        expect(item).toHaveProperty('genius_discount_percentage');
        expect(item).toHaveProperty('is_free_cancellable');
        // expect(item).toHaveProperty('has_swimming_pool');
        expect(item).toHaveProperty('bwallet');
        expect(item).toHaveProperty('native_ads_tracking');
        expect(item).toHaveProperty('checkin');
        expect(item).toHaveProperty('selected_review_topic');
        expect(item).toHaveProperty('distances');
        expect(item).toHaveProperty('zip');
        expect(item).toHaveProperty('block_ids');
        expect(item).toHaveProperty('max_photo_url');
        expect(item).toHaveProperty('max_1440_photo_url');
        expect(item).toHaveProperty('is_free_cancellable');
        expect(item).toHaveProperty('is_free_cancellable');
      }

      // eslint-disable-next-line no-restricted-syntax
      for await (const item of nearbySearchResult) {
        expect(item).toHaveProperty('business_status');
        expect(item).toHaveProperty('geometry');
        expect(item.geometry).toHaveProperty('location');
        expect(item.geometry?.location).toHaveProperty('lat');
        expect(item.geometry?.location).toHaveProperty('lng');
        expect(item.geometry).toHaveProperty('viewport');
        expect(item.geometry?.viewport).toHaveProperty('northeast');
        expect(item.geometry?.viewport).toHaveProperty('southwest');
        expect(item.geometry?.viewport?.northeast).toHaveProperty('lat');
        expect(item.geometry?.viewport?.northeast).toHaveProperty('lng');
        expect(item.geometry?.viewport?.southwest).toHaveProperty('lat');
        expect(item.geometry?.viewport?.southwest).toHaveProperty('lng');
        expect(item).toHaveProperty('icon');
        expect(item).toHaveProperty('icon_background_color');
        expect(item).toHaveProperty('icon_mask_base_uri');
        expect(item).toHaveProperty('name');
        // expect(item).toHaveProperty('opening_hours');
        // expect(item).toHaveProperty('photos');

        if (item.photos && item.photos.length > 0) {
          expect(item.photos?.at(0)).toHaveProperty('height');
          expect(item.photos?.at(0)).toHaveProperty('html_attributions');
          expect(item.photos?.at(0)).toHaveProperty('photo_reference');
          expect(item.photos?.at(0)).toHaveProperty('width');
        }

        expect(item).toHaveProperty('place_id');
        expect(item).toHaveProperty('plus_code');
        expect(item).toHaveProperty('rating');
        expect(item).toHaveProperty('reference');
        expect(item).toHaveProperty('scope');
        expect(item).toHaveProperty('types');
        expect(item).toHaveProperty('user_ratings_total');
        expect(item).toHaveProperty('vicinity');
      }
    });
  });

  describe('POST /getRecommendList', () => {
    it('Case: Correct', async () => {
      const params = {
        searchCond: {
          nearbySearchReqParams: {
            keyword: '',
            location: {
              latitude: '21.471383921418447',
              longitude: '-158.02821312813884',
            },
            radius: 4000,
          },
          searchHotelReqParams: {
            radius: 4000,
            orderBy: 'popularity',
            adultsNumber: 2,
            roomNumber: 1,
            checkinDate: '2022-09-30T00:00:00',
            checkoutDate: '2022-10-03T00:00:00',
            latitude: '21.4286856',
            longitude: '-158.1389763',
            pageNumber: 0,
            includeAdjacency: true,
            mock: true,
          },
        },
        evalCond: {
          nearbySearch: {
            orderBy: [
              {
                column: 'rating',
                sort: 'desc',
              },
            ],
          },
          hotelSearch: {
            orderBy: [
              {
                column: 'review_score',
                sort: 'desc',
              },
              {
                column: 'distance',
                sort: 'asc',
              },
            ],
          },
        },
      };
      const response = await request(app)
        .post('/schedule/getRecommendList')
        .send(params);

      const result = response.body as GetRecommendListResponse;
      expect(result.IBcode).toEqual({ ...ibDefs.SUCCESS }.IBcode);
      expect(result.IBparams.id).toBeGreaterThan(0);

      expect(typeof result.IBparams.id).toBe('number');
      expect(result.IBparams.keyword).toBe(
        params.searchCond.nearbySearchReqParams.keyword,
      );
      expect(result.IBparams.latitude).toBeCloseTo(
        Number.parseFloat(
          params.searchCond.nearbySearchReqParams.location.latitude,
        ),
        6,
      );
      expect(result.IBparams.longitude).toBeCloseTo(
        Number.parseFloat(
          params.searchCond.nearbySearchReqParams.location.longitude,
        ),
        6,
      );
      expect(result.IBparams.radius).toBe(
        params.searchCond.nearbySearchReqParams.radius,
      );
      expect(result.IBparams.hotelOrderBy).toBe(
        params.searchCond.searchHotelReqParams.orderBy,
      );
      expect(result.IBparams.hotelAdultsNumber).toBe(
        params.searchCond.searchHotelReqParams.adultsNumber,
      );
      expect(result.IBparams.hotelUnits).toBeNull();
      expect(result.IBparams.hotelRoomNumber).toBe(
        params.searchCond.searchHotelReqParams.roomNumber,
      );
      expect(result.IBparams.hotelCheckinDate).toBe(
        new Date(
          params.searchCond.searchHotelReqParams.checkinDate,
        ).toISOString(),
      );
      expect(result.IBparams.hotelCheckoutDate).toBe(
        new Date(
          params.searchCond.searchHotelReqParams.checkoutDate,
        ).toISOString(),
      );
      expect(result.IBparams.hotelFilterByCurrency).toBeNull();

      expect(typeof result.IBparams.visitSchedulesCount).toBe('number');
      expect(result.IBparams.spotPerDay).toBe(
        result.IBparams.visitSchedules.length,
      );

      const { visitSchedules } = result.IBparams;
      // eslint-disable-next-line no-restricted-syntax
      for await (const visitSchedule of visitSchedules) {
        const { spot, hotel } = visitSchedule;

        // eslint-disable-next-line no-restricted-syntax
        for await (const aSpot of spot) {
          expect(aSpot.queryParamsId).toBe(result.IBparams.id);
        }

        // eslint-disable-next-line no-restricted-syntax
        for await (const aHotel of hotel) {
          expect(aHotel.queryParamsId).toBe(result.IBparams.id);
        }
      }
    });
  });
});
