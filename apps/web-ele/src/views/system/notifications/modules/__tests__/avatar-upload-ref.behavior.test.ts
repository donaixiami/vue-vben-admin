import { describe, expect, it, vi } from 'vitest';

import { useFormSchema } from '../../data';
import { createObjectUrlLifecycle } from '../object-url-lifecycle';

// Feature: 通知上传图片预览的对象 URL 生命周期
//
// Scenario: 上传新图片替换旧预览
//   Given 通知表单已有一个本地预览 URL
//   When 上传成功并生成新的本地预览 URL
//   Then 旧 URL 被 revoke 一次
//   And 新 URL 继续由当前表单持有
//
// Scenario: 移除或关闭通知表单
//   Given 当前表单持有一个本地预览 URL
//   When 用户移除图片或关闭表单
//   Then 当前 URL 被 revoke 一次
//   And 重复关闭不会再次 revoke

describe('通知上传图片预览生命周期', () => {
  it('上传成功替换预览且移除与关闭不会重复释放', () => {
    const create = vi
      .fn<(file: File) => string>()
      .mockReturnValueOnce('blob:old')
      .mockReturnValueOnce('blob:new');
    const revoke = vi.fn();
    const lifecycle = createObjectUrlLifecycle(create, revoke);
    const schema = useFormSchema({
      createPreviewUrl: (file) => lifecycle.replace(file),
      onRemove: () => lifecycle.clear(),
    });
    const upload = schema.find((item) => item.fieldName === 'avatars');
    const props = upload?.componentProps as any;
    const first = {
      raw: new File(['first'], 'first.png', { type: 'image/png' }),
    };
    const second = {
      raw: new File(['second'], 'second.png', { type: 'image/png' }),
    };

    props.onSuccess({ uploadRef: 'u1' }, first);
    props.onSuccess({ uploadRef: 'u2' }, second);

    expect(revoke).toHaveBeenCalledTimes(1);
    expect(revoke).toHaveBeenCalledWith('blob:old');
    expect(lifecycle.current()).toBe('blob:new');

    props.onRemove(second);
    lifecycle.clear();

    expect(revoke).toHaveBeenCalledTimes(2);
    expect(revoke).toHaveBeenLastCalledWith('blob:new');
    expect(lifecycle.current()).toBeNull();
  });
});
