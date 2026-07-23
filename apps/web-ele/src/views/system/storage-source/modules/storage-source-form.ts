import type { VbenFormSchema } from '#/adapter/form';
import type { StorageSourceApi } from '#/api/system/storage-source';

import { getStorageCategoryLabel } from './storage-source-routing';

type FormValues = Record<string, any> & {
  driver: StorageSourceApi.Driver;
};

const MIME_GROUP_OPTIONS = [
  { label: '全部文件', value: 'all' },
  { label: '图片', value: 'image' },
  { label: '视频', value: 'video' },
  { label: '文档', value: 'document' },
  { label: '音频', value: 'audio' },
  { label: '压缩包', value: 'archive' },
];

const BIZ_TYPE_OPTIONS = [
  { label: '全部用途', value: 'all' },
  { label: '用户头像', value: 'avatar' },
  { label: '聊天附件', value: 'chat' },
  { label: '通知图片', value: 'notification' },
  { label: '系统备份', value: 'backup' },
];

export function normalizeScopeSelection(values: unknown): string[] {
  if (!Array.isArray(values) || values.length === 0 || values.includes('all')) {
    return [];
  }
  return [
    ...new Set(
      values.filter((value): value is string => typeof value === 'string'),
    ),
  ];
}

function configFieldSchema(
  field: StorageSourceApi.DriverConfigField,
): VbenFormSchema {
  const components = {
    number: 'InputNumber',
    select: 'Select',
    text: 'Input',
  } as const;
  const component = components[field.type];
  return {
    component,
    componentProps: {
      ...(field.type === 'select' ? { options: field.options ?? [] } : {}),
      ...(field.min === undefined ? {} : { min: field.min }),
      ...(field.max === undefined ? {} : { max: field.max }),
      ...(field.type === 'number' ? { precision: 0 } : {}),
    },
    defaultValue: field.defaultValue,
    fieldName: `config.${field.key}`,
    label: field.label,
    rules: field.required ? 'required' : undefined,
  };
}

