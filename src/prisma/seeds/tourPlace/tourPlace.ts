import axios from 'axios';
import {
  isNil,
  // isEmpty
} from 'lodash';
import * as dotenv from 'dotenv';
import {
  PrismaClient,
  PlaceType,
  // IBTravelTag
  DataStageStatus,
} from '@prisma/client';
// import { IBTravelTagList, ibTravelTagCategorize } from '@src/utils';

const prisma = new PrismaClient();

dotenv.config();
interface AxiosDataType<T> {
  response: {
    body: T;
  };
}

interface ITour4Response<T> {
  items: {
    item: T[];
  };
  numOfRows: number;
  pageNo: number;
  totalCount: number;
}

interface ITour4Item<T> extends AxiosDataType<ITour4Response<T>> {
  response: {
    body: {
      items: {
        item: T[];
      };
      numOfRows: number;
      pageNo: number;
      totalCount: number;
    };
  };
}

interface ITour4Info {
  addr1: string;
  addr2: string;
  areacode: string;
  booktour: string;
  cat1: string;
  cat2: string;
  cat3: string;
  contentid: string;
  contenttypeid: string;
  createdtime: string;
  firstimage: string;
  firstimage2: string;
  cpyrhtDivCd: string;
  mapx: string;
  mapy: string;
  mlevel: string;
  modifiedtime: string;
  sigungucode: string;
  tel: string;
  title: string;
  zipcode: string;
}

