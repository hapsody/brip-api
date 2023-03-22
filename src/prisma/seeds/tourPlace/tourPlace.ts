// import batchJob from '../../../timer/dailyBatchJob';

import { PrismaClient, PlaceType, DataStageStatus } from '@prisma/client';
import data from './data.go.kr';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  // type RegionType = keyof typeof data;
  type ValueType = {
    관광지명: string;
    // 관광지구분: string;
    소재지도로명주소?: string;
    소재지지번주소?: string;
    위도: number;
    경도: number;
    // 면적: number;
    공공편익시설정보: string | number;
    // 숙박시설정보?: string | number;
    // 운동및오락시설정보?: string | number;
    // 휴양및문화시설정보?: string | number;
    // 접객시설정보?: string;
    // 지원시설정보?: string;
    // 지정일자?: string;
    // 수용인원수?: number;
    // 주차가능수?: number;
    관광지소개?: string;
    관리기관전화번호?: string;
    // 관리기관명?: string;
    // 데이터기준일자?: string;
  };
  // type DataType = Record<RegionType, ValueType[]>;

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
