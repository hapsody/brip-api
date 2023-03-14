import express, { Express } from 'express';
import multer from 'multer';

import {
  ibDefs,
  asyncWrapper,
  IBResFormat,
  IBError,
  accessTokenValidCheck,
  s3FileUpload,
  getS3SignedUrl,
  putS3SignedUrl,
  s3,
} from '@src/utils';

const upload = multer();

const settingRouter: express.Application = express();

export type S3FileUploadRequestType = {};
export interface S3FileUploadSuccessResType {
  signedUrl: string;
}

export type S3FileUploadResType = Omit<IBResFormat, 'IBparams'> & {
  IBparams: S3FileUploadSuccessResType[] | {};
};

export const s3FileUploadWrapper = asyncWrapper(
  async (
    req: Express.IBTypedReqBody<S3FileUploadRequestType>,
    res: Express.IBTypedResponse<S3FileUploadResType>,
  ) => {
    try {
      const { locals } = req;
      const userTokenId = (() => {
        if (locals && locals?.grade === 'member')
          return locals?.user?.userTokenId;
        return locals?.tokenId;
        // throw new IBError({
        //   type: 'NOTAUTHORIZED',
        //   message: 'member 등급만 접근 가능합니다.',
        // });
      })();

      if (!userTokenId) {
        throw new IBError({
          type: 'NOTEXISTDATA',
          message: '정상적으로 부여된 userTokenId를 가지고 있지 않습니다.',
        });
      }

      const files = req.files as Express.Multer.File[];

      const uploadPromises = files.map((file: Express.Multer.File) => {
        return s3FileUpload({
          fileName: `${file.originalname}`,
          fileData: file.buffer,
        });
      });

      const [{ Key: key }] = await Promise.all(uploadPromises);

      const signedProfileImgUrl = await getS3SignedUrl(`${key}`);

      res.json({
        ...ibDefs.SUCCESS,
        IBparams: {
          signedUrl: signedProfileImgUrl,
        },
      });
    } catch (err) {
      if (err instanceof IBError) {
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

export type GetPresignedUrlFromS3FileRequestType = {
  key: string;
};
export interface GetPresignedUrlFromS3FileSuccessResType {
  key: string;
  signedUrl: string;
}

export type GetPresignedUrlFromS3FileResType = Omit<IBResFormat, 'IBparams'> & {
  IBparams: GetPresignedUrlFromS3FileSuccessResType[] | {};
};

export const getPresignedUrlFromS3File = asyncWrapper(
  async (
    req: Express.IBTypedReqBody<GetPresignedUrlFromS3FileRequestType>,
    res: Express.IBTypedResponse<GetPresignedUrlFromS3FileResType>,
  ) => {
    try {
      const { locals } = req;
      const userTokenId = (() => {
        if (locals && locals?.grade === 'member')
          return locals?.user?.userTokenId;
        return locals?.tokenId;
        // throw new IBError({
        //   type: 'NOTAUTHORIZED',
        //   message: 'member 등급만 접근 가능합니다.',
        // });
      })();

      if (!userTokenId) {
        throw new IBError({
          type: 'NOTEXISTDATA',
          message: '정상적으로 부여된 userTokenId를 가지고 있지 않습니다.',
        });
      }

      const { key } = req.body;

      const signedUrl = await getS3SignedUrl(`${key}`);

      res.json({
        ...ibDefs.SUCCESS,
        IBparams: {
          key,
          signedUrl,
        },
      });
    } catch (err) {
      if (err instanceof IBError) {
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

export type ReqUriForPutObjectToS3RequestType = {
  key: string;
};
export interface ReqUriForPutObjectToS3SuccessResType {
  key: string;
  signedUrl: string;
}

export type ReqUriForPutObjectToS3ResType = Omit<IBResFormat, 'IBparams'> & {
  IBparams: ReqUriForPutObjectToS3SuccessResType[] | {};
};

export const reqUriForPutObjectToS3 = asyncWrapper(
  async (
    req: Express.IBTypedReqBody<ReqUriForPutObjectToS3RequestType>,
    res: Express.IBTypedResponse<ReqUriForPutObjectToS3ResType>,
  ) => {
    try {
      const { locals } = req;
      const userTokenId = (() => {
        if (locals && locals?.grade === 'member')
          return locals?.user?.userTokenId;
        return locals?.tokenId;
        // throw new IBError({
        //   type: 'NOTAUTHORIZED',
        //   message: 'member 등급만 접근 가능합니다.',
        // });
      })();

      if (!userTokenId) {
        throw new IBError({
          type: 'NOTEXISTDATA',
          message: '정상적으로 부여된 userTokenId를 가지고 있지 않습니다.',
        });
      }

      const { key } = req.body;

      const signedUrl = await putS3SignedUrl(`${key}`);

      res.json({
        ...ibDefs.SUCCESS,
        IBparams: {
          key,
          signedUrl,
        },
      });
    } catch (err) {
      if (err instanceof IBError) {
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

export interface PrismaTestRequestType {
  key: string;
}
export interface PrismaTestSuccessResType {}

export type PrismaTestResType = Omit<IBResFormat, 'IBparams'> & {
  IBparams: PrismaTestSuccessResType | {};
};

export const prismaTest = asyncWrapper(
  async (
    req: Express.IBTypedReqBody<PrismaTestRequestType>,
    res: Express.IBTypedResponse<PrismaTestResType>,
  ) => {
    try {
      const param = req.body;
      const { key } = param;
      const s3Resp = await s3
        .getObject({
          Bucket: process.env.AWS_S3_BUCKET ?? '',
          Key: key,
        })
        .promise();

      res.json({
        ...ibDefs.SUCCESS,
        IBparams: s3Resp,
      });
    } catch (err) {
      if (err instanceof IBError) {
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

settingRouter.post(
  '/s3FileUpload',
  accessTokenValidCheck,
  [upload.array('files', 10)],
  s3FileUploadWrapper,
);
settingRouter.post(
  '/getUrlFromS3',
  accessTokenValidCheck,
  getPresignedUrlFromS3File,
);
settingRouter.post('/prismaTest', prismaTest);
settingRouter.post(
  '/reqUriForPutObjectToS3',
  accessTokenValidCheck,
  reqUriForPutObjectToS3,
);

export default settingRouter;
