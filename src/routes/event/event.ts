import express, { Express } from 'express';
import prisma from '@src/prisma';
import {
  ibDefs,
  asyncWrapper,
  IBResFormat,
  IBError,
  accessTokenValidCheck,
} from '@src/utils';
import { isNil, isEmpty } from 'lodash';

const settingRouter: express.Application = express();

export type HawaiiEnglishCampRequestType = {
  childrenAges: string[]; /// 자녀의 인원과 나이, ex) ["7", "10"] => 7세, 10세 두명
  lodge: string; /// 숙박형태 ex) "1" /// 1 => 콘도 스튜디오, 2 => 룸쉐어(공동욕실과 공동 키친)
  period: string; /// 캠프기간 ex) "3",  /// 단위 주
  academy: string; /// 학원선택 ex) "1",  /// 1 => IIE(Institude of Intensive English), 2 => Global Viallge Hawaii, 3 => Hawaii Preparatory Academy, 4 => YMCA in Hawaii, 5 => Bright Beginnings ESL Hawaii
  consultDate: string; /// 상담요청 날짜, ex) 2020-03-01T00:00:00.000Z ISOString
  phone: string; /// ex) +82-1012345678
};
export interface HawaiiEnglishCampSuccessResType {}

export type HawaiiEnglishCampResType = Omit<IBResFormat, 'IBparams'> & {
  IBparams: HawaiiEnglishCampSuccessResType[] | {};
};

export const hawaiiEnglishCamp = asyncWrapper(
  async (
    req: Express.IBTypedReqBody<HawaiiEnglishCampRequestType>,
    res: Express.IBTypedResponse<HawaiiEnglishCampResType>,
  ) => {
    try {
      const param = req.body;
      const { locals } = req;
      const { userTokenId, userId } = (() => {
        if (locals && locals?.grade === 'member')
          return {
            userTokenId: locals?.user?.userTokenId,
            userId: locals?.user?.id,
          };
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

      if (isNil(param.childrenAges) || isEmpty(param.childrenAges)) {
        throw new IBError({
          type: 'INVALIDPARAMS',
          message: 'childrenAges는 반드시 제공되어야 하는 파라미터입니다.',
        });
      }
      if (isNil(param.lodge) || isEmpty(param.lodge)) {
        throw new IBError({
          type: 'INVALIDPARAMS',
          message: 'lodge는 반드시 제공되어야 하는 파라미터입니다.',
        });
      }
      if (isNil(param.period) || isEmpty(param.period)) {
        throw new IBError({
          type: 'INVALIDPARAMS',
          message: 'period는 반드시 제공되어야 하는 파라미터입니다.',
        });
      }
      if (isNil(param.academy) || isEmpty(param.academy)) {
        throw new IBError({
          type: 'INVALIDPARAMS',
          message: 'academy는 반드시 제공되어야 하는 파라미터입니다.',
        });
      }

      if (isNil(param.consultDate) || isEmpty(param.consultDate)) {
        throw new IBError({
          type: 'INVALIDPARAMS',
          message: 'consultDate는 반드시 제공되어야 하는 파라미터입니다.',
        });
      }
      if (isNil(param.phone) || isEmpty(param.phone)) {
        throw new IBError({
          type: 'INVALIDPARAMS',
          message: 'phone는 반드시 제공되어야 하는 파라미터입니다.',
        });
      }

      const pid = await prisma.iBEventPromotion.findFirst({
        where: {
          name: '하와이 영어캠프',
        },
      });

      const createdApplication = await prisma.iBEventApplication.create({
        data: {
          content: JSON.stringify(param),
          ...(isNil(pid)
            ? {
                promotion: {
                  create: {
                    name: '하와이 신혼여행 패키지',
                    desc: '가장 즐겁게 떠나는 하와이 환상여행 패키지',
                    byWhom: 'TRAVA',
                  },
                },
              }
            : {
                promotion: {
                  connectOrCreate: {
                    where: {
                      id: pid.id,
                    },
                    create: {
                      name: '하와이 신혼여행 패키지',
                      desc: '가장 즐겁게 떠나는 하와이 환상여행 패키지',
                      byWhom: 'TRAVA',
                    },
                  },
                },
              }),
          user: {
            connect: {
              id: userId,
            },
          },
        },
      });

      res.json({
        ...ibDefs.SUCCESS,
        IBparams: {
          applicationId: createdApplication.id,
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

        if (err.type === 'DBTRANSACTIONERROR') {
          res.status(500).json({
            ...ibDefs.DBTRANSACTIONERROR,
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
  '/hawaiiEnglishCamp',
  accessTokenValidCheck,
  hawaiiEnglishCamp,
);

export default settingRouter;
