<script lang="ts" setup>
import type {
  OnActionClickParams,
  VxeTableGridOptions,
} from '#/adapter/vxe-table';
import type { SystemFileApi } from '#/api';

import { Page, useVbenDrawer } from '@vben/common-ui';
import { Plus } from '@vben/icons';

import { ElButton } from 'element-plus';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { getFileList } from '#/api/system/file';
import { $t } from '#/locales';

import { useColumns } from './data';
import Form from './modules/form.vue';

const [FormDrawer, formDrawerApi] = useVbenDrawer({
  connectedComponent: Form,
  destroyOnClose: true,
});

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
          if (
            created_at &&
            Array.isArray(created_at) &&
            created_at.length === 2
          ) {
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
  // console.log('row:::', row);
  // const hideLoading = message.loading({
  //   content: $t('ui.actionMessage.deleting', [row.name]),
  //   duration: 0,
  //   key: 'action_process_msg',
  // });
  // deleteUser(row.id)
  //   .then(() => {
  //     message.success({
  //       content: $t('ui.actionMessage.deleteSuccess', [row.name]),
  //       key: 'action_process_msg',
  //     });
  //     onRefresh();
  //   })
  //   .catch(() => {
  //     hideLoading();
  //   });
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
    <Grid table-title="用户列表">
      <template #toolbar-tools>
        <ElButton type="primary" @click="onCreate">
          <Plus class="size-5" />
          {{ $t('ui.actionTitle.create', ['用户']) }}
        </ElButton>
      </template>
    </Grid>
  </Page>
</template>
