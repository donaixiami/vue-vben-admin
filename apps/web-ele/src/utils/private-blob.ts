import { useAppConfig } from '@vben/hooks';
import { useAccessStore } from '@vben/stores';

interface PrivateBlobLoaderOptions {
  cacheTtlMs?: number;
  maxCacheBytes?: number;
  maxCacheEntries?: number;
  maxConcurrency?: number;
  /** 总尝试次数，包含第一次请求。 */
  maxRetryAttempts?: number;
  /** 单次请求（含响应体读取）的超时时间，0 表示不设超时。 */
  requestTimeoutMs?: number;
  retryBaseDelayMs?: number;
}

export interface ResolvePrivateBlobOptions {
  fit?: 'cover' | 'inside';
  /** 数值越大越先执行；用户主动打开的预览应高于后台列表预取。 */
  priority?: number;
  signal?: AbortSignal;
  size?: 64 | 128 | 256 | 512 | 1024;
  variant?: 'thumbnail';
}

export interface PrivateBlobRequest {
  generation: number;
  signal: AbortSignal;
}

interface BlobCacheEntry {
  blob: Blob;
  expiresAt: number;
  lastUsedAt: number;
  size: number;
}

interface QueueTask {
  controller: AbortController;
  order: number;
  path: string;
  priority: number;
  reject: (reason?: unknown) => void;
  resolve: (value: Blob | PromiseLike<Blob>) => void;
  settled: boolean;
  started: boolean;
}

interface BlobFlight {
  cancel: () => void;
  promise: Promise<Blob>;
  promote: (priority: number) => void;
  settled: boolean;
  subscribers: Set<symbol>;
}

const DEFAULT_CACHE_TTL_MS = 60_000;
const DEFAULT_MAX_CACHE_BYTES = 50 * 1024 * 1024;
const DEFAULT_MAX_CACHE_ENTRIES = 100;
const MAX_RELEASED_URL_RECORDS = 1000;
const DEFAULT_MAX_RETRY_ATTEMPTS = 2;
const DEFAULT_REQUEST_TIMEOUT_MS = 15_000;
const DEFAULT_RETRY_BASE_DELAY_MS = 250;

const blobCache = new Map<string, BlobCacheEntry>();
const inFlight = new Map<string, BlobFlight>();
const queue: QueueTask[] = [];
const activeControllers = new Set<AbortController>();
const activeObjectUrls = new Map<string, number>();
const releasedObjectUrls = new Set<string>();

let cacheBytes = 0;
let activeRequests = 0;
let queueOrder = 0;
let sessionToken: string | undefined;
// 每次清理/切换账号递增，阻止旧请求完成后把数据写回新会话缓存。
let cacheEpoch = 0;
let loaderOptions: Required<PrivateBlobLoaderOptions> = {
  cacheTtlMs: DEFAULT_CACHE_TTL_MS,
  maxCacheBytes: DEFAULT_MAX_CACHE_BYTES,
  maxCacheEntries: DEFAULT_MAX_CACHE_ENTRIES,
  maxConcurrency: detectDefaultConcurrency(),
  maxRetryAttempts: DEFAULT_MAX_RETRY_ATTEMPTS,
  requestTimeoutMs: DEFAULT_REQUEST_TIMEOUT_MS,
  retryBaseDelayMs: DEFAULT_RETRY_BASE_DELAY_MS,
};

function detectDefaultConcurrency(): number {
  if (typeof navigator === 'undefined') return 4;
  const connection = (
    navigator as Navigator & {
      connection?: { effectiveType?: string; saveData?: boolean };
    }
  ).connection;
  if (connection?.saveData) return 2;
  if (connection?.effectiveType === 'slow-2g') return 1;
  if (connection?.effectiveType === '2g') return 2;
  if (connection?.effectiveType === '3g') return 3;
  return 4;
}

function apiBase(): string {
  const { apiURL } = useAppConfig(import.meta.env, import.meta.env.PROD);
  return String(apiURL || '').replace(/\/$/, '');
}

