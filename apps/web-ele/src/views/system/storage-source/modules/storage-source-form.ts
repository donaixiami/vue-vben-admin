import type { StorageSourceApi } from '#/api/system/storage-source';

type FormValues = Record<string, any> & {
  driver: StorageSourceApi.Driver;
};

export function getEditingStorageSource(
  data: Partial<StorageSourceApi.StorageSource> | undefined,
): StorageSourceApi.StorageSource | undefined {
  return data?.id ? (data as StorageSourceApi.StorageSource) : undefined;
}

export function getStorageSourceConfigFields(
  driver: StorageSourceApi.Driver,
): string[] {
  return driver === 'local'
    ? ['rootDir']
    : ['region', 'bucket', 'accessKeyIdRef', 'accessKeySecretRef'];
}

export function isStorageSourceIdentityLocked(
  editing: boolean,
  field: string,
): boolean {
  return editing && (field === 'code' || field === 'driver');
}

export function buildStorageSourcePayload(values: FormValues) {
  const config = Object.fromEntries(
    getStorageSourceConfigFields(values.driver).map((key) => [
      key,
      String(values[key] ?? '').trim(),
    ]),
  );
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
