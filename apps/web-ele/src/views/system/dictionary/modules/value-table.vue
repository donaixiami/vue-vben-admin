<script setup lang="ts">
import { Plus } from '@vben/icons';

import { ElButton } from 'element-plus';

import { useVbenVxeGrid } from '#/adapter/vxe-table';

import { useValueTableColumns } from '../data';

const model = defineModel<{ id: number; label: string; value: string }[]>({ default: [] });

const [Grid] = useVbenVxeGrid({
  gridOptions: {
    editRules: {
      label: [{ required: true, message: '必须填写' }],
      value: [{ required: true, message: '必须填写' }],
    },
    keepSource: true,
    columns: useValueTableColumns(),
    // 全局编辑配置
    editConfig: {
      trigger: 'click',
      mode: 'cell',
      showStatus: true,
    },
    rowConfig: {
      keyField: 'id',
      drag: true,
    },
    pagerConfig: {
      enabled: false,
    },
  },
});

const addValue = () => {
  model.value = [
    ...model.value,
    {
      id: Date.now(),
      label: '',
      value: '',
    },
  ];
};
</script>
<template>
  <div class="w-full">
    {{ model }}
    <Grid show-overflow :table-data="model">
      <template #toolbar-tools>
        <ElButton type="primary" @click="addValue">
          <Plus class="size-5" />
          添加键值
        </ElButton>
      </template>
    </Grid>
  </div>
</template>
