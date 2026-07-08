<script lang="ts" setup>
/**
 * ============================================================================
 * 实时聊天测试页（Socket.IO 版 · 临时单文件）
 * ----------------------------------------------------------------------------
 * 用于对照后端 dn_ht_node 的 chat 模块联调。等契约稳定后再拆成
 * index.vue + modules/*.ts 的标准结构。
 *
 * 后端 chat 模块提供两类通道：
 *   1) Socket.IO 网关（实时）：默认路径 /socket.io，靠握手 auth.token 鉴权。
 *      客户端 emit：joinRoom / sendMessage / markRead / leaveRoom
 *      服务端 emit：receiveMessage / messageSync / sessionUpdate / messageRead / readSync
 *   2) HTTP 控制器（REST，全局前缀 /api）：
 *      POST /chat/session               建/取单聊会话
 *      GET  /chat/sessions              会话列表
 *      GET  /chat/history/:sessionId    历史消息（游标分页，:sessionId 是路径段）
 *      PUT  /chat/sessions/:id/read     标记已读
 *
 * 注意：后端没有 SSE 端点，真实实时通道只有 Socket.IO，本页因此只保留
 * WebSocket(Socket.IO) 模式。若想学原生 WebSocket，需要后端另开 ws 适配器
 * 网关（原生 WS 无法直接对接 Socket.IO 协议）。
 * ============================================================================
 */

import type { Socket } from 'socket.io-client';

// Vue 组合式 API：computed 派生状态、nextTick DOM 更新后执行、
// onBeforeUnmount 卸载前清理、ref 定义响应式变量。
import { computed, nextTick, onBeforeUnmount, ref } from 'vue';

// Vben 框架能力：
// - Page：内容区高度自适应的页面容器。
// - useAppConfig：读应用配置，这里取 apiURL（即 VITE_GLOB_API_URL）。
// - useAccessStore / useUserStore：Pinia store，分别存 token 和用户信息。
import { Page } from '@vben/common-ui';
import { useAppConfig } from '@vben/hooks';
import { useAccessStore, useUserStore } from '@vben/stores';

// Element Plus 组件与消息提示（本项目 UI 库）。
import { ElButton, ElInput, ElMessage, ElTag } from 'element-plus';
// Socket.IO 客户端：io() 建连接，Socket 是连接实例类型。
import { io } from 'socket.io-client';

import { createSeenMessageTracker } from './modules/message-sync';

// 连接状态机：未连 / 连接中 / 已连 / 异常，用于顶部状态标签。
type ConnectionStatus = 'closed' | 'connected' | 'connecting' | 'error';

// 页面内部统一的消息结构。后端不同事件/接口返回的字段名不一致，
// 都会先经过 normalizeMessage() 归一成这个形状再渲染。
interface ChatMessage {
  content: string; // 消息正文
  createdAt?: string; // 发送时间
  id: number | string; // 消息 id（后端 id 或本地临时 id）
  raw?: unknown; // 原始负载，方便调试
  senderId?: number | string; // 发送者 id
  senderName?: string; // 发送者昵称
  self?: boolean; // 是否本人发送（决定气泡靠左/靠右）
}

// apiURL 来自 VITE_GLOB_API_URL（开发环境目前是 http://www.example.com:3000/api）。
const { apiURL } = useAppConfig(import.meta.env, import.meta.env.PROD);
const accessStore = useAccessStore(); // 里面有 accessToken
const userStore = useUserStore(); // 里面有 userInfo

// ---------------------------------------------------------------------------
// 响应式状态：模板里的输入框、按钮、列表都绑定到下面这些 ref。
// ref(x) 定义响应式变量，脚本里用 .value 读写，模板里直接用变量名。
// ---------------------------------------------------------------------------
const status = ref<ConnectionStatus>('closed'); // 当前连接状态
const conversationId = ref('1'); // 会话 ID（建会话后会被自动填成真实 id）
const targetUserId = ref(''); // 对方用户 ID（建会话时输入）
const websocketUrl = ref('/socket.io'); // Socket.IO 路径（后端默认就是 /socket.io）
const historyUrl = ref('/chat/history'); // 历史消息接口前缀
const sessionUrl = ref('/chat/session'); // 建/取会话接口
const messageText = ref(''); // 输入框里正在编辑的消息
const messages = ref<ChatMessage[]>([]); // 消息列表
const rawEvents = ref<string[]>([]); // 右侧原始事件调试面板
const messageListRef = ref<HTMLElement>(); // 消息列表容器 DOM 引用（用于滚动到底）

