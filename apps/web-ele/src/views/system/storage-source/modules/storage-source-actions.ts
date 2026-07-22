export function canDeleteStorageSource(row: {
  referenceCount: number;
}): boolean {
  return Number(row.referenceCount) === 0;
}

export function storageSourceActionRequiresConfirm(code: string): boolean {
  return code === 'delete' || code === 'disable';
}
