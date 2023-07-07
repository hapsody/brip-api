import * as turf from '@turf/turf';
import { isNil, isEmpty } from 'lodash';

export interface BoundingBox {
  minLat: number;
  minLng: number;
  maxLat: number;
  maxLng: number;
}

/**
 * turf 라이브러리를 이용해
 * 입력받은 latitude, longitude 값에 반경 radiusInKm 로 정의되는 원을 외접하는 사각형의 최대 최소값을 지구 위경도로 반환한다.
 */
export function getBoundingBox(
  latitude: number,
  longitude: number,
  radiusInMeters: number,
): BoundingBox {
  const center = turf.point([longitude, latitude]);
  // const options = { units: 'kilometers' };

  // 반지름을 이용하여 원의 범위를 구합니다.
  const circle = turf.circle(
    center,
    radiusInMeters / 1000,
    undefined,
    'kilometers',
  );

  // 원을 내접으로 포함하는 사각형을 최소/최대값 위도와 경도로 표현합니다. 사각형의 가로세로 길이는 2*radiusInKm가 됩니다.
  const [minLng, minLat, maxLng, maxLat] = turf.bbox(circle);

  // 최소/최대 위도와 경도를 포함하는 사각형 범위를 반환합니다.
  return {
    minLat,
    minLng,
    maxLat,
    maxLng,
  };
}

/**
 *  turf 라이브러리를 이용한 두 위경도 사이의 거리(meter)
 */
export function getDistFromTwoGeoLoc(param: {
  aLat: number;
  aLng: number;
  bLat: number;
  bLng: number;
  cnt?: {
    maxPhase: number;
    count: number;
    avoidCnt: number;
  };
}): number {
  const { aLat, aLng, bLat, bLng, cnt } = param;
  // 위경도 값
  const from = [aLng, aLat]; // Washington D.C.
  const to = [bLng, bLat]; // Los Angeles

  // turf의 point 함수를 사용하여 위경도 값을 포인트 객체로 변환합니다.
  const fromPoint = turf.point(from);
  const toPoint = turf.point(to);

  // distance 함수를 사용하여 두 포인트 객체 사이의 거리를 계산합니다.
  const kilometers = turf.distance(fromPoint, toPoint, 'kilometers');

  /// 성능 test용 count
  if (!isNil(cnt) && !isEmpty(cnt)) cnt.count += 1;

  return kilometers * 1000;
}

/// (deprecated turf로 대체) 두 위경도 값의 차이를 미터 단위로 환산하여 리턴하는 함수, 위도에 따른 지구 곡률 보정이 포함되어 있다.
export function degreeToMeter(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  // generally used geo measurement function
  const R = 6378.137; // Radius of earth in KM
  const dLat = (lat2 * Math.PI) / 180 - (lat1 * Math.PI) / 180;
  const dLon = (lon2 * Math.PI) / 180 - (lon1 * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c;
  return d * 1000; // meters
}

/// (deprecated turf로 대체) 입력한 거리(실제 미터)에 대응하는 경도 값을 최소 경도값에서 떨어진 경도 위치로 반환한다.(축척 표시용))
export async function estGeoLocFromMeter(targetMeter: number): Promise<{
  lng: number;
  lat: number;
  cnt: number;
}> {
  const gMinY = 0.0;
  //   const gMaxY = 0.0;
  const gMinX = 0;
  const gMaxX = 1;
  let estMeter = degreeToMeter(gMinX, gMinY, gMaxX, gMinY); /// 적도 기준 초기값 약 133km
  let rightX = gMaxX - gMinX;
  let estX = rightX;
  //   let deltaMeter;
  let delta;

  //   let down = 0;
  //   let up = 0;
  let cnt = 0;
  const pro = new Promise(resolve => {
    while (Math.abs(targetMeter - estMeter) > 0.1 && cnt < 1000) {
      cnt += 1;
      delta = rightX / 2;
      //   deltaMeter = degreeToMeter(0, gMinY, delta, gMinY);
      if (estMeter > targetMeter) {
        estX -= delta;
        // down += 1;
      } else {
        estX += delta;
        // up += 1;
      }
      estMeter = degreeToMeter(0, gMinY, estX, gMinY);
      rightX /= 2;
    }
    // console.log(`down ${down}, up:${up}`);
    resolve(true);
  });

  await pro;

  return {
    lng: estX + gMinX,
    lat: gMinY,
    cnt,
  };
}