// socket 不参与模板渲染，用普通变量而非 ref，避免不必要的响应式开销。
let socket: null | Socket = null;
const seenMessageTracker = createSeenMessageTracker();

// 当前登录用户 id。后端不同接口可能叫 id / userId / user_id，逐个兜底。
// 用于判断收到的消息是不是自己发的（self）。
const currentUserId = computed(() => {
  const userInfo = userStore.userInfo as any;
  return userInfo?.id ?? userInfo?.userId ?? userInfo?.user_id;
});

// 状态 -> 中文文案。computed 会随 status 变化自动更新。
const statusText = computed(() => {
  const labelMap: Record<ConnectionStatus, string> = {
    closed: '未连接',
    connected: '已连接',
    connecting: '连接中',
    error: '连接异常',
  };
  return labelMap[status.value];
});

// 状态 -> Element Plus 标签颜色类型。
const statusType = computed(() => {
  const typeMap: Record<
    ConnectionStatus,
    'danger' | 'info' | 'success' | 'warning'
  > = {
    closed: 'info',
    connected: 'success',
    connecting: 'warning',
    error: 'danger',
  };
  return typeMap[status.value];
});

// ---------------------------------------------------------------------------
// 工具函数区
// ---------------------------------------------------------------------------

// 构造带鉴权的 HTTP 请求头。HTTP 走 Authorization: Bearer <token>。
// （Socket.IO 不走这里，它的 token 放在握手 auth 里，见 connectWebSocket。）
function getAuthHeaders() {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (accessStore.accessToken) {
    headers.Authorization = `Bearer ${accessStore.accessToken}`;
  }

  return headers;
}

// 拼接请求地址：
// - 若 url 已是完整地址（http(s):// 或 ws(s)://），原样返回。
// - 否则把 baseUrl（apiURL）和相对路径拼起来，处理好中间的斜杠。
// 例：joinChatUrl('http://x/api', '/chat/session') -> 'http://x/api/chat/session'
function joinChatUrl(baseUrl: string, url: string) {
  if (/^https?:\/\//i.test(url) || /^wss?:\/\//i.test(url)) {
    return url;
  }

  if (!baseUrl) {
    return url;
  }

  // 去掉 baseUrl 末尾斜杠、去掉 url 开头斜杠，再用单个 / 连接。
  return `${baseUrl.replace(/\/+$/, '')}/${url.replace(/^\/+/, '')}`;
}

// 把字符串会话 ID 解析成正整数，非法返回 undefined（宽松版，不抛错）。
function parseSessionId(value: string) {
  const sessionId = Number(value);
  return Number.isInteger(sessionId) && sessionId > 0 ? sessionId : undefined;
}

// 严格版：非法直接抛错。connectWebSocket / loadHistory 用它，
// 好处是能在 try/catch 里统一给出「会话 ID 无效」的提示并终止流程。
function parseChatSessionId(value: string): number {
  const sessionId = parseSessionId(value);
  if (sessionId === undefined) {
    throw new Error('会话 ID 需为正整数');
  }
  return sessionId;
}

