<script setup lang="ts">
import type { FormInstance, FormRules } from 'element-plus';

import type { JobFormModel } from './job-form';

import type { MonitorJobApi } from '#/api/monitor/job';

import { computed, reactive, ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';

import {
  ElForm,
  ElFormItem,
  ElInput,
  ElInputNumber,
  ElOption,
  ElRadioButton,
  ElRadioGroup,
  ElSelect,
  ElSwitch,
} from 'element-plus';

import { createJob, getJobHandlers, updateJob } from '#/api/monitor/job';

import { MISFIRE_OPTIONS } from '../data';
import CronEditor from './cron-editor.vue';
import { createDefaultModel, normalizeJobPayload } from './job-form';

const emit = defineEmits<{ success: [] }>();
const formRef = ref<FormInstance>();
const handlers = ref<MonitorJobApi.Handler[]>([]);
const id = ref<number>();
const model = reactive<JobFormModel>(createDefaultModel());
const selectedHandler = computed(() =>
  handlers.value.find((item) => item.key === model.handlerKey),
);

const rules: FormRules<JobFormModel> = {
  cronExpression: [{ required: true, message: '请输入 Cron 表达式' }],
  handlerKey: [{ required: true, message: '请选择调用目标' }],
  jobGroup: [
    { required: true, message: '请输入任务分组' },
    { pattern: /^[A-Za-z0-9_-]+$/, message: '任务分组格式不正确' },
  ],
  name: [{ required: true, message: '请输入任务名称' }],
};

function applyHandlerDefaults() {
  const handler = selectedHandler.value;
  if (!handler) return;
  model.parameters = Object.fromEntries(
    handler.parameterSchema
      .filter((item) => item.defaultValue !== undefined)
      .map((item) => [item.key, item.defaultValue]),
  );
  model.timeoutSeconds = handler.defaultTimeoutSeconds;
}

function assignJob(job?: MonitorJobApi.Job) {
  Object.assign(model, createDefaultModel());
  id.value = job?.id;
  if (!job) return;
  Object.assign(model, {
    concurrentPolicy: job.concurrent_policy,
    cronExpression: job.cron_expression,
    handlerKey: job.handler_key,
    jobGroup: job.job_group,
    maxRetryCount: job.max_retry_count,
    misfirePolicy: job.misfire_policy,
    name: job.name,
    parameters: { ...job.parameters_json },
    remark: job.remark,
    retryIntervalSeconds: job.retry_interval_seconds,
    status: job.status,
    timeoutSeconds: job.timeout_seconds,
  });
}

const [Drawer, drawerApi] = useVbenDrawer({
  class: 'w-[760px] max-w-full',
  async onConfirm() {
    await formRef.value?.validate();
    const handler = selectedHandler.value;
    if (!handler) return;
    drawerApi.lock();
    try {
      const payload = normalizeJobPayload(model, handler);
      await (id.value ? updateJob(id.value, payload) : createJob(payload));
      emit('success');
      drawerApi.close();
    } finally {
      drawerApi.unlock();
    }
  },
  async onOpenChange(open) {
    if (!open) return;
    handlers.value = await getJobHandlers();
    assignJob(drawerApi.getData<MonitorJobApi.Job>());
    if (!model.handlerKey && handlers.value[0]) {
      model.handlerKey = handlers.value[0].key;
      applyHandlerDefaults();
    }
  },
});

const title = computed(() => (id.value ? '编辑定时任务' : '新增定时任务'));
</script>

<template>
  <Drawer :title="title">
    <ElForm
      ref="formRef"
      :model="model"
      :rules="rules"
      label-position="top"
      class="grid grid-cols-1 gap-x-4 md:grid-cols-2"
    >
      <ElFormItem label="任务名称" prop="name">
        <ElInput v-model="model.name" maxlength="100" />
      </ElFormItem>
      <ElFormItem label="任务分组" prop="jobGroup">
        <ElInput v-model="model.jobGroup" maxlength="64" />
      </ElFormItem>
      <ElFormItem label="调用目标" prop="handlerKey" class="md:col-span-2">
        <ElSelect
          v-model="model.handlerKey"
          class="w-full"
          @change="applyHandlerDefaults"
        >
          <ElOption
            v-for="handler in handlers"
            :key="handler.key"
            :label="`${handler.name} (${handler.key})`"
            :value="handler.key"
          />
        </ElSelect>
        <div class="mt-1 text-xs text-muted-foreground">
          {{ selectedHandler?.description }}
        </div>
      </ElFormItem>
      <ElFormItem
        label="Cron 表达式"
        prop="cronExpression"
        class="md:col-span-2"
      >
        <CronEditor v-model="model.cronExpression" />
      </ElFormItem>
      <ElFormItem label="错过执行策略">
        <ElSelect v-model="model.misfirePolicy" class="w-full">
          <ElOption
            v-for="item in MISFIRE_OPTIONS"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </ElSelect>
      </ElFormItem>
      <ElFormItem label="并发策略">
        <ElRadioGroup v-model="model.concurrentPolicy">
          <ElRadioButton value="forbid">禁止并发</ElRadioButton>
          <ElRadioButton value="allow">允许并发</ElRadioButton>
        </ElRadioGroup>
      </ElFormItem>
      <ElFormItem
        v-for="schema in selectedHandler?.parameterSchema ?? []"
        :key="schema.key"
        :label="schema.label"
      >
        <ElInputNumber
          v-if="schema.type === 'number'"
          v-model="model.parameters[schema.key] as number"
          :min="schema.min"
          :max="schema.max"
          class="w-full"
        />
        <ElSwitch
          v-else-if="schema.type === 'boolean'"
          v-model="model.parameters[schema.key] as boolean"
        />
        <ElSelect
          v-else-if="schema.type === 'select'"
          v-model="model.parameters[schema.key] as string"
          class="w-full"
        >
          <ElOption
            v-for="option in schema.options"
            :key="option.value"
            :label="option.label"
            :value="option.value"
          />
        </ElSelect>
        <ElInput v-else v-model="model.parameters[schema.key] as string" />
      </ElFormItem>
      <ElFormItem label="超时秒数">
        <ElInputNumber
          v-model="model.timeoutSeconds"
          :min="1"
          :max="3600"
          class="w-full"
        />
      </ElFormItem>
      <ElFormItem label="失败重试次数">
        <ElInputNumber
          v-model="model.maxRetryCount"
          :min="0"
          :max="10"
          class="w-full"
        />
      </ElFormItem>
      <ElFormItem label="重试间隔（秒）">
        <ElInputNumber
          v-model="model.retryIntervalSeconds"
          :min="1"
          :max="3600"
          class="w-full"
        />
      </ElFormItem>
      <ElFormItem label="状态">
        <ElSwitch
          v-model="model.status"
          active-value="enabled"
          inactive-value="disabled"
        />
      </ElFormItem>
      <ElFormItem label="备注" class="md:col-span-2">
        <ElInput
          v-model="model.remark"
          type="textarea"
          :rows="3"
          maxlength="500"
        />
      </ElFormItem>
    </ElForm>
  </Drawer>
</template>
