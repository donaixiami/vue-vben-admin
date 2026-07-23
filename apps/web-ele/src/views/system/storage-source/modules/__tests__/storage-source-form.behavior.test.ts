import { describe, expect, it } from 'vitest';

import {
  buildStorageSourcePayload,
  buildStorageSourceSchema,
  getEditingStorageSource,
  getStorageSourceConfigFields,
  isStorageSourceIdentityLocked,
  normalizeScopeSelection,
} from '../storage-source-form';

import type { StorageSourceApi } from '#/api/system/storage-source';

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

  it('按驱动描述符映射配置字段且不写死 OAuth 密钥', () => {
    const descriptor: StorageSourceApi.DriverDescriptor = {
      type: 'webdav',
      label: 'WebDAV',
      category: 'netdisk',
      capabilities: {
        category: 'netdisk',
        supportsDelete: true,
        supportsDirectReadUrl: false,
        supportsOAuth: false,
        supportsQuota: true,
        supportsRead: true,
        supportsSpeedTest: true,
        supportsWrite: true,
      },
      configFields: [
        { key: 'endpoint', label: '服务地址', type: 'text', required: true },
        {
          key: 'timeout',
          label: '超时秒数',
          type: 'number',
          required: false,
          defaultValue: 30,
          min: 5,
          max: 120,
        },
        {
          key: 'region',
          label: '区域',
          type: 'select',
          required: false,
          options: [{ label: '中国大陆', value: 'cn' }],
        },
      ],
    };

    const schema = buildStorageSourceSchema([descriptor], false);
    expect(schema.find((item) => item.fieldName === 'category')).toMatchObject({
      component: 'Select',
      label: '存储类型',
    });
    const driverField = schema.find((item) => item.fieldName === 'driver');
    expect(driverField?.componentProps).toBeTypeOf('function');
    if (typeof driverField?.componentProps === 'function') {
      expect(
        driverField.componentProps({ category: 'netdisk' } as any, {} as any),
      ).toMatchObject({
        options: [{ label: 'WebDAV', value: 'webdav' }],
      });
    }
    expect(
      schema.find((item) => item.fieldName === 'config.endpoint'),
    ).toMatchObject({ component: 'Input', rules: 'required' });
    expect(
      schema.find((item) => item.fieldName === 'config.timeout'),
    ).toMatchObject({
      component: 'InputNumber',
      componentProps: { max: 120, min: 5 },
      defaultValue: 30,
    });
    expect(
      schema.find((item) => item.fieldName === 'config.region'),
    ).toMatchObject({ component: 'Select' });
    expect(JSON.stringify(schema)).not.toMatch(/accessToken|refreshToken/);
  });

  it('空选择表示全部范围，多选值原样提交', () => {
    expect(normalizeScopeSelection(['all', 'image'])).toEqual([]);
    expect(normalizeScopeSelection([])).toEqual([]);
    expect(normalizeScopeSelection(['image', 'document', 'image'])).toEqual([
      'image',
      'document',
    ]);

    const payload = buildStorageSourcePayload({
      code: 'baidu-main',
      name: '百度主账号',
      driver: 'baidu_netdisk',
      priority: 10,
      enabled: true,
      isFallback: false,
      allowedMimeGroups: ['image', 'document'],
      allowedBizTypes: ['chat', 'avatar'],
      config: {},
    });
    expect(payload).toMatchObject({
      allowedMimeGroups: ['image', 'document'],
      allowedBizTypes: ['chat', 'avatar'],
    });
  });
});