// Socket.IO 的连接方式和普通 URL 不同：它连到「origin + path」两段，
// 而不是一整个 URL。默认 path 是 /socket.io。这个函数把用户填的地址
// 拆成 { origin, path } 供 io() 使用。
function resolveSocketIoEndpoint(
  baseUrl: string,
  wsUrl: string,
  fallbackOrigin: string,
): { origin: string; path: string } {
  const defaultPath = '/socket.io';

  // 情况一：用户填了完整地址（ws://host/path 之类）。
  // 先把 ws(s) 换成 http(s) 好让 URL 能解析，再拆出 origin 和 path。
  if (/^(https?|wss?):\/\//i.test(wsUrl)) {
    const httpUrl = wsUrl
      .replace(/^ws:\/\//i, 'http://')
      .replace(/^wss:\/\//i, 'https://');
    const url = new URL(httpUrl);
    return {
      origin: url.origin,
      path: url.pathname && url.pathname !== '/' ? url.pathname : defaultPath,
    };
  }

  // 情况二：用户填的是相对路径（如 /socket.io）。
  // origin 从 apiURL 里取（拿它的协议+主机+端口），path 用用户填的。
  let origin = fallbackOrigin;
  if (baseUrl) {
    try {
      origin = new URL(baseUrl, fallbackOrigin).origin;
    } catch {
      origin = fallbackOrigin;
    }
  }

  const path =
    wsUrl && wsUrl !== '/'
      ? (wsUrl.startsWith('/')
        ? wsUrl
        : `/${wsUrl}`)
      : defaultPath;

  return { origin, path };
}

// 往调试面板追加一条原始事件，只保留最近 20 条。
function appendRawEvent(value: string) {
  rawEvents.value.unshift(value);
  rawEvents.value = rawEvents.value.slice(0, 20);
}

// 把后端各种形状的消息负载归一成统一的 ChatMessage。
// 后端字段名可能是 content/message/text、sender_id/senderId/user_id 等，逐个兜底。
function normalizeMessage(input: any, fallbackContent = ''): ChatMessage {
  const data = input?.data ?? input?.message ?? input;
  const content =
    typeof data === 'string'
      ? data
      : (data?.content ?? data?.message ?? data?.text ?? fallbackContent);
  const senderId = data?.sender_id ?? data?.senderId ?? data?.user_id;

  return {
    content: String(content ?? ''),
    createdAt:
      data?.created_at ??
      data?.createdAt ??
      data?.time ??
      new Date().toISOString(),
    id: data?.id ?? `${Date.now()}-${Math.random()}`,
    raw: input,
    senderId,
    senderName: data?.sender_name ?? data?.senderName ?? data?.nickname,
    // self：优先用后端给的字段，否则拿 senderId 和当前登录用户比。
    self:
      data?.self ??
      (senderId !== undefined &&
        String(senderId) === String(currentUserId.value)),
  };
}

// 归一后追加到消息列表，并滚动到底部。空内容直接丢弃。
function appendMessage(input: unknown, fallbackContent = '') {
  if (!seenMessageTracker.track(input)) {
    return;
  }
  const message = normalizeMessage(input, fallbackContent);
  if (!message.content) {
    return;
  }
  messages.value.push(message);
  scrollToBottom();
}

function isCurrentSessionEvent(input: any) {
  const eventSessionId =
    input?.sessionId ?? input?.message?.session_id ?? input?.session_id;
  const currentSessionId = parseSessionId(conversationId.value);
  return (
    eventSessionId !== undefined &&
    String(eventSessionId) === String(currentSessionId)
  );
}

// 断开连接并复位状态。切换/离开页面时调用。
function closeConnection() {
  socket?.disconnect();
  socket = null;
  status.value = 'closed';
}

// joinRoom 兜底：即便后端已部署握手鉴权中间件，也保留此重试作为双保险。
// 若服务端在 user 尚未就绪的竞态窗口返回「请先登录」，按退避重试若干次。
function joinRoomWithRetry(sessionId: number, attempt = 0) {
  const maxAttempts = 5;
  socket?.emit(
    'joinRoom',
    { sessionId },
    (ack?: { error?: string; room?: string; success?: boolean }) => {
      appendRawEvent(JSON.stringify({ attempt, data: ack, event: 'joinRoom' }));
      if (ack?.success !== false) {
        return;
      }
      // 「请先登录/未授权」表示握手鉴权尚未就绪，属于可重试的竞态窗口。
      const retriable = /请先登录|未授权|登录/.test(ack.error ?? '');
      if (retriable && attempt < maxAttempts && socket?.connected) {
        // 退避：150ms、300ms、450ms…… 逐次拉长间隔。
        setTimeout(
          () => joinRoomWithRetry(sessionId, attempt + 1),
          150 * (attempt + 1),
        );
        return;
      }
      ElMessage.error(ack.error || '加入会话失败');
    },
  );
}

// 建立 Socket.IO 连接并绑定各事件。
function connectWebSocket() {
  closeConnection();
  status.value = 'connecting';

  // 会话 ID 必须是正整数，非法直接终止。
  let sessionId: number;
  try {
    sessionId = parseChatSessionId(conversationId.value);
  } catch (error) {
    status.value = 'error';
    ElMessage.error(error instanceof Error ? error.message : '会话 ID 无效');
    return;
  }

  // 把地址拆成 origin + path 给 io()。
  const endpoint = resolveSocketIoEndpoint(
    apiURL,
    websocketUrl.value,
    window.location.origin,
  );
  socket = io(endpoint.origin, {
    // 握手鉴权：token 放在 auth 里，后端网关从 handshake.auth.token 取。
    auth: {
      token: accessStore.accessToken ?? undefined,
    },
    path: endpoint.path,
    query: {
      conversationId: conversationId.value,
    },
    reconnection: false, // 测试页关掉自动重连，方便观察状态
    transports: ['websocket'], // 只用 websocket 传输，跳过轮询降级
  });

  // 连接成功：更新状态并加入会话房间。
  socket.on('connect', () => {
    status.value = 'connected';
    ElMessage.success('Socket.IO 已连接');
    joinRoomWithRetry(sessionId);
  });
  // 收到消息：上屏。
  socket.on('receiveMessage', (data) => {
    appendRawEvent(JSON.stringify({ data, event: 'receiveMessage' }));
    appendMessage(data);
  });
  // 多端同步：即便当前设备不在某个会话房间，只要同账号在线也能从个人房间收到。
  socket.on('messageSync', (data) => {
    appendRawEvent(JSON.stringify({ data, event: 'messageSync' }));
    if (isCurrentSessionEvent(data)) {
      appendMessage(data);
    }
  });
  // 会话更新（别人给你发消息但你没在房间里时刷新会话列表用）。
  socket.on('sessionUpdate', (data) => {
    appendRawEvent(JSON.stringify({ data, event: 'sessionUpdate' }));
  });
  // 已读回执。
  socket.on('messageRead', (data) => {
    appendRawEvent(JSON.stringify({ data, event: 'messageRead' }));
  });
  // 同账号其它设备标记已读时，同步清理当前设备的未读状态。
  socket.on('readSync', (data) => {
    appendRawEvent(JSON.stringify({ data, event: 'readSync' }));
  });
  // 断开。
  socket.on('disconnect', () => {
    status.value = 'closed';
    socket = null;
  });
  // 连接失败（鉴权失败、网络问题、路径错误等都会走这里）。
  socket.on('connect_error', (error) => {
    status.value = 'error';
    ElMessage.error(error.message || 'Socket.IO 连接异常');
  });
}

// 建/取会话：调 REST POST /chat/session，后端会查/建你和对方的单聊会话，
// 并把双方登记为成员，返回真实 sessionId。之后 join 才不会被成员校验拒绝。
async function createSession() {
  const target = Number(targetUserId.value);
  if (!Number.isInteger(target) || target <= 0) {
    ElMessage.error('请填写有效的对方用户 ID');
    return;
  }
  if (String(target) === String(currentUserId.value)) {
    ElMessage.error('不能和自己创建会话');
    return;
  }

  try {
    const response = await fetch(joinChatUrl(apiURL, sessionUrl.value), {
      body: JSON.stringify({ targetUserId: target }),
      headers: getAuthHeaders(),
      method: 'POST',
    });

    if (!response.ok) {
      throw new Error(`创建会话 HTTP ${response.status}`);
    }

    const result = await response.json();
    // 后端成功响应形如 { code:0, data:{...session}, message }，兼容裸对象。
    const session = result?.data ?? result;
    const sessionId = session?.id ?? session?.session_id;
    appendRawEvent(JSON.stringify({ data: result, event: 'createSession' }));

    if (sessionId === undefined || sessionId === null) {
      throw new Error('会话创建成功但未返回会话 ID');
    }

    // 自动把真实 sessionId 填进会话 ID 框，接着就能点连接。
    conversationId.value = String(sessionId);
    ElMessage.success(`会话就绪，会话 ID: ${sessionId}`);
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '创建会话失败');
  }
}

// 加载历史消息：REST GET /chat/history/:sessionId。
// 注意 sessionId 是【路径段】，不是查询参数（这点之前踩过 404 的坑）。
async function loadHistory() {
  let sessionId: number;
  try {
    sessionId = parseChatSessionId(conversationId.value);
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '会话 ID 无效');
    return;
  }

  try {
    // 后端契约：GET /chat/history/:sessionId?before_id=&limit=
    const base = `${joinChatUrl(apiURL, historyUrl.value).replace(/\/+$/, '')}/${sessionId}`;
    const response = await fetch(base, {
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`历史消息 HTTP ${response.status}`);
    }

    const result = await response.json();
    // 兼容游标分页 { data:{ items,... } } 与多种裸结构。
    const rows = result?.data?.items ?? result?.data ?? result?.items ?? result;
    seenMessageTracker.reset();
    messages.value = Array.isArray(rows)
      ? rows.map((item) => {
          seenMessageTracker.track(item);
          return normalizeMessage(item);
        })
      : [];
    scrollToBottom();
  } catch (error) {
    ElMessage.error(
      error instanceof Error ? error.message : '历史消息加载失败',
    );
  }
}

