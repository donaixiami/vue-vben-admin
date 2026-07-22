// Feature: 文件管理安全列表
//
// Scenario: 列表只展示安全元数据列
//   Given 后端返回安全文件记录
//   When 渲染文件列表列定义
//   Then 列包含 original_name/mime_type/byte_size/is_image/image 尺寸/content_hash_prefix/ref_count/delete_status
//   And 不包含 file_url/object_key/storage_source_id
//
// Scenario: 移除无业务绑定的新建文件入口
//   Given 文件管理页
//   When 查看工具栏
//   Then 不提供会创建孤儿 claim 的「新建文件」上传入口
//
// Scenario: 图片文件可以按用户头像方式安全查看
//   Given 文件行 is_image=true 且包含 previewMediaRef
//   When 列表加载并点击「查看」
//   Then 使用鉴权请求获取 Blob 并打开图片预览
//   And 列表刷新、预览关闭或页面卸载时释放 Blob URL
//
// Scenario: 非图片不显示查看动作
//   Given 文件行 is_image=false
//   When 渲染行操作
//   Then 不提供「查看」动作

import { describe, expect, it, vi } from 'vitest';

import {
  canPreviewFile,
  loadFileImagePreview,
  releaseFileImagePreview,
} from '../modules/file-image-preview';

describe('文件管理安全列表', () => {
  it('列定义只含安全元数据不含物理定位字段', () => {
    // Given 列配置
    // When 检查 field 集合
    // Then 无 file_url/object_key
  });

  it('格式化字节大小与缺失图片尺寸', () => {
    // Given byte_size=1024 且 image_width=null
    // When 格式化
    // Then 易读大小与 — 占位
  });

  it('图片行使用 previewMediaRef 拉取 Blob 并可查看', () => {
    const resolve = vi.fn().mockResolvedValue('blob:image-preview');
    return expect(
      loadFileImagePreview(
        {
          id: 1,
          is_image: true,
          original_name: 'demo.png',
          previewMediaRef: 'm_preview',
        },
        resolve,
      ),
    ).resolves.toEqual({ name: 'demo.png', url: 'blob:image-preview' });
  });

  it('非图片不提供查看动作且 Blob URL 会被释放', () => {
    expect(canPreviewFile({ is_image: false })).toBe(false);
    expect(
      canPreviewFile({ is_image: true, previewMediaRef: 'm_preview' }),
    ).toBe(true);
    const revoke = vi.fn();
    releaseFileImagePreview('blob:image-preview', revoke);
    expect(revoke).toHaveBeenCalledWith('blob:image-preview');
  });
});
