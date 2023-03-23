// import batchJob from '../../../timer/dailyBatchJob';

import { PrismaClient, PlaceType, DataStageStatus } from '@prisma/client';
import { ValueType, value as data } from './data.go.kr';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const dataForCreateMany = Object.entries(data).reduce(
    (acc, record) => {
      const [, vList]: [string, ValueType[]] = record;
      const newList = vList.map(v => {
        return prisma.tourPlace.create({
          data: {
            tourPlaceType: 'PUBLICDATAPORTAL_SPOT' as PlaceType,
            status: 'IN_USE' as DataStageStatus,
            title: v.관광지명,
            lat: v.위도,
            lng: v.경도,
            address: v.소재지지번주소 ?? null,
            roadAddress: v.소재지도로명주소 ?? null,
            contact: v.관리기관전화번호 ?? null,
            desc: v.관광지소개 ?? null,
          },
        });
      });
      return [...acc, ...newList];
    },
    // [] as {
    //   tourPlaceType: PlaceType;
    //   status: DataStageStatus;
    //   title: TourPlace['title'];
    //   lat: TourPlace['lat'];
    //   lng: TourPlace['lng'];
    //   address: TourPlace['address'];
    //   roadAddress: TourPlace['roadAddress'];
    //   contact: TourPlace['contact'];
    //   desc: TourPlace['desc'];
    // }[],
    [],
  );

  await Promise.all(dataForCreateMany);

  // await prisma.tourPlace.createMany({
  //   data: dataForCreateMany,
  //   skipDuplicates: true,
  // });
  // await batchJob();
}

export default main;
