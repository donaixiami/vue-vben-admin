// Feature: 通知富文本编辑器接入私有图片关联
//
// Scenario: 富文本图片使用通知内容用途上传
//   Given 管理员在通知富文本中选择一张本地图片
//   When 框架 Tiptap 执行图片上传
//   Then 前端使用 notification_content 用途调用统一私有上传接口
//   And 编辑态显示本地预览但提交 HTML 保存 uploadRef 标识而非 Blob 地址
//
// Scenario: 编辑已有通知时还原私有图片
//   Given 通知 HTML 包含稳定图片标识且接口返回对应 mediaRef
//   When 编辑抽屉或详情组件展示富文本
//   Then 前端通过现有私有 Blob 请求工具加载图片并替换为对象 URL
//
// Scenario: 提交和销毁时不泄漏临时对象地址
//   Given 编辑器中存在已还原图片和新上传图片的对象 URL
//   When 表单提交或组件销毁
//   Then 提交 HTML 移除对象 URL 并保留稳定标识或 uploadRef
//   And 组件撤销所有自己创建的对象 URL 和未完成请求
//
// Scenario: 外部 HTTPS 图片保持直接引用
//   Given 富文本包含没有本地资源标识的 HTTPS 图片
//   When 内容被还原和提交
//   Then 图片 URL 保持不变且不触发私有媒体请求

import { describe, it } from 'vitest';

describe('通知富文本私有图片关联', () => {
  it('使用 notification_content 用途上传并提交 uploadRef 标识', () => {});
  it('使用 mediaRef 将稳定图片标识还原为私有 Blob 图片', () => {});
  it('提交与销毁时清理对象 URL 和未完成请求', () => {});
  it('外部 HTTPS 图片保持原样且不触发私有媒体请求', () => {});
});
