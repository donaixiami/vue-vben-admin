import { describe, expect, it, vi } from 'vitest';

import { normalizeMenuOrder, persistMenuOrder } from '../menu-order';

describe('menu order helpers', () => {
  it.each([
    [undefined, 0],
    [null, 0],
    ['', 0],
    ['5', 5],
    [5.5, 0],
  ])('normalizes %j to %i', (value, expected) => {
    expect(normalizeMenuOrder(value)).toBe(expected);
  });

  it('skips persistence when the normalized order is unchanged', async () => {
    const row = { id: '12' };
    const update = vi.fn();
    const refresh = vi.fn();

    await expect(
      persistMenuOrder({
        previousOrder: 0,
        refresh,
        row,
        submittedOrder: undefined,
        update,
      }),
    ).resolves.toBe(false);

    expect(row).toEqual({ id: '12', meta: { order: 0 } });
    expect(update).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
  });

  it('persists and refreshes when the order changes', async () => {
    const row = { id: '12', meta: { order: 8 } };
    const update = vi.fn().mockResolvedValue(undefined);
    const refresh = vi.fn().mockResolvedValue(undefined);

    await expect(
      persistMenuOrder({
        previousOrder: 3,
        refresh,
        row,
        submittedOrder: row.meta.order,
        update,
      }),
    ).resolves.toBe(true);

    expect(update).toHaveBeenCalledOnce();
    expect(update).toHaveBeenCalledWith('12', 8);
    expect(refresh).toHaveBeenCalledOnce();
  });

  it('restores the previous order when persistence fails', async () => {
    const error = new Error('update failed');
    const row = { id: '12', meta: { order: 8 } };
    const update = vi.fn().mockRejectedValue(error);
    const refresh = vi.fn();

    await expect(
      persistMenuOrder({
        previousOrder: 3,
        refresh,
        row,
        submittedOrder: row.meta.order,
        update,
      }),
    ).rejects.toBe(error);

    expect(row.meta.order).toBe(3);
    expect(refresh).not.toHaveBeenCalled();
  });

  it('does not overwrite a newer edit when an older update fails', async () => {
    const error = new Error('old update failed');
    const row = { id: '12', meta: { order: 8 } };
    let rejectUpdate!: (reason?: unknown) => void;
    const pendingUpdate = new Promise<never>((_resolve, reject) => {
      rejectUpdate = reject;
    });
    const update = vi.fn().mockReturnValue(pendingUpdate);
    const refresh = vi.fn();

    const save = persistMenuOrder({
      previousOrder: 3,
      refresh,
      row,
      submittedOrder: row.meta.order,
      update,
    });
    row.meta.order = 12;
    rejectUpdate(error);

    await expect(save).rejects.toBe(error);
    expect(row.meta.order).toBe(12);
    expect(refresh).not.toHaveBeenCalled();
  });

  it('keeps the submitted order when refresh fails after persistence', async () => {
    const error = new Error('refresh failed');
    const row = { id: '12', meta: { order: 8 } };
    const update = vi.fn().mockResolvedValue(undefined);
    const refresh = vi.fn().mockRejectedValue(error);

    await expect(
      persistMenuOrder({
        previousOrder: 3,
        refresh,
        row,
        submittedOrder: row.meta.order,
        update,
      }),
    ).rejects.toBe(error);

    expect(row.meta.order).toBe(8);
    expect(update).toHaveBeenCalledOnce();
    expect(refresh).toHaveBeenCalledOnce();
  });
});
