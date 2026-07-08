# Chat Multi-Device Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make chat messages and read state synchronize across all online devices for the same account, even when a device is not currently joined to the active session room.

**Architecture:** Keep the existing Socket.IO `session_{sessionId}` room for active chat windows and add account-level sync events through `user_{userId}` personal rooms. Frontend message consumption deduplicates by server `id` or `clientMsgId` so a device can safely receive both room and personal-room events.

**Tech Stack:** NestJS 11, Socket.IO, Jest, Vue 3, TypeScript, Vitest.

---

### Task 1: Backend Personal-Room Message Sync

**Files:**

- Modify: `D:/bangong/myProject/BackendManagementSystem/dn_ht_node/src/modules/chat/chat.gateway.spec.ts`
- Modify: `D:/bangong/myProject/BackendManagementSystem/dn_ht_node/src/modules/chat/chat.gateway.ts`

- [ ] **Step 1: Write failing gateway tests**

Add tests proving `messageSync` goes to every member personal room, including the sender, and that `readSync` goes to the reader personal room.

- [ ] **Step 2: Run gateway test red**

Run: `pnpm.cmd test -- chat.gateway.spec.ts --runInBand --no-cache` Expected: FAIL because `messageSync` and `readSync` are not emitted yet.

- [ ] **Step 3: Implement minimal gateway events**

After saving a message, emit:

- `receiveMessage` to `session_${sessionId}` for compatibility.
- `messageSync` to every `user_${memberId}`, including sender.
- `sessionUpdate` to every `user_${memberId}`, including sender.

After `markRead`, emit:

- `messageRead` to `session_${sessionId}` for compatibility.
- `readSync` to `user_${userId}` for same-account multi-device unread clearing.

- [ ] **Step 4: Run gateway test green**

Run: `pnpm.cmd test -- chat.gateway.spec.ts --runInBand --no-cache` Expected: PASS.

### Task 2: Frontend Chat Event Deduplication

**Files:**

- Create: `apps/web-ele/src/views/_core/chat/modules/message-sync.ts`
- Create: `apps/web-ele/src/views/_core/chat/modules/__tests__/message-sync.test.ts`
- Modify: `apps/web-ele/src/views/_core/chat/index.vue`

- [ ] **Step 1: Write failing frontend helper tests**

Test that `getChatMessageKey()` prefers `id`, falls back to `clientMsgId`, and that `createSeenMessageTracker()` returns false for duplicate messages.

- [ ] **Step 2: Run helper test red**

Run: `pnpm.cmd test:unit apps/web-ele/src/views/_core/chat/modules/__tests__/message-sync.test.ts` Expected: FAIL because the helper file does not exist.

- [ ] **Step 3: Implement helper and wire page events**

Implement `getChatMessageKey()` and `createSeenMessageTracker()`. In `index.vue`, use the tracker in `receiveMessage` and `messageSync`; append messages only when `sessionId` matches the current conversation and the key has not been seen. Keep `sessionUpdate` for raw event/debug visibility.

- [ ] **Step 4: Run helper test green**

Run: `pnpm.cmd test:unit apps/web-ele/src/views/_core/chat/modules/__tests__/message-sync.test.ts` Expected: PASS.

### Task 3: Documentation And Verification

**Files:**

- Modify: `D:/bangong/myProject/BackendManagementSystem/dn_ht_node/docs/CHAT_PLAN.md`
- Modify: `D:/bangong/myProject/BackendManagementSystem/dn_ht_node/docs/PROJECT_CONTEXT.md`
- Modify: `docs/PROJECT_CONTEXT.md`

- [ ] **Step 1: Document event contract**

Record `messageSync` and `readSync` in backend chat docs and note that frontend personal-room events now cover same-account multi-device sync.

- [ ] **Step 2: Run focused verification**

Run:

- `pnpm.cmd test -- chat.gateway.spec.ts --runInBand --no-cache`
- `pnpm.cmd test:unit apps/web-ele/src/views/_core/chat/modules/__tests__/message-sync.test.ts`
- `git diff --check` in both repositories

Expected: all pass, with only existing CRLF warnings acceptable in backend.
