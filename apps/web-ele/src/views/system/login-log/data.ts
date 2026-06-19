import type { VbenFormSchema } from '#/adapter/form';
import type { OnActionClickFn, VxeTableGridOptions } from '#/adapter/vxe-table';
import type { SystemLoginLogApi } from '#/api/system/login-log';

import { $t } from '#/locales';

export function useGridFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      fieldName: 'username',
      label: '用户名',
      componentProps: {
        allowClear: true,
        clearable: true,
      },
    },
    {
      component: 'Input',
      fieldName: 'ip',
      label: '登录 IP',
      componentProps: {
        allowClear: true,
        clearable: true,
      },
    },
    {
      component: 'Select',
      componentProps: {
        allowClear: true,
        clearable: true,
        options: [
          { label: '成功', value: 1 },
          { label: '失败', value: 0 },
        ],
      },
      fieldName: 'status',
      label: '登录状态',
    },
    {
      component: 'RangePicker',
      fieldName: 'created_at',
      label: '登录时间',
      componentProps: { valueFormat: 'YYYY-MM-DD HH:mm:ss' },
    },
  ];
}

export function useColumns<T = SystemLoginLogApi.SystemLoginLog>(
  onActionClick: OnActionClickFn<T>,
): VxeTableGridOptions['columns'] {
  return [
    {
      field: 'id',
      title: 'ID',
      width: 80,
    },
    {
      field: 'username',
      title: '用户名',
      minWidth: 140,
    },
    {
      field: 'status',
      title: '登录状态',
      width: 100,
      cellRender: {
        name: 'CellTag',
        options: [
          { value: 1, label: '成功', type: 'success' },
          { value: 0, label: '失败', type: 'error' },
        ],
      },
    },
    {
      field: 'login_type',
      title: '登录方式',
      width: 120,
    },
    {
      field: 'ip',
      title: '登录 IP',
      minWidth: 140,
    },
    {
      field: 'user_agent',
      title: 'User Agent',
      minWidth: 260,
      showOverflow: 'tooltip',
    },
    {
      field: 'message',
      title: '结果说明',
      minWidth: 180,
      showOverflow: 'tooltip',
    },
    {
      field: 'created_at',
      title: '登录时间',
      width: 180,
    },
    {
      align: 'center',
      cellRender: {
        attrs: {
          nameField: 'username',
          nameTitle: '登录日志',
          onClick: onActionClick,
        },
        name: 'CellOperation',
        options: ['delete'],
      },
      field: 'operation',
      fixed: 'right',
      title: $t('system.role.operation'),
      width: 100,
    },
  ];
}
