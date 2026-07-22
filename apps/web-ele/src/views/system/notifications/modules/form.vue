<script lang="ts" setup>
import type { SystemNotificationsApi } from '#/api/system/notifications';

import { computed, nextTick, onBeforeUnmount, ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';

import { useVbenForm } from '#/adapter/form';
import {
  createNotifications,
  updateNotifications,
} from '#/api/system/notifications';
import { $t } from '#/locales';
import {
  resolvePrivateBlobUrl,
  revokePrivateBlobUrl,
} from '#/utils/private-blob';
import { buildNotificationSubmitPayload } from '#/utils/private-upload-form';

import { useFormSchema } from '../data';
import { normalizePublishAtForSubmit } from './publish-at';

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
const previewBlobUrl = ref<null | string>(null);
function releasePreviewBlob() {
  revokePrivateBlobUrl(previewBlobUrl.value);
  previewBlobUrl.value = null;
}
onBeforeUnmount(() => releasePreviewBlob());
const [Drawer, drawerApi] = useVbenDrawer({
  class: 'w-[800px]',
  async onConfirm() {
    const { valid } = await formApi.validate();
    if (!valid) return;
    const values = buildNotificationSubmitPayload(
      normalizePublishAtForSubmit(
        await formApi.getValues<SystemNotificationsApi.CreateNotificationsParams>(),
      ),
    ) as SystemNotificationsApi.CreateNotificationsParams;

    drawerApi.lock();
    (id.value
      ? updateNotifications(id.value, values)
      : createNotifications(values)
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
    if (!isOpen) {
      releasePreviewBlob();
      return;
    }
    if (isOpen) {
      const data =
        drawerApi.getData<SystemNotificationsApi.SystemNotifications>();
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
      releasePreviewBlob();
      const mediaRef = (data as any)?.avatarMediaRef as string | undefined;
      if (mediaRef) {
        try {
          const url = await resolvePrivateBlobUrl(mediaRef);
          previewBlobUrl.value = url;
          formApi.setValues({
            avatars: [
              {
                name: 'icon.png',
                status: 'done',
                uid: '-1',
                url,
              },
            ],
          });
        } catch {
          // ignore preview failure
        }
      }
    }
  },
});

const getDrawerTitle = computed(() => {
  return formData.value?.id
    ? $t('common.edit', '娑堟伅')
    : $t('common.create', '娑堟伅');
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
