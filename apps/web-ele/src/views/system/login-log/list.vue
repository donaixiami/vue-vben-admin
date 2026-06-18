<script lang="ts" setup>
import type {
  OnActionClickParams,
  VxeTableGridOptions,
} from '#/adapter/vxe-table';
import type { SystemLoginLogApi } from '#/api/system/login-log';

import { Page } from '@vben/common-ui';

import { ElButton, ElMessage, ElMessageBox } from 'element-plus';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  clearLoginLog,
  deleteLoginLog,
  getLoginLogList,
} from '#/api/system/login-log';

import { useColumns, useGridFormSchema } from './data';

const [Grid, gridApi] = useVbenVxeGrid({
  formOptions: {
    fieldMappingTime: [['createTime', ['startTime', 'endTime']]],
    schema: useGridFormSchema(),
    submitOnChange: true,
  },
  gridOptions: {
    columns: useColumns(onActionClick),
    height: 'auto',
    keepSource: true,
    showOverflow: false,
    proxyConfig: {
      ajax: {
        query: async ({ page }, formValues) => {
          const params = { ...formValues };
          const { created_at } = params;
          if (
            created_at &&
            Array.isArray(created_at) &&
            created_at.length === 2
          ) {
            params.from_time = created_at[0];
            params.to_time = created_at[1];
          }
          delete params.created_at;
          return await getLoginLogList({
            page: page.currentPage,
            pageSize: page.pageSize,
            ...params,
          });
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
  } as VxeTableGridOptions<SystemLoginLogApi.SystemLoginLog>,
});

function onActionClick(
  e: OnActionClickParams<SystemLoginLogApi.SystemLoginLog>,
) {
  if (e.code === 'delete') {
    onDelete(e.row);
  }
}

function confirm(content: string, title: string) {
  return ElMessageBox.confirm(content, title, {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning',
  });
}

async function onDelete(row: SystemLoginLogApi.SystemLoginLog) {
  try {
    await confirm(
      `确定删除用户 ${row.username} 的这条登录日志吗？`,
      '删除登录日志',
    );
    await deleteLoginLog(row.id);
    ElMessage.success('删除登录日志成功');
    onRefresh();
  } catch {
    // user cancelled
  }
}

async function onClear() {
  try {
    await confirm('确定清空全部登录日志吗？该操作不可恢复。', '清空登录日志');
    await clearLoginLog();
    ElMessage.success('清空登录日志成功');
    onRefresh();
  } catch {
    // user cancelled
  }
}

function onRefresh() {
  gridApi.query();
}
</script>

<template>
  <Page auto-content-height>
    <Grid table-title="登录日志列表">
      <template #toolbar-tools>
        <ElButton type="danger" @click="onClear">清空日志</ElButton>
      </template>
    </Grid>
  </Page>
</template>
