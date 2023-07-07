import axios, { AxiosResponse } from 'axios';
import { isEmpty, isNil } from 'lodash';

/// 행안부 한국지역정보개발원 business.juso.go.kr 도로명주소 검색 api
export interface KRJusoType {
  roadAddr: string; /// 전체 도로명주소
  roadAddrPart1: string; /// 도로명주소(참고항목 제외)
  roadAddrPart2: string; /// 도로명주소 참고항목
  jibunAddr: string; /// 지번주소
  engAddr: string; /// 도로명주소(영문)
  zipNo: string; /// 우편번호
  admCd: string; /// 행정구역코드
  rnMgtSn: string; /// 도로명코드
  bdMgtSn: string; /// 건물관리번호
  detBdNmList: string; /// 상세건물명
  bdNm: string; /// 건물명
  bdKdcd: string; /// 공동주택여부(1: 공동주택, 0: 비공동주택)
  siNm: string; /// 시도명
  sggNm: string; /// 시군구명
  emdNm: string; /// 읍면동명
  liNm: string; /// 법정리명
  rn: string; /// 도로명
  udrtYn: string; /// 지하여부(0: 지상, 1: 지하)
  buldMnnm: string; /// 건물본번
  buldSlno: string; /// 건물부번
  emdNo: string; /// 읍면동일련번호
  lnbrMnnm: string; /// 지번본번(번지)
  lnbrSlno: string; /// 지번부번(호)
  mtYn: string; /// 산여부(0: 대지, 1: 산)
}

interface KRJusoAPIType {
  results: {
    common: {
      errorMessage: string; /// 에러 메시지
      countPerPage: string; /// 페이지당 출력할 결과 Row수
      totalCount: string; /// 총 검색 데이터수
      errorCode: string; /// 에러코드
      currentPage: string; /// 페이지 번호
    };
    juso: KRJusoType[];
  };
}

export async function searchKRJuso(
  keyword: string,
): Promise<KRJusoType | null> {
  /// 행안부 한국지역정보개발원 business.juso.go.kr 도로명주소 검색 api
  const detailJuso = await axios.get<KRJusoAPIType>(
    'https://business.juso.go.kr/addrlink/addrLinkApi.do',
    {
      params: {
        confmKey: process.env.JUSO_LOCAL_CONFIRM_KEY as string,
        currentPage: 1,
        countPerPage: 1,
        resultType: 'json',
        keyword,
      },
    },
  );

  const { juso } = detailJuso.data.results;

  return isEmpty(juso) ? null : juso[0];
}

interface VWorldJusoStructureType {
  level0: string; /// 국가
  level1: string; /// 시,도
  level2: string; /// 시, 군, 구
  level3: string; /// (일반구) 구
  level4L: string; /// (도로)도로명, (지번)법정읍·면·동 명
  level4LC: string; ///
  level4A: string; /// 	(도로)행정읍·면·동 명, (지번)지원안함
  level4AC: string; /// (도로)행정읍·면·동 코드, (지번)지원안함
  level5: string; /// (도로)길, (지번)번지
  detail: string; /// 상세주소
}

interface VWorldGeoCoderToAddrType {
  zipcode: string;
  type: string;
  text: string;
  structure: VWorldJusoStructureType;
}

export interface VWorldGeoCoderToAddrAPIType {
  response: {
    service: {
      name: string;
      version: string;
      operation: string;
      time: string;
    };
    status: string;
    input: {
      point: {
        x: string;
        y: string;
      };
      crs: string;
      type: string;
    };
    result: VWorldGeoCoderToAddrType[];
  };
}

