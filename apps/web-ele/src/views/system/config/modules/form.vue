<script lang="ts" setup>
import type { SystemConfigApi } from '#/api';

import { computed, nextTick, ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';

import { useVbenForm } from '#/adapter/form';
import { createSystemConfig, updateSystemConfig } from '#/api';

import { useFormSchema } from '../data';

const emits = defineEmits(['success']);

const formData = ref<SystemConfigApi.SystemConfig>();
const id = ref<SystemConfigApi.ConfigId>();

const [Form, formApi] = useVbenForm({
  schema: useFormSchema(formData),
  showDefaultActions: false,
});

function normalizeNullableText(value: null | string | undefined) {
  if (value === undefined || value === null) return null;
  return value.trim() === '' ? null : value;
}

function normalizeSubmitValues(
  values: SystemConfigApi.UpdateConfigParams,
): SystemConfigApi.CreateConfigParams {
  return {
    config_key: values.config_key?.trim() ?? '',
    config_value: normalizeNullableText(values.config_value),
    is_system: values.is_system ?? false,
    name: values.name?.trim() ?? '',
    remark: normalizeNullableText(values.remark),
  };
}

const [Drawer, drawerApi] = useVbenDrawer({
  class: 'w-[720px]',
  async onConfirm() {
    const { valid } = await formApi.validate();
    if (!valid) return;

    const values =
      await formApi.getValues<SystemConfigApi.UpdateConfigParams>();
    const payload = normalizeSubmitValues(values);

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
      formApi.setValues({
        ...data,
        is_system: data?.is_system ?? false,
      });
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
