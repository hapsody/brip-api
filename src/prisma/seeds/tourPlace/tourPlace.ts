import axios from 'axios';
// import { PrismaClient } from '@prisma/client';

// const prisma = new PrismaClient();

interface AxiosDataType<T> {
  response: {
    body: T;
  };
}

interface ITour4Response<T> {
  items: {
    item: T[];
    numOfRows: number;
    pageNo: number;
    totalCount: number;
  };
}

interface ITour4Item<T> extends AxiosDataType<ITour4Response<T>> {
  response: {
    body: {
      items: {
        item: T[];
        numOfRows: number;
        pageNo: number;
        totalCount: number;
      };
    };
  };
}

// interface ITour4Info {
//   addr1: string;
//   addr2: string;
//   areacode: string;
//   booktour: string;
//   cat1: string;
//   cat2: string;
//   cat3: string;
//   contentid: string;
//   contenttypeid: string;
//   createdtime: string;
//   firstimage: string;
//   firstimage2: string;
//   cpyrhtDivCd: string;
//   mapx: string;
//   mapy: string;
//   mlevel: string;
//   modifiedtime: string;
//   sigungucode: string;
//   tel: string;
//   title: string;
//   zipcode: string;
// }

interface ITour4Category {
  code: string;
  name: string;
  rnum: number;
}

// interface ITour4Response<T extends AxiosDataType>
//   extends AxiosDataType<T> {
//     items: {
//       item: T[];
//       numOfRows: number;
//       pageNo: number;
//       totalCount: number;
//     };
//   }

async function main(): Promise<void> {
  /**
   * 한국관광공사 TourAPI 4.0
   * 국문관광정보 > 지역기반 관광정보 조회
   * https://api.visitkorea.or.kr/#/useKoreaGuide
   */
  const reqToTour4 = async <T>({
    pageNo,
    numOfRows,
  }: {
    pageNo: number;
    numOfRows: number;
  }): Promise<T[]> => {
    type Q = ITour4Item<T>;
    const { data: rawData } = await axios.get<Q>(
      `http://apis.data.go.kr/B551011/KorService1/categoryCode1?serviceKey=${
        process.env.SERVICE_KEY as string
      }&numOfRows=${numOfRows}&pageNo=${pageNo}&MobileOS=ETC&MobileApp=AppTest&_type=json`,
    );
    const { body: data } = rawData.response;
    const { items } = data;
    return items.item;
  };

  /// 전체 서비스분류코드 조회 (0 Depth 조회)
  const tour4CategoryItems = await reqToTour4<ITour4Category>({
    pageNo: 1,
    numOfRows: 100,
  });

  console.log(tour4CategoryItems);

  // {
  //   const pageNo = 1;
  //   const numOfRows = 60000;

  //   const { data: rawData } = await axios.get<ITour4Response<ITour4Item>>(
  //     `https://apis.data.go.kr/B551011/KorService1/areaBasedList1?serviceKey=${
  //       process.env.SERVICE_KEY as string
  //     }&numOfRows=${numOfRows}&pageNo=${pageNo}&MobileOS=ETC&MobileApp=AppTest&_type=json`,
  //   );

  //   const { body: data } = rawData.response;
  //   const { items } = data;
  //   console.log(data);

  //   // await prisma.tourPlace.createMany({
  //   //   data: items.item.map(v => {
  //   //     v.
  //   //     return {
  //   //       tourPlaceType: 'TOUR4_SPOT',
  //   //       title: v.title,
  //   //       lat: v.mapy,
  //   //       lng: v.mapx,
  //   //       roadAddress: v.addr1,
  //   //       // address: v.addr2,
  //   //       // openWeek
  //   //       contact: v.tel,
  //   //       postcode: v.zipcode,
  //   //     };
  //   //   }),
  //   // });
  // }
}

export default main;

// // import batchJob from '../../../timer/dailyBatchJob';

// import { PrismaClient, PlaceType, DataStageStatus } from '@prisma/client';
// // import { ValueType, value as data } from './data.go.kr';

// const prisma = new PrismaClient();

// async function main(): Promise<void> {
//   const dataForCreateMany = Object.entries(data).reduce(
//     (acc, record) => {
//       const [, vList]: [string, ValueType[]] = record;
//       const newList = vList.map(v => {
//         return prisma.tourPlace.create({
//           data: {
//             tourPlaceType: 'PUBLICDATAPORTAL_SPOT' as PlaceType,
//             status: 'IN_USE' as DataStageStatus,
//             title: v.관광지명,
//             lat: v.위도,
//             lng: v.경도,
//             address: v.소재지지번주소 ?? null,
//             roadAddress: v.소재지도로명주소 ?? null,
//             contact: v.관리기관전화번호 ?? null,
//             desc: v.관광지소개 ?? null,
//           },
//         });
//       });
//       return [...acc, ...newList];
//     },
//     // [] as {
//     //   tourPlaceType: PlaceType;
//     //   status: DataStageStatus;
//     //   title: TourPlace['title'];
//     //   lat: TourPlace['lat'];
//     //   lng: TourPlace['lng'];
//     //   address: TourPlace['address'];
//     //   roadAddress: TourPlace['roadAddress'];
//     //   contact: TourPlace['contact'];
//     //   desc: TourPlace['desc'];
//     // }[],
//     [],
//   );

//   await Promise.all(dataForCreateMany);

//   // await prisma.tourPlace.createMany({
//   //   data: dataForCreateMany,
//   //   skipDuplicates: true,
//   // });
//   // await batchJob();
// }

// export default main;
