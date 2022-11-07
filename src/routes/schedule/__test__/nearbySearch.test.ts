import request from 'supertest';
import app from '@src/app';
// import prisma from '@src/prisma';
// import { User } from '@prisma/client';
import { ibDefs } from '@src/utils';
import { NearbySearchRetParams } from '../types/schduleTypes';

jest.setTimeout(120000);

describe('Schedule Express Router E2E Test', () => {
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

      const result = response.body as NearbySearchRetParams;
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
          for (let i = 0; i < item.photos.length; i += 1) {
            expect(item.photos[i]).toHaveProperty('height');
            expect(item.photos[i]).toHaveProperty('html_attributions');
            expect(item.photos[i]).toHaveProperty('photo_reference');
            expect(item.photos[i]).toHaveProperty('width');
          }
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
});
