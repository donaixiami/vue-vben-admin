import type { Recordable } from '@vben/types';

import { requestClient } from '#/api/request';

export namespace SystemArticleApi {
  export interface SystemArticle {
    [key: string]: any;
    id: string;
    /** 文章标题 */
    title: string;
    /** 副标题 */
    sub_title?: string;
    /** 封面图片URL */
    cover?: string;
    /** 文章类型/分类 */
    type?: string;
    /** 文章内容 */
    content: string;
    /** 是否显示: 0-否, 1-是 */
    evidently?: 0 | 1;
    /** 状态: 0-禁用, 1-启用 */
    status: 0 | 1;
    /** 创建者ID */
    creator_id?: number;
    /** 创建时间 */
    created_at?: string;
    /** 更新时间 */
    updated_at?: string;
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
