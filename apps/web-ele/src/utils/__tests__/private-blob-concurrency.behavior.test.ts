import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  clearPrivateBlobCache,
  configurePrivateBlobLoader,
  isPrivateBlobAbortError,
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

function flush(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

// Feature: 私有 Blob 请求有界并发、单飞复用和生命周期回收
//
// Scenario: 大量媒体同时加载时限制全局并发
//   Given 页面同时请求二十个不同媒体引用
//   When 私有 Blob 加载器开始工作
//   Then 活跃网络请求不超过配置上限
//   And 所有任务最终返回或以统一错误结束
//
// Scenario: 相同媒体引用在途时只请求一次
//   Given 多个组件同时请求同一个 mediaRef
//   When 首次请求尚未完成
//   Then 后续调用复用同一个在途任务
//
// Scenario: 旧列表结果不得覆盖新列表
//   Given 用户列表先后发起两次查询且旧查询更晚完成
//   When 两批头像 Blob 返回
//   Then 只回写新列表结果
//   And 旧列表创建的 Blob URL 全部释放
//
// Scenario: 编辑抽屉关闭或切换记录后释放迟到预览
//   Given 用户或通知头像预览请求仍在进行
//   When 抽屉关闭或切换到另一条记录
//   Then 旧请求结果不回写表单并立即释放
//
// Scenario: 通知本地预览替换和关闭时恰好释放一次
//   Given 通知上传创建了本地 object URL
//   When 图片被替换、移除或抽屉关闭
//   Then 每个 object URL 恰好 revoke 一次
//
// Scenario: 排队媒体的最后一个消费者取消
//   Given 全局并发已满且一个媒体请求仍在队列中
//   When 该媒体的最后一个消费者取消
//   Then 队列任务被移除且不会调用 fetch
//
// Scenario: 活动媒体的最后一个消费者取消
//   Given 一个媒体请求已经进入 fetch
//   When 该媒体的最后一个消费者取消
//   Then 底层 fetch 的 signal 被中止
//   And 同一资源的新消费者会创建新任务而不是复用已中止任务
//
// Scenario: 单飞媒体仍有其他消费者
//   Given 两个消费者共享同一个媒体请求
//   When 只有其中一个消费者取消
//   Then 底层 fetch 继续并为剩余消费者返回结果
//
// Scenario: 页面持有大量 Object URL
//   Given 长列表或聊天仍持有超过五百个图片地址
//   When 加载器继续创建新地址
//   Then 不得擅自撤销仍由页面持有的旧地址
//
// Scenario: 已排队资源被用户主动打开
//   Given 同一资源先以低优先级排队
//   When 用户主动预览该资源并提高优先级
//   Then 原排队任务提升优先级且仍保持单飞
describe('私有 Blob 并发与生命周期', () => {
  it('排队媒体的最后一个消费者取消后不会调用 fetch', async () => {
    configurePrivateBlobLoader({ maxConcurrency: 1 });
    let resolveActive!: (value: unknown) => void;
    fetchMock
      .mockReturnValueOnce(
        new Promise((resolve) => {
          resolveActive = resolve;
        }),
      )
      .mockResolvedValue(response('unexpected'));

    const active = resolvePrivateBlobUrl('m_active');
    const controller = new AbortController();
    const queued = resolvePrivateBlobUrl('m_queued', {
      signal: controller.signal,
    });
    controller.abort();

    await expect(queued).rejects.toSatisfy(isPrivateBlobAbortError);
    resolveActive(response('active'));
    const activeUrl = await active;
    await flush();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    revokePrivateBlobUrl(activeUrl);
  });

  it('活动媒体的最后一个消费者取消后中止底层 fetch', async () => {
    const controller = new AbortController();
    let fetchSignal!: AbortSignal;
    fetchMock.mockImplementation(
      (_url: string, init: { signal?: AbortSignal }) =>
        new Promise((_resolve, reject) => {
          fetchSignal = init.signal as AbortSignal;
          fetchSignal.addEventListener(
            'abort',
            () => {
              const error = new Error('aborted');
              error.name = 'AbortError';
              reject(error);
            },
            { once: true },
          );
        }),
    );

    const request = resolvePrivateBlobUrl('m_active_abort', {
      signal: controller.signal,
    });
    controller.abort();

    await expect(request).rejects.toSatisfy(isPrivateBlobAbortError);
    expect(fetchSignal.aborted).toBe(true);
  });

  it('最后消费者取消后同一资源的新消费者创建新任务', async () => {
    const controller = new AbortController();
    fetchMock
      .mockImplementationOnce(
        (_url: string, init: { signal?: AbortSignal }) =>
          new Promise((_resolve, reject) => {
            init.signal?.addEventListener(
              'abort',
              () => {
                const error = new Error('aborted');
                error.name = 'AbortError';
                reject(error);
              },
              { once: true },
            );
          }),
      )
      .mockResolvedValueOnce(response('replacement'));

    const cancelled = resolvePrivateBlobUrl('m_replaced', {
      signal: controller.signal,
    });
    controller.abort();
    const replacement = resolvePrivateBlobUrl('m_replaced');

    await expect(cancelled).rejects.toSatisfy(isPrivateBlobAbortError);
    const url = await replacement;
    expect(fetchMock).toHaveBeenCalledTimes(2);
    revokePrivateBlobUrl(url);
  });

  it('单飞媒体仍有消费者时不中止底层 fetch', async () => {
    const controller = new AbortController();
    let fetchSignal!: AbortSignal;
    let resolveFetch!: (value: unknown) => void;
    fetchMock.mockImplementation(
      (_url: string, init: { signal?: AbortSignal }) =>
        new Promise((resolve) => {
          fetchSignal = init.signal as AbortSignal;
          resolveFetch = resolve;
        }),
    );

    const cancelled = resolvePrivateBlobUrl('m_shared_abort', {
      signal: controller.signal,
    });
    const remaining = resolvePrivateBlobUrl('m_shared_abort');
    controller.abort();

    await expect(cancelled).rejects.toSatisfy(isPrivateBlobAbortError);
    expect(fetchSignal.aborted).toBe(false);
    resolveFetch(response('shared'));
    const url = await remaining;

    expect(fetchMock).toHaveBeenCalledTimes(1);
    revokePrivateBlobUrl(url);
  });

  beforeEach(() => {
    clearPrivateBlobCache();
    fetchMock.mockReset();
    createObjectURL.mockReset();
    revokeObjectURL.mockReset();
    let sequence = 0;
    createObjectURL.mockImplementation(() => `blob:test/${++sequence}`);
    configurePrivateBlobLoader({
      maxConcurrency: 4,
      maxRetryAttempts: 2,
      requestTimeoutMs: 10_000,
      retryBaseDelayMs: 0,
    });
  });

  it('相同 mediaRef 在途时只请求一次并为每个消费者创建独立 URL', async () => {
    let resolveFetch!: (value: unknown) => void;
    fetchMock.mockReturnValue(
      new Promise((resolve) => {
        resolveFetch = resolve;
      }),
    );

    const first = resolvePrivateBlobUrl('m_same');
    const second = resolvePrivateBlobUrl('m_same');
    await Promise.resolve();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    resolveFetch(response());
    const urls = await Promise.all([first, second]);
    expect(urls[0]).not.toBe(urls[1]);
    expect(createObjectURL).toHaveBeenCalledTimes(2);

    revokePrivateBlobUrl(urls[0]);
    revokePrivateBlobUrl(urls[1]);
    expect(revokeObjectURL).toHaveBeenCalledTimes(2);
  });

  it('大量媒体同时加载时限制全局并发', async () => {
    configurePrivateBlobLoader({ maxConcurrency: 2 });
    let active = 0;
    let peak = 0;
    const pending = new Map<string, (value: unknown) => void>();
    fetchMock.mockImplementation((url: string) => {
      active += 1;
      peak = Math.max(peak, active);
      return new Promise((resolve) => {
        pending.set(url, (value) => {
          active -= 1;
          resolve(value);
        });
      });
    });

    const requests = [1, 2, 3].map((id) => resolvePrivateBlobUrl(`m_${id}`));
    await Promise.resolve();
    await Promise.resolve();
    expect(peak).toBe(2);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    for (const id of [1, 2]) {
      const url = `http://api.test/api/media/m_${id}/content`;
      pending.get(url)?.(response(String(id)));
    }
    await flush();
    await flush();
    expect(fetchMock).toHaveBeenCalledTimes(3);

    pending.get('http://api.test/api/media/m_3/content')?.(response('3'));
    await Promise.all(requests);
  });

  it('短期缓存命中时不重复请求网络', async () => {
    fetchMock.mockResolvedValue(response());

    const first = await resolvePrivateBlobUrl('m_cached');
    revokePrivateBlobUrl(first);
    const second = await resolvePrivateBlobUrl('m_cached');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(createObjectURL).toHaveBeenCalledTimes(2);
    revokePrivateBlobUrl(second);
  });

  it('清理缓存时释放活动 URL，重复释放不会二次调用浏览器 API', async () => {
    fetchMock.mockResolvedValue(response());
    const url = await resolvePrivateBlobUrl('m_clear');

    clearPrivateBlobCache();
    revokePrivateBlobUrl(url);

    expect(revokeObjectURL).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith(url);
  });

  it('会话切换后迟到的旧请求不会回写新缓存', async () => {
    let resolveOld!: (value: unknown) => void;
    fetchMock.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveOld = resolve;
      }),
    );

    const oldRequest = resolvePrivateBlobUrl('m_epoch');
    await Promise.resolve();
    clearPrivateBlobCache();

    fetchMock.mockResolvedValueOnce(response('new'));
    const newRequest = resolvePrivateBlobUrl('m_epoch');
    resolveOld(response('old'));

    await expect(oldRequest).rejects.toSatisfy(isPrivateBlobAbortError);
    const url = await newRequest;
    expect(fetchMock).toHaveBeenCalledTimes(2);
    revokePrivateBlobUrl(url);
  });

  it('网络错误和 5xx 只进行有限重试', async () => {
    fetchMock
      .mockResolvedValueOnce({ ok: false, status: 503 })
      .mockResolvedValueOnce(response('recovered'));

    const url = await resolvePrivateBlobUrl('m_retry');

    expect(fetchMock).toHaveBeenCalledTimes(2);
    revokePrivateBlobUrl(url);
  });

  it('4xx 业务错误不重试', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 404 });

    await expect(resolvePrivateBlobUrl('m_missing')).rejects.toMatchObject({
      status: 404,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('调用方取消信号会取消消费者且不会创建 Object URL', async () => {
    const controller = new AbortController();
    let resolveFetch!: (value: unknown) => void;
    fetchMock.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveFetch = resolve;
      }),
    );

    const request = resolvePrivateBlobUrl('m_abort', {
      signal: controller.signal,
    });
    controller.abort();
    await expect(request).rejects.toSatisfy(isPrivateBlobAbortError);
    resolveFetch(response('late'));
    await flush();
    expect(createObjectURL).not.toHaveBeenCalled();
  });

  it('并发占满时优先处理高优先级的可见预览', async () => {
    configurePrivateBlobLoader({ maxConcurrency: 1 });
    const pending = new Map<string, (value: unknown) => void>();
    fetchMock.mockImplementation((url: string) => {
      return new Promise((resolve) => pending.set(url, resolve));
    });

    const active = resolvePrivateBlobUrl('m_active');
    const low = resolvePrivateBlobUrl('m_low', { priority: 0 });
    const high = resolvePrivateBlobUrl('m_high', { priority: 100 });
    await Promise.resolve();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    pending.get('http://api.test/api/media/m_active/content')?.(
      response('active'),
    );
    await flush();
    expect(fetchMock.mock.calls[1]?.[0]).toContain('/media/m_high/content');

    pending.get('http://api.test/api/media/m_high/content')?.(response('high'));
    await flush();
    expect(fetchMock.mock.calls[2]?.[0]).toContain('/media/m_low/content');

    pending.get('http://api.test/api/media/m_low/content')?.(response('low'));
    const urls = await Promise.all([active, low, high]);
    urls.forEach((url) => revokePrivateBlobUrl(url));
  });

  it('同一资源的高优先级消费者会提升已排队任务', async () => {
    configurePrivateBlobLoader({ maxConcurrency: 1 });
    const pending = new Map<string, (value: unknown) => void>();
    fetchMock.mockImplementation((url: string) => {
      return new Promise((resolve) => pending.set(url, resolve));
    });

    const active = resolvePrivateBlobUrl('m_active');
    const promotedLow = resolvePrivateBlobUrl('m_promoted', { priority: -10 });
    const medium = resolvePrivateBlobUrl('m_medium', { priority: 50 });
    const promotedHigh = resolvePrivateBlobUrl('m_promoted', { priority: 100 });

    pending.get('http://api.test/api/media/m_active/content')?.(
      response('active'),
    );
    await flush();
    expect(fetchMock.mock.calls[1]?.[0]).toContain('/media/m_promoted/content');

    pending.get('http://api.test/api/media/m_promoted/content')?.(
      response('promoted'),
    );
    await flush();
    pending.get('http://api.test/api/media/m_medium/content')?.(
      response('medium'),
    );

    const urls = await Promise.all([active, promotedLow, promotedHigh, medium]);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    urls.forEach((url) => revokePrivateBlobUrl(url));
  });

  it('不会自动撤销仍由页面持有的 Object URL', async () => {
    fetchMock.mockResolvedValue(response());

    const urls = await Promise.all(
      Array.from({ length: 501 }, (_, index) =>
        resolvePrivateBlobUrl(`m_long_${index}`),
      ),
    );

    expect(revokeObjectURL).not.toHaveBeenCalled();
    urls.forEach((url) => revokePrivateBlobUrl(url));
    expect(revokeObjectURL).toHaveBeenCalledTimes(501);
  });
});
