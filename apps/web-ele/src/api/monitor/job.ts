import type { Recordable } from '@vben/types';

import { requestClient } from '#/api/request';

export namespace MonitorJobApi {
  export type ConcurrentPolicy = 'allow' | 'forbid';
  export type JobStatus = 'disabled' | 'enabled';
  export type MisfirePolicy =
    | 'default'
    | 'do_nothing'
    | 'fire_once'
    | 'ignore_misfires';
  export type RunStatus =
    | 'failed'
    | 'running'
    | 'skipped'
    | 'success'
    | 'timeout';
  export type TriggerType = 'manual' | 'retry' | 'schedule';

  export interface ParameterOption {
    label: string;
    value: string;
  }

  export interface ParameterSchema {
    defaultValue?: boolean | number | string;
    key: string;
    label: string;
    max?: number;
    min?: number;
    options?: ParameterOption[];
    required?: boolean;
    sensitive?: boolean;
    type: 'boolean' | 'number' | 'select' | 'string';
  }

  export interface Handler {
    defaultTimeoutSeconds: number;
    description: string;
    key: string;
    name: string;
    parameterSchema: ParameterSchema[];
  }

  export interface Job {
    concurrent_policy: ConcurrentPolicy;
    created_at?: null | string;
    cron_expression: string;
    handler_key: string;
    id: number;
    job_group: string;
    last_run_at?: null | string;
    last_run_status?: null | RunStatus;
    max_retry_count: number;
    misfire_policy: MisfirePolicy;
    name: string;
    next_run_at?: null | string;
    parameters_json?: null | Record<string, unknown>;
    remark?: null | string;
    retry_interval_seconds: number;
    status: JobStatus;
    timeout_seconds: number;
    updated_at?: null | string;
  }

  export interface JobPayload {
    concurrentPolicy: ConcurrentPolicy;
    cronExpression: string;
    handlerKey: string;
    jobGroup: string;
    maxRetryCount: number;
    misfirePolicy: MisfirePolicy;
    name: string;
    parameters: Record<string, unknown>;
    remark?: null | string;
    retryIntervalSeconds: number;
    status: JobStatus;
    timeoutSeconds: number;
  }

  export interface JobLog {
    duration_ms?: null | number;
    error_message?: null | string;
    executor_instance?: null | string;
    finished_at?: null | string;
    handler_key: string;
    id: number;
    retry_number: number;
    started_at: string;
    status: RunStatus;
    task_name: string;
    trigger_type: TriggerType;
  }

  export interface ListResult<T> {
    items: T[];
    total: number;
  }
}

export function getJobList(params: Recordable<any>) {
  return requestClient.get<MonitorJobApi.ListResult<MonitorJobApi.Job>>(
    '/monitor/job/list',
    { params },
  );
}

export function getJobHandlers() {
  return requestClient.get<MonitorJobApi.Handler[]>('/monitor/job/handlers');
}

export function getJobDetail(id: number) {
  return requestClient.get<MonitorJobApi.Job>(`/monitor/job/${id}`);
}

export function createJob(data: MonitorJobApi.JobPayload) {
  return requestClient.post<MonitorJobApi.Job>('/monitor/job', data);
}

export function updateJob(id: number, data: Partial<MonitorJobApi.JobPayload>) {
  return requestClient.put<MonitorJobApi.Job>(`/monitor/job/${id}`, data);
}

export function changeJobStatus(id: number, status: MonitorJobApi.JobStatus) {
  return requestClient.put<MonitorJobApi.Job>(`/monitor/job/${id}/status`, {
    status,
  });
}

export function deleteJob(id: number) {
  return requestClient.delete(`/monitor/job/${id}`);
}

export function runJobNow(id: number) {
  return requestClient.post<{ logId: number }>(`/monitor/job/${id}/run`);
}

export function getJobLogs(id: number, params: Recordable<any>) {
  return requestClient.get<MonitorJobApi.ListResult<MonitorJobApi.JobLog>>(
    `/monitor/job/${id}/logs`,
    { params },
  );
}

export function deleteJobLog(id: number) {
  return requestClient.delete(`/monitor/job/log/${id}`);
}

export function clearJobLogs(params: Recordable<any>) {
  return requestClient.delete<{ deletedCount: number }>(
    '/monitor/job/log/clear',
    { params },
  );
}
