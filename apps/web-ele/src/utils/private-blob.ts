import { useAppConfig } from '@vben/hooks';
import { useAccessStore } from '@vben/stores';

function apiBase(): string {
  const { apiURL } = useAppConfig(import.meta.env, import.meta.env.PROD);
  return String(apiURL || '').replace(/\/$/, '');
}

function authHeaders(): HeadersInit {
  const accessStore = useAccessStore();
  const token = accessStore.accessToken;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function fetchPrivateBlob(path: string): Promise<Blob> {
  const url = `${apiBase()}${path.startsWith('/') ? path : `/${path}`}`;
  const response = await fetch(url, {
    headers: authHeaders(),
  });
  if (!response.ok) {
    const error = new Error(`private content ${response.status}`) as Error & {
      status?: number;
    };
    error.status = response.status;
    throw error;
  }
  return response.blob();
}

/** 拉取 mediaRef 内容并创建临时 Object URL（仅内存，不入 store） */
export async function resolvePrivateBlobUrl(mediaRef: string): Promise<string> {
  const blob = await fetchPrivateBlob(
    `/media/${encodeURIComponent(mediaRef)}/content`,
  );
  return URL.createObjectURL(blob);
}

export async function resolveChatAssetBlobUrl(
  assetId: number,
): Promise<string> {
  const blob = await fetchPrivateBlob(`/chat/assets/${assetId}/content`);
  return URL.createObjectURL(blob);
}

export function revokePrivateBlobUrl(url: null | string | undefined): void {
  if (url && String(url).startsWith('blob:')) {
    URL.revokeObjectURL(url);
  }
}
