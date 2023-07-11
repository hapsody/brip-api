import {
  IBPhotos,
  TripMemoryCategory,
  IBPhotoTag,
  IBPhotoMetaInfo,
} from '@prisma/client';
import { isNil } from 'lodash';
import { getS3SignedUrl } from '@src/utils/aws/s3';
import { IBError } from '@src/utils/IBDefinitions';

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
