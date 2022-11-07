import request from 'supertest';
import app from '@src/app';
import prisma from '@src/prisma';
// import prisma from '@src/prisma';
// import { User } from '@prisma/client';
import { ibDefs, IBResFormat } from '@src/utils';
import { SearchHotelRetParams } from '../types/schduleTypes';
import { params } from './getRecommendListWithLatLngt/__test__/testData';

jest.setTimeout(120000);

beforeAll(async () => {
  const mockData = await prisma.mockBookingDotComHotelResource.findMany();
  if (mockData.length === 0) {
    const addMockTransactionRawRes = await request(app)
      .post('/schedule/addMockHotelResource')
      .send({ ...params.searchCond.searchHotelReqParams, mock: undefined });
    const { IBcode } = addMockTransactionRawRes.body as IBResFormat;
    expect(IBcode).toBe('1000');
  }
});

describe('Schedule Express Router E2E Test', () => {
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

      const result = response.body as SearchHotelRetParams;
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
});
