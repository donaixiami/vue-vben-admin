/** 从表单 Upload 字段提取一次性 uploadRef（仅本次新上传） */
export function pickAvatarUploadRef(
  avatars: Array<{ response?: { uploadRef?: string } }> | undefined,
): string | undefined {
  const uploadRef = avatars?.[0]?.response?.uploadRef;
  return typeof uploadRef === 'string' && uploadRef.length > 0
    ? uploadRef
    : undefined;
}

export function buildUserSubmitPayload(values: Record<string, any>) {
  const payload = { ...values };
  const uploadRef = pickAvatarUploadRef(payload.avatars);
  delete payload.avatars;
  delete payload.password;
  delete payload.avatar_file_id;
  delete payload.avatar;
  delete payload.avatarMediaRef;
  if (uploadRef) {
    payload.avatarUploadRef = uploadRef;
  } else {
    delete payload.avatarUploadRef;
  }
  return payload;
}

export function buildNotificationSubmitPayload(values: Record<string, any>) {
  const payload = { ...values };
  const uploadRef = pickAvatarUploadRef(payload.avatars);
  delete payload.avatars;
  delete payload.avatar_file_id;
  delete payload.avatar;
  delete payload.avatarMediaRef;
  if (uploadRef) {
    payload.avatarUploadRef = uploadRef;
  } else {
    delete payload.avatarUploadRef;
  }
  return payload;
}

export function formatByteSize(bytes: null | number | undefined): string {
  const n = Number(bytes);
  if (!Number.isFinite(n) || n < 0) return '—';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatImageSize(
  width: null | number | undefined,
  height: null | number | undefined,
): string {
  if (
    width === null ||
    width === undefined ||
    height === null ||
    height === undefined
  )
    return '—';
  return `${width}×${height}`;
}

export const SAFE_FILE_COLUMNS = [
  'id',
  'original_name',
  'mime_type',
  'byte_size',
  'is_image',
  'image_width',
  'image_height',
  'content_hash_prefix',
  'ref_count',
  'delete_status',
  'created_at',
] as const;
