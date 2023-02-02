import express, { Express } from 'express';
import prisma from '@src/prisma';
import {
  ibDefs,
  asyncWrapper,
  IBResFormat,
  IBError,
  accessTokenValidCheck,
} from '@src/utils';
import { TripMemoryGroup } from '@prisma/client';

const tripNetworkRouter: express.Application = express();

export type AddTripMemGrpRequestType = {
  groupName: string;
};
export interface AddTripMemGrpSuccessResType extends TripMemoryGroup {}

export type AddTripMemGrpResType = Omit<IBResFormat, 'IBparams'> & {
  IBparams: AddTripMemGrpSuccessResType | {};
};

export const addTripMemGrp = asyncWrapper(
  async (
    req: Express.IBTypedReqBody<AddTripMemGrpRequestType>,
    res: Express.IBTypedResponse<AddTripMemGrpResType>,
  ) => {
    try {
      const { groupName } = req.body;
      const { locals } = req;
      const { memberId, userTokenId } = (() => {
        if (locals && locals?.grade === 'member')
          return {
            memberId: locals?.user?.id,
            userTokenId: locals?.user?.userTokenId,
          };
        // return locals?.tokenId;
        throw new IBError({
          type: 'NOTAUTHORIZED',
          message: 'member 등급만 접근 가능합니다.',
        });
      })();

      if (!userTokenId || !memberId) {
        throw new IBError({
          type: 'NOTEXISTDATA',
          message: '정상적으로 부여된 userTokenId를 가지고 있지 않습니다.',
        });
      }

      const tripMemoryGroup = await prisma.tripMemoryGroup.findUnique({
        where: {
          name_userId: {
            name: groupName,
            userId: memberId,
          },
        },
      });

      if (tripMemoryGroup)
        throw new IBError({
          type: 'DUPLICATEDDATA',
          message: '이미 존재하는 그룹이름 입니다.',
        });

      const createdGroup = await prisma.tripMemoryGroup.create({
        data: {
          name: groupName,
          userId: memberId,
        },
      });

      res.json({
        ...ibDefs.SUCCESS,
        IBparams: createdGroup,
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

export type GetTripMemGrpListRequestType = {
  skip: string;
  take: string;
};
export interface GetTripMemGrpListSuccessResType extends TripMemoryGroup {}

export type GetTripMemGrpListResType = Omit<IBResFormat, 'IBparams'> & {
  IBparams: GetTripMemGrpListSuccessResType | {};
};

export const getTripMemGrpList = asyncWrapper(
  async (
    req: Express.IBTypedReqBody<GetTripMemGrpListRequestType>,
    res: Express.IBTypedResponse<GetTripMemGrpListResType>,
  ) => {
    try {
      const { skip, take } = req.body;
      const { locals } = req;
      const { memberId, userTokenId } = (() => {
        if (locals && locals?.grade === 'member')
          return {
            memberId: locals?.user?.id,
            userTokenId: locals?.user?.userTokenId,
          };
        // return locals?.tokenId;
        throw new IBError({
          type: 'NOTAUTHORIZED',
          message: 'member 등급만 접근 가능합니다.',
        });
      })();

      if (!userTokenId || !memberId) {
        throw new IBError({
          type: 'NOTEXISTDATA',
          message: '정상적으로 부여된 userTokenId를 가지고 있지 않습니다.',
        });
      }

      const tripMemoryGroup = await prisma.tripMemoryGroup.findMany({
        where: {
          userId: memberId,
        },
        skip: skip ? Number(skip) : 0,
        take: take ? Number(take) : 10,
      });

      res.json({
        ...ibDefs.SUCCESS,
        IBparams: tripMemoryGroup,
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

// export type AddTripMemoryRequestType = {
//   title: string;
//   comment: string;
//   hashTag?: string[];
//   address?: string;
//   lat: string;
//   lng: string;
//   img: string;
//   groupId: string;
// };
// export interface AddTripMemorySuccessResType {}

// export type AddTripMemoryResType = Omit<IBResFormat, 'IBparams'> & {
//   IBparams: AddTripMemorySuccessResType | {};
// };

// export const addTripMemory = asyncWrapper(
//   async (
//     req: Express.IBTypedReqBody<AddTripMemoryRequestType>,
//     res: Express.IBTypedResponse<AddTripMemoryResType>,
//   ) => {
//     try {
//       const { title, comment, hashTag, address, lat, lng, img, groupId } =
//         req.body;
//       const { locals } = req;
//       const { memberId, userTokenId } = (() => {
//         if (locals && locals?.grade === 'member')
//           return {
//             memberId: locals?.user?.id,
//             userTokenId: locals?.user?.userTokenId,
//           };
//         // return locals?.tokenId;
//         throw new IBError({
//           type: 'NOTAUTHORIZED',
//           message: 'member 등급만 접근 가능합니다.',
//         });
//       })();

//       if (!userTokenId || !memberId) {
//         throw new IBError({
//           type: 'NOTEXISTDATA',
//           message: '정상적으로 부여된 userTokenId를 가지고 있지 않습니다.',
//         });
//       }

//       const tripMemoryGroup = await prisma.tripMemoryGroup.findUnique({
//         where: {
//           name_userId: {
//             name: groupName,
//             userId: memberId,
//           },
//         },
//       });

//       if (tripMemoryGroup)
//         throw new IBError({
//           type: 'DUPLICATEDDATA',
//           message: '이미 존재하는 그룹이름 입니다.',
//         });

//       const createdGroup = await prisma.tripMemoryGroup.create({
//         data: {
//           name: groupName,
//           userId: memberId,
//         },
//       });

//       res.json({
//         ...ibDefs.SUCCESS,
//         IBparams: createdGroup,
//       });
//     } catch (err) {
//       if (err instanceof IBError) {
//         if (err.type === 'NOTAUTHORIZED') {
//           res.status(403).json({
//             ...ibDefs.NOTAUTHORIZED,
//             IBdetail: (err as Error).message,
//             IBparams: {} as object,
//           });
//           return;
//         }

//         if (err.type === 'NOTEXISTDATA') {
//           res.status(404).json({
//             ...ibDefs.NOTEXISTDATA,
//             IBdetail: (err as Error).message,
//             IBparams: {} as object,
//           });
//           return;
//         }

//         if (err.type === 'DBTRANSACTIONERROR') {
//           res.status(500).json({
//             ...ibDefs.DBTRANSACTIONERROR,
//             IBdetail: (err as Error).message,
//             IBparams: {} as object,
//           });
//           return;
//         }
//       }
//       throw err;
//     }
//   },
// );

tripNetworkRouter.post('/addTripMemGrp', accessTokenValidCheck, addTripMemGrp);
tripNetworkRouter.post(
  '/getTripMemGrpList',
  accessTokenValidCheck,
  getTripMemGrpList,
);
// tripNetworkRouter.post('/addTripMemory', accessTokenValidCheck, addTripMemory);

export default tripNetworkRouter;
