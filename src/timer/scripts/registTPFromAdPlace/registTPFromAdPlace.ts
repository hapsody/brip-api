import { isNil, isEmpty } from 'lodash';
import {
  PrismaClient,
  AdPlace,
  AdPlaceStatus,
  IBPhotos,
  IBTravelTag,
  PlaceType,
  RModelBetweenTravelType,
} from '@prisma/client';
import { addrToGeoCode } from '@src/utils';

const prisma = new PrismaClient();

async function registTPFromAdPlace(): Promise<void> {
  const getNextAdPlace = {
    [Symbol.asyncIterator]() {
      const take = 1000;
      let skip = 0;
      // let lastId = 1;
      let adPlace: (AdPlace & {
        photos: IBPhotos[];
        category: (IBTravelTag & {
          related: (RModelBetweenTravelType & {
            to: IBTravelTag;
          })[];
        })[];
      })[];

      return {
        async next() {
          try {
            adPlace = await prisma.adPlace.findMany({
              where: {
                OR: [
                  { status: AdPlaceStatus.APPROVED },
                  { status: AdPlaceStatus.REOPEN_WAIT },
                ],
              },
              take,
              skip,
              include: {
                photos: true,
                category: {
                  include: {
                    related: {
                      include: {
                        to: true,
                      },
                    },
                  },
                },
              },
            });

            if (isNil(adPlace) || isEmpty(adPlace)) {
              return { done: true, value: adPlace };
            }

            // lastId += adPlace[adPlace.length - 1].id;
            skip += take;

            return { done: false, value: adPlace };
          } catch (error) {
            console.log('prismaError');
            console.error(error);
            return { done: false, value: [] };
          }
        },
      };
    },
  };

  let totalCnt = 0;
  let updatedCnt = 0;
  let notFoundCnt = 0;
  /// 한국내 데이터 주소 및 우편번호 표준화
  // eslint-disable-next-line no-restricted-syntax
  for await (const adPlace of getNextAdPlace) {
    const result = await Promise.all(
      // eslint-disable-next-line @typescript-eslint/no-loop-func
      adPlace.map(async v => {
        try {
          const geoCodeNRegionCode = await (async () => {
            if (!isNil(v.roadAddress)) {
              const ret = await addrToGeoCode({
                address: v.roadAddress,
                type: 'road',
              });
              if (!isNil(ret)) return ret;
            }
            if (!isNil(v.address)) {
              const ret = await addrToGeoCode({
                address: v.address,
                type: 'parcel',
              });
              if (!isNil(ret)) return ret;
            }
            return null;
          })();

          if (isNil(geoCodeNRegionCode)) {
            notFoundCnt += 1;
            console.log(
              `\nFail: AddrToGeoCoord [adPlaceId: ${v.id}, title:${v.title}] 주소->위경도 변환 api 결과가 올바르지 않습니다.\n`,
              {
                id: v.id,
                title: v.title,
                address: v.address,
                roadAddress: v.roadAddress,
              },
            );
            return null;
          }
          const { regionCode1, regionCode2, lng, lat } = geoCodeNRegionCode;

          // const tourPlaceType = (() => {

          //   if (
          //     v.category[0].primary === '음식점' ||
          //     v.category[0].primary === '카페' ||
          //     v.category[0].secondary === '술집' ||
          //     v.category[0].secondary === '바'
          //   ) {
          //     return PlaceType.ADPLACE_RESTAURANT;
          //   }
          //   return PlaceType.ADPLACE_SPOT;
          // })();
          const tourPlaceType = (() => {
            if (
              v.category[0].value === '음식점' ||
              v.category[0].value === '카페' ||
              !isNil(
                v.category[0].related.find(
                  k => k.to.value.includes('술집') || k.to.value.includes('바'),
                ),
              )
            ) {
              return PlaceType.ADPLACE_RESTAURANT;
            }
            return PlaceType.ADPLACE_SPOT;
          })();

          const alreadyExist = await prisma.tourPlace.findFirst({
            where: {
              title: v.title,
              lat,
              lng,
              status: 'IN_USE',
            },
          });

          if (isNil(alreadyExist)) {
            const createdResult = await prisma.tourPlace.create({
              data: {
                title: v.title,
                tourPlaceType,
                status: 'IN_USE',
                lat,
                lng,
                regionCode1,
                regionCode2,
                address: v.address,
                roadAddress: v.roadAddress,
                openWeek: v.openWeek,
                contact: v.contact,
                photos: {
                  connect: v.photos.map(k => {
                    return {
                      id: k.id,
                    };
                  }),
                },
                desc: v.desc,
                nationalCode: v.nationalCode,
                adPlace: {
                  connect: {
                    id: v.id,
                  },
                },
              },
            });
            console.log(
              JSON.stringify({
                id: createdResult.id,
                title: createdResult.title,
                regionCode1: createdResult.regionCode1,
                regionCode2: createdResult.regionCode2!,
              }),
            );

            return {
              id: createdResult.id,
              title: createdResult.title,
              roadAddress: createdResult.roadAddress,
              address: createdResult.address,
              postcode: createdResult.postcode,
              regionCode1: createdResult.regionCode1,
              regionCode2: createdResult.regionCode2,
            };
          }
          console.log(
            `Fail:AlreadyExist: [adPlaceId: ${v.id}, title: ${v.title}] => 해당 adPlace의 tourPlace는 이미 존재합니다.`,
          );
          return null;
        } catch (error) {
          console.log(error);
          return null;
        }
      }),
    );
    totalCnt += result.length;
    updatedCnt += result.filter(v => v).length;
  }
  console.log(
    `num Of updated items:${updatedCnt}, failed items: ${
      totalCnt - updatedCnt
    }, notFound Failed Items: ${notFoundCnt}`,
  );

  // const getNextAdPlace = {
  //   [Symbol.asyncIterator]() {
  //     const take = 1000;
  //     let lastId = 1;
  //     let adPlace: AdPlace[];

  //     return {
  //       async next() {
  //         adPlace = await prisma.tourPlace.findMany({
  //           where: {
  //             status: 'IN_USE',
  //             OR: [{ roadAddress: { not: null } }, { address: { not: null } }],
  //           },
  //           take,
  //           cursor: {
  //             id: lastId,
  //           },
  //         });

  //         lastId += adPlace[adPlace.length - 1].id;

  //         if (isEmpty(adPlace)) return { done: true, value: adPlace };
  //         return { done: false, value: adPlace };
  //       },
  //     };
  //   },
  // };

  // let updatedCnt = 0;
  // /// 한국내 데이터 주소 및 우편번호 표준화
  // // eslint-disable-next-line no-restricted-syntax
  // for await (const adPlace of getNextAdPlace) {
  //   const result = await Promise.all(
  //     // eslint-disable-next-line @typescript-eslint/no-loop-func
  //     adPlace.map(async v => {
  //       const juso = await (() => {
  //         if (!isNil(v.roadAddress)) {
  //           return searchKRJuso(v.roadAddress);
  //         }

  //         return searchKRJuso(v.address!);
  //       })();

  //       if (isNil(juso)) return null;

  //       const updateResult = await prisma.tourPlace.update({
  //         where: {
  //           id: v.id,
  //         },
  //         data: {
  //           roadAddress: juso.roadAddr,
  //           address: juso.jibunAddr,
  //           postcode: juso.zipNo,
  //         },
  //       });
  //       console.log({
  //         id: updateResult.id,
  //         title: updateResult.title,
  //         address: updateResult.address,
  //         roadAddress: updateResult.roadAddress,
  //         postcode: updateResult.postcode,
  //       });

  //       return {
  //         id: updateResult.id,
  //         title: updateResult.title,
  //         roadAddress: updateResult.roadAddress,
  //         address: updateResult.address,
  //         postcode: updateResult.postcode,
  //       };
  //     }),
  //   );
  //   updatedCnt += result.length;
  // }
  // console.log(`num Of updated items:${updatedCnt}`);
}

// function wrapper(func: () => Promise<void>): () => void {
//   return () => {
//     func().catch(e => console.error(e));
//   };
// }

// registTPFromAdPlace()
//   .catch(e => {
//     console.error(e);
//     process.exit(1);
//   })
//   .finally(
//     wrapper(async () => {
//       // await prisma.$disconnect();
//     }),
//   );

export default registTPFromAdPlace;
