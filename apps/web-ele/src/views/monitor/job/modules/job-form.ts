import type { MonitorJobApi } from '#/api/monitor/job';

export interface JobFormModel extends Omit<
  MonitorJobApi.JobPayload,
  'parameters'
> {
  parameters: Record<string, unknown>;
}

export function normalizeJobPayload(
  model: JobFormModel,
  handler: MonitorJobApi.Handler,
): MonitorJobApi.JobPayload {
  const entries: Array<[string, unknown]> = [];
  for (const schema of handler.parameterSchema) {
    const raw = model.parameters[schema.key] ?? schema.defaultValue;
    if (raw === undefined || raw === null || raw === '') continue;
    if (schema.type === 'number') {
      entries.push([schema.key, Number(raw)]);
    } else if (schema.type === 'boolean') {
      entries.push([
        schema.key,
        typeof raw === 'boolean' ? raw : raw === 'true' || raw === 1,
      ]);
    } else {
      entries.push([schema.key, String(raw)]);
    }
  }
  const parameters = Object.fromEntries(entries);

  return {
    ...model,
    cronExpression: model.cronExpression.trim(),
    jobGroup: model.jobGroup.trim().toUpperCase(),
    name: model.name.trim(),
    parameters,
    remark: model.remark?.trim() || null,
  };
}

export function createDefaultModel(): JobFormModel {
  return {
    concurrentPolicy: 'forbid',
    cronExpression: '0 * * * * *',
    handlerKey: '',
    jobGroup: 'DEFAULT',
    maxRetryCount: 0,
    misfirePolicy: 'default',
    name: '',
    parameters: {},
    remark: null,
    retryIntervalSeconds: 30,
    status: 'disabled',
    timeoutSeconds: 60,
  };
}
