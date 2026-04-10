import type { Recordable } from '@vben/types';

import { requestClient } from '#/api/request';

export namespace SystemCategoryTypeApi {
  export interface SystemCategoryType {
    [key: string]: any;
    id: string;
    name: string;
    permissions: string[];
    remark?: string;
    status: 0 | 1;
  }
}

/**
 * 获取分类列表数据
 */
async function getCategoryTypeTree(params: Recordable<any>) {
  return requestClient.get<Array<SystemCategoryTypeApi.SystemCategoryType>>(
    '/system/category-type/tree',
    { params },
  );
}
/**
 * 获取分类列表数据
 */
async function getCategoryTypeList(params: Recordable<any>) {
  return requestClient.get<Array<SystemCategoryTypeApi.SystemCategoryType>>(
    '/system/category-type/list',
    { params },
  );
}

/**
 * 创建分类
 * @param data 分类数据
 */
async function createCategoryType(
  data: Omit<SystemCategoryTypeApi.SystemCategoryType, 'id'>,
) {
  return requestClient.post('/system/category-type', data);
}

/**
 * 更新分类
 *
 * @param id 分类 ID
 * @param data 分类数据
 */
async function updateCategoryType(
  id: string,
  data: Omit<SystemCategoryTypeApi.SystemCategoryType, 'id'>,
) {
  return requestClient.put(`/system/category-type/${id}`, data);
}

/**
 * 删除分类
 * @param id 分类 ID
 */
async function deleteCategoryType(id: string) {
  return requestClient.delete(`/system/category-type/${id}`);
}

export {
  createCategoryType,
  deleteCategoryType,
  getCategoryTypeList,
  getCategoryTypeTree,
  updateCategoryType,
};
