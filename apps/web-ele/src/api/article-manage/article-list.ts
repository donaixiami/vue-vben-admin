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
 * 获取文章列表数据
 */
async function getArticleList(params: Recordable<any>) {
  return requestClient.get<Array<SystemArticleApi.SystemArticle>>(
    '/article/list',
    { params },
  );
}

/**
 * 根据ID获取文章详情
 * @param id 文章 ID
 */
async function getArticleById(id: string) {
  return requestClient.get<SystemArticleApi.SystemArticle>(`/article/${id}`);
}

/**
 * 创建文章
 * @param data 文章数据
 */
async function createArticle(data: Omit<SystemArticleApi.SystemArticle, 'id'>) {
  return requestClient.post('/article', data);
}

/**
 * 更新文章
 *
 * @param id 文章 ID
 * @param data 文章数据
 */
async function updateArticle(
  id: string,
  data: Omit<SystemArticleApi.SystemArticle, 'id'>,
) {
  return requestClient.put(`/article/${id}`, data);
}

/**
 * 删除文章
 * @param id 文章 ID
 */
async function deleteArticle(id: string) {
  return requestClient.delete(`/article/${id}`);
}

export { createArticle, deleteArticle, getArticleById, getArticleList, updateArticle };
