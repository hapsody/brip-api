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

export const getAccessableUrl = async (url: string): Promise<string> => {
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
