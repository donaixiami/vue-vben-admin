import { describe, expect, it, vi } from 'vitest';

import {
  createFilePreviewController,
  loadFileImagePreview,
} from '../file-image-preview';

// Feature: 文件图片预览只展示当前请求并安全释放 Blob
//
// Scenario: 预览失败只显示中文提示
//   Given 私有媒体读取返回鉴权失败、文件不存在或网络错误
//   When 管理员点击查看图片
//   Then 页面提示“图片预览加载失败，请稍后重试”
//   And 不显示 HTTP 状态码、内部错误或空弹窗
//
// Scenario: 快速查看两张图片只展示最后一次结果
//   Given 图片 A 的请求晚于图片 B 返回
//   When 管理员依次点击 A 和 B
//   Then 页面只展示 B
//   And A 的迟到 Blob URL 立即释放
//
// Scenario: 关闭或卸载后迟到结果不再回写
//   Given 私有媒体请求仍在进行
//   When 管理员关闭弹窗或离开页面
//   Then 后续返回的 Blob URL 被释放
//   And 页面状态不再打开或更新
describe('文件图片预览生命周期', () => {
  it('读取失败只向调用方抛出可处理错误，不泄露 HTTP 细节', async () => {
    await expect(
      loadFileImagePreview(
        {
          id: 1,
          is_image: true,
          original_name: 'a.png',
          previewMediaRef: 'm_a',
        },
        async () => {
          throw new Error('private content 500');
        },
      ),
    ).rejects.toThrow('private content 500');
  });

  it('快速查看时只保留最后一代请求', () => {
    const controller = createFilePreviewController();
    const first = controller.begin();
    const second = controller.begin();

    expect(first.signal.aborted).toBe(true);
    expect(controller.isCurrent(first.generation)).toBe(false);
    expect(controller.isCurrent(second.generation)).toBe(true);
  });

  it('关闭或卸载后使迟到结果失效并取消请求', () => {
    const controller = createFilePreviewController();
    const request = controller.begin();

    controller.invalidate();

    expect(request.signal.aborted).toBe(true);
    expect(controller.isCurrent(request.generation)).toBe(false);
  });

  it('用户主动打开的文件预览使用高优先级读取', async () => {
    const resolve = vi.fn().mockResolvedValue('blob:preview');
    const controller = new AbortController();

    await loadFileImagePreview(
      { id: 1, is_image: true, original_name: 'a.png', previewMediaRef: 'm_a' },
      resolve,
      { signal: controller.signal },
    );

    expect(resolve).toHaveBeenCalledWith('m_a', {
      fit: 'inside',
      priority: 100,
      size: 1024,
      signal: controller.signal,
      variant: 'thumbnail',
    });
  });
});