function authHeaders(): HeadersInit {
  const token = useAccessStore().accessToken;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function currentAccessToken(): string | undefined {
  return useAccessStore().accessToken || undefined;
}

export function createPrivateBlobAbortError(): Error {
  const error = new Error('私有媒体请求已取消');
  error.name = 'AbortError';
  return error;
}

function abortError(): Error {
  return createPrivateBlobAbortError();
}

function timeoutError(): Error {
  const error = new Error('私有媒体请求超时');
  error.name = 'TimeoutError';
  return error;
}

/** 用于预览等只接受最后一次结果的异步读取。 */
export function createPrivateBlobRequestController() {
  let generation = 0;
  let controller: AbortController | undefined;

  return {
    begin(): PrivateBlobRequest {
      controller?.abort();
      controller = new AbortController();
      generation += 1;
      return { generation, signal: controller.signal };
    },
    invalidate(): void {
      controller?.abort();
      controller = undefined;
      generation += 1;
    },
    isCurrent(value: number): boolean {
      return value === generation;
    },
  };
}

function releaseObjectUrl(url: string): void {
  if (releasedObjectUrls.has(url)) return;
  releasedObjectUrls.add(url);
  activeObjectUrls.delete(url);
  if (typeof URL !== 'undefined' && typeof URL.revokeObjectURL === 'function') {
    URL.revokeObjectURL(url);
  }
  if (releasedObjectUrls.size > MAX_RELEASED_URL_RECORDS) {
    const oldest = releasedObjectUrls.values().next().value;
    if (oldest) releasedObjectUrls.delete(oldest);
  }
}

function createObjectUrl(blob: Blob): string {
  if (typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') {
    throw new TypeError('当前环境不支持图片预览');
  }
  const url = URL.createObjectURL(blob);
  releasedObjectUrls.delete(url);
  activeObjectUrls.set(url, Date.now());
  return url;
}

function sweepCache(now = Date.now()): void {
  for (const [key, entry] of blobCache) {
    if (entry.expiresAt <= now) {
      blobCache.delete(key);
      cacheBytes -= entry.size;
    }
  }
  while (
    blobCache.size > loaderOptions.maxCacheEntries ||
    cacheBytes > loaderOptions.maxCacheBytes
  ) {
    let oldest: [string, BlobCacheEntry] | undefined;
    for (const entry of blobCache) {
      if (!oldest || entry[1].lastUsedAt < oldest[1].lastUsedAt) {
        oldest = entry;
      }
    }
    if (!oldest) break;
    blobCache.delete(oldest[0]);
    cacheBytes -= oldest[1].size;
  }
}

function storeCache(key: string, blob: Blob): void {
  const size = Number(blob.size) || 0;
  const previous = blobCache.get(key);
  if (previous) cacheBytes -= previous.size;
  if (size > loaderOptions.maxCacheBytes) {
    blobCache.delete(key);
    sweepCache();
    return;
  }
  const now = Date.now();
  blobCache.set(key, {
    blob,
    expiresAt: now + loaderOptions.cacheTtlMs,
    lastUsedAt: now,
    size,
  });
  cacheBytes += size;
  sweepCache(now);
}

function isAbortLike(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

function isRetryableStatus(status: number | undefined): boolean {
  return (
    status === 408 || status === 425 || status === 429 || (status ?? 0) >= 500
  );
}

function isRetryableError(error: unknown): boolean {
  if (isAbortLike(error)) return false;
  if (error instanceof Error && error.name === 'TimeoutError') return true;
  const status =
    error && typeof error === 'object' && 'status' in error
      ? Number((error as { status?: unknown }).status)
      : undefined;
  if (Number.isFinite(status)) return isRetryableStatus(status);
  // fetch 网络错误通常没有 status，允许有限重试。
  return true;
}

function linkAbort(source: AbortSignal | undefined, target: AbortController) {
  if (!source) return () => undefined;
  if (source.aborted) {
    target.abort();
    return () => undefined;
  }
  const onAbort = () => target.abort();
  source.addEventListener('abort', onAbort, { once: true });
  return () => source.removeEventListener('abort', onAbort);
}

async function fetchAttempt(path: string, signal: AbortSignal): Promise<Blob> {
  const url = `${apiBase()}${path.startsWith('/') ? path : `/${path}`}`;
  const controller = new AbortController();
  const unlink = linkAbort(signal, controller);
  let timedOut = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const operation = (async () => {
    const response = await fetch(url, {
      cache: 'no-store',
      headers: authHeaders(),
      signal: controller.signal,
    });
    if (!response.ok) {
      const error = new Error(`private content ${response.status}`) as Error & {
        status?: number;
      };
      error.status = response.status;
      throw error;
    }
    return response.blob();
  })();

  try {
    if (loaderOptions.requestTimeoutMs <= 0) return await operation;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        timedOut = true;
        controller.abort();
        reject(timeoutError());
      }, loaderOptions.requestTimeoutMs);
    });
    return await Promise.race([operation, timeout]);
  } catch (error) {
    if (signal.aborted) throw abortError();
    if (timedOut) throw timeoutError();
    throw error;
  } finally {
    if (timer) clearTimeout(timer);
    unlink();
    // 超时后底层 fetch 可能仍在清理，避免其拒绝形成未处理 Promise。
    void operation.catch(() => undefined);
  }
}

async function waitBeforeRetry(
  delayMs: number,
  signal: AbortSignal,
): Promise<void> {
  if (signal.aborted) throw abortError();
  if (delayMs <= 0) return;
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, delayMs);
    const onAbort = () => {
      clearTimeout(timer);
      signal.removeEventListener('abort', onAbort);
      reject(abortError());
    };
    signal.addEventListener('abort', onAbort, { once: true });
  });
}

