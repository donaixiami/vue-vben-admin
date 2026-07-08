import { describe, expect, it } from 'vitest';

import { createSeenMessageTracker, getChatMessageKey } from '../message-sync';

describe('chat message sync helpers', () => {
  it('prefers server message id over client message id', () => {
    expect(getChatMessageKey({ clientMsgId: 'client-1', id: 12 })).toBe(
      'id:12',
    );
  });

  it('falls back to camelCase or snake_case client message id', () => {
    expect(getChatMessageKey({ clientMsgId: 'client-1' })).toBe(
      'client:client-1',
    );
    expect(getChatMessageKey({ client_msg_id: 'client-2' })).toBe(
      'client:client-2',
    );
  });

  it('reads message keys from sync event payloads', () => {
    expect(
      getChatMessageKey({
        message: { clientMsgId: 'client-1', id: 12 },
        sessionId: 3,
      }),
    ).toBe('id:12');
  });

  it('detects duplicate messages by normalized key', () => {
    const tracker = createSeenMessageTracker();

    expect(tracker.track({ id: 12 })).toBe(true);
    expect(tracker.track({ message: { id: 12 } })).toBe(false);
    expect(tracker.track({ clientMsgId: 'client-1' })).toBe(true);
    expect(tracker.track({ client_msg_id: 'client-1' })).toBe(false);
  });
});
