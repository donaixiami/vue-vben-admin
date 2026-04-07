import type { VbenFormSchema } from '#/adapter/form';
import type { OnActionClickFn, VxeTableGridOptions } from '#/adapter/vxe-table';
import type { SystemNotificationsApi } from '#/api';

import { $t } from '#/locales';

export function useFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      fieldName: 'title',
      label: '消息名称',
      rules: 'required',
    },
    {
      component: 'Textarea',
      fieldName: 'message',
      label: '消息内容',
      rules: 'required',
    },
  ];
}

export function useGridFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      fieldName: 'title',
      label: '标题',
    },
    { component: 'Input', fieldName: 'id', label: '消息ID' },
    {
      component: 'RangePicker',
      fieldName: 'created_at',
      label: $t('system.role.createTime'),
      componentProps: { valueFormat: 'YYYY-MM-DD HH:mm:ss' },
    },
  ];
}

export function useColumns<T = SystemNotificationsApi.SystemNotifications>(
  onActionClick: OnActionClickFn<T>,
): VxeTableGridOptions['columns'] {
  return [
    {
      field: 'id',
      title: 'ID',
      width: 80,
    },
    {
      field: 'title',
      title: '通知标题',
      minWidth: 160,
    },
    {
      field: 'message',
      title: '通知内容',
      minWidth: 160,
    },

    {
      cellRender: {
        name: 'CellTag',
        options: [
          { value: 'system', label: '系统通知', color: 'processing' },
          { value: 'user', label: '用户消息', color: 'success' },
          { value: 'alert', label: '警告通知', color: 'error' },
          { value: 'event', label: '事件通知', color: 'warning' },
          { value: 'announcement', label: '公告', color: 'processing' },
        ],
      },
      field: 'type',
      title: '通知类型',
      width: 160,
    },

    {
      field: 'read_at',
      title: '阅读时间',
      width: 160,
    },

    {
      cellRender: {
        name: 'CellTag',
        options: [
          { value: 1, label: '启用', color: 'success' },
          { value: 0, label: '停用', color: 'error' },
        ],
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
          nameField: 'name',
          nameTitle: '消息',
          onClick: onActionClick,
        },
        name: 'CellOperation',
      },
      field: 'operation',
      fixed: 'right',
      title: $t('system.role.operation'),
      width: 130,
    },
  ];
}
