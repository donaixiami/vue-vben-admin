// Feature: 管理员在既有 Vben 存储源页面管理网盘账号池
//
// Scenario: 页面按存储类型、服务商和账号展示来源
//   Given 后端返回本地、对象存储和多个网盘账号
//   When 管理员打开存储源页面
//   Then 页面应按类型汇总并在服务商下展示各账号状态与容量
//
// Scenario: 账号状态和路由资格具有明确语义
//   Given 列表包含 ready、testing、容量不足和 cleanup_pending 账号
//   When 页面渲染状态与操作
//   Then 每个账号应显示文字状态且只开放当前状态允许的操作
//
// Scenario: 驱动 schema 决定新增账号表单
//   Given 管理员选择一个后端注册的 OAuth 或静态配置驱动
//   When 打开新增账号抽屉
//   Then 页面应按驱动 schema 生成非敏感字段或发起 OAuth 授权
//
// Scenario: 默认全部文件与多选限制正确提交
//   Given 管理员编辑账号的 MIME 分组和业务用途
//   When 选择全部文件或多个限制项并保存
//   Then 页面应分别提交空数组或所选枚举数组
//
// Scenario: 管理员刷新容量并重新测速
//   Given 账号具备配额和测速能力且管理员拥有对应权限
//   When 点击刷新容量或重新测速
//   Then 页面应调用对应 API 并以后端生命周期状态更新列表
//
// Scenario: 参数页以 GB 编辑最低保留容量
//   Given sys.storage.minFreeBytes 以后端十进制 bytes 字符串返回
//   When 管理员在现有参数页查看并编辑该参数
//   Then 页面应以 GB 显示并在提交时转换回整数 bytes 字符串

import { describe, expect, it } from 'vitest';

import type { StorageSourceApi } from '#/api/system/storage-source';

import {
  getStorageSourceActionOptions,
  shouldPollStorageSources,
} from '../modules/storage-source-actions';
import {
  formatStorageBytes,
  formatStorageRate,
  getProvisionStatusMeta,
  getStorageSourceStatusMeta,
  summarizeFileScope,
} from '../modules/storage-source-metrics';
import { groupStorageSources } from '../modules/storage-source-routing';
import {
  STORAGE_SOURCE_PERMISSION_CODES,
  type StorageSourcePermissionCode,
} from '../modules/permissions';

const driver = {
  type: 'baidu_netdisk',
  label: '百度网盘',
  category: 'netdisk',
  capabilities: {
    category: 'netdisk',
    supportsDelete: true,
    supportsDirectReadUrl: false,
    supportsOAuth: true,
    supportsQuota: true,
    supportsRead: true,
    supportsSpeedTest: true,
    supportsWrite: true,
  },
  configFields: [],
} satisfies StorageSourceApi.DriverDescriptor;

function source(
  overrides: Partial<StorageSourceApi.StorageSource> = {},
): StorageSourceApi.StorageSource {
  return {
    id: 1,
    code: 'baidu-main',
    name: '百度主账号',
    driver: 'baidu_netdisk',
    sourceKind: 'netdisk',
    provider: 'baidu_netdisk',
    providerLabel: '百度网盘',
    priority: 10,
    enabled: true,
    isFallback: false,
    provisionStatus: 'ready',
    healthStatus: 'healthy',
    healthCheckedAt: null,
    healthMessage: null,
    referenceCount: 0,
    allowedMimeGroups: [],
    allowedBizTypes: [],
    quota: {
      totalBytes: '2147483648',
      usedBytes: '1073741824',
      freeBytes: '1073741824',
      checkedAt: null,
    },
    speed: {
      uploadBps: '8388608',
      downloadBps: '20971520',
      sampleCount: 3,
      checkedAt: null,
    },
    cooldownUntil: null,
    routingEligible: true,
    config: {},
    createdAt: '2026-07-23T00:00:00.000Z',
    updatedAt: '2026-07-23T00:00:00.000Z',
    ...overrides,
  };
}

describe('Vben 网盘账号池管理', () => {
  it('按存储类型、服务商和账号展示来源', () => {
    const groups = groupStorageSources(
      [
        source(),
        source({ id: 2, code: 'baidu-archive', name: '百度归档账号' }),
        source({
          id: 3,
          code: 'oss-main',
          name: 'OSS 主桶',
          driver: 'aliyun_oss',
          provider: 'aliyun_oss',
          providerLabel: '阿里云 OSS',
          sourceKind: 'object_storage',
        }),
      ],
      [driver],
    );

    expect(groups.map((item) => item.category)).toEqual([
      'object_storage',
      'netdisk',
    ]);
    expect(groups[1]?.providers[0]).toMatchObject({
      label: '百度网盘',
      provider: 'baidu_netdisk',
    });
    expect(groups[1]?.providers[0]?.sources).toHaveLength(2);
  });

  it('明确展示账号状态并限制可用操作', () => {
    expect(getProvisionStatusMeta('ready')).toMatchObject({ label: '可用' });
    expect(getProvisionStatusMeta('testing')).toMatchObject({
      label: '检测中',
    });
    expect(getProvisionStatusMeta('cleanup_pending')).toMatchObject({
      label: '待清理',
    });
    expect(
      getStorageSourceStatusMeta(
        source({ routingEligible: false, provisionStatus: 'ready' }),
      ),
    ).toMatchObject({ label: '容量不足' });
    expect(
      getStorageSourceStatusMeta(
        source({
          routingEligible: false,
          provisionStatus: 'ready',
          quota: {
            totalBytes: null,
            usedBytes: null,
            freeBytes: null,
            checkedAt: null,
          },
        }),
      ),
    ).toMatchObject({ label: '容量未知' });
    expect(
      shouldPollStorageSources([source({ provisionStatus: 'ready' })]),
    ).toBe(false);
    expect(
      shouldPollStorageSources([source({ provisionStatus: 'testing' })]),
    ).toBe(true);

    const hasPermission = (code: StorageSourcePermissionCode) =>
      code !== STORAGE_SOURCE_PERMISSION_CODES.delete;
    expect(
      getStorageSourceActionOptions(source(), driver, hasPermission).map(
        (item) => item.code,
      ),
    ).toEqual([
      'edit',
      'health-check',
      'quota-refresh',
      'speed-test',
      'disable',
    ]);
    expect(
      getStorageSourceActionOptions(
        source({ enabled: false, provisionStatus: 'testing' }),
        driver,
        () => true,
      ).map((item) => item.code),
    ).toEqual(['edit', 'delete']);
  });

  it('正确格式化容量、速率、未知容量和文件范围', () => {
    expect(formatStorageBytes('1073741824')).toBe('1 GB');
    expect(formatStorageBytes(null)).toBe('未知');
    expect(formatStorageRate('8388608')).toBe('8 MB/s');
    expect(summarizeFileScope([], [])).toBe('全部文件');
    expect(summarizeFileScope(['image', 'document'], ['chat'])).toBe(
      '图片、文档 · 聊天附件',
    );
  });

  it('集中定义全部存储源权限码', () => {
    expect(Object.values(STORAGE_SOURCE_PERMISSION_CODES)).toEqual([
      'system:storage-source:list',
      'system:storage-source:create',
      'system:storage-source:update',
      'system:storage-source:delete',
      'system:storage-source:change-status',
      'system:storage-source:health-check',
      'system:storage-source:quota-refresh',
      'system:storage-source:speed-test',
    ]);
  });
});
