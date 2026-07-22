// Feature: 用户表单头像绑定 uploadRef
//
// Scenario: 新上传头像提交 avatarUploadRef
//   Given 用户选择新头像并上传成功得到 uploadRef
//   When 点击保存
//   Then 请求体包含 avatarUploadRef
//   And 不包含 avatar_file_id / avatars / 永久 file_url
//
// Scenario: 未更换头像时不提交头像字段
//   Given 编辑用户仅修改昵称
//   When 保存
//   Then 请求体不包含 avatarUploadRef 与 avatar_file_id

import { describe, it } from 'vitest';

describe('用户表单头像绑定 uploadRef', () => {
  it('新上传头像提交 avatarUploadRef 而非 avatar_file_id', () => {
    // Given 新上传成功 response.uploadRef
    // When 组装提交 payload
    // Then 仅 avatarUploadRef
  });

  it('未更换头像时不提交头像绑定字段', () => {
    // Given 仅修改昵称
    // When 组装提交 payload
    // Then 无 avatarUploadRef / avatar_file_id
  });
});
