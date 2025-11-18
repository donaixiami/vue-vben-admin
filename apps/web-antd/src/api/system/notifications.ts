import type { Recordable } from '@vben/types';

import { requestClient } from '#/api/request';

export namespace SystemNotificationsApi {
  export interface SystemNotifications {
    [key: string]: any;
    id: string;
    name: string;
    permissions: string[];
    remark?: string;
    status: 0 | 1;
  }
}

/**
 * 获取角色列表数据
 */
async function getNotificationsList(params: Recordable<any>) {
  return requestClient.get<Array<SystemNotificationsApi.SystemNotifications>>(
    '/system/notifications/list',
    { params },
  );
}

/**
 * 创建角色
 * @param data 角色数据
 */
async function createNotifications(
  data: Omit<SystemNotificationsApi.SystemNotifications, 'id'>,
) {
  return requestClient.post('/system/notifications', data);
}

/**
 * 更新角色
 *
 * @param id 角色 ID
 * @param data 角色数据
 */
async function updateNotifications(
  id: string,
  data: Omit<SystemNotificationsApi.SystemNotifications, 'id'>,
) {
  return requestClient.put(`/system/notifications/${id}`, data);
}

/**
 * 删除角色
 * @param id 角色 ID
 */
async function deleteNotifications(id: string) {
  return requestClient.delete(`/system/notifications/${id}`);
}

export {
  createNotifications,
  deleteNotifications,
  getNotificationsList,
  updateNotifications,
};
