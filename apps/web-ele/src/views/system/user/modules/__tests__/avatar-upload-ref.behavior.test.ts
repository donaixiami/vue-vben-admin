// Feature: 用户表单头像绑定 uploadRef
//
// Scenario: 新上传头像提交私有上传凭证
//   Given 用户选择新头像并上传成功得到 uploadRef
//   When 保存用户
//   Then 请求体包含 avatarUploadRef，不包含旧的 file id、URL 或密码字段
//
// Scenario: 编辑用户但没有替换头像
//   Given 用户只修改昵称
//   When 保存用户
//   Then 请求体不包含头像绑定字段

import { describe, expect, it } from 'vitest';

import { buildUserSubmitPayload } from '#/utils/private-upload-form';

describe('用户表单头像绑定 uploadRef', () => {
  it('提交 avatarUploadRef 而非旧头像字段', () => {
    const payload = buildUserSubmitPayload({
      username: 'cs1',
      avatars: [{ response: { uploadRef: 'u_avatar' } }],
      avatar_file_id: 9,
      avatar: 'https://legacy.invalid/avatar.png',
      password: 'should-not-submit',
    });

    expect(payload).toEqual({
      username: 'cs1',
      avatarUploadRef: 'u_avatar',
    });
  });

  it('没有替换头像时不提交头像绑定字段', () => {
    const payload = buildUserSubmitPayload({
      username: 'cs1',
      real_name: '测试',
      avatarMediaRef: 'm_existing',
      avatar_file_id: 9,
    });

    expect(payload).toEqual({ username: 'cs1', real_name: '测试' });
  });
});
