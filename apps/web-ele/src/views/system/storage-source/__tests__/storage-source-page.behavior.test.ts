import { describe, expect, it } from 'vitest';

import pageSource from '../list.vue?raw';
import {
  canDeleteStorageSource,
  storageSourceActionRequiresConfirm,
} from '../modules/storage-source-actions';

describe('Vben 存储源管理页面', () => {
  it('复用 Vben Grid Drawer Form 组合', () => {
    expect(pageSource).toContain('Page');
    expect(pageSource).toContain('useVbenVxeGrid');
    expect(pageSource).toContain('useVbenDrawer');
    expect(pageSource).not.toContain('<table');
    expect(pageSource).not.toContain('<style');
  });

  it('引用中的来源禁用删除操作', () => {
    expect(canDeleteStorageSource({ referenceCount: 2 })).toBe(false);
    expect(canDeleteStorageSource({ referenceCount: 0 })).toBe(true);
  });

  it('禁用和删除使用明确 action code', () => {
    expect(storageSourceActionRequiresConfirm('delete')).toBe(true);
    expect(storageSourceActionRequiresConfirm('disable')).toBe(true);
    expect(storageSourceActionRequiresConfirm('health-check')).toBe(false);
  });
});
