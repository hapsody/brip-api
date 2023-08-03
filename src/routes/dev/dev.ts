import express, { Express } from 'express';
import multer from 'multer';
import { isNil } from 'lodash';
import fbAdmin from '@src/firebase';
import {
  ibDefs,
  asyncWrapper,
  IBResFormat,
  IBError,
  accessTokenValidCheck,
  s3FileUpload,
  getS3SignedUrl,
  putS3SignedUrl,
  getS3ClientViaAssumeRole,
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
          console.error(err);
          res.status(403).json({
            ...ibDefs.NOTAUTHORIZED,
            IBdetail: (err as Error).message,
            IBparams: {} as object,
          });
          return;
        }
        if (err.type === 'NOTEXISTDATA') {
          console.error(err);
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
          console.error(err);
          res.status(403).json({
            ...ibDefs.NOTAUTHORIZED,
            IBdetail: (err as Error).message,
            IBparams: {} as object,
          });
          return;
        }
        if (err.type === 'NOTEXISTDATA') {
          console.error(err);
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
          console.error(err);
          res.status(403).json({
            ...ibDefs.NOTAUTHORIZED,
            IBdetail: (err as Error).message,
            IBparams: {} as object,
          });
          return;
        }
        if (err.type === 'NOTEXISTDATA') {
          console.error(err);
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
      const s3 = await getS3ClientViaAssumeRole();
      if (isNil(s3)) {
        throw new IBError({
          type: 'EXTERNALAPI',
          message: 'AWS S3 엑세스에 문제가 있습니다.',
        });
      }
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
          console.error(err);
          res.status(403).json({
            ...ibDefs.NOTAUTHORIZED,
            IBdetail: (err as Error).message,
            IBparams: {} as object,
          });
          return;
        }
        if (err.type === 'NOTEXISTDATA') {
          console.error(err);
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

export interface AppPushTestRequestType {
  fcmDeviceToken: string;
}
export interface AppPushTestSuccessResType {}

export type AppPushTestResType = Omit<IBResFormat, 'IBparams'> & {
  IBparams: AppPushTestSuccessResType | {};
};

export const appPushTest = asyncWrapper(
  async (
    req: Express.IBTypedReqBody<AppPushTestRequestType>,
    res: Express.IBTypedResponse<AppPushTestResType>,
  ) => {
    try {
      const { locals } = req;
      const userId = (() => {
        if (locals && locals?.grade === 'member') return locals?.user?.id;
        // return locals?.tokenId;
        throw new IBError({
          type: 'NOTAUTHORIZED',
          message: 'member 등급만 접근 가능합니다.',
        });
      })();
      if (isNil(userId)) {
        throw new IBError({
          type: 'NOTEXISTDATA',
          message: '정상적으로 부여된 userTokenId를 가지고 있지 않습니다.',
        });
      }

      const { fcmDeviceToken } = req.body;

      const fcmToken = fcmDeviceToken;
      const message = {
        notification: {
          title: '시범 데이터 발송',
          body: '클라우드 메시지 전송이 잘 되는지 확인하기 위한, 메시지 입니다.',
        },
        token: fcmToken,
      };

      // admin
      //   .messaging()
      //   .sendToDevice(registrationTokens, payload, options)
      //   .then(response => {
      //     // Response is a message ID string.
      //     console.log('Successfully sent message:', response);
      //   })
      //   .catch(error => {
      //     console.log('Error sending message:', error);
      //   });

      await fbAdmin.messaging().send(message);

      res.json({
        ...ibDefs.SUCCESS,
        IBparams: {},
      });
    } catch (err) {
      if (err instanceof IBError) {
        if (err.type === 'NOTAUTHORIZED') {
          console.error(err);
          res.status(403).json({
            ...ibDefs.NOTAUTHORIZED,
            IBdetail: (err as Error).message,
            IBparams: {} as object,
          });
          return;
        }
        if (err.type === 'NOTEXISTDATA') {
          console.error(err);
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

const clients: express.Response[] = [];
settingRouter.get(
  '/sseSubscribe',
  (req: express.Request, res: express.Response) => {
    const { id } = req.query;
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'text/event-stream',
      Connection: 'keep-alive',
      'Cache-Control': 'no-cache, no-transform',
    };
    res.set(headers);
    res.write('connected');
    clients[Number(id)] = res;
    // clients.add(res);

    // req.on('close', () => {
    //   console.log('clients closed');
    //   clients.clear();
    // });
    req.on('close', () => {
      console.log(`client closed `);
      delete clients[Number(id)];
    });
  },
);

settingRouter.post('/sseEvents', (req, res) => {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const { to } = req.body;
  if (isNil(to)) {
    // eslint-disable-next-line no-restricted-syntax
    clients.forEach((client, i) => {
      client.write(`id: ${i}\n`);
      client.write(`event: EventNo${i}\n`);
      client.write(
        `data: {"message" : "userId: 1242, api는 예약확인 api를 콜하세요. hello SSE ${i}!", "text" : "blah-blah"}\n\n`,
      );
    });
    res.json(200);
    return;
  }

  clients[Number(to)].write(`id: ${to as string}\n`);
  clients[Number(to)].write(`event: EventNo${to as string}\n`);
  clients[Number(to)].write(
    `data: {"message" : "hello SSE ${
      to as string
    }!", "text" : "blah-blah"}\n\n`,
  );
  res.json(200);

  // // eslint-disable-next-line no-restricted-syntax
  // for (const client of clients) {
  //   try {
  //     client.write(
  //       'id: testN1\n' +
  //         'event: red\n' +
  //         'data: {"message" : "hello SSE!", "text" : "blah-blah"}\n\n',
  //     );
  //     // client.end();
  //   } catch (err) {
  //     console.error(err);
  //   }
  // }
  // res.json(200);
});

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
settingRouter.post('/appPushTest', accessTokenValidCheck, appPushTest);

export default settingRouter;
