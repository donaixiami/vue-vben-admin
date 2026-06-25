# Project Context and Recovery Notes

<!-- cspell:ignore depts -->

Last updated: 2026-06-20

This file is the handoff document for this working copy. Keep it current when changing project structure, runtime commands, API contracts, routing behavior, or any module-level convention that the next session would need to recover context quickly.

## Update Rules

When modifying this project, update this file in the same change if any of these items change:

- `apps/web-ele` startup flow, routing, permission mode, API base URL, or env variables.
- Backend endpoint paths, response shapes, pagination shapes, auth/token behavior, or upload behavior.
- Shared adapter behavior in `apps/web-ele/src/adapter`.
- New business modules, pages, route/menu component paths, or table/form patterns.
- Known dirty worktree state that affects future work.
- Non-obvious fixes, warnings, or workarounds discovered during implementation.

Prefer appending a short entry under "Session Log" plus updating the relevant reference section. Do not leave important context only in chat history.

Documentation placement rule: write project-specific documents under that project's root-level `docs` directory. For the primary Element Plus app, use `apps/web-ele/docs`. Use the repository root `docs` only for cross-project, workspace-level, or recovery-context documents such as this file.

## Current Snapshot

- Repository: `https://github.com/donaixiami/vue-vben-admin.git`
- Branch at discovery time: `main`
- Upstream base: Vue Vben Admin monorepo, version `5.7.0`
- Package manager: `pnpm@10.32.1`
- Node engine: `^20.19.0 || ^22.18.0 || ^24.0.0`
- Primary app for this working copy: `apps/web-ele`
- UI stack for primary app: Vue 3, Vite, TypeScript, Element Plus, Vben Common UI, Vxe Table
- Permission mode for primary app: backend-driven menus and routes
- Real backend noted by prior local docs: `dn_ht_node`

## Worktree State at Documentation Creation

Before this document was added, the worktree already had user/local changes. Do not revert them unless explicitly asked.

Modified files:

- `.vscode/settings.json`
- `apps/web-ele/src/adapter/component/index.ts`
- `apps/web-ele/src/api/system/menu.ts`
- `apps/web-ele/src/views/system/login-log/data.ts`
- `apps/web-ele/src/views/system/menu/modules/form.vue`
- `apps/web-ele/src/views/system/role/modules/form.vue`

Deleted root-level local docs:

- `API_REFACTOR_PLAN.md`
- `ARTICLE_DELETE_TEST.md`
- `ARTICLE_MODULE_SUMMARY.md`
- `ARTICLE_PUBLISH_TEST.md`
- `ARTICLE_PUBLISH_TESTING.md`
- `DICTIONARY_FIX_TEST.md`
- `VUE_WARNING_ANALYSIS.md`

Useful facts recovered from the deleted docs are merged into this document.

## Run Commands

Install dependencies:

```bash
pnpm install
```

Run the Element Plus app:

```bash
pnpm dev:ele
```

Run all dev apps through turbo-run:

```bash
pnpm dev
```

Type-check the Element Plus app:

```bash
pnpm -F @vben/web-ele run typecheck
```

Build the Element Plus app:

```bash
pnpm build:ele
```

Run unit tests:

```bash
pnpm test:unit
```

The `web-ele` dev server uses `VITE_PORT=5777` in `apps/web-ele/.env.development`.

## Monorepo Map

- `apps/web-ele`: primary Element Plus management app currently being customized.
- `apps/web-ele/docs`: app-specific documentation for the Element Plus app. Put `web-ele` module/API/testing/troubleshooting docs here instead of scattering them at the repository root.
- `apps/backend-mock`: Nitro mock backend used by Vite dev when enabled.
- `apps/web-antd`, `apps/web-naive`, `apps/web-tdesign`, `apps/web-antdv-next`: other UI-framework variants.
- `playground`: examples and e2e playground.
- `packages/@core`: framework-level Vben core packages such as preferences, layout UI, popup UI, shadcn UI, menu UI, icons, typings, design, shared utils.
- `packages/effects`: effect packages such as access, common UI, layouts, plugins, request.
- `packages/stores`: Pinia stores for access, user, tabbar, timezone.
- `packages/utils`: route/menu helpers and general helpers.
- `internal/vite-config`: shared Vite application/library config and plugins.
- `internal/node-utils`: internal Node helpers used by scripts and build config.
- `scripts/vsh`, `scripts/turbo-run`: local CLI/build workflow helpers.
- `docs`: VitePress documentation application. This recovery file lives at the docs root intentionally and is not part of `docs/src` site routing.

