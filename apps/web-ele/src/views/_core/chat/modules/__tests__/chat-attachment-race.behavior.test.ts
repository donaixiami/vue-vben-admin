import type { ChatAttachmentView } from '../chat-attachment';

import { describe, expect, it, vi } from 'vitest';

import {
  createChatAttachmentBlobController,
  createChatAttachmentUploadController,
} from '../chat-attachment';

// Feature: 聊天附件读取与页面生命周期隔离
//
// Scenario: 同一附件并发读取只保留一个请求
//   Given 多条消息同时引用同一个附件
//   When 页面开始读取附件内容
//   Then resolver 只被调用一次
//   And 所有调用方使用同一个已解析地址
//
// Scenario: 历史替换或会话切换中止旧读取
//   Given 旧历史附件仍在加载
//   When 页面开始新的加载代次
//   Then 旧请求的 signal 被中止
//   And 迟到的地址被释放且不会写入当前状态
//
// Scenario: 清空或卸载释放附件地址
//   Given 页面已经创建附件 Blob URL
//   When 清空消息或卸载组件
//   Then URL 只被 revoke 一次
//
// Scenario: 旧附件上传迟到
//   Given 用户选择附件 A 后立即选择或移除附件 B
//   When 附件 A 在失效后才上传成功
//   Then A 不得覆盖当前附件状态
//   And A 对应的服务端资产会被撤销

describe('聊天附件异步竞态', () => {
  it('旧附件上传迟到后不再被接受并撤销其服务端资产', async () => {
    const revoke = vi.fn().mockResolvedValue(undefined);
    const controller = createChatAttachmentUploadController({ revoke });
    const oldRequest = controller.begin();

    controller.begin();

    expect(oldRequest.signal.aborted).toBe(true);
    await expect(controller.accept(oldRequest, 17)).resolves.toBe(false);
    expect(revoke).toHaveBeenCalledOnce();
    expect(revoke).toHaveBeenCalledWith(17);
  });

  function attachment(assetId: number): ChatAttachmentView {
    return { assetId, kind: 'file', status: 'active' };
  }

  function deferred<T>() {
    let resolve!: (value: T) => void;
    let reject!: (reason?: unknown) => void;
    const promise = new Promise<T>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, reject, resolve };
  }

  it('同一附件并发加载时只请求一次并共享已解析地址', async () => {
    const pending = deferred<string>();
    const resolve = vi.fn(() => pending.promise);
    const onUrl = vi.fn();
    const controller = createChatAttachmentBlobController({
      onUrl,
      resolve,
      revoke: vi.fn(),
    });

    const first = controller.load([attachment(7)]);
    const second = controller.load([attachment(7)]);
    expect(resolve).toHaveBeenCalledTimes(1);

    pending.resolve('blob:asset-7');
    await Promise.all([first, second]);

    expect(onUrl).toHaveBeenCalledTimes(1);
    expect(onUrl).toHaveBeenCalledWith(7, 'blob:asset-7');
    expect(controller.getUrl(7)).toBe('blob:asset-7');
    expect(resolve).toHaveBeenCalledWith(
      7,
      { signal: expect.any(AbortSignal) },
      expect.objectContaining({ assetId: 7, kind: 'file' }),
    );
  });

  it('重置加载代次时中止旧请求并释放迟到地址而不回写', async () => {
    const pending = deferred<string>();
    const resolve = vi.fn(
      (_assetId: number, options: { signal: AbortSignal }) => {
        expect(options.signal).toBeInstanceOf(AbortSignal);
        return pending.promise;
      },
    );
    const onUrl = vi.fn();
    const revoke = vi.fn();
    const controller = createChatAttachmentBlobController({
      onUrl,
      resolve,
      revoke,
    });

    const oldLoad = controller.load([attachment(1)]);
    const oldSignal = controller.signal;
    controller.reset();
    expect(oldSignal.aborted).toBe(true);

    pending.resolve('blob:late-1');
    await oldLoad;

    expect(onUrl).not.toHaveBeenCalled();
    expect(revoke).toHaveBeenCalledWith('blob:late-1');
    expect(controller.getUrl(1)).toBeUndefined();
  });

  it('清空或卸载时释放活动地址且重复清理不会重复 revoke', async () => {
    const revoke = vi.fn();
    const controller = createChatAttachmentBlobController({
      onUrl: vi.fn(),
      resolve: vi.fn().mockResolvedValue('blob:active-2'),
      revoke,
    });

    await controller.load([attachment(2)]);
    controller.clear();
    controller.dispose();

    expect(revoke).toHaveBeenCalledTimes(1);
    expect(revoke).toHaveBeenCalledWith('blob:active-2');
  });
});