async function fetchPrivateBlob(
  path: string,
  signal: AbortSignal,
): Promise<Blob> {
  let lastError: unknown;
  for (
    let attempt = 1;
    attempt <= loaderOptions.maxRetryAttempts;
    attempt += 1
  ) {
    try {
      return await fetchAttempt(path, signal);
    } catch (error) {
      if (signal.aborted) throw abortError();
      lastError = error;
      if (
        attempt >= loaderOptions.maxRetryAttempts ||
        !isRetryableError(error)
      ) {
        throw error;
      }
      const delay = loaderOptions.retryBaseDelayMs * 2 ** (attempt - 1);
      await waitBeforeRetry(delay, signal);
    }
  }
  throw lastError ?? new Error('私有媒体请求失败');
}

function pumpQueue(): void {
  while (activeRequests < loaderOptions.maxConcurrency && queue.length > 0) {
    queue.sort(
      (left, right) =>
        right.priority - left.priority || left.order - right.order,
    );
    const task = queue.shift();
    if (!task) return;
    if (task.settled) continue;
    task.started = true;
    activeControllers.add(task.controller);
    activeRequests += 1;
    const request = fetchPrivateBlob(task.path, task.controller.signal).then(
      task.resolve,
      task.reject,
    );
    void request
      .finally(() => {
        task.settled = true;
        activeControllers.delete(task.controller);
        activeRequests -= 1;
        pumpQueue();
      })
      .catch(() => undefined);
  }
}

function enqueue(
  path: string,
  priority: number,
): {
  cancel: () => void;
  promise: Promise<Blob>;
  promote: (priority: number) => void;
} {
  let task!: QueueTask;
  const promise = new Promise<Blob>((resolve, reject) => {
    task = {
      controller: new AbortController(),
      order: ++queueOrder,
      path,
      priority: Number.isFinite(priority) ? priority : 0,
      reject,
      resolve,
      settled: false,
      started: false,
    };
    queue.push(task);
    pumpQueue();
  });
  return {
    cancel: () => {
      if (task.settled) return;
      if (task.started) {
        task.controller.abort();
        return;
      }
      const index = queue.indexOf(task);
      if (index !== -1) queue.splice(index, 1);
      task.settled = true;
      task.reject(abortError());
    },
    promise,
    promote: (priority: number) => {
      if (
        !task.settled &&
        !task.started &&
        Number.isFinite(priority) &&
        priority > task.priority
      ) {
        task.priority = priority;
      }
    },
  };
}

function withAbort<T>(promise: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (!signal) return promise;
  if (signal.aborted) return Promise.reject(abortError());
  return new Promise<T>((resolve, reject) => {
    const onAbort = () => {
      signal.removeEventListener('abort', onAbort);
      reject(abortError());
    };
    signal.addEventListener('abort', onAbort, { once: true });
    promise.then(
      (value) => {
        signal.removeEventListener('abort', onAbort);
        resolve(value);
      },
      (error) => {
        signal.removeEventListener('abort', onAbort);
        reject(error);
      },
    );
  });
}

function ensureSession(): void {
  const token = currentAccessToken();
  if (token === sessionToken) return;
  clearPrivateBlobCache();
  sessionToken = token;
}

async function loadBlob(
  key: string,
  path: string,
  priority: number,
  signal?: AbortSignal,
): Promise<Blob> {
  if (signal?.aborted) throw abortError();
  ensureSession();
  sweepCache();
  const cached = blobCache.get(key);
  if (cached) {
    cached.lastUsedAt = Date.now();
    return withAbort(Promise.resolve(cached.blob), signal);
  }

  let flight = inFlight.get(key);
  if (flight) {
    flight.promote(priority);
  } else {
    const epoch = cacheEpoch;
    let cancelled = false;
    const queued = enqueue(path, priority);
    const request = queued.promise.then((blob) => {
      if (cancelled || epoch !== cacheEpoch) throw abortError();
      storeCache(key, blob);
      return blob;
    });
    flight = {
      cancel: () => {
        cancelled = true;
        queued.cancel();
      },
      promise: request,
      promote: queued.promote,
      settled: false,
      subscribers: new Set(),
    };
    const currentFlight = flight;
    inFlight.set(key, currentFlight);
    void request.then(
      () => {
        currentFlight.settled = true;
        if (inFlight.get(key) === currentFlight) inFlight.delete(key);
      },
      () => {
        currentFlight.settled = true;
        if (inFlight.get(key) === currentFlight) inFlight.delete(key);
      },
    );
  }

  const subscriber = Symbol(key);
  flight.subscribers.add(subscriber);
  return new Promise<Blob>((resolve, reject) => {
    let finished = false;
    const release = () => {
      if (finished) return;
      finished = true;
      signal?.removeEventListener('abort', onAbort);
      flight.subscribers.delete(subscriber);
      if (!flight.settled && flight.subscribers.size === 0) {
        flight.cancel();
        if (inFlight.get(key) === flight) inFlight.delete(key);
      }
    };
    const onAbort = () => {
      release();
      reject(abortError());
    };
    if (signal?.aborted) {
      onAbort();
      return;
    }
    signal?.addEventListener('abort', onAbort, { once: true });
    flight.promise.then(
      (blob) => {
        release();
        resolve(blob);
      },
      (error) => {
        release();
        reject(error);
      },
    );
  });
}

