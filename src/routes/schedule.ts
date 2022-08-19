/* eslint-disable @typescript-eslint/naming-convention */

import express, { Express } from 'express';
// import prisma from '@src/prisma';
import { ibDefs, asyncWrapper, IBResFormat } from '@src/utils';
import axios, { Method } from 'axios';
import prisma from '@src/prisma';
import { PrismaClient, SearchHotelRes, Prisma } from '@prisma/client';
import moment from 'moment';

const scheduleRouter: express.Application = express();

interface NearBySearchReqParams {
  keyword: string;
  location: {
    latitude: string; // 위도
    longitude: string; // 경도
  };
  radius: number;
  pageToken: string;
}

interface SearchHotelReqParams {
  orderBy?: // default popularity
  | 'popularity'
    | 'class_ascending'
    | 'class_descending'
    | 'distance'
    | 'upsort_bh'
    | 'review_score'
    | 'price';
  adultsNumber: number;
  // units: 'metric';
  roomNumber?: number; // Number of rooms
  checkinDate: Date; // '2022-09-30';
  checkoutDate: Date; // '2022-10-01';
  filterByCurrency?: 'USD' | 'KRW'; // default USD;
  // locale: 'en-us';
  latitude: string; // 위도좌표 ex) 21.4286856;
  longitude: string; // 경도 ex) -158.1389763;
  pageNumber?: number; // default 0;
  includeAdjacency?: boolean; // default false. Include nearby places. If there are few hotels in the selected location, nearby locations will be added. You should pay attention to the `primary_count` parameter - it is the number of hotels from the beginning of the array that matches the strict filter.
  mock?: boolean; // default true
}

interface QueryParams {
  searchHotelReqParams: SearchHotelReqParams;
  nearbySearchReqParams: NearBySearchReqParams;
}

type SearchedData = Omit<
  SearchHotelRes,
  | 'distance'
  | 'gross_amount'
  | 'included_taxes_and_charges_amount'
  | 'net_amount'
  | 'checkout'
  | 'checkin'
> & {
  distance: string;
  composite_price_breakdown: {
    product_price_breakdowns: {
      gross_amount: {
        value: number;
      };
    }[];
    included_taxes_and_charges_amount: {
      value: number;
    };
    net_amount: {
      value: number;
    };
  };
  checkin: {
    from: string;
  };
  checkout: {
    until: string;
  };
};

const defaultNearbySearchReqParams = {
  keyword: undefined,
  radius: undefined,
  location: {
    latitude: undefined,
    longitude: undefined,
  },
};
const defaultSearchHotelReqParams = {
  orderBy: undefined,
  adultsNumber: undefined,
  roomNumber: undefined,
  checkinDate: undefined,
  checkoutDate: undefined,
  filterByCurrency: undefined,
  latitude: undefined,
  longitude: undefined,
  pageNumber: undefined,
  includeAdjacency: undefined,
  mock: true,
};

// @ts-ignore: Unreachable code error
BigInt.prototype.toJSON = (): number => {
  return Number(this);
};

const createQueryParamId = async (
  prismaX: Omit<
    PrismaClient<
      Prisma.PrismaClientOptions,
      never,
      Prisma.RejectOnNotFound | Prisma.RejectPerOperation | undefined
    >,
    '$connect' | '$disconnect' | '$on' | '$transaction' | '$use'
  >,
  params: QueryParams,
  ifAlreadyQueryId?: bigint,
) => {
  const { nearbySearchReqParams, searchHotelReqParams } = params;
  const {
    keyword,
    radius,
    location: { latitude: nearbySearchLat, longitude: nearbySearchLngt },
  } = nearbySearchReqParams ?? defaultNearbySearchReqParams;

  const {
    orderBy,
    adultsNumber,
    roomNumber,
    checkinDate,
    checkoutDate,
    filterByCurrency,
    latitude: paramLat,
    longitude: paramLngt,
    // mock
  } = searchHotelReqParams ?? defaultSearchHotelReqParams;

  if (ifAlreadyQueryId) return ifAlreadyQueryId;

  const queryParamResult = await prismaX.queryParams.create({
    data: {
      keyword,
      radius,
      latitude: parseFloat(nearbySearchLat ?? paramLat),
      longitude: parseFloat(nearbySearchLngt ?? paramLngt),
      hotelOrderBy: orderBy,
      hotelAdultsNumber: adultsNumber,
      hotelRoomNumber: roomNumber,
      hotelCheckinDate: new Date(checkinDate),
      hotelCheckoutDate: new Date(checkoutDate),
      hotelFilterByCurrency: filterByCurrency,
    },
  });
  return queryParamResult.id;
};

