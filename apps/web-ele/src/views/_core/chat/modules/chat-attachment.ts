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

export interface ChatAttachmentBlobControllerOptions {
  onError?: (assetId: number, error: unknown) => void;
  onUrl: (assetId: number, url: string) => void;
  resolve: (
    assetId: number,
    options: { signal: AbortSignal },
    attachment: ChatAttachmentView,
  ) => Promise<string>;
  revoke: (url: string) => void;
}

export interface ChatAttachmentUploadRequest {
  generation: number;
  signal: AbortSignal;
}

/** 隔离连续选择附件产生的上传竞态，并回收失效请求已创建的服务端资产。 */
export function createChatAttachmentUploadController(options: {
  revoke: (assetId: number) => Promise<unknown> | unknown;
}) {
  let generation = 0;
  let requestController: AbortController | undefined;

  const isCurrent = (value: number) =>
    value === generation && !requestController?.signal.aborted;

  return {
    async accept(
      request: ChatAttachmentUploadRequest,
      assetId: number,
    ): Promise<boolean> {
      if (isCurrent(request.generation) && !request.signal.aborted) return true;
      try {
        await options.revoke(assetId);
      } catch {
        // 迟到资产仍不可回写；服务端过期清理负责兜底回收失败的撤销请求。
      }
      return false;
    },
    begin(): ChatAttachmentUploadRequest {
      requestController?.abort();
      requestController = new AbortController();
      generation += 1;
      return { generation, signal: requestController.signal };
    },
    invalidate(): void {
      requestController?.abort();
      requestController = undefined;
      generation += 1;
    },
    isCurrent,
  };
}

interface AttachmentBlobFlight {
  generation: number;
  promise: Promise<string>;
}

/**
 * 管理聊天附件 Blob URL 的页面级生命周期。
 *
 * 读取请求按 assetId 单飞；reset/dispose 会切换代次，迟到结果只释放不回写，
 * 避免历史消息替换后旧附件污染当前会话。
 */
export function createChatAttachmentBlobController(
  options: ChatAttachmentBlobControllerOptions,
) {
  let disposed = false;
  let generation = 0;
  let requestController = new AbortController();
  const flights = new Map<number, AttachmentBlobFlight>();
  const urls = new Map<number, string>();
  const releasedUrls = new Set<string>();

  const isAbortError = (error: unknown) =>
    error instanceof Error && error.name === 'AbortError';

  const revokeOnce = (url: string) => {
    if (releasedUrls.has(url)) return;
    releasedUrls.add(url);
    options.revoke(url);
  };

  const releaseAll = () => {
    const uniqueUrls = new Set(urls.values());
    urls.clear();
    uniqueUrls.forEach((url) => revokeOnce(url));
  };

  const releaseAsset = (assetId: number) => {
    const url = urls.get(assetId);
    if (!url) return;
    urls.delete(assetId);
    revokeOnce(url);
  };

  const reset = () => {
    requestController.abort();
    requestController = new AbortController();
    generation += 1;
    flights.clear();
    releaseAll();
  };

  const load = async (attachments: ChatAttachmentView[]) => {
    if (disposed) return;
    const loadGeneration = generation;
    const signal = requestController.signal;

    await Promise.all(
      attachments.map(async (attachment) => {
        const assetId = attachment.assetId;
        if (attachment.status === 'revoked') {
          releaseAsset(assetId);
          return;
        }
        if (urls.has(assetId)) return;

        let flight = flights.get(assetId);
        if (!flight || flight.generation !== loadGeneration) {
          let promise: Promise<string>;
          try {
            promise = options.resolve(assetId, { signal }, attachment);
          } catch (error) {
            promise = Promise.reject(error);
          }
          flight = { generation: loadGeneration, promise };
          flights.set(assetId, flight);
          void promise
            .finally(() => {
              if (flights.get(assetId)?.promise === promise) {
                flights.delete(assetId);
              }
            })
            .catch(() => undefined);
        }

        try {
          const url = await flight.promise;
          const stale =
            disposed || signal.aborted || generation !== loadGeneration;
          if (stale) {
            revokeOnce(url);
            return;
          }
          const current = urls.get(assetId);
          if (current) {
            if (current !== url) revokeOnce(url);
            return;
          }
          releasedUrls.delete(url);
          urls.set(assetId, url);
          options.onUrl(assetId, url);
        } catch (error) {
          if (
            !disposed &&
            !signal.aborted &&
            generation === loadGeneration &&
            !isAbortError(error)
          ) {
            options.onError?.(assetId, error);
          }
        }
      }),
    );
  };

  const dispose = () => {
    if (disposed) return;
    disposed = true;
    requestController.abort();
    generation += 1;
    flights.clear();
    releaseAll();
  };

  return {
    clear: reset,
    dispose,
    get signal() {
      return requestController.signal;
    },
    getUrl: (assetId: number) => urls.get(assetId),
    load,
    reset,
  };
}
