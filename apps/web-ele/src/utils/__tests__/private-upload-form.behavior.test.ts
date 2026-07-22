import { describe, expect, it } from 'vitest';

import {
  buildNotificationSubmitPayload,
  buildUserSubmitPayload,
  formatByteSize,
  formatImageSize,
  SAFE_FILE_COLUMNS,
} from '../private-upload-form';

describe('用户表单头像绑定 uploadRef', () => {
  it('新上传头像提交 avatarUploadRef 而非 avatar_file_id', () => {
    const payload = buildUserSubmitPayload({
      real_name: 'A',
      avatars: [{ response: { uploadRef: 'u_x' } }],
      avatar_file_id: 1,
    });
    expect(payload.avatarUploadRef).toBe('u_x');
    expect(payload).not.toHaveProperty('avatar_file_id');
    expect(payload).not.toHaveProperty('avatars');
  });

  it('未更换头像时不提交头像绑定字段', () => {
    const payload = buildUserSubmitPayload({
      real_name: 'B',
      avatars: [{ url: 'blob:old', response: undefined }],
    });
    expect(payload).not.toHaveProperty('avatarUploadRef');
    expect(payload).not.toHaveProperty('avatar_file_id');
  });
});

describe('通知表单图片绑定 uploadRef', () => {
  it('通知图片 purpose=notification 并提交 avatarUploadRef', () => {
    const payload = buildNotificationSubmitPayload({
      title: 't',
      avatars: [{ response: { uploadRef: 'u_n' } }],
    });
    expect(payload.avatarUploadRef).toBe('u_n');
  });
});

describe('文件管理安全列表', () => {
  it('列定义只含安全元数据不含物理定位字段', () => {
    expect(SAFE_FILE_COLUMNS).not.toContain('file_url');
    expect(SAFE_FILE_COLUMNS).not.toContain('object_key');
    expect(SAFE_FILE_COLUMNS).toContain('content_hash_prefix');
  });

  it('格式化字节大小与缺失图片尺寸', () => {
    expect(formatByteSize(1024)).toBe('1.0 KB');
    expect(formatImageSize(null, null)).toBe('—');
  });
});
