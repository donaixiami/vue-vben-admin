import type { VbenFormSchema } from '#/adapter/form';
import type { OnActionClickFn, VxeTableGridOptions } from '#/adapter/vxe-table';
import type { StorageSourceApi } from '#/api/system/storage-source';

import { getStorageSourceActionOptions } from './modules/storage-source-actions';
import {
  buildStorageSourceSchema,
  getDeliveryModeOptions,
} from './modules/storage-source-form';
import {
  formatStorageBytes,
  formatStorageDate,
  formatStorageRate,
  getStorageSourceStatusMeta,
  summarizeFileScope,
} from './modules/storage-source-metrics';
import { getStorageCategoryLabel } from './modules/storage-source-routing';

const LEGACY_DRIVER_OPTIONS = [
  { label: '本地存储', value: 'local' },
  { label: '阿里云 OSS', value: 'aliyun_oss' },
];

export function useGridFormSchema(
  drivers:
    | (() => StorageSourceApi.DriverDescriptor[])
    | StorageSourceApi.DriverDescriptor[] = [],
): VbenFormSchema[] {
  const driverOptions = () =>
    (typeof drivers === 'function' ? drivers() : drivers).map(
      ({ label, type: value }) => ({ label, value }),
    );
  return [
    {
      component: 'Input',
      fieldName: 'name',
      label: '名称',
      componentProps: { allowClear: true },
    },
    {
      component: 'Select',
      fieldName: 'category',
      label: '存储类型',
      componentProps: {
        allowClear: true,
        options: [
          { label: '本地存储', value: 'local' },
          { label: '对象存储', value: 'object_storage' },
          { label: '网盘存储', value: 'netdisk' },
        ],
      },
    },
    {
      component: 'Select',
      fieldName: 'driver',
      label: '服务商',
      componentProps: () => ({
        allowClear: true,
        options: driverOptions(),
      }),
    },
    {
      component: 'Select',
      fieldName: 'provisionStatus',
      label: '账号状态',
      componentProps: {
        allowClear: true,
        options: [
          { label: '可用', value: 'ready' },
          { label: '检测中', value: 'testing' },
          { label: '待清理', value: 'cleanup_pending' },
          { label: '待授权', value: 'pending_auth' },
          { label: '接入失败', value: 'failed' },
        ],
      },
    },
  ];
}

export function useFormSchema(
  editing = false,
  drivers: StorageSourceApi.DriverDescriptor[] = [],
): VbenFormSchema[] {
  if (drivers.length > 0) return buildStorageSourceSchema(drivers, editing);

  // 兼容尚未加载驱动目录的首次打开；正式字段在抽屉打开时由 registry schema 替换。
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
        options: LEGACY_DRIVER_OPTIONS,
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
  drivers:
    | (() => StorageSourceApi.DriverDescriptor[])
    | StorageSourceApi.DriverDescriptor[] = [],
  hasPermission: (code: any) => boolean = () => true,
): VxeTableGridOptions<StorageSourceApi.StorageSource>['columns'] {
  const actionLabels: Record<string, string> = {
    delete: '删除',
    disable: '禁用',
    edit: '编辑',
    enable: '启用',
    'health-check': '健康检查',
    'quota-refresh': '刷新容量',
    'speed-test': '重新测速',
  };
  const actionCodes = (row: StorageSourceApi.StorageSource) =>
    new Set(
      getStorageSourceActionOptions(
        row,
        new Map(
          (typeof drivers === 'function' ? drivers() : drivers).map(
            (driver) => [driver.type, driver],
          ),
        ).get(row.driver),
        hasPermission,
      ).map(({ code }) => code),
    );
  return [
    { field: 'name', title: '名称', minWidth: 170 },
    { field: 'code', title: '编码', minWidth: 170 },
    {
      field: 'driver',
      title: '服务商',
      width: 120,
      formatter: ({ row }) => row.providerLabel,
    },
    {
      field: 'sourceKind',
      title: '类型',
      width: 100,
      formatter: ({ cellValue }) =>
        getStorageCategoryLabel(cellValue as StorageSourceApi.StorageCategory),
    },
    { field: 'priority', title: '优先级', width: 90 },
    {
      field: 'isFallback',
      title: '角色',
      width: 90,
      formatter: ({ cellValue }) => (cellValue ? '兜底' : '主存储'),
    },
    {
      field: 'provisionStatus',
      title: '状态',
      width: 110,
      formatter: ({ row }) => getStorageSourceStatusMeta(row).label,
    },
    {
      field: 'quota',
      title: '容量',
      width: 170,
      formatter: ({ row }) =>
        `${formatStorageBytes(row.quota.freeBytes)} 可用 / ${formatStorageBytes(
          row.quota.totalBytes,
        )}`,
    },
    {
      field: 'speed',
      title: '速率',
      width: 170,
      formatter: ({ row }) =>
        `上行 ${formatStorageRate(row.speed.uploadBps)} / 下行 ${formatStorageRate(
          row.speed.downloadBps,
        )}`,
    },
    {
      field: 'allowedMimeGroups',
      title: '文件范围',
      minWidth: 150,
      formatter: ({ row }) =>
        summarizeFileScope(row.allowedMimeGroups, row.allowedBizTypes),
    },
    { field: 'referenceCount', title: '引用文件', width: 100 },
    {
      field: 'updatedAt',
      title: '最近更新',
      width: 180,
      formatter: ({ cellValue }) => formatStorageDate(cellValue),
    },
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
          ...[
            'edit',
            'health-check',
            'quota-refresh',
            'speed-test',
            'disable',
            'enable',
            'delete',
          ].map((code) => ({
            code,
            contentText: actionLabels[code] ?? code,
            link: true,
            show: (row: StorageSourceApi.StorageSource) =>
              actionCodes(row).has(code),
          })),
        ],
      },
      field: 'operation',
      fixed: 'right',
      title: '操作',
      width: 250,
    },
  ];
}
