import type { VbenFormSchema } from '#/adapter/form';
import type { OnActionClickFn, VxeTableGridOptions } from '#/adapter/vxe-table';
import type { MonitorJobApi } from '#/api/monitor/job';

import { $t } from '#/locales';

export const JOB_STATUS_OPTIONS = [
  { label: '启用', type: 'success', value: 'enabled' },
  { label: '停用', type: 'info', value: 'disabled' },
];

export const RUN_STATUS_OPTIONS = [
  { label: '运行中', type: 'primary', value: 'running' },
  { label: '成功', type: 'success', value: 'success' },
  { label: '失败', type: 'danger', value: 'failed' },
  { label: '超时', type: 'warning', value: 'timeout' },
  { label: '已跳过', type: 'info', value: 'skipped' },
];

export const MISFIRE_OPTIONS = [
  { label: '默认策略', value: 'default' },
  { label: '立即补执行错过任务', value: 'ignore_misfires' },
  { label: '只补执行一次', value: 'fire_once' },
  { label: '放弃错过执行', value: 'do_nothing' },
];

export function useGridFormSchema(): VbenFormSchema[] {
  return [
    { component: 'Input', fieldName: 'name', label: '任务名称' },
    { component: 'Input', fieldName: 'jobGroup', label: '任务分组' },
    { component: 'Input', fieldName: 'handlerKey', label: '处理器' },
    {
      component: 'Select',
      componentProps: { clearable: true, options: JOB_STATUS_OPTIONS },
      fieldName: 'status',
      label: '任务状态',
    },
    {
      component: 'Select',
      componentProps: { clearable: true, options: MISFIRE_OPTIONS },
      fieldName: 'misfirePolicy',
      label: '错过策略',
    },
  ];
}

export function useColumns<T = MonitorJobApi.Job>(
  onActionClick: OnActionClickFn<T>,
): VxeTableGridOptions['columns'] {
  return [
    { field: 'id', title: 'ID', width: 70 },
    { field: 'name', minWidth: 150, title: '任务名称' },
    { field: 'job_group', minWidth: 110, title: '任务分组' },
    { field: 'handler_key', minWidth: 220, title: '调用目标' },
    { field: 'cron_expression', minWidth: 150, title: 'Cron 表达式' },
    {
      cellRender: { name: 'CellTag', options: MISFIRE_OPTIONS },
      field: 'misfire_policy',
      minWidth: 140,
      title: '错过策略',
    },
    {
      cellRender: { name: 'CellTag', options: JOB_STATUS_OPTIONS },
      field: 'status',
      title: '状态',
      width: 90,
    },
    {
      cellRender: { name: 'CellTag', options: RUN_STATUS_OPTIONS },
      field: 'last_run_status',
      title: '上次结果',
      width: 100,
    },
    { field: 'last_run_at', minWidth: 170, title: '上次执行' },
    { field: 'next_run_at', minWidth: 170, title: '下次执行' },
    {
      align: 'center',
      cellRender: {
        attrs: {
          nameField: 'name',
          nameTitle: '定时任务',
          onClick: onActionClick,
        },
        name: 'CellOperation',
        options: [
          { code: 'run', contentText: '执行一次', link: true, type: 'primary' },
          { code: 'logs', contentText: '调度日志', link: true },
          { code: 'status', contentText: '启停', link: true },
          'edit',
          'delete',
        ],
      },
      field: 'operation',
      fixed: 'right',
      title: $t('system.role.operation'),
      width: 290,
    },
  ];
}
