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
  createPrivateBlobRequestController,
  resolvePrivateBlobUrl,
  revokePrivateBlobUrl,
} from '#/utils/private-blob';
import { PRIVATE_MEDIA_VARIANTS } from '#/utils/private-media-variants';
import {
  hydratePrivateRichTextHtml,
  serializePrivateRichTextHtml,
} from '#/utils/private-rich-text';
import { buildNotificationSubmitPayload } from '#/utils/private-upload-form';

import { useFormSchema } from '../data';
import { createObjectUrlLifecycle } from './object-url-lifecycle';
import { normalizePublishAtForSubmit } from './publish-at';

const emits = defineEmits(['success']);

const formData = ref<SystemNotificationsApi.SystemNotifications>();
const id = ref();
const previewBlobUrl = ref<null | string>(null);
const previewController = createPrivateBlobRequestController();
const localPreviewLifecycle = createObjectUrlLifecycle();
let contentCleanup = () => {};
const contentBlobUrls = new Set<string>();

function releaseContentPreviews() {
  contentCleanup();
  contentCleanup = () => {};
  contentBlobUrls.forEach((url) => URL.revokeObjectURL(url));
  contentBlobUrls.clear();
}

function releasePreviewBlob() {
  previewController.invalidate();
  revokePrivateBlobUrl(previewBlobUrl.value);
  previewBlobUrl.value = null;
}

function releaseOwnedPreviews() {
  releasePreviewBlob();
  localPreviewLifecycle.clear();
  releaseContentPreviews();
}

const [Form, formApi] = useVbenForm({
  schema: useFormSchema({
    createPreviewUrl(file) {
      releasePreviewBlob();
      return localPreviewLifecycle.replace(file);
    },
    createContentPreviewUrl(file) {
      const url = URL.createObjectURL(file);
      contentBlobUrls.add(url);
      return url;
    },
    onRemove(uploadFile) {
      if (uploadFile?.url === localPreviewLifecycle.current()) {
        localPreviewLifecycle.clear();
      }
      if (uploadFile?.url === previewBlobUrl.value) {
        releasePreviewBlob();
      }
    },
  }),
  showDefaultActions: false,
  commonConfig: {
    labelWidth: 130,
    labelClass: 'items-start leading-[32px]',
    formItemClass: 'items-start',
  },
});
onBeforeUnmount(releaseOwnedPreviews);
const [Drawer, drawerApi] = useVbenDrawer({
  class: 'w-[800px]',
  async onConfirm() {
    const { valid } = await formApi.validate();
    if (!valid) return;
    const rawValues =
      await formApi.getValues<SystemNotificationsApi.CreateNotificationsParams>();
    const values = buildNotificationSubmitPayload(
      normalizePublishAtForSubmit({
        ...rawValues,
        message: serializePrivateRichTextHtml(rawValues.message),
      }),
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
      releaseOwnedPreviews();
      return;
    }
    if (isOpen) {
      const data =
        drawerApi.getData<SystemNotificationsApi.SystemNotifications>();
      releaseOwnedPreviews();
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
        const hydrated = await hydratePrivateRichTextHtml(
          data.message,
          data.contentImages,
        );
        contentCleanup = hydrated.cleanup;
        formApi.setValues({ ...data, message: hydrated.html });
      } else {
        await formApi.setValues({
          send_now: false,
          type: 'system',
        });
      }
      const request = previewController.begin();
      const mediaRef = (data as any)?.avatarMediaRef as string | undefined;
      if (mediaRef) {
        try {
          const url = await resolvePrivateBlobUrl(mediaRef, {
            ...PRIVATE_MEDIA_VARIANTS.notificationImage,
            signal: request.signal,
          });
          if (!previewController.isCurrent(request.generation)) {
            revokePrivateBlobUrl(url);
            return;
          }
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
          // 预览失败不阻塞其它字段编辑。
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
