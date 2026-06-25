import type { Recordable } from '@vben/types';

export type TargetType = 'depts' | 'roles' | 'users';

export type TargetListItem = {
  [key: string]: any;
  id: number | string;
  name?: string;
  real_name?: string;
  username?: string;
};

export type TargetListResponse =
  | TargetListItem[]
  | {
      items?: TargetListItem[];
      total?: number;
    };

export type TargetListApi = (
  params?: Recordable<any>,
) => Promise<TargetListResponse>;

export type TargetListApiMap = Record<TargetType, TargetListApi>;

const selectableTargetTypes = new Set<string>(['depts', 'roles', 'users']);

export function isTargetType(
  value: unknown,
  apis: TargetListApiMap,
): value is TargetType {
  return (
    typeof value === 'string' &&
    Object.prototype.hasOwnProperty.call(apis, value)
  );
}

export function getTargetListItems(
  response: TargetListResponse,
): TargetListItem[] {
  if (Array.isArray(response)) {
    return response;
  }

  return Array.isArray(response.items) ? response.items : [];
}

export async function loadTargetList(
  targetType: string | undefined,
  apis: TargetListApiMap,
  params: Recordable<any> = {},
) {
  if (!isTargetType(targetType, apis)) {
    return [];
  }

  return getTargetListItems(await apis[targetType](params));
}

export function shouldClearSelectedTargets(
  nextTargetType: string | undefined,
  previousTargetType: string | undefined,
) {
  return (
    selectableTargetTypes.has(String(previousTargetType)) &&
    nextTargetType !== previousTargetType
  );
}

export function normalizeTargetIds(ids: Array<number | string>) {
  return ids.map(Number).filter((id) => Number.isFinite(id));
}

export function removeTargetId(ids: number[], targetId: number | string) {
  const normalizedTargetId = Number(targetId);

  if (!Number.isFinite(normalizedTargetId)) {
    return ids;
  }

  return ids.filter((id) => id !== normalizedTargetId);
}

export function getTargetItemNumericId(item: TargetListItem) {
  const id = Number(item.id);

  return Number.isFinite(id) ? id : undefined;
}
