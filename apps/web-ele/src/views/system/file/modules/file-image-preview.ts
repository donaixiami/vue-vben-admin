import type { SystemFileApi } from '#/api/system/file';

export function canPreviewFile(
  file: Pick<SystemFileApi.SystemFile, 'is_image' | 'previewMediaRef'>,
): boolean {
  return Boolean(file.is_image && file.previewMediaRef);
}

export async function loadFileImagePreview(
  file: SystemFileApi.SystemFile,
  resolve: (mediaRef: string) => Promise<string>,
): Promise<{ name: string; url: string }> {
  if (!canPreviewFile(file) || !file.previewMediaRef) {
    throw new Error('图片预览引用不可用');
  }
  return {
    name: file.original_name || String(file.id),
    url: await resolve(file.previewMediaRef),
  };
}

export function releaseFileImagePreview(
  url: null | string | undefined,
  revoke: (url: string) => void = URL.revokeObjectURL,
): void {
  if (url?.startsWith('blob:')) revoke(url);
}
