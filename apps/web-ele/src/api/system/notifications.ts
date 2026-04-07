import type { NotificationItem } from '@vben/layouts';
import type { Recordable } from '@vben/types';

import { requestClient } from '#/api/request';

export namespace SystemNotificationsApi {
  export interface SystemNotifications extends NotificationItem {
    data: string;
  }
}

/**
 * 获取消息列表数据
 */
async function getNotificationsList(params: Recordable<any>) {
  return requestClient.get<{
    items: Array<SystemNotificationsApi.SystemNotifications>;
    total: number;
  }>('/system/notifications/list', { params });
}

/**
 * 创建消息
 * @param data 消息数据
 */
async function createNotifications(
  data: Omit<SystemNotificationsApi.SystemNotifications, 'id'>,
) {
  return requestClient.post('/system/notifications', data);
}

/**
 * 更新消息
 *
 * @param id 消息 ID
 * @param data 消息数据
 */
async function updateNotifications(
  id: string,
  data: Omit<SystemNotificationsApi.SystemNotifications, 'id'>,
) {
  return requestClient.put(`/system/notifications/${id}`, data);
}

/**
 * 删除消息
 * @param id 消息 ID
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
