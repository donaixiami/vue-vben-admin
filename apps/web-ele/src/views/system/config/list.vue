<script lang="ts" setup>
import type {
  OnActionClickParams,
  VxeTableGridOptions,
} from '#/adapter/vxe-table';
import type { SystemConfigApi } from '#/api';

import { Page, useVbenDrawer } from '@vben/common-ui';
import { Plus } from '@vben/icons';

import { ElButton, ElMessage } from 'element-plus';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  deleteSystemConfig,
  getSystemConfigById,
  getSystemConfigList,
} from '#/api';
import { $t } from '#/locales';

import { useColumns, useGridFormSchema } from './data';
import Form from './modules/form.vue';
import { normalizeSystemConfigQueryParams } from './modules/query';

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
    keepSource: true,
    proxyConfig: {
      ajax: {
        query: async ({ page }, formValues) => {
          const params = normalizeSystemConfigQueryParams(formValues);
          return await getSystemConfigList({
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
    showOverflow: false,
    toolbarConfig: {
      custom: true,
      export: false,
      refresh: true,
      search: true,
      zoom: true,
    },
  } as VxeTableGridOptions<SystemConfigApi.SystemConfig>,
});

function onActionClick(e: OnActionClickParams<SystemConfigApi.SystemConfig>) {
  switch (e.code) {
    case 'delete': {
      onDelete(e.row);
      break;
    }
    case 'edit': {
      onEdit(e.row);
      break;
    }
  }
}

async function onEdit(row: SystemConfigApi.SystemConfig) {
  const detail = await getSystemConfigById(row.id);
  formDrawerApi.setData(detail ?? row).open();
}

function onDelete(row: SystemConfigApi.SystemConfig) {
  const msg = ElMessage({
    duration: 0,
    message: $t('ui.actionMessage.deleting', [row.name]),
  });

  deleteSystemConfig(row.id)
    .then(() => {
      ElMessage.success($t('ui.actionMessage.deleteSuccess', [row.name]));
      onRefresh();
    })
    .finally(() => {
      msg.close();
    });
}

function onRefresh() {
  gridApi.query();
}

function onCreate() {
  formDrawerApi.setData({}).open();
}
</script>

<template>
  <Page auto-content-height>
    <FormDrawer @success="onRefresh" />
    <Grid table-title="参数列表">
      <template #toolbar-tools>
        <ElButton type="primary" @click="onCreate">
          <Plus class="size-5" />
          {{ $t('ui.actionTitle.create', ['参数']) }}
        </ElButton>
      </template>
    </Grid>
  </Page>
</template>
