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
  delObjectsFromS3,
} from '@src/utils';
import { isNil, isEmpty } from 'lodash';
import {
  ValueType,
  value as tpRawData,
} from 'src/prisma/seeds/tourPlace/data.go.kr';

import fs from 'fs';
import axios from 'axios';

const upload = multer();

const utilRouter: express.Application = express();

export interface UploadToS3RequestType {
  apiPath: string; /// 이 api 요청으로 업로드된 파일 패스(s3 key)를 줄 apiPath ex) /content/addTripMemory
  fileName: string; /// 업로드 하려는 파일 이름
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
      const { apiPath, fileName } = req.body;
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

      if (
        isNil(apiPath) ||
        isEmpty(apiPath) ||
        isNil(fileName) ||
        isEmpty(fileName)
      ) {
        throw new IBError({
          type: 'INVALIDPARAMS',
          message: 'apiPath, fileName은 필수 파라미터입니다.',
        });
      }
      const correctedPath = (() => {
        let mApiPath = apiPath;
        if (apiPath[0] === '/') mApiPath = apiPath.slice(1).toUpperCase();

        switch (mApiPath) {
          case 'TRIPNETWORK/ADDTRIPMEMORY':
            return `private/tripNetwork/tripMemory/${fileName}`;
          case 'TRIPNETWORK/ADDSHARETRIPMEMORY':
            return `public/tripNetwork/shareTripMemory/${fileName}`;
          case 'SETTING/CHANGEPROFILEIMG':
            return `public/user/profileImg/${fileName}`;
          case 'CONTENT/ADDCARDGRP/THUMBNAILURL':
            return `public/content/cardNewsGroup/${fileName}`;
          case 'CONTENT/ADDCARDGRP/CARDNEWSCONTENT/BGPICURI':
            return `public/content/cardNewsContent/${fileName}`;
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
          console.error(err);
          res.status(400).json({
            ...ibDefs.INVALIDPARAMS,
            IBdetail: (err as Error).message,
            IBparams: {} as object,
          });
          return;
        }
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

export interface GetSignedUrlForFileUploadRequestType {
  apiPath: string; /// 이 api 요청으로 업로드된 파일 패스(s3 key)를 줄 apiPath ex) /content/addTripMemory
  fileName: string; /// 업로드 하려는 파일 이름
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
      const { apiPath, fileName } = req.body;
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

      if (
        isNil(apiPath) ||
        isEmpty(apiPath) ||
        isNil(fileName) ||
        isEmpty(fileName)
      ) {
        throw new IBError({
          type: 'INVALIDPARAMS',
          message: 'apiPath, fileName은 필수 파라미터입니다.',
        });
      }
      const correctedPath = (() => {
        let mApiPath = apiPath;
        if (apiPath[0] === '/') mApiPath = apiPath.slice(1).toUpperCase();

        switch (mApiPath) {
          case 'TRIPNETWORK/ADDTRIPMEMORY':
            return `private/tripNetwork/tripMemory/${fileName}`;
          case 'TRIPNETWORK/ADDSHARETRIPMEMORY':
            return `public/tripNetwork/shareTripMemory/${fileName}`;
          case 'SETTING/CHANGEPROFILEIMG':
            return `public/user/profileImg/${fileName}`;
          case 'CONTENT/ADDCARDGRP/THUMBNAILURL':
            return `public/content/cardNewsGroup/${fileName}`;
          case 'CONTENT/ADDCARDGRP/CARDNEWSCONTENT/BGPICURI':
            return `public/content/cardNewsContent/${fileName}`;
          case 'MYPAGE/REGISTADPLACE':
            return `public/myPage/adPlaceImg/${fileName}`;
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
          console.error(err);
          res.status(400).json({
            ...ibDefs.INVALIDPARAMS,
            IBdetail: (err as Error).message,
            IBparams: {} as object,
          });
          return;
        }
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

export interface OpenaiRequestType {
  msg: string;
}
export interface OpenaiSuccessResType {}

export type OpenaiResType = Omit<IBResFormat, 'IBparams'> & {
  IBparams: OpenaiSuccessResType | {};
};

export const requestToOpenai = asyncWrapper(
  async (
    req: Express.IBTypedReqBody<OpenaiRequestType>,
    res: Express.IBTypedResponse<OpenaiResType>,
  ) => {
    try {
      // const { msg } = req.body;
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

      await new Promise(resolve => {
        setTimeout(() => {
          resolve(true);
        }, 100);
      });

      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      (async (): Promise<void> => {
        // eslint-disable-next-line no-restricted-syntax
        for await (const record of Object.entries(tpRawData)) {
          const [, vList]: [string, ValueType[]] = record;
          // eslint-disable-next-line no-restricted-syntax
          for await (const v of vList) {
            const data = {
              title: v.관광지명,
              lat: v.위도,
              lng: v.경도,
              desc: v.관광지소개 ?? null,
            };

            let fail = false;
            console.log(`\n${v.관광지명}...`);
            do {
              try {
                fail = false;
                // eslint-disable-next-line no-await-in-loop
                const result = await axios.post(
                  'https://api.openai.com/v1/chat/completions',
                  {
                    model: 'gpt-3.5-turbo',
                    messages: [
                      {
                        role: 'user',
                        content: `다음 json 형식으로 주어진 관광지 데이터를 내가 주는 카테고리 리스트들 중 가장 올바르다고 생각하는 하나만 선택해서 분류를 하고 싶어. 
    \`\`\`관광지 데이터: ${JSON.stringify(data)}\`\`\`
    \`\`\`카티고리 리스트: 
    oceanActivity
    beach
    snorkeling
    fishing
    sailing
    jetBoat
    surfing
    paddleBoard
    kayak
    cruise
    landActivity
    cartRacing
    ATV
    horseRiding
    farm
    ticket
    cableCar
    golf
    lugeRacing
    mountainActivity
    climbing
    groupHiking
    rockClimbing
    MTB
    UTV
    zipTrack
    paragliding
    ski
    snowBoard
    naturalSpot
    shoreline
    oreum
    circumferenceTrail
    rocks
    forest
    arboreteum
    river
    mountain
    hill
    island
    park
    garden
    ocean
    nationalPark
    etc
    historicalSpot
    themePark
    amusementPark
    waterPark
    museum
    aquarium
    shopping
    \`\`\`

    답변은 관광지 
    
    "관광지 이름": "카테고리"
    
    의 배열로 줬으면 좋겠어, 이 포맷을 제외한 다른 형태의 문장식 답변은 필요없어
    다음은 답변의 예시야 
    
    "고석정": "naturalSpot"

    `,
                      },
                    ],
                    temperature: 0.2,
                  },
                  {
                    headers: {
                      Authorization: `Bearer ${
                        process.env.OPENAI_API_KEY as string
                      }`,
                    },
                  },
                );

                console.log(JSON.stringify(result.data, null, 2));
                fs.writeFileSync(
                  'category_result.txt',
                  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                  `${result.data.choices[0].message.content as string}`,
                  { flag: 'as+' },
                );
                // rList.push(result.data as string);
              } catch (error) {
                console.log('retry');
                fail = true;
              }

              // eslint-disable-next-line no-await-in-loop
              await new Promise(resolve => {
                setTimeout(() => {
                  resolve(true);
                }, 10000);
              });
            } while (fail);
          }
        }
      })().then(() => {});

      // const rList: string[] = [];
      // // eslint-disable-next-line no-restricted-syntax
      // for await (const record of Object.entries(tpRawData)) {
      //   const [, vList]: [string, ValueType[]] = record;
      //   // eslint-disable-next-line no-restricted-syntax
      //   for await (const v of vList) {
      //     const data = {
      //       title: v.관광지명,
      //       lat: v.위도,
      //       lng: v.경도,
      //       desc: v.관광지소개 ?? null,
      //     };

      //     const result = await axios.post(
      //       'https://api.openai.com/v1/chat/completions',
      //       {
      //         model: 'gpt-3.5-turbo',
      //         messages: [
      //           {
      //             role: 'user',
      //             content: `다음 json 형식으로 주어진 관광지 데이터를 내가 주는 카테고리 리스트들 중 선택해서(다중선택 가능) 분류를 하고 싶어.
      //             \`\`\`관광지 데이터: ${JSON.stringify(data)}\`\`\`
      //             \`\`\`카티고리 리스트:
      //             oceanActivity
      //             beach
      //             snorkeling
      //             fishing
      //             sailing
      //             jetBoat
      //             surfing
      //             paddleBoard
      //             kayak
      //             cruise
      //             landActivity
      //             cartRacing
      //             ATV
      //             horseRiding
      //             farm
      //             ticket
      //             cableCar
      //             golf
      //             lugeRacing
      //             mountainActivity
      //             climbing
      //             groupHiking
      //             rockClimbing
      //             MTB
      //             UTV
      //             zipTrack
      //             paragliding
      //             ski
      //             snowBoard
      //             naturalSpot
      //             shoreline
      //             oreum
      //             circumferenceTrail
      //             rocks
      //             forest
      //             arboreteum
      //             river
      //             mountain
      //             hill
      //             island
      //             park
      //             garden
      //             ocean
      //             nationalPark
      //             etc
      //             historicalSpot
      //             themePark
      //             amusementPark
      //             waterPark
      //             museum
      //             aquarium
      //             shopping
      //             \`\`\`

      //             답변은 관광지

      //             "관광지 이름": "카테고리 1", "카테고리 2", ...

      //             의 배열로 줬으면 좋겠어, 이 포맷을 제외한 다른 형태의 문장식 답변은 필요없어
      //             다음은 답변의 예시야

      //             "고석정": "naturalSpot"

      //             `,
      //           },
      //         ],
      //         temperature: 0.2,
      //       },
      //       {
      //         headers: {
      //           Authorization: `Bearer ${process.env.OPENAI_API_KEY as string}`,
      //         },
      //       },
      //     );

      //     console.log(JSON.stringify(result.data, null, 2));
      //     fs.writeFileSync(
      //       'category_result.txt',
      //       result.data.choices[0].message.content as string,
      //       { flag: 'a+' },
      //     );
      //     rList.push(result.data as string);

      //     await new Promise(resolve => {
      //       setTimeout(() => {
      //         resolve(true);
      //       }, 10000);
      //     });
      //   }
      // }

      res.json({
        ...ibDefs.SUCCESS,
        IBparams: {
          // answer: rList as Object,
        },
      });
    } catch (err) {
      console.error(JSON.stringify(err, null, 2));

      throw err;
    }
  },
);

export interface DelFromS3RequestType {
  objKeys: string[]; /// 지우고자 하는 s3 object 키들
}
export interface DelFromS3SuccessResType {}

export type DelFromS3ResType = Omit<IBResFormat, 'IBparams'> & {
  IBparams: DelFromS3SuccessResType | {};
};

/**
 * getSignedUrlForFileUpload를 이용해주세요. 본 api는 개발용 api로 남겨둡니다.
 * (deprecated) brip 서비스에서 사용될 파일들을(이미지, 또는 첨부파일) S3에 업로드하기위한 공통 api
 * 본 api를 통해 업로드된 파일의 S3 Path(key)가 사용될 api의 이름을 apiPath로 주어야한다.
 * 멤버 레벨의 accessToken 권한이 필요하다.
 */
export const delFromS3 = asyncWrapper(
  async (
    req: Express.IBTypedReqBody<DelFromS3RequestType>,
    res: Express.IBTypedResponse<DelFromS3ResType>,
  ) => {
    try {
      const { objKeys } = req.body;
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

      if (isNil(objKeys) && isEmpty(objKeys)) {
        throw new IBError({
          type: 'INVALIDPARAMS',
          message: 'objKeys은 필수 파라미터입니다.',
        });
      }

      await delObjectsFromS3(objKeys);

      res.json({
        ...ibDefs.SUCCESS,
        IBparams: {},
      });
    } catch (err) {
      if (err instanceof IBError) {
        if (err.type === 'INVALIDPARAMS') {
          console.error(err);
          res.status(400).json({
            ...ibDefs.INVALIDPARAMS,
            IBdetail: (err as Error).message,
            IBparams: {} as object,
          });
          return;
        }
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

utilRouter.post(
  '/uploadToS3',
  accessTokenValidCheck,
  [upload.array('files', 10)],
  uploadToS3,
);

utilRouter.post(
  '/getSignedUrlForFileUpload',
  accessTokenValidCheck,
  getSignedUrlForFileUpload,
);

utilRouter.post('/requestToOpenai', accessTokenValidCheck, requestToOpenai);
utilRouter.post('/delFromS3', accessTokenValidCheck, delFromS3);

export default utilRouter;
