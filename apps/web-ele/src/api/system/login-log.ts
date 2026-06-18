import type { Recordable } from '@vben/types';

import { requestClient } from '#/api/request';

export namespace SystemLoginLogApi {
  export interface SystemLoginLog {
    [key: string]: any;
    id: string;
    user_id: null | number;
    username: string;
    status: 0 | 1;
    login_type: string;
    ip: string;
    user_agent: string;
    message: string;
    created_at: null | string;
    updated_at: null | string;
  }
}

/**
 * 获取登录日志列表数据
 */
async function getLoginLogList(params: Recordable<any>) {
  return requestClient.get<{
    items: Array<SystemLoginLogApi.SystemLoginLog>;
    total: number;
  }>('/monitor/login-log/list', { params });
}

/**
 * 删除登录日志
 * @param id 登录日志 ID
 */
async function deleteLoginLog(id: string) {
  return requestClient.delete(`/monitor/login-log/${id}`);
}

/**
 * 清空登录日志
 */
async function clearLoginLog() {
  return requestClient.delete('/monitor/login-log/clear');
}

export { clearLoginLog, deleteLoginLog, getLoginLogList };
