import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getDictionaryByIdentifier } = vi.hoisted(() => ({
  getDictionaryByIdentifier: vi.fn(),
}));

vi.mock('#/api/system/dictionary', () => {
  return {
    getDictionaryByIdentifier,
  };
});

describe('notification message type tag options', () => {
  beforeEach(() => {
    getDictionaryByIdentifier.mockReset();
  });

  it('combines message type labels with tag types by dictionary value', async () => {
    const { buildMessageTypeTagOptions } = await import('../message-type');

    expect(
      buildMessageTypeTagOptions(
        [
          { label: '系统公告', value: 'system' },
          { label: '普通消息', value: 'message' },
        ],
        [
          { label: 'primary', value: 'system' },
          { label: 'success', value: 'message' },
        ],
      ),
    ).toEqual([
      { label: '系统公告', type: 'primary', value: 'system' },
      { label: '普通消息', type: 'success', value: 'message' },
    ]);
  });

  it('loads both dictionaries in order and merges the options', async () => {
    const { loadMessageTypeTagOptions } = await import('../message-type');

    getDictionaryByIdentifier
      .mockResolvedValueOnce({
        value: [{ label: '系统公告', value: 'system' }],
      })
      .mockResolvedValueOnce({
        value: [{ label: 'primary', value: 'system' }],
      });

    await expect(loadMessageTypeTagOptions()).resolves.toEqual([
      { label: '系统公告', type: 'primary', value: 'system' },
    ]);

    expect(getDictionaryByIdentifier).toHaveBeenNthCalledWith(
      1,
      'message_type',
    );
    expect(getDictionaryByIdentifier).toHaveBeenNthCalledWith(
      2,
      'message_type_color',
    );
  });
});
