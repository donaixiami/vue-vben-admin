import { flushPromises, mount } from '@vue/test-utils';
import { defineComponent, h, nextTick } from 'vue';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import Login from '../login.vue';
import ServerSliderCaptcha from '../server-slider-captcha.vue';

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

function deferred<T>() {
  let reject!: (reason?: unknown) => void;
  let resolve!: (value: PromiseLike<T> | T) => void;
  const promise = new Promise<T>((nextResolve, nextReject) => {
    resolve = nextResolve;
    reject = nextReject;
  });
  return { promise, reject, resolve };
}

const loginValues = {
  captchaToken: 'captcha-token',
  password: 'secret',
  username: 'admin',
};

describe('login page', () => {
  // 本套用例验证“开启验证码”时的登录页行为；关闭场景见 captcha-config.test.ts
  beforeEach(() => {
    vi.stubEnv('VITE_GLOB_CAPTCHA_ENABLED', 'true');
    authStore.authLogin.mockReset();
    authStore.loginLoading = false;
  });

  afterEach(() => {
    vi.unstubAllEnvs();
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

  it('uses one in-flight login request for consecutive submits', async () => {
    const login = deferred<{ userInfo: null }>();
    authStore.authLogin.mockReturnValue(login.promise);
    const wrapper = mountLogin();
    const submit = submitHandler(wrapper);

    const first = submit(loginValues);
    const second = submit(loginValues);
    await nextTick();

    expect(authStore.authLogin).toHaveBeenCalledOnce();
    expect(schemaOf(wrapper)[2]?.componentProps?.disabled).toBe(true);
    login.resolve({ userInfo: null });
    await Promise.all([first, second]);
  });

  it('refreshes captcha once after a failed login', async () => {
    const login = deferred<{ userInfo: null }>();
    authStore.authLogin.mockReturnValue(login.promise);
    const wrapper = mountLogin();
    const initialResetKey = schemaOf(wrapper)[2]?.componentProps?.resetKey;
    const submit = submitHandler(wrapper);
    const request = submit(loginValues);
    const duplicate = submit(loginValues);
    await nextTick();
    login.reject(new Error('login failed'));

    await expect(Promise.all([request, duplicate])).rejects.toThrow(
      'login failed',
    );
    await nextTick();

    expect(schemaOf(wrapper)[2]?.componentProps?.resetKey).toBe(
      Number(initialResetKey) + 1,
    );
    expect(schemaOf(wrapper)[2]?.componentProps?.disabled).toBe(false);
  });

  it('does not refresh captcha after a successful login', async () => {
    authStore.authLogin.mockResolvedValue({ userInfo: null });
    const wrapper = mountLogin();
    const initialResetKey = schemaOf(wrapper)[2]?.componentProps?.resetKey;

    await submitHandler(wrapper)(loginValues);
    await flushPromises();

    expect(schemaOf(wrapper)[2]?.componentProps?.resetKey).toBe(
      initialResetKey,
    );
  });
});
