<script lang="ts" setup>
import type { SystemNotificationsApi } from '#/api/system/notifications';

import { computed, nextTick, ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';

import { useVbenForm } from '#/adapter/form';
import { createNotifications, updateNotifications } from '#/api/system/notifications';
import { $t } from '#/locales';

import { useFormSchema } from '../data';

const emits = defineEmits(['success']);

const formData = ref<SystemNotificationsApi.SystemNotifications>();

const [Form, formApi] = useVbenForm({
  schema: useFormSchema(),
  showDefaultActions: false,
  commonConfig: {
    labelWidth: 130,
    labelClass: 'items-start leading-[32px]',
    formItemClass: 'items-start',
  },
});

const id = ref();
const [Drawer, drawerApi] = useVbenDrawer({
  async onConfirm() {
    const { valid } = await formApi.validate();
    if (!valid) return;
    const values = await formApi.getValues<SystemNotificationsApi.CreateNotificationsParams>();
    drawerApi.lock();
    (id.value ? updateNotifications(id.value, values) : createNotifications(values))
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
      const data = drawerApi.getData<SystemNotificationsApi.SystemNotifications>();
      formApi.resetForm();

      if (data) {
        formData.value = data;
        id.value = data.id;
      } else {
        formData.value = undefined;
        id.value = undefined;
      }

      await nextTick();
      if (data) {
        formApi.setValues(data);
      } else {
        await formApi.setValues({
          send_now: false,
          type: 'system',
        });
      }
    }
  },
});

const getDrawerTitle = computed(() => {
  return formData.value?.id ? $t('common.edit', '娑堟伅') : $t('common.create', '娑堟伅');
});
</script>
<template>
  <Drawer :title="getDrawerTitle">
    <Form />
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
