import type { Recordable } from '@vben/types';

import { requestClient } from '#/api/request';

export namespace SystemDictionaryApi {
  export type DictionaryId = number;
  export type DictionaryStatus = 0 | 1;
  export type DictionaryValue = DictionaryValueItem[] | null | string;

  export interface DictionaryValueItem {
    id?: number;
    label: string;
    value: string;
  }

  export interface DictionaryPayload extends Recordable<any> {
    identifier: string;
    name: string;
    sort: number;
    status: DictionaryStatus;
    value: DictionaryValue;
    valueList?: DictionaryValueItem[];
  }

  export interface SystemDictionary extends DictionaryPayload {
    [key: string]: any;
    created_at?: null | string;
    id: DictionaryId;
    updated_at?: null | string;
  }

  export interface DictionaryDetail extends Omit<SystemDictionary, 'value'> {
    value: DictionaryValue;
  }

  export interface DictionaryListResult {
    items: SystemDictionary[];
    total: number;
  }

  export interface QueryDictionaryParams extends Recordable<any> {
    from_time?: string;
    id?: DictionaryId | string;
    identifier?: string;
    name?: string;
    page?: number;
    pageSize?: number;
    status?: DictionaryStatus | number;
    to_time?: string;
  }

  export type CreateDictionaryParams = DictionaryPayload;

  export interface UpdateDictionaryParams extends Partial<DictionaryPayload> {
    id?: DictionaryId;
  }

  export interface DictionaryIdentifierExistsParams {
    id?: DictionaryId | string;
    identifier: string;
  }

  export interface DictionaryUpdateResult {
    affected?: number;
    raw?: unknown;
  }

  export interface DictionaryDeleteResult {
    affected?: number;
    raw?: unknown;
  }
}

async function isDictionaryIdentifierExists(
  identifier: string,
  id?: SystemDictionaryApi.DictionaryId,
) {
  return requestClient.get<boolean>('/system/dictionary/identifier-exists', {
    params: { id, identifier },
  });
}

async function getDictionaryIdentifierExists(
  params: SystemDictionaryApi.DictionaryIdentifierExistsParams,
) {
  return requestClient.get<boolean>('/system/dictionary/identifier-exists', {
    params,
  });
}

async function getDictionaryList(
  params: SystemDictionaryApi.QueryDictionaryParams,
) {
  return requestClient.get<SystemDictionaryApi.DictionaryListResult>(
    '/system/dictionary/list',
    {
      params,
    },
  );
}

async function getDictionaryById(id: SystemDictionaryApi.DictionaryId) {
  return requestClient.get<null | SystemDictionaryApi.SystemDictionary>(
    `/system/dictionary/${id}`,
  );
}

async function getDictionaryByIdentifier(identifier: string) {
  return requestClient.get<null | SystemDictionaryApi.DictionaryDetail>(
    `/system/dictionary/identifier/${identifier}`,
  );
}

async function createDictionary(
  data: SystemDictionaryApi.CreateDictionaryParams,
) {
  return requestClient.post<SystemDictionaryApi.SystemDictionary>(
    '/system/dictionary',
    data,
  );
}

async function updateDictionary(
  id: SystemDictionaryApi.DictionaryId,
  data: SystemDictionaryApi.UpdateDictionaryParams,
) {
  return requestClient.put<SystemDictionaryApi.DictionaryUpdateResult>(
    `/system/dictionary/${id}`,
    data,
  );
}

async function deleteDictionary(id: SystemDictionaryApi.DictionaryId) {
  return requestClient.delete<SystemDictionaryApi.DictionaryDeleteResult>(
    `/system/dictionary/${id}`,
  );
}

const isMenuIdentifierExists = isDictionaryIdentifierExists;

export {
  createDictionary,
  deleteDictionary,
  getDictionaryById,
  getDictionaryByIdentifier,
  getDictionaryIdentifierExists,
  getDictionaryList,
  isDictionaryIdentifierExists,
  isMenuIdentifierExists,
  updateDictionary,
};
