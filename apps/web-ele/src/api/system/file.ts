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
async function setUpload(params: Recordable<any>) {
  return requestClient.post<Array<SystemFileApi.SystemFile>>('/file/upload', {
    params,
  });
}
/**
 * 上传文件到 OSS
 */
async function setUploadOss(params: Recordable<any>) {
  return requestClient.post<Array<SystemFileApi.SystemFile>>(
    '/file/upload-oss',
    {
      params,
    },
  );
}

export { getFileDetail, getFileList, setUpload, setUploadOss };
