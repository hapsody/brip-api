/* eslint-disable @typescript-eslint/no-loop-func */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-continue */
import { PrismaClient } from '@prisma/client';
import { s3FileUpload } from '@src/utils/aws/s3';
import { isNil, isEmpty } from 'lodash';
import axios from 'axios';

const prisma = new PrismaClient();

async function movePhotoFromTourAPI4ToS3(uri: string): Promise<string | null> {
  // eslint-disable-next-line no-restricted-syntax, @typescript-eslint/naming-convention, @typescript-eslint/no-unused-vars
  for await (const [index, v] of Array(5).entries()) {
    try {
      const axiosRes = await axios.get<ArrayBuffer>(uri, {
        responseType: 'arraybuffer',
        timeout: 10000,
      });
      const imgData = axiosRes.data;
      const imgFileName = uri.split('/').at(-1);
      if (isNil(imgFileName)) return null;

      const s3Key = `public/tourPlace/tourAPI4/${imgFileName}`;
      await s3FileUpload({
        fileName: s3Key,
        fileData: Buffer.from(imgData),
      });
      return s3Key;
    } catch (err) {
      console.log(`img download error.. retrying... ${index + 1}`);
      // interval for low computing power
      await new Promise(resolve => {
        setTimeout(() => {
          resolve(true);
        }, 100);
      });
      console.error(JSON.stringify(err, null, 2));
    }
  }

  console.log('Too many times Image download feiled..');
  return null;
}

async function tourApiImageMigrationToS3BatchJob(): Promise<void> {
  let updated = 0;
  let skipped = 0;
  let failedToStoreS3 = 0;

  const getNextPhotos = {
    [Symbol.asyncIterator]() {
      const take = 100;
      let cursor = {
        id: 1,
      };

      return {
        async next() {
          const iBPhotos = await prisma.iBPhotos.findMany({
            take,
            cursor,
          });
          console.log(
            `data from ${cursor.id} to ${iBPhotos[iBPhotos.length - 1].id}`,
          );
          if (isEmpty(iBPhotos) || iBPhotos.length === 1) {
            return { done: true, value: iBPhotos };
          }

          cursor = {
            id: iBPhotos[iBPhotos.length - 1].id,
          };

          return { done: false, value: iBPhotos };
        },
      };
    },
  };
  // // parallel processing(for speed)
  // for await (const photoPage of getNextPhotos) {
  //   const updatePhotoPromises = photoPage.map(async photo => {
  //     if (isNil(photo.url) || isEmpty(photo.url) || !isEmpty(photo.key)) {
  //       console.log(`${photo.id} skipped..`);
  //       skipped += 1;
  //       return Promise.resolve();
  //     }

  //     const s3Key = await movePhotoFromTourAPI4ToS3(photo.url);
  //     failedToStoreS3 += 1;
  //     if (isNil(s3Key)) {
  //       return Promise.resolve();
  //     }
  //     await prisma.iBPhotos.update({
  //       where: {
  //         id: photo.id,
  //       },
  //       data: {
  //         key: s3Key,
  //       },
  //     });
  //     console.log(`${photo.id} updated!! (${s3Key})`);
  //     updated += 1;
  //     return Promise.resolve();
  //   });

  //   await Promise.all(updatePhotoPromises);
  // }

  // sequential processing (for low resource usage)
  for await (const photoPage of getNextPhotos) {
    // const updatePhotoPromises = photoPage.map(async photo => {
    for await (const photo of photoPage) {
      if (isNil(photo.url) || isEmpty(photo.url) || !isEmpty(photo.key)) {
        // 1. 이미 s3key로 변환되었거나
        // 2. url이 없는 경우는 skip

        console.log(`${photo.id} skipped..`);
        skipped += 1;
        continue;
        // return Promise.resolve();
      }

      const s3Key = await movePhotoFromTourAPI4ToS3(photo.url);
      failedToStoreS3 += 1;
      if (isNil(s3Key)) {
        // return Promise.resolve();
        continue;
      }
      await prisma.iBPhotos.update({
        where: {
          id: photo.id,
        },
        data: {
          key: s3Key,
        },
      });

      // interval for low computing power
      await new Promise(resolve => {
        setTimeout(() => {
          resolve(true);
        }, 100);
      });

      console.log(`${photo.id} updated!! (${s3Key})`);
      updated += 1;
      // return Promise.resolve();
    }
  }

  const updatedDoubleCheckCount = await prisma.iBPhotos.count({
    where: {
      key: { not: null },
      url: {
        not: null,
      },
    },
  });

  const remaining = await prisma.iBPhotos.count({
    where: {
      key: null,
      url: {
        not: null,
      },
    },
  });

  console.log(
    `updated: ${updated}[${updatedDoubleCheckCount}], skipped: ${skipped}`,
  );
  console.log(`failedToStoreS3: ${failedToStoreS3}, ramaining: ${remaining}`);
}

function wrapper(func: () => Promise<void>): () => void {
  return () => {
    func().catch(e => console.error(e));
  };
}

tourApiImageMigrationToS3BatchJob()
  .catch(e => {
    console.error(e);
  })
  .finally(
    wrapper(async () => {
      await prisma.$disconnect();
      process.exit(0);
    }),
  );

// movePhotoFromTourAPI4ToS3(
//   'https://tong.visitkorea.or.kr/cms/resource/33/1727233_image2_1.jpg',
// )
//   .catch(e => {
//     console.error(e);
//   })
//   .finally(
//     wrapper(async () => {
//       await prisma.$disconnect();
//       process.exit(0);
//     }),
//   );

export default tourApiImageMigrationToS3BatchJob;
