<script setup lang="ts">
import { computed } from 'vue';

import { ElAlert, ElInput, ElOption, ElSelect } from 'element-plus';

import { previewCronRuns, validateCronExpression } from './cron';

const modelValue = defineModel<string>({ default: '0 * * * * *' });

const presets = [
  { label: '每分钟', value: '0 * * * * *' },
  { label: '每小时', value: '0 0 * * * *' },
  { label: '每天 02:00', value: '0 0 2 * * *' },
  { label: '每周一 02:00', value: '0 0 2 * * 1' },
  { label: '每月 1 日 02:00', value: '0 0 2 1 * *' },
];

const validation = computed(() => validateCronExpression(modelValue.value));
const preview = computed(() => previewCronRuns(modelValue.value));
</script>

<template>
  <div class="w-full space-y-2">
    <div class="grid grid-cols-1 gap-2 sm:grid-cols-[150px_minmax(0,1fr)]">
      <ElSelect
        placeholder="常用周期"
        @change="(value: string) => (modelValue = value)"
      >
        <ElOption
          v-for="item in presets"
          :key="item.value"
          :label="item.label"
          :value="item.value"
        />
      </ElSelect>
      <ElInput v-model="modelValue" placeholder="请输入六段式 Cron 表达式" />
    </div>
    <ElAlert
      v-if="!validation.valid"
      :closable="false"
      :title="validation.message"
      type="error"
    />
    <div
      v-else
      class="rounded border border-border p-2 text-xs text-muted-foreground"
    >
      <div class="mb-1 font-medium">未来五次执行时间</div>
      <div v-for="item in preview" :key="item">{{ item }}</div>
    </div>
  </div>
</template>
