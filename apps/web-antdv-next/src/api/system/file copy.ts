import type { Recordable } from '@vben/types';

import { requestClient } from '#/api/request';

export namespace SystemFileApi {
  export interface SystemFile {
    [key: string]: any;
    /** 文件id */
    id: string;
    /** 文件名 */
    file_name: string;
    /** 文件大小 */
    file_size: number;
    /** 文件类型 */
    file_type: string;
    /** 文件url */
    file_url: string;
    /** 创建时间 */
    create_time: string;
    /** 更新时间 */
    update_time: string;
  }
}

interface UploadFileParams {
  file: File;
  onError?: (error: Error) => void;
  onProgress?: (progress: { percent: number }) => void;
  onSuccess?: (data: any, file: File) => void;
}

type UploadHandlerParams =
  | File
  | (UploadFileParams & {
      data?: Recordable<any>;
      headers?: Recordable<any>;
      withCredentials?: boolean;
    })
  | {
      data?: Recordable<any>;
      file: File;
      headers?: Recordable<any>;
      onError?: (...args: any[]) => void;
      onProgress?: (...args: any[]) => void;
      onSuccess?: (...args: any[]) => void;
      withCredentials?: boolean;
    };

function normalizeUploadParams(params: UploadHandlerParams) {
  if (typeof File !== 'undefined' && params instanceof File) {
    return { file: params } as const;
  }
  return params as Exclude<UploadHandlerParams, File>;
}

/**
 * 获取文件列表数据
 */
async function getFileList(params: Recordable<any>) {
  return requestClient.get<Array<SystemFileApi.SystemFile>>('/file/list', {
    params,
  });
}

/**
 * 获取文件详情数据
 */
async function getFileDetail(
  id: string,
  data: Omit<SystemFileApi.SystemFile, 'id'>,
) {
  return requestClient.get<Array<SystemFileApi.SystemFile>>(
    `/file/${id}`,
    data,
  );
}

/**
 * 上传文件到本地
 */
export async function setUpload({
  file,
  onError,
  onProgress,
  onSuccess,
}: UploadFileParams) {
  try {
    onProgress?.({ percent: 0 });
    const data = await requestClient.upload('/file/upload', { file });
    onProgress?.({ percent: 100 });
    onSuccess?.(data, file);
  } catch (error) {
    onError?.(error instanceof Error ? error : new Error(String(error)));
  }
}
/**
 * 上传文件到 OSS
 */
export async function setUploadOss(params: UploadHandlerParams) {
  try {
    const normalized = normalizeUploadParams(params);
    normalized.onProgress?.({ percent: 0 });

    const data = await requestClient.upload(
      '/file/upload-oss',
      { ...normalized.data, file: normalized.file },
      {
        headers: normalized.headers,
        withCredentials: normalized.withCredentials,
      },
    );

    normalized.onProgress?.({ percent: 100 });
    normalized.onSuccess?.(data, normalized.file);
    return data;
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    const normalized = normalizeUploadParams(params);
    normalized.onError?.(err);
    throw err;
  }
}

/**
 * 删除文件
 * @param id 文件 ID
 */
async function deleteFile(id: string) {
  return requestClient.delete(`/file/${id}`);
}

export { deleteFile, getFileDetail, getFileList };
