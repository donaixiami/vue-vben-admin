<script lang="ts" setup>
import type { SystemConfigApi } from '#/api';

import { computed, nextTick, ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';

import { useVbenForm } from '#/adapter/form';
import { createSystemConfig, updateSystemConfig } from '#/api';

import { useFormSchema } from '../data';
import {
  hydrateSystemConfigForm,
  normalizeSystemConfigSubmitValues,
} from './value-editor';

const emits = defineEmits(['success']);

const formData = ref<SystemConfigApi.SystemConfig>();
const id = ref<SystemConfigApi.ConfigId>();

const [Form, formApi] = useVbenForm({
  schema: useFormSchema(formData),
  showDefaultActions: false,
});

const [Drawer, drawerApi] = useVbenDrawer({
  class: 'w-[720px]',
  async onConfirm() {
    const { valid } = await formApi.validate();
    if (!valid) return;

    const values = await formApi.getValues<
      Omit<SystemConfigApi.UpdateConfigParams, 'config_value'> & {
        config_value?: null | number | string;
      }
    >();
    const payload = normalizeSystemConfigSubmitValues(values);

    drawerApi.lock();
    (id.value
      ? updateSystemConfig(id.value, payload)
      : createSystemConfig(payload)
    )
      .then(() => {
        emits('success');
        drawerApi.close();
      })
      .catch(() => {
        drawerApi.unlock();
      });
  },

  async onOpenChange(isOpen) {
    if (isOpen) {
      const data = drawerApi.getData<SystemConfigApi.SystemConfig>();
      formApi.resetForm();
      id.value = data?.id;
      formData.value = data?.id ? data : undefined;

      await nextTick();
      await hydrateSystemConfigForm(
        formApi,
        useFormSchema(formData),
        data?.config_key,
        {
          ...data,
          is_system: data?.is_system ?? false,
        },
      );
    }
  },
});

const getDrawerTitle = computed(() => {
  return id.value ? '编辑参数' : '新增参数';
});
</script>

<template>
  <Drawer :title="getDrawerTitle">
    <Form />
  </Drawer>
</template>
