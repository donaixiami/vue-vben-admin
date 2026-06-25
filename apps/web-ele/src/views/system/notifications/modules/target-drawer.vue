<script lang="ts" setup>
import type { TargetListItem, TargetType } from './target-list';

import type { SystemDictionaryApi } from '#/api/system/dictionary';
import type { SystemNotificationsApi } from '#/api/system/notifications';

import { computed, ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';

// import { ElButton } from 'element-plus';
import { $t } from '#/locales';

import { getTargetItemNumericId } from './target-list';

type TargetValueRow = { id: number; label: string; value: number };

const emits = defineEmits<{
  success: [rows: number[]];
}>();
const formData = ref<SystemNotificationsApi.SystemNotifications>();
const loading = ref(false);
const broadcastRange = ref<SystemDictionaryApi.DictionaryValueItem[]>([]);

const targetType = ref<'' | TargetType>('');
const targetList = ref<TargetListItem[]>([]);

const model = defineModel<number[]>({
  default: [],
});

const getTargetItemLabel = (item: TargetListItem) =>
  item.real_name || item.name || item.username || item.id;
const isSelected = (item: TargetListItem) => {
  const itemId = getTargetItemNumericId(item);

  return itemId === undefined ? false : model.value.includes(itemId);
};
const selectedRows = computed<TargetValueRow[]>(() =>
  targetList.value
    .filter((item) => isSelected(item))
    .map((item) => {
      const id = getTargetItemNumericId(item) as number;

      return {
        id,
        label: String(getTargetItemLabel(item)),
        value: id,
      };
    }),
);
const onSelect = (item: TargetListItem) => {
  const itemId = getTargetItemNumericId(item);

  if (itemId === undefined) {
    return;
  }

  model.value = isSelected(item)
    ? model.value.filter((selectedId) => selectedId !== itemId)
    : [...model.value, itemId];
};
const [Drawer, drawerApi] = useVbenDrawer({
  class: 'w-[800px]',
  async onConfirm() {
    emits(
      'success',
      selectedRows.value.map((item) => item.id),
    );
    drawerApi.close();
  },

  async onOpenChange(isOpen) {
    if (isOpen) {
      const data = drawerApi.getData<{
        broadcastRange?: SystemDictionaryApi.DictionaryValueItem[];
        targetList?: TargetListItem[];
        targetType?: string;
      }>();
      const nextTargetType = data?.targetType;

      targetType.value =
        nextTargetType === 'users' ||
        nextTargetType === 'depts' ||
        nextTargetType === 'roles'
          ? nextTargetType
          : '';
      broadcastRange.value = Array.isArray(data?.broadcastRange)
        ? data.broadcastRange
        : [];
      targetList.value = Array.isArray(data?.targetList) ? data.targetList : [];
    }
  },
});

const getDrawerTitle = computed(() => {
  return formData.value?.id
    ? $t('common.edit', '娑堟伅')
    : $t('common.create', '娑堟伅');
});
</script>
<template>
  <Drawer :title="getDrawerTitle">
    <div v-loading="loading" class="w-full h-full flex flex-col gap-2">
      <template v-for="item in broadcastRange">
        <div
          :key="item.value"
          v-if="item.value === targetType"
          class="w-full flex items-center justify-center p-2 border border-solid border-[hsl(var(--border))] rounded-[var(--radius)]"
        >
          {{ item.label }}
        </div>
      </template>
      <div
        class="flex-1 overflow-auto border border-solid border-[hsl(var(--border))] rounded-[var(--radius)] p-2 grid grid-cols-2 gap-2 content-start"
      >
        <div
          v-for="item in targetList"
          :key="item.id"
          class="p-2 border border-solid border-[hsl(var(--border))] rounded-[var(--radius)] hover:border-[hsl(var(--primary))] hover:text-[hsl(var(--primary))] cursor-pointer transition-all duration-300"
          @click="onSelect(item)"
          :class="{
            'is-selected': isSelected(item),
          }"
        >
          {{ getTargetItemLabel(item) }}
        </div>
      </div>
      <!-- <div class="flex justify-between items-center mt-2">
        <ElButton type="primary">上一页</ElButton>
        <div></div>
        <ElButton type="primary">下一页</ElButton>
      </div> -->
    </div>
  </Drawer>
</template>
<style lang="css" scoped>
.is-selected {
  color: hsl(var(--primary));
  border-color: hsl(var(--primary));
}

:deep(.ant-tree-title) {
  .tree-actions {
    display: none;
    margin-left: 20px;
  }
}

:deep(.ant-tree-title:hover) {
  .tree-actions {
    display: flex;
    flex: auto;
    justify-content: flex-end;
    margin-left: 20px;
  }
}
</style>
