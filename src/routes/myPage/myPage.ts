import express from 'express';
import prisma from '@src/prisma';
import { AdPlace } from '@prisma/client';
import {
  ibDefs,
  asyncWrapper,
  IBResFormat,
  IBError,
  accessTokenValidCheck,
} from '@src/utils';
import { isNil, isEmpty, omit } from 'lodash';

const myPageRouter: express.Application = express();

export type RegistAdPlaceRequestType = {
  title: string; /// 상호명
  mainImgUrl: string; /// 대표사진 s3 key 형태의 url 또는 직접접근가능한 http 접두어가 포함된 사진링크.
  photos?: {
    ///  기타 매장 사진
    key: string;
  }[];
  category: {
    primary: string;
    secondary: string;
  }[];
  desc?: string; /// 소개글
  address?: string; /// 지번주소.  도로명주소와 지번주소중 둘중 하나는 반드시 가져야함
  roadAddress?: string; /// 도로명주소
  openWeek?: string; /// 영업시간, 영업요일 ex) Mon: 09:00~20:00, Tue: 09:00~20:00, ...
  closedDay?: string; /// 휴무일, 정기휴무 날짜 혹은 요일 ex) 'SAT, SUN' ...
  contact: string; /// 대표번호
  siteUrl?: string; /// 홈페이지 또는 소셜 계정
  businessNumber?: string; /// 사업자 등록번호, 사업자번호 또는 사업자 등록증 둘중 하나는 반드시 가져야 한다.
  businessRegImgKey?: string; /// 사업자 등록증 첨부사진 s3 key, 사업자번호 또는 사업자 등록증 둘중 하나는 반드시 가져야 한다.
  nationalCode: string; /// 국가 코드. 국제전화번호의 코드이다. 한국 => ex) 82
};
// export interface RegistAdPlaceSuccessResType {
//   groupNo: number;
//   groupId: number;
//   groupTitle: string;
//   groupThumbnail: string;
//   cards: {
//     cardId: number;
//     cardNo: number;
//     tag: CardTag[];
//     cardTitle: string;
//     cardContent: string;
//     cardBgUri: string;
//   }[];
// }

export type RegistAdPlaceResType = Omit<IBResFormat, 'IBparams'> & {
  // IBparams: RegistAdPlaceSuccessResType[] | {};
  IBparams: {};
};

export const registAdPlace = asyncWrapper(
  async (
    req: Express.IBTypedReqBody<RegistAdPlaceRequestType>,
    res: Express.IBTypedResponse<RegistAdPlaceResType>,
  ) => {
    try {
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
      const {
        title,
        mainImgUrl,
        photos,
        category,
        desc,
        address,
        roadAddress,
        openWeek,
        closedDay,
        contact,
        siteUrl,
        businessNumber,
        businessRegImgKey,
        nationalCode,
      } = req.body;

      if (
        isNil(title) ||
        isNil(mainImgUrl) ||
        isNil(category) ||
        isEmpty(category) ||
        (isNil(address) && isNil(roadAddress)) ||
        (isNil(businessNumber) && isNil(businessRegImgKey)) ||
        isNil(nationalCode)
      ) {
        throw new IBError({
          type: 'INVALIDPARAMS',
          message:
            'title, mainImgUrl, category 배열, nationalCode 는 필수 파라미터입니다. address와 roadAddress 둘중 하나는 필수입니다. businessNumber와 businessRegImgKey는 필수입니다.',
        });
      }

      const existCheck = await prisma.adPlace.findFirst({
        where: {
          title,
          address,
          roadAddress,
        },
      });

      if (!isNil(existCheck)) {
        throw new IBError({
          type: 'DUPLICATEDDATA',
          message: '이미 존재하는 AdPlace입니다.',
        });
      }

      await prisma.adPlace.create({
        data: {
          status: 'NEW',
          subscribe: false,
          title,
          mainImgUrl,
          category: {
            connectOrCreate: category.map(v => {
              const { primary, secondary } = v;
              if (isNil(primary) || isNil(secondary)) {
                throw new IBError({
                  type: 'INVALIDPARAMS',
                  message:
                    'category의 primary, secondary는 필수 제출 파라미터입니다.',
                });
              }

              return {
                where: {
                  primary_secondary: {
                    primary,
                    secondary,
                  },
                },
                create: {
                  primary,
                  secondary,
                },
              };
            }),
          },
          ...(!isNil(photos) && {
            photos: {
              createMany: {
                data: photos,
              },
            },
          }),
          desc,
          roadAddress,
          openWeek,
          closedDay,
          contact,
          siteUrl,
          businessNumber,
          nationalCode,
          user: {
            connect: {
              userTokenId,
            },
          },
        },
      });

      res.json({
        ...ibDefs.SUCCESS,
        IBparams: {},
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
        if (err.type === 'DUPLICATEDDATA') {
          res.status(409).json({
            ...ibDefs.DUPLICATEDDATA,
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

export type GetMyAdPlaceRequestType = {};
export type GetMyAdPlaceSuccessResType = Omit<AdPlace, 'userId'>;
export type GetMyAdPlaceResType = Omit<IBResFormat, 'IBparams'> & {
  IBparams: GetMyAdPlaceSuccessResType[] | {};
};

export const getMyAdPlace = asyncWrapper(
  async (
    req: Express.IBTypedReqQuery<GetMyAdPlaceRequestType>,
    res: Express.IBTypedResponse<GetMyAdPlaceResType>,
  ) => {
    try {
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

      const myAdPlaces = await prisma.adPlace.findMany({
        where: {
          user: {
            userTokenId,
          },
        },
      });

      res.json({
        ...ibDefs.SUCCESS,
        IBparams: myAdPlaces.map(v => omit(v, ['userId'])),
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
        if (err.type === 'DUPLICATEDDATA') {
          res.status(409).json({
            ...ibDefs.DUPLICATEDDATA,
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

myPageRouter.post('/registAdPlace', accessTokenValidCheck, registAdPlace);
myPageRouter.get('/getMyAdPlace', accessTokenValidCheck, getMyAdPlace);

export default myPageRouter;
