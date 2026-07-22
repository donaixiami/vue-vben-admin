<script lang="ts" setup>
import type {
  OnActionClickParams,
  VxeTableGridOptions,
} from '#/adapter/vxe-table';
import type { SystemFileApi } from '#/api/system/file';

import { onBeforeUnmount, ref } from 'vue';

import { Page } from '@vben/common-ui';

import { ElDialog, ElImage, ElMessage } from 'element-plus';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { deleteFile, getFileList } from '#/api/system/file';
import { $t } from '#/locales';

import { useColumns, useGridFormSchema } from './data';
import {
  loadFileImagePreview,
  releaseFileImagePreview,
} from './modules/file-image-preview';

const previewVisible = ref(false);
const previewName = ref('');
const previewUrl = ref('');

function releasePreview() {
  releaseFileImagePreview(previewUrl.value);
  previewUrl.value = '';
  previewName.value = '';
}

onBeforeUnmount(releasePreview);

const [Grid, gridApi] = useVbenVxeGrid({
  formOptions: {
    schema: useGridFormSchema(),
    submitOnChange: true,
  },
  gridOptions: {
    columns: useColumns(onActionClick),
    height: 'auto',
    keepSource: true,
    showOverflow: true,
    proxyConfig: {
      ajax: {
        query: async ({ page }, formValues) => {
          const { created_at, ...rest } = formValues as any;
          const params: Record<string, any> = {
            page: page.currentPage,
            pageSize: page.pageSize,
            ...rest,
          };
          if (
            created_at &&
            Array.isArray(created_at) &&
            created_at.length === 2
          ) {
            params.form_time = created_at[0];
            params.to_time = created_at[1];
          }
          return getFileList(params);
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
  if (e.code === 'view') {
    onView(e.row);
    return;
  }
  if (e.code === 'delete') {
    onDelete(e.row);
  }
}

async function onView(row: SystemFileApi.SystemFile) {
  releasePreview();
  const { resolvePrivateBlobUrl } = await import('#/utils/private-blob');
  const preview = await loadFileImagePreview(row, resolvePrivateBlobUrl);
  previewName.value = preview.name;
  previewUrl.value = preview.url;
  previewVisible.value = true;
}

function onDelete(row: SystemFileApi.SystemFile) {
  const name = row.original_name || String(row.id);
  deleteFile(row.id)
    .then(() => {
      ElMessage.success($t('ui.actionMessage.deleteSuccess', [name]));
      gridApi.query();
    })
    .catch(() => undefined);
}
</script>

<template>
  <Page auto-content-height>
    <Grid table-title="文件库存（安全元数据）" />
    <ElDialog
      v-model="previewVisible"
      :title="previewName"
      width="720px"
      @closed="releasePreview"
    >
      <ElImage
        v-if="previewUrl"
        class="mx-auto block max-h-[70vh] max-w-full"
        fit="contain"
        :preview-src-list="[previewUrl]"
        preview-teleported
        :src="previewUrl"
      />
    </ElDialog>
  </Page>
</template>
