<script setup lang="ts">
import { watch } from 'vue';

const emits = defineEmits(['change']);

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
    <ATable :data-source="model || []" :columns="columns" size="small" />
  </div>
</template>
