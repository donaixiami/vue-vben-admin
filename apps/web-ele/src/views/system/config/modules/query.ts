import type { SystemConfigApi } from '#/api';

function isEmptyQueryValue(value: unknown) {
  return (
    value === undefined ||
    value === null ||
    (typeof value === 'string' && value.trim() === '') ||
    (Array.isArray(value) && value.length === 0)
  );
}

export function normalizeSystemConfigQueryParams(
  formValues: Record<string, unknown>,
): SystemConfigApi.QueryConfigParams {
  const { created_at: createdAt, ...restValues } = formValues;
  const params = Object.fromEntries(
    Object.entries(restValues).filter(([, value]) => !isEmptyQueryValue(value)),
  ) as SystemConfigApi.QueryConfigParams;

  if (Array.isArray(createdAt) && createdAt.length === 2) {
    const [fromTime, toTime] = createdAt;
    if (!isEmptyQueryValue(fromTime)) {
      params.from_time = String(fromTime);
    }
    if (!isEmptyQueryValue(toTime)) {
      params.to_time = String(toTime);
    }
  }

  return params;
}
