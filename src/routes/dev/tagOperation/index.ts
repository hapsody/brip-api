import express, { Express } from 'express';
import { IBTravelTag } from '@prisma/client';
import {
  ibDefs,
  asyncWrapper,
  IBResFormat,
  IBError,
  getSubTags,
  getSuperTags,
  getLeafTags,
  getRootTags,
  doAllTagTreeTraversal,
  doSubTreeTraversal,
  doSuperTreeTraversal,
  getPartialMatchedPathTags,
  getMatchedAllPathTags,
  getSuperTagsOfPath,
  addTagPath,
  // IBTravelTagList,
  addTagWithParentPath,
} from '@src/utils';
import { isNil, isEmpty, isNaN } from 'lodash';

const devTagOperationRouter: express.Application = express();

export interface GetSubTagsRequestType {
  tagId: number;
}
export interface GetSubTagsSuccessResType {}

export type GetSubTagsResType = Omit<IBResFormat, 'IBparams'> & {
  IBparams: GetSubTagsSuccessResType | {};
};

export const getSubTagsWrapper = asyncWrapper(
  async (
    req: Express.IBTypedReqBody<GetSubTagsRequestType>,
    res: Express.IBTypedResponse<GetSubTagsResType>,
  ) => {
    try {
      const param = req.body;
      const { tagId } = param;

      const result = await getSubTags(Number(tagId));

      res.json({
        ...ibDefs.SUCCESS,
        IBparams: result,
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

export interface GetSuperTagsRequestType {
  tagId: number;
}
export interface GetSuperTagsSuccessResType {}

export type GetSuperTagsResType = Omit<IBResFormat, 'IBparams'> & {
  IBparams: GetSuperTagsSuccessResType | {};
};

export const getSuperTagsWrapper = asyncWrapper(
  async (
    req: Express.IBTypedReqBody<GetSuperTagsRequestType>,
    res: Express.IBTypedResponse<GetSuperTagsResType>,
  ) => {
    try {
      const param = req.body;
      const { tagId } = param;

      const result = await getSuperTags(Number(tagId));

      res.json({
        ...ibDefs.SUCCESS,
        IBparams: result,
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

export interface GetRootTagsRequestType {
  tagId: number;
}
export interface GetRootTagsSuccessResType {}

export type GetRootTagsResType = Omit<IBResFormat, 'IBparams'> & {
  IBparams: GetRootTagsSuccessResType | {};
};

export const getRootTagsWrapper = asyncWrapper(
  async (
    req: Express.IBTypedReqBody<GetRootTagsRequestType>,
    res: Express.IBTypedResponse<GetRootTagsResType>,
  ) => {
    try {
      const param = req.body;
      const { tagId } = param;

      const result = await getRootTags(Number(tagId));

      res.json({
        ...ibDefs.SUCCESS,
        IBparams: result,
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

export interface DoSuperTreeTraversalRequestType {
  tagId: number;
}
export interface DoSuperTreeTraversalSuccessResType {}

export type DoSuperTreeTraversalResType = Omit<IBResFormat, 'IBparams'> & {
  IBparams: DoSuperTreeTraversalSuccessResType | {};
};

export const doSuperTreeTraversalWrapper = asyncWrapper(
  async (
    req: Express.IBTypedReqBody<DoSuperTreeTraversalRequestType>,
    res: Express.IBTypedResponse<DoSuperTreeTraversalResType>,
  ) => {
    try {
      const param = req.body;
      const { tagId } = param;

      const result = await doSuperTreeTraversal(Number(tagId));

      res.json({
        ...ibDefs.SUCCESS,
        IBparams: result,
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

export interface DoSubTreeTraversalRequestType {
  tagId: number;
}
export interface DoSubTreeTraversalSuccessResType {}

export type DoSubTreeTraversalResType = Omit<IBResFormat, 'IBparams'> & {
  IBparams: DoSubTreeTraversalSuccessResType | {};
};

export const doSubTreeTraversalWrapper = asyncWrapper(
  async (
    req: Express.IBTypedReqBody<DoSubTreeTraversalRequestType>,
    res: Express.IBTypedResponse<DoSubTreeTraversalResType>,
  ) => {
    try {
      const param = req.body;
      const { tagId } = param;

      const result = await doSubTreeTraversal(Number(tagId));

      res.json({
        ...ibDefs.SUCCESS,
        IBparams: result,
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

export interface DoAllTagTreeTraversalRequestType {
  tagId?: string;
  tagName?: string;
}
export interface DoAllTagTreeTraversalSuccessResType {}

export type DoAllTagTreeTraversalResType = Omit<IBResFormat, 'IBparams'> & {
  IBparams: DoAllTagTreeTraversalSuccessResType | {};
};

export const doAllTagTreeTraversalWrapper = asyncWrapper(
  async (
    req: Express.IBTypedReqBody<DoAllTagTreeTraversalRequestType>,
    res: Express.IBTypedResponse<DoAllTagTreeTraversalResType>,
  ) => {
    try {
      const param = req.body;
      const { tagId, tagName } = param;

      const result = await doAllTagTreeTraversal({
        ...(!isNil(tagId) &&
          !isEmpty(tagId) &&
          !isNaN(tagId) && { tagId: Number(tagId) }),

        ...(!isNil(tagName) &&
          !isEmpty(tagName) &&
          !isNaN(tagName) && { tagName }),
      });

      res.json({
        ...ibDefs.SUCCESS,
        IBparams: result,
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

export interface GetLeafTagsRequestType {
  tagId: number;
}
export interface GetLeafTagsSuccessResType {}

export type GetLeafTagsResType = Omit<IBResFormat, 'IBparams'> & {
  IBparams: GetLeafTagsSuccessResType | {};
};

export const getLeafTagsWrapper = asyncWrapper(
  async (
    req: Express.IBTypedReqBody<GetLeafTagsRequestType>,
    res: Express.IBTypedResponse<GetLeafTagsResType>,
  ) => {
    try {
      const param = req.body;
      const { tagId } = param;

      const result = await getLeafTags(Number(tagId));

      res.json({
        ...ibDefs.SUCCESS,
        IBparams: result,
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

export interface GetPartialMatchedPathTagsRequestType {
  tagIdArr: string[];
  pathArr: string[];
}
export interface GetPartialMatchedPathTagsSuccessResType {}

export type GetPartialMatchedPathTagsResType = Omit<IBResFormat, 'IBparams'> & {
  IBparams: GetPartialMatchedPathTagsSuccessResType | {};
};

export const getPartialMatchedPathTagsWrapper = asyncWrapper(
  async (
    req: Express.IBTypedReqBody<GetPartialMatchedPathTagsRequestType>,
    res: Express.IBTypedResponse<GetPartialMatchedPathTagsResType>,
  ) => {
    try {
      const param = req.body;
      const { pathArr, tagIdArr } = param;

      const result = await getPartialMatchedPathTags({
        ...(!isNil(pathArr) && !isEmpty(pathArr) && { pathArr }),
        ...(!isNil(tagIdArr) &&
          !isEmpty(tagIdArr) &&
          tagIdArr.every(v => !isNaN(Number(v))) && {
            tagIdArr: tagIdArr.map(v => Number(v)),
          }),
      });

      res.json({
        ...ibDefs.SUCCESS,
        IBparams: result,
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

export interface GetMatchedAllPathTagsRequestType {
  pathArr?: string[];
  tagIdArr?: string[];
}
export interface GetMatchedAllPathTagsSuccessResType {}

export type GetMatchedAllPathTagsResType = Omit<IBResFormat, 'IBparams'> & {
  IBparams: GetMatchedAllPathTagsSuccessResType | {};
};

export const getMatchedAllPathTagsWrapper = asyncWrapper(
  async (
    req: Express.IBTypedReqBody<GetMatchedAllPathTagsRequestType>,
    res: Express.IBTypedResponse<GetMatchedAllPathTagsResType>,
  ) => {
    try {
      const param = req.body;
      const { pathArr, tagIdArr } = param;

      const result = await getMatchedAllPathTags({
        // pathArr,
        ...(!isNil(pathArr) && {
          pathArr,
        }),
        ...(!isNil(tagIdArr) && {
          tagIdArr: tagIdArr.map(v => Number(v)),
        }),
      });

      res.json({
        ...ibDefs.SUCCESS,
        IBparams: result,
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

export interface GetSuperTagsOfPathRequestType {
  pathArr: string[];
  // tagIds?: string[];
}
export interface GetSuperTagsOfPathSuccessResType {}

export type GetSuperTagsOfPathResType = Omit<IBResFormat, 'IBparams'> & {
  IBparams: GetSuperTagsOfPathSuccessResType | {};
};

export const getSuperTagsOfPathWrapper = asyncWrapper(
  async (
    req: Express.IBTypedReqBody<GetSuperTagsOfPathRequestType>,
    res: Express.IBTypedResponse<GetSuperTagsOfPathResType>,
  ) => {
    try {
      const param = req.body;
      const {
        pathArr,
        //  tagIdArr
      } = param;

      const result = await getSuperTagsOfPath({
        pathArr,
        // ...(!isNil(pathArr) && {
        //   pathArr,
        // }),
        // ...(!isNil(tagIdArr) && {
        //   tagIdArr: tagIdArr.map(v => Number(v)),
        // }),
      });

      res.json({
        ...ibDefs.SUCCESS,
        IBparams: result,
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

export type AddTagPathRequestType = {
  pathArr: string[];
  leafTagData: {
    value: string;
    minDifficulty: string;
    maxDifficulty: string;
  };
};
export interface AddTagPathSuccessResType extends IBTravelTag {}

export type AddTagPathResType = Omit<IBResFormat, 'IBparams'> & {
  IBparams: AddTagPathSuccessResType | {};
};

export const addTagPathWrapper = asyncWrapper(
  async (
    req: Express.IBTypedReqBody<AddTagPathRequestType>,
    res: Express.IBTypedResponse<AddTagPathResType>,
  ) => {
    try {
      const params = req.body;

      const result = await addTagPath({
        ...params,
        leafTagData: {
          ...params.leafTagData,
          minDifficulty: Number(params.leafTagData.minDifficulty),
          maxDifficulty: Number(params.leafTagData.maxDifficulty),
        },
      });

      res.json({
        ...ibDefs.SUCCESS,
        IBparams: result,
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

export type AddTagWithParentPathRequestType = {
  pathArr: string[];
  leafTagData: {
    value: string;
    minDifficulty: string;
    maxDifficulty: string;
  };
};
export type AddTagWithParentPathSuccessResType = IBTravelTag;

export type AddTagWithParentPathResType = Omit<IBResFormat, 'IBparams'> & {
  IBparams: AddTagWithParentPathSuccessResType | {};
};

export const addTagWithParentPathWrapper = asyncWrapper(
  async (
    req: Express.IBTypedReqBody<AddTagWithParentPathRequestType>,
    res: Express.IBTypedResponse<AddTagWithParentPathResType>,
  ) => {
    try {
      const params = req.body;

      const result = await addTagWithParentPath({
        ...params,
        leafTagData: {
          ...params.leafTagData,
          minDifficulty: Number(params.leafTagData.minDifficulty),
          maxDifficulty: Number(params.leafTagData.maxDifficulty),
        },
      });

      res.json({
        ...ibDefs.SUCCESS,
        IBparams: result ?? {},
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

devTagOperationRouter.post('/getSubTags', getSubTagsWrapper);
devTagOperationRouter.post('/getSuperTags', getSuperTagsWrapper);
devTagOperationRouter.post('/getLeafTags', getLeafTagsWrapper);
devTagOperationRouter.post('/getRootTags', getRootTagsWrapper);
devTagOperationRouter.post('/doSubTreeTraversal', doSubTreeTraversalWrapper);
devTagOperationRouter.post(
  '/doSuperTreeTraversal',
  doSuperTreeTraversalWrapper,
);
devTagOperationRouter.post(
  '/doAllTagTreeTraversal',
  doAllTagTreeTraversalWrapper,
);
devTagOperationRouter.post(
  '/getPartialMatchedPathTags',
  getPartialMatchedPathTagsWrapper,
);

devTagOperationRouter.post(
  '/getMatchedAllPathTags',
  getMatchedAllPathTagsWrapper,
);

devTagOperationRouter.post('/getSuperTagsOfPath', getSuperTagsOfPathWrapper);
devTagOperationRouter.post('/addTagPath', addTagPathWrapper);
devTagOperationRouter.post(
  '/addTagWithParentPath',
  addTagWithParentPathWrapper,
);

export default devTagOperationRouter;
