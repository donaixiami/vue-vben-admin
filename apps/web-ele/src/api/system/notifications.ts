import type { Recordable } from '@vben/types';

import { requestClient } from '#/api/request';

export namespace SystemNotificationsApi {
  export type NotificationId = number;
  export type NotificationPriority = 'high' | 'low' | 'medium';
  export type NotificationSendStatus =
    | 'draft'
    | 'revoked'
    | 'scheduled'
    | 'sent';
  export type NotificationTargetType = 'all' | 'depts' | 'roles' | 'users';
  export type NotificationType = 'message' | 'system';

  export interface SystemNotifications {
    [key: string]: any;
    avatar: string;
    created_at: null | string;
    id: NotificationId;
    is_deleted?: boolean;
    is_read?: boolean;
    message: string;
    metadata?: null | Recordable<any>;
    notification_status?: 'archived' | 'read' | 'unread';
    priority: NotificationPriority;
    publish_at: null | string;
    read_at?: null | string;
    related_link: null | string;
    send_status: NotificationSendStatus;
    sent_at: null | string;
    status: number;
    target_ids: null | number[];
    target_type: NotificationTargetType;
    title: string;
    type: NotificationType;
    updated_at: null | string;
    user_id: null | number;
  }

  export interface NotificationInboxItem {
    created_at: null | string;
    delivered_at: null | string;
    id: number;
    is_read: boolean;
    message: string;
    notification_id: NotificationId;
    priority: NotificationPriority;
    read_at: null | string;
    related_link: null | string;
    title: string;
    type: NotificationType;
  }

  export interface NotificationListResult {
    items: SystemNotifications[];
    total: number;
  }

  export interface NotificationInboxListResult {
    items: NotificationInboxItem[];
    total: number;
  }

  export interface NotificationUnreadCountResult {
    count: number;
  }

  export interface PublishNotificationsResult {
    delivered_count: number;
    notification: SystemNotifications;
  }

  export interface QueryNotificationsParams extends Recordable<any> {
    from_time?: string;
    id?: NotificationId;
    page?: number;
    pageSize?: number;
    send_status?: NotificationSendStatus;
    title?: string;
    to_time?: string;
    type?: NotificationType;
  }

  export interface QueryNotificationInboxParams extends Recordable<any> {
    is_read?: boolean;
    page?: number;
    pageSize?: number;
    title?: string;
    type?: NotificationType;
  }

  export interface CreateNotificationsParams extends Recordable<any> {
    avatars?: (File & { response: { id: string; url: string } })[];
    message: string;
    metadata?: null | Recordable<any>;
    priority?: NotificationPriority;
    publish_at?: null | string;
    related_link?: null | string;
    send_now?: boolean;
    send_status?: NotificationSendStatus;
    avatar_file_id?: number;
    target_ids?: number[];
    target_type?: NotificationTargetType;
    title?: string;
    type?: NotificationType;
    user_id?: number;
  }

  export type UpdateNotificationsParams = Partial<CreateNotificationsParams>;
}

/**
 * 管理端消息列表
 * GET /system/notifications/list
 */
async function getNotificationsList(
  params: SystemNotificationsApi.QueryNotificationsParams,
) {
  return requestClient.get<SystemNotificationsApi.NotificationListResult>(
    '/system/notifications/list',
    { params },
  );
}

/**
 * 当前用户收件箱列表
 * GET /system/notifications/inbox
 */
async function getNotificationsInbox(
  params: SystemNotificationsApi.QueryNotificationInboxParams,
) {
  return requestClient.get<SystemNotificationsApi.NotificationInboxListResult>(
    '/system/notifications/inbox',
    { params },
  );
}

/**
 * 当前用户未读消息数
 * GET /system/notifications/unread-count
 */
async function getNotificationsUnreadCount() {
  return requestClient.get<SystemNotificationsApi.NotificationUnreadCountResult>(
    '/system/notifications/unread-count',
  );
}

/**
 * 消息详情
 * GET /system/notifications/{id}
 */
async function getNotificationsById(id: SystemNotificationsApi.NotificationId) {
  return requestClient.get<null | SystemNotificationsApi.SystemNotifications>(
    `/system/notifications/${id}`,
  );
}

/**
 * 创建消息。系统通知默认草稿，普通消息默认立即发送。
 * POST /system/notifications
 */
async function createNotifications(
  data: SystemNotificationsApi.CreateNotificationsParams,
) {
  return requestClient.post<SystemNotificationsApi.SystemNotifications>(
    '/system/notifications',
    data,
  );
}

/**
 * 发布消息并生成收件箱记录
 * POST /system/notifications/{id}/publish
 */
async function publishNotifications(id: SystemNotificationsApi.NotificationId) {
  return requestClient.post<SystemNotificationsApi.PublishNotificationsResult>(
    `/system/notifications/${id}/publish`,
  );
}

/**
 * 撤回消息并软删除对应收件箱记录
 * POST /system/notifications/{id}/revoke
 */
async function revokeNotifications(id: SystemNotificationsApi.NotificationId) {
  return requestClient.post<Recordable<any>>(
    `/system/notifications/${id}/revoke`,
  );
}

/**
 * 标记单条收件箱记录为已读
 * PUT /system/notifications/inbox/{id}/read
 */
async function markNotificationInboxRead(id: number) {
  return requestClient.put<Recordable<any>>(
    `/system/notifications/inbox/${id}/read`,
  );
}

/**
 * 标记当前用户全部收件箱消息为已读
 * PUT /system/notifications/inbox/read-all
 */
async function markAllNotificationInboxRead() {
  return requestClient.put<Recordable<any>>(
    '/system/notifications/inbox/read-all',
  );
}

/**
 * 删除当前用户收件箱消息
 * DELETE /system/notifications/inbox/{id}
 */
async function deleteNotificationInboxItem(id: number) {
  return requestClient.delete<Recordable<any>>(
    `/system/notifications/inbox/${id}`,
  );
}

/**
 * 修改消息。已发送或已撤回消息后端会拒绝修改。
 * PUT /system/notifications/{id}
 */
async function updateNotifications(
  id: SystemNotificationsApi.NotificationId,
  data: SystemNotificationsApi.UpdateNotificationsParams,
) {
  return requestClient.put<Recordable<any>>(
    `/system/notifications/${id}`,
    data,
  );
}

/**
 * 删除消息主体
 * DELETE /system/notifications/{id}
 */
async function deleteNotifications(id: SystemNotificationsApi.NotificationId) {
  return requestClient.delete<Recordable<any>>(`/system/notifications/${id}`);
}

export {
  createNotifications,
  deleteNotificationInboxItem,
  deleteNotifications,
  getNotificationsById,
  getNotificationsInbox,
  getNotificationsList,
  getNotificationsUnreadCount,
  markAllNotificationInboxRead,
  markNotificationInboxRead,
  publishNotifications,
  revokeNotifications,
  updateNotifications,
};
