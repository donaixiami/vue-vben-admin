import type { Recordable } from '@vben/types';

import { requestClient } from '#/api/request';

export namespace SystemDictionaryApi {
  export type DictionaryType = 'checkbox' | 'radio' | 'text' | undefined;

  export interface SystemDictionary {
    [key: string]: any;
    id: number;
    identifier: string;
    name: string;
    type: DictionaryType;
    value: null | string;
    valueList: [];
    default_value: null | string;
    sort: number;
  }
}
/**
 * 查询字典唯一值是否重复
 */
async function isMenuIdentifierExists(
  identifier: string,
  id?: SystemDictionaryApi.SystemDictionary['id'],
) {
  return requestClient.get<boolean>('/system/dictionary/identifier-exists', {
    params: { id, identifier },
  });
}

/**
 * 获取角色列表数据
 */
async function getDictionaryList(params: Recordable<any>) {
  return requestClient.get<Array<SystemDictionaryApi.SystemDictionary>>(
    '/system/dictionary/list',
    { params },
  );
}

/**
 * 创建角色
 * @param data 角色数据
 */
async function createDictionary(
  data: Omit<SystemDictionaryApi.SystemDictionary, 'id'>,
) {
  return requestClient.post('/system/dictionary', data);
}

/**
 * 更新角色
 *
 * @param id 角色 ID
 * @param data 角色数据
 */
async function updateDictionary(
  id: string,
  data: Omit<SystemDictionaryApi.SystemDictionary, 'id'>,
) {
  return requestClient.put(`/system/dictionary/${id}`, data);
}

/**
 * 删除角色
 * @param id 角色 ID
 */
async function deleteDictionary(id: string) {
  return requestClient.delete(`/system/dictionary/${id}`);
}

export {
  createDictionary,
  deleteDictionary,
  getDictionaryList,
  isMenuIdentifierExists,
  updateDictionary,
};
