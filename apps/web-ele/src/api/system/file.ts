import type { Recordable } from '@vben/types';

import { requestClient } from '#/api/request';

export namespace SystemFileApi {
  export interface SystemFile {
    [key: string]: any;
    id: number | string;
    original_name?: string;
    mime_type?: string;
    byte_size?: number;
    is_image?: boolean;
    previewMediaRef?: string;
    image_width?: null | number;
    image_height?: null | number;
    content_hash_prefix?: string;
    ref_count?: number;
    delete_status?: string;
    created_at?: string;
    updated_at?: string;
  }
}

async function getFileList(params: Recordable<any>) {
  return requestClient.get<{
    items: SystemFileApi.SystemFile[];
    total: number;
  }>('/file/list', { params });
}

async function getFileDetail(id: string) {
  return requestClient.get<SystemFileApi.SystemFile>(`/file/${id}`);
}

async function deleteFile(id: number | string) {
  return requestClient.delete(`/file/${id}`);
}

export { deleteFile, getFileDetail, getFileList };
