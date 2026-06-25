# DEBUG REPORT: Notifications Broadcast Range Dictionary Type

- **Symptom:** TypeScript reported that `DictionaryDetail | null` cannot be assigned to `DictionaryDetail[]`.
- **Root cause:** `getDictionaryByIdentifier()` returns one dictionary detail object or `null`, while `broadcastRange` was declared as an array of dictionary details.
- **Fix:** Changed `broadcastRange` to `DictionaryValueItem[]` and assigned `dictionary.value` only when it is an array.
- **Evidence:** `apps/web-ele/src/api/system/dictionary.ts` types `getDictionaryByIdentifier()` as `Promise<DictionaryDetail | null>`.
- **Verification:** `pnpm.cmd -F @vben/web-ele run typecheck` passed.
- **Status:** DONE
