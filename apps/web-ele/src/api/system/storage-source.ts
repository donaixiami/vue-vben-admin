import { requestClient } from '#/api/request';

export namespace StorageSourceApi {
  export type Driver = string;
  export type StorageCategory = 'local' | 'netdisk' | 'object_storage';
  export type DeliveryMode = 'cdn_signed' | 'oss_signed' | 'proxy';
  export type HealthStatus = 'degraded' | 'down' | 'healthy' | 'unknown';
  export type ProvisionStatus =
    | 'cleanup_pending'
    | 'failed'
    | 'pending_auth'
    | 'ready'
    | 'testing';

  export interface DriverCapabilities {
    category: StorageCategory;
    supportsDelete: boolean;
    supportsDirectReadUrl: boolean;
    supportsOAuth: boolean;
    supportsQuota: boolean;
    supportsRead: boolean;
    supportsSpeedTest: boolean;
    supportsWrite: boolean;
  }

  export interface DriverConfigFieldOption {
    label: string;
    value: string;
  }

  export interface DriverConfigField {
    key: string;
    label: string;
    type: 'number' | 'select' | 'text';
    required: boolean;
    defaultValue?: number | string;
    min?: number;
    max?: number;
    options?: DriverConfigFieldOption[];
  }

  export interface DriverDescriptor {
    type: Driver;
    label: string;
    category: StorageCategory;
    capabilities: DriverCapabilities;
    configFields: DriverConfigField[];
  }

  export interface QuotaMetrics {
    totalBytes: null | string;
    usedBytes: null | string;
    freeBytes: null | string;
    checkedAt: null | string;
  }

  export interface SpeedMetrics {
    uploadBps: null | string;
    downloadBps: null | string;
    sampleCount: number;
    checkedAt: null | string;
  }

  export interface StorageSource {
    id: number;
    code: string;
    name: string;
    driver: Driver;
    sourceKind: StorageCategory;
    provider: string;
    providerLabel: string;
    priority: number;
    enabled: boolean;
    isFallback: boolean;
    provisionStatus: ProvisionStatus;
    healthStatus: HealthStatus;
    healthCheckedAt: null | string;
    healthMessage: null | string;
    referenceCount: number;
    allowedMimeGroups: string[];
    allowedBizTypes: string[];
    quota: QuotaMetrics;
    speed: SpeedMetrics;
    cooldownUntil: null | string;
    routingEligible: boolean;
    config: Record<string, any>;
    createdAt: string;
    updatedAt: string;
  }

  export interface StorageSourceInput {
    code: string;
    name: string;
    driver: Driver;
    sourceKind?: StorageCategory;
    priority: number;
    enabled: boolean;
    isFallback: boolean;
    allowedMimeGroups?: string[];
    allowedBizTypes?: string[];
    config: Record<string, number | string>;
  }

  export interface ListParams {
    category?: StorageCategory;
    driver?: Driver;
    provisionStatus?: ProvisionStatus;
    name?: string;
  }

  export interface SummaryGroup {
    category: StorageCategory;
    driver: Driver;
    label: string;
    accountCount: number;
    healthyCount: number;
    totalBytes: null | string;
    usedBytes: null | string;
    freeBytes: null | string;
    unknownQuotaCount: number;
  }

  export interface Summary {
    accountCount: number;
    healthyCount: number;
    totalBytes: null | string;
    usedBytes: null | string;
    freeBytes: null | string;
    unknownQuotaCount: number;
    groups: SummaryGroup[];
  }

  export interface OAuthStartResult {
    authorizationUrl: string;
  }

  export type OAuthStartInput = Omit<StorageSourceInput, 'driver'>;
}

export function getStorageSourceDrivers() {
  return requestClient.get<StorageSourceApi.DriverDescriptor[]>(
    '/storage-sources/drivers',
  );
}

export function getStorageSourceSummary() {
  return requestClient.get<StorageSourceApi.Summary>(
    '/storage-sources/summary',
  );
}

export function getStorageSourceList(params?: StorageSourceApi.ListParams) {
  return requestClient.get<StorageSourceApi.StorageSource[]>(
    '/storage-sources',
    {
      params,
    },
  );
}

export function createStorageSource(data: StorageSourceApi.StorageSourceInput) {
  return requestClient.post('/storage-sources', data);
}

export function updateStorageSource(
  id: number,
  data: Partial<Omit<StorageSourceApi.StorageSourceInput, 'code' | 'driver'>>,
) {
  return requestClient.put(`/storage-sources/${id}`, data);
}

export function updateStorageSourceRoutingPolicy(
  id: number,
  data: Pick<
    StorageSourceApi.StorageSourceInput,
    | 'allowedBizTypes'
    | 'allowedMimeGroups'
    | 'enabled'
    | 'isFallback'
    | 'priority'
  >,
) {
  return requestClient.put(`/storage-sources/${id}/routing-policy`, data);
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

export function startStorageSourceOAuth(
  driver: string,
  data: StorageSourceApi.OAuthStartInput,
) {
  return requestClient.post<StorageSourceApi.OAuthStartResult>(
    `/storage-sources/oauth/${driver}/start`,
    data,
  );
}

export function refreshStorageSourceQuota(id: number) {
  return requestClient.post(`/storage-sources/${id}/quota-refresh`);
}

export function runStorageSourceSpeedTest(id: number) {
  return requestClient.post(`/storage-sources/${id}/speed-test`);
}

export function getStorageSourceSpeedTests(id: number) {
  return requestClient.get(`/storage-sources/${id}/speed-tests`);
}
