import type { SystemFileApi } from '#/api/system/file';
import type { ResolvePrivateBlobOptions } from '#/utils/private-blob';

import {
  createPrivateBlobRequestController,
  revokePrivateBlobUrl,
} from '#/utils/private-blob';
import { PRIVATE_MEDIA_VARIANTS } from '#/utils/private-media-variants';

export const createFilePreviewController = createPrivateBlobRequestController;

export function canPreviewFile(
  file: Pick<SystemFileApi.SystemFile, 'is_image' | 'previewMediaRef'>,
): boolean {
  return Boolean(file.is_image && file.previewMediaRef);
}

export async function loadFileImagePreview(
  file: SystemFileApi.SystemFile,
  resolve: (
    mediaRef: string,
    options?: ResolvePrivateBlobOptions,
  ) => Promise<string>,
  options: { signal?: AbortSignal } = {},
): Promise<{ name: string; url: string }> {
  if (!canPreviewFile(file) || !file.previewMediaRef) {
    throw new Error('图片预览引用不可用');
  }
  return {
    name: file.original_name || String(file.id),
    url: await resolve(file.previewMediaRef, {
      ...PRIVATE_MEDIA_VARIANTS.filePreview,
      ...options,
    }),
  };
}

export function releaseFileImagePreview(
  url: null | string | undefined,
  revoke: (url: string) => void = revokePrivateBlobUrl,
): void {
  if (url?.startsWith('blob:')) revoke(url);
}
