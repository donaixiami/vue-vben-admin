import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  clearPrivateBlobCache,
  resolveChatAssetBlobUrl,
  resolvePrivateBlobUrl,
  revokePrivateBlobUrl,
} from '../private-blob';

const fetchMock = vi.fn();
const createObjectURL = vi.fn();
const revokeObjectURL = vi.fn();

vi.stubGlobal('fetch', fetchMock);
vi.stubGlobal('URL', { createObjectURL, revokeObjectURL });
vi.mock('@vben/stores', () => ({
  useAccessStore: () => ({ accessToken: 'tok' }),
}));
vi.mock('@vben/hooks', () => ({
  useAppConfig: () => ({ apiURL: 'http://api.test/api' }),
}));

function response(body = 'image') {
  return { blob: async () => new Blob([body]), ok: true };
}

describe('私有 Blob 图片变体', () => {
  beforeEach(() => {
    clearPrivateBlobCache();
    fetchMock.mockReset();
    createObjectURL.mockReset();
    revokeObjectURL.mockReset();
    let sequence = 0;
    createObjectURL.mockImplementation(() => `blob:test/${++sequence}`);
    fetchMock.mockResolvedValue(response());
  });

  it('为媒体和聊天缩略图生成规范化查询参数', async () => {
    const mediaUrl = await resolvePrivateBlobUrl('m_abc', {
      fit: 'cover',
      size: 128,
      variant: 'thumbnail',
    });
    const chatUrl = await resolveChatAssetBlobUrl(12, {
      fit: 'inside',
      size: 512,
      variant: 'thumbnail',
    });

    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      'http://api.test/api/media/m_abc/content?variant=thumbnail&size=128&fit=cover',
    );
    expect(fetchMock.mock.calls[1]?.[0]).toBe(
      'http://api.test/api/chat/assets/12/content?variant=thumbnail&size=512&fit=inside',
    );
    revokePrivateBlobUrl(mediaUrl);
    revokePrivateBlobUrl(chatUrl);
  });

  it('原图和不同缩略图规格使用相互隔离的缓存键', async () => {
    const original = await resolvePrivateBlobUrl('m_same');
    const small = await resolvePrivateBlobUrl('m_same', {
      fit: 'cover',
      size: 128,
      variant: 'thumbnail',
    });
    const large = await resolvePrivateBlobUrl('m_same', {
      fit: 'inside',
      size: 1024,
      variant: 'thumbnail',
    });
    const cachedSmall = await resolvePrivateBlobUrl('m_same', {
      variant: 'thumbnail',
      size: 128,
      fit: 'cover',
    });

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(new Set([cachedSmall, large, original, small]).size).toBe(4);
    [original, small, large, cachedSmall].forEach((url) =>
      revokePrivateBlobUrl(url),
    );
  });

  it('等价变体参数共享同一个在途请求', async () => {
    let resolveFetch!: (value: unknown) => void;
    fetchMock.mockReturnValue(
      new Promise((resolve) => {
        resolveFetch = resolve;
      }),
    );

    const first = resolvePrivateBlobUrl('m_flight', {
      fit: 'inside',
      size: 256,
      variant: 'thumbnail',
    });
    const second = resolvePrivateBlobUrl('m_flight', {
      variant: 'thumbnail',
      size: 256,
      fit: 'inside',
    });
    await Promise.resolve();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    resolveFetch(response());
    const urls = await Promise.all([first, second]);
    urls.forEach((url) => revokePrivateBlobUrl(url));
  });

  it('变体请求取消后不创建 Object URL', async () => {
    const controller = new AbortController();
    fetchMock.mockImplementation(
      (_url: string, init: { signal?: AbortSignal }) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener('abort', () =>
            reject(new Error('abort')),
          );
        }),
    );

    const request = resolvePrivateBlobUrl('m_abort_variant', {
      fit: 'cover',
      signal: controller.signal,
      size: 128,
      variant: 'thumbnail',
    });
    controller.abort();

    await expect(request).rejects.toMatchObject({ name: 'AbortError' });
    expect(createObjectURL).not.toHaveBeenCalled();
  });

  it('主动下载继续请求不带变体参数的原图', async () => {
    const url = await resolvePrivateBlobUrl('m_original');

    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      'http://api.test/api/media/m_original/content',
    );
    revokePrivateBlobUrl(url);
  });

  it('拒绝缺少 variant 或缺少尺寸信息的不完整变体选项', () => {
    expect(() =>
      resolvePrivateBlobUrl('m_invalid', { fit: 'cover', size: 128 }),
    ).toThrow('必须与 variant=thumbnail 一起使用');
    expect(() =>
      resolvePrivateBlobUrl('m_invalid', { variant: 'thumbnail' }),
    ).toThrow('必须同时提供 size 和 fit');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
