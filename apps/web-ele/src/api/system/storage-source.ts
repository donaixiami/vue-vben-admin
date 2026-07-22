import { requestClient } from '#/api/request';

export namespace StorageSourceApi {
  export type Driver = 'aliyun_oss' | 'local';
  export type HealthStatus = 'degraded' | 'down' | 'healthy' | 'unknown';

  export interface StorageSource {
    id: number;
    code: string;
    name: string;
    driver: Driver;
    priority: number;
    enabled: boolean;
    isFallback: boolean;
    healthStatus: HealthStatus;
    healthCheckedAt: null | string;
    healthMessage: null | string;
    referenceCount: number;
    config: Record<string, any>;
    createdAt: string;
    updatedAt: string;
  }

  export interface StorageSourceInput {
    code: string;
    name: string;
    driver: Driver;
    priority: number;
    enabled: boolean;
    isFallback: boolean;
    config: Record<string, string>;
  }
}

export function getStorageSourceList() {
  return requestClient.get<StorageSourceApi.StorageSource[]>(
    '/storage-sources',
  );
}

export function createStorageSource(data: StorageSourceApi.StorageSourceInput) {
  return requestClient.post('/storage-sources', data);
}

export function updateStorageSource(
  id: number,
  data: Omit<StorageSourceApi.StorageSourceInput, 'code' | 'driver'>,
) {
  return requestClient.put(`/storage-sources/${id}`, data);
}

export function deleteStorageSource(id: number) {
  return requestClient.delete(`/storage-sources/${id}`);
}

export function setStorageSourceStatus(id: number, enabled: boolean) {
  return requestClient.put(`/storage-sources/${id}/status`, { enabled });
}

export function checkStorageSource(id: number) {
  return requestClient.post(`/storage-sources/${id}/health-check`);
}

export function checkAllStorageSources() {
  return requestClient.post('/storage-sources/health-check');
}
