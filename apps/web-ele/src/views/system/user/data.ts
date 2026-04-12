import type { VbenFormSchema } from '#/adapter/form';
import type { OnActionClickFn, VxeTableGridOptions } from '#/adapter/vxe-table';
import type { SystemRoleApi } from '#/api';

import { $t } from '#/locales';

export function useGridFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      fieldName: 'real_name',
      label: $t('system.role.roleName'),
      componentProps: { allowClear: true, clearable: true },
    },
    // 手机号
    {
      component: 'Input',
      fieldName: 'phone',
      label: '手机号',
      componentProps: { allowClear: true, clearable: true },
    },
    {
      component: 'Input',
      fieldName: 'id',
      label: $t('system.role.id'),
      componentProps: { allowClear: true, clearable: true },
    },
    {
      component: 'Select',
      componentProps: {
        clearable: true,
        allowClear: true,
        options: [
          { label: $t('common.enabled'), value: 1 },
          { label: $t('common.disabled'), value: 0 },
        ],
      },
      fieldName: 'status',
      label: $t('system.role.status'),
    },

    {
      component: 'RangePicker',
      fieldName: 'created_at',
      label: $t('system.role.createTime'),
      componentProps: { valueFormat: 'YYYY-MM-DD HH:mm:ss' },
    },
  ];
}

export function useColumns<T = SystemRoleApi.SystemRole>(
  onActionClick: OnActionClickFn<T>,
  onStatusChange?: (newStatus: any, row: T) => PromiseLike<boolean | undefined>,
): VxeTableGridOptions['columns'] {
  return [
    {
      field: 'id',
      title: $t('system.role.id'),
      width: 80,
    },
    {
      // 宽高class比为1:1，避免图片拉伸
      cellRender: { name: 'CellImage', attrs: { fit: 'cover', class: 'w-20 h-20 ' } },
      field: 'avatar',
      title: '头像',
      width: 130,
    },
    {
      field: 'real_name',
      title: $t('system.role.roleName'),
      minWidth: 200,
    },

    {
      field: 'username',
      title: '用户名',
      minWidth: 200,
    },
    {
      field: 'phone',
      title: '电话',
      minWidth: 200,
    },
    {
      field: 'email',
      title: '邮箱',
      minWidth: 200,
    },
    // root字段为1直接禁用状态切换
    {
      cellRender: {
        attrs: {
          beforeChange: onStatusChange,
          disabled: (row: any) => {
            return row.root === 1;
          },
        },
        name: 'CellSwitch',
      },

      field: 'status',
      title: $t('system.role.status'),
      width: 100,
    },

    {
      field: 'created_at',
      title: $t('system.role.createTime'),
      width: 200,
    },
    {
      align: 'center',
      cellRender: {
        attrs: {
          nameField: 'username',
          nameTitle: '用户名',
          onClick: onActionClick,
        },
        name: 'CellOperation',
        options: [
          {
            code: 'edit',
            show: (row: any) => row.root !== 1,
          },
          {
            code: 'delete',
            show: (row: any) => row.root !== 1,
          },
        ],
      },
      field: 'operation',
      fixed: 'right',
      title: $t('system.role.operation'),
      width: 130,
    },
  ];
}
