<script lang="ts" setup>
import type { StorageSourceApi } from '#/api/system/storage-source';

import { computed, nextTick, ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';

import { useVbenForm } from '#/adapter/form';
import {
  createStorageSource,
  getStorageSourceDrivers,
  startStorageSourceOAuth,
  updateStorageSource,
  updateStorageSourceRoutingPolicy,
} from '#/api/system/storage-source';

import { useFormSchema } from '../data';
import {
  buildStorageSourcePayload,
  getEditingStorageSource,
  storageSourceToFormValues,
} from './storage-source-form';

const emits = defineEmits(['success']);
const current = ref<StorageSourceApi.StorageSource>();
const drivers = ref<StorageSourceApi.DriverDescriptor[]>([]);

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
    const selectedDriver = drivers.value.find(
      (driver) => driver.type === payload.driver,
    );
    drawerApi.lock();
    if (!current.value && selectedDriver?.capabilities.supportsOAuth) {
      try {
        const { authorizationUrl } = await startStorageSourceOAuth(
          selectedDriver.type,
          {
            code: payload.code,
            name: payload.name,
            priority: payload.priority,
            enabled: payload.enabled,
            isFallback: payload.isFallback,
            allowedMimeGroups: payload.allowedMimeGroups,
            allowedBizTypes: payload.allowedBizTypes,
            config: payload.config,
          },
        );
        window.location.assign(authorizationUrl);
      } catch {
        drawerApi.unlock();
      }
      return;
    }
    const currentId = current.value?.id;
    const request = currentId
      ? updateStorageSource(currentId, {
          name: payload.name,
          config: payload.config,
        }).then(() =>
          updateStorageSourceRoutingPolicy(currentId, {
            priority: payload.priority,
            enabled: payload.enabled,
            isFallback: payload.isFallback,
            allowedMimeGroups: payload.allowedMimeGroups,
            allowedBizTypes: payload.allowedBizTypes,
          }),
        )
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
    drivers.value = await getStorageSourceDrivers();
    current.value = getEditingStorageSource(
      drawerApi.getData<Partial<StorageSourceApi.StorageSource>>(),
    );
    formApi.setState({
      schema: useFormSchema(Boolean(current.value?.id), drivers.value),
    });
    await formApi.resetForm();
    await nextTick();
    if (current.value) {
      await formApi.setValues(storageSourceToFormValues(current.value));
    }
  },
});

const title = computed(() => (current.value ? '编辑存储源' : '新增存储源'));
const confirmText = computed(() => (current.value ? '保存' : '继续'));
</script>

<template>
  <Drawer :title="title" :confirm-text="confirmText" class="w-[620px]">
    <Form />
  </Drawer>
</template>
