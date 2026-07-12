import type { MonitorJobApi } from '#/api/monitor/job';

import { describe, expect, it } from 'vitest';

import { normalizeJobPayload } from '../job-form';

const handler: MonitorJobApi.Handler = {
  defaultTimeoutSeconds: 60,
  description: 'cleanup',
  key: 'monitor.loginLog.cleanup',
  name: '清理登录日志',
  parameterSchema: [
    {
      defaultValue: 90,
      key: 'retainDays',
      label: '保留天数',
      type: 'number',
    },
  ],
};

describe('scheduled task form helpers', () => {
  it('normalizes group and declared handler parameters', () => {
    expect(
      normalizeJobPayload(
        {
          concurrentPolicy: 'forbid',
          cronExpression: ' 0 * * * * * ',
          handlerKey: handler.key,
          jobGroup: ' MONITOR ',
          maxRetryCount: 0,
          misfirePolicy: 'fire_once',
          name: ' cleanup ',
          parameters: { retainDays: '90', stale: 'remove' },
          retryIntervalSeconds: 30,
          status: 'enabled',
          timeoutSeconds: 60,
        },
        handler,
      ),
    ).toMatchObject({
      cronExpression: '0 * * * * *',
      jobGroup: 'MONITOR',
      name: 'cleanup',
      parameters: { retainDays: 90 },
    });
  });
});
