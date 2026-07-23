import { describe, expect, it } from 'vitest';

import pageSource from '../list.vue?raw';
import formSource from '../modules/form.vue?raw';
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

  it('编排驱动目录、概览、OAuth、容量刷新和测速操作', () => {
    expect(pageSource).toContain('getStorageSourceDrivers');
    expect(pageSource).toContain('getStorageSourceSummary');
    expect(formSource).toContain('startStorageSourceOAuth');
    expect(pageSource).toContain('refreshStorageSourceQuota');
    expect(pageSource).toContain('runStorageSourceSpeedTest');
    expect(pageSource).toContain('STORAGE_SOURCE_PERMISSION_CODES');
  });

  it('仅在后端生命周期存在过渡状态时启动轮询', () => {
    expect(pageSource).toContain('shouldPollStorageSources');
    expect(pageSource).toContain('startStatusPolling');
    expect(pageSource).toContain('stopStatusPolling');
    expect(pageSource).not.toContain('enabled=true 即可路由');
  });
});
