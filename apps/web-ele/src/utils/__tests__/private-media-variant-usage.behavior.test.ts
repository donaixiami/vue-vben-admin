import { describe, expect, it, vi } from 'vitest';

import { loadFileImagePreview } from '../../views/system/file/modules/file-image-preview';
import { hydrateUserAvatarRows } from '../../views/system/user/modules/user-avatar-list';
import {
  PRIVATE_MEDIA_VARIANTS,
  privateOptionsForChatAttachment,
} from '../private-media-variants';

describe('后台私有图片变体使用策略', () => {
  it('用户列表头像使用 128 cover 和低优先级', async () => {
    const resolve = vi.fn().mockResolvedValue('blob:avatar');
    await hydrateUserAvatarRows(
      [{ avatar: null, avatarMediaRef: 'm_avatar' }],
      resolve,
      new AbortController().signal,
    );

    expect(resolve).toHaveBeenCalledWith('m_avatar', {
      ...PRIVATE_MEDIA_VARIANTS.userListAvatar,
      signal: expect.any(AbortSignal),
    });
    expect(PRIVATE_MEDIA_VARIANTS.userListAvatar).toEqual({
      fit: 'cover',
      priority: -10,
      size: 128,
      variant: 'thumbnail',
    });
  });

  it('用户表单和通知表单使用各自足够的预览规格', () => {
    expect(PRIVATE_MEDIA_VARIANTS.userFormAvatar).toEqual({
      fit: 'cover',
      priority: 100,
      size: 256,
      variant: 'thumbnail',
    });
    expect(PRIVATE_MEDIA_VARIANTS.notificationImage).toEqual({
      fit: 'inside',
      priority: 100,
      size: 512,
      variant: 'thumbnail',
    });
  });

  it('文件图片预览使用 1024 inside', async () => {
    const resolve = vi.fn().mockResolvedValue('blob:file');
    await loadFileImagePreview(
      {
        id: 1,
        is_image: true,
        original_name: 'photo.jpg',
        previewMediaRef: 'm_file',
      } as never,
      resolve,
    );

    expect(resolve).toHaveBeenCalledWith('m_file', {
      ...PRIVATE_MEDIA_VARIANTS.filePreview,
    });
    expect(PRIVATE_MEDIA_VARIANTS.chatImage).toEqual({
      fit: 'inside',
      priority: 100,
      size: 512,
      variant: 'thumbnail',
    });
  });

  it('聊天只为图片附件请求缩略图，普通文件保持原文件', () => {
    const signal = new AbortController().signal;

    expect(privateOptionsForChatAttachment('image', { signal })).toEqual({
      ...PRIVATE_MEDIA_VARIANTS.chatImage,
      signal,
    });
    expect(privateOptionsForChatAttachment('file', { signal })).toEqual({
      signal,
    });
  });
});
