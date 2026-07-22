export type PendingAttachmentStatus = 'failed' | 'ready' | 'uploading';

export interface PendingChatAttachment {
  assetId?: number;
  error?: string;
  fileName: string;
  kind: 'file' | 'image';
  localPreviewUrl?: string;
  mimeType: string;
  size: number;
  status: PendingAttachmentStatus;
}

export interface ChatAttachmentView {
  assetId: number;
  byteSize?: number;
  fileName?: null | string;
  height?: null | number;
  kind: 'file' | 'image';
  mimeType?: string;
  status: 'active' | 'revoked';
  width?: null | number;
}

export function canSendWithAttachment(
  text: string,
  pending: null | PendingChatAttachment | undefined,
): boolean {
  const hasText = text.trim().length > 0;
  if (!pending) return hasText;
  if (pending.status === 'uploading' || pending.status === 'failed')
    return false;
  if (pending.status === 'ready' && pending.assetId) return true;
  return false;
}

export function buildSendPayload(input: {
  clientMsgId: string;
  content: string;
  pending?: null | PendingChatAttachment;
  sessionId: number;
}) {
  const content = input.content.trim();
  const assetIds =
    input.pending?.status === 'ready' && input.pending.assetId
      ? [input.pending.assetId]
      : undefined;
  const type = assetIds
    ? (input.pending?.kind === 'image'
      ? 'image'
      : 'file')
    : 'text';
  return {
    clientMsgId: input.clientMsgId,
    content,
    sessionId: input.sessionId,
    type,
    ...(assetIds ? { assetIds } : {}),
  };
}

export function normalizeMessageAttachments(raw: any): ChatAttachmentView[] {
  const list = raw?.attachments;
  if (!Array.isArray(list)) return [];
  return list.map((item) => ({
    assetId: Number(item.assetId ?? item.asset_id),
    kind: item.kind === 'image' ? 'image' : 'file',
    mimeType: item.mimeType ?? item.mime_type,
    byteSize: item.byteSize ?? item.byte_size,
    fileName: item.fileName ?? item.file_name ?? null,
    width: item.width ?? null,
    height: item.height ?? null,
    status: item.status === 'revoked' ? 'revoked' : 'active',
  }));
}
