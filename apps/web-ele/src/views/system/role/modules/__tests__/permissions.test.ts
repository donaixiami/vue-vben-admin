import { describe, expect, it } from 'vitest';

describe('role permissions', () => {
  it('builds operation options with edit and delete permission checks', async () => {
    const { ROLE_PERMISSION_CODES, buildRoleOperationOptions } =
      await import('../permissions');
    const allowedCodes = new Set<string>([ROLE_PERMISSION_CODES.edit]);

    const options = buildRoleOperationOptions((code) => allowedCodes.has(code));
    const [editOption, deleteOption] = options;

    expect(editOption?.code).toBe('edit');
    expect(deleteOption?.code).toBe('delete');
    expect(editOption?.show?.({})).toBe(true);
    expect(deleteOption?.show?.({})).toBe(false);
  });
});
