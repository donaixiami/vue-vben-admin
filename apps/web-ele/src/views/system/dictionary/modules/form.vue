<script lang="ts" setup>
import type { Recordable } from '@vben/types';

import type { SystemDictionaryApi } from '#/api';

import { computed, nextTick, ref } from 'vue';

import { Tree, useVbenDrawer, useVbenModal } from '@vben/common-ui';
import { IconifyIcon } from '@vben/icons';

// import { Spin } from 'ant-design-vue';
import { useVbenForm } from '#/adapter/form';
import { createDictionary, updateDictionary } from '#/api';
import { getMenuList } from '#/api/system/menu';
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

const permissions = ref<any[]>([]);
const loadingPermissions = ref(false);

const id = ref();
const [Drawer, drawerApi] = useVbenDrawer({
  async onConfirm() {
    const { valid } = await formApi.validate();
    if (!valid) return;
    const values =
      await formApi.getValues<SystemDictionaryApi.SystemDictionary>();
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

      if (permissions.value.length === 0) {
        await loadPermissions();
      }
      await nextTick();
      if (dataObject) {
        formApi.setValues(dataObject);
      }
    }
  },
});

async function loadPermissions() {
  loadingPermissions.value = true;
  try {
    const res = await getMenuList();
    permissions.value = res as unknown as any[];
  } finally {
    loadingPermissions.value = false;
  }
}

const getDrawerTitle = computed(() => {
  return formData.value?.id
    ? $t('common.edit', '字典')
    : $t('common.create', '字典');
});

function getNodeClass(node: Recordable<any>) {
  const classes: string[] = [];
  if (node.value?.type === 'button') {
    classes.push('inline-flex');
  }

  return classes.join(' ');
}
function valueModalSubmit(params: { label: string; value: string }[]) {
  formApi.setFieldValue('valueList', Object.values(params));
  formApi.setFieldValue('default_value', undefined);
}
</script>
<template>
  <Drawer :title="getDrawerTitle">
    <Form>
      <template #permissions="slotProps">
        <Tree
          :tree-data="permissions"
          multiple
          bordered
          :default-expanded-level="2"
          :get-node-class="getNodeClass"
          v-bind="slotProps"
          value-field="id"
          label-field="meta.title"
          icon-field="meta.icon"
        >
          <template #node="{ value }">
            <IconifyIcon v-if="value.meta.icon" :icon="value.meta.icon" />
            {{ $t(value.meta.title) }}
          </template>
        </Tree>
      </template>
    </Form>
    <ValueModal @submit="valueModalSubmit" />
  </Drawer>
</template>
<style lang="css" scoped>
:deep(.ant-tree-title) {
  .tree-actions {
    display: none;
    margin-left: 20px;
  }
}

:deep(.ant-tree-title:hover) {
  .tree-actions {
    display: flex;
    flex: auto;
    justify-content: flex-end;
    margin-left: 20px;
  }
}
</style>
