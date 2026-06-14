<script setup lang="ts">
import { watch } from 'vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';

import { useColumns } from './value-table-data';

const emits = defineEmits(['change']);

const [Grid, gridApi] = useVbenVxeGrid({
  gridOptions: {
    columns: useColumns(),
    rowConfig: {
      keyField: 'id',
      drag: true,
    },
    pagerConfig: {
      enabled: false,
    },
  },
});

const model = defineModel();

watch(
  () => model.value,
  () => {
    emits('change');
  },
);

const columns = [
  {
    title: '键',
    dataIndex: 'value',
    key: 'value',
  },
  {
    title: '值',
    dataIndex: 'label',
    key: 'label',
  },
];
</script>
<template>
  <div class="w-full">
    <Grid />
  </div>
</template>
