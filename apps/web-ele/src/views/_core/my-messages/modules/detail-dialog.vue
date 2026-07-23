<script lang="ts" setup>
import type { SystemNotificationsApi } from '#/api/system/notifications';

import { onBeforeUnmount, ref, watch } from 'vue';

import { VbenTiptapPreview } from '@vben/plugins/tiptap';

import { ElDialog } from 'element-plus';

defineOptions({ name: 'MyMessagesDetailDialog' });

const props = defineProps<{
  message?: null | SystemNotificationsApi.NotificationInboxItem;
}>();

const open = defineModel<boolean>('open', {
  default: false,
});
const contentHtml = ref('');
let contentCleanup = () => {};

function clearContent() {
  contentCleanup();
  contentCleanup = () => {};
  contentHtml.value = '';
}

watch(
  [open, () => props.message],
  async ([isOpen, message]) => {
    clearContent();
    if (!isOpen || !message) return;
    const { hydratePrivateRichTextHtml } =
      await import('#/utils/private-rich-text');
    const hydrated = await hydratePrivateRichTextHtml(
      message.message,
      message.contentImages,
    );
    if (open.value && props.message === message) {
      contentHtml.value = hydrated.html;
      contentCleanup = hydrated.cleanup;
    } else {
      hydrated.cleanup();
    }
  },
  { immediate: true },
);
onBeforeUnmount(clearContent);
</script>

<template>
  <ElDialog v-model="open" title="消息详情" width="640px">
    <div v-if="message" class="space-y-4">
      <div>
        <div class="text-lg font-semibold">{{ message.title }}</div>
        <div class="mt-2 text-xs text-muted-foreground">
          {{ message.delivered_at || message.created_at }}
        </div>
      </div>
      <div
        class="max-h-[50vh] overflow-auto rounded-[var(--radius)] border border-border bg-muted/30 p-4"
      >
        <VbenTiptapPreview :content="contentHtml" :min-height="120" />
      </div>
    </div>
  </ElDialog>
</template>
