import express, { Express } from 'express';
import multer from 'multer';
import {
  asyncWrapper,
  IBResFormat,
  IBError,
  ibDefs,
  accessTokenValidCheck,
  s3FileUpload,
  putS3SignedUrl,
} from '@src/utils';
import { isNil, isEmpty } from 'lodash';

const upload = multer();

const tripNetworkRouter: express.Application = express();

export interface UploadToS3RequestType {
  apiPath: string; /// 이 api 요청으로 업로드된 파일 패스(s3 key)를 줄 apiPath ex) /content/addTripMemory
}
export interface UploadToS3SuccessResType {}

export type UploadToS3ResType = Omit<IBResFormat, 'IBparams'> & {
  IBparams: UploadToS3SuccessResType | {};
};

/**
 * getSignedUrlForFileUpload를 이용해주세요. 본 api는 개발용 api로 남겨둡니다.
 * (deprecated) brip 서비스에서 사용될 파일들을(이미지, 또는 첨부파일) S3에 업로드하기위한 공통 api
 * 본 api를 통해 업로드된 파일의 S3 Path(key)가 사용될 api의 이름을 apiPath로 주어야한다.
 * 멤버 레벨의 accessToken 권한이 필요하다.
 */
export const uploadToS3 = asyncWrapper(
  async (
    req: Express.IBTypedReqBody<UploadToS3RequestType>,
    res: Express.IBTypedResponse<UploadToS3ResType>,
  ) => {
    try {
      const { apiPath } = req.body;
      const { locals } = req;
      const userTokenId = (() => {
        if (locals && locals?.grade === 'member')
          return locals?.user?.userTokenId;
        // return locals?.tokenId;
        throw new IBError({
          type: 'NOTAUTHORIZED',
          message: 'member 등급만 접근 가능합니다.',
        });
      })();

      if (!userTokenId) {
        throw new IBError({
          type: 'NOTEXISTDATA',
          message: '정상적으로 부여된 userTokenId를 가지고 있지 않습니다.',
        });
      }

      if (isNil(apiPath) || isEmpty(apiPath)) {
        throw new IBError({
          type: 'INVALIDPARAMS',
          message: 'apiPath는 필수 파라미터입니다.',
        });
      }
      const correctedPath = (() => {
        let mApiPath = apiPath;
        if (apiPath[0] === '/') mApiPath = apiPath.slice(1).toUpperCase();

        switch (mApiPath) {
          case 'TRIPNETWORK/ADDTRIPMEMORY':
            return 'private/tripNetwork/tripMemory';
          case 'TRIPNETWORK/ADDSHARETRIPMEMORY':
            return 'private/tripNetwork/shareTripMemory';
          default:
            throw new IBError({
              type: 'INVALIDPARAMS',
              message:
                'apiPath가 등록되지 않은 apiPath입니다. 정확히 입력해주세요',
            });
        }
      })();

      const files = req.files as Express.Multer.File[];

      const uploadPromises = files.map((file: Express.Multer.File) => {
        return s3FileUpload({
          fileName: `${correctedPath}/${file.originalname}`,
          fileData: file.buffer,
        });
      });

      const [{ Key: key }] = await Promise.all(uploadPromises);

      res.json({
        ...ibDefs.SUCCESS,
        IBparams: {
          key,
        },
      });
    } catch (err) {
      if (err instanceof IBError) {
        if (err.type === 'INVALIDPARAMS') {
          res.status(400).json({
            ...ibDefs.INVALIDPARAMS,
            IBdetail: (err as Error).message,
            IBparams: {} as object,
          });
          return;
        }
        if (err.type === 'NOTAUTHORIZED') {
          res.status(403).json({
            ...ibDefs.NOTAUTHORIZED,
            IBdetail: (err as Error).message,
            IBparams: {} as object,
          });
          return;
        }
        if (err.type === 'NOTEXISTDATA') {
          res.status(404).json({
            ...ibDefs.NOTEXISTDATA,
            IBdetail: (err as Error).message,
            IBparams: {} as object,
          });
          return;
        }
      }
      throw err;
    }
  },
);

export interface GetSignedUrlForFileUploadRequestType {
  apiPath: string; /// 이 api 요청으로 업로드된 파일 패스(s3 key)를 줄 apiPath ex) /content/addTripMemory
}
export interface GetSignedUrlForFileUploadSuccessResType {}

export type GetSignedUrlForFileUploadResType = Omit<IBResFormat, 'IBparams'> & {
  IBparams: GetSignedUrlForFileUploadSuccessResType | {};
};

export const getSignedUrlForFileUpload = asyncWrapper(
  async (
    req: Express.IBTypedReqBody<GetSignedUrlForFileUploadRequestType>,
    res: Express.IBTypedResponse<GetSignedUrlForFileUploadResType>,
  ) => {
    try {
      const { apiPath } = req.body;
      const { locals } = req;
      const userTokenId = (() => {
        if (locals && locals?.grade === 'member')
          return locals?.user?.userTokenId;
        // return locals?.tokenId;
        throw new IBError({
          type: 'NOTAUTHORIZED',
          message: 'member 등급만 접근 가능합니다.',
        });
      })();

      if (!userTokenId) {
        throw new IBError({
          type: 'NOTEXISTDATA',
          message: '정상적으로 부여된 userTokenId를 가지고 있지 않습니다.',
        });
      }

      if (isNil(apiPath) || isEmpty(apiPath)) {
        throw new IBError({
          type: 'INVALIDPARAMS',
          message: 'apiPath는 필수 파라미터입니다.',
        });
      }
      const correctedPath = (() => {
        let mApiPath = apiPath;
        if (apiPath[0] === '/') mApiPath = apiPath.slice(1).toUpperCase();

        switch (mApiPath) {
          case 'TRIPNETWORK/ADDTRIPMEMORY':
            return 'private/tripNetwork/tripMemory';
          case 'TRIPNETWORK/ADDSHARETRIPMEMORY':
            return 'private/tripNetwork/shareTripMemory';
          default:
            throw new IBError({
              type: 'INVALIDPARAMS',
              message:
                'apiPath가 등록되지 않은 apiPath입니다. 정확히 입력해주세요',
            });
        }
      })();

      const signedUrl = await putS3SignedUrl(`${correctedPath}`);

      res.json({
        ...ibDefs.SUCCESS,
        IBparams: {
          key: correctedPath,
          signedUrl,
        },
      });
    } catch (err) {
      if (err instanceof IBError) {
        if (err.type === 'INVALIDPARAMS') {
          res.status(400).json({
            ...ibDefs.INVALIDPARAMS,
            IBdetail: (err as Error).message,
            IBparams: {} as object,
          });
          return;
        }
        if (err.type === 'NOTAUTHORIZED') {
          res.status(403).json({
            ...ibDefs.NOTAUTHORIZED,
            IBdetail: (err as Error).message,
            IBparams: {} as object,
          });
          return;
        }
        if (err.type === 'NOTEXISTDATA') {
          res.status(404).json({
            ...ibDefs.NOTEXISTDATA,
            IBdetail: (err as Error).message,
            IBparams: {} as object,
          });
          return;
        }
      }
      throw err;
    }
  },
);
tripNetworkRouter.post(
  '/uploadToS3',
  accessTokenValidCheck,
  [upload.array('files', 10)],
  uploadToS3,
);

tripNetworkRouter.post(
  '/getSignedUrlForFileUpload',
  accessTokenValidCheck,
  getSignedUrlForFileUpload,
);

export default tripNetworkRouter;
