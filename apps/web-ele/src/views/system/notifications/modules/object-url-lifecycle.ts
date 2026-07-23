export type ObjectUrlCreate = (file: File) => string;
export type ObjectUrlRevoke = (url: string) => void;

/** 统一管理本地文件预览地址，避免替换/关闭时遗留 Blob URL。 */
export function createObjectUrlLifecycle(
  create: ObjectUrlCreate = (file) => URL.createObjectURL(file),
  revoke: ObjectUrlRevoke = (url) => URL.revokeObjectURL(url),
) {
  let currentUrl: null | string = null;

  function clear(): void {
    if (!currentUrl) return;
    revoke(currentUrl);
    currentUrl = null;
  }

  return {
    clear,
    current: () => currentUrl,
    replace(file: File): string {
      clear();
      currentUrl = create(file);
      return currentUrl;
    },
  };
}
