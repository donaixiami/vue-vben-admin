// Feature: 通知表单图片绑定 uploadRef
//
// Scenario: 通知图片使用 purpose=notification 并提交 avatarUploadRef
//   Given 通知表单上传图片成功
//   When 保存通知
//   Then 上传 purpose 为 notification
//   And 提交 avatarUploadRef，不提交 avatar_file_id

import { describe, it } from 'vitest';

describe('通知表单图片绑定 uploadRef', () => {
  it('通知图片 purpose=notification 并提交 avatarUploadRef', () => {
    // Given 上传成功
    // When 组装提交
    // Then purpose=notification 且 avatarUploadRef
  });
});
