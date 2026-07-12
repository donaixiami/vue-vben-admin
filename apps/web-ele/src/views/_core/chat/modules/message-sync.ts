type ChatMessageLike = Record<string, unknown>;

/**
 * 聊天页会从多个入口收到消息：
 *
 * - receiveMessage 通常直接返回消息对象；
 * - messageSync 把消息放在 message 字段；
 * - HTTP 通用响应有时把结果放在 data 字段。
 *
 * 先拆掉这些外层包装，后面的去重逻辑就只需要认识一种“消息对象”。
 */
function unwrapMessagePayload(input: unknown): ChatMessageLike | undefined {
  if (!input || typeof input !== 'object') {
    return undefined;
  }

  const payload = input as ChatMessageLike;
  const nestedMessage = payload.message;
  if (nestedMessage && typeof nestedMessage === 'object') {
    return nestedMessage as ChatMessageLike;
  }

  const nestedData = payload.data;
  if (nestedData && typeof nestedData === 'object') {
    return nestedData as ChatMessageLike;
  }

  return payload;
}

export function getChatMessageKey(input: unknown): string | undefined {
  const message = unwrapMessagePayload(input);
  if (!message) {
    return undefined;
  }

  const id = message.id;
  // 服务端数据库 ID 最稳定，同一条消息经不同 Socket 事件到达时仍然相同。
  if (typeof id === 'number' || typeof id === 'string') {
    return `id:${id}`;
  }

  const clientMsgId = message.clientMsgId ?? message.client_msg_id;
  // 消息尚未拿到服务端 ID 时，退回使用前端生成的 clientMsgId。
  // 同时兼容当前接口中并存的 camelCase 与 snake_case 字段。
  if (typeof clientMsgId === 'number' || typeof clientMsgId === 'string') {
    return `client:${clientMsgId}`;
  }

  return undefined;
}

export function createSeenMessageTracker() {
  // Set 只保存已出现过的消息键，查询复杂度接近 O(1)。
  const seenKeys = new Set<string>();

  return {
    reset() {
      // 切换会话或重新加载完整历史时，应清空旧会话的去重状态。
      seenKeys.clear();
    },
    track(input: unknown) {
      const key = getChatMessageKey(input);
      if (!key) {
        // 没有可靠标识时不贸然丢弃，避免把合法消息误判为重复。
        return true;
      }
      if (seenKeys.has(key)) {
        // 当前设备可能同时收到 receiveMessage 与 messageSync，只展示一次。
        return false;
      }
      seenKeys.add(key);
      return true;
    },
  };
}
