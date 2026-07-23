// Feature: 存储源访问方式使用框架帮助提示说明失效条件
//
// Scenario: OSS 临时签名直连展示失效帮助提示
//   Given 管理员正在编辑阿里云 OSS 存储源
//   When 表单展示访问方式字段
//   Then 字段标签旁使用框架帮助提示展示临时链接过期、域名放行和配置异常说明
//   And 提示说明签名失败时会自动回退后端中转

import { describe, expect, it } from 'vitest';

import { useFormSchema } from '../../data';

describe('存储源访问方式失效帮助提示', () => {
  it('使用框架帮助提示说明 OSS 临时签名直连的失效条件与回退行为', () => {
    const schema = useFormSchema(false);
    const deliveryMode = schema.find(
      (item) => item.fieldName === 'deliveryMode',
    );

    expect(deliveryMode?.help).toContain('临时链接将在设定时间后失效');
    expect(deliveryMode?.help).toContain('OSS 未允许当前访问域名');
    expect(deliveryMode?.help).toContain('存储配置异常');
    expect(deliveryMode?.help).toContain('自动切换为后端中转');
  });
});