`pnpm-workspace.yaml` still includes `packages/business/*`, but that directory does not exist in this working copy. Treat it as a reserved workspace pattern, not a missing dependency by itself.

## Primary App Startup Flow

`apps/web-ele/src/main.ts`

1. Builds a persistence namespace from `VITE_APP_NAMESPACE`, `VITE_APP_VERSION`, and dev/prod mode.
2. Initializes preferences with `overridesPreferences`.
3. Dynamically imports `./bootstrap`.
4. Unmounts the injected global loading screen.

`apps/web-ele/src/bootstrap.ts`

1. Registers the component adapter with `initComponentAdapter()`.
2. Registers Vben Form adapter with `initSetupVbenForm()`.
3. Creates the Vue app.
4. Registers Element Plus `v-loading`.
5. Registers Vben loading directives with Vben `loading` disabled and `spinning` enabled.
6. Sets up i18n, Pinia stores, access directive, tippy, router, Motion plugin.
7. Watches preferences to update the document title.
8. Mounts to `#app`.

## Environment and API Base URL

The shared Vite config reads env files in this order:

1. `.env`
2. `.env.local`
3. `.env.{mode}`
4. `.env.{mode}.local`

`apps/web-ele/.env` defines app title, namespace, and store encryption key.

`apps/web-ele/.env.development` currently includes:

- `VITE_PORT=5777`
- `VITE_BASE=/`
- `VITE_GLOB_API_URL=http://www.example.com:3000/api`
- `VITE_NITRO_MOCK=true`
- `VITE_DEVTOOLS=false`
- `VITE_INJECT_APP_LOADING=true`

`apps/web-ele/.env.production` currently includes:

- `VITE_GLOB_API_URL=https://soy-milk.icu/api`
- `VITE_ROUTER_HISTORY=hash`
- `VITE_ARCHIVER=true`

`apps/web-ele/vite.config.ts` also defines a dev proxy:

- `/api` rewrites to `http://localhost:5320/api`

Important: because development `VITE_GLOB_API_URL` is currently an absolute URL, frontend requests will target that URL directly and will not use the `/api` proxy. To use the integrated Nitro mock via proxy, set `VITE_GLOB_API_URL=/api` or equivalent local config.

## Request Client Contract

Main request setup: `apps/web-ele/src/api/request.ts`.

- `requestClient` is created with `responseReturn: 'data'`.
- API success code is `code === 0`.
- Data field is `data`.
- Error display is routed through `Element Plus` `ElMessage.error`.
- Request headers include:
  - `Authorization: Bearer <token>` when an access token exists.
  - `Accept-Language: preferences.app.locale`.
- Refresh-token support is wired through `authenticateResponseInterceptor`, but default preferences have `enableRefreshToken: false`.
- `baseRequestClient` is used for refresh-token calls where the raw response wrapper is needed.

Expected backend response shape:

```ts
{
  code: number;
  data: unknown;
  error: unknown;
  message: string;
}
```

Expected paginated response shape after `responseReturn: 'data'`:

```ts
{
  items: unknown[];
  total: number;
}
```

Vxe Table global proxy config reads `items` as the result list and `total` as the total count.

## Auth and Permission Flow

Primary files:

- `apps/web-ele/src/preferences.ts`
- `apps/web-ele/src/store/auth.ts`
- `apps/web-ele/src/router/guard.ts`
- `apps/web-ele/src/router/access.ts`
- `packages/effects/access/src/accessible.ts`
- `packages/utils/src/helpers/generate-routes-backend.ts`

`apps/web-ele/src/preferences.ts` overrides:

```ts
app: {
  name: import.meta.env.VITE_APP_TITLE,
  accessMode: 'backend',
}
```

Login flow:

1. `loginApi()` calls `POST /auth/login`.
2. `authLogin()` stores `accessToken`.
3. It fetches user info through `GET /system/user/info`.
4. It fetches permission codes through `GET /system/user/codes`.
5. It stores user info and codes in shared Pinia stores.
6. It redirects to `userInfo.homePath` or `preferences.app.defaultHomePath`.

