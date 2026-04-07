<script lang="ts" setup>
import type {
  OnActionClickParams,
  VxeTableGridOptions,
} from '#/adapter/vxe-table';
import type { SystemNotificationsApi } from '#/api';

import { Page, useVbenDrawer } from '@vben/common-ui';
import { Plus } from '@vben/icons';

import { ElButton, ElMessage } from 'element-plus';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { getNotificationsList } from '#/api';
import { $t } from '#/locales';

import { useColumns, useGridFormSchema } from './data';
import Form from './modules/form.vue';

const [FormDrawer, formDrawerApi] = useVbenDrawer({
  connectedComponent: Form,
  destroyOnClose: true,
});

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
          const list = await getNotificationsList({
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
  } as VxeTableGridOptions<SystemNotificationsApi.SystemNotifications>,
});

function onActionClick(
  e: OnActionClickParams<SystemNotificationsApi.SystemNotifications>,
) {
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

function onEdit(row: SystemNotificationsApi.SystemNotifications) {
  formDrawerApi.setData(row).open();
}

function onDelete(row: SystemNotificationsApi.SystemNotifications) {
  // const loadingMsg = $t('ui.actionMessage.deleting', [row.name]);
  // const successMsg = $t('ui.actionMessage.deleteSuccess', [row.name]);
  // ElMessage.info(loadingMsg);
  // deleteRole(row.id)
  //   .then(() => {
  //     ElMessage.success(successMsg);
  //     onRefresh();
  //   })
  //   .catch(() => {
  //     ElMessage.error($t('ui.actionMessage.operationFailed', [row.name]));
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
    <Grid table-title="消息列表">
      <template #toolbar-tools>
        <ElButton type="primary" @click="onCreate">
          <Plus class="size-5" />
          {{ $t('ui.actionTitle.create', ['消息']) }}
        </ElButton>
      </template>
    </Grid>
  </Page>
</template>