// interface ITour4Category {
//   code: string;
//   name: string;
//   rnum: number;
//   subCategory: ITour4Category[];
// }

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
    apiName,
    pageNo,
    numOfRows,
    cat1,
    cat2,
  }: {
    apiName: string;
    pageNo: string;
    numOfRows: string;
    cat1?: string;
    cat2?: string;
  }): Promise<ITour4Response<T>> => {
    type Q = ITour4Item<T>;
    const { data: rawData } = await axios.get<Q>(
      `http://apis.data.go.kr/B551011/KorService1/${apiName}?serviceKey=${
        process.env.TOUR4_SERVICE_KEY as string
      }&numOfRows=${numOfRows}&pageNo=${pageNo}&MobileOS=ETC&MobileApp=AppTest&_type=json${
        !isNil(cat1) ? `&cat1=${cat1}` : ''
      }${!isNil(cat2) ? `&cat2=${cat2}` : ''}`,
    );
    console.log(
      `http://apis.data.go.kr/B551011/KorService1/${apiName}?serviceKey={serviceKey}&numOfRows=${numOfRows}&pageNo=${pageNo}&MobileOS=ETC&MobileApp=AppTest&_type=json${
        !isNil(cat1) ? `&cat1=${cat1}` : ''
      }${!isNil(cat2) ? `&cat2=${cat2}` : ''}`,
    );
    if (isNil(rawData.response)) {
      console.log('\n');
      console.error({
        apiName,
        pageNo,
        numOfRows,
        cat1,
      });
      console.error(JSON.stringify(rawData, null, 2));
    }
    const { body: data } = rawData.response;
    // const { items } = data;
    // return items.item;
    return data;
  };

  try {
    // /// 전체 서비스분류코드 조회 (0 Depth 조회)
    // const tour4RootClassCategories = await reqToTour4<ITour4Category>({
    //   apiName: 'categoryCode1',
    //   pageNo: '1',
    //   numOfRows: '100',
    // });
    //
    // console.log(tour4RootClassCategories);
    // /// 전체 서비스분류코드 조회 (1 Depth 조회)
    // const tour4FirstClassCategories = await Promise.all(
    //   tour4RootClassCategories.map(v => {
    //     return reqToTour4<ITour4Category>({
    //       apiName: 'categoryCode1',
    //       pageNo: '1',
    //       numOfRows: '100',
    //       cat1: v.code,
    //     });
    //   }),
    // );
    //
    // const totalCategory = await Promise.all(
    //   tour4RootClassCategories.map(async (v, index) => {
    //     return {
    //       ...v,
    //       /// 전체 서비스분류코드 조회 (1 Depth 조회)
    //       subCategory: await Promise.all(
    //         tour4FirstClassCategories[index].map(async v2 => {
    //           return {
    //             ...v2,
    //             subCategory: await reqToTour4<ITour4Category>({
    //               apiName: 'categoryCode1',
    //               pageNo: '1',
    //               numOfRows: '100',
    //               cat1: v2.code.substring(0, 3),
    //               cat2: v2.code,
    //             }),
    //           };
    //         }),
    //       ),
    //     };
    //   }),
    // );
    // console.log(JSON.stringify(totalCategory, null, 2));
    // console.log(totalCategory);
    // console.log(
    //   `Total Category Count: ${totalCategory.reduce((acc, cur) => {
    //     const firstClassLength = cur.subCategory.reduce((acc2, cur2) => {
    //       const secondClassLength = cur2.subCategory.length;
    //       return acc + secondClassLength;
    //     }, 0);
    //     return acc + firstClassLength;
    //   }, 0)}`,
    // );

    // /// 1. 관광지 데이터 처리 (asyncIterator식 / tourAPI 4.0 page 별 N번 호출식)
    // const asyncIterable = {
    //   [Symbol.asyncIterator]() {
    //     const inputNumOfRows = 20;
    //     let inputPageNo = 76;
    //     return {
    //       async next() {
    //         const { items, numOfRows, pageNo, totalCount } =
    //           await reqToTour4<ITour4Info>({
    //             apiName: 'areaBasedList1',
    //             pageNo: inputPageNo.toString(),
    //             numOfRows: inputNumOfRows.toString(),
    //           });

    //         if (numOfRows * pageNo < totalCount) {
    //           /// keep doing
    //           inputPageNo += 1;
    //           return {
    //             value: items.item,
    //             done: false,
    //           };
    //         }
    //         return { value: items.item, done: true };
    //       },
    //     };
    //   },
    // };

    // // eslint-disable-next-line no-restricted-syntax
    // for await (const tour4InfoItems of asyncIterable) {
    //   await Promise.all(
    //     tour4InfoItems.map(v => {
    //       const tourPlaceType = (() => {
    //         switch (v.cat1) {
    //           case 'A05': /// 음식
    //             return 'TOUR4_RESTAURANT';
    //           case 'B02': /// 숙박
    //             return null;
    //           default:
    //             return 'TOUR4_SPOT';
    //         }
    //       })();
    //       const ibTTTypePath = (() => {
    //         switch (v.cat1) {
    //           case 'A01': /// 자연
    //             switch (v.cat2) {
    //               case 'A0101': /// 자연관광지
    //                 switch (v.cat3) {
    //                   case 'A01010100': /// 국립공원
    //                   case 'A01010200': /// 도립공원
    //                   case 'A01010300': /// 군립공원
    //                     return ['naturalSpot>nationalPark'];

    //                   case 'A01010400': /// 산
    //                     return ['naturalSpot>mountain'];
    //                   case 'A01010500': /// 자연생태관광지
    //                   case 'A01011000': /// 약수터
    //                   case 'A01016000': /// 등대
    //                     return ['naturalSpot>etc'];
    //                   case 'A01010600': /// 자연휴양림
    //                     return ['naturalSpot>forest'];
    //                   case 'A01010700': /// 수목원
    //                     return ['naturalSpot>arboreteum'];
    //                   case 'A01010800': /// 폭포
    //                   case 'A01010900': /// 계곡
    //                     return ['naturalSpot>valley'];
    //                   case 'A01011100': /// 해안절경
    //                   case 'A01011400': /// 항구/포구
    //                     return ['naturalSpot>ocean'];
    //                   case 'A01011200': /// 해수욕장
    //                     return ['oceanActivity>beach'];
    //                   case 'A01011300': /// 섬
    //                     return ['naturalSpot>island'];
    //                   case 'A01011700': /// 호수
    //                     return ['naturalSpot>lake'];
    //                   case 'A01011800': /// 강
    //                     return ['naturalSpot>river'];
    //                   case 'A01011900': /// 동굴
    //                     return ['naturalSpot>cave'];

    //                   default:
    //                     return ['naturalSpot>etc'];
    //                 }
    //                 break;

    //               case 'A0102': /// 관광자원
    //                 switch (v.cat3) {
    //                   case 'A01020100': /// 희귀동.식물
    //                     return ['naturalSpot>biome'];
    //                   case 'A01020200': /// 기암괴석
    //                     return ['naturalSpot>rocks'];
    //                   default:
    //                     return ['naturalSpot>etc'];
    //                 }

    //               default:
    //                 return ['naturalSpot>etc'];
    //             }
    //           case 'A02': /// 인문(문화/예술/역사)
    //             switch (v.cat2) {
    //               case 'A0201': /// 역사관광지
    //                 switch (v.cat3) {
    //                   case 'A02010800': /// 사찰
    //                     return ['culturalSpot>temple'];
    //                   case 'A02010100': /// 고궁
    //                   case 'A02010200': /// 성
    //                   case 'A02010300': /// 문
    //                   case 'A02010400': /// 고택
    //                   case 'A02010500': /// 생가
    //                   case 'A02010600': /// 민속마을
    //                   case 'A02010700': /// 유적지/사적지
    //                   case 'A02010900': /// 종교성지
    //                   case 'A02011000': /// 안보관광
    //                   default:
    //                     return ['historicalSpot'];
    //                 }
    //               case 'A0202': /// 휴양관광지
    //                 switch (v.cat3) {
    //                   case 'A02020200': /// 관광단지
    //                     return ['recreation>tourComplex'];
    //                   case 'A02020300': /// 온천/욕장/스파
    //                   case 'A02020400': /// 이색찜질방
    //                     return ['recreation>sauna'];
    //                   case 'A02020500': /// 헬스투어
    //                     return ['recreation>etc'];
    //                   case 'A02020600': /// 테마공원
    //                     return ['recreation>themePark'];
    //                   case 'A02020700': /// 공원
    //                     return ['naturalSpot>park'];
    //                   case 'A02020800':
    //                   default:
    //                     return ['recreation>etc'];
    //                 }
    //               case 'A0203': /// 체험관광지
    //                 switch (v.cat3) {
    //                   case 'A02030100': /// 농.산.어촌 체험
    //                     return ['landActivity>farm', 'activity>etc'];
    //                   case 'A02030200': /// 전통체험
    //                     return ['activity>traditional'];
    //                   case 'A02030300': /// 산사체험
    //                   case 'A02030400': /// 이색체험
    //                   case 'A02030600': /// 이색거리
    //                   default:
    //                     return ['activity>etc'];
    //                 }
    //               case 'A0204': /// 산업관광지 > 발전소, 식음료, 기타, 전자-반도체, 자동차
    //                 return ['industrialComplex>etc'];
    //               case 'A0205': /// 건축/조형물 > 다리/대교, 기념탑/기념비/전망대, 분수, 동상, 터널, 유명건물
    //                 return ['culturalSpot>buildingAndStructure'];
    //               case 'A0206': /// 문화시설
    //                 switch (v.cat3) {
    //                   case 'A02060100': /// 박물관
    //                   case 'A02060200': /// 기념관
    //                   case 'A02060500': /// 미술관/화랑
    //                     return ['museum'];
    //                   case 'A02060300': /// 전시관
    //                   case 'A02060400': /// 컨벤션센터
    //                     return ['convention'];
    //                   case 'A02060600': /// 공연장
    //                   case 'A02060700': /// 문화원
    //                   case 'A02060800': /// 외국문화원
    //                   case 'A02060900': /// 도서관
    //                   case 'A02061000': /// 대형서점
    //                   case 'A02061100': /// 문화전수시설
    //                   case 'A02061200': /// 영화관
    //                   case 'A02061300': /// 어학당
    //                   case 'A02061400': /// 학교
    //                     return ['culturalSpot>etc'];
    //                   default:
    //                     return ['culturalSpot>etc'];
    //                 }
    //               case 'A0207': /// 축제 > 문화관광축제, 일반축제
    //                 return ['culturalSpot>festival'];
    //               case 'A0208': /// 공연/행사 > 전통공연, 연극, 뮤지컬, 오페라, 전시회, 박람회, 무용, 클래식음악회, 대중콘서트, 영화, 스포츠경기, 기타행사
    //                 return ['landActivity>ticket'];
    //               default:
    //                 return ['culturalSpot>etc'];
    //             }
    //           case 'A03': /// 레포츠
    //             switch (v.cat2) {
    //               case 'A0301': /// 레포츠소개
    //                 switch (v.cat3) {
    //                   case 'A03010200': /// 수상레포츠
    //                     return ['oceanActivity>etc'];
    //                   case 'A03010300': /// 항공레포츠
    //                     return ['landActivity>etc'];
    //                   default:
    //                     return [''];
    //                 }
    //               case 'A0302': /// 육상레포츠
    //                 switch (v.cat3) {
    //                   case 'A03020600': /// 카트
    //                     return ['landActivity>cartRacing'];
    //                   case 'A03020700': /// 골프
    //                     return ['landActivity>golf'];
    //                   case 'A03021100': /// 승마
    //                     return ['landActivity>horseRiding'];
    //                   case 'A03021200': /// 스키/스노보드
    //                     return [
    //                       'mountainActivity>ski',
    //                       'mountainActivity>snowBoard',
    //                     ];
    //                   case 'A03021800': /// 암벽등반
    //                     return ['mountainActivity>rockClimbing'];
    //                   case 'A03022100': /// ATV
    //                     return ['landActivity>ATV'];
    //                   case 'A03022200': /// MTB
    //                     return ['mountainActivity>MTB'];
    //                   case 'A03022600': /// 스키(보드) 렌탈샵
    //                     return ['landActivity>etc', 'shopping'];
    //                   case 'A03022700': /// 트래킹
    //                     return [
    //                       'mountainActivity>groupHiking',
    //                       'naturalSpot>circumferenceTrail',
    //                     ];
    //                   case 'A03020200': /// 수련시설
    //                   case 'A03020300': /// 경기장
    //                   case 'A03020400': /// 인라인(실내 인라인 포함)
    //                   case 'A03020500': /// 자전거하이킹
    //                   case 'A03020800': /// 경마
    //                   case 'A03020900': /// 경륜
    //                   case 'A03021000': /// 카지노
    //                   case 'A03021400': /// 썰매장
    //                   case 'A03021500': /// 수렵장
    //                   case 'A03021600': /// 사격장
    //                   case 'A03021700': /// 야영장,오토캠핑장
    //                   case 'A03022000': /// 서바이벌게임
    //                   case 'A03022300': /// 오프로드
    //                   case 'A03022400': /// 번지점프
    //                   default:
    //                     return ['landActivity>etc'];
    //                 }
    //               case 'A0303': /// 수상레포츠
    //                 switch (v.cat3) {
    //                   case 'A03030100': /// 윈드서핑/제트스키
    //                     return [
    //                       'oceanActivity>jetBoat',
    //                       'oceanActivity>surfing',
    //                       'oceanActivity>paddleBoard',
    //                     ];
    //                   case 'A03030200': /// 카약/카누
    //                     return ['oceanActivity>kayak'];
    //                   case 'A03030300': /// 요트
    //                     return ['oceanActivity>sailing'];
    //                   case 'A03030400': /// 스노쿨링/스킨스쿠버다이빙
    //                     return ['oceanActivity>snorkeling'];
    //                   case 'A03030500': /// 민물낚시
    //                   case 'A03030600': /// 민물낚시
    //                     return ['oceanActivity>fishing'];
    //                   case 'A03030700': /// 수영
    //                   case 'A03030800': /// 래프팅
    //                   default:
    //                     return ['oceanActivity>etc'];
    //                 }
    //               case 'A0304': /// 항공 레포츠
    //                 switch (v.cat3) {
    //                   case 'A03040300': /// 행글라이딩/패러글라이딩
    //                     return ['mountainActivity>paragliding'];
    //                   case 'A03040100': /// 스카이다이빙
    //                   case 'A03040200': /// 초경량비행
    //                   case 'A03040400': /// 열기구
    //                   default:
    //                     return ['landActivity>etc'];
    //                 }
    //               case 'A0305': /// 복합 레포츠 > 복합 레포츠
    //                 return ['landActivity>etc'];
    //               default:
    //                 return [''];
    //             }
    //           case 'A04': /// 쇼핑 > 쇼핑
    //             return ['shopping'];
    //           case 'A05': /// 음식
    //             switch (v.cat2) {
    //               case 'A0502': /// 음식점
    //                 switch (v.cat3) {
    //                   case 'A05020100': /// 한식
    //                     return ['food>dining>korean'];
    //                   case 'A05020200': /// 서양식
    //                     return ['food>dining>western'];
    //                   case 'A05020300': /// 일식
    //                     return ['food>dining>japanese'];
    //                   case 'A05020400': /// 중식
    //                     return ['food>dining>chinese'];
    //                   case 'A05020900': /// 카페/전통찻집
    //                     return ['food>beverage>cafe'];
    //                   case 'A05021000': /// 클럽
    //                     return ['food>beverage>club'];
    //                   case 'A05020700': /// 이색음식점
    //                   default:
    //                     return ['food>dining>etc'];
    //                 }
    //               default:
    //                 return ['food>dining>etc'];
    //             }
    //           case 'B02': /// 숙박
    //             return ['lodging'];
    //           case 'C01': /// 추천코스
    //             switch (v.cat3) {
    //               case 'C0112': /// 가족코스
    //               case 'C0113': /// 나홀로코스
    //               case 'C0114': /// 힐링코스
    //               case 'C0115': /// 도보코스
    //               case 'C0116': /// 캠핑코스
    //               case 'C0117': /// 맛코스
    //               default:
    //                 return null;
    //             }

    //           default:
    //             return null;
    //         }
    //       })();

    //       if (!isNil(ibTTTypePath) && !isNil(tourPlaceType)) {
    //         const createResult = prisma.$transaction(async tx => {
    //           const alreadyInUse = await tx.tourPlace.findFirst({
    //             where: {
    //               tourPlaceType: 'TOUR4_SPOT' as PlaceType,
    //               status: 'IN_USE',
    //             },
    //           });

    //           if (!isNil(alreadyInUse)) {
    //             await tx.tourPlace.update({
    //               where: {
    //                 id: alreadyInUse.id,
    //               },
    //               data: {
    //                 status: 'ARCHIVED',
    //               },
    //             });
    //           }

    //           if (
    //             isNil(v) ||
    //             isNil(v.title) ||
    //             isNil(v.mapy) ||
    //             isNil(v.mapx) ||
    //             isNil(v.addr1) ||
    //             isNil(v.tel) ||
    //             isNil(v.zipcode) ||
    //             isNil(v.firstimage) ||
    //             isNil(v.firstimage2) ||
    //             isNil(tourPlaceType) ||
    //             isNil(ibTTTypePath) ||
    //             isEmpty(ibTTTypePath)
    //           ) {
    //             console.log(tourPlaceType);
    //             console.log(ibTTTypePath);
    //             console.log(v);
    //           }

    //           return tx.tourPlace.create({
    //             data: {
    //               tourPlaceType: tourPlaceType as PlaceType,
    //               status: 'NEW',
    //               ibTravelTag: {
    //                 connect: ibTTTypePath.map(k => {
    //                   const leafTag = k.split('>').pop();
    //                   return {
    //                     value: leafTag,
    //                   };
    //                 }),
    //               },
    //               title: v.title,
    //               lat: Number(v.mapy),
    //               lng: Number(v.mapx),
    //               roadAddress: v.addr1,
    //               // address: v.addr2,
    //               // openWeek
    //               contact: v.tel,
    //               postcode: v.zipcode,
    //               photos: {
    //                 createMany: {
    //                   data: [
    //                     {
    //                       url: v.firstimage,
    //                     },
    //                     {
    //                       url: v.firstimage2,
    //                     },
    //                   ],
    //                 },
    //               },
    //             },
    //             select: {
    //               id: true,
    //               title: true,
    //               tourPlaceType: true,
    //               status: true,
    //               ibTravelTag: {
    //                 select: {
    //                   id: true,
    //                   value: true,
    //                 },
    //               },
    //               lat: true,
    //               lng: true,
    //               roadAddress: true,
    //               address: true,
    //               openWeek: true,
    //               contact: true,
    //               postcode: true,
    //               photos: {
    //                 select: {
    //                   id: true,
    //                   url: true,
    //                 },
    //               },
    //             },
    //           });
    //         });
    //         createResult.catch(error => {
    //           console.error(error);
    //           console.log(tourPlaceType);
    //           console.log(ibTTTypePath);
    //           console.log(v);
    //           console.error('prisma error but keep going!');
    //           throw error;
    //           // return null;
    //         });
    //         console.log(createResult);
    //         return createResult;
    //       }

    //       return null;
    //     }),
    //   );
    // }

    // /// 2. 관광지 데이터 처리 (iterator식 / tourAPI 4.0 1번 호출 후 데이터를 N 개씩 끊어서 M번 db insert)
    // const {
    //   items: { item: tour4InfoItems },
    // } = await reqToTour4<ITour4Info>({
    //   apiName: 'areaBasedList1',
    //   pageNo: '1',
    //   numOfRows: '60000',
    // });

    // const dataForCreate = tour4InfoItems.reduce((acc, v) => {
    //   const tourPlaceType = (() => {
    //     switch (v.cat1) {
    //       case 'A05': /// 음식
    //         return 'TOUR4_RESTAURANT';
    //       case 'B02': /// 숙박
    //         return null;
    //       default:
    //         return 'TOUR4_SPOT';
    //     }
    //   })();
    //   const ibTTTypePath = (() => {
    //     switch (v.cat1) {
    //       case 'A01': /// 자연
    //         switch (v.cat2) {
    //           case 'A0101': /// 자연관광지
    //             switch (v.cat3) {
    //               case 'A01010100': /// 국립공원
    //               case 'A01010200': /// 도립공원
    //               case 'A01010300': /// 군립공원
    //                 return ['naturalSpot>nationalPark'];

    //               case 'A01010400': /// 산
    //                 return ['naturalSpot>mountain'];
    //               case 'A01010500': /// 자연생태관광지
    //               case 'A01011000': /// 약수터
    //               case 'A01016000': /// 등대
    //                 return ['naturalSpot>etc'];
    //               case 'A01010600': /// 자연휴양림
    //                 return ['naturalSpot>forest'];
    //               case 'A01010700': /// 수목원
    //                 return ['naturalSpot>arboreteum'];
    //               case 'A01010800': /// 폭포
    //               case 'A01010900': /// 계곡
    //                 return ['naturalSpot>valley'];
    //               case 'A01011100': /// 해안절경
    //               case 'A01011400': /// 항구/포구
    //                 return ['naturalSpot>ocean'];
    //               case 'A01011200': /// 해수욕장
    //                 return ['oceanActivity>beach'];
    //               case 'A01011300': /// 섬
    //                 return ['naturalSpot>island'];
    //               case 'A01011700': /// 호수
    //                 return ['naturalSpot>lake'];
    //               case 'A01011800': /// 강
    //                 return ['naturalSpot>river'];
    //               case 'A01011900': /// 동굴
    //                 return ['naturalSpot>cave'];

    //               default:
    //                 return ['naturalSpot>etc'];
    //             }
    //             break;

    //           case 'A0102': /// 관광자원
    //             switch (v.cat3) {
    //               case 'A01020100': /// 희귀동.식물
    //                 return ['naturalSpot>biome'];
    //               case 'A01020200': /// 기암괴석
    //                 return ['naturalSpot>rocks'];
    //               default:
    //                 return ['naturalSpot>etc'];
    //             }

    //           default:
    //             return ['naturalSpot>etc'];
    //         }
    //       case 'A02': /// 인문(문화/예술/역사)
    //         switch (v.cat2) {
    //           case 'A0201': /// 역사관광지
    //             switch (v.cat3) {
    //               case 'A02010800': /// 사찰
    //                 return ['culturalSpot>temple'];
    //               case 'A02010100': /// 고궁
    //               case 'A02010200': /// 성
    //               case 'A02010300': /// 문
    //               case 'A02010400': /// 고택
    //               case 'A02010500': /// 생가
    //               case 'A02010600': /// 민속마을
    //               case 'A02010700': /// 유적지/사적지
    //               case 'A02010900': /// 종교성지
    //               case 'A02011000': /// 안보관광
    //               default:
    //                 return ['historicalSpot'];
    //             }
    //           case 'A0202': /// 휴양관광지
    //             switch (v.cat3) {
    //               case 'A02020200': /// 관광단지
    //                 return ['recreation>tourComplex'];
    //               case 'A02020300': /// 온천/욕장/스파
    //               case 'A02020400': /// 이색찜질방
    //                 return ['recreation>sauna'];
    //               case 'A02020500': /// 헬스투어
    //                 return ['recreation>etc'];
    //               case 'A02020600': /// 테마공원
    //                 return ['recreation>themePark'];
    //               case 'A02020700': /// 공원
    //                 return ['naturalSpot>park'];
    //               case 'A02020800':
    //               default:
    //                 return ['recreation>etc'];
    //             }
    //           case 'A0203': /// 체험관광지
    //             switch (v.cat3) {
    //               case 'A02030100': /// 농.산.어촌 체험
    //                 return ['landActivity>farm', 'activity>etc'];
    //               case 'A02030200': /// 전통체험
    //                 return ['activity>traditional'];
    //               case 'A02030300': /// 산사체험
    //               case 'A02030400': /// 이색체험
    //               case 'A02030600': /// 이색거리
    //               default:
    //                 return ['activity>etc'];
    //             }
    //           case 'A0204': /// 산업관광지 > 발전소, 식음료, 기타, 전자-반도체, 자동차
    //             return ['industrialComplex>etc'];
    //           case 'A0205': /// 건축/조형물 > 다리/대교, 기념탑/기념비/전망대, 분수, 동상, 터널, 유명건물
    //             return ['culturalSpot>buildingAndStructure'];
    //           case 'A0206': /// 문화시설
    //             switch (v.cat3) {
    //               case 'A02060100': /// 박물관
    //               case 'A02060200': /// 기념관
    //               case 'A02060500': /// 미술관/화랑
    //                 return ['museum'];
    //               case 'A02060300': /// 전시관
    //               case 'A02060400': /// 컨벤션센터
    //                 return ['convention'];
    //               case 'A02060600': /// 공연장
    //               case 'A02060700': /// 문화원
    //               case 'A02060800': /// 외국문화원
    //               case 'A02060900': /// 도서관
    //               case 'A02061000': /// 대형서점
    //               case 'A02061100': /// 문화전수시설
    //               case 'A02061200': /// 영화관
    //               case 'A02061300': /// 어학당
    //               case 'A02061400': /// 학교
    //                 return ['culturalSpot>etc'];
    //               default:
    //                 return ['culturalSpot>etc'];
    //             }
    //           case 'A0207': /// 축제 > 문화관광축제, 일반축제
    //             return ['culturalSpot>festival'];
    //           case 'A0208': /// 공연/행사 > 전통공연, 연극, 뮤지컬, 오페라, 전시회, 박람회, 무용, 클래식음악회, 대중콘서트, 영화, 스포츠경기, 기타행사
    //             return ['landActivity>ticket'];
    //           default:
    //             return ['culturalSpot>etc'];
    //         }
    //       case 'A03': /// 레포츠
    //         switch (v.cat2) {
    //           case 'A0301': /// 레포츠소개
    //             switch (v.cat3) {
    //               case 'A03010200': /// 수상레포츠
    //                 return ['oceanActivity>etc'];
    //               case 'A03010300': /// 항공레포츠
    //                 return ['landActivity>etc'];
    //               default:
    //                 return [''];
    //             }
    //           case 'A0302': /// 육상레포츠
    //             switch (v.cat3) {
    //               case 'A03020600': /// 카트
    //                 return ['landActivity>cartRacing'];
    //               case 'A03020700': /// 골프
    //                 return ['landActivity>golf'];
    //               case 'A03021100': /// 승마
    //                 return ['landActivity>horseRiding'];
    //               case 'A03021200': /// 스키/스노보드
    //                 return [
    //                   'mountainActivity>ski',
    //                   'mountainActivity>snowBoard',
    //                 ];
    //               case 'A03021800': /// 암벽등반
    //                 return ['mountainActivity>rockClimbing'];
    //               case 'A03022100': /// ATV
    //                 return ['landActivity>ATV'];
    //               case 'A03022200': /// MTB
    //                 return ['mountainActivity>MTB'];
    //               case 'A03022600': /// 스키(보드) 렌탈샵
    //                 return ['landActivity>etc', 'shopping'];
    //               case 'A03022700': /// 트래킹
    //                 return [
    //                   'mountainActivity>groupHiking',
    //                   'naturalSpot>circumferenceTrail',
    //                 ];
    //               case 'A03020200': /// 수련시설
    //               case 'A03020300': /// 경기장
    //               case 'A03020400': /// 인라인(실내 인라인 포함)
    //               case 'A03020500': /// 자전거하이킹
    //               case 'A03020800': /// 경마
    //               case 'A03020900': /// 경륜
    //               case 'A03021000': /// 카지노
    //               case 'A03021400': /// 썰매장
    //               case 'A03021500': /// 수렵장
    //               case 'A03021600': /// 사격장
    //               case 'A03021700': /// 야영장,오토캠핑장
    //               case 'A03022000': /// 서바이벌게임
    //               case 'A03022300': /// 오프로드
    //               case 'A03022400': /// 번지점프
    //               default:
    //                 return ['landActivity>etc'];
    //             }
    //           case 'A0303': /// 수상레포츠
    //             switch (v.cat3) {
    //               case 'A03030100': /// 윈드서핑/제트스키
    //                 return [
    //                   'oceanActivity>jetBoat',
    //                   'oceanActivity>surfing',
    //                   'oceanActivity>paddleBoard',
    //                 ];
    //               case 'A03030200': /// 카약/카누
    //                 return ['oceanActivity>kayak'];
    //               case 'A03030300': /// 요트
    //                 return ['oceanActivity>sailing'];
    //               case 'A03030400': /// 스노쿨링/스킨스쿠버다이빙
    //                 return ['oceanActivity>snorkeling'];
    //               case 'A03030500': /// 민물낚시
    //               case 'A03030600': /// 민물낚시
    //                 return ['oceanActivity>fishing'];
    //               case 'A03030700': /// 수영
    //               case 'A03030800': /// 래프팅
    //               default:
    //                 return ['oceanActivity>etc'];
    //             }
    //           case 'A0304': /// 항공 레포츠
    //             switch (v.cat3) {
    //               case 'A03040300': /// 행글라이딩/패러글라이딩
    //                 return ['mountainActivity>paragliding'];
    //               case 'A03040100': /// 스카이다이빙
    //               case 'A03040200': /// 초경량비행
    //               case 'A03040400': /// 열기구
    //               default:
    //                 return ['landActivity>etc'];
    //             }
    //           case 'A0305': /// 복합 레포츠 > 복합 레포츠
    //             return ['landActivity>etc'];
    //           default:
    //             return [''];
    //         }
    //       case 'A04': /// 쇼핑 > 쇼핑
    //         return ['shopping'];
    //       case 'A05': /// 음식
    //         switch (v.cat2) {
    //           case 'A0502': /// 음식점
    //             switch (v.cat3) {
    //               case 'A05020100': /// 한식
    //                 return ['food>dining>korean'];
    //               case 'A05020200': /// 서양식
    //                 return ['food>dining>western'];
    //               case 'A05020300': /// 일식
    //                 return ['food>dining>japanese'];
    //               case 'A05020400': /// 중식
    //                 return ['food>dining>chinese'];
    //               case 'A05020900': /// 카페/전통찻집
    //                 return ['food>beverage>cafe'];
    //               case 'A05021000': /// 클럽
    //                 return ['food>beverage>club'];
    //               case 'A05020700': /// 이색음식점
    //               default:
    //                 return ['food>dining>etc'];
    //             }
    //           default:
    //             return ['food>dining>etc'];
    //         }
    //       case 'B02': /// 숙박
    //         return ['lodging'];
    //       case 'C01': /// 추천코스
    //         switch (v.cat3) {
    //           case 'C0112': /// 가족코스
    //           case 'C0113': /// 나홀로코스
    //           case 'C0114': /// 힐링코스
    //           case 'C0115': /// 도보코스
    //           case 'C0116': /// 캠핑코스
    //           case 'C0117': /// 맛코스
    //           default:
    //             return null;
    //         }

    //       default:
    //         return null;
    //     }
    //   })();
    //   if (!isNil(ibTTTypePath) && !isNil(tourPlaceType)) {
    //     return [
    //       ...acc,
    //       {
    //         tourPlaceType: tourPlaceType as PlaceType,
    //         status: 'NEW' as DataStageStatus,
    //         ibTravelTag: {
    //           connect: ibTTTypePath.map(k => {
    //             const leafTag = k.split('>').pop();
    //             return {
    //               value: leafTag,
    //             };
    //           }),
    //         },
    //         title: v.title,
    //         lat: Number(v.mapy),
    //         lng: Number(v.mapx),
    //         roadAddress: v.addr1,
    //         // address: v.addr2,
    //         // openWeek
    //         contact: v.tel,
    //         postcode: v.zipcode,
    //         photos: {
    //           createMany: {
    //             data: [
    //               {
    //                 url: v.firstimage,
    //               },
    //               {
    //                 url: v.firstimage2,
    //               },
    //             ],
    //           },
    //         },
    //       },
    //     ];
    //   }
    //   return acc;
    // }, []);

    // const prismaCreateIterable = {
    //   [Symbol.iterator]() {
    //     const chunkSize = 1000;
    //     let cursor = 0;
    //     return {
    //       next() {
    //         if (cursor >= dataForCreate.length) {
    //           return { done: true };
    //         }

    //         let nextCursor = cursor + chunkSize;
    //         nextCursor =
    //           nextCursor > dataForCreate.length - 1
    //             ? dataForCreate.length - 1
    //             : nextCursor;
    //         const value = dataForCreate.splice(cursor, nextCursor);
    //         cursor = nextCursor;

    //         return { value, done: false };
    //       },
    //     };
    //   },
    // };

    // // eslint-disable-next-line no-restricted-syntax
    // for await (const buffer of prismaCreateIterable) {
    //   if (!isNil(buffer)) {
    //     const createResult = await prisma.$transaction(async tx => {
    //       await tx.tourPlace.updateMany({
    //         where: {
    //           tourPlaceType: {
    //             in: ['TOUR4_RESTAURANT', 'TOUR4_SPOT'],
    //           },
    //           title: {
    //             in: buffer.map(v => v.title),
    //           },
    //           status: 'IN_USE',
    //         },
    //         data: {
    //           status: 'ARCHIVED',
    //         },
    //       });

    //       const result = await tx.tourPlace.createMany({
    //         data: buffer,
    //       });
    //       return result;
    //     });
    //     console.log(createResult.count);
    //   } else {
    //     console.error('buffer is null');
    //   }
    // }

    /// 3. 관광지 데이터 처리 (tourAPI 1번 호출 후 동기식 처리)
    const {
      items: { item: tour4InfoItems },
    } = await reqToTour4<ITour4Info>({
      apiName: 'areaBasedList1',
      pageNo: '1',
      numOfRows: '60000',
    });

    const dataForCreate = tour4InfoItems.reduce((acc, v) => {
      const tourPlaceType = (() => {
        switch (v.cat1) {
          case 'A05': /// 음식
            return 'TOUR4_RESTAURANT';
          case 'B02': /// 숙박
            return null;
          default:
            return 'TOUR4_SPOT';
        }
      })();
      const ibTTTypePath = (() => {
        switch (v.cat1) {
          case 'A01': /// 자연
            switch (v.cat2) {
              case 'A0101': /// 자연관광지
                switch (v.cat3) {
                  case 'A01010100': /// 국립공원
                  case 'A01010200': /// 도립공원
                  case 'A01010300': /// 군립공원
                    return ['naturalSpot>nationalPark'];

                  case 'A01010400': /// 산
                    return ['naturalSpot>mountain'];
                  case 'A01010500': /// 자연생태관광지
                  case 'A01011000': /// 약수터
                  case 'A01016000': /// 등대
                    return ['naturalSpot>etc'];
                  case 'A01010600': /// 자연휴양림
                    return ['naturalSpot>forest'];
                  case 'A01010700': /// 수목원
                    return ['naturalSpot>arboreteum'];
                  case 'A01010800': /// 폭포
                  case 'A01010900': /// 계곡
                    return ['naturalSpot>valley'];
                  case 'A01011100': /// 해안절경
                  case 'A01011400': /// 항구/포구
                    return ['naturalSpot>ocean'];
                  case 'A01011200': /// 해수욕장
                    return ['oceanActivity>beach'];
                  case 'A01011300': /// 섬
                    return ['naturalSpot>island'];
                  case 'A01011700': /// 호수
                    return ['naturalSpot>lake'];
                  case 'A01011800': /// 강
                    return ['naturalSpot>river'];
                  case 'A01011900': /// 동굴
                    return ['naturalSpot>cave'];

                  default:
                    return ['naturalSpot>etc'];
                }
                break;

              case 'A0102': /// 관광자원
                switch (v.cat3) {
                  case 'A01020100': /// 희귀동.식물
                    return ['naturalSpot>biome'];
                  case 'A01020200': /// 기암괴석
                    return ['naturalSpot>rocks'];
                  default:
                    return ['naturalSpot>etc'];
                }

              default:
                return ['naturalSpot>etc'];
            }
          case 'A02': /// 인문(문화/예술/역사)
            switch (v.cat2) {
              case 'A0201': /// 역사관광지
                switch (v.cat3) {
                  case 'A02010800': /// 사찰
                    return ['culturalSpot>temple'];
                  case 'A02010100': /// 고궁
                  case 'A02010200': /// 성
                  case 'A02010300': /// 문
                  case 'A02010400': /// 고택
                  case 'A02010500': /// 생가
                  case 'A02010600': /// 민속마을
                  case 'A02010700': /// 유적지/사적지
                  case 'A02010900': /// 종교성지
                  case 'A02011000': /// 안보관광
                  default:
                    return ['historicalSpot'];
                }
              case 'A0202': /// 휴양관광지
                switch (v.cat3) {
                  case 'A02020200': /// 관광단지
                    return ['recreation>tourComplex'];
                  case 'A02020300': /// 온천/욕장/스파
                  case 'A02020400': /// 이색찜질방
                    return ['recreation>sauna'];
                  case 'A02020500': /// 헬스투어
                    return ['recreation>etc'];
                  case 'A02020600': /// 테마공원
                    return ['recreation>themePark'];
                  case 'A02020700': /// 공원
                    return ['naturalSpot>park'];
                  case 'A02020800':
                  default:
                    return ['recreation>etc'];
                }
              case 'A0203': /// 체험관광지
                switch (v.cat3) {
                  case 'A02030100': /// 농.산.어촌 체험
                    return ['landActivity>farm', 'activity>etc'];
                  case 'A02030200': /// 전통체험
                    return ['activity>traditional'];
                  case 'A02030300': /// 산사체험
                  case 'A02030400': /// 이색체험
                  case 'A02030600': /// 이색거리
                  default:
                    return ['activity>etc'];
                }
              case 'A0204': /// 산업관광지 > 발전소, 식음료, 기타, 전자-반도체, 자동차
                return ['industrialComplex>etc'];
              case 'A0205': /// 건축/조형물 > 다리/대교, 기념탑/기념비/전망대, 분수, 동상, 터널, 유명건물
                return ['culturalSpot>buildingAndStructure'];
              case 'A0206': /// 문화시설
                switch (v.cat3) {
                  case 'A02060100': /// 박물관
                  case 'A02060200': /// 기념관
                  case 'A02060500': /// 미술관/화랑
                    return ['museum'];
                  case 'A02060300': /// 전시관
                  case 'A02060400': /// 컨벤션센터
                    return ['convention'];
                  case 'A02060600': /// 공연장
                  case 'A02060700': /// 문화원
                  case 'A02060800': /// 외국문화원
                  case 'A02060900': /// 도서관
                  case 'A02061000': /// 대형서점
                  case 'A02061100': /// 문화전수시설
                  case 'A02061200': /// 영화관
                  case 'A02061300': /// 어학당
                  case 'A02061400': /// 학교
                    return ['culturalSpot>etc'];
                  default:
                    return ['culturalSpot>etc'];
                }
              case 'A0207': /// 축제 > 문화관광축제, 일반축제
                return ['culturalSpot>festival'];
              case 'A0208': /// 공연/행사 > 전통공연, 연극, 뮤지컬, 오페라, 전시회, 박람회, 무용, 클래식음악회, 대중콘서트, 영화, 스포츠경기, 기타행사
                return ['landActivity>ticket'];
              default:
                return ['culturalSpot>etc'];
            }
          case 'A03': /// 레포츠
            switch (v.cat2) {
              case 'A0301': /// 레포츠소개
                switch (v.cat3) {
                  case 'A03010200': /// 수상레포츠
                    return ['oceanActivity>etc'];
                  case 'A03010300': /// 항공레포츠
                    return ['landActivity>etc'];
                  default:
                    return [''];
                }
              case 'A0302': /// 육상레포츠
                switch (v.cat3) {
                  case 'A03020600': /// 카트
                    return ['landActivity>cartRacing'];
                  case 'A03020700': /// 골프
                    return ['landActivity>golf'];
                  case 'A03021100': /// 승마
                    return ['landActivity>horseRiding'];
                  case 'A03021200': /// 스키/스노보드
                    return [
                      'mountainActivity>ski',
                      'mountainActivity>snowBoard',
                    ];
                  case 'A03021800': /// 암벽등반
                    return ['mountainActivity>rockClimbing'];
                  case 'A03022100': /// ATV
                    return ['landActivity>ATV'];
                  case 'A03022200': /// MTB
                    return ['mountainActivity>MTB'];
                  case 'A03022600': /// 스키(보드) 렌탈샵
                    return ['landActivity>etc', 'shopping'];
                  case 'A03022700': /// 트래킹
                    return [
                      'mountainActivity>groupHiking',
                      'naturalSpot>circumferenceTrail',
                    ];
                  case 'A03020200': /// 수련시설
                  case 'A03020300': /// 경기장
                  case 'A03020400': /// 인라인(실내 인라인 포함)
                  case 'A03020500': /// 자전거하이킹
                  case 'A03020800': /// 경마
                  case 'A03020900': /// 경륜
                  case 'A03021000': /// 카지노
                  case 'A03021400': /// 썰매장
                  case 'A03021500': /// 수렵장
                  case 'A03021600': /// 사격장
                  case 'A03021700': /// 야영장,오토캠핑장
                  case 'A03022000': /// 서바이벌게임
                  case 'A03022300': /// 오프로드
                  case 'A03022400': /// 번지점프
                  default:
                    return ['landActivity>etc'];
                }
              case 'A0303': /// 수상레포츠
                switch (v.cat3) {
                  case 'A03030100': /// 윈드서핑/제트스키
                    return [
                      'oceanActivity>jetBoat',
                      'oceanActivity>surfing',
                      'oceanActivity>paddleBoard',
                    ];
                  case 'A03030200': /// 카약/카누
                    return ['oceanActivity>kayak'];
                  case 'A03030300': /// 요트
                    return ['oceanActivity>sailing'];
                  case 'A03030400': /// 스노쿨링/스킨스쿠버다이빙
                    return ['oceanActivity>snorkeling'];
                  case 'A03030500': /// 민물낚시
                  case 'A03030600': /// 민물낚시
                    return ['oceanActivity>fishing'];
                  case 'A03030700': /// 수영
                  case 'A03030800': /// 래프팅
                  default:
                    return ['oceanActivity>etc'];
                }
              case 'A0304': /// 항공 레포츠
                switch (v.cat3) {
                  case 'A03040300': /// 행글라이딩/패러글라이딩
                    return ['mountainActivity>paragliding'];
                  case 'A03040100': /// 스카이다이빙
                  case 'A03040200': /// 초경량비행
                  case 'A03040400': /// 열기구
                  default:
                    return ['landActivity>etc'];
                }
              case 'A0305': /// 복합 레포츠 > 복합 레포츠
                return ['landActivity>etc'];
              default:
                return [''];
            }
          case 'A04': /// 쇼핑 > 쇼핑
            return ['shopping'];
          case 'A05': /// 음식
            switch (v.cat2) {
              case 'A0502': /// 음식점
                switch (v.cat3) {
                  case 'A05020100': /// 한식
                    return ['food>dining>korean'];
                  case 'A05020200': /// 서양식
                    return ['food>dining>western'];
                  case 'A05020300': /// 일식
                    return ['food>dining>japanese'];
                  case 'A05020400': /// 중식
                    return ['food>dining>chinese'];
                  case 'A05020900': /// 카페/전통찻집
                    return ['food>beverage>cafe'];
                  case 'A05021000': /// 클럽
                    return ['food>beverage>club'];
                  case 'A05020700': /// 이색음식점
                  default:
                    return ['food>dining>etc'];
                }
              default:
                return ['food>dining>etc'];
            }
          case 'B02': /// 숙박
            return ['lodging'];
          case 'C01': /// 추천코스
            switch (v.cat3) {
              case 'C0112': /// 가족코스
              case 'C0113': /// 나홀로코스
              case 'C0114': /// 힐링코스
              case 'C0115': /// 도보코스
              case 'C0116': /// 캠핑코스
              case 'C0117': /// 맛코스
              default:
                return null;
            }

          default:
            return null;
        }
      })();
      if (!isNil(ibTTTypePath) && !isNil(tourPlaceType)) {
        return [
          ...acc,
          {
            tourPlaceType: tourPlaceType as PlaceType,
            status: 'NEW' as DataStageStatus,
            ibTravelTag: {
              connect: ibTTTypePath.map(k => {
                const leafTag = k.split('>').pop();
                return {
                  value: leafTag,
                };
              }),
            },
            title: v.title,
            lat: Number(v.mapy),
            lng: Number(v.mapx),
            roadAddress: v.addr1,
            // address: v.addr2,
            // openWeek
            contact: v.tel,
            postcode: v.zipcode,
            photos: {
              createMany: {
                data: [
                  {
                    url: v.firstimage,
                  },
                  {
                    url: v.firstimage2,
                  },
                ],
              },
            },
          },
        ];
      }
      return acc;
    }, []);

    // eslint-disable-next-line no-restricted-syntax
    for await (const [i, buffer] of dataForCreate.entries()) {
      try {
        const createResult = await prisma.$transaction(async tx => {
          await tx.tourPlace.updateMany({
            where: {
              tourPlaceType: {
                in: ['TOUR4_RESTAURANT', 'TOUR4_SPOT'],
              },
              title: buffer.title,
              status: 'IN_USE',
            },
            data: {
              status: 'ARCHIVED',
            },
          });

          const result = await tx.tourPlace.create({
            data: buffer,
            select: {
              id: true,
              title: true,
              tourPlaceType: true,
              status: true,
              ibTravelTag: {
                select: {
                  id: true,
                  value: true,
                },
              },
              lat: true,
              lng: true,
              roadAddress: true,
              address: true,
              openWeek: true,
              contact: true,
              postcode: true,
              photos: {
                select: {
                  id: true,
                  url: true,
                },
              },
            },
          });
          return result;
        });
        console.log(`[${i}]:`, `id:${createResult.id}`, createResult.title);
      } catch (error) {
        console.error(error);
        console.error('prisma transaction is in error but keep going');
      }
    }
  } catch (error) {
    console.error(error);
  }
}

