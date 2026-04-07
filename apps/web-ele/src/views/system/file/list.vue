<script lang="ts" setup>
import type { OnActionClickParams, VxeTableGridOptions } from '#/adapter/vxe-table';
import type { SystemFileApi } from '#/api/system/file';

import { Page, useVbenModal } from '@vben/common-ui';
import { Plus } from '@vben/icons';

import { ElButton, ElImage, ElMessage } from 'element-plus';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { deleteFile, getFileList } from '#/api/system/file';
// auto-height-modal
import AutoHeightModal from '#/components/modals/auto-height-modal.vue';
import { $t } from '#/locales';

import { useColumns } from './data';

const [Modal, modalApi] = useVbenModal({
  connectedComponent: AutoHeightModal,
  destroyOnClose: true,
});
function open() {
  modalApi.setData({ title: '我的标题', length: 5 }).open();
}
const [Grid, gridApi] = useVbenVxeGrid({
  gridOptions: {
    columns: useColumns(onActionClick),
    height: 'auto',
    keepSource: true,
    showOverflow: false,
    proxyConfig: {
      ajax: {
        query: async ({ page }, formValues) => {
          const { created_at } = formValues;
          const params = formValues;
          if (created_at && Array.isArray(created_at) && created_at.length === 2) {
            params.form_time = created_at[0];
            params.to_time = created_at[1];
          }
          const list = await getFileList({
            page: page.currentPage,
            pageSize: page.pageSize,
            ...formValues,
          });
          return list;
        },
      },
    },
    rowConfig: {
      keyField: 'id',
    },

    toolbarConfig: {
      custom: true,
      export: false,
      refresh: true,
      search: true,
      zoom: true,
    },
  } as VxeTableGridOptions<SystemFileApi.SystemFile>,
});

function onActionClick(e: OnActionClickParams<SystemFileApi.SystemFile>) {
  switch (e.code) {
    case 'delete': {
      onDelete(e.row);
      break;
    }
  }
}

function onDelete(row: SystemFileApi.SystemFile) {
  const msg = ElMessage({
    message: $t('ui.actionMessage.deleting', [row.name]),
    duration: 0,
  });
  msg.close();
  deleteFile(row.id)
    .then(() => {
      ElMessage.success($t('ui.actionMessage.deleteSuccess', [row.name]));
      onRefresh();
    })
    .catch(() => {
      msg.close();
    });
}

function onRefresh() {
  gridApi.query();
}

function onCreate() {
  open();
}
</script>
<template>
  <Page auto-content-height>
    <Modal @success="onRefresh" />
    <Grid table-title="文件列表">
      <template #toolbar-tools>
        <ElButton type="primary" @click="onCreate">
          <Plus class="size-5" />
          {{ $t('ui.actionTitle.create', ['文件']) }}
        </ElButton>
      </template>
      <template #image-url="{ row }">
        <ElImage
          :src="row?.file_url"
          fit="cover"
          v-if="row.file_type === 'image'"
          class="h-20 w-20"
          preview-teleported
          :preview-src-list="[row?.file_url]"
        />
        <div v-else class="flex items-center justify-center">
          <!-- 文字居中-->
          <div
            class="text-center text-3xl rounded-full bg-[#810E0E] text-white p-2 w-15 h-15 flex items-center justify-center font-bold align-middle"
          >
            {{ row?.file_extension?.charAt(0).toUpperCase() }}
          </div>
        </div>
      </template>
    </Grid>
  </Page>
</template>
