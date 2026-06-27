import type { OnActionClickFn, VxeTableGridOptions } from '#/adapter/vxe-table';
import type { SystemNotificationsApi } from '#/api/system/notifications';
import type { MessageTypeCellTagOption } from '#/views/system/notifications/modules/message-type';

import { getNotificationsInbox } from '#/api/system/notifications';

function useGridOptions(
  onActionClick: OnActionClickFn<SystemNotificationsApi.NotificationInboxItem>,
  messageTypeOptions: MessageTypeCellTagOption[] = [],
): VxeTableGridOptions<SystemNotificationsApi.NotificationInboxItem> {
  return {
    columns: [
      {
        field: 'title',
        minWidth: 180,
        title: '消息标题',
      },
      {
        cellRender: {
          name: 'CellTag',
          options: messageTypeOptions,
        },
        field: 'type',
        minWidth: 120,
        title: '消息类型',
      },
      {
        cellRender: {
          name: 'CellTag',
          options: [
            { label: '未读', type: 'warning', value: false },
            { label: '已读', type: 'success', value: true },
          ],
        },
        field: 'is_read',
        minWidth: 120,
        title: '阅读状态',
      },
      {
        field: 'delivered_at',
        minWidth: 180,
        title: '接收时间',
      },
      {
        align: 'center',
        cellRender: {
          attrs: {
            nameField: 'title',
            onClick: onActionClick,
          },
          name: 'CellOperation',
          options: [
            {
              code: 'view',
              contentText: '查看',
              link: true,
              type: 'primary',
            },
            {
              code: 'read',
              contentText: '设为已读',
              link: true,
              show: (row: SystemNotificationsApi.NotificationInboxItem) =>
                !row.is_read,
              type: 'success',
            },
            'delete',
          ],
        },
        field: 'operation',
        fixed: 'right',
        minWidth: 180,
        title: '操作',
      },
    ],
    height: 'auto',
    keepSource: true,
    proxyConfig: {
      ajax: {
        query: async ({ page }) =>
          getNotificationsInbox({
            page: page.currentPage,
            pageSize: page.pageSize,
          }),
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
      search: false,
      zoom: true,
    },
  };
}

export { useGridOptions };

export { loadMessageTypeTagOptions } from '#/views/system/notifications/modules/message-type';
