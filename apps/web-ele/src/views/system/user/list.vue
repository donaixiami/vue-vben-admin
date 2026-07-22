<script lang="ts" setup>
import type { Recordable } from '@vben/types';

import type {
  OnActionClickParams,
  VxeTableGridOptions,
} from '#/adapter/vxe-table';
import type { SystemUserApi } from '#/api/system/user';

import { onBeforeUnmount } from 'vue';

import { Page, useVbenDrawer } from '@vben/common-ui';
import { Plus } from '@vben/icons';

import { ElButton, ElMessage, ElMessageBox } from 'element-plus';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  deleteUser,
  getUserList,
  resetUserPassword,
  updateUserStatus,
} from '#/api/system/user';
import { $t } from '#/locales';

import { useColumns, useGridFormSchema } from './data';
import Form from './modules/form.vue';
import Tree from './modules/tree.vue';
import { hydrateUserAvatarRows } from './modules/user-avatar-list';

let avatarBlobUrls: string[] = [];

function releaseAvatarBlobUrls() {
  avatarBlobUrls.forEach((url) => URL.revokeObjectURL(url));
  avatarBlobUrls = [];
}

onBeforeUnmount(releaseAvatarBlobUrls);

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
    columns: useColumns(onActionClick, onStatusChange),
    height: 'auto',
    keepSource: true,
    showOverflow: false,
    proxyConfig: {
      autoLoad: false,
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
          releaseAvatarBlobUrls();
          const list = await getUserList({
            page: page.currentPage,
            pageSize: page.pageSize,
            ...formValues,
          });
          // 布局加载时不引入 Store/AppConfig；仅实际查询到头像票据后加载鉴权请求模块。
          const { resolvePrivateBlobUrl } =
            await import('#/utils/private-blob');
          const hydrated = await hydrateUserAvatarRows(
            list.items,
            resolvePrivateBlobUrl,
          );
          avatarBlobUrls = hydrated.blobUrls;
          return { ...list, items: hydrated.rows };
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
  } as VxeTableGridOptions<SystemUserApi.SystemUser>,
});
function onActionClick(e: OnActionClickParams<SystemUserApi.SystemUser>) {
  switch (e.code) {
    case 'delete': {
      onDelete(e.row);
      break;
    }
    case 'edit': {
      onEdit(e.row);
      break;
    }
    case 'reset-password': {
      onResetPassword(e.row);
      break;
    }
  }
}

/**

 * @param content 提示内容
 * @param title 提示标题
 */
function confirm(content: string, title: string) {
  return ElMessageBox.confirm(content, title, {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning',
  });
}

/**
 * 状态开关即将改变
 * @param newStatus 期望改变的状态值
 * @param row 行数据
 * @returns 返回false则中止改变，返回其他值（undefined、true）则允许改变
 */
async function onStatusChange(
  newStatus: number,
  row: SystemUserApi.SystemUser,
) {
  const status: Recordable<string> = {
    0: '禁用',
    1: '启用',
  };
  try {
    await confirm(
      `你要将${row.username}的状态切换为 【${status[newStatus.toString()]}】 吗？`,
      `切换状态`,
    );
    await updateUserStatus(row.id, { status: +newStatus as 0 | 1 });
    return true;
  } catch {
    return false;
  }
}

function onEdit(row: SystemUserApi.SystemUser) {
  formDrawerApi.setData(row).open();
}

function onDelete(row: SystemUserApi.SystemUser) {
  const msg = ElMessage({
    message: $t('ui.actionMessage.deleting', [row.name]),
    duration: 0, // 不自动关闭Primary
  });
  // msg.close();
  deleteUser(row.id)
    .then(() => {
      ElMessage.success($t('ui.actionMessage.deleteSuccess', [row.name]));
      onRefresh();
    })
    .finally(() => {
      msg.close();
    });
}

async function onResetPassword(row: SystemUserApi.SystemUser) {
  try {
    await confirm(
      `确定重置用户 ${row.username} 的密码吗？重置后将使用系统初始密码。`,
      '重置密码确认',
    );
  } catch {
    return;
  }

  const msg = ElMessage({
    duration: 0,
    message: `正在重置用户 ${row.username} 的密码...`,
  });

  resetUserPassword(row.id)
    .then(() => {
      ElMessage.success(`用户 ${row.username} 密码重置成功`);
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
    <div class="flex h-full flex-col gap-4 lg:flex-row">
      <div
        class="bg-sidebar dark:bg-sidebar w-full min-w-0 flex-none rounded-[var(--radius)] border-color border-[1px] lg:w-[280px]"
      >
        <Tree :grid-api="gridApi" />
      </div>
      <div class="min-w-0 flex-1">
        <Grid table-title="用户列表">
          <template #toolbar-tools>
            <ElButton type="primary" @click="onCreate">
              <Plus class="size-5" />
              {{ $t('ui.actionTitle.create', ['用户']) }}
            </ElButton>
          </template>
        </Grid>
      </div>
    </div>
  </Page>
</template>
