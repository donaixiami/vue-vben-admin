<script lang="ts" setup>
import type {
  OnActionClickParams,
  VxeTableGridOptions,
} from '#/adapter/vxe-table';
import type { SystemMenuApi } from '#/api/system/menu';

import { Page, useVbenDrawer } from '@vben/common-ui';
import { IconifyIcon, Plus } from '@vben/icons';
import { $t } from '@vben/locales';

import { MenuBadge } from '@vben-core/menu-ui';

import { ElButton, ElMessage } from 'element-plus';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { deleteMenu, getMenuList, updateMenuOrder } from '#/api/system/menu';

import { enqueueMenuOrderSave, useColumns } from './data';
import Form from './modules/form.vue';
import { normalizeMenuOrder, persistMenuOrder } from './modules/menu-order';

interface MenuEditEvent {
  column: { field?: string };
  row: SystemMenuApi.SystemMenu;
}

const previousMenuOrders = new Map<string, unknown>();
const menuOrderSavePromises = new Map<string, Promise<void>>();

const [FormDrawer, formDrawerApi] = useVbenDrawer({
  connectedComponent: Form,
  destroyOnClose: true,
});

const [Grid, gridApi] = useVbenVxeGrid({
  gridOptions: {
    columns: useColumns(onActionClick),
    editConfig: {
      mode: 'cell',
      trigger: 'click',
    },
    height: 'auto',
    keepSource: true,
    pagerConfig: {
      enabled: false,
    },
    proxyConfig: {
      ajax: {
        query: async (_params) => {
          // 确保返回的数据格式为 vxe-table 所需的 { records: [] }
          const data = await getMenuList();
          // 如果接口直接返回数组，则包装成 items 字段
          return Array.isArray(data) ? { items: data } : data;
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
      zoom: true,
    },
    treeConfig: {
      parentField: 'pid',
      rowField: 'id',
      transform: false,
    },
  } as VxeTableGridOptions,
});

function onEditActivated({ column, row }: MenuEditEvent) {
  if (column.field === 'meta.order') {
    previousMenuOrders.set(row.id, row.meta?.order);
  }
}

async function onEditClosed({ column, row }: MenuEditEvent) {
  if (column.field !== 'meta.order' || !previousMenuOrders.has(row.id)) {
    return;
  }

  const previousOrder = previousMenuOrders.get(row.id);
  previousMenuOrders.delete(row.id);
  const submittedOrder = normalizeMenuOrder(row.meta?.order);

  const nextSave = enqueueMenuOrderSave(menuOrderSavePromises, row.id, () =>
    persistMenuOrder({
      previousOrder,
      refresh: () => gridApi.query(),
      row,
      submittedOrder,
      update: updateMenuOrder,
    }).then(() => undefined),
  );

  try {
    await nextSave;
  } catch {
    ElMessage.error('菜单排序更新失败');
  } finally {
    if (menuOrderSavePromises.get(row.id) === nextSave) {
      menuOrderSavePromises.delete(row.id);
    }
  }
}

function onActionClick({
  code,
  row,
}: OnActionClickParams<SystemMenuApi.SystemMenu>) {
  switch (code) {
    case 'append': {
      onAppend(row);
      break;
    }
    case 'delete': {
      onDelete(row);
      break;
    }
    case 'edit': {
      onEdit(row);
      break;
    }
    default: {
      break;
    }
  }
}

function onRefresh() {
  gridApi.query();
}
function onEdit(row: SystemMenuApi.SystemMenu) {
  formDrawerApi.setData(row).open();
}
function onCreate() {
  formDrawerApi.setData({}).open();
}
function onAppend(row: SystemMenuApi.SystemMenu) {
  formDrawerApi.setData({ pid: row.id }).open();
}

function onDelete(row: SystemMenuApi.SystemMenu) {
  const msg = ElMessage({
    message: $t('ui.actionMessage.deleting', [row.name]),
    duration: 0, // 不自动关闭Primary
  });
  // msg.close();
  deleteMenu(row.id)
    .then(() => {
      ElMessage.success($t('ui.actionMessage.deleteSuccess', [row.name]));
      onRefresh();
    })
    .catch(() => {
      // hideLoading();
      msg.close();
    });
}
</script>
<template>
  <Page auto-content-height>
    <FormDrawer @success="onRefresh" />
    <Grid @edit-activated="onEditActivated" @edit-closed="onEditClosed">
      <template #toolbar-tools>
        <ElButton type="primary" @click="onCreate">
          <Plus class="size-5" />
          {{ $t('ui.actionTitle.create', [$t('system.menu.name')]) }}
        </ElButton>
      </template>
      <template #title="{ row }">
        <div class="flex w-full items-center gap-1">
          <div class="size-5 flex-shrink-0">
            <IconifyIcon
              v-if="row.type === 'button'"
              icon="carbon:security"
              class="size-full"
            />
            <IconifyIcon
              v-else-if="row.meta?.icon"
              :icon="row.meta?.icon || 'carbon:circle-dash'"
              class="size-full"
            />
          </div>
          <span class="flex-auto">{{ $t(row.meta?.title) }}</span>
          <div class="items-center justify-end"></div>
        </div>
        <MenuBadge
          v-if="row.meta?.badgeType"
          class="menu-badge"
          :badge="row.meta.badge"
          :badge-type="row.meta.badgeType"
          :badge-variants="row.meta.badgeVariants"
        />
      </template>
    </Grid>
  </Page>
</template>
<style lang="scss" scoped>
.menu-badge {
  top: 50%;
  right: 0;
  transform: translateY(-50%);

  & > :deep(div) {
    padding-top: 0;
    padding-bottom: 0;
  }
}
</style>
