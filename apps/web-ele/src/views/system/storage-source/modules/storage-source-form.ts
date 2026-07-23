import type { StorageSourceApi } from '#/api/system/storage-source';

type FormValues = Record<string, any> & {
  driver: StorageSourceApi.Driver;
};

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
  const config: Record<string, number | string> =
    values.driver === 'local' ? localConfig(values) : ossConfig(values);
  return {
    code: String(values.code ?? '').trim(),
    name: String(values.name ?? '').trim(),
    driver: values.driver,
    priority: Number(values.priority),
    enabled: Boolean(values.enabled),
    isFallback: Boolean(values.isFallback),
    config,
  };
}

export function storageSourceToFormValues(
  source: StorageSourceApi.StorageSource,
) {
  return {
    code: source.code,
    name: source.name,
    driver: source.driver,
    priority: source.priority,
    enabled: source.enabled,
    isFallback: source.isFallback,
    ...source.config,
  };
}
