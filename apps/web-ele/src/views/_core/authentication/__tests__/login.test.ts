import { flushPromises, mount } from '@vue/test-utils';
import { defineComponent, h, nextTick } from 'vue';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import Login from '../login.vue';
import ServerSliderCaptcha from '../server-slider-captcha.vue';

const { authStore } = vi.hoisted(() => ({
  authStore: {
    authLogin: vi.fn(),
    loginLoading: false,
  },
}));

vi.mock('#/store', () => ({ useAuthStore: () => authStore }));
vi.mock('@vben/locales', () => ({ $t: (key: string) => key }));

vi.mock('@vben/common-ui', async (importOriginal) => {
  const original = await importOriginal<typeof import('@vben/common-ui')>();
  return {
    ...original,
    AuthenticationLogin: defineComponent({
      name: 'AuthenticationLogin',
      props: {
        formSchema: { type: Array, required: true },
        loading: Boolean,
      },
      emits: ['submit'],
      setup() {
        return () => h('div');
      },
    }),
  };
});

function mountLogin() {
  return mount(Login);
}

function authenticationLogin(wrapper: ReturnType<typeof mountLogin>) {
  return wrapper.getComponent({ name: 'AuthenticationLogin' });
}

function schemaOf(wrapper: ReturnType<typeof mountLogin>) {
  return authenticationLogin(wrapper).props('formSchema') as Array<{
    component: unknown;
    componentProps?: Record<string, unknown>;
    fieldName: string;
    rules: { safeParse: (value: unknown) => { success: boolean } };
  }>;
}

function submitHandler(wrapper: ReturnType<typeof mountLogin>) {
  const handler = authenticationLogin(wrapper).vm.$.vnode.props?.onSubmit;
  if (typeof handler !== 'function') throw new Error('Missing submit handler');
  return handler as (values: Record<string, unknown>) => Promise<unknown>;
}

describe('login page', () => {
  beforeEach(() => {
    authStore.authLogin.mockReset();
    authStore.loginLoading = false;
  });

  it('uses only username, password, and required server captcha token fields', () => {
    const schema = schemaOf(mountLogin());

    expect(schema.map(({ fieldName }) => fieldName)).toEqual([
      'username',
      'password',
      'captchaToken',
    ]);
    const captcha = schema[2];
    expect(captcha?.component).toBe(ServerSliderCaptcha);
    expect(captcha?.rules.safeParse('').success).toBe(false);
    expect(captcha?.rules.safeParse('captcha-token').success).toBe(true);
  });

  it('increments the captcha reset signal when login fails', async () => {
    authStore.authLogin.mockRejectedValue(new Error('login failed'));
    const wrapper = mountLogin();
    const initialResetKey = schemaOf(wrapper)[2]?.componentProps?.resetKey;

    await expect(
      submitHandler(wrapper)({
        captchaToken: 'captcha-token',
        password: 'secret',
        username: 'admin',
      }),
    ).rejects.toThrow('login failed');
    await nextTick();

    expect(schemaOf(wrapper)[2]?.componentProps?.resetKey).toBe(
      Number(initialResetKey) + 1,
    );
  });

  it('does not reset the captcha when login succeeds', async () => {
    authStore.authLogin.mockResolvedValue({ userInfo: null });
    const wrapper = mountLogin();
    const initialResetKey = schemaOf(wrapper)[2]?.componentProps?.resetKey;

    await submitHandler(wrapper)({
      captchaToken: 'captcha-token',
      password: 'secret',
      username: 'admin',
    });
    await flushPromises();

    expect(schemaOf(wrapper)[2]?.componentProps?.resetKey).toBe(
      initialResetKey,
    );
  });

  it('disables captcha interaction while login is loading', () => {
    authStore.loginLoading = true;
    const wrapper = mountLogin();

    expect(schemaOf(wrapper)[2]?.componentProps?.disabled).toBe(true);
  });
});
