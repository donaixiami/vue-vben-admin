<script setup lang="ts">
import type { MonitorJobApi } from '#/api/monitor/job';

import { reactive, ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';

import {
  ElButton,
  ElMessage,
  ElMessageBox,
  ElOption,
  ElPagination,
  ElSelect,
  ElTable,
  ElTableColumn,
  ElTag,
} from 'element-plus';

import { clearJobLogs, deleteJobLog, getJobLogs } from '#/api/monitor/job';

import { RUN_STATUS_OPTIONS } from '../data';

const job = ref<MonitorJobApi.Job>();
const rows = ref<MonitorJobApi.JobLog[]>([]);
const total = ref(0);
const loading = ref(false);
const query = reactive({ page: 1, pageSize: 10, status: '', triggerType: '' });

async function load() {
  if (!job.value) return;
  loading.value = true;
  try {
    const result = await getJobLogs(job.value.id, query);
    rows.value = result.items;
    total.value = result.total;
  } finally {
    loading.value = false;
  }
}

async function remove(row: MonitorJobApi.JobLog) {
  await ElMessageBox.confirm('确定删除这条调度日志吗？', '删除日志', {
    type: 'warning',
  });
  await deleteJobLog(row.id);
  ElMessage.success('删除成功');
  await load();
}

async function clear() {
  if (!job.value) return;
  await ElMessageBox.confirm('确定清理当前任务的历史日志吗？', '清理日志', {
    type: 'warning',
  });
  await clearJobLogs({ ...query, taskId: job.value.id });
  ElMessage.success('清理成功');
  await load();
}

function statusType(
  status: MonitorJobApi.RunStatus,
): 'danger' | 'info' | 'primary' | 'success' | 'warning' {
  if (status === 'success') return 'success';
  if (status === 'failed') return 'danger';
  if (status === 'timeout') return 'warning';
  if (status === 'running') return 'primary';
  return 'info';
}

const [Drawer, drawerApi] = useVbenDrawer({
  class: 'w-[960px] max-w-full',
  showConfirmButton: false,
  async onOpenChange(open) {
    if (!open) return;
    job.value = drawerApi.getData<MonitorJobApi.Job>();
    query.page = 1;
    await load();
  },
});
</script>

<template>
  <Drawer :title="`${job?.name ?? ''} - 调度日志`">
    <div class="mb-3 flex flex-wrap gap-2">
      <ElSelect
        v-model="query.status"
        clearable
        placeholder="执行状态"
        class="w-36"
        @change="load"
      >
        <ElOption
          v-for="item in RUN_STATUS_OPTIONS"
          :key="item.value"
          :label="item.label"
          :value="item.value"
        />
      </ElSelect>
      <ElSelect
        v-model="query.triggerType"
        clearable
        placeholder="触发方式"
        class="w-36"
        @change="load"
      >
        <ElOption label="定时" value="schedule" />
        <ElOption label="手动" value="manual" />
        <ElOption label="重试" value="retry" />
      </ElSelect>
      <ElButton type="danger" plain @click="clear">清理日志</ElButton>
    </div>
    <div class="w-full overflow-x-auto">
      <ElTable v-loading="loading" :data="rows" min-width="900">
        <ElTableColumn prop="id" label="ID" width="70" />
        <ElTableColumn prop="trigger_type" label="触发方式" width="100" />
        <ElTableColumn label="状态" width="100">
          <template #default="{ row }">
            <ElTag :type="statusType(row.status)">{{ row.status }}</ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn prop="started_at" label="开始时间" width="180" />
        <ElTableColumn prop="finished_at" label="结束时间" width="180" />
        <ElTableColumn prop="duration_ms" label="耗时(ms)" width="110" />
        <ElTableColumn prop="retry_number" label="重试" width="80" />
        <ElTableColumn
          prop="error_message"
          label="错误摘要"
          min-width="220"
          show-overflow-tooltip
        />
        <ElTableColumn label="操作" fixed="right" width="90">
          <template #default="{ row }">
            <ElButton
              link
              type="danger"
              :disabled="row.status === 'running'"
              @click="remove(row)"
            >
              删除
            </ElButton>
          </template>
        </ElTableColumn>
      </ElTable>
    </div>
    <ElPagination
      v-model:current-page="query.page"
      v-model:page-size="query.pageSize"
      class="mt-3 justify-end"
      layout="total, prev, pager, next"
      :total="total"
      @current-change="load"
    />
  </Drawer>
</template>
