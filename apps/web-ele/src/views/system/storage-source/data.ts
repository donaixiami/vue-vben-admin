import type { VbenFormSchema } from '#/adapter/form';
import type { OnActionClickFn, VxeTableGridOptions } from '#/adapter/vxe-table';
import type { StorageSourceApi } from '#/api/system/storage-source';

import { canDeleteStorageSource } from './modules/storage-source-actions';
import { getDeliveryModeOptions } from './modules/storage-source-form';

const DRIVER_LABELS: Record<StorageSourceApi.Driver, string> = {
  local: '本地存储',
  aliyun_oss: '阿里云 OSS',
};

const HEALTH_LABELS: Record<StorageSourceApi.HealthStatus, string> = {
  unknown: '未检查',
  healthy: '健康',
  degraded: '降级',
  down: '不可用',
};

export function useGridFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      fieldName: 'name',
      label: '名称',
      componentProps: { allowClear: true },
    },
    {
      component: 'Select',
      fieldName: 'driver',
      label: '驱动',
      componentProps: {
        allowClear: true,
        options: Object.entries(DRIVER_LABELS).map(([value, label]) => ({
          label,
          value,
        })),
      },
    },
  ];
}

export function useFormSchema(editing = false): VbenFormSchema[] {
  const identityProps = { disabled: editing };
  return [
    {
      component: 'Input',
      componentProps: identityProps,
      fieldName: 'code',
      label: '编码',
      rules: 'required',
    },
    {
      component: 'Input',
      fieldName: 'name',
      label: '名称',
      rules: 'required',
    },
    {
      component: 'Select',
      componentProps: {
        disabled: editing,
        options: Object.entries(DRIVER_LABELS).map(([value, label]) => ({
          label,
          value,
        })),
      },
      defaultValue: 'local',
      fieldName: 'driver',
      label: '驱动',
      rules: 'required',
    },
    {
      component: 'InputNumber',
      componentProps: { min: 0, precision: 0 },
      defaultValue: 100,
      fieldName: 'priority',
      label: '优先级',
      rules: 'required',
    },
    {
      component: 'Switch',
      defaultValue: true,
      fieldName: 'enabled',
      label: '启用',
    },
    {
      component: 'Switch',
      defaultValue: false,
      fieldName: 'isFallback',
      label: '兜底来源',
    },
    {
      component: 'Input',
      fieldName: 'rootDir',
      label: '本地根目录',
      rules: 'required',
      dependencies: {
        show: (values) => values.driver === 'local',
        triggerFields: ['driver'],
      },
    },
    ...[
      ['region', 'Region'],
      ['bucket', 'Bucket'],
      ['accessKeyIdRef', 'AccessKeyId 环境变量'],
      ['accessKeySecretRef', 'AccessKeySecret 环境变量'],
    ].map(
      ([fieldName, label]) =>
        ({
          component: 'Input',
          fieldName,
          label,
          rules: 'required',
          dependencies: {
            show: (values) => values.driver === 'aliyun_oss',
            triggerFields: ['driver'],
          },
        }) as VbenFormSchema,
    ),
    {
      component: 'Select',
      componentProps: { options: getDeliveryModeOptions() },
      defaultValue: 'proxy',
      fieldName: 'deliveryMode',
      help: '临时链接将在设定时间后失效。如果 OSS 未允许当前访问域名，或存储配置异常，图片可能无法直连；系统会在签名失败时自动切换为后端中转。',
      label: '访问方式',
      rules: 'required',
      dependencies: {
        show: (values) => values.driver === 'aliyun_oss',
        triggerFields: ['driver'],
      },
    },
    {
      component: 'InputNumber',
      componentProps: { max: 300, min: 60, precision: 0 },
      defaultValue: 120,
      fieldName: 'signedUrlTtlSeconds',
      label: '签名有效期（秒）',
      rules: 'required',
      dependencies: {
        show: (values) =>
          values.driver === 'aliyun_oss' &&
          values.deliveryMode === 'oss_signed',
        triggerFields: ['driver', 'deliveryMode'],
      },
    },
  ];
}

export function useColumns(
  onActionClick: OnActionClickFn<StorageSourceApi.StorageSource>,
): VxeTableGridOptions<StorageSourceApi.StorageSource>['columns'] {
  return [
    { field: 'name', title: '名称', minWidth: 170 },
    { field: 'code', title: '编码', minWidth: 170 },
    {
      field: 'driver',
      title: '驱动',
      width: 120,
      formatter: ({ cellValue }) =>
        DRIVER_LABELS[cellValue as StorageSourceApi.Driver] ?? cellValue,
    },
    { field: 'priority', title: '优先级', width: 90 },
    {
      field: 'isFallback',
      title: '角色',
      width: 90,
      formatter: ({ cellValue }) => (cellValue ? '兜底' : '主存储'),
    },
    {
      field: 'enabled',
      title: '状态',
      width: 90,
      formatter: ({ cellValue }) => (cellValue ? '已启用' : '已禁用'),
    },
    {
      field: 'healthStatus',
      title: '健康状态',
      width: 110,
      formatter: ({ cellValue }) =>
        HEALTH_LABELS[cellValue as StorageSourceApi.HealthStatus] ?? cellValue,
    },
    { field: 'referenceCount', title: '引用文件', width: 100 },
    { field: 'healthCheckedAt', title: '最近检查', width: 180 },
    {
      align: 'center',
      cellRender: {
        name: 'CellOperation',
        attrs: {
          nameField: 'name',
          nameTitle: '存储源',
          onClick: onActionClick,
        },
        options: [
          'edit',
          { code: 'health-check', contentText: '检查', link: true },
          {
            code: 'disable',
            contentText: '禁用',
            link: true,
            show: (row: StorageSourceApi.StorageSource) => row.enabled,
          },
          {
            code: 'enable',
            contentText: '启用',
            link: true,
            show: (row: StorageSourceApi.StorageSource) => !row.enabled,
          },
          {
            code: 'delete',
            disabled: (row: StorageSourceApi.StorageSource) =>
              !canDeleteStorageSource(row),
          },
        ],
      },
      field: 'operation',
      fixed: 'right',
      title: '操作',
      width: 250,
    },
  ];
}