export async function geoCodeToAddr(
  lat: string,
  lng: string,
): Promise<VWorldGeoCoderToAddrType | null> {
  /// docs: https://www.vworld.kr/dev/v4dv_geocoderguide2_s002.do
  /// ex) api.vworld.kr/req/address?service=address&request=getAddress&version=2.0&crs=epsg:4326&point=127.9227184801,36.8995207136&format=xml&type=both&zipcode=true&simple=false&key=4EC61450-204D-30D9-A8DA-53C074B727A4

  const retryLoop = async (
    retry = 1,
    waitTime = 200,
  ): Promise<AxiosResponse<VWorldGeoCoderToAddrAPIType, unknown>> => {
    try {
      const result = await axios.get<VWorldGeoCoderToAddrAPIType>(
        'https://api.vworld.kr/req/address',
        {
          params: {
            service: 'address',
            request: 'getAddress',
            version: '2.0',
            crs: 'epsg:4326',
            point: `${lng},${lat}`,
            format: 'json',
            type: 'both',
            zipcode: 'true',
            simple: 'false',
            key: process.env.VWORLD_APIKEY as string,
          },
        },
      );
      return result;
    } catch {
      console.log(
        `[${lat}, ${lng}] geoCodeToAddr api call error. wait ${waitTime}ms and retry.. ${retry}`,
      );

      const waitPromise = new Promise(resolve => {
        setTimeout(() => {
          resolve(true);
        }, waitTime);
      });

      await waitPromise;
      const result = await retryLoop(retry + 1);

      return result;
    }
  };

  const result = await retryLoop();

  if (isNil(result.data.response.result)) {
    console.log(result.data);
    return null;
  }

  const [address] = result.data.response.result;

  return address;
}

interface VWorldAddrToGeoCodeType {
  crs: string; /// 응답결과 좌표계
  point: {
    x: number;
    y: number;
  };
}

export interface VWorldAddrToGeoCodeTypeAPIType {
  response: {
    service: {
      name: string;
      version: string;
      operation: string;
      time: string;
    };
    status: string;
    input: {
      type: string; /// 'ROAD' 도로명 | 'PARCEL' 지번주소
      address: string;
    };
    refined: {
      text: string;
      structure: VWorldJusoStructureType;
    };
    result: VWorldAddrToGeoCodeType;
  };
}

export async function addrToGeoCode(param: {
  address: string;
  type: 'road' | 'parcel';
}): Promise<{
  regionCode1: string;
  regionCode2: string;
  lat: number;
  lng: number;
} | null> {
  /// docs: https://www.vworld.kr/dev/v4dv_geocoderguide2_s001.do
  /// ex) https://api.vworld.kr/req/address?service=address&request=getcoord&version=2.0&crs=epsg:4326&address=효령로72길 60&refine=true&simple=false&format=xml&type=road&key=324DC2B6-B641-3A80-8AC0-3E27B8047C0B

  const { address, type } = param;

  const retryLoop = async (
    retry = 1,
    waitTime = 200,
  ): Promise<AxiosResponse<VWorldAddrToGeoCodeTypeAPIType, unknown>> => {
    try {
      const result = await axios.get<VWorldAddrToGeoCodeTypeAPIType>(
        'https://api.vworld.kr/req/address',
        {
          params: {
            service: 'address',
            request: 'getcoord',
            version: '2.0',
            crs: 'epsg:4326',
            address,
            format: 'json',
            type,
            key: process.env.VWORLD_APIKEY as string,
          },
        },
      );
      return result;
    } catch {
      console.log(
        `[${type}, ${address}] addrToGeoCode api call error. wait ${waitTime}ms and retry.. ${retry}`,
      );

      const waitPromise = new Promise(resolve => {
        setTimeout(() => {
          resolve(true);
        }, waitTime);
      });

      await waitPromise;
      const result = await retryLoop(retry + 1);

      return result;
    }
  };

  const res = await retryLoop();

  if (isNil(res.data.response.result)) {
    console.log(res.data);
    return null;
  }

  const geoCodeNRefined = res.data;

  const {
    refined: { structure },
    result,
  } = geoCodeNRefined.response;

  const regionCode1 = structure.level1;
  const regionCode2 = structure.level2.split(' ')[0];

  const { x: lng, y: lat } = result.point;
  return {
    regionCode1,
    regionCode2,
    lng: Number(lng),
    lat: Number(lat),
  };
}