Route guard flow:

1. Core auth routes bypass permission generation.
2. Missing token redirects to `/auth/login`.
3. Once authenticated, `generateAccess()` is called only if access has not been checked.
4. In backend mode, `generateAccessible()` ignores local dynamic route modules for route generation and calls `getAllMenusApi()`.
5. `getAllMenusApi()` calls `GET /system/menu/all`.
6. Backend menu `component` strings are mapped to Vue components from `import.meta.glob('../views/**/*.vue')`.
7. Accessible menus and routes are stored in `useAccessStore`.

Backend menu component strings must match a view path after normalization. For example:

- Backend value: `/system/menu/list`
- Matched component: `apps/web-ele/src/views/system/menu/list.vue`

If a component does not match, the console logs `route component is invalid: <path>.vue` and the route falls back to the 404 component. This is the first thing to check when a menu entry renders 404.

## Routes

Core static routes:

- `/` root with `BasicLayout`
- `/auth/*` authentication pages with `AuthPageLayout`
- fallback 404 route

Dynamic local route modules live in `apps/web-ele/src/router/routes/modules`. They define dashboard, demos, and Vben project routes. Because `web-ele` currently uses backend access mode, these modules are not the source of truth for accessible menus unless access mode is changed to `frontend` or `mixed`.

In backend mode, the backend menu payload is the source of truth. Ensure each menu item has a stable `name`, `path`, `type`, and valid `component` when it is a page route.

## Backend Mock

`apps/backend-mock` is a Nitro service integrated through `internal/vite-config/src/plugins/nitro-mock.ts`.

- Default mock port: `5320`
- Startup is automatic during dev when `VITE_NITRO_MOCK=true`.
- Login users include `vben/123456`, `admin/123456`, and `jack/123456`.
- Mock success responses use `{ code: 0, data, error: null, message: 'ok' }`.
- Mock paginated responses use `{ data: { items, total } }`.
- `apps/backend-mock/middleware/1.api.ts` returns 403 for `DELETE`, `PATCH`, `POST`, and `PUT` requests under `/api/system/*`. This mock is therefore good for read/login/menu flows, not full system-management writes.

## Business API Surface in `web-ele`

Primary aggregator:

- `apps/web-ele/src/api/index.ts`

Core:

- `POST /auth/login`
- `POST /auth/logout`
- `POST /auth/refresh`
- `GET /system/user/info`
- `GET /system/user/codes`
- `GET /system/menu/all`

System modules:

- User: list, get by id, create, update, update status, delete.
- Role: list, create, update, delete.
- Menu: all/tree/list, name/path existence checks, create, update, delete.
- Department: list, create, update, delete.
- Dictionary: list, identifier existence check, create, update, delete.
- Category type: list/tree, create, update, delete.
- Notifications: management list/detail/create/update/delete plus publish/revoke, and current-user inbox list/unread-count/read/read-all/delete.
- File: list/detail/upload/upload OSS/delete.
- Login log: list, delete, clear through `/monitor/login-log/*`.

Article module:

- `GET /article/list`
- `GET /article/{id}`
- `POST /article`
- `PUT /article/{id}`
- `DELETE /article/{id}`

Prior local docs described this as part of an API normalization effort against the `dn_ht_node` backend.

## Page and Module Pattern

Common CRUD module shape in `apps/web-ele/src/views`:

- `data.ts`: query form schema, table columns, tag/switch/operation config.
- `list.vue`: `Page`, `useVbenVxeGrid`, API proxy query, toolbar, action handlers, drawer wiring.
- `modules/form.vue`: drawer form for create/update.

Typical table setup:

- `useVbenVxeGrid({ formOptions, gridOptions })`
- `proxyConfig.ajax.query` calls the module API.
- Pagination passes `page.currentPage` and `page.pageSize`.
- Row identity uses `rowConfig.keyField = 'id'`.
- Operations use the global `CellOperation` renderer.

Menu management is tree-shaped:

- `apps/web-ele/src/views/system/menu/list.vue`
- `pagerConfig.enabled = false`
- `treeConfig.parentField = 'pid'`
- `treeConfig.rowField = 'id'`
- append action opens the form with `{ pid: row.id }`

