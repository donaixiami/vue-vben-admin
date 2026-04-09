import { requestClient } from '#/api/request';

interface UploadFileParams {
  file: File;
  onError?: (error: Error) => void;
  onProgress?: (progress: { percent: number }) => void;
  onSuccess?: (data: any, file: File) => void;
}
export async function upload_file({
  file,
  onError,
  onProgress,
  onSuccess,
}: UploadFileParams) {
  try {
    onProgress?.({ percent: 0 });

    const data = await requestClient.upload('/file/upload-oss', { file });

    onProgress?.({ percent: 100 });
    onSuccess?.(data, file);

    return data;
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    onError?.(err);
    throw err;
  }
}
