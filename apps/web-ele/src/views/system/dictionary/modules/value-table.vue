<script setup lang="ts">
import { Plus } from '@vben/icons';

import { ElButton } from 'element-plus';

import { useVbenVxeGrid } from '#/adapter/vxe-table';

import { useValueTableColumns } from '../data';

const model = defineModel<{ id: number; label: string; value: string }[]>({ default: [] });

const [Grid, gridApi] = useVbenVxeGrid({
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

// 暴露验证方法
defineExpose({
  async validate() {
    // 先尝试 VxeTable 的 fullValidate(true) 强制验证所有行
    const errors = await gridApi.grid.fullValidate(true);

    if (errors && errors.length > 0) {
      return errors;
    }

    // 如果 VxeTable 验证不生效，手动验证数据作为备用方案
    const { fullData } = gridApi.grid.getTableData();
    const manualErrors: any[] = [];

    fullData.forEach((row: any, rowIndex: number) => {
      if (!row.label || !row.label.trim()) {
        manualErrors.push({
          row,
          column: { field: 'label', title: '值' },
          rule: { required: true, message: '请输入值' },
          rowIndex,
        });
      }
      if (!row.value || !row.value.trim()) {
        manualErrors.push({
          row,
          column: { field: 'value', title: '键' },
          rule: { required: true, message: '请输入键' },
          rowIndex,
        });
      }
    });

    return manualErrors.length > 0 ? manualErrors : undefined;
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