/** 配置并发、缓存和弱网重试策略。 */
export function configurePrivateBlobLoader(
  options: PrivateBlobLoaderOptions,
): void {
  loaderOptions = {
    ...loaderOptions,
    ...options,
    cacheTtlMs: Math.max(
      0,
      Math.floor(options.cacheTtlMs ?? loaderOptions.cacheTtlMs),
    ),
    maxCacheBytes: Math.max(
      0,
      Math.floor(options.maxCacheBytes ?? loaderOptions.maxCacheBytes),
    ),
    maxCacheEntries: Math.max(
      0,
      Math.floor(options.maxCacheEntries ?? loaderOptions.maxCacheEntries),
    ),
    maxConcurrency: Math.max(
      1,
      Math.floor(options.maxConcurrency ?? loaderOptions.maxConcurrency),
    ),
    maxRetryAttempts: Math.max(
      1,
      Math.floor(options.maxRetryAttempts ?? loaderOptions.maxRetryAttempts),
    ),
    requestTimeoutMs: Math.max(
      0,
      Math.floor(options.requestTimeoutMs ?? loaderOptions.requestTimeoutMs),
    ),
    retryBaseDelayMs: Math.max(
      0,
      Math.floor(options.retryBaseDelayMs ?? loaderOptions.retryBaseDelayMs),
    ),
  };
  sweepCache();
  pumpQueue();
}

/** 清理当前会话的 Blob、对象地址和未完成请求。 */
export function clearPrivateBlobCache(): void {
  cacheEpoch += 1;
  for (const task of queue.splice(0)) {
    task.settled = true;
    task.controller.abort();
    task.reject(abortError());
  }
  for (const controller of activeControllers) controller.abort();
  activeControllers.clear();
  inFlight.clear();
  for (const url of activeObjectUrls.keys()) releaseObjectUrl(url);
  activeObjectUrls.clear();
  blobCache.clear();
  cacheBytes = 0;
  sessionToken = undefined;
}

async function resolveBlobUrl(
  load: () => Promise<Blob>,
  signal?: AbortSignal,
): Promise<string> {
  if (signal?.aborted) throw abortError();
  const blob = await load();
  if (signal?.aborted) throw abortError();
  return createObjectUrl(blob);
}

function imageVariantSuffix(options: ResolvePrivateBlobOptions): string {
  if (!options.variant) {
    if (options.size !== undefined || options.fit !== undefined) {
      throw new TypeError('缩略图参数必须与 variant=thumbnail 一起使用');
    }
    return '';
  }
  if (options.size === undefined || options.fit === undefined) {
    throw new TypeError('缩略图请求必须同时提供 size 和 fit');
  }
  return `?variant=thumbnail&size=${options.size}&fit=${options.fit}`;
}

/** 拉取 mediaRef 内容并创建临时 Object URL。 */
export function resolvePrivateBlobUrl(
  mediaRef: string,
  options: ResolvePrivateBlobOptions = {},
): Promise<string> {
  const suffix = imageVariantSuffix(options);
  const key = `media:${mediaRef}${suffix}`;
  return resolveBlobUrl(
    () =>
      loadBlob(
        key,
        `/media/${encodeURIComponent(mediaRef)}/content${suffix}`,
        options.priority ?? 0,
        options.signal,
      ),
    options.signal,
  );
}

export function resolveChatAssetBlobUrl(
  assetId: number,
  options: ResolvePrivateBlobOptions = {},
): Promise<string> {
  const suffix = imageVariantSuffix(options);
  const key = `chat:${assetId}${suffix}`;
  return resolveBlobUrl(
    () =>
      loadBlob(
        key,
        `/chat/assets/${assetId}/content${suffix}`,
        options.priority ?? 0,
        options.signal,
      ),
    options.signal,
  );
}

export function isPrivateBlobAbortError(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.name === 'AbortError' || error.message === '私有媒体请求已取消')
  );
}

export function revokePrivateBlobUrl(url: null | string | undefined): void {
  if (url && String(url).startsWith('blob:')) releaseObjectUrl(url);
}
