import { isNil, isEmpty } from 'lodash';
import { PrismaClient, TourPlace } from '@prisma/client';
import { geoCodeToAddr } from '@src/utils';

const prisma = new PrismaClient();

async function tourPlaceAreaCodeAsigner(): Promise<void> {
  const getNextTourPlaceData = {
    [Symbol.asyncIterator]() {
      const take = 1000;
      let skip = 0;
      // let lastId = 1;
      let tp: TourPlace[];

      return {
        async next() {
          try {
            tp = await prisma.tourPlace.findMany({
              where: {
                status: 'IN_USE',
              },
              take,
              skip,
            });

            if (isNil(tp) || isEmpty(tp)) {
              return { done: true, value: tp };
            }

            // lastId += tp[tp.length - 1].id;
            skip += take;

            return { done: false, value: tp };
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
  for await (const tp of getNextTourPlaceData) {
    const result = await Promise.all(
      // eslint-disable-next-line @typescript-eslint/no-loop-func
      tp.map(async v => {
        try {
          const juso = await geoCodeToAddr(v.lat.toString(), v.lng.toString());

          if (isNil(juso)) {
            notFoundCnt += 1;
            console.log('\n위경도 변환 api 결과가 올바르지 않습니다.\n', {
              id: v.id,
              title: v.title,
              lat: v.lat,
              lng: v.lng,
            });
            return null;
          }

          const updateResult = await prisma.tourPlace.update({
            where: {
              id: v.id,
            },
            data: {
              regionCode1: juso.structure.level1,
              regionCode2: juso.structure.level2.split(' ')[0],
            },
          });
          console.log(
            JSON.stringify({
              id: updateResult.id,
              title: updateResult.title,
              regionCode1: updateResult.regionCode1,
              regionCode2: updateResult.regionCode2!,
            }),
          );

          return {
            id: updateResult.id,
            title: updateResult.title,
            roadAddress: updateResult.roadAddress,
            address: updateResult.address,
            postcode: updateResult.postcode,
            regionCode1: updateResult.regionCode1,
            regionCode2: updateResult.regionCode2,
          };
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

  // const getNextTourPlaceData = {
  //   [Symbol.asyncIterator]() {
  //     const take = 1000;
  //     let lastId = 1;
  //     let tp: TourPlace[];

  //     return {
  //       async next() {
  //         tp = await prisma.tourPlace.findMany({
  //           where: {
  //             status: 'IN_USE',
  //             OR: [{ roadAddress: { not: null } }, { address: { not: null } }],
  //           },
  //           take,
  //           cursor: {
  //             id: lastId,
  //           },
  //         });

  //         lastId += tp[tp.length - 1].id;

  //         if (isEmpty(tp)) return { done: true, value: tp };
  //         return { done: false, value: tp };
  //       },
  //     };
  //   },
  // };

  // let updatedCnt = 0;
  // /// 한국내 데이터 주소 및 우편번호 표준화
  // // eslint-disable-next-line no-restricted-syntax
  // for await (const tp of getNextTourPlaceData) {
  //   const result = await Promise.all(
  //     // eslint-disable-next-line @typescript-eslint/no-loop-func
  //     tp.map(async v => {
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

function wrapper(func: () => Promise<void>): () => void {
  return () => {
    func().catch(e => console.error(e));
  };
}

tourPlaceAreaCodeAsigner()
  .catch(e => {
    console.error(e);
  })
  .finally(
    wrapper(async () => {
      await prisma.$disconnect();
      process.exit(0);
    }),
  );

export default tourPlaceAreaCodeAsigner;
