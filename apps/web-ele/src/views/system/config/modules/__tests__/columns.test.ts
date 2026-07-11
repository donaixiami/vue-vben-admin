import { describe, expect, it, vi } from 'vitest';

const zStringChain = {
  max: vi.fn(() => zStringChain),
  min: vi.fn(() => zStringChain),
  refine: vi.fn(() => zStringChain),
  regex: vi.fn(() => zStringChain),
};

vi.mock('#/adapter/form', () => ({
  z: {
    string: () => zStringChain,
  },
}));

vi.mock('#/api', () => ({
  getSystemConfigKeyExists: vi.fn(),
}));

vi.mock('#/locales', () => ({
  $t: (key: string) => key,
}));

describe('system config columns', () => {
  it('shows both edit and delete operations', async () => {
    const { useColumns } = await import('../../data');
    const columns = useColumns(() => {});
    const operationColumn = columns?.find(
      (column) => column.field === 'operation',
    );

    expect(operationColumn?.cellRender?.options).toEqual(['edit', 'delete']);
  });

  it('masks sensitive values even if the API returns the raw value', async () => {
    const { useColumns } = await import('../../data');
    const columns = useColumns(() => {});
    const valueColumn = columns?.find(
      (column) => column.field === 'config_value',
    );
    const remarkColumn = columns?.find((column) => column.field === 'remark');
    const row = {
      config_key: 'sys.user.initPassword',
      config_value: 'real-secret',
      remark: 'real-secret',
    };
    const valueFormatter = valueColumn?.formatter;
    const remarkFormatter = remarkColumn?.formatter;

    expect(typeof valueFormatter).toBe('function');
    expect(typeof remarkFormatter).toBe('function');
    if (
      typeof valueFormatter !== 'function' ||
      typeof remarkFormatter !== 'function'
    ) {
      throw new TypeError('Sensitive columns must use formatter functions');
    }

    expect(valueFormatter({ row } as never)).toBe('••••••••');
    expect(remarkFormatter({ row } as never)).toBe('••••••••');
  });
});
