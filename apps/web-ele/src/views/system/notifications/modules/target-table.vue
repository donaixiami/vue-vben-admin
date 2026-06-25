<script setup lang="ts">
import type { TargetListApi, TargetListItem, TargetType } from './target-list';

import type { SystemDictionaryApi } from '#/api/system/dictionary';

import { reactive, ref, watch } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';
import { Plus, X } from '@vben/icons';

import { ElButton } from 'element-plus';

import { getDeptList } from '#/api/system/dept';
import { getDictionaryByIdentifier } from '#/api/system/dictionary';
import { getRoleList } from '#/api/system/role';
import { getUserList } from '#/api/system/user';

import Drawer from './target-drawer.vue';
import {
  getTargetItemNumericId,
  loadTargetList,
  normalizeTargetIds,
  removeTargetId,
  shouldClearSelectedTargets,
} from './target-list';

const props = defineProps<{
  targetType?: string;
}>();

const model = defineModel<number[]>({
  default: [],
});
const selectedTargetIds = ref<number[]>([]);
const loading = ref(false);
const broadcastRange = ref<SystemDictionaryApi.DictionaryValueItem[]>([]);
const targetList = ref<TargetListItem[]>([]);
const targetListApi = reactive<Record<TargetType, TargetListApi>>({
  users: (params) => getUserList(params ?? {}),
  depts: () => getDeptList(),
  roles: (params) => getRoleList(params ?? {}),
});
const [TargetDrawer, targetDrawerApi] = useVbenDrawer({
  connectedComponent: Drawer,
  destroyOnClose: true,
});

let latestRequestId = 0;

watch(
  () => props.targetType,
  async (nextTargetType, previousTargetType) => {
    const requestId = ++latestRequestId;

    if (shouldClearSelectedTargets(nextTargetType, previousTargetType)) {
      model.value = [];
      selectedTargetIds.value = [];
    }

    loading.value = true;
    try {
      const [dictionary, list] = await Promise.all([
        getDictionaryByIdentifier('broadcast_range'),
        loadTargetList(nextTargetType, targetListApi),
      ]);

      if (requestId !== latestRequestId) {
        return;
      }

      broadcastRange.value = Array.isArray(dictionary?.value)
        ? dictionary.value
        : [];
      targetList.value = list;
    } finally {
      if (requestId === latestRequestId) {
        loading.value = false;
      }
    }
  },
  { immediate: true },
);

const onTargetSelectSuccess = (ids: number[]) => {
  model.value = normalizeTargetIds(ids);
};
const isTargetSelected = (target: TargetListItem) => {
  const targetId = getTargetItemNumericId(target);

  return targetId === undefined ? false : model.value.includes(targetId);
};
const removeSelectedTarget = (target: TargetListItem) => {
  const targetId = getTargetItemNumericId(target);

  if (targetId === undefined) {
    return;
  }

  model.value = removeTargetId(model.value, targetId);
  selectedTargetIds.value = removeTargetId(selectedTargetIds.value, targetId);
};
const addValue = () => {
  selectedTargetIds.value = normalizeTargetIds(model.value);
  targetDrawerApi
    .setData({
      broadcastRange: broadcastRange.value,
      targetList: targetList.value,
      targetType: props.targetType,
    })
    .open();
};
</script>
<template>
  <div class="w-full">
    <div
      class="p-2 border border-solid border-[hsl(var(--border))] rounded-[var(--radius)] min-h-[2rem] max-h-[20rem] flex items-center gap-2"
    >
      <template v-for="target in targetList">
        <div
          :key="target.id"
          v-if="isTargetSelected(target)"
          class="inline-flex max-w-full items-center gap-1 rounded-[var(--radius)] border border-[hsl(var(--border))] bg-[hsl(var(--accent))] px-2 py-1 text-xs text-white"
        >
          <span class="max-w-40 truncate">
            {{ target?.name ?? '' }}{{ target?.real_name ?? '' }}
          </span>
          <button
            type="button"
            class="inline-flex size-4 shrink-0 items-center justify-center rounded hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
            aria-label="删除目标"
            @click.stop="removeSelectedTarget(target)"
          >
            <X class="size-3" />
          </button>
        </div>
      </template>
      <ElButton
        type="primary"
        :disabled="!props.targetType || loading"
        :loading="loading"
        @click="addValue"
        size="small"
      >
        <Plus class="size-5" />
        添加目标
      </ElButton>
    </div>
    <TargetDrawer
      v-model="selectedTargetIds"
      @success="onTargetSelectSuccess"
    />
  </div>
</template>
