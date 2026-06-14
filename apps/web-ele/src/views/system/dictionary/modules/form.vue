<script lang="ts" setup>
import type { SystemDictionaryApi } from '#/api';

import { computed, nextTick, ref } from 'vue';

import { useVbenDrawer, useVbenModal } from '@vben/common-ui';

import { useVbenForm } from '#/adapter/form';
import { createDictionary, updateDictionary } from '#/api';
import { $t } from '#/locales';

import { useFormSchema } from '../data';
import DictionaryTableModal from './dictionary-table-modal.vue';

const emits = defineEmits(['success']);

const formData = ref<SystemDictionaryApi.SystemDictionary>();

const [ValueModal, valueModalApi] = useVbenModal({
  connectedComponent: DictionaryTableModal,
});

const [Form, formApi] = useVbenForm({
  schema: useFormSchema(formData, { modalApi: valueModalApi }),
  showDefaultActions: false,
});

const id = ref();
const [Drawer, drawerApi] = useVbenDrawer({
  class: 'w-[800px]',
  async onConfirm() {
    const { valid } = await formApi.validate();
    if (!valid) return;
    const values = await formApi.getValues<SystemDictionaryApi.SystemDictionary>();
    if (values.type !== 'text' && Array.isArray(values.valueList)) {
      values.value = JSON.stringify(values.valueList);
    }
    values.default_value =
      values.type === 'checkbox' && Array.isArray(values.default_value_list)
        ? JSON.stringify(values.default_value_list)
        : values.default_value_list;

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
        dataObject.default_value_list =
          dataObject.type === 'checkbox' && dataObject.default_value
            ? JSON.parse(dataObject.default_value as string)
            : dataObject.default_value;
        if (dataObject.type !== 'text' && dataObject.value) {
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

function valueModalSubmit(params: { label: string; value: string }[]) {
  formApi.setFieldValue('valueList', Object.values(params));
  formApi.setFieldValue('default_value', undefined);
}
</script>
<template>
  <Drawer :title="getDrawerTitle">
    <Form />
    <ValueModal @submit="valueModalSubmit" />
  </Drawer>
</template>
