import express, { Express } from 'express';
// import prisma from '@src/prisma';
import { ibDefs, asyncWrapper, IBResFormat } from '@src/utils';
import axios from 'axios';
import prisma from '@src/prisma';

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
      pageToken: string;
    }>,
    res: Express.IBTypedResponse<IBResFormat>,
  ) => {
    const {
      body: { keyword, location, radius, pageToken },
    } = req;

    const queryUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?keyword=${keyword}&location=${
      location?.latitude
    }%2C${location?.longitude}&radius=${radius}&key=${
      process.env.GCP_MAPS_APIKEY as string
    }${pageToken ? `&pagetoken=${pageToken}` : ''}`;
    console.log(queryUrl);
    const response = await axios.get(queryUrl);
    if (response?.statusText === 'OK') {
      // const results = response.data as Partial<{
      //   result: GglNearbySearchRes[];
      // }>;
      // const results: google.maps.places.PlaceResult = response.data;
      const { results } = response.data as Partial<{
        results: google.maps.places.PlaceResult[];
      }>;

      const promises = results?.map((item: google.maps.places.PlaceResult) => {
        return prisma.gglNearbySearchRes.create({
          data: {
            icon: item.icon,
            icon_background_color: item.icon_background_color,
            icon_mask_base_uri: item.icon_mask_base_uri,
            name: item.name,
            opening_hours:
              (
                item.opening_hours as Partial<{
                  open_now: boolean;
                }>
              )?.open_now ?? false,
            place_id: item.place_id,
            price_level: item.price_level,
            rating: item.rating,
            reference: item.url,
            types: JSON.stringify(item.types),
            user_ratings_total: item.user_ratings_total,
            vicinity: item.vicinity,
            plus_code: {
              create: {
                compund_code: item.plus_code?.compound_code ?? '',
                global_code: item.plus_code?.global_code ?? '',
              },
            },
            photos: {
              create: item.photos?.map(photo => {
                return {
                  height: photo.height,
                  width: photo.width,
                  html_attributuions: JSON.stringify(photo.html_attributions),
                  photo_reference:
                    (photo as Partial<{ photo_reference: string }>)
                      .photo_reference ?? '',
                };
              }),
            },
          },
        });
      });

      if (promises) await Promise.all(promises);
    }
    console.log(JSON.stringify(response.data, null, 2));
    res.json({
      ...ibDefs.SUCCESS,
      IBparams: response.data as object,
    });
  },
);

// export const validNearbySearchPageToken = asyncWrapper(
//   async (
//     req: Express.IBTypedReqBody<{
//       keyword: string;
//       location: {
//         latitude: string; // 위도
//         longitude: string; // 경도
//       };
//       radius: number;
//     }>,
//     res: Express.IBTypedResponse<IBResFormat>,
//   ) => {
//     const {
//       body: { keyword, location, radius },
//     } = req;
//     let pageToken: string | undefined;
//     let resArr: google.maps.places.PlaceResult[] = [];

//     // do {
//     //   const queryUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?keyword=${keyword}&location=${
//     //     location?.latitude
//     //   }%2C${location?.longitude}&radius=${radius}&key=${
//     //     process.env.GCP_MAPS_APIKEY as string
//     //   }${pageToken ? `&pagetoken=${pageToken}` : ''}`;
//     //   console.log(queryUrl);
//     //   // eslint-disable-next-line no-await-in-loop
//     // const response = await axios.get(queryUrl);
//     // if (response?.statusText === 'OK') {
//     //   // eslint-disable-next-line @typescript-eslint/naming-convention
//     //   const { results, next_page_token } = response.data as {
//     //     next_page_token: string;
//     //     results: google.maps.places.PlaceResult[];
//     //   };

//     //   pageToken = next_page_token;
//     //   resArr = [...resArr, ...results];
//     // }
//     //   // console.log(JSON.stringify(response.data, null, 2));
//     // } while (pageToken);

//     const queryUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?keyword=${keyword}&location=${
//       location?.latitude
//     }%2C${location?.longitude}&radius=${radius}&key=${
//       process.env.GCP_MAPS_APIKEY as string
//     }${pageToken ? `&pagetoken=${pageToken}` : ''}`;
//     console.log(queryUrl);
//     // eslint-disable-next-line no-await-in-loop
//     const response = await axios.get(queryUrl);
//     if (response?.statusText === 'OK') {
//       // eslint-disable-next-line @typescript-eslint/naming-convention
//       const { results, next_page_token } = response.data as {
//         next_page_token: string;
//         results: google.maps.places.PlaceResult[];
//       };

//       pageToken = next_page_token;
//       resArr = [...resArr, ...results];
//     }

//     const promise = new Promise(resolve => {
//       (function loop() {
//         if (pageToken) {
//           const queryUrl2 = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?keyword=${keyword}&location=${
//             location?.latitude
//           }%2C${location?.longitude}&radius=${radius}&key=${
//             process.env.GCP_MAPS_APIKEY as string
//           }${pageToken ? `&pagetoken=${pageToken}` : ''}`;
//           console.log(queryUrl2);
//           // eslint-disable-next-line no-await-in-loop
//           axios
//             .get(queryUrl)
//             .then(response2 => {
//               if (response2?.statusText === 'OK') {
//                 // eslint-disable-next-line @typescript-eslint/naming-convention
//                 const { results, next_page_token } = response2.data as {
//                   next_page_token: string;
//                   results: google.maps.places.PlaceResult[];
//                 };

//                 pageToken = next_page_token;
//                 resArr = [...resArr, ...results];
//                 resolve(true);
//               }
//               loop();
//               // console.log(JSON.stringify(response.data, null, 2));
//             })
//             .catch(err => console.error(err));
//         }
//       })();
//     });

//     await promise;
//     console.log(
//       JSON.stringify(
//         resArr.map((item, i) => {
//           return {
//             idx: i,
//             name: item.name,
//             hash: item.place_id,
//           };
//         }),
//         null,
//         2,
//       ),
//     );
//     res.json({
//       ...ibDefs.SUCCESS,
//       IBparams: resArr,
//     });
//   },
// );

scheduleRouter.post('/nearbySearch', nearbySearch);
// scheduleRouter.post('/validNearbySearchPageToken', validNearbySearchPageToken);

export default scheduleRouter;
