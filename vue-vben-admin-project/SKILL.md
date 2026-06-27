---
name: vue-vben-admin-project
description: Use when working in this customized vue-vben-admin workspace, especially for apps/web-ele routes, backend-driven menus, permissions, APIs, Element Plus pages, Vxe tables, forms, docs, tests, or GitHub commits.
---

# Vue Vben Admin Project

Use this skill before changing this repository. It captures the project-specific workflow and must stay current as the project evolves.

## Start Here

1. Run `git status --short --untracked-files=all` and do not revert user changes.
2. Read `docs/PROJECT_CONTEXT.md`.
3. Read `docs/VBEN_FRAMEWORK_NOTES.md` when the task touches Vben framework conventions: routes, permissions, request setup, preferences, theme/styles, build, tooling, or deployment.
4. Treat `apps/web-ele` as the primary application unless the user explicitly names another app.
5. For backend-related frontend work, compare frontend API wrappers with the real backend module before assuming response shapes or parameter names.

## Project Shape

- Monorepo with runnable apps in `apps/*` and reusable packages in `packages/*`.
- Primary app: `apps/web-ele`, using Vue 3, TypeScript, Vite, Element Plus, Vben Common UI, and Vxe Table.
- Backend-driven access is enabled in `apps/web-ele/src/preferences.ts`.
- Backend menu data drives visible routes. Local route modules are not enough when `accessMode` is `backend`.
- App-local `#/*` imports come from `package.json#imports` and `tsconfig.json#paths`.

## Core Files

Read these before editing related behavior:

- Startup and preferences: `apps/web-ele/src/main.ts`, `apps/web-ele/src/bootstrap.ts`, `apps/web-ele/src/preferences.ts`.
- Request setup: `apps/web-ele/src/api/request.ts`.
- Auth and access: `apps/web-ele/src/store/auth.ts`, `apps/web-ele/src/router/access.ts`, `apps/web-ele/src/router/guard.ts`, `packages/effects/access/src/use-access.ts`, `packages/effects/access/src/directive.ts`.
- Backend route generation: `packages/utils/src/helpers/generate-routes-backend.ts`.
- Vxe table adapter: `apps/web-ele/src/adapter/vxe-table.ts`.
- Form/component adapters: `apps/web-ele/src/adapter/form.ts`, `apps/web-ele/src/adapter/component`.
- Project framework notes: `docs/VBEN_FRAMEWORK_NOTES.md`.

## Backend Menus And Routes

- Backend menu `component` must match a Vue file under `apps/web-ele/src/views` without `views` and `.vue`, for example `/system/role/list`.
- If a backend menu renders 404, first check `component`, `path`, `name`, `type`, and `status`.
- Menu APIs currently used by the frontend:
  - `/system/menu/all`: accessible backend route/menu generation.
  - `/system/menu/list`: menu management and parent selection.
  - `/system/menu/tree`: full tree data when needed.
- When adding a backend-driven page, add both:
  - the Vue page component under `apps/web-ele/src/views`,
  - the backend menu record with the correct `component` path.
- Do not put business routes into core routes unless they are framework-level pages.

## Button Permissions

- Fine-grained button permissions use backend menu children with `type: 'button'` and `auth_code`.
- User permission codes are loaded through `getAccessCodesApi()` and stored in `useAccessStore().accessCodes`.
- Template buttons: prefer `v-access:code="'module:action'"`.
- Render-function/table buttons: use `useAccess().hasAccessByCodes()` or local `show` callbacks.
- Existing role-management convention:
  - `system:role:query`
  - `system:role:add`
  - `system:role:edit`
  - `system:role:delete`
- For future CRUD pages, follow the same code shape: `<menu-auth-code>:query`, `<menu-auth-code>:add`, `<menu-auth-code>:edit`, `<menu-auth-code>:delete`.
- After adding backend button menu records, assign them to the relevant roles; otherwise the frontend will correctly hide the buttons.

## API And Request Rules

