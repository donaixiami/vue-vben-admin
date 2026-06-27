<script lang="ts" setup>
import type {
  OnActionClickParams,
  VxeTableGridOptions,
} from '#/adapter/vxe-table';
import type { SystemNotificationsApi } from '#/api';

import { onMounted } from 'vue';

import { Page, useVbenDrawer } from '@vben/common-ui';
import { Plus } from '@vben/icons';

import { ElButton, ElMessage, ElMessageBox } from 'element-plus';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  deleteNotifications,
  getNotificationsList,
  publishNotifications,
  revokeNotifications,
} from '#/api';
import { $t } from '#/locales';

import { useColumns, useGridFormSchema } from './data';
import Form from './modules/form.vue';
import { loadMessageTypeTagOptions } from './modules/message-type';
import { loadSendStateTagOptions } from './modules/send-state';

function isEmptyQueryValue(value: unknown) {
  return (
    value === undefined ||
    value === null ||
    value === '' ||
    (Array.isArray(value) && value.length === 0)
  );
}

function normalizeNotificationQueryParams(
  formValues: Record<string, unknown>,
): SystemNotificationsApi.QueryNotificationsParams {
  const { created_at, ...restValues } = formValues;
  const params = Object.fromEntries(
    Object.entries(restValues).filter(([, value]) => !isEmptyQueryValue(value)),
  ) as SystemNotificationsApi.QueryNotificationsParams;

  if (Array.isArray(created_at) && created_at.length === 2) {
    const [fromTime, toTime] = created_at;
    if (!isEmptyQueryValue(fromTime)) {
      params.from_time = String(fromTime);
    }
    if (!isEmptyQueryValue(toTime)) {
      params.to_time = String(toTime);
    }
  }

  return params;
}

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
          const params = normalizeNotificationQueryParams(formValues);
          const list = await getNotificationsList({
            page: page.currentPage,
            pageSize: page.pageSize,
            ...params,
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

onMounted(async () => {
  const [sendStateOptions, messageTypeOptions] = await Promise.all([
    loadSendStateTagOptions(),
    loadMessageTypeTagOptions(),
  ]);
  gridApi.setGridOptions({
    columns: useColumns(onActionClick, sendStateOptions, messageTypeOptions),
  });
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
    case 'send': {
      onSend(e.row);
      break;
    }
    case 'withdraw': {
      onWithdraw(e.row);
      break;
    }
  }
}

function confirm(content: string, title: string) {
  return ElMessageBox.confirm(content, title, {
    cancelButtonText: '取消',
    confirmButtonText: '确定',
    type: 'warning',
  });
}

async function onWithdraw(row: SystemNotificationsApi.SystemNotifications) {
  const title = row.title || row.message;
  try {
    await confirm(`确定撤回 ${title} 吗？`, '撤回确认');
  } catch {
    return;
  }

  const msg = ElMessage({
    duration: 0,
    message: `正在撤回 ${title} ...`,
  });

  revokeNotifications(row.id)
    .then(() => {
      ElMessage.success(`${title} 撤回成功`);
      onRefresh();
    })
    .finally(() => {
      msg.close();
    });
}

async function onSend(row: SystemNotificationsApi.SystemNotifications) {
  const title = row.title || row.message;
  try {
    await confirm(`确定发送 ${title} 吗？`, '发送确认');
  } catch {
    return;
  }

  const msg = ElMessage({
    duration: 0,
    message: `正在发送 ${title} ...`,
  });

  publishNotifications(row.id)
    .then(() => {
      ElMessage.success(`${title} 发送成功`);
      onRefresh();
    })
    .finally(() => {
      msg.close();
    });
}

function onEdit(row: SystemNotificationsApi.SystemNotifications) {
  formDrawerApi.setData(row).open();
}

function onDelete(row: SystemNotificationsApi.SystemNotifications) {
  const title = row.title || row.message;
  const msg = ElMessage({
    duration: 0,
    message: $t('ui.actionMessage.deleting', [title]),
  });

  deleteNotifications(row.id)
    .then(() => {
      ElMessage.success($t('ui.actionMessage.deleteSuccess', [title]));
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
