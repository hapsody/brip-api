import express, { Express } from 'express';
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
  ibTravelTagCategorize,
  IBTravelTagList,
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
  tagId?: number;
  tagName?: string;
  direction?: 'up' | 'down';
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
      const { tagId, tagName, direction } = param;

      const result = await doAllTagTreeTraversal({
        ...(!isNil(tagId) &&
          !isEmpty(tagId) &&
          !isNaN(tagId) && { tagId: Number(tagId) }),
        tagName,
        direction,
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
      const { pathArr } = param;

      // const result = await doSubTreeTraversal(Number(tagId));
      // const result = await doAllTagTreeTraversal(Number(tagId), 'up');
      // const result = await doSuperTreeTraversal(Number(tagId));
      const result = await getPartialMatchedPathTags({ pathArr });

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
  pathArr: string[];
  // tagIdArr?: string[];
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
      const {
        pathArr,
        // , tagIdArr
      } = param;

      const result = await getMatchedAllPathTags({
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

export type AddTagPathRequestType = Pick<IBTravelTagList, 'ibType'>;
export interface AddTagPathSuccessResType {}

export type AddTagPathResType = Omit<IBResFormat, 'IBparams'> & {
  IBparams: AddTagPathSuccessResType | {};
};

export const addTagPathWrapper = asyncWrapper(
  async (
    req: Express.IBTypedReqBody<AddTagPathRequestType>,
    res: Express.IBTypedResponse<AddTagPathResType>,
  ) => {
    try {
      const param = req.body;

      const result = await ibTravelTagCategorize({
        ibType: {
          ...param.ibType,
          minDifficulty: Number(param.ibType.minDifficulty),
          maxDifficulty: Number(param.ibType.maxDifficulty),
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

export default devTagOperationRouter;
