import type { StorageSourceApi } from '#/api/system/storage-source';

import {
  STORAGE_SOURCE_PERMISSION_CODES,
  type StorageSourcePermissionChecker,
} from './permissions';

export function canDeleteStorageSource(row: {
  referenceCount: number;
}): boolean {
  return Number(row.referenceCount) === 0;
}

export function storageSourceActionRequiresConfirm(code: string): boolean {
  return code === 'delete' || code === 'disable';
}

export function shouldPollStorageSources(
  rows: Array<Pick<StorageSourceApi.StorageSource, 'provisionStatus'>>,
): boolean {
  return rows.some(
    ({ provisionStatus }) =>
      provisionStatus === 'testing' || provisionStatus === 'cleanup_pending',
  );
}

export function getStorageSourceActionOptions(
  row: StorageSourceApi.StorageSource,
  driver: StorageSourceApi.DriverDescriptor | undefined,
  hasPermission: StorageSourcePermissionChecker,
) {
  const options: Array<{ code: string; contentText: string; link: true }> = [];
  const add = (
    permission: Parameters<StorageSourcePermissionChecker>[0],
    code: string,
    contentText: string,
    enabled = true,
  ) => {
    if (enabled && hasPermission(permission)) {
      options.push({ code, contentText, link: true });
    }
  };
  const canInspectProvider =
    row.provisionStatus === 'ready' || row.provisionStatus === 'failed';

  add(STORAGE_SOURCE_PERMISSION_CODES.update, 'edit', '编辑');
  add(
    STORAGE_SOURCE_PERMISSION_CODES.healthCheck,
    'health-check',
    '健康检查',
    canInspectProvider,
  );
  add(
    STORAGE_SOURCE_PERMISSION_CODES.quotaRefresh,
    'quota-refresh',
    '刷新容量',
    canInspectProvider && Boolean(driver?.capabilities.supportsQuota),
  );
  add(
    STORAGE_SOURCE_PERMISSION_CODES.speedTest,
    'speed-test',
    '重新测速',
    canInspectProvider && Boolean(driver?.capabilities.supportsSpeedTest),
  );
  add(
    STORAGE_SOURCE_PERMISSION_CODES.changeStatus,
    row.enabled ? 'disable' : 'enable',
    row.enabled ? '禁用' : '启用',
    row.enabled || row.provisionStatus === 'ready',
  );
  add(
    STORAGE_SOURCE_PERMISSION_CODES.delete,
    'delete',
    '删除',
    canDeleteStorageSource(row),
  );
  return options;
}
