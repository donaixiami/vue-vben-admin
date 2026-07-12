import { describe, expect, it, vi } from 'vitest';

vi.mock('#/locales', () => ({ $t: (key: string) => key }));

describe('scheduled task table data', () => {
  it('contains ruoyi-style job columns and operations', async () => {
    const { useColumns } = await import('../../data');
    const columns = useColumns(() => {});
    const fields = columns?.map((column) => column.field);
    const operation = columns?.find((column) => column.field === 'operation');

    expect(fields).toEqual(
      expect.arrayContaining([
        'job_group',
        'misfire_policy',
        'cron_expression',
        'last_run_status',
        'next_run_at',
      ]),
    );
    expect(operation?.cellRender?.options).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'run' }),
        expect.objectContaining({ code: 'logs' }),
        'edit',
        'delete',
      ]),
    );
  });
});
