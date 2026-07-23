import { describe, expect, it } from 'vitest';

import {
  buildStorageSourcePayload,
  getEditingStorageSource,
  getStorageSourceConfigFields,
  isStorageSourceIdentityLocked,
} from '../storage-source-form';

describe('存储源动态表单', () => {
  it('local 只显示根目录配置', () => {
    expect(getStorageSourceConfigFields('local')).toEqual([
      'rootDir',
      'deliveryMode',
    ]);
  });

  it('aliyun_oss 只提交环境变量引用', () => {
    const payload = buildStorageSourcePayload({
      code: 'oss_primary',
      name: 'OSS',
      driver: 'aliyun_oss',
      priority: 100,
      enabled: true,
      isFallback: false,
      region: 'oss-cn-beijing',
      bucket: 'private',
      accessKeyIdRef: 'OSS_ID',
      accessKeySecretRef: 'OSS_SECRET',
      accessKeyId: 'plaintext-id',
      accessKeySecret: 'plaintext-secret',
    });
    expect(payload.config).toEqual({
      region: 'oss-cn-beijing',
      bucket: 'private',
      accessKeyIdRef: 'OSS_ID',
      accessKeySecretRef: 'OSS_SECRET',
      deliveryMode: 'proxy',
      signedUrlTtlSeconds: 120,
    });
    expect(JSON.stringify(payload)).not.toMatch(/plaintext/);
  });

  it('编辑时锁定 code 和 driver', () => {
    expect(isStorageSourceIdentityLocked(true, 'code')).toBe(true);
    expect(isStorageSourceIdentityLocked(true, 'driver')).toBe(true);
    expect(isStorageSourceIdentityLocked(false, 'driver')).toBe(false);
  });

  it('新增时抽屉空数据不应被识别为编辑', () => {
    expect(getEditingStorageSource({})).toBeUndefined();
    expect(getEditingStorageSource(undefined)).toBeUndefined();
  });
});
