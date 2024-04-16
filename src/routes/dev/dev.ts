// import prisma from '@src/prisma';
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
  // getS3ClientViaAssumeRole,
  // getSubTags,
  // getSuperTags,
  // getLeafTags,
  // doAllTagTreeTraversal,
  // doSubTreeTraversal,
  // doSuperTreeTraversal,
  // getPartialMatchedPathTags,
  getValidUrl,
  retrieveLastSubscriptionReceipt,
} from '@src/utils';
import { retrieveReceiptHistory } from '@src/utils/apple';

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

/**
 * https://androidpublisher.googleapis.com/androidpublisher/v3/applications/com.io.idealbloom.brip/purchases/subscriptions/brip_business_subscribe/tokens/eilgmemiflcnncbdbpkhjphj.AO-J1OwOO0bFvRUp8ryNSBLgVP0hQn1TgOoWirUrMDCKoGWTFy0jkVZomMpO6sSH9u7bRDk3Vmj_HKANZzTF6RybSPVWKjUBUodni-qM2ZKN-VnTq0omCf0
 */
export interface PrismaTestRequestType {
  originalTransacionId: string;
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
      const { originalTransacionId } = req.body;

      const { transactionInfo } = await retrieveLastSubscriptionReceipt(
        originalTransacionId,
      );

      const result = {
        ...(transactionInfo && {
          transactionInfo,
          expireDates: new Date(transactionInfo.expiresDate!).toISOString(),
        }),
      };

      const { history } = await retrieveReceiptHistory(originalTransacionId);

      res.json({
        ...ibDefs.SUCCESS,
        IBparams: {
          lastTransactionInfo: result,
          history,
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
        if (err.type === 'EXTERNALAPI') {
          console.error(err);
          res.status(500).json({
            ...ibDefs.EXTERNALAPI,
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

export interface GetValidUrlTestRequestType {
  siteUrl?: string;
}
export type GetValidUrlTestSuccessResType = string | undefined;

export type GetValidUrlTestResType = Omit<IBResFormat, 'IBparams'> & {
  IBparams: GetValidUrlTestSuccessResType | {};
};

export const getValidUrlTest = asyncWrapper(
  async (
    req: Express.IBTypedReqBody<GetValidUrlTestRequestType>,
    res: Express.IBTypedResponse<GetValidUrlTestResType>,
  ) => {
    try {
      const { siteUrl } = req.body;
      /// https://로 접속하여 유효한 url일 경우에만 https://xxx.xxxx.com 등의 url을 반환한다. 유효하지 않을경우 undefined
      // const formattedHttpsUrl = await (async () => {
      //   const checkURLAccessibility = async (url: string) => {
      //     try {
      //       // HEAD 메소드를 사용하여 자원의 헤더만 가져옵니다.
      //       const response = await axios.head(url);

      //       // 요청이 성공적이고 응답 코드가 2xx 또는 3xx인 경우 접속 가능한 것으로 간주합니다.
      //       if (response.status >= 200 && response.status < 400) return true;

      //       return false;
      //     } catch {
      //       return false;
      //     }
      //   };

      //   let httpsUrl: string | undefined;
      //   /// 1.  유저입력 siteUrl이 없으면 undefined
      //   if (isNil(siteUrl) || isEmpty(siteUrl)) return 'undefined';

      //   /// 2.  유저입력 siteUrl이 http://로 시작하면
      //   if (validUrl.isHttpUri(siteUrl)) {
      //     ///  http:// 만 써있으면 undefined
      //     if (siteUrl.split('http://').length < 2) return 'undefined';

      //     /// http:// 뒤에 url이 써있으면
      //     const url = siteUrl.split('http://')[1];
      //     /// 앞을 https://로 바꿈
      //     httpsUrl = `https://${url}`;
      //     const accessibilityCheck = await checkURLAccessibility(httpsUrl);
      //     return accessibilityCheck ? httpsUrl : 'undefined';
      //   }

      //   /// 3. 유저입력 siteUrl이 존재하고 http://가 아니라 https://로 시작하면 그대로 반환
      //   if (validUrl.isHttpsUri(siteUrl)) {
      //     const accessibilityCheck = await checkURLAccessibility(siteUrl);
      //     return accessibilityCheck ? siteUrl : 'undefined';
      //   }

      //   /// 4. 유저입력 siteUrl이 존재하는데 http:// 또는 https://로 시작하지 않으면 DB 저장안함(undefined)
      //   return 'undefined';
      // })();

      const formattedHttpsUrl = await getValidUrl(siteUrl);

      res.json({
        ...ibDefs.SUCCESS,
        IBparams: formattedHttpsUrl,
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
settingRouter.post('/getValidUrlTest', getValidUrlTest);

export default settingRouter;
