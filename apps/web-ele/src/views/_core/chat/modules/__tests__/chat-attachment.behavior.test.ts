import { describe, expect, it } from 'vitest';

import {
  buildSendPayload,
  canSendWithAttachment,
  normalizeMessageAttachments,
} from '../chat-attachment';

describe('聊天调试页附件发送', () => {
  it('上传成功后发送携带 assetIds', () => {
    const payload = buildSendPayload({
      clientMsgId: 'c1',
      content: '说明',
      sessionId: 1,
      pending: {
        assetId: 8,
        fileName: 'a.jpg',
        kind: 'image',
        mimeType: 'image/jpeg',
        size: 1,
        status: 'ready',
      },
    });
    expect(payload.assetIds).toEqual([8]);
    expect(payload.type).toBe('image');
  });

  it('上传中禁止发送', () => {
    expect(
      canSendWithAttachment('hi', {
        fileName: 'a',
        kind: 'file',
        mimeType: 'text/plain',
        size: 1,
        status: 'uploading',
      }),
    ).toBe(false);
  });

  it('归一化历史消息 attachments 含 revoked 状态', () => {
    const list = normalizeMessageAttachments({
      attachments: [{ assetId: 3, kind: 'file', status: 'revoked' }],
    });
    expect(list[0]?.status).toBe('revoked');
  });
});
