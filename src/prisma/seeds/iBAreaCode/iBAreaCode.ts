import axios from 'axios';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/// https://juso.dev/docs/reg-code-api/
interface BoebjeongdongAPIResult {
  regcodes: { code: string; name: string }[];
}
async function main(): Promise<void> {
  const metroPolisNProvince = await axios.get<BoebjeongdongAPIResult>(
    'https://grpc-proxy-server-mkvo6j4wsq-du.a.run.app/v1/regcodes',
    {
      params: {
        regcode_pattern: '*00000000',
      },
    },
  );
  const metroPolisNProvinceList = metroPolisNProvince.data.regcodes;
  const wholeDistrictRawResult = await Promise.all(
    metroPolisNProvinceList.map(v => {
      const { code } = v;
      const metroPrefix = code.split(/0+/)[0];
      return axios.get<BoebjeongdongAPIResult>(
        'https://grpc-proxy-server-mkvo6j4wsq-du.a.run.app/v1/regcodes',
        {
          params: {
            regcode_pattern: `${metroPrefix}*`,
          },
        },
      );
    }),
  );

  const wholeDistrictList = wholeDistrictRawResult.map(v => v.data.regcodes);

  const createData = wholeDistrictList.flat(2).map(v => {
    const eubmyeondongriName = v.name.split(' ').pop();
    console.log({
      nationalCode: '82',
      areaCode: v.code,
      name: eubmyeondongriName,
    });
    return {
      nationalCode: '82',
      areaCode: v.code,
      name: eubmyeondongriName as string,
    };
  });

  const result = await prisma.iBAreaCode.createMany({
    data: createData,
    skipDuplicates: true,
  });

  console.log(result);
  await prisma.$disconnect();
}

// const wrapper = (func: () => Promise<void>): (() => void) => {
//   return () => {
//     func().catch(e => console.log(e));
//   };
// };

// const seeder = (): void => {
//   main()
//     .catch(e => {
//       console.error(e);
//       process.exit(1);
//     })
//     .finally(
//       wrapper(async () => {
//         await prisma.$disconnect();
//       }),
//     );
// };

// seeder();

export default main;
