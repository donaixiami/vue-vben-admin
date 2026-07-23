import type { StorageSourceApi } from '#/api/system/storage-source';

const BYTE_UNITS = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'] as const;

const MIME_GROUP_LABELS: Record<string, string> = {
  archive: '压缩包',
  audio: '音频',
  document: '文档',
  image: '图片',
  other: '其他',
  video: '视频',
};

const BIZ_TYPE_LABELS: Record<string, string> = {
  avatar: '用户头像',
  backup: '系统备份',
  chat: '聊天附件',
  notification: '通知图片',
};

function formatDecimal(value: number): string {
  return value >= 10 || Number.isInteger(value)
    ? value.toFixed(value >= 10 ? 0 : 1).replace(/\.0$/, '')
    : value.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
}

export function formatStorageBytes(value: null | string | undefined): string {
  if (value === null || value === undefined || value === '') return '未知';
  let bytes: bigint;
  try {
    bytes = BigInt(value);
  } catch {
    return '未知';
  }
  if (bytes < BigInt(0)) return '未知';
  let amount = Number(bytes);
  let unitIndex = 0;
  while (amount >= 1024 && unitIndex < BYTE_UNITS.length - 1) {
    amount /= 1024;
    unitIndex += 1;
  }
  return `${formatDecimal(amount)} ${BYTE_UNITS[unitIndex]}`;
}

export function formatStorageRate(value: null | string | undefined): string {
  const formatted = formatStorageBytes(value);
  return formatted === '未知' ? formatted : `${formatted}/s`;
}

export function getProvisionStatusMeta(
  status: StorageSourceApi.ProvisionStatus,
) {
  return (
    {
      cleanup_pending: { label: '待清理', type: 'danger' },
      failed: { label: '接入失败', type: 'danger' },
      pending_auth: { label: '待授权', type: 'warning' },
      ready: { label: '可用', type: 'success' },
      testing: { label: '检测中', type: 'primary' },
    } as const
  )[status];
}

export function getStorageSourceStatusMeta(
  source: Pick<
    StorageSourceApi.StorageSource,
    | 'cooldownUntil'
    | 'enabled'
    | 'provisionStatus'
    | 'quota'
    | 'routingEligible'
  >,
) {
  if (!source.enabled) return { label: '已禁用', type: 'info' } as const;
  if (source.provisionStatus !== 'ready') {
    return getProvisionStatusMeta(source.provisionStatus);
  }
  if (source.routingEligible) return getProvisionStatusMeta('ready');
  if (
    source.cooldownUntil &&
    new Date(source.cooldownUntil).getTime() > Date.now()
  ) {
    return { label: '冷却中', type: 'warning' } as const;
  }
  if (source.quota.freeBytes === null) {
    return { label: '容量未知', type: 'warning' } as const;
  }
  return { label: '容量不足', type: 'warning' } as const;
}

function labels(values: string[], dictionary: Record<string, string>) {
  return values.map((value) => dictionary[value] ?? value).join('、');
}

export function summarizeFileScope(
  mimeGroups: string[],
  bizTypes: string[],
): string {
  if (mimeGroups.length === 0 && bizTypes.length === 0) return '全部文件';
  const parts = [
    mimeGroups.length > 0 ? labels(mimeGroups, MIME_GROUP_LABELS) : '全部类型',
    bizTypes.length > 0 ? labels(bizTypes, BIZ_TYPE_LABELS) : '全部用途',
  ];
  return parts.join(' · ');
}

export function formatStorageDate(value: null | string | undefined): string {
  return value
    ? new Date(value).toLocaleString('zh-CN', { hour12: false })
    : '—';
}
