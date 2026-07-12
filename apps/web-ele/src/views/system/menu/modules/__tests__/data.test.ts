import { describe, expect, it, vi } from 'vitest';

import { enqueueMenuOrderSave, useColumns } from '../../data';
import { persistMenuOrder } from '../menu-order';

vi.mock('#/locales', () => ({ $t: (key: string) => key }));

describe('menu table columns', () => {
  it('defines an editable numeric order column before status', () => {
    const columns = useColumns(() => {}) ?? [];
    const orderIndex = columns.findIndex(
      (column) => column.field === 'meta.order',
    );
    const statusIndex = columns.findIndex(
      (column) => column.field === 'status',
    );
    const orderColumn = columns[orderIndex];

    expect(orderIndex).toBeGreaterThanOrEqual(0);
    expect(orderIndex).toBeLessThan(statusIndex);
    expect(orderColumn).toMatchObject({
      align: 'center',
      editRender: {
        attrs: {
          class: expect.stringContaining('w-full'),
          type: 'number',
        },
        name: 'input',
      },
      field: 'meta.order',
      title: '排序',
      width: 100,
    });
  });

  it.each([
    [undefined, 0],
    ['', 0],
    ['5', 5],
    [4.5, 0],
  ])('formats order value %j as %i', (order, expected) => {
    const columns = useColumns(() => {}) ?? [];
    const orderColumn = columns.find((column) => column.field === 'meta.order');
    const formatter = orderColumn?.formatter;

    expect(formatter).toBeTypeOf('function');
    expect(
      (formatter as (params: { row: { meta: { order?: unknown } } }) => number)(
        {
          row: { meta: { order } },
        },
      ),
    ).toBe(expected);
  });
});

describe('menu order save queue', () => {
  it('serializes later saves for the same row', async () => {
    const queue = new Map<string, Promise<void>>();
    let resolveFirst!: () => void;
    let resolveSecond!: () => void;
    let resolveThird!: () => void;
    const firstOperation = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveFirst = resolve;
        }),
    );
    const secondOperation = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveSecond = resolve;
        }),
    );
    const thirdOperation = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveThird = resolve;
        }),
    );

    const firstSave = enqueueMenuOrderSave(queue, '12', firstOperation);
    const secondSave = enqueueMenuOrderSave(queue, '12', secondOperation);
    const thirdSave = enqueueMenuOrderSave(queue, '12', thirdOperation);

    await vi.waitFor(() => expect(firstOperation).toHaveBeenCalledOnce());
    expect(secondOperation).not.toHaveBeenCalled();
    expect(thirdOperation).not.toHaveBeenCalled();

    resolveFirst();
    await firstSave;
    await vi.waitFor(() => expect(secondOperation).toHaveBeenCalledOnce());
    expect(thirdOperation).not.toHaveBeenCalled();

    resolveSecond();
    await secondSave;
    await vi.waitFor(() => expect(thirdOperation).toHaveBeenCalledOnce());

    resolveThird();
    await thirdSave;
  });

  it('submits each blurred value in order when an intermediate save fails', async () => {
    const queue = new Map<string, Promise<void>>();
    const row = { id: '12', meta: { order: 3 } };
    const update = vi
      .fn()
      .mockRejectedValueOnce(new Error('first save failed'))
      .mockResolvedValueOnce(undefined);
    const refresh = vi.fn().mockResolvedValue(undefined);

    const firstSave = enqueueMenuOrderSave(queue, row.id, () =>
      persistMenuOrder({
        previousOrder: 2,
        refresh,
        row,
        submittedOrder: 3,
        update,
      }).then(() => undefined),
    );

    row.meta.order = 4;
    const secondSave = enqueueMenuOrderSave(queue, row.id, () =>
      persistMenuOrder({
        previousOrder: 3,
        refresh,
        row,
        submittedOrder: 4,
        update,
      }).then(() => undefined),
    );

    await expect(firstSave).rejects.toThrow('first save failed');
    await expect(secondSave).resolves.toBeUndefined();

    expect(update.mock.calls).toEqual([
      ['12', 3],
      ['12', 4],
    ]);
    expect(row.meta.order).toBe(4);
  });
});
