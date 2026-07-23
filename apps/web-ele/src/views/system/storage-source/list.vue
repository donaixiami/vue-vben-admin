<script lang="ts" setup>
import type { StorageSourcePermissionCode } from './modules/permissions';

import type {
  OnActionClickParams,
  VxeTableGridOptions,
} from '#/adapter/vxe-table';
import type { StorageSourceApi } from '#/api/system/storage-source';

import { onBeforeUnmount, onMounted, ref } from 'vue';

import { useAccess } from '@vben/access';
import { Page, useVbenDrawer } from '@vben/common-ui';
import { Plus } from '@vben/icons';

import { ElButton, ElMessage, ElMessageBox } from 'element-plus';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  checkAllStorageSources,
  checkStorageSource,
  deleteStorageSource,
  getStorageSourceDrivers,
  getStorageSourceList,
  getStorageSourceSummary,
  refreshStorageSourceQuota,
  runStorageSourceSpeedTest,
  setStorageSourceStatus,
} from '#/api/system/storage-source';

import { useColumns, useGridFormSchema } from './data';
import Form from './modules/form.vue';
import { STORAGE_SOURCE_PERMISSION_CODES } from './modules/permissions';
import { shouldPollStorageSources } from './modules/storage-source-actions';
import { formatStorageBytes } from './modules/storage-source-metrics';
import { groupStorageSources } from './modules/storage-source-routing';

const drivers = ref<StorageSourceApi.DriverDescriptor[]>([]);
const summary = ref<StorageSourceApi.Summary>();
const visibleRows = ref<StorageSourceApi.StorageSource[]>([]);
let statusPollingTimer: ReturnType<typeof setInterval> | undefined;

const { hasAccessByCodes } = useAccess();

function hasStoragePermission(code: StorageSourcePermissionCode) {
  return hasAccessByCodes([code]);
}

const [FormDrawer, formDrawerApi] = useVbenDrawer({
  connectedComponent: Form,
  destroyOnClose: true,
});

const [Grid, gridApi] = useVbenVxeGrid({
  formOptions: {
    schema: useGridFormSchema(() => drivers.value),
    submitOnChange: true,
  },
  gridOptions: {
    columns: useColumns(
      onActionClick,
      () => drivers.value,
      hasStoragePermission,
    ),
    height: 'auto',
    proxyConfig: {
      ajax: {
        query: async (_params, formValues) => {
          const rows = await getStorageSourceList({
            category: formValues.category || undefined,
            driver: formValues.driver || undefined,
            name: formValues.name || undefined,
            provisionStatus: formValues.provisionStatus || undefined,
          });
          // 保持分组顺序稳定，同时让 Vxe 继续负责滚动、列配置与操作渲染。
          visibleRows.value = groupStorageSources(rows, drivers.value).flatMap(
            (category) =>
              category.providers.flatMap((provider) => provider.sources),
          );
          syncStatusPolling(visibleRows.value);
          return { items: visibleRows.value, total: visibleRows.value.length };
        },
      },
    },
    rowConfig: { keyField: 'id' },
    showOverflow: false,
    toolbarConfig: {
      custom: true,
      export: false,
      refresh: true,
      search: true,
      zoom: true,
    },
  } as VxeTableGridOptions<StorageSourceApi.StorageSource>,
});

async function loadReferenceData() {
  [drivers.value, summary.value] = await Promise.all([
    getStorageSourceDrivers(),
    getStorageSourceSummary(),
  ]);
}

async function refresh() {
  await Promise.all([gridApi.query(), refreshSummary()]);
}

async function refreshSummary() {
  summary.value = await getStorageSourceSummary();
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
  if (code === 'quota-refresh') {
    await refreshStorageSourceQuota(row.id);
    ElMessage.success(`${row.name} 容量已更新`);
    return refresh();
  }
  if (code === 'speed-test') {
    await runStorageSourceSpeedTest(row.id);
    ElMessage.success(`${row.name} 已进入检测队列`);
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
    return refresh();
  }
}

async function onCheckAll() {
  await checkAllStorageSources();
  ElMessage.success('全部存储源健康检查完成');
  await refresh();
}

function startStatusPolling() {
  if (statusPollingTimer) return;
  statusPollingTimer = setInterval(() => void refresh(), 5000);
}

function stopStatusPolling() {
  if (!statusPollingTimer) return;
  clearInterval(statusPollingTimer);
  statusPollingTimer = undefined;
}

function syncStatusPolling(rows: StorageSourceApi.StorageSource[]) {
  if (shouldPollStorageSources(rows)) startStatusPolling();
  else stopStatusPolling();
}

onMounted(async () => {
  await loadReferenceData();
  await gridApi.query();
});

onBeforeUnmount(stopStatusPolling);
</script>

<template>
  <Page auto-content-height>
    <FormDrawer @success="refresh" />

    <div
      v-if="summary"
      class="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4"
    >
      <div class="rounded-md border bg-card p-4">
        <div class="text-muted-foreground text-xs">存储源总数</div>
        <div class="mt-2 text-xl font-semibold">{{ summary.accountCount }}</div>
      </div>
      <div class="rounded-md border bg-card p-4">
        <div class="text-muted-foreground text-xs">健康来源</div>
        <div class="mt-2 text-xl font-semibold">{{ summary.healthyCount }}</div>
      </div>
      <div class="rounded-md border bg-card p-4">
        <div class="text-muted-foreground text-xs">可用容量</div>
        <div class="mt-2 text-xl font-semibold">
          {{ formatStorageBytes(summary.freeBytes) }}
        </div>
      </div>
      <div class="rounded-md border bg-card p-4">
        <div class="text-muted-foreground text-xs">容量未知</div>
        <div class="mt-2 text-xl font-semibold">
          {{ summary.unknownQuotaCount }}
        </div>
      </div>
    </div>

    <Grid table-title="存储源管理">
      <template #toolbar-tools>
        <ElButton
          v-access:code="STORAGE_SOURCE_PERMISSION_CODES.healthCheck"
          @click="onCheckAll"
        >
          全部健康检查
        </ElButton>
        <ElButton
          v-access:code="STORAGE_SOURCE_PERMISSION_CODES.create"
          type="primary"
          @click="onCreate"
        >
          <Plus class="size-5" />
          新增存储源
        </ElButton>
      </template>
    </Grid>
  </Page>
</template>
