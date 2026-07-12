import { describe, expect, it } from 'vitest';

import { previewCronRuns, validateCronExpression } from '../cron';

describe('scheduled task cron helpers', () => {
  it('rejects five-field expressions', () => {
    expect(validateCronExpression('0 2 * * *')).toEqual({
      message: '请输入包含秒的六段式 Cron 表达式',
      valid: false,
    });
  });

  it('returns five future Asia/Shanghai run times', () => {
    const runs = previewCronRuns(
      '0 0 2 * * *',
      new Date('2026-07-12T00:00:00+08:00'),
    );

    expect(runs).toHaveLength(5);
    expect(runs[0]).toContain('2026-07-12 02:00:00');
  });

  it('returns a readable error for invalid expressions', () => {
    expect(validateCronExpression('not a cron value')).toMatchObject({
      valid: false,
    });
  });
});