const nearbySearchInnerAsyncFn = async (
  queryParams: QueryParams,
  ifAlreadyQueryId?: bigint,
) => {
  const {
    nearbySearchReqParams: { location, radius, pageToken, keyword },
  } = queryParams;

  const queryUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?keyword=${keyword}&location=${
    location?.latitude
  }%2C${location?.longitude}&radius=${radius}&key=${
    process.env.GCP_MAPS_APIKEY as string
  }${pageToken ? `&pagetoken=${pageToken}` : ''}`;
  console.log(queryUrl);

  const response = await axios.get(queryUrl);

  let queryParamId: bigint = BigInt(-1);
  let results: google.maps.places.IBPlaceResult[] = [];
  if (response?.statusText === 'OK') {
    await prisma.$transaction(async prismaX => {
      queryParamId = await createQueryParamId(
        prismaX,
        queryParams,
        ifAlreadyQueryId,
      );

      results =
        (
          response.data as Partial<{
            results: google.maps.places.IBPlaceResult[];
          }>
        ).results ?? [];

      const promises = results?.map(
        (item: google.maps.places.IBPlaceResult) => {
          return prismaX.gglNearbySearchRes.create({
            data: {
              QueryParams: {
                connect: {
                  id: queryParamId,
                },
              },
              geometry: {
                create: {
                  location: JSON.stringify({
                    lat: item.geometry?.location?.lat,
                    lng: item.geometry?.location?.lng,
                  }),
                  viewport: JSON.stringify({
                    northeast: {
                      lat: item.geometry?.viewport?.northeast?.lat,
                      lng: item.geometry?.viewport?.northeast?.lng,
                    },
                    southwest: {
                      lat: item.geometry?.viewport?.southwest?.lat,
                      lng: item.geometry?.viewport?.southwest?.lng,
                    },
                  }),
                },
              },
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
        },
      );

      if (promises) await Promise.all(promises);
    });
  }
  console.log(JSON.stringify(response.data, null, 2));
  return { nearbySearchResult: results, queryParamId };
};

export const nearbySearch = asyncWrapper(
  async (
    req: Express.IBTypedReqBody<QueryParams>,
    res: Express.IBTypedResponse<IBResFormat>,
  ) => {
    const { nearbySearchResult } = await nearbySearchInnerAsyncFn(req.body);
    res.json({
      ...ibDefs.SUCCESS,
      IBparams: nearbySearchResult as object,
    });
  },
);

export const addMockHotelResource = asyncWrapper(
  async (
    req: Express.IBTypedReqBody<{
      orderBy?: // default popularity
      | 'popularity'
        | 'class_ascending'
        | 'class_descending'
        | 'distance'
        | 'upsort_bh'
        | 'review_score'
        | 'price';
      adultsNumber: number;
      // units: 'metric';
      roomNumber?: number; // Number of rooms
      checkinDate: Date; // '2022-09-30';
      checkoutDate: Date; // '2022-10-01';
      filterByCurrency?: 'USD' | 'KRW'; // default USD;
      // locale: 'en-us';
      latitude: string; // 위도좌표 ex) 21.4286856;
      longitude: string; // 경도 ex) -158.1389763;
      pageNumber?: number; // default 0;
      includeAdjacency?: boolean; // default false. Include nearby places. If there are few hotels in the selected location, nearby locations will be added. You should pay attention to the `primary_count` parameter - it is the number of hotels from the beginning of the array that matches the strict filter.
    }>,
    res: Express.IBTypedResponse<IBResFormat>,
  ) => {
    const {
      body: {
        orderBy,
        adultsNumber,
        roomNumber,
        checkinDate,
        checkoutDate,
        filterByCurrency,
        latitude: paramLat,
        longitude: paramLngt,
        pageNumber,
        includeAdjacency,
      },
    } = req;

    const options = {
      method: 'GET' as Method,
      url: 'https://booking-com.p.rapidapi.com/v1/hotels/search-by-coordinates',
      params: {
        order_by: orderBy ?? 'popularity',
        adults_number: adultsNumber.toString(),
        units: 'metric',
        room_number: roomNumber ? roomNumber.toString() : '1',
        checkin_date: moment(checkinDate).format('YYYY-MM-DD'),
        checkout_date: moment(checkoutDate).format('YYYY-MM-DD'),
        filter_by_currency: filterByCurrency ?? 'USD',
        locale: 'en-us',
        latitude: paramLat.toString(),
        longitude: paramLngt.toString(),
        page_number: pageNumber ? pageNumber.toString() : '0',
        include_adjacency: includeAdjacency ?? 'false',
      },
      headers: {
        'X-RapidAPI-Key': 'ed5143522dmsh08a8f16dd35fd7ap1433aajsn5ba513b80047',
        'X-RapidAPI-Host': 'booking-com.p.rapidapi.com',
      },
    };
    const response = await axios.request(options);

    const data = JSON.stringify(response.data);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    await prisma.mockBookingDotComHotelResource.create({
      data: {
        responseData: data,
      },
    });

    res.json({
      ...ibDefs.SUCCESS,
      IBparams: response.data as object,
    });
  },
);

// export const readMockHotelResource = asyncWrapper(
//   async (
//     req: Express.IBTypedReqBody<{}>,
//     res: Express.IBTypedResponse<IBResFormat>,
//   ) => {
//     // eslint-disable-next-line @typescript-eslint/no-unsafe-call
//     const result = await readHotelDataFromMock();

//     res.json({
//       ...ibDefs.SUCCESS,
//       IBparams: result ? (JSON.parse(result.responseData) as Object) : {},
//     });
//   },
// );

const searchHotelInnerAsyncFn = async (
  queryParams: QueryParams,
  ifAlreadyQueryId?: bigint,
) => {
  const { searchHotelReqParams } = queryParams;
  // const {
  //   keyword,
  //   radius,
  //   location: { latitude: nearbySearchLat, longitude: nearbySearchLngt },
  // } = nearbySearchReqParams ?? defaultNearbySearchReqParams;

  const {
    orderBy,
    adultsNumber,
    roomNumber,
    checkinDate,
    checkoutDate,
    filterByCurrency,
    latitude: paramLat,
    longitude: paramLngt,
    pageNumber,
    includeAdjacency,
    mock,
  } = searchHotelReqParams ?? defaultSearchHotelReqParams;

  const data = await (async () => {
    if (mock) {
      const responseData =
        await prisma.mockBookingDotComHotelResource.findFirst();
      const { result } = responseData
        ? (JSON.parse(responseData?.responseData) as {
            result: SearchedData[];
          })
        : { result: [] };
      return result;
    }
    const options = {
      method: 'GET' as Method,
      url: 'https://booking-com.p.rapidapi.com/v1/hotels/search-by-coordinates',
      params: {
        order_by: orderBy ?? 'popularity',
        adults_number: adultsNumber.toString(),
        units: 'metric',
        room_number: roomNumber ? roomNumber.toString() : '1',
        checkin_date: moment(checkinDate).format('YYYY-MM-DD'),
        checkout_date: moment(checkoutDate).format('YYYY-MM-DD'),
        filter_by_currency: filterByCurrency ?? 'USD',
        locale: 'en-us',
        latitude: paramLat.toString(),
        longitude: paramLngt.toString(),
        page_number: pageNumber ? pageNumber.toString() : '0',
        include_adjacency: includeAdjacency ?? 'false',
      },
      headers: {
        'X-RapidAPI-Key': 'ed5143522dmsh08a8f16dd35fd7ap1433aajsn5ba513b80047',
        'X-RapidAPI-Host': 'booking-com.p.rapidapi.com',
      },
    };
    const response = await axios.request(options);

    const { result } = response.data as { result: SearchedData[] };
    return result;
  })();

  let queryParamId: bigint = BigInt(-1);
  await prisma.$transaction(async (prismaX: PrismaClient) => {
    // const queryParamResult = await prismaX.queryParams.create({
    //   data: {
    //     latitude: paramLat,
    //     longitude: paramLngt,
    //     hotelOrderBy: orderBy ?? 'popularity',
    //     hotelAdultsNumber: adultsNumber,
    //     hotelUnits: 'metric',
    //     hotelRoomNumber: roomNumber ?? 1,
    //     hotelCheckinDate: new Date(checkinDate),
    //     hotelCheckoutDate: new Date(checkoutDate),
    //     hotelFilterByCurrency: filterByCurrency ?? 'USD',
    //   },
    // });
    queryParamId = await createQueryParamId(
      prismaX,
      queryParams,
      ifAlreadyQueryId,
    );

    const createSearchHotelResPromises = data.map(item => {
      const {
        min_total_price,
        composite_price_breakdown: {
          product_price_breakdowns: [
            {
              gross_amount: { value: gross_amount },
            },
          ],
          included_taxes_and_charges_amount: {
            value: included_taxes_and_charges_amount,
          },
          net_amount: { value: net_amount },
        },
        countrycode,
        default_language,
        address,
        city,
        city_name_en,
        checkin: { from: checkin },
        checkout: { until: checkout },
        distance,
        review_score_word,
        review_score,
        // currency,
        currency_code,
        timezone,
        urgency_message,
        hotel_id,
        hotel_name,
        latitude,
        longitude,
        url,
        accommodation_type_name,
        zip,
        main_photo_url,
        max_photo_url,
        hotel_facilities,
        // has_swimming_pool,
      } = item;

      return prismaX.searchHotelRes.create({
        data: {
          QueryParams: {
            connect: {
              id: queryParamId,
            },
          },
          min_total_price,
          gross_amount,
          included_taxes_and_charges_amount,
          net_amount,
          countrycode,
          default_language,
          address,
          city,
          city_name_en,
          checkin,
          checkout,
          distance: parseFloat(distance),
          review_score_word,
          review_score,
          currency_code,
          timezone,
          urgency_message,
          hotel_id,
          hotel_name,
          latitude,
          longitude,
          url,
          accommodation_type_name,
          zip,
          main_photo_url,
          max_photo_url,
          hotel_facilities,
          // has_swimming_pool,
        },
      });
    });

    await Promise.all(createSearchHotelResPromises);
  });

  return { hotelSearchResult: data, queryParamId };
};

export const searchHotel = asyncWrapper(
  async (
    req: Express.IBTypedReqBody<QueryParams>,
    res: Express.IBTypedResponse<IBResFormat>,
  ) => {
    // const {
    //   body: {
    // orderBy,
    // adultsNumber,
    // roomNumber,
    // checkinDate,
    // checkoutDate,
    // filterByCurrency,
    // latitude: paramLat,
    // longitude: paramLngt,
    // pageNumber,
    // includeAdjacency,
    // mock,
    //   },
    // } = req;

    const queryParams = req.body;
    const { hotelSearchResult } = await searchHotelInnerAsyncFn(queryParams);

    res.json({
      ...ibDefs.SUCCESS,
      IBparams: hotelSearchResult as object,
    });
  },
);

export const compositeSearch = asyncWrapper(
  async (
    req: Express.IBTypedReqBody<QueryParams>,
    res: Express.IBTypedResponse<IBResFormat>,
  ) => {
    const queryParams = req.body;
    // const { searchHotelReqParams, nearbySearchReqParams } = queryParams;

    const { hotelSearchResult, queryParamId } = await searchHotelInnerAsyncFn(
      queryParams,
    );

    const { nearbySearchResult } = await nearbySearchInnerAsyncFn(
      queryParams,
      queryParamId,
    );

    res.json({
      ...ibDefs.SUCCESS,
      IBparams: {
        hotelSearchResult,
        nearbySearchResult,
      } as object,
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
scheduleRouter.post('/searchHotel', searchHotel);
scheduleRouter.post('/addMockHotelResource', addMockHotelResource);
scheduleRouter.post('/compositeSearch', compositeSearch);

// scheduleRouter.post('/validNearbySearchPageToken', validNearbySearchPageToken);

export default scheduleRouter;
