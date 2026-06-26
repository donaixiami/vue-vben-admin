import type { NotificationItem } from '@vben/layouts';

import type { SystemNotificationsApi } from '#/api/system/notifications';

const DEFAULT_NOTIFICATION_AVATAR =
  'https://avatar.vercel.sh/vercel.svg?text=VB';

function mapNotificationInboxItem(
  item: SystemNotificationsApi.NotificationInboxItem,
): NotificationItem {
  const avatar =
    (
      item as SystemNotificationsApi.NotificationInboxItem & {
        avatar?: null | string;
      }
    ).avatar || DEFAULT_NOTIFICATION_AVATAR;
  const link = item.related_link || undefined;

  return {
    avatar,
    date: item.delivered_at ?? item.created_at ?? '',
    id: item.id,
    isRead: item.is_read,
    message: item.message,
    title: item.title,
    ...(link ? { link } : {}),
  };
}

function mapNotificationInboxList(
  items: SystemNotificationsApi.NotificationInboxItem[],
): NotificationItem[] {
  return items.map((item) => mapNotificationInboxItem(item));
}

export {
  DEFAULT_NOTIFICATION_AVATAR,
  mapNotificationInboxItem,
  mapNotificationInboxList,
};
