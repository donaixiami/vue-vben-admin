import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getDictionaryByIdentifier } = vi.hoisted(() => ({
  getDictionaryByIdentifier: vi.fn(),
}));

vi.mock('#/api/system/dictionary', () => {
  return {
    getDictionaryByIdentifier,
  };
});

describe('notification send state tag options', () => {
  beforeEach(() => {
    getDictionaryByIdentifier.mockReset();
  });

  it('combines status labels with tag types by dictionary value', async () => {
    const { buildSendStateTagOptions } = await import('../send-state');

    expect(
      buildSendStateTagOptions(
        [
          { label: '待发送', value: 'draft' },
          { label: '已发送', value: 'sent' },
        ],
        [
          { label: 'warning', value: 'draft' },
          { label: 'success', value: 'sent' },
        ],
      ),
    ).toEqual([
      { label: '待发送', type: 'warning', value: 'draft' },
      { label: '已发送', type: 'success', value: 'sent' },
    ]);
  });

  it('loads both dictionaries in order and merges the options', async () => {
    const { loadSendStateTagOptions } = await import('../send-state');

    getDictionaryByIdentifier
      .mockResolvedValueOnce({
        value: [{ label: '待发送', value: 'draft' }],
      })
      .mockResolvedValueOnce({
        value: [{ label: 'warning', value: 'draft' }],
      });

    await expect(loadSendStateTagOptions()).resolves.toEqual([
      { label: '待发送', type: 'warning', value: 'draft' },
    ]);

    expect(getDictionaryByIdentifier).toHaveBeenNthCalledWith(1, 'send_state');
    expect(getDictionaryByIdentifier).toHaveBeenNthCalledWith(
      2,
      'send_state_color',
    );
  });
});
