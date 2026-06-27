import type { Recordable } from '@vben/types';

export const ROLE_PERMISSION_CODES = {
  add: 'system:role:add',
  delete: 'system:role:delete',
  edit: 'system:role:edit',
  query: 'system:role:query',
} as const;

export type RolePermissionCode =
  (typeof ROLE_PERMISSION_CODES)[keyof typeof ROLE_PERMISSION_CODES];

export type RolePermissionChecker = (code: RolePermissionCode) => boolean;

export function buildRoleOperationOptions(
  hasPermission: RolePermissionChecker,
) {
  return [
    {
      code: 'edit',
      show: (_row: Recordable<any>) =>
        hasPermission(ROLE_PERMISSION_CODES.edit),
    },
    {
      code: 'delete',
      show: (_row: Recordable<any>) =>
        hasPermission(ROLE_PERMISSION_CODES.delete),
    },
  ];
}
