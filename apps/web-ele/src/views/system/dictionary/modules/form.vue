<script lang="ts" setup>
import type { SystemDictionaryApi } from '#/api';

import { computed, nextTick, ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';

import { useVbenForm } from '#/adapter/form';
import { createDictionary, updateDictionary } from '#/api';
import { $t } from '#/locales';

import { useFormSchema } from '../data';

const emits = defineEmits(['success']);

const formData = ref<SystemDictionaryApi.SystemDictionary>();

const [Form, formApi] = useVbenForm({
  schema: useFormSchema(formData),
  showDefaultActions: false,
});

const id = ref();
const [Drawer, drawerApi] = useVbenDrawer({
  class: 'w-[800px]',
  async onConfirm() {
    const { valid } = await formApi.validate();
    if (!valid) return;
    const values = await formApi.getValues<SystemDictionaryApi.SystemDictionary>();
    if (Array.isArray(values.valueList)) {
      values.value = JSON.stringify(values.valueList);
    }

    drawerApi.lock();
    (id.value ? updateDictionary(id.value, values) : createDictionary(values))
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
      const data = drawerApi.getData<SystemDictionaryApi.SystemDictionary>();
      formApi.resetForm();

      formData.value = data;
      const dataObject = { ...data };
      if (dataObject) {
        id.value = dataObject.id;
        if (dataObject.value) {
          dataObject.valueList = JSON.parse(dataObject.value as string);
        }
      } else {
        id.value = undefined;
      }

      await nextTick();
      if (dataObject) {
        formApi.setValues(dataObject);
      }
    }
  },
});

const getDrawerTitle = computed(() => {
  return formData.value?.id ? $t('common.edit', '字典') : $t('common.create', '字典');
});
</script>
<template>
  <Drawer :title="getDrawerTitle">
    <Form />
  </Drawer>
</template>
