import express, { Express } from 'express';
// import prisma from '@src/prisma';
import { ibDefs, asyncWrapper, IBResFormat } from '@src/utils';
import axios from 'axios';

const scheduleRouter: express.Application = express();

export const nearbySearch = asyncWrapper(
  async (
    req: Express.IBTypedReqBody<{
      keyword: string;
      location: {
        latitude: string; // 위도
        longitude: string; // 경도
      };
      radius: number;
    }>,
    res: Express.IBTypedResponse<IBResFormat>,
  ) => {
    const {
      body: { keyword, location, radius },
    } = req;

    const queryUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?keyword=${keyword}&location=${
      location?.latitude
    }%2C${location?.longitude}&radius=${radius}&key=${
      process.env.GCP_MAPS_APIKEY as string
    }`;
    console.log(queryUrl);
    const response = await axios.get(queryUrl);

    console.log(JSON.stringify(response.data, null, 2));
    res.json({
      ...ibDefs.SUCCESS,
      IBparams: response.data as object,
    });
  },
);

scheduleRouter.post('/nearbySearch', nearbySearch);

export default scheduleRouter;
