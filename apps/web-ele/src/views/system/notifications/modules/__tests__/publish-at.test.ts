import { describe, expect, it, vi } from 'vitest';

import {
  clearPublishAtWhenSendNow,
  getPublishAtRules,
  normalizePublishAtForSubmit,
  shouldShowPublishAt,
} from '../publish-at';

describe('notification publish_at rules', () => {
  it('hides publish_at when the notification is sent immediately', () => {
    expect(shouldShowPublishAt({ send_now: true })).toBe(false);
    expect(shouldShowPublishAt({ send_now: false })).toBe(true);
    expect(shouldShowPublishAt({})).toBe(true);
  });

  it('requires publish_at only while scheduled publishing is visible', () => {
    expect(getPublishAtRules({ send_now: true })).toBeNull();
    expect(getPublishAtRules({ send_now: false })).toBe('required');
    expect(getPublishAtRules({})).toBe('required');
  });

  it('clears publish_at from the form when send_now becomes true', async () => {
    const actions = {
      setFieldValue: vi.fn(),
    };

    await clearPublishAtWhenSendNow(
      { publish_at: '2026-06-25 12:00:00', send_now: true },
      actions,
    );

    expect(actions.setFieldValue).toHaveBeenCalledWith('publish_at', null);
  });

  it('keeps publish_at while scheduled publishing is selected', async () => {
    const actions = {
      setFieldValue: vi.fn(),
    };

    await clearPublishAtWhenSendNow(
      { publish_at: '2026-06-25 12:00:00', send_now: false },
      actions,
    );

    expect(actions.setFieldValue).not.toHaveBeenCalled();
  });

  it('removes stale publish_at from submit values when send_now is true', () => {
    expect(
      normalizePublishAtForSubmit({
        publish_at: '2026-06-25 12:00:00',
        send_now: true,
        title: 'Immediate notice',
      }),
    ).toEqual({
      publish_at: null,
      send_now: true,
      title: 'Immediate notice',
    });

    expect(
      normalizePublishAtForSubmit({
        publish_at: '2026-06-25 12:00:00',
        send_now: false,
        title: 'Scheduled notice',
      }),
    ).toEqual({
      publish_at: '2026-06-25 12:00:00',
      send_now: false,
      title: 'Scheduled notice',
    });
  });
});