export default main;

// import batchJob from '../../../timer/dailyBatchJob';

// import { PrismaClient, PlaceType, DataStageStatus } from '@prisma/client';
// import { ValueType, value as data } from './data.go.kr';

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

// // tourAPI 4.0 분류 전체 카테고리 체계
// // data = [
// //   {
// //     "code": "A01",
// //     "name": "자연",
// //     "rnum": 1,
// //     "subCategory": [
// //       {
// //         "code": "A0101",
// //         "name": "자연관광지",
// //         "rnum": 1,
// //         "subCategory": [
// //           {
// //             "code": "A01010100",
// //             "name": "국립공원",
// //             "rnum": 1
// //           },
// //           {
// //             "code": "A01010200",
// //             "name": "도립공원",
// //             "rnum": 2
// //           },
// //           {
// //             "code": "A01010300",
// //             "name": "군립공원",
// //             "rnum": 3
// //           },
// //           {
// //             "code": "A01010400",
// //             "name": "산",
// //             "rnum": 4
// //           },
// //           {
// //             "code": "A01010500",
// //             "name": "자연생태관광지",
// //             "rnum": 5
// //           },
// //           {
// //             "code": "A01010600",
// //             "name": "자연휴양림",
// //             "rnum": 6
// //           },
// //           {
// //             "code": "A01010700",
// //             "name": "수목원",
// //             "rnum": 7
// //           },
// //           {
// //             "code": "A01010800",
// //             "name": "폭포",
// //             "rnum": 8
// //           },
// //           {
// //             "code": "A01010900",
// //             "name": "계곡",
// //             "rnum": 9
// //           },
// //           {
// //             "code": "A01011000",
// //             "name": "약수터",
// //             "rnum": 10
// //           },
// //           {
// //             "code": "A01011100",
// //             "name": "해안절경",
// //             "rnum": 11
// //           },
// //           {
// //             "code": "A01011200",
// //             "name": "해수욕장",
// //             "rnum": 12
// //           },
// //           {
// //             "code": "A01011300",
// //             "name": "섬",
// //             "rnum": 13
// //           },
// //           {
// //             "code": "A01011400",
// //             "name": "항구/포구",
// //             "rnum": 14
// //           },
// //           {
// //             "code": "A01011600",
// //             "name": "등대",
// //             "rnum": 15
// //           },
// //           {
// //             "code": "A01011700",
// //             "name": "호수",
// //             "rnum": 16
// //           },
// //           {
// //             "code": "A01011800",
// //             "name": "강",
// //             "rnum": 17
// //           },
// //           {
// //             "code": "A01011900",
// //             "name": "동굴",
// //             "rnum": 18
// //           }
// //         ]
// //       },
// //       {
// //         "code": "A0102",
// //         "name": "관광자원",
// //         "rnum": 2,
// //         "subCategory": [
// //           {
// //             "code": "A01020100",
// //             "name": "희귀동.식물",
// //             "rnum": 1
// //           },
// //           {
// //             "code": "A01020200",
// //             "name": "기암괴석",
// //             "rnum": 2
// //           }
// //         ]
// //       }
// //     ]
// //   },
// //   {
// //     "code": "A02",
// //     "name": "인문(문화/예술/역사)",
// //     "rnum": 2,
// //     "subCategory": [
// //       {
// //         "code": "A0201",
// //         "name": "역사관광지",
// //         "rnum": 1,
// //         "subCategory": [
// //           {
// //             "code": "A02010100",
// //             "name": "고궁",
// //             "rnum": 1
// //           },
// //           {
// //             "code": "A02010200",
// //             "name": "성",
// //             "rnum": 2
// //           },
// //           {
// //             "code": "A02010300",
// //             "name": "문",
// //             "rnum": 3
// //           },
// //           {
// //             "code": "A02010400",
// //             "name": "고택",
// //             "rnum": 4
// //           },
// //           {
// //             "code": "A02010500",
// //             "name": "생가",
// //             "rnum": 5
// //           },
// //           {
// //             "code": "A02010600",
// //             "name": "민속마을",
// //             "rnum": 6
// //           },
// //           {
// //             "code": "A02010700",
// //             "name": "유적지/사적지",
// //             "rnum": 7
// //           },
// //           {
// //             "code": "A02010800",
// //             "name": "사찰",
// //             "rnum": 8
// //           },
// //           {
// //             "code": "A02010900",
// //             "name": "종교성지",
// //             "rnum": 9
// //           },
// //           {
// //             "code": "A02011000",
// //             "name": "안보관광",
// //             "rnum": 10
// //           }
// //         ]
// //       },
// //       {
// //         "code": "A0202",
// //         "name": "휴양관광지",
// //         "rnum": 2,
// //         "subCategory": [
// //           {
// //             "code": "A02020200",
// //             "name": "관광단지",
// //             "rnum": 1
// //           },
// //           {
// //             "code": "A02020300",
// //             "name": "온천/욕장/스파",
// //             "rnum": 2
// //           },
// //           {
// //             "code": "A02020400",
// //             "name": "이색찜질방",
// //             "rnum": 3
// //           },
// //           {
// //             "code": "A02020500",
// //             "name": "헬스투어",
// //             "rnum": 4
// //           },
// //           {
// //             "code": "A02020600",
// //             "name": "테마공원",
// //             "rnum": 5
// //           },
// //           {
// //             "code": "A02020700",
// //             "name": "공원",
// //             "rnum": 6
// //           },
// //           {
// //             "code": "A02020800",
// //             "name": "유람선/잠수함관광",
// //             "rnum": 7
// //           }
// //         ]
// //       },
// //       {
// //         "code": "A0203",
// //         "name": "체험관광지",
// //         "rnum": 3,
// //         "subCategory": [
// //           {
// //             "code": "A02030100",
// //             "name": "농.산.어촌 체험",
// //             "rnum": 1
// //           },
// //           {
// //             "code": "A02030200",
// //             "name": "전통체험",
// //             "rnum": 2
// //           },
// //           {
// //             "code": "A02030300",
// //             "name": "산사체험",
// //             "rnum": 3
// //           },
// //           {
// //             "code": "A02030400",
// //             "name": "이색체험",
// //             "rnum": 4
// //           },
// //           {
// //             "code": "A02030600",
// //             "name": "이색거리",
// //             "rnum": 5
// //           }
// //         ]
// //       },
// //       {
// //         "code": "A0204",
// //         "name": "산업관광지",
// //         "rnum": 4,
// //         "subCategory": [
// //           {
// //             "code": "A02040400",
// //             "name": "발전소",
// //             "rnum": 1
// //           },
// //           {
// //             "code": "A02040600",
// //             "name": "식음료",
// //             "rnum": 2
// //           },
// //           {
// //             "code": "A02040800",
// //             "name": "기타",
// //             "rnum": 3
// //           },
// //           {
// //             "code": "A02040900",
// //             "name": "전자-반도체",
// //             "rnum": 4
// //           },
// //           {
// //             "code": "A02041000",
// //             "name": "자동차",
// //             "rnum": 5
// //           }
// //         ]
// //       },
// //       {
// //         "code": "A0205",
// //         "name": "건축/조형물",
// //         "rnum": 5,
// //         "subCategory": [
// //           {
// //             "code": "A02050100",
// //             "name": "다리/대교",
// //             "rnum": 1
// //           },
// //           {
// //             "code": "A02050200",
// //             "name": "기념탑/기념비/전망대",
// //             "rnum": 2
// //           },
// //           {
// //             "code": "A02050300",
// //             "name": "분수",
// //             "rnum": 3
// //           },
// //           {
// //             "code": "A02050400",
// //             "name": "동상",
// //             "rnum": 4
// //           },
// //           {
// //             "code": "A02050500",
// //             "name": "터널",
// //             "rnum": 5
// //           },
// //           {
// //             "code": "A02050600",
// //             "name": "유명건물",
// //             "rnum": 6
// //           }
// //         ]
// //       },
// //       {
// //         "code": "A0206",
// //         "name": "문화시설",
// //         "rnum": 6,
// //         "subCategory": [
// //           {
// //             "code": "A02060100",
// //             "name": "박물관",
// //             "rnum": 1
// //           },
// //           {
// //             "code": "A02060200",
// //             "name": "기념관",
// //             "rnum": 2
// //           },
// //           {
// //             "code": "A02060300",
// //             "name": "전시관",
// //             "rnum": 3
// //           },
// //           {
// //             "code": "A02060400",
// //             "name": "컨벤션센터",
// //             "rnum": 4
// //           },
// //           {
// //             "code": "A02060500",
// //             "name": "미술관/화랑",
// //             "rnum": 5
// //           },
// //           {
// //             "code": "A02060600",
// //             "name": "공연장",
// //             "rnum": 6
// //           },
// //           {
// //             "code": "A02060700",
// //             "name": "문화원",
// //             "rnum": 7
// //           },
// //           {
// //             "code": "A02060800",
// //             "name": "외국문화원",
// //             "rnum": 8
// //           },
// //           {
// //             "code": "A02060900",
// //             "name": "도서관",
// //             "rnum": 9
// //           },
// //           {
// //             "code": "A02061000",
// //             "name": "대형서점",
// //             "rnum": 10
// //           },
// //           {
// //             "code": "A02061100",
// //             "name": "문화전수시설",
// //             "rnum": 11
// //           },
// //           {
// //             "code": "A02061200",
// //             "name": "영화관",
// //             "rnum": 12
// //           },
// //           {
// //             "code": "A02061300",
// //             "name": "어학당",
// //             "rnum": 13
// //           },
// //           {
// //             "code": "A02061400",
// //             "name": "학교",
// //             "rnum": 14
// //           }
// //         ]
// //       },
// //       {
// //         "code": "A0207",
// //         "name": "축제",
// //         "rnum": 7,
// //         "subCategory": [
// //           {
// //             "code": "A02070100",
// //             "name": "문화관광축제",
// //             "rnum": 1
// //           },
// //           {
// //             "code": "A02070200",
// //             "name": "일반축제",
// //             "rnum": 2
// //           }
// //         ]
// //       },
// //       {
// //         "code": "A0208",
// //         "name": "공연/행사",
// //         "rnum": 8,
// //         "subCategory": [
// //           {
// //             "code": "A02080100",
// //             "name": "전통공연",
// //             "rnum": 1
// //           },
// //           {
// //             "code": "A02080200",
// //             "name": "연극",
// //             "rnum": 2
// //           },
// //           {
// //             "code": "A02080300",
// //             "name": "뮤지컬",
// //             "rnum": 3
// //           },
// //           {
// //             "code": "A02080400",
// //             "name": "오페라",
// //             "rnum": 4
// //           },
// //           {
// //             "code": "A02080500",
// //             "name": "전시회",
// //             "rnum": 5
// //           },
// //           {
// //             "code": "A02080600",
// //             "name": "박람회",
// //             "rnum": 6
// //           },
// //           {
// //             "code": "A02080800",
// //             "name": "무용",
// //             "rnum": 7
// //           },
// //           {
// //             "code": "A02080900",
// //             "name": "클래식음악회",
// //             "rnum": 8
// //           },
// //           {
// //             "code": "A02081000",
// //             "name": "대중콘서트",
// //             "rnum": 9
// //           },
// //           {
// //             "code": "A02081100",
// //             "name": "영화",
// //             "rnum": 10
// //           },
// //           {
// //             "code": "A02081200",
// //             "name": "스포츠경기",
// //             "rnum": 11
// //           },
// //           {
// //             "code": "A02081300",
// //             "name": "기타행사",
// //             "rnum": 12
// //           }
// //         ]
// //       }
// //     ]
// //   },
// //   {
// //     "code": "A03",
// //     "name": "레포츠",
// //     "rnum": 3,
// //     "subCategory": [
// //       {
// //         "code": "A0301",
// //         "name": "레포츠소개",
// //         "rnum": 1,
// //         "subCategory": [
// //           {
// //             "code": "A03010200",
// //             "name": "수상레포츠",
// //             "rnum": 1
// //           },
// //           {
// //             "code": "A03010300",
// //             "name": "항공레포츠",
// //             "rnum": 2
// //           }
// //         ]
// //       },
// //       {
// //         "code": "A0302",
// //         "name": "육상 레포츠",
// //         "rnum": 2,
// //         "subCategory": [
// //           {
// //             "code": "A03020200",
// //             "name": "수련시설",
// //             "rnum": 1
// //           },
// //           {
// //             "code": "A03020300",
// //             "name": "경기장",
// //             "rnum": 2
// //           },
// //           {
// //             "code": "A03020400",
// //             "name": "인라인(실내 인라인 포함)",
// //             "rnum": 3
// //           },
// //           {
// //             "code": "A03020500",
// //             "name": "자전거하이킹",
// //             "rnum": 4
// //           },
// //           {
// //             "code": "A03020600",
// //             "name": "카트",
// //             "rnum": 5
// //           },
// //           {
// //             "code": "A03020700",
// //             "name": "골프",
// //             "rnum": 6
// //           },
// //           {
// //             "code": "A03020800",
// //             "name": "경마",
// //             "rnum": 7
// //           },
// //           {
// //             "code": "A03020900",
// //             "name": "경륜",
// //             "rnum": 8
// //           },
// //           {
// //             "code": "A03021000",
// //             "name": "카지노",
// //             "rnum": 9
// //           },
// //           {
// //             "code": "A03021100",
// //             "name": "승마",
// //             "rnum": 10
// //           },
// //           {
// //             "code": "A03021200",
// //             "name": "스키/스노보드",
// //             "rnum": 11
// //           },
// //           {
// //             "code": "A03021300",
// //             "name": "스케이트",
// //             "rnum": 12
// //           },
// //           {
// //             "code": "A03021400",
// //             "name": "썰매장",
// //             "rnum": 13
// //           },
// //           {
// //             "code": "A03021500",
// //             "name": "수렵장",
// //             "rnum": 14
// //           },
// //           {
// //             "code": "A03021600",
// //             "name": "사격장",
// //             "rnum": 15
// //           },
// //           {
// //             "code": "A03021700",
// //             "name": "야영장,오토캠핑장",
// //             "rnum": 16
// //           },
// //           {
// //             "code": "A03021800",
// //             "name": "암벽등반",
// //             "rnum": 17
// //           },
// //           {
// //             "code": "A03022000",
// //             "name": "서바이벌게임",
// //             "rnum": 18
// //           },
// //           {
// //             "code": "A03022100",
// //             "name": "ATV",
// //             "rnum": 19
// //           },
// //           {
// //             "code": "A03022200",
// //             "name": "MTB",
// //             "rnum": 20
// //           },
// //           {
// //             "code": "A03022300",
// //             "name": "오프로드",
// //             "rnum": 21
// //           },
// //           {
// //             "code": "A03022400",
// //             "name": "번지점프",
// //             "rnum": 22
// //           },
// //           {
// //             "code": "A03022600",
// //             "name": "스키(보드) 렌탈샵",
// //             "rnum": 23
// //           },
// //           {
// //             "code": "A03022700",
// //             "name": "트래킹",
// //             "rnum": 24
// //           }
// //         ]
// //       },
// //       {
// //         "code": "A0303",
// //         "name": "수상 레포츠",
// //         "rnum": 3,
// //         "subCategory": [
// //           {
// //             "code": "A03030100",
// //             "name": "윈드서핑/제트스키",
// //             "rnum": 1
// //           },
// //           {
// //             "code": "A03030200",
// //             "name": "카약/카누",
// //             "rnum": 2
// //           },
// //           {
// //             "code": "A03030300",
// //             "name": "요트",
// //             "rnum": 3
// //           },
// //           {
// //             "code": "A03030400",
// //             "name": "스노쿨링/스킨스쿠버다이빙",
// //             "rnum": 4
// //           },
// //           {
// //             "code": "A03030500",
// //             "name": "민물낚시",
// //             "rnum": 5
// //           },
// //           {
// //             "code": "A03030600",
// //             "name": "바다낚시",
// //             "rnum": 6
// //           },
// //           {
// //             "code": "A03030700",
// //             "name": "수영",
// //             "rnum": 7
// //           },
// //           {
// //             "code": "A03030800",
// //             "name": "래프팅",
// //             "rnum": 8
// //           }
// //         ]
// //       },
// //       {
// //         "code": "A0304",
// //         "name": "항공 레포츠",
// //         "rnum": 4,
// //         "subCategory": [
// //           {
// //             "code": "A03040100",
// //             "name": "스카이다이빙",
// //             "rnum": 1
// //           },
// //           {
// //             "code": "A03040200",
// //             "name": "초경량비행",
// //             "rnum": 2
// //           },
// //           {
// //             "code": "A03040300",
// //             "name": "헹글라이딩/패러글라이딩",
// //             "rnum": 3
// //           },
// //           {
// //             "code": "A03040400",
// //             "name": "열기구",
// //             "rnum": 4
// //           }
// //         ]
// //       },
// //       {
// //         "code": "A0305",
// //         "name": "복합 레포츠",
// //         "rnum": 5,
// //         "subCategory": [
// //           {
// //             "code": "A03050100",
// //             "name": "복합 레포츠",
// //             "rnum": 1
// //           }
// //         ]
// //       }
// //     ]
// //   },
// //   {
// //     "code": "A04",
// //     "name": "쇼핑",
// //     "rnum": 4,
// //     "subCategory": [
// //       {
// //         "code": "A0401",
// //         "name": "쇼핑",
// //         "rnum": 1,
// //         "subCategory": [
// //           {
// //             "code": "A04010100",
// //             "name": "5일장",
// //             "rnum": 1
// //           },
// //           {
// //             "code": "A04010200",
// //             "name": "상설시장",
// //             "rnum": 2
// //           },
// //           {
// //             "code": "A04010300",
// //             "name": "백화점",
// //             "rnum": 3
// //           },
// //           {
// //             "code": "A04010400",
// //             "name": "면세점",
// //             "rnum": 4
// //           },
// //           {
// //             "code": "A04010500",
// //             "name": "대형마트",
// //             "rnum": 5
// //           },
// //           {
// //             "code": "A04010600",
// //             "name": "전문매장/상가",
// //             "rnum": 6
// //           },
// //           {
// //             "code": "A04010700",
// //             "name": "공예/공방",
// //             "rnum": 7
// //           },
// //           {
// //             "code": "A04010900",
// //             "name": "특산물판매점",
// //             "rnum": 8
// //           },
// //           {
// //             "code": "A04011000",
// //             "name": "사후면세점",
// //             "rnum": 9
// //           }
// //         ]
// //       }
// //     ]
// //   },
// //   {
// //     "code": "A05",
// //     "name": "음식",
// //     "rnum": 5,
// //     "subCategory": [
// //       {
// //         "code": "A0502",
// //         "name": "음식점",
// //         "rnum": 1,
// //         "subCategory": [
// //           {
// //             "code": "A05020100",
// //             "name": "한식",
// //             "rnum": 1
// //           },
// //           {
// //             "code": "A05020200",
// //             "name": "서양식",
// //             "rnum": 2
// //           },
// //           {
// //             "code": "A05020300",
// //             "name": "일식",
// //             "rnum": 3
// //           },
// //           {
// //             "code": "A05020400",
// //             "name": "중식",
// //             "rnum": 4
// //           },
// //           {
// //             "code": "A05020700",
// //             "name": "이색음식점",
// //             "rnum": 5
// //           },
// //           {
// //             "code": "A05020900",
// //             "name": "카페/전통찻집",
// //             "rnum": 6
// //           },
// //           {
// //             "code": "A05021000",
// //             "name": "클럽",
// //             "rnum": 7
// //           }
// //         ]
// //       }
// //     ]
// //   },
// //   {
// //     "code": "B02",
// //     "name": "숙박",
// //     "rnum": 6,
// //     "subCategory": [
// //       {
// //         "code": "B0201",
// //         "name": "숙박시설",
// //         "rnum": 1,
// //         "subCategory": [
// //           {
// //             "code": "B02010100",
// //             "name": "관광호텔",
// //             "rnum": 1
// //           },
// //           {
// //             "code": "B02010500",
// //             "name": "콘도미니엄",
// //             "rnum": 2
// //           },
// //           {
// //             "code": "B02010600",
// //             "name": "유스호스텔",
// //             "rnum": 3
// //           },
// //           {
// //             "code": "B02010700",
// //             "name": "펜션",
// //             "rnum": 4
// //           },
// //           {
// //             "code": "B02010900",
// //             "name": "모텔",
// //             "rnum": 5
// //           },
// //           {
// //             "code": "B02011000",
// //             "name": "민박",
// //             "rnum": 6
// //           },
// //           {
// //             "code": "B02011100",
// //             "name": "게스트하우스",
// //             "rnum": 7
// //           },
// //           {
// //             "code": "B02011200",
// //             "name": "홈스테이",
// //             "rnum": 8
// //           },
// //           {
// //             "code": "B02011300",
// //             "name": "서비스드레지던스",
// //             "rnum": 9
// //           },
// //           {
// //             "code": "B02011600",
// //             "name": "한옥",
// //             "rnum": 10
// //           }
// //         ]
// //       }
// //     ]
// //   },
// //   {
// //     "code": "C01",
// //     "name": "추천코스",
// //     "rnum": 7,
// //     "subCategory": [
// //       {
// //         "code": "C0112",
// //         "name": "가족코스",
// //         "rnum": 1,
// //         "subCategory": [
// //           {
// //             "code": "C01120001",
// //             "name": "가족코스",
// //             "rnum": 1
// //           }
// //         ]
// //       },
// //       {
// //         "code": "C0113",
// //         "name": "나홀로코스",
// //         "rnum": 2,
// //         "subCategory": [
// //           {
// //             "code": "C01130001",
// //             "name": "나홀로코스",
// //             "rnum": 1
// //           }
// //         ]
// //       },
// //       {
// //         "code": "C0114",
// //         "name": "힐링코스",
// //         "rnum": 3,
// //         "subCategory": [
// //           {
// //             "code": "C01140001",
// //             "name": "힐링코스",
// //             "rnum": 1
// //           }
// //         ]
// //       },
// //       {
// //         "code": "C0115",
// //         "name": "도보코스",
// //         "rnum": 4,
// //         "subCategory": [
// //           {
// //             "code": "C01150001",
// //             "name": "도보코스",
// //             "rnum": 1
// //           }
// //         ]
// //       },
// //       {
// //         "code": "C0116",
// //         "name": "캠핑코스",
// //         "rnum": 5,
// //         "subCategory": [
// //           {
// //             "code": "C01160001",
// //             "name": "캠핑코스",
// //             "rnum": 1
// //           }
// //         ]
// //       },
// //       {
// //         "code": "C0117",
// //         "name": "맛코스",
// //         "rnum": 6,
// //         "subCategory": [
// //           {
// //             "code": "C01170001",
// //             "name": "맛코스",
// //             "rnum": 1
// //           }
// //         ]
// //       }
// //     ]
// //   }
// // ]
