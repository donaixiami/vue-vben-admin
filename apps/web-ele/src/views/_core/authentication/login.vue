<script lang="ts" setup>
import type { VbenFormSchema } from '@vben/common-ui';
import type { BasicOption, Recordable } from '@vben/types';

import { computed, markRaw, ref } from 'vue';

import { AuthenticationLogin, z } from '@vben/common-ui';
import { $t } from '@vben/locales';

import { useAuthStore } from '#/store';

import ServerSliderCaptcha from './server-slider-captcha.vue';

defineOptions({ name: 'Login' });

const authStore = useAuthStore();
const captchaResetKey = ref(0);
const submitting = ref(false);

let submitPromise: Promise<void> | undefined;

const MOCK_USER_OPTIONS: BasicOption[] = [
  {
    label: 'Super',
    value: 'vben',
  },
  {
    label: 'Admin',
    value: 'admin',
  },
  {
    label: 'User',
    value: 'jack',
  },
];

const formSchema = computed((): VbenFormSchema[] => {
  return [
    // {
    //   component: 'VbenSelect',
    //   componentProps: {
    //     options: MOCK_USER_OPTIONS,
    //     placeholder: $t('authentication.selectAccount'),
    //   },
    //   fieldName: 'selectAccount',
    //   label: $t('authentication.selectAccount'),
    //   rules: z
    //     .string()
    //     .min(1, { message: $t('authentication.selectAccount') })
    //     .optional()
    //     .default('vben'),
    // },
    {
      component: 'VbenInput',
      componentProps: {
        placeholder: $t('authentication.usernameTip'),
      },
      dependencies: {
        trigger(values, form) {
          if (values.selectAccount) {
            const findUser = MOCK_USER_OPTIONS.find(
              (item) => item.value === values.selectAccount,
            );
            if (findUser) {
              form.setValues({
                password: '123456',
                username: findUser.value,
              });
            }
          }
        },
        triggerFields: ['selectAccount'],
      },
      fieldName: 'username',
      label: $t('authentication.username'),
      rules: z.string().min(1, { message: $t('authentication.usernameTip') }),
    },
    {
      component: 'VbenInputPassword',
      componentProps: {
        placeholder: $t('authentication.password'),
      },
      fieldName: 'password',
      label: $t('authentication.password'),
      rules: z.string().min(1, { message: $t('authentication.passwordTip') }),
    },
    {
      component: markRaw(ServerSliderCaptcha),
      componentProps: {
        disabled: authStore.loginLoading || submitting.value,
        resetKey: captchaResetKey.value,
      },
      fieldName: 'captchaToken',
      rules: z
        .string()
        .min(1, { message: $t('authentication.verifyRequiredTip') }),
    },
  ];
});

function handleSubmit(values: Recordable<any>) {
  if (submitPromise) return submitPromise;

  submitting.value = true;
  const current = authStore
    .authLogin(values as Parameters<typeof authStore.authLogin>[0])
    .then(() => undefined)
    .catch((error) => {
      captchaResetKey.value += 1;
      throw error;
    })
    .finally(() => {
      if (submitPromise !== current) return;
      submitting.value = false;
      submitPromise = undefined;
    });
  submitPromise = current;
  return current;
}
</script>

<template>
  <AuthenticationLogin
    :form-schema="formSchema"
    :loading="authStore.loginLoading"
    @submit="handleSubmit"
    :show-forget-password="false"
    :show-code-login="false"
    :show-qrcode-login="false"
    :show-third-party-login="false"
    :show-register="false"
  />
</template>
