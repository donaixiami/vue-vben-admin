// Feature: 用户列表显示私有头像
import { describe, expect, it, vi } from 'vitest';

import { hydrateUserAvatarRows } from '../user-avatar-list';

describe('用户列表私有头像', () => {
  it('将 avatarMediaRef 解析为仅供当前列表使用的 Blob URL', async () => {
    // Given 列表中一行有 mediaRef，另一行没有头像
    const resolve = vi.fn().mockResolvedValue('blob:avatar-1');

    // When 水合列表头像
    const result = await hydrateUserAvatarRows(
      [
        { id: '1', avatar: null, avatarMediaRef: 'm_avatar' },
        { id: '2', avatar: null, avatarMediaRef: null },
      ],
      resolve,
    );

    // Then 只读取有效 mediaRef，并把 Blob URL 交给 CellImage 使用
    expect(resolve).toHaveBeenCalledTimes(1);
    expect(resolve).toHaveBeenCalledWith('m_avatar');
    expect(result.rows[0]?.avatar).toBe('blob:avatar-1');
    expect(result.rows[1]?.avatar).toBeNull();
    expect(result.blobUrls).toEqual(['blob:avatar-1']);
  });

  it('单个头像读取失败不阻塞整个用户列表', async () => {
    const resolve = vi.fn().mockRejectedValue(new Error('gone'));

    const result = await hydrateUserAvatarRows(
      [{ id: '1', avatar: null, avatarMediaRef: 'm_expired' }],
      resolve,
    );

    expect(result.rows[0]?.avatar).toBeNull();
    expect(result.blobUrls).toEqual([]);
  });
});
