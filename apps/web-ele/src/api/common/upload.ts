import { requestClient } from '#/api/request';

export type UploadPurpose =
  | 'avatar'
  | 'general'
  | 'notification'
  | 'notification_content';

export interface UploadClaimResult {
  byteSize: number;
  deduplicated?: boolean;
  expiresAt?: string;
  height: null | number;
  kind?: 'file' | 'image';
  mimeType: string;
  uploadRef: string;
  width: null | number;
}

export interface ChatAssetUploadResult {
  assetId: number;
  byteSize: number;
  height: null | number;
  kind: 'file' | 'image';
  mimeType: string;
  width: null | number;
  fileName?: null | string;
  status?: 'active' | 'revoked';
}

interface UploadFileParams {
  file: File;
  onError?: (error: Error) => void;
  onProgress?: (progress: { percent: number }) => void;
  onSuccess?: (data: any, file: File) => void;
  purpose?: UploadPurpose;
}

/** 普通业务私有上传：返回一次性 uploadRef */
export async function uploadPrivateFile(
  file: File,
  purpose: UploadPurpose = 'general',
): Promise<UploadClaimResult> {
  const data = await requestClient.upload('/file/upload', {
    file,
    purpose,
  });
  return data as UploadClaimResult;
}

/** Element Plus Upload 适配：默认 purpose=general，可闭包注入 purpose */
export function createPrivateUploadRequest(purpose: UploadPurpose = 'general') {
  return async function upload_file({
    file,
    onError,
    onProgress,
    onSuccess,
  }: UploadFileParams) {
    try {
      onProgress?.({ percent: 0 });
      const data = await uploadPrivateFile(file, purpose);
      onProgress?.({ percent: 100 });
      onSuccess?.(data, file);
      return data;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      onError?.(err);
      throw err;
    }
  };
}

/** 兼容旧导入名：默认 general；头像/通知请用 createPrivateUploadRequest */
export async function upload_file(params: UploadFileParams) {
  return createPrivateUploadRequest(params.purpose ?? 'general')(params);
}

export async function uploadChatAsset(
  file: File,
): Promise<ChatAssetUploadResult> {
  const data = await requestClient.upload('/chat/assets/upload', { file });
  return data as ChatAssetUploadResult;
}

export async function revokeChatAsset(assetId: number): Promise<void> {
  await requestClient.delete(`/chat/assets/${assetId}`);
}
