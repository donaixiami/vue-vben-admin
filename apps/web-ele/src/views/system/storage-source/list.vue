<script lang="ts" setup>
import type {
  OnActionClickParams,
  VxeTableGridOptions,
} from '#/adapter/vxe-table';
import type { StorageSourceApi } from '#/api/system/storage-source';

import { Page, useVbenDrawer } from '@vben/common-ui';
import { Plus } from '@vben/icons';

import { ElButton, ElMessage, ElMessageBox } from 'element-plus';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  checkAllStorageSources,
  checkStorageSource,
  deleteStorageSource,
  getStorageSourceList,
  setStorageSourceStatus,
} from '#/api/system/storage-source';

import { useColumns, useGridFormSchema } from './data';
import Form from './modules/form.vue';

const [FormDrawer, formDrawerApi] = useVbenDrawer({
  connectedComponent: Form,
  destroyOnClose: true,
});

const [Grid, gridApi] = useVbenVxeGrid({
  formOptions: {
    schema: useGridFormSchema(),
    submitOnChange: true,
  },
  gridOptions: {
    columns: useColumns(onActionClick),
    height: 'auto',
    proxyConfig: {
      ajax: {
        query: async (_params, formValues) => {
          const rows = await getStorageSourceList();
          const filtered = rows.filter((row) => {
            const name = String(formValues.name ?? '')
              .trim()
              .toLowerCase();
            const driver = String(formValues.driver ?? '');
            return (
              (!name ||
                row.name.toLowerCase().includes(name) ||
                row.code.toLowerCase().includes(name)) &&
              (!driver || row.driver === driver)
            );
          });
          return { items: filtered, total: filtered.length };
        },
      },
    },
    rowConfig: { keyField: 'id' },
    toolbarConfig: {
      custom: true,
      export: false,
      refresh: true,
      search: true,
      zoom: true,
    },
  } as VxeTableGridOptions<StorageSourceApi.StorageSource>,
});

function refresh() {
  gridApi.query();
}

function onCreate() {
  formDrawerApi.setData(undefined).open();
}

function onEdit(row: StorageSourceApi.StorageSource) {
  formDrawerApi.setData(row).open();
}

async function confirmAction(message: string, title: string) {
  await ElMessageBox.confirm(message, title, {
    cancelButtonText: '取消',
    confirmButtonText: '确定',
    type: 'warning',
  });
}

async function onActionClick(
  event: OnActionClickParams<StorageSourceApi.StorageSource>,
) {
  const { code, row } = event;
  if (code === 'edit') return onEdit(row);
  if (code === 'health-check') {
    await checkStorageSource(row.id);
    ElMessage.success(`${row.name} 健康检查完成`);
    return refresh();
  }
  if (code === 'enable') {
    await setStorageSourceStatus(row.id, true);
    ElMessage.success(`${row.name} 已启用`);
    return refresh();
  }
  if (code === 'disable') {
    await confirmAction(`确定禁用 ${row.name} 吗？`, '禁用确认');
    await setStorageSourceStatus(row.id, false);
    ElMessage.success(`${row.name} 已禁用`);
    return refresh();
  }
  if (code === 'delete') {
    await confirmAction(`确定删除 ${row.name} 吗？`, '删除确认');
    await deleteStorageSource(row.id);
    ElMessage.success(`${row.name} 已删除`);
    refresh();
  }
}

async function onCheckAll() {
  await checkAllStorageSources();
  ElMessage.success('全部存储源健康检查完成');
  refresh();
}
</script>

<template>
  <Page auto-content-height>
    <FormDrawer @success="refresh" />
    <Grid table-title="存储源管理">
      <template #toolbar-tools>
        <ElButton @click="onCheckAll">全部健康检查</ElButton>
        <ElButton type="primary" @click="onCreate">
          <Plus class="size-5" />
          新增存储源
        </ElButton>
      </template>
    </Grid>
  </Page>
</template>
