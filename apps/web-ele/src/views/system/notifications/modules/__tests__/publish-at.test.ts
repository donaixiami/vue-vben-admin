import { describe, expect, it, vi } from 'vitest';

import {
  clearPublishAtWhenSendNow,
  disablePastPublishDate,
  getDefaultPublishTime,
  getPublishAtRules,
  isFuturePublishAt,
  normalizePublishAtForSubmit,
  shouldShowPublishAt,
} from '../publish-at';

describe('notification publish_at rules', () => {
  it('hides publish_at when the notification is sent immediately', () => {
    expect(shouldShowPublishAt({ send_now: true })).toBe(false);
    expect(shouldShowPublishAt({ send_now: false })).toBe(true);
    expect(shouldShowPublishAt({})).toBe(true);
  });

  it('validates publish_at only when a scheduled publish time is provided', () => {
    expect(getPublishAtRules({ send_now: true })).toBeNull();

    const rules = getPublishAtRules({ send_now: false });

    expect(rules).not.toBeNull();
    expect(rules?.safeParse('').success).toBe(true);
    expect(rules?.safeParse(null).success).toBe(true);
    expect(rules?.safeParse(undefined).success).toBe(true);
    expect(rules?.safeParse('2026-06-26 11:59:59').success).toBe(false);
  });

  it('validates publish_at cannot be earlier than the current time', () => {
    const now = new Date('2026-06-26T12:00:00');

    expect(isFuturePublishAt('', now)).toBe(false);
    expect(isFuturePublishAt('2026-06-26 11:59:59', now)).toBe(false);
    expect(isFuturePublishAt('2026-06-26 12:00:00', now)).toBe(true);
    expect(isFuturePublishAt('2026-06-27 00:00:00', now)).toBe(true);
  });

  it('uses the current time as the default time when selecting a publish date', () => {
    const defaultTime = getDefaultPublishTime(new Date('2026-06-26T14:15:16'));

    expect(defaultTime.getHours()).toBe(14);
    expect(defaultTime.getMinutes()).toBe(15);
    expect(defaultTime.getSeconds()).toBe(16);
  });

  it('disables dates before today for scheduled publishing', () => {
    const now = new Date('2026-06-26T12:00:00');

    expect(disablePastPublishDate(new Date('2026-06-25T23:59:59'), now)).toBe(
      true,
    );
    expect(disablePastPublishDate(new Date('2026-06-26T00:00:00'), now)).toBe(
      false,
    );
    expect(disablePastPublishDate(new Date('2026-06-27T00:00:00'), now)).toBe(
      false,
    );
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
