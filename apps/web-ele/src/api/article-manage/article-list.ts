import type { Recordable } from '@vben/types';

import { requestClient } from '#/api/request';

export namespace SystemArticleApi {
  export interface SystemArticle {
    [key: string]: any;
    id: string;
    name: string;
    permissions: string[];
    remark?: string;
    status: 0 | 1;
  }
}

/**
 * 获取角色列表数据
 */
async function getArticleList(params: Recordable<any>) {
  return requestClient.get<Array<SystemArticleApi.SystemArticle>>(
    '/article/list',
    { params },
  );
}

/**
 * 创建角色
 * @param data 角色数据
 */
async function createArticle(data: Omit<SystemArticleApi.SystemArticle, 'id'>) {
  return requestClient.post('/article', data);
}

/**
 * 更新角色
 *
 * @param id 角色 ID
 * @param data 角色数据
 */
async function updateArticle(
  id: string,
  data: Omit<SystemArticleApi.SystemArticle, 'id'>,
) {
  return requestClient.put(`/article/${id}`, data);
}

/**
 * 删除角色
 * @param id 角色 ID
 */
async function deleteArticle(id: string) {
  return requestClient.delete(`/article/${id}`);
}

export { createArticle, deleteArticle, getArticleList, updateArticle };
