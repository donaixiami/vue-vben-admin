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
});
