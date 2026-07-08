type ChatMessageLike = Record<string, unknown>;

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
  if (typeof id === 'number' || typeof id === 'string') {
    return `id:${id}`;
  }

  const clientMsgId = message.clientMsgId ?? message.client_msg_id;
  if (typeof clientMsgId === 'number' || typeof clientMsgId === 'string') {
    return `client:${clientMsgId}`;
  }

  return undefined;
}

export function createSeenMessageTracker() {
  const seenKeys = new Set<string>();

  return {
    reset() {
      seenKeys.clear();
    },
    track(input: unknown) {
      const key = getChatMessageKey(input);
      if (!key) {
        return true;
      }
      if (seenKeys.has(key)) {
        return false;
      }
      seenKeys.add(key);
      return true;
    },
  };
}