- Use API wrappers under `apps/web-ele/src/api`; export through `#/api` when existing modules do so.
- `requestClient` uses Vben response interceptors. In this app, success is `code === 0`, payload is `data`, and paginated responses are usually `{ items, total }`.
- Keep query normalization close to the module, usually in `modules/query.ts` or the list page proxy.
- Remove empty query values before passing them to backend when the module has that convention.
- Use structured request parameters instead of string-building.
- If `VITE_GLOB_API_URL` is absolute, Vite proxy is bypassed. Use `/api` when proxy behavior is required.

## Page And Module Pattern

- Follow the established system module shape:
  - `data.ts`: table columns and form/query schemas.
  - `list.vue` or `index.vue`: page composition, grid/drawer wiring, high-level actions.
  - `modules/*.vue`: drawer/dialog/detail components.
  - `modules/*.ts`: reusable helpers, query normalization, option builders, action utilities.
  - `modules/__tests__/*.test.ts`: focused tests for risky helpers.
- Do not put table columns, API proxy config, dialogs, and action helpers all into one `index.vue`.
- Use Vben `Page`, `useVbenVxeGrid`, `useVbenDrawer`, and existing local patterns before adding new abstractions.
- Vxe operation buttons use the global `CellOperation` renderer. It supports default `edit/delete`, custom options, function-valued props, and `show` filtering.
- Element Plus tag rendering uses `type` for tag status, not `color`, unless a custom renderer explicitly supports color.

## Notifications And Inbox Notes

- Notifications management and inbox APIs are already mapped in `apps/web-ele/src/api/system/notifications.ts`.
- Layout notification inbox rows are mapped through `apps/web-ele/src/layouts/modules/notification-inbox.ts` to isolate backend field differences.
- Current-user messages page lives under `apps/web-ele/src/views/_core/my-messages` and is split into `index.vue`, `modules/data.ts`, and `modules/actions.ts`.
- Message type labels and tag colors are dictionary-backed:
  - `message_type`
  - `message_type_color`
- Send-state tags follow the same dictionary merge pattern:
  - `send_state`
  - `send_state_color`

## System Modules Already Customized

- System config module uses backend `src/modules/system_config` and lives under `apps/web-ele/src/views/system/config`.
- User create/update intentionally does not send `password`; reset password uses the backend reset endpoint.
- Menu form parent selection uses `/system/menu/list`, translates `meta.title`, and filters out the edited menu itself.
- Role management now demonstrates CRUD button permission wiring through local `modules/permissions.ts`.

## Styling And UI

- Prefer Element Plus components and existing Vben adapters in `apps/web-ele`.
- Use Tailwind utility classes for simple layout and spacing.
- Use icons from `@vben/icons` or existing icon systems instead of hand-written SVG.
- Theme colors are CSS variables and HSL-based. Use `hsl(var(--primary))` style variables when matching the app theme.
- Keep management UIs dense, clear, and work-focused.

## Verification

Pick the smallest verification that proves the change, then run broader checks when the change crosses shared boundaries.

- Focused helper tests: `pnpm.cmd test:unit <path-to-test>`.
- Primary app typecheck: `pnpm.cmd -F @vben/web-ele run typecheck`.
- Whitespace check: `git diff --check`.
- Dev server: `pnpm.cmd dev:ele`. If `5777` is occupied, Vite may choose the next port.
- Use `pnpm.cmd` on Windows.
- If `pnpm` needs access outside the sandbox, request escalation with a specific command prefix.

## GitHub And Commits

- When the user asks to submit code to GitHub, create a conventional commit with a Chinese description and push.
- Do not use `git add -A`; stage only intentional files.
- Never revert unrelated dirty worktree changes.
- Existing approved git commands may still show warnings about `C:\Users\25808/.config/git/ignore`; treat that warning as non-blocking unless the command fails.

## Updating This Skill

Update this skill whenever a project convention changes in a way future work depends on:

- New route/menu/component path convention.
- New backend endpoint contract or response shape.
- New permission-code naming convention.
- New page/module split pattern.
- New shared adapter behavior.
- New validation or commit workflow.
- New repeated pitfall discovered during implementation.

Keep updates concise. Put detailed history and session-specific facts in `docs/PROJECT_CONTEXT.md`; put Vben framework reference summaries in `docs/VBEN_FRAMEWORK_NOTES.md`; keep this skill focused on action rules for future agents.