## Adapters and Shared Renderers

Component adapter:

- `apps/web-ele/src/adapter/component/index.ts`
- Registers Element Plus components for Vben Form.
- Current local change adds `AutoComplete` as a supported form component type.

Form adapter:

- `apps/web-ele/src/adapter/form.ts`
- Registers model prop mapping:
  - `Upload` -> `fileList`
  - `CheckboxGroup` -> `model-value`
- Defines `required` and `selectRequired` validation rules.

Vxe Table adapter:

- `apps/web-ele/src/adapter/vxe-table.ts`
- Registers global renderers:
  - `CellImage`
  - `CellLink`
  - `CellTag`
  - `CellSwitch`
  - `CellOperation`
- `CellTag` passes matched option properties to `ElTag`. Use `type`, not `color`, for Element Plus tag status.
- `CellOperation` wraps delete actions in `ElPopconfirm`.

Known warning from prior local docs:

- Vue may warn that slot `default` was invoked outside the render function from Vxe/Element Plus popconfirm rendering.
- It was assessed as a dev warning that does not block current functionality.
- If it becomes functional, inspect `packages/effects/plugins/src/vxe-table` and Element Plus/Vxe updates first.

## Current Local Fixes Worth Preserving

These were present before this document was written:

- Menu API now separates:
  - `getMenuTree()` -> `/system/menu/all`
  - `getMenuList()` -> `/system/menu/list`
  - `getMenuTreeData()` -> `/system/menu/tree`
- `getMenuTree()` translates menu `meta.title` values before showing them in role permission trees.
- Menu form uses Element Plus `AutoComplete` for component path suggestions.
- The Element Plus `AutoComplete` adapter loads `ElAutocomplete` together with `autocomplete/style/css`; using `style/index` or passing the style import as a second `defineAsyncComponent` argument fails `vue-tsc`.
- Menu form removed custom tree-select option rendering that double-translated menu titles.
- Role permission tree node display now uses `value.meta.title` directly because `getMenuTree()` already translated titles.
- Login log status tags use `type: 'success' | 'error'`, matching `ElTag`.
- Dictionary list uses its own `SystemDictionaryApi.SystemDictionary` row type and Element Plus `ElMessage`/`ElMessageBox` for status confirmation and deletion. `updateDictionary()` accepts partial payloads for status-only updates, and dictionary delete ids use the dictionary entity id type.
- Notifications API mirrors the `dn_ht_node` backend `src/modules/notifications` module: message body records use `system | message`, `low | medium | high`, `all | users | depts | roles`, and `draft | scheduled | sent | revoked`; inbox state is stored separately by receipt id.
- Notifications list deletion calls `deleteNotifications(row.id)` and the drawer form reads values as `SystemNotificationsApi.CreateNotificationsParams` to match the backend create payload.
- VS Code `jsonc` default formatter is locally changed to Prettier.

## Common Pitfalls

- Backend mode means backend menus drive pages. Adding only a local route module is not enough for a visible page.
- Backend `component` must match `views` path conventions. A bad component path silently becomes a 404 route after logging an error.
- `VITE_GLOB_API_URL` as an absolute URL bypasses the local `/api` proxy.
- Nitro mock blocks write methods under `/api/system/*`, so CRUD write failures in mock mode can be expected.
- Some files show garbled comments because of existing encoding issues. Prefer not to rewrite whole files just to fix comments unless the task is explicitly encoding cleanup.
- The root README has been rewritten for this working copy and now summarizes the `apps/web-ele` app, backend/API contract, route/menu behavior, modules, commands, and project conventions.
- Avoid broad cleanup of deleted root-level temporary docs unless the user asks; their useful facts have been consolidated here.

## Resume Checklist

When starting a new session:

1. Run `git status --short --untracked-files=all`.
2. Read this file first.
3. If working on `web-ele`, inspect:
   - `apps/web-ele/src/preferences.ts`
   - `apps/web-ele/src/api/request.ts`
   - `apps/web-ele/src/router/guard.ts`
   - `apps/web-ele/src/router/access.ts`