// 发送消息：通过 Socket.IO emitWithAck 发到网关，靠 ack 确认结果。
// 服务端会通过 receiveMessage 广播真实消息，所以这里不本地追加，避免重复。
async function sendMessage() {
  const content = messageText.value.trim();
  if (!content) {
    return;
  }

  // 必须已连接才能发（本页不再走 HTTP 兜底，后端也没有 /chat/send 端点）。
  if (!socket?.connected) {
    ElMessage.error('请先连接');
    return;
  }

  const sessionId = parseSessionId(conversationId.value);
  const clientMsgId = `${Date.now()}-${Math.random()}`; // 客户端消息 id，后端据此幂等去重

  try {
    // emitWithAck 返回 Promise，配合 timeout(ms) 可在无 ack 时超时。
    const ack = await socket
      .timeout(10_000)
      .emitWithAck('sendMessage', {
        clientMsgId,
        content,
        sessionId,
        type: 'text',
      })
      .catch(() => {
        throw new Error('消息发送超时');
      });
    appendRawEvent(JSON.stringify({ data: ack, event: 'sendMessage' }));
    if (ack?.success === false) {
      throw new Error(ack.error || '消息发送失败');
    }
    // 成功后清空输入框；真实消息会经 receiveMessage 回来。
    messageText.value = '';
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '消息发送失败');
  }
}

