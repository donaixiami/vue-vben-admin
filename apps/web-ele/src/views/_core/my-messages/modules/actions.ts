import type { OnActionClickParams } from '#/adapter/vxe-table';
import type { SystemNotificationsApi } from '#/api/system/notifications';

import { ref } from 'vue';

import { ElMessage, ElMessageBox } from 'element-plus';

import {
  deleteNotificationInboxItem,
  markAllNotificationInboxRead,
  markNotificationInboxRead,
} from '#/api/system/notifications';

type RefreshMessages = () => Promise<unknown> | unknown;

function confirm(content: string, title: string) {
  return ElMessageBox.confirm(content, title, {
    cancelButtonText: '取消',
    confirmButtonText: '确定',
    type: 'warning',
  });
}

function useMessageActions() {
  const detailVisible = ref(false);
  const currentMessage =
    ref<null | SystemNotificationsApi.NotificationInboxItem>(null);
  let refreshMessages: RefreshMessages = () => {};

  function setRefreshMessages(refresh: RefreshMessages) {
    refreshMessages = refresh;
  }

  async function refresh() {
    await refreshMessages();
  }

  function onActionClick(
    e: OnActionClickParams<SystemNotificationsApi.NotificationInboxItem>,
  ) {
    switch (e.code) {
      case 'delete': {
        void onDelete(e.row);
        break;
      }
      case 'read': {
        void onMarkRead(e.row);
        break;
      }
      case 'view': {
        onView(e.row);
        break;
      }
    }
  }

  function onView(row: SystemNotificationsApi.NotificationInboxItem) {
    currentMessage.value = row;
    detailVisible.value = true;
  }

  async function onMarkRead(row: SystemNotificationsApi.NotificationInboxItem) {
    try {
      await confirm(
        `确定将 ${row.title || '该消息'} 标记为已读吗？`,
        '已读确认',
      );
    } catch {
      return;
    }

    await markNotificationInboxRead(row.id);
    ElMessage.success('标记已读成功');
    await refresh();
  }

  async function onDelete(row: SystemNotificationsApi.NotificationInboxItem) {
    await deleteNotificationInboxItem(row.id);
    ElMessage.success('删除消息成功');
    await refresh();
  }

  async function onMarkAllRead() {
    try {
      await confirm('确定将全部消息标记为已读吗？', '全部已读确认');
    } catch {
      return;
    }

    await markAllNotificationInboxRead();
    ElMessage.success('全部标记已读成功');
    await refresh();
  }

  return {
    currentMessage,
    detailVisible,
    onActionClick,
    onMarkAllRead,
    setRefreshMessages,
  };
}

export { useMessageActions };
