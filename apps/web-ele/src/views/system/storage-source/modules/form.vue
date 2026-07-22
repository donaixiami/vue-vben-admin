<script lang="ts" setup>
import type { StorageSourceApi } from '#/api/system/storage-source';

import { computed, nextTick, ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';

import { useVbenForm } from '#/adapter/form';
import {
  createStorageSource,
  updateStorageSource,
} from '#/api/system/storage-source';

import { useFormSchema } from '../data';
import {
  buildStorageSourcePayload,
  getEditingStorageSource,
  storageSourceToFormValues,
} from './storage-source-form';

const emits = defineEmits(['success']);
const current = ref<StorageSourceApi.StorageSource>();

const [Form, formApi] = useVbenForm({
  schema: useFormSchema(false),
  showDefaultActions: false,
});

const [Drawer, drawerApi] = useVbenDrawer({
  async onConfirm() {
    const { valid } = await formApi.validate();
    if (!valid) return;
    const payload = buildStorageSourcePayload(
      (await formApi.getValues()) as any,
    );
    drawerApi.lock();
    const request = current.value
      ? updateStorageSource(current.value.id, {
          name: payload.name,
          priority: payload.priority,
          enabled: payload.enabled,
          isFallback: payload.isFallback,
          config: payload.config,
        })
      : createStorageSource(payload);
    request
      .then(() => {
        emits('success');
        drawerApi.close();
      })
      .catch(() => drawerApi.unlock());
  },
  async onOpenChange(open) {
    if (!open) return;
    current.value = getEditingStorageSource(
      drawerApi.getData<Partial<StorageSourceApi.StorageSource>>(),
    );
    formApi.setState({ schema: useFormSchema(Boolean(current.value?.id)) });
    await formApi.resetForm();
    await nextTick();
    if (current.value) {
      await formApi.setValues(storageSourceToFormValues(current.value));
    }
  },
});

const title = computed(() => (current.value ? '编辑存储源' : '新增存储源'));
</script>

<template>
  <Drawer :title="title" class="w-[620px]">
    <Form />
  </Drawer>
</template>
