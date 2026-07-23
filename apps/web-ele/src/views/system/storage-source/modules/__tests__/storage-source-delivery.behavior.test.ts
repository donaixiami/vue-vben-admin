// Feature: 存储源表单使用现有控件配置媒体交付方式
//
// Scenario: 本地存储固定使用后端中转
//   Given 表单驱动为 local
//   When 用户编辑存储源
//   Then 交付模式固定为 proxy 且不提交签名 TTL
//
// Scenario: OSS 可配置代理或临时签名直连
//   Given 表单驱动为 aliyun_oss
//   When 用户选择 oss_signed 并填写 TTL
//   Then 表单提交交付模式和受限 TTL
//
// Scenario: CDN 直连保持可识别但不可选择
//   Given 当前项目没有 CDN 签名配置
//   When 用户查看 OSS 交付模式选项
//   Then CDN 模式显示为暂不可用且不能提交

import { describe, expect, it } from 'vitest';

import { useFormSchema } from '../../data';
import {
  buildStorageSourcePayload,
  getDeliveryModeOptions,
  getStorageSourceConfigFields,
} from '../storage-source-form';

describe('存储源交付模式表单', () => {
  it('本地存储固定提交 proxy 且不提交签名 TTL', () => {
    const payload = buildStorageSourcePayload({
      code: 'local',
      name: '本地',
      driver: 'local',
      priority: 100,
      enabled: true,
      isFallback: false,
      rootDir: 'D:/storage',
      deliveryMode: 'oss_signed',
      signedUrlTtlSeconds: 999,
    });

    expect(getStorageSourceConfigFields('local')).toEqual([
      'rootDir',
      'deliveryMode',
    ]);
    expect(payload.config).toEqual({
      rootDir: 'D:/storage',
      deliveryMode: 'proxy',
    });
  });

  it('OSS 签名直连提交受限 TTL', () => {
    const payload = buildStorageSourcePayload({
      code: 'oss',
      name: 'OSS',
      driver: 'aliyun_oss',
      priority: 10,
      enabled: true,
      isFallback: false,
      region: 'oss-cn-beijing',
      bucket: 'private',
      accessKeyIdRef: 'OSS_ID',
      accessKeySecretRef: 'OSS_SECRET',
      deliveryMode: 'oss_signed',
      signedUrlTtlSeconds: 999,
    });

    expect(payload.config).toMatchObject({
      deliveryMode: 'oss_signed',
      signedUrlTtlSeconds: 300,
    });
    const fields = getStorageSourceConfigFields('aliyun_oss');
    expect(fields).toContain('deliveryMode');
    expect(fields).toContain('signedUrlTtlSeconds');
  });

  it('CDN 直连选项保持禁用', () => {
    expect(getDeliveryModeOptions()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ value: 'cdn_signed', disabled: true }),
      ]),
    );
    const schema = useFormSchema(false);
    expect(
      schema.find((item) => item.fieldName === 'deliveryMode'),
    ).toBeTruthy();
    expect(
      schema.find((item) => item.fieldName === 'signedUrlTtlSeconds'),
    ).toBeTruthy();
  });
});
