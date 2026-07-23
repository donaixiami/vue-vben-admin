import { describe, expect, it, vi } from 'vitest';

import { createObjectUrlLifecycle } from '../object-url-lifecycle';

describe('通知本地预览 Object URL 生命周期', () => {
  it('替换预览时只释放旧地址，清理重复调用保持幂等', () => {
    const create = vi
      .fn<(file: File) => string>()
      .mockReturnValueOnce('blob:first')
      .mockReturnValueOnce('blob:second');
    const revoke = vi.fn();
    const lifecycle = createObjectUrlLifecycle(create, revoke);

    expect(lifecycle.replace({} as File)).toBe('blob:first');
    expect(lifecycle.replace({} as File)).toBe('blob:second');
    expect(revoke).toHaveBeenCalledTimes(1);
    expect(revoke).toHaveBeenCalledWith('blob:first');

    lifecycle.clear();
    lifecycle.clear();
    expect(revoke).toHaveBeenCalledTimes(2);
    expect(revoke).toHaveBeenLastCalledWith('blob:second');
    expect(lifecycle.current()).toBeNull();
  });

  it('没有当前地址时清理不会调用 revoke', () => {
    const revoke = vi.fn();
    const lifecycle = createObjectUrlLifecycle(
      vi.fn(() => 'blob:unused'),
      revoke,
    );

    lifecycle.clear();

    expect(revoke).not.toHaveBeenCalled();
  });
});
