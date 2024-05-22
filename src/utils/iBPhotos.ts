import { isNil, isEmpty } from 'lodash';

import {
  IBPhotos,
  TripMemoryCategory,
  IBPhotoTag,
  IBPhotoMetaInfo,
  User,
} from '@prisma/client';

import { IBError } from '@src/utils/IBDefinitions';
import { getS3SignedUrl } from './aws/s3';

export const getUserProfileUrl = async (
  user: Partial<User> | null | undefined,
): Promise<string | null> => {
  if (isNil(user)) return null;
  if (isEmpty(user)) return null;
  if (isNil(user.profileImg)) return null;
  if (isEmpty(user.profileImg)) return null;

  if (user.profileImg!.toLowerCase().includes('http')) return user.profileImg;
  const ret = await getS3SignedUrl(user.profileImg!);
  return ret;
};

// export const getUserSmallProfileUrl = async (
//   user: Partial<User> | null | undefined,
// ): Promise<string | null> => {
//   if (isNil(user)) return null;
//   if (isEmpty(user)) return null;
//   if (isNil(user.smallProfileImg)) return null;
//   if (isEmpty(user.smallProfileImg)) return null;

//   if (user.smallProfileImg!.toLowerCase().includes('http'))
//     return user.smallProfileImg;
//   const ret = await getS3SignedUrl(user.smallProfileImg!);
//   return ret;
// };

export const getAccessableUrl = async (url: string | null): Promise<string> => {
  if (isNil(url)) return 'null';
  if (url.includes('http')) return url;
  const result = await getS3SignedUrl(url);
  return result;
};

export type PhotoWithMetaType = Partial<IBPhotos> & {
  photoMetaInfo?:
    | (IBPhotoMetaInfo & {
        feature: TripMemoryCategory[];
        keyword: IBPhotoTag[];
      })
    | null;
};

export const getIBPhotoUrl = async (
  photo: PhotoWithMetaType,
): Promise<PhotoWithMetaType> => {
  if (!isNil(photo.url)) {
    return {
      ...photo,
      url: photo.url,
    };
  }
  if (!isNil(photo.key)) {
    return {
      ...photo,
      url: await getS3SignedUrl(photo.key),
    };
  }

  throw new IBError({
    type: 'INVALIDSTATUS',
    message: 'photos의 url과 key값이 둘다 존재하지 않습니다.',
  });
};

/**
 *  IBPhotos 배열 형식으로부터 presignedUrl 또는 직접 접근 URL을 반환하는 함수
 * @param param
 * @returns
 */
export const getThumbnailUrlFromIBPhotos = async (
  photos: IBPhotos[],
): Promise<string> => {
  if (photos.length > 0) {
    if (!isNil(photos[0].key) && !isEmpty(photos[0].key)) {
      /// s3 key가 존재하는 경우
      const signedUrl = await getS3SignedUrl(photos[0].key);
      return signedUrl;
    }

    if (!isNil(photos[0].url) && !isEmpty(photos[0].url)) {
      /// 직접접근 링크 url이 존재하는 경우
      return photos[0].url;
    }
  }
  return 'none';
};

/**
 *  IBPhotos 배열 형식으로부터 presignedUrl 또는 직접 접근 URL을 반환하는 함수
 * @param param
 * @returns
 */
export const getImgUrlListFromIBPhotos = async (
  photos: IBPhotos[],
): Promise<
  // {
  //   id: string;
  //   url: string;
  // }[]
  Partial<IBPhotos>[]
> => {
  const result = await Promise.all(
    photos.map(async p => {
      return {
        id: p.id,
        url: await (async (): Promise<string> => {
          if (photos.length > 0) {
            if (!isNil(p.key) && !isEmpty(p.key)) {
              /// s3 key가 존재하는 경우
              const signedUrl = await getS3SignedUrl(p.key);
              return signedUrl;
            }

            if (!isNil(p.url) && !isEmpty(p.url)) {
              /// 직접접근 링크 url이 존재하는 경우
              return p.url;
            }
          }
          return 'none';
        })(),
        // smallUrl: await (async (): Promise<string> => {
        //   if (photos.length > 0) {
        //     if (!isNil(p.smallUrl) && !isEmpty(p.smallUrl)) {
        //       /// 직접접근 링크 smallUrl이 존재하는 경우
        //       return p.smallUrl;
        //     }

        //     if (!isNil(p.smallKey) && !isEmpty(p.smallKey)) {
        //       /// s3 smallKey가 존재하는 경우
        //       const signedUrl = await getS3SignedUrl(p.smallKey);
        //       return signedUrl;
        //     }
        //   }
        //   return 'none';
        // })(),
      } as Partial<IBPhotos>;
    }),
  );
  return result;
};