export function buildStorageSourceSchema(
  drivers: StorageSourceApi.DriverDescriptor[],
  editing: boolean,
): VbenFormSchema[] {
  const driverOptions = drivers.map((driver) => ({
    category: driver.category,
    label: driver.label,
    value: driver.type,
  }));
  const categoryOptions = [
    ...new Set(drivers.map(({ category }) => category)),
  ].map((category) => ({
    label: getStorageCategoryLabel(category),
    value: category,
  }));
  const schema: VbenFormSchema[] = [
    {
      component: 'Input',
      componentProps: { disabled: editing },
      fieldName: 'code',
      label: '编码',
      rules: 'required',
    },
    { component: 'Input', fieldName: 'name', label: '名称', rules: 'required' },
    {
      component: 'Select',
      componentProps: { disabled: editing, options: categoryOptions },
      fieldName: 'category',
      label: '存储类型',
      rules: 'required',
    },
    {
      component: 'Select',
      componentProps: (values) => ({
        disabled: editing,
        options: driverOptions.filter(
          ({ category }) => !values.category || category === values.category,
        ),
      }),
      dependencies: {
        trigger: async (values, actions) => {
          const selected = drivers.find(({ type }) => type === values.driver);
          if (selected && selected.category !== values.category) {
            await actions.setFieldValue('driver', undefined);
          }
        },
        triggerFields: ['category'],
      },
      fieldName: 'driver',
      label: '服务商',
      rules: 'required',
    },
    {
      component: 'InputNumber',
      componentProps: { min: 0, precision: 0 },
      defaultValue: 100,
      fieldName: 'priority',
      label: '写入优先级',
      rules: 'required',
    },
    {
      component: 'Select',
      componentProps: { multiple: true, options: MIME_GROUP_OPTIONS },
      fieldName: 'allowedMimeGroups',
      label: '允许的文件类型',
    },
    {
      component: 'Select',
      componentProps: { multiple: true, options: BIZ_TYPE_OPTIONS },
      fieldName: 'allowedBizTypes',
      label: '允许的业务用途',
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
  ];
  for (const driver of drivers) {
    for (const field of driver.configFields) {
      const fieldSchema = configFieldSchema(field);
      fieldSchema.dependencies = {
        show: (values) => values.driver === driver.type,
        triggerFields: ['driver'],
      };
      schema.push(fieldSchema);
    }
  }
  return schema;
}

function localConfig(values: FormValues): Record<string, number | string> {
  return {
    rootDir: String(values.rootDir ?? '').trim(),
    deliveryMode: 'proxy',
  };
}

function ossConfig(values: FormValues): Record<string, number | string> {
  return {
    region: String(values.region ?? '').trim(),
    bucket: String(values.bucket ?? '').trim(),
    accessKeyIdRef: String(values.accessKeyIdRef ?? '').trim(),
    accessKeySecretRef: String(values.accessKeySecretRef ?? '').trim(),
    deliveryMode: values.deliveryMode === 'oss_signed' ? 'oss_signed' : 'proxy',
    signedUrlTtlSeconds: Math.min(
      300,
      Math.max(60, Math.floor(Number(values.signedUrlTtlSeconds) || 120)),
    ),
  };
}

export function getEditingStorageSource(
  data: Partial<StorageSourceApi.StorageSource> | undefined,
): StorageSourceApi.StorageSource | undefined {
  return data?.id ? (data as StorageSourceApi.StorageSource) : undefined;
}

export function getStorageSourceConfigFields(
  driver: StorageSourceApi.Driver,
): string[] {
  return driver === 'local'
    ? ['rootDir', 'deliveryMode']
    : [
        'region',
        'bucket',
        'accessKeyIdRef',
        'accessKeySecretRef',
        'deliveryMode',
        'signedUrlTtlSeconds',
      ];
}

export function getDeliveryModeOptions() {
  return [
    { label: '后端中转', value: 'proxy' },
    { label: 'OSS 临时签名直连', value: 'oss_signed' },
    { label: 'CDN 临时签名（暂不可用）', value: 'cdn_signed', disabled: true },
  ] satisfies Array<{
    disabled?: boolean;
    label: string;
    value: StorageSourceApi.DeliveryMode;
  }>;
}

export function isStorageSourceIdentityLocked(
  editing: boolean,
  field: string,
): boolean {
  return editing && (field === 'code' || field === 'driver');
}

export function buildStorageSourcePayload(values: FormValues) {
  let config: Record<string, number | string>;
  if (values.config && typeof values.config === 'object') {
    config = Object.fromEntries(
      Object.entries(values.config).filter(
        ([, value]) => value !== undefined && value !== null,
      ),
    ) as Record<string, number | string>;
  } else {
    config =
      values.driver === 'local' ? localConfig(values) : ossConfig(values);
  }
  return {
    code: String(values.code ?? '').trim(),
    name: String(values.name ?? '').trim(),
    driver: values.driver,
    priority: Number(values.priority),
    enabled: Boolean(values.enabled),
    isFallback: Boolean(values.isFallback),
    allowedMimeGroups: normalizeScopeSelection(values.allowedMimeGroups),
    allowedBizTypes: normalizeScopeSelection(values.allowedBizTypes),
    config,
  };
}

export function storageSourceToFormValues(
  source: StorageSourceApi.StorageSource,
) {
  return {
    code: source.code,
    name: source.name,
    category: source.sourceKind,
    driver: source.driver,
    priority: source.priority,
    enabled: source.enabled,
    isFallback: source.isFallback,
    allowedMimeGroups:
      source.allowedMimeGroups.length === 0
        ? ['all']
        : source.allowedMimeGroups,
    allowedBizTypes:
      source.allowedBizTypes.length === 0 ? ['all'] : source.allowedBizTypes,
    config: source.config,
    ...source.config,
  };
}
