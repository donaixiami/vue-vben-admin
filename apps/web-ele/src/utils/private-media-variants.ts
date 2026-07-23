import type { ResolvePrivateBlobOptions } from './private-blob';

type PrivateMediaVariant = Required<
  Pick<ResolvePrivateBlobOptions, 'fit' | 'priority' | 'size' | 'variant'>
>;

export const PRIVATE_MEDIA_VARIANTS = {
  chatImage: {
    fit: 'inside',
    priority: 100,
    size: 512,
    variant: 'thumbnail',
  },
  filePreview: {
    fit: 'inside',
    priority: 100,
    size: 1024,
    variant: 'thumbnail',
  },
  notificationImage: {
    fit: 'inside',
    priority: 100,
    size: 512,
    variant: 'thumbnail',
  },
  userFormAvatar: {
    fit: 'cover',
    priority: 100,
    size: 256,
    variant: 'thumbnail',
  },
  userListAvatar: {
    fit: 'cover',
    priority: -10,
    size: 128,
    variant: 'thumbnail',
  },
} as const satisfies Record<string, PrivateMediaVariant>;

export function privateOptionsForChatAttachment(
  kind: 'file' | 'image',
  options: ResolvePrivateBlobOptions,
): ResolvePrivateBlobOptions {
  return kind === 'image'
    ? { ...PRIVATE_MEDIA_VARIANTS.chatImage, ...options }
    : options;
}
