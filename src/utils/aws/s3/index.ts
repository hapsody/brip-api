// import AWS from 'aws-sdk';
import fs from 'fs';
import randomstring from 'randomstring';
import moment from 'moment';
import { isNil, isEmpty } from 'lodash';
import * as AWS from 'aws-sdk';
import { STSClient } from '@aws-sdk/client-sts';
import { IBError } from '../../IBDefinitions';
// Set the AWS Region.
// Create an AWS STS service client object.
// export const s3 = new AWS.S3({
//   accessKeyId: process.env.AWS_ACCESS_KEY,
//   secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
//   region: process.env.AWS_REGION,
//   params: { timeout: 6000000 },
// });
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

class IBAwsS3Client {
  private s3: AWS.S3 | null = null;

  private expiration: moment.Moment = moment();

  private client: STSClient;

  private roleToAssume = {
    RoleArn: process.env.AWS_S3_ASSUME_ROLE_ARN as string, // iam 역할의 arn 값을 넣는다.
    RoleSessionName: `s3-assume-role_${new Date().getTime().toString()}`,
    DurationSeconds: 900, // 900초 ~ 129,600초(36시간) 범위
  };

  constructor() {
    this.client = new STSClient({ region: process.env.AWS_REGION });
  }

  public async getS3Client() {
    const sts = new AWS.STS();

    try {
      const response = await sts.assumeRole(this.roleToAssume).promise();
      // console.log('Credentials : ', response);

      if (isNil(response.Credentials)) return;

      this.expiration = moment(response.Credentials?.Expiration);
      this.s3 = new AWS.S3({
        accessKeyId: response.Credentials?.AccessKeyId,
        secretAccessKey: response.Credentials?.SecretAccessKey,
        sessionToken: response.Credentials?.SessionToken,
      });
    } catch (error) {
      console.log(error);
    }
  }

  get getS3(): AWS.S3 | null {
    return this.s3;
  }

  get getExpiration(): moment.Moment | null {
    return this.expiration;
  }
}

const iBAwsS3Client = new IBAwsS3Client();

export const getS3ClientViaAssumeRole = async (): Promise<AWS.S3 | null> => {
  // eslint-disable-next-line no-restricted-syntax, @typescript-eslint/no-unused-vars
  for await (const i of Array(3)) {
    const s3Res = iBAwsS3Client?.getS3;
    const expiration = iBAwsS3Client?.getExpiration;
    if (
      !isNil(s3Res) &&
      !isNil(expiration) &&
      moment().diff(expiration, 's') < 0
    ) {
      return iBAwsS3Client.getS3 as AWS.S3;
    }
    await iBAwsS3Client.getS3Client();
  }

  return null;
};

export const getS3SignedUrl = async (
  s3ObjectKey: string,
  Expires?: number,
): Promise<string> => {
  if (isNil(s3ObjectKey) || isEmpty(s3ObjectKey)) {
    throw new IBError({
      type: 'INVALIDSTATUS',
      message: 's3ObjectKey는 length가 1이상인 string이어야 합니다.',
    });
  }

  const s3 = await getS3ClientViaAssumeRole();
  if (isNil(s3)) {
    throw new IBError({
      type: 'EXTERNALAPI',
      message: 'AWS S3 엑세스에 문제가 있습니다.',
    });
  }
  const signedUrl = await s3.getSignedUrlPromise('getObject', {
    Bucket: process.env.AWS_S3_BUCKET,
    Key: s3ObjectKey,
    Expires: Expires ?? 300,
  });
  if (
    process.env.EXECUTE_ENV === 'prod' &&
    !isNil(process.env.AWS_CLOUDFRONT_ENDPOINT)
  ) {
    const cloudFrontURL = `${
      process.env.AWS_CLOUDFRONT_ENDPOINT
    }/${s3ObjectKey}?${signedUrl.split(`${s3ObjectKey}?`)[1]}`;
    return cloudFrontURL;
  }
  return signedUrl;
};

export const putS3SignedUrl = async (
  s3ObjectKey: string,
  Expires?: number,
): Promise<string> => {
  if (isNil(s3ObjectKey) || isEmpty(s3ObjectKey)) {
    throw new IBError({
      type: 'INVALIDSTATUS',
      message: 's3ObjectKey는 length가 1이상인 string이어야 합니다.',
    });
  }
  const s3 = await getS3ClientViaAssumeRole();
  if (isNil(s3)) {
    throw new IBError({
      type: 'EXTERNALAPI',
      message: 'AWS S3 엑세스에 문제가 있습니다.',
    });
  }
  const signedUrl = await s3.getSignedUrlPromise('putObject', {
    Bucket: process.env.AWS_S3_BUCKET,
    Key: s3ObjectKey,
    Expires: Expires ?? 300,
  });
  // if (process.env.EXECUTE_ENV === 'prod' && !isNil(process.env.AWS_CLOUDFRONT_ENDPOINT)) {
  //   const cloudFrontURL = `${
  //     process.env.AWS_CLOUDFRONT_ENDPOINT
  //   }/${s3ObjectKey}?${signedUrl.split(`${s3ObjectKey}?`)[1]}`;
  //   return cloudFrontURL;
  // }
  return signedUrl;
};

export const s3FileUpload = async (params: {
  dir?: string;
  fileName?: string;
  fileData?: Buffer;
}): Promise<AWS.S3.ManagedUpload.SendData> => {
  //   const dir = 'src/asset';
  //   const fileName = 'cat.jpeg';
  const { dir, fileName, fileData } = params;

  if ((!dir && !fileName) || !fileData) {
    throw new Error('Neither (dir, fileName) nor fileData has to be null');
  }

  const [key, fileBuffer] = (() => {
    if (dir && fileName) {
      return [fileName, fs.readFileSync(`${dir}/${fileName}`)];
    }
    if (fileName && fileData) {
      return [fileName, fileData];
    }
    return [randomstring.generate(8), fileData];
  })();

  const s3 = await getS3ClientViaAssumeRole();
  if (isNil(s3)) {
    throw new IBError({
      type: 'EXTERNALAPI',
      message: 'AWS S3 엑세스에 문제가 있습니다.',
    });
  }
  const s3Resp = await s3
    .upload({
      Bucket: process.env.AWS_S3_BUCKET ?? '',
      Key: key,
      Body: fileBuffer,
      // ACL: 'public-read',
    })
    .promise();
  console.log('uploaded at location', s3Resp.Location);

  const uploadedBinaryURL = s3Resp.Location;
  console.log(`uploaded binary url ${uploadedBinaryURL}`);
  return s3Resp;
};
