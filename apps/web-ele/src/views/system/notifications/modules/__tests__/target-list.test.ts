import { describe, expect, it, vi } from 'vitest';

import {
  isTargetType,
  loadTargetList,
  normalizeTargetIds,
  removeTargetId,
  shouldClearSelectedTargets,
} from '../target-list';

describe('notification target list loader', () => {
  it('loads and normalizes paginated target list responses', async () => {
    const apis = {
      users: vi.fn().mockResolvedValue({
        items: [{ id: '1', real_name: 'Alice' }],
        total: 1,
      }),
      depts: vi.fn(),
      roles: vi.fn(),
    };

    await expect(loadTargetList('users', apis)).resolves.toEqual([
      { id: '1', real_name: 'Alice' },
    ]);
    expect(apis.users).toHaveBeenCalledWith({});
  });

  it('loads array target list responses', async () => {
    const apis = {
      users: vi.fn(),
      depts: vi.fn().mockResolvedValue([{ id: '10', name: 'Sales' }]),
      roles: vi.fn(),
    };

    await expect(loadTargetList('depts', apis)).resolves.toEqual([
      { id: '10', name: 'Sales' },
    ]);
    expect(apis.depts).toHaveBeenCalledWith({});
  });

  it('returns an empty list for unsupported target types', async () => {
    const apis = {
      users: vi.fn(),
      depts: vi.fn(),
      roles: vi.fn(),
    };

    await expect(loadTargetList('all', apis)).resolves.toEqual([]);
    expect(isTargetType('all', apis)).toBe(false);
  });

  it('clears selected targets only after the target type changes', () => {
    expect(shouldClearSelectedTargets('users', undefined)).toBe(false);
    expect(shouldClearSelectedTargets('users', 'all')).toBe(false);
    expect(shouldClearSelectedTargets('users', 'users')).toBe(false);
    expect(shouldClearSelectedTargets('all', 'users')).toBe(true);
    expect(shouldClearSelectedTargets('roles', 'users')).toBe(true);
  });

  it('normalizes selected target ids to numbers for submission', () => {
    expect(normalizeTargetIds(['1', 2, '003', 'bad'])).toEqual([1, 2, 3]);
  });

  it('removes a selected target id without mutating other ids', () => {
    expect(removeTargetId([1, 2, 3], '2')).toEqual([1, 3]);
    expect(removeTargetId([1, 2, 3], 'bad')).toEqual([1, 2, 3]);
  });
});
