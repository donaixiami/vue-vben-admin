import { describe, expect, it, vi } from 'vitest';

import logDrawerSource from '../log-drawer.vue?raw';

vi.mock('#/locales', () => ({ $t: (key: string) => key }));

// Feature: 调度日志使用可理解的中文展示
//
// Scenario: 触发方式显示为项目现有样式的中文标签
//   Given 日志触发方式是 schedule、manual、retry 或未知值
//   When 调度日志表格渲染触发方式
//   Then 已知值分别显示“定时”“手动”“重试”的 ElTag
//   And 未知值只显示“未知”，不回显原始字段代码
//   And 执行状态同样使用已有中文标签，不显示 success 等字段值
//
// Scenario: 定时任务模块的时间统一显示到秒
//   Given 任务列表和调度日志包含有效时间或空时间
//   When 页面渲染上次执行、下次执行、开始时间和结束时间
//   Then 有效时间显示为 YYYY-MM-DD HH:mm:ss
//   And 空时间显示为横线占位
describe('调度日志展示', () => {
  it('将触发方式映射为中文标签且不回显未知字段', async () => {
    const presentation = (await import('../../data')) as Record<string, any>;

    expect(presentation.TRIGGER_TYPE_OPTIONS).toEqual([
      { label: '定时', type: 'primary', value: 'schedule' },
      { label: '手动', type: 'success', value: 'manual' },
      { label: '重试', type: 'warning', value: 'retry' },
    ]);
    expect(presentation.getTriggerTypeOption('schedule')).toEqual(
      expect.objectContaining({ label: '定时', type: 'primary' }),
    );
    expect(presentation.getTriggerTypeOption('unexpected')).toEqual(
      expect.objectContaining({ label: '未知', type: 'info' }),
    );
    expect(presentation.getRunStatusOption).toBeTypeOf('function');
    expect(presentation.getRunStatusOption('success')).toEqual(
      expect.objectContaining({ label: '成功', type: 'success' }),
    );
    expect(presentation.getRunStatusOption('unexpected')).toEqual(
      expect.objectContaining({ label: '未知', type: 'info' }),
    );
    expect(logDrawerSource).toContain('v-for="item in TRIGGER_TYPE_OPTIONS"');
    expect(logDrawerSource).toContain('<ElTag');
    expect(logDrawerSource).not.toContain('<ElTableColumn prop="trigger_type"');
    expect(logDrawerSource).not.toContain('{{ row.status }}');
  });

  it('将定时任务模块的所有时间统一格式化到秒', async () => {
    const presentation = (await import('../../data')) as Record<string, any>;
    const columns = presentation.useColumns(() => {});
    const lastRunAtColumn = columns.find(
      (column: { field?: string }) => column.field === 'last_run_at',
    );
    const nextRunAtColumn = columns.find(
      (column: { field?: string }) => column.field === 'next_run_at',
    );

    expect(lastRunAtColumn?.formatter).toBe('formatDateTime');
    expect(nextRunAtColumn?.formatter).toBe('formatDateTime');
    expect(presentation.formatJobTime).toBeTypeOf('function');
    const formatJobTime = presentation.formatJobTime as (
      value: null | string,
    ) => string;
    expect(formatJobTime('2026-07-06 01:04:08')).toBe('2026-07-06 01:04:08');
    expect(formatJobTime(null)).toBe('—');
    expect(logDrawerSource).toContain('formatJobTime(row.started_at)');
    expect(logDrawerSource).toContain('formatJobTime(row.finished_at)');
  });
});
