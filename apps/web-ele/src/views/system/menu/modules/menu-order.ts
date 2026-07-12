interface MenuOrderRow {
  id: string;
  meta?: {
    order?: unknown;
  };
}

interface PersistMenuOrderOptions {
  previousOrder: unknown;
  refresh: () => Promise<unknown> | unknown;
  row: MenuOrderRow;
  submittedOrder: unknown;
  update: (id: string, order: number) => Promise<unknown>;
}

function normalizeMenuOrder(value: unknown): number {
  if (value === '' || value === null || value === undefined) {
    return 0;
  }

  const order = Number(value);
  return Number.isInteger(order) ? order : 0;
}

async function persistMenuOrder({
  previousOrder,
  refresh,
  row,
  submittedOrder,
  update,
}: PersistMenuOrderOptions): Promise<boolean> {
  const normalizedSubmittedOrder = normalizeMenuOrder(submittedOrder);
  const normalizedPreviousOrder = normalizeMenuOrder(previousOrder);

  row.meta ??= {};
  if (normalizeMenuOrder(row.meta.order) === normalizedSubmittedOrder) {
    row.meta.order = normalizedSubmittedOrder;
  }

  if (normalizedSubmittedOrder === normalizedPreviousOrder) {
    return false;
  }

  try {
    await update(row.id, normalizedSubmittedOrder);
  } catch (error) {
    if (normalizeMenuOrder(row.meta?.order) === normalizedSubmittedOrder) {
      row.meta ??= {};
      row.meta.order = normalizedPreviousOrder;
    }
    throw error;
  }

  await refresh();
  return true;
}

export { normalizeMenuOrder, persistMenuOrder };
export type { MenuOrderRow, PersistMenuOrderOptions };
