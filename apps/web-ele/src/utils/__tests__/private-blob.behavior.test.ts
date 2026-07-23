// Feature: 鉴权 Blob 内容读取与生命周期
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  clearPrivateBlobCache,
  resolveChatAssetBlobUrl,
  resolvePrivateBlobUrl,
  revokePrivateBlobUrl,
} from '../private-blob';

const createObjectURL = vi.fn(() => 'blob:http://local/1');
const revokeObjectURL = vi.fn();

vi.stubGlobal('URL', {
  createObjectURL,
  revokeObjectURL,
});

const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

vi.mock('@vben/stores', () => ({
  useAccessStore: () => ({ accessToken: 'tok' }),
}));
vi.mock('@vben/hooks', () => ({
  useAppConfig: () => ({ apiURL: 'http://api.test/api' }),
}));

describe('鉴权 Blob 内容读取与生命周期', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    createObjectURL.mockClear();
    revokeObjectURL.mockClear();
    clearPrivateBlobCache();
  });

  it('用 Bearer 拉取 mediaRef 并创建 Object URL', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      blob: async () => new Blob(['img']),
    });
    const url = await resolvePrivateBlobUrl('m_abc');
    expect(fetchMock).toHaveBeenCalledWith(
      'http://api.test/api/media/m_abc/content',
      expect.objectContaining({
        headers: { Authorization: 'Bearer tok' },
      }),
    );
    expect(fetchMock.mock.calls[0]?.[1]).not.toHaveProperty('credentials');
    expect(url).toBe('blob:http://local/1');
  });

  it('用 Bearer 拉取聊天 asset 内容', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      blob: async () => new Blob(['f']),
    });
    await resolveChatAssetBlobUrl(12);
    expect(fetchMock).toHaveBeenCalledWith(
      'http://api.test/api/chat/assets/12/content',
      expect.objectContaining({
        headers: { Authorization: 'Bearer tok' },
      }),
    );
  });

  it('换记录或卸载时成对 revokeObjectURL', () => {
    revokePrivateBlobUrl('blob:http://local/1');
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:http://local/1');
  });
});
