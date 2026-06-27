import type { NotificationItem, NotificationTag } from '@vben/layouts';

import type { SystemNotificationsApi } from '#/api/system/notifications';

const DEFAULT_NOTIFICATION_AVATAR =
  'https://avatar.vercel.sh/vercel.svg?text=VB';

type NotificationTagOption = NotificationTag & {
  value: number | string;
};

function mapNotificationInboxItem(
  item: SystemNotificationsApi.NotificationInboxItem,
  messageTypeOptions: NotificationTagOption[] = [],
): NotificationItem {
  const avatar = item.avatar || DEFAULT_NOTIFICATION_AVATAR;
  const link = item.related_link || undefined;
  const messageTypeOption = messageTypeOptions.find(
    (option) => option.value === item.type,
  );
  const tag = messageTypeOption
    ? {
        label: messageTypeOption.label,
        ...(messageTypeOption.type ? { type: messageTypeOption.type } : {}),
      }
    : undefined;

  return {
    avatar,
    date: item.delivered_at ?? item.created_at ?? '',
    id: item.id,
    isRead: item.is_read,
    message: item.message,
    title: item.title,
    ...(link ? { link } : {}),
    ...(tag ? { tag } : {}),
  };
}

function mapNotificationInboxList(
  items: SystemNotificationsApi.NotificationInboxItem[],
  messageTypeOptions: NotificationTagOption[] = [],
): NotificationItem[] {
  return items.map((item) =>
    mapNotificationInboxItem(item, messageTypeOptions),
  );
}

export {
  DEFAULT_NOTIFICATION_AVATAR,
  mapNotificationInboxItem,
  mapNotificationInboxList,
  type NotificationTagOption,
};
