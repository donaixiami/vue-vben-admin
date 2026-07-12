<script setup lang="ts">
import type {
  OnActionClickParams,
  VxeTableGridOptions,
} from '#/adapter/vxe-table';
import type { MonitorJobApi } from '#/api/monitor/job';

import { Page, useVbenDrawer } from '@vben/common-ui';
import { Plus } from '@vben/icons';

import { ElButton, ElMessage, ElMessageBox } from 'element-plus';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  changeJobStatus,
  deleteJob,
  getJobList,
  runJobNow,
} from '#/api/monitor/job';

import { useColumns, useGridFormSchema } from './data';
import Form from './modules/form.vue';
import LogDrawerComponent from './modules/log-drawer.vue';

const [FormDrawer, formDrawerApi] = useVbenDrawer({
  connectedComponent: Form,
  destroyOnClose: true,
});
const [LogDrawer, logDrawerApi] = useVbenDrawer({
  connectedComponent: LogDrawerComponent,
  destroyOnClose: true,
});

const [Grid, gridApi] = useVbenVxeGrid({
  formOptions: { schema: useGridFormSchema(), submitOnChange: true },
  gridOptions: {
    columns: useColumns(onActionClick),
    height: 'auto',
    proxyConfig: {
      ajax: {
        query: ({ page }, values) =>
          getJobList({
            ...values,
            page: page.currentPage,
            pageSize: page.pageSize,
          }),
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
  } as VxeTableGridOptions<MonitorJobApi.Job>,
});

function refresh() {
  gridApi.query();
}

async function confirm(message: string, title: string) {
  await ElMessageBox.confirm(message, title, { type: 'warning' });
}

async function onActionClick(event: OnActionClickParams<MonitorJobApi.Job>) {
  const row = event.row;
  if (event.code === 'edit') formDrawerApi.setData(row).open();
  if (event.code === 'logs') logDrawerApi.setData(row).open();
  if (event.code === 'run') {
    await confirm(`确定立即执行任务“${row.name}”吗？`, '立即执行');
    const result = await runJobNow(row.id);
    ElMessage.success(`任务已开始，日志 ID：${result.logId}`);
    refresh();
  }
  if (event.code === 'status') {
    const status = row.status === 'enabled' ? 'disabled' : 'enabled';
    await confirm(
      `确定${status === 'enabled' ? '启用' : '停用'}任务“${row.name}”吗？`,
      '修改状态',
    );
    await changeJobStatus(row.id, status);
    ElMessage.success('状态修改成功');
    refresh();
  }
  if (event.code === 'delete') {
    await confirm(`确定删除任务“${row.name}”吗？`, '删除任务');
    await deleteJob(row.id);
    ElMessage.success('删除成功');
    refresh();
  }
}
</script>

<template>
  <Page auto-content-height>
    <FormDrawer @success="refresh" />
    <LogDrawer />
    <Grid table-title="定时任务列表">
      <template #toolbar-tools>
        <ElButton type="primary" @click="formDrawerApi.setData({}).open()">
          <Plus class="size-5" />
          新增任务
        </ElButton>
      </template>
    </Grid>
  </Page>
</template>