4. For a dynamic menu/page issue, compare backend menu `component` with `apps/web-ele/src/views/**/*.vue`.
5. For a table rendering issue, inspect `apps/web-ele/src/adapter/vxe-table.ts`.
6. For a form component issue, inspect `apps/web-ele/src/adapter/component` and `apps/web-ele/src/adapter/form.ts`.
7. After making behavior changes, update this document before finishing.

## Session Log

### 2026-06-19

- Created this recovery document after reading the monorepo structure, `web-ele` startup chain, env/Vite setup, request client, route guard, backend access generation, mock backend, API modules, adapter layers, and current local diff.
- Added the explicit rule that future project modifications should update this document when they affect recovery context.
- Fixed the local `AutoComplete` adapter registration so `vue-tsc` no longer reports the Element Plus autocomplete import error. The remaining `web-ele` type-check failures are in existing article, category, and notifications files outside the menu/login-log changes.
- Restored dictionary deletion in the Element Plus app by replacing the AntD placeholder code with `deleteDictionary()`, loading/success messages, refresh on success, and dictionary-specific row/id typing.
- Updated the `web-ele` notifications API contract from backend `dn_ht_node`: added management detail/publish/revoke endpoints and current-user inbox/unread/read/read-all/delete endpoints with typed request and response shapes.
- Adapted the notifications form/list to the new API typing: form submit uses the create payload type, and list deletion now calls the management delete endpoint.

### 2026-06-20

- Rewrote the root `README.md` for this working copy instead of the upstream Vue Vben Admin template. The README now documents `apps/web-ele` as the primary app, the `dn_ht_node` backend relationship, local commands, API response contract, route/menu generation behavior, module coverage, and development conventions.
- Added `apps/web-ele/docs/README.md` as the dedicated documentation entry point for the Element Plus app and updated root docs to point future `web-ele` documentation there.
- Recorded the documentation placement rule: project-specific documents belong in the relevant project root `docs` directory, while repository root `docs` is reserved for cross-project and recovery-context documentation.
- Fixed the notifications form `ApiSelect` usage in `apps/web-ele/src/views/system/notifications/data.ts`: `ApiComponent` expects `componentProps.api` to be a function, not a Promise. For dictionary-backed selects, pass an async function that fetches the dictionary and returns the raw option list, then map it with `afterFetch`.

### 2026-06-21

- Fixed the Tiptap duplicate underline extension warning in `packages/effects/plugins/src/tiptap/extensions.ts`. Tiptap 3 `StarterKit` already registers `underline`, so the default extension list must not add `@tiptap/extension-underline` separately. Added a regression test that creates the default editor extensions and asserts `underline` is registered once.
- Fixed the notifications drawer avatar upload value shape. `Upload` fields are bound through the Vben Form adapter as Element Plus `fileList` arrays, while the backend notification `avatar` field is a string URL. The drawer now converts backend strings to upload file lists on edit and resolves upload lists back to a string URL before create/update submit.

### 2026-06-22

- Updated the notifications drawer target table schema so `valueList` is hidden when `target_type` is `all`, visible for other broadcast ranges, and receives the current `target_type` as the `targetType` prop. The custom `TargetTable` component is wrapped with `markRaw()` in the form schema to avoid Vue making the component object reactive.

### 2026-06-25

- Moved notifications target list loading out of `target-drawer.vue` and into `target-table.vue`. The table now watches `targetType`, loads users/depts/roles plus the `broadcast_range` dictionary, and passes `targetList`, `broadcastRange`, and `targetType` into `TargetDrawer` through drawer data. `TargetDrawer` now only renders and selects the provided target rows.
- Updated the notifications target table so changing `targetType` clears the selected `target_ids` model and drawer selection state after initial load. Initial form hydration is preserved so editing an existing notification does not wipe saved target ids.
- Normalized notifications broadcast target submission to `target_ids: number[]`. `TargetTable` and `TargetDrawer` now keep selected target ids as numbers while still accepting numeric string ids from list APIs for display matching.
- Refined notifications target clearing so `all -> users/depts/roles` does not clear selected ids. This preserves edit hydration when the form default starts at `all`; clearing only runs when switching away from an already selectable target type.
- Added atomic-class selected-target chips in `target-table.vue`. Each selected notification target can be removed inline with an `X` icon button, which updates both the form `target_ids` model and the drawer selection state.
