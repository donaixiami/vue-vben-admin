import type { Recordable } from '@vben/types';

import { requestClient } from '#/api/request';

export namespace SystemConfigApi {
  export type ConfigId = number;

  export interface SystemConfig extends ConfigPayload {
    [key: string]: any;
    created_at?: null | string;
    id: ConfigId;
    updated_at?: null | string;
  }

  export interface ConfigPayload extends Recordable<any> {
    config_key: string;
    config_value?: null | string;
    is_system?: boolean;
    name: string;
    remark?: null | string;
  }

  export interface ConfigListResult {
    items: SystemConfig[];
    total: number;
  }

  export interface QueryConfigParams extends Recordable<any> {
    config_key?: string;
    from_time?: string;
    id?: ConfigId | string;
    is_system?: boolean;
    name?: string;
    page?: number;
    pageSize?: number;
    to_time?: string;
  }

  export type CreateConfigParams = ConfigPayload;

  export interface UpdateConfigParams extends Partial<ConfigPayload> {
    id?: ConfigId;
  }

  export interface ConfigKeyExistsParams {
    config_key: string;
    id?: ConfigId | string;
  }
}

async function getSystemConfigList(params: SystemConfigApi.QueryConfigParams) {
  return requestClient.get<SystemConfigApi.ConfigListResult>(
    '/system/config/list',
    { params },
  );
}

async function getSystemConfigById(id: SystemConfigApi.ConfigId) {
  return requestClient.get<null | SystemConfigApi.SystemConfig>(
    `/system/config/${id}`,
  );
}

async function getSystemConfigByKey(configKey: string) {
  return requestClient.get<null | SystemConfigApi.SystemConfig>(
    `/system/config/key/${configKey}`,
  );
}

async function getSystemConfigKeyExists(
  params: SystemConfigApi.ConfigKeyExistsParams,
) {
  return requestClient.get<boolean>('/system/config/key-exists', { params });
}

async function createSystemConfig(data: SystemConfigApi.CreateConfigParams) {
  return requestClient.post<SystemConfigApi.SystemConfig>(
    '/system/config',
    data,
  );
}

async function updateSystemConfig(
  id: SystemConfigApi.ConfigId,
  data: SystemConfigApi.UpdateConfigParams,
) {
  return requestClient.put<Recordable<any>>(`/system/config/${id}`, data);
}

async function deleteSystemConfig(id: SystemConfigApi.ConfigId) {
  return requestClient.delete<Recordable<any>>(`/system/config/${id}`);
}

export {
  createSystemConfig,
  deleteSystemConfig,
  getSystemConfigById,
  getSystemConfigByKey,
  getSystemConfigKeyExists,
  getSystemConfigList,
  updateSystemConfig,
};
