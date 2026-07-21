import { mount } from '@vue/test-utils';
import { defineComponent, h } from 'vue';

import { afterEach, describe, expect, it, vi } from 'vitest';

import Login from '../login.vue';

const { authStore } = vi.hoisted(() => ({
  authStore: { authLogin: vi.fn(), loginLoading: false },
}));

vi.mock('#/store', () => ({ useAuthStore: () => authStore }));
vi.mock('@vben/locales', () => ({ $t: (key: string) => key }));
vi.mock('@vben/common-ui', async (importOriginal) => {
  const original = await importOriginal<typeof import('@vben/common-ui')>();
  return {
    ...original,
    AuthenticationLogin: defineComponent({
      name: 'AuthenticationLogin',
      props: { formSchema: { type: Array, required: true }, loading: Boolean },
      emits: ['submit'],
      setup: () => () => h('div'),
    }),
  };
});

function fieldNames() {
  const wrapper = mount(Login);
  const formSchema = wrapper
    .getComponent({ name: 'AuthenticationLogin' })
    .props('formSchema') as Array<{ fieldName: string }>;
  return formSchema.map(({ fieldName }) => fieldName);
}

// Feature: 通过构建配置控制管理端登录验证码
//
// Scenario: 关闭验证码时登录表单不显示验证码字段
//   Given VITE_GLOB_CAPTCHA_ENABLED=false
//   When 渲染登录页
//   Then 表单只显示用户名和密码并允许直接提交
describe('login captcha configuration', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('omits the captcha field when disabled', () => {
    vi.stubEnv('VITE_GLOB_CAPTCHA_ENABLED', 'false');

    expect(fieldNames()).toEqual(['username', 'password']);
  });

  // Scenario: 开启验证码时登录表单要求完成验证码
  //   Given VITE_GLOB_CAPTCHA_ENABLED=true
  //   When 渲染登录页
  //   Then 表单显示验证码字段并要求 captchaToken
  it('requires the captcha field when enabled', () => {
    vi.stubEnv('VITE_GLOB_CAPTCHA_ENABLED', 'true');

    expect(fieldNames()).toEqual(['username', 'password', 'captchaToken']);
  });

  // Scenario: 未配置开关时默认关闭
  //   Given VITE_GLOB_CAPTCHA_ENABLED 未配置或不是 true
  //   When 渲染登录页
  //   Then 表单不显示验证码字段
  it('defaults the captcha field to disabled', () => {
    expect(fieldNames()).toEqual(['username', 'password']);
  });
});
