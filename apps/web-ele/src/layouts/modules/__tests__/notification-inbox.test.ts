import { describe, expect, it } from 'vitest';

import {
  DEFAULT_NOTIFICATION_AVATAR,
  mapNotificationInboxItem,
  mapNotificationInboxList,
} from '../notification-inbox';

describe('notification inbox mapper', () => {
  it('maps inbox API items to layout notification items', () => {
    expect(
      mapNotificationInboxItem(
        {
          avatar: 'https://cdn.test/avatar.png',
          created_at: '2026-06-26 10:00:00',
          delivered_at: '2026-06-26 10:05:00',
          id: 1,
          is_read: false,
          message: 'message body',
          notification_id: 10,
          priority: 'medium',
          read_at: null,
          related_link: '/workspace',
          title: 'notice title',
          type: 'system',
        },
        [{ label: '系统公告', type: 'primary', value: 'system' }],
      ),
    ).toEqual({
      avatar: 'https://cdn.test/avatar.png',
      date: '2026-06-26 10:05:00',
      id: 1,
      isRead: false,
      link: '/workspace',
      message: 'message body',
      tag: { label: '系统公告', type: 'primary' },
      title: 'notice title',
    });
  });

  it('falls back to created_at and omits empty links', () => {
    expect(
      mapNotificationInboxItem({
        created_at: '2026-06-26 10:00:00',
        delivered_at: null,
        id: 2,
        is_read: true,
        message: 'fallback message',
        notification_id: 11,
        priority: 'low',
        read_at: '2026-06-26 10:10:00',
        related_link: null,
        title: 'fallback title',
        type: 'message',
      }),
    ).toEqual({
      avatar: DEFAULT_NOTIFICATION_AVATAR,
      date: '2026-06-26 10:00:00',
      id: 2,
      isRead: true,
      message: 'fallback message',
      title: 'fallback title',
    });
  });

  it('maps inbox item lists', () => {
    expect(mapNotificationInboxList([], [])).toEqual([]);
  });
});
