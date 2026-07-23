import { describe, expect, it } from 'vitest';

import { createUserAvatarQueryController } from '../user-avatar-list';

describe('用户列表头像查询竞态控制', () => {
  it('开始新查询会失效旧查询并取消旧信号', () => {
    const controller = createUserAvatarQueryController();
    const first = controller.begin();
    const second = controller.begin();

    expect(first.signal.aborted).toBe(true);
    expect(controller.isCurrent(first.generation)).toBe(false);
    expect(controller.isCurrent(second.generation)).toBe(true);
  });

  it('页面销毁会失效当前查询', () => {
    const controller = createUserAvatarQueryController();
    const request = controller.begin();

    controller.invalidate();

    expect(request.signal.aborted).toBe(true);
    expect(controller.isCurrent(request.generation)).toBe(false);
  });
});
