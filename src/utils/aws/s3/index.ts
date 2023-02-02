// import AWS from 'aws-sdk';
import fs from 'fs';
import randomstring from 'randomstring';
import * as AWS from 'aws-sdk';

export const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
  params: { timeout: 6000000 },
});

export const getS3SignedUrl = async (
  s3ObjectKey: string,
  Expires?: number,
): Promise<string> => {
  const signedUrl = await s3.getSignedUrlPromise('getObject', {
    Bucket: process.env.AWS_S3_BUCKET,
    Key: s3ObjectKey,
    Expires: Expires ?? 30,
  });
  return signedUrl;
};

export const putS3SignedUrl = async (
  s3ObjectKey: string,
  Expires?: number,
): Promise<string> => {
  const signedUrl = await s3.getSignedUrlPromise('putObject', {
    Bucket: process.env.AWS_S3_BUCKET,
    Key: s3ObjectKey,
    Expires: Expires ?? 30,
  });
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