// 清空消息列表和调试面板。
function clearMessages() {
  messages.value = [];
  rawEvents.value = [];
}

// 滚动消息列表到底部。用 nextTick 确保新消息 DOM 已渲染。
function scrollToBottom() {
  nextTick(() => {
    const el = messageListRef.value;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  });
}

// 组件卸载前断开连接，防止内存泄漏和野连接。
onBeforeUnmount(() => {
  closeConnection();
});
</script>

<template>
  <Page auto-content-height>
    <div class="flex h-full min-h-[620px] flex-col gap-4">
      <!-- 顶部工具栏：会话 ID、Socket.IO 路径、连接/断开 -->
      <div
        class="grid gap-3 rounded-[var(--radius)] border border-border bg-card p-4 lg:grid-cols-[1fr_1fr_1fr_auto]"
      >
        <ElInput v-model="conversationId" placeholder="会话 ID" />
        <ElInput
          v-model="websocketUrl"
          placeholder="Socket.IO 路径（默认 /socket.io）"
        />
        <ElInput v-model="historyUrl" placeholder="历史消息接口" />
        <div class="flex items-center gap-2">
          <ElButton type="primary" @click="connectWebSocket">连接</ElButton>
          <ElButton @click="closeConnection">断开</ElButton>
        </div>
      </div>

      <!-- 建/取会话区：填对方用户 ID，拿到真实会话 ID -->
      <div
        class="flex flex-wrap items-center gap-3 rounded-[var(--radius)] border border-border bg-card px-4 py-3"
      >
        <span class="text-sm text-muted-foreground">
          当前登录用户 ID：{{ currentUserId ?? '未知' }}
        </span>
        <ElInput
          v-model="targetUserId"
          class="w-40"
          placeholder="对方用户 ID"
        />
        <ElButton @click="createSession">建/取会话</ElButton>
        <span class="text-xs text-muted-foreground">
          直连需先与对方创建会话，会得到可用的会话 ID
        </span>
      </div>

      <div class="grid min-h-0 flex-1 gap-4 lg:grid-cols-[1fr_320px]">
        <!-- 左侧：聊天主区（消息列表 + 输入框） -->
        <section
          class="flex min-h-0 flex-col overflow-hidden rounded-[var(--radius)] border border-border bg-card"
        >
          <div
            class="flex items-center justify-between border-b border-border px-4 py-3"
          >
            <div class="flex items-center gap-3">
              <div class="text-base font-semibold">实时聊天测试</div>
              <ElTag :type="statusType">{{ statusText }}</ElTag>
            </div>
            <div class="flex items-center gap-2">
              <ElButton @click="loadHistory">加载历史</ElButton>
              <ElButton @click="clearMessages">清空</ElButton>
            </div>
          </div>

          <!-- 消息列表：self 消息靠右、他人靠左 -->
          <div ref="messageListRef" class="min-h-0 flex-1 overflow-auto p-4">
            <div v-if="messages.length === 0" class="text-muted-foreground">
              暂无消息
            </div>
            <div
              v-for="message in messages"
              :key="message.id"
              class="mb-3 flex"
              :class="message.self ? 'justify-end' : 'justify-start'"
            >
              <div
                class="max-w-[72%] rounded-[var(--radius)] px-3 py-2 text-sm leading-6"
                :class="
                  message.self
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-foreground'
                "
              >
                <div class="mb-1 text-xs opacity-70">
                  {{ message.senderName || message.senderId || '对方' }}
                  <span v-if="message.createdAt" class="ml-2">
                    {{ message.createdAt }}
                  </span>
                </div>
                <div class="whitespace-pre-wrap break-words">
                  {{ message.content }}
                </div>
              </div>
            </div>
          </div>

          <!-- 输入区：Ctrl+Enter 发送 -->
          <div class="border-t border-border p-4">
            <div class="flex gap-3">
              <ElInput
                v-model="messageText"
                :autosize="{ minRows: 2, maxRows: 4 }"
                placeholder="输入测试消息（Ctrl+Enter 发送）"
                type="textarea"
                @keydown.ctrl.enter.prevent="sendMessage"
              />
              <ElButton type="primary" class="self-end" @click="sendMessage">
                发送
              </ElButton>
            </div>
          </div>
        </section>

        <!-- 右侧：原始事件调试面板 -->
        <aside
          class="flex min-h-0 flex-col overflow-hidden rounded-[var(--radius)] border border-border bg-card"
        >
          <div class="border-b border-border px-4 py-3 font-semibold">
            实时原始事件
          </div>
          <div class="min-h-0 flex-1 overflow-auto p-3">
            <div
              v-if="rawEvents.length === 0"
              class="text-sm text-muted-foreground"
            >
              暂无事件
            </div>
            <div
              v-for="(event, index) in rawEvents"
              :key="index"
              class="mb-3 whitespace-pre-wrap break-words rounded bg-muted p-2 text-xs leading-5"
            >
              {{ event }}
            </div>
          </div>
        </aside>
      </div>
    </div>
  </Page>
</template>
