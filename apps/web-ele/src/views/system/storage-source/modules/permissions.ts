export const STORAGE_SOURCE_PERMISSION_CODES = {
  query: 'system:storage-source:list',
  create: 'system:storage-source:create',
  update: 'system:storage-source:update',
  delete: 'system:storage-source:delete',
  changeStatus: 'system:storage-source:change-status',
  healthCheck: 'system:storage-source:health-check',
  quotaRefresh: 'system:storage-source:quota-refresh',
  speedTest: 'system:storage-source:speed-test',
} as const;

export type StorageSourcePermissionCode =
  (typeof STORAGE_SOURCE_PERMISSION_CODES)[keyof typeof STORAGE_SOURCE_PERMISSION_CODES];

export type StorageSourcePermissionChecker = (
  code: StorageSourcePermissionCode,
) => boolean;
