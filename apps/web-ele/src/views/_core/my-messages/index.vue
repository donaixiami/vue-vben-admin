<script lang="ts" setup>
import { onMounted } from 'vue';

import { Page } from '@vben/common-ui';

import { ElButton } from 'element-plus';

import { useVbenVxeGrid } from '#/adapter/vxe-table';

import { useMessageActions } from './modules/actions';
import { loadMessageTypeTagOptions, useGridOptions } from './modules/data';
import DetailDialog from './modules/detail-dialog.vue';

defineOptions({ name: 'MyMessages' });

const {
  currentMessage,
  detailVisible,
  onActionClick,
  onMarkAllRead,
  setRefreshMessages,
} = useMessageActions();
const [Grid, gridApi] = useVbenVxeGrid({
  gridOptions: useGridOptions(onActionClick),
});

onMounted(async () => {
  const messageTypeOptions = await loadMessageTypeTagOptions();
  gridApi.setGridOptions({
    columns: useGridOptions(onActionClick, messageTypeOptions).columns,
  });
});

setRefreshMessages(() => gridApi.query());
</script>

<template>
  <Page auto-content-height>
    <Grid table-title="我的消息">
      <template #toolbar-tools>
        <ElButton type="primary" @click="onMarkAllRead">
          全部设为已读
        </ElButton>
      </template>
    </Grid>
    <DetailDialog v-model:open="detailVisible" :message="currentMessage" />
  </Page>
</template>
