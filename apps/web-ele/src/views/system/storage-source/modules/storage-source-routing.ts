import type { StorageSourceApi } from '#/api/system/storage-source';

export interface StorageProviderGroup {
  label: string;
  provider: string;
  sources: StorageSourceApi.StorageSource[];
}

export interface StorageCategoryGroup {
  category: StorageSourceApi.StorageCategory;
  label: string;
  providers: StorageProviderGroup[];
}

const CATEGORY_LABELS: Record<StorageSourceApi.StorageCategory, string> = {
  local: '本地存储',
  object_storage: '对象存储',
  netdisk: '网盘存储',
};

const CATEGORY_ORDER: StorageSourceApi.StorageCategory[] = [
  'local',
  'object_storage',
  'netdisk',
];

export function getStorageCategoryLabel(
  category: StorageSourceApi.StorageCategory,
): string {
  return CATEGORY_LABELS[category];
}

export function groupStorageSources(
  sources: StorageSourceApi.StorageSource[],
  drivers: StorageSourceApi.DriverDescriptor[],
): StorageCategoryGroup[] {
  const driverLabels = new Map(drivers.map((item) => [item.type, item.label]));
  const categoryMap = new Map<
    StorageSourceApi.StorageCategory,
    Map<string, StorageSourceApi.StorageSource[]>
  >();

  for (const source of sources) {
    const providers = categoryMap.get(source.sourceKind) ?? new Map();
    const providerSources = providers.get(source.provider) ?? [];
    providerSources.push(source);
    providers.set(source.provider, providerSources);
    categoryMap.set(source.sourceKind, providers);
  }

  return CATEGORY_ORDER.filter((category) => categoryMap.has(category)).map(
    (category) => ({
      category,
      label: getStorageCategoryLabel(category),
      providers: [
        ...(
          categoryMap.get(category) ??
          new Map<string, StorageSourceApi.StorageSource[]>()
        ).entries(),
      ]
        .toSorted(([left], [right]) => left.localeCompare(right))
        .map(([provider, providerSources]) => ({
          label:
            driverLabels.get(provider) ??
            providerSources[0]?.providerLabel ??
            provider,
          provider,
          sources: providerSources.toSorted(
            (left, right) =>
              left.priority - right.priority || left.id - right.id,
          ),
        })),
    }),
  );
}
