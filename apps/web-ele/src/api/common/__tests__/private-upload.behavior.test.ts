// Feature: 私有上传统一 API 封装
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createPrivateUploadRequest,
  revokeChatAsset,
  uploadChatAsset,
  uploadPrivateFile,
} from '../upload';

const { upload, del } = vi.hoisted(() => ({
  upload: vi.fn(),
  del: vi.fn(),
}));

vi.mock('#/api/request', () => ({
  requestClient: { upload, delete: del },
}));

describe('私有上传统一 API 封装', () => {
  beforeEach(() => {
    upload.mockReset();
    del.mockReset();
  });

  it('普通业务上传携带 purpose 并只暴露 uploadRef', async () => {
    upload.mockResolvedValue({
      uploadRef: 'u_1',
      byteSize: 10,
      mimeType: 'image/jpeg',
      width: 1,
      height: 1,
    });
    const result = await uploadPrivateFile(
      new File(['x'], 'a.jpg', { type: 'image/jpeg' }),
      'avatar',
    );
    expect(upload).toHaveBeenCalledWith('/file/upload', {
      file: expect.any(File),
      purpose: 'avatar',
    });
    expect(result.uploadRef).toBe('u_1');
    expect(JSON.stringify(result)).not.toMatch(/file_url|uploadId|object_key/);
  });

  it('聊天附件上传返回 assetId 而非物理 ID', async () => {
    upload.mockResolvedValue({
      assetId: 9,
      kind: 'image',
      mimeType: 'image/png',
      byteSize: 3,
      width: null,
      height: null,
    });
    const result = await uploadChatAsset(
      new File(['x'], 'b.png', { type: 'image/png' }),
    );
    expect(upload).toHaveBeenCalledWith('/chat/assets/upload', {
      file: expect.any(File),
    });
    expect(result.assetId).toBe(9);
  });

  it('撤销未发送聊天资产调用 DELETE /chat/assets/:assetId', async () => {
    del.mockResolvedValue(undefined);
    await revokeChatAsset(9);
    expect(del).toHaveBeenCalledWith('/chat/assets/9');
  });

  it('Element Upload 适配器注入 purpose', async () => {
    upload.mockResolvedValue({ uploadRef: 'u_n' });
    const httpRequest = createPrivateUploadRequest('notification');
    await httpRequest({
      file: new File(['x'], 'n.jpg'),
      onSuccess: vi.fn(),
    });
    expect(upload).toHaveBeenCalledWith('/file/upload', {
      file: expect.any(File),
      purpose: 'notification',
    });
  });
});
