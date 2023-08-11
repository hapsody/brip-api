import validUrl from 'valid-url';
import axios from 'axios';
import { isNil, isEmpty } from 'lodash';

/// head만 검사하여 url이 접근가능한 url인지 체크
export const checkURLAccessibility = async (url: string): Promise<boolean> => {
  try {
    // HEAD 메소드를 사용하여 자원의 헤더만 가져옵니다.
    const response = await axios.head(url);

    // 요청이 성공적이고 응답 코드가 2xx 또는 3xx인 경우 접속 가능한 것으로 간주합니다.
    if (response.status >= 200 && response.status < 400) return true;

    return false;
  } catch {
    return false;
  }
};

/// siteUrl 파라미터의 url값을 https 접속으로 변환하고 그 url이 acecssible한 사이트인지 체크하여 접근가능할 경우 반환한다.
export const getValidHttpsUrl = async (
  siteUrl: string | undefined,
): Promise<string | undefined> => {
  let httpsUrl: string | undefined;
  /// 1.  유저입력 siteUrl이 없으면 undefined
  if (isNil(siteUrl) || isEmpty(siteUrl)) return undefined;

  /// 2.  유저입력 siteUrl이 http://로 시작하면
  if (validUrl.isHttpUri(siteUrl)) {
    ///  http:// 만 써있으면 undefined
    if (siteUrl.split('http://').length < 2) return undefined;

    /// http:// 뒤에 url이 써있으면
    const url = siteUrl.split('http://')[1];
    /// 앞을 https://로 바꿈
    httpsUrl = `https://${url}`;
    const httpsAccessibilityCheck = await checkURLAccessibility(httpsUrl);
    if (httpsAccessibilityCheck) return httpsUrl;

    /// https:// 접속이 안되면 http://로도 확인해봄
    const httpAccessibilityCheck = await checkURLAccessibility(siteUrl);
    return httpAccessibilityCheck ? siteUrl : undefined;
  }

  /// 3. 유저입력 siteUrl이 존재하고 http://가 아니라 https://로 시작하면 그대로 반환
  if (validUrl.isHttpsUri(siteUrl)) {
    const accessibilityCheck = await checkURLAccessibility(siteUrl);
    return accessibilityCheck ? siteUrl : undefined;
  }

  /// 4. 유저입력 siteUrl이 존재하는데 http:// 또는 https://로 시작하지 않으면 https://를 붙여보고 접근가능할 경우메만 DB 저장
  /// 5. 아닐 경우 DB 저장안함(undefined)
  const isAccessible = await checkURLAccessibility(`http://${siteUrl}`);
  return isAccessible ? `https://${siteUrl}` : undefined;
};
