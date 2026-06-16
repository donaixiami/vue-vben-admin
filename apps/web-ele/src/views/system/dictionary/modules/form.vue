<script lang="ts" setup>
import type { SystemDictionaryApi } from '#/api';

import { computed, nextTick, ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';

import { ElMessage } from 'element-plus';

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
    // 步骤1: 验证表单
    const { valid } = await formApi.validate();
    if (!valid) return;

    // 步骤2: 验证表格 - 通过 formApi.getFieldComponentRef 获取组件实例
    const valueTableRef = formApi.getFieldComponentRef('valueList') as any;

    if (valueTableRef?.validate) {
      const tableErrors = await valueTableRef.validate();
      // VxeTable 的 fullValidate 在有错误时返回错误数组,无错误时可能返回 undefined 或空数组
      if (tableErrors && tableErrors.length > 0) {
        ElMessage.error('请完整填写表格中的键值对');
        return;
      }
    }

    // 步骤3: 额外的数据完整性检查（备用验证）
    const values = await formApi.getValues<SystemDictionaryApi.SystemDictionary>();
    if (Array.isArray(values.valueList) && values.valueList.length > 0) {
      const hasEmptyValue = values.valueList.some(
        (item) => !item.label?.trim() || !item.value?.trim(),
      );
      if (hasEmptyValue) {
        ElMessage.error('请完整填写所有键值对');
        return;
      }
    }

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
