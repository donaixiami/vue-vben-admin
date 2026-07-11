import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAuthStore } from '../auth';

const { loginApi } = vi.hoisted(() => ({
  loginApi: vi.fn(),
}));

vi.mock('#/api', () => ({
  getAccessCodesApi: vi.fn(),
  getUserInfoApi: vi.fn(),
  loginApi,
  logoutApi: vi.fn(),
}));

vi.mock('vue-router', () => ({
  useRouter: () => ({
    currentRoute: { value: { fullPath: '/' } },
    push: vi.fn(),
    replace: vi.fn(),
  }),
}));

vi.mock('@vben/preferences', () => ({
  preferences: { app: { defaultHomePath: '/' } },
}));

vi.mock('@vben/stores', () => ({
  resetAllStores: vi.fn(),
  useAccessStore: () => ({
    loginExpired: false,
    setAccessCodes: vi.fn(),
    setAccessToken: vi.fn(),
    setLoginExpired: vi.fn(),
  }),
  useUserStore: () => ({ setUserInfo: vi.fn() }),
}));

vi.mock('element-plus', () => ({ ElNotification: vi.fn() }));
vi.mock('#/locales', () => ({ $t: (key: string) => key }));

describe('auth store login', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    loginApi.mockReset();
  });

  it('sends only the required credential fields to the login API', async () => {
    loginApi.mockRejectedValue(new Error('login failed'));
    const authStore = useAuthStore();

    await expect(
      authStore.authLogin({
        captcha: true,
        captchaToken: 'captcha-token',
        password: 'secret',
        selectAccount: 'admin',
        track: [{ t: 0, x: 0, y: 0 }],
        username: 'admin',
      }),
    ).rejects.toThrow('login failed');

    expect(loginApi).toHaveBeenCalledWith({
      captchaToken: 'captcha-token',
      password: 'secret',
      username: 'admin',
    });
  });
});
