# Vben Framework Notes

Last read: 2026-06-28

Source: local Chinese docs under `docs/src/guide/**`, matching the user-provided `https://doc.vben.pro/guide/...` pages.

Use this file as the quick memory for future work in this repo. If the upstream docs change, re-read the local docs or the online pages before relying on details.

## Project Model

- The repo is a Monorepo. `apps/*` are runnable applications; `packages/*` are reusable packages used by apps and other packages.
- Apps are independent and can use different UI libraries. In this workspace the primary app is `apps/web-ele`.
- Packages should be consumed like npm packages through workspace dependencies, for example `"@vben/utils": "workspace:*"`.
- App-local `#/*` imports are Node subpath imports from `package.json#imports`, not ordinary Vite aliases. Keep `package.json#imports` and `tsconfig.json#paths` aligned.

## Local Development

- Required stack knowledge: Vue 3, TypeScript, Vue Router, Vite, pnpm, Turbo, Tailwind CSS.
- Common root scripts:
  - `pnpm dev`: interactive dev runner through `turbo-run dev`.
  - `pnpm dev:ele`: run the Element Plus app.
  - `pnpm -F @vben/web-ele run typecheck`: type-check this workspace's primary app.
  - `pnpm test:unit`: run Vitest unit tests with DOM.
  - `pnpm build` / `pnpm build:ele`: production build.
  - `pnpm preview`: preview built apps.
  - `pnpm reinstall`: destructive dependency reinstall helper; use only when needed.
- Public static assets that must be referenced as `/static/...` should live in the app's `public/static`.
- `VITE_DEVTOOLS=true` enables Vue DevTools in development.
- To add a new build mode, update the app `package.json`, root `package.json`, and `turbo.json` task graph.

## Environment And App Config

- Vite loads env files in this order: `.env`, `.env.local`, `.env.[mode]`, `.env.[mode].local`.
- Only `VITE_*` values are exposed to client code.
- `VITE_GLOB_*` values are written to production `dist/_app.config.js`, so they can be changed after build without rebuilding.
- Read dynamic app config with `useAppConfig(import.meta.env, import.meta.env.PROD)`.
- Add new dynamic config by updating:
  - app env files with a `VITE_GLOB_*` value,
  - `packages/types/global.d.ts`,
  - `packages/effects/hooks/src/use-app-config.ts`.
- Do not couple reusable packages to `import.meta.env`; pass env/config from apps.
- Preferences are overridden in app `src/preferences.ts` through `defineOverridesPreferences`. Override only the needed keys.
- Clear browser cache/local storage after preference changes if they appear not to take effect.

## Routes And Menus

- Route categories:
  - Core routes: app `src/router/routes/core`, for root/login/404 and framework essentials.
  - Static routes: app `src/router/routes/static` when enabled.
  - Dynamic routes: app `src/router/routes/modules` in frontend/mixed modes.
- In backend access mode, backend menu data is the source of routes and menus. The backend `component` must match a view path without `views` and `.vue`, for example `/system/role/list`.
- Business routes should not be added to core routes unless they are true framework-level pages.
- Adding a page requires a route/menu entry and a matching view component.
- Important `meta` keys:
  - `title`: menu/tab title, usually i18n key or translated string.
  - `icon` / `activeIcon`: menu/tab icons or image URLs.
  - `keepAlive`: cache page when tabbar keep-alive is enabled.
  - `hideInMenu`, `hideInTab`, `hideInBreadcrumb`, `hideChildrenInMenu`: visibility controls.
  - `authority`: frontend role permissions.
  - `badge`, `badgeType`, `badgeVariants`: menu badges.
  - `activePath`: activate a parent/menu route when current route is hidden.
  - `affixTab`, `affixTabOrder`: fixed tab behavior.
  - `iframeSrc`, `link`, `openInNewWindow`: embedded/external pages.
  - `ignoreAccess`: bypass permission checks.
  - `menuVisibleWithForbidden`: show menu but redirect forbidden access to 403.
  - `order`: first-level menu sort.
  - `query`: menu-provided route query.
  - `noBasicLayout`: only top-level, skips the basic layout.
  - `fullPathKey`: tab key behavior.
  - `domCached`: cache route DOM, useful for expensive tab switching but increases memory and changes lifecycle behavior.
- Refresh the current route with `useRefresh()` from `@vben/hooks`.
- Tab key priority: `query.pageKey`, then full path when `meta.fullPathKey !== false`, then route path.

## Access Control

- Supported access modes:
  - `frontend`: routes are filtered by local route `meta.authority` and user roles.
  - `backend`: routes are generated from a backend menu API.
  - `mixed`: combines local routes and backend menus.
- Set access mode in app `src/preferences.ts` under `app.accessMode`.
- In backend mode, `src/router/access.ts` supplies `fetchMenuListAsync`; backend menu rows must contain usable `name`, `path`, `component`, and `meta`.
- Login flow should provide:
  - login API returning `accessToken`,
  - user info API returning at least roles/user identity,
  - optional access code API returning `string[]`.
- Button permissions can use `@vben/access`:
  - Component: `<AccessControl :codes="['code']" type="code">`.
  - API: `const { hasAccessByCodes, hasAccessByRoles } = useAccess()`.
  - Directive: `v-access:code="'code'"` or `v-access:role="'role'"`.
- In this project, backend button menu auth codes should be used for fine-grained buttons. Template buttons can use `v-access:code`; render-function/table buttons should use `hasAccessByCodes()` or local `show` callbacks.

## Request And Backend Integration

- Request core is `@vben/request`; app-specific setup lives in app `src/api/request.ts`.
- The default response interceptor can map backend `{ code, data, message }` to the returned value. With `responseReturn: 'data'`, API wrappers receive only the backend `data` node.
- Extended request options:
  - `responseReturn`: `raw`, `body`, or `data`.
  - `paramsSerializer`: `brackets`, `comma`, `indices`, `repeat`, or custom Axios serializer.
- Add auth headers in request interceptors, typically `Authorization: Bearer <token>`.
- Request headers also commonly include `Accept-Language` from preferences locale.
- Token expiry is treated as authentication failure. `enableRefreshToken` in preferences controls refresh-token behavior.
- Re-authentication behavior depends on `loginExpiredMode`: `page` redirects, `modal` opens a login modal when access has already been checked.
- Multiple backend base URLs should be represented by multiple request clients, not ad hoc URL concatenation.
- Development proxy only applies when the frontend request URL is relative, for example `VITE_GLOB_API_URL=/api`. Absolute API URLs bypass the Vite proxy.
- Local mock backend is Nitro in `apps/backend-mock`; it is intended for development and is not a production mock strategy.

## Login

- Auth page layout is configured in app `src/layouts/auth.vue` through `AuthPageLayout` props such as app name, logo, title, description, copyright, toolbar, and toolbar list.
- Login form options are passed to `AuthenticationLogin` in `src/views/_core/authentication/login.vue`.
- `AuthenticationLogin` supports toggles/paths for code login, QR login, register, forgot password, remember me, third-party login, loading, title, and subtitle.
- To integrate a backend, adapt `src/api/core/auth` and `src/api/core/user` and ensure the request interceptor matches the backend response shape.

## Locale

- Framework uses Vue i18n.
- App business translations belong in app `src/locales/langs/*`, not in shared `@vben/locales`.
- Add every new key to every supported app language file.
- Use `$t()` from locales in script/template. In this app, prefer `#/locales` for app-local imports where established.
- Default locale is overridden in `src/preferences.ts` under `app.locale`.
- Language switching updates preferences and calls `loadLocaleMessages(locale)`.
- Adding a language requires shared package language files, app language files, `SUPPORT_LANGUAGES`, and `SupportedLanguagesType`.
- Request client can send `Accept-Language`; backend may use it for localized API data.
- To hide language UI, set `widget.languageToggle = false`.

## Theme And Styles

- Theme is based on shadcn-vue and Tailwind CSS. Use CSS variables such as `--background`, `--foreground`, `--primary`, `--sidebar`, `--header`, `--card`, `--border`, and `--input`.
- CSS variable color values must be HSL components, for example `212 100% 45%`, without wrapping `hsl()` and without commas.
- Brand colors are configured in `src/preferences.ts` under `theme.colorPrimary`, `colorSuccess`, `colorWarning`, and `colorDestructive`; values include `hsl(...)`.
- Built-in theme is selected with `theme.builtinType`; supported names include `default`, `custom`, `violet`, `pink`, `rose`, `sky-blue`, `deep-blue`, `green`, `deep-green`, `orange`, `yellow`, `zinc`, `neutral`, `slate`, `gray`, `stone`, and `red`.
- Add a custom theme by setting `builtinType` and defining `[data-theme='your-theme']` plus `.dark[data-theme='your-theme'], [data-theme='your-theme'] .dark` variables.
- Dark mode is selected with `theme.mode = 'dark'`.
- Sidebar color uses `--sidebar` and `--sidebar-deep`; header color uses `--header`.
- Special display modes are preference flags: `app.colorWeakMode` and `app.colorGrayMode`.
- Global styles live in `@vben/styles`, which builds on `@vben-core/design`.
- SFC styles can use SCSS, PostCSS with nested rules and CSS variables, Tailwind classes, BEM via `useNamespace`, or CSS Modules.
- Tailwind CSS is v4. There is no old per-package `tailwind.config.*` flow; theme/scanning lives in `internal/tailwind-config/src/theme.css` and shared Vite config.
- Vue SFC `@apply` is handled by `internal/vite-config/src/plugins/tailwind-reference.ts`, which injects the needed `@reference`.

## Icons

- Prefer centralized icon management through `@vben/icons`.
- Add Iconify icons in `packages/icons/src/iconify` using `createIconifyIcon('set:name')`.
- Add SVG icons under `packages/icons/src/svg/icons` and export them from `packages/icons/src/svg/index.ts`.
- Use icon components from `@vben/icons` in Vue templates, with Tailwind sizing such as `class="size-5"`.
- Tailwind Iconify class syntax is available, for example `icon-[mdi--ab-testing]`.

## UI Framework Apps

- The monorepo can host multiple UI framework apps. Existing examples include Ant Design Vue, Element Plus, Naive UI, and TDesign.
- Adding another UI framework app means creating `apps/web-xxx`, changing its package name, replacing UI dependencies and app wiring, adjusting locales/app.vue/theme/env, adding root scripts, and running `pnpm install`.
- This workspace customizes `apps/web-ele`; follow Element Plus adapter patterns before borrowing from other UI variants.

## Build And Deployment

- Run builds from the repo root.
- `pnpm build` produces each app's `dist`, for example `apps/web-ele/dist`.
- `pnpm preview` is the recommended local preview command; static servers such as `live-server` can also serve `dist`.
- Compression is controlled by `VITE_COMPRESS`: `gzip`, `brotli`, or `gzip,brotli`. Server support is required for pre-compressed assets.
- Use `pnpm run build:analyze` to inspect bundle size.
- Deployment usually uploads `dist` to a static server/CDN. Avoid caching HTML aggressively; cache-control should prevent stale `index.html`.
- `VITE_BASE` must match deployment base path and start/end with `/`.
- `VITE_ROUTER_HISTORY=hash` avoids server history fallback requirements. `history` mode needs server `try_files` fallback to `index.html` or the subdirectory index.
- Production API proxying can be done with nginx by setting `VITE_GLOB_API_URL=/api` and forwarding `/api` to the backend.

## Quality, Tests, And Tooling

- Lint/config packages live under `internal/lint-configs`.
- Tools:
  - Oxfmt for formatting.
  - Oxlint for JavaScript/TypeScript linting.
  - ESLint for Vue/JSONC/YAML complementary rules.
  - Stylelint for CSS.
  - Commitlint for commit messages.
  - Publint for package checks.
  - Cspell for spelling.
  - Lefthook for git hooks.
- Commit message types follow Angular convention: `feat`, `fix`, `style`, `perf`, `refactor`, `revert`, `test`, `docs`, `chore`, `workflow`, `ci`, `types`.
- Project tests use Vitest. Test files are named `.test.ts` or placed in `__tests__`.
- Run focused tests when touching isolated logic, and `pnpm -F @vben/web-ele run typecheck` for app changes.
- `vsh` CLI supports `check-circular`, `check-dep`, `lint`, `publint`, and `code-workspace`.
- `turbo-run` supports interactive script execution such as `turbo-run dev`.
- Changeset is available through `pnpm run changeset` and `pnpm run version`, but can be ignored if not publishing packages.

## Common Troubleshooting

- After `git pull`, run `pnpm install` because dependencies may have changed. Lefthook may do this after merges, but do it manually if needed.
- If preferences/env/config changes do not appear, local storage cache may be involved. Version changes affect cache keys; clearing cache or re-login may be needed.
- Vite restarts after env or Vite config changes; if the dev server behaves oddly, restart it manually.
- Use a modern browser such as Chrome 90+ for local development.
- Blank page after route switch can be caused by transition animation plus multiple root nodes in a Vue component template. Wrap the page in a single root element or disable transition.
- Do not rely on `getCurrentInstance().ctx`; it may work in dev but fail after build because it is not part of the public instance type.
- Dependency install problems: try `pnpm run reinstall`, switch network, or configure npm mirror in `.npmrc`.
- Large build output: use the thin edition when possible, enable gzip/brotli on server, and optionally build pre-compressed assets if server supports them.
- Full project paths containing Chinese/Japanese/Korean characters can cause Vite module resolution problems in some setups.
- Vue Router "No match found" warnings can be ignored if the page works normally.
- Startup errors involving `str.matchAll` usually indicate an unsupported Node.js version.
- Nginx MIME errors for module scripts require `application/javascript js mjs` in `mime.types` or nginx config.
- Remove Baidu analytics by deleting the script block from the app `index.html`.

## Upgrade Guidance

- Vben is a full project template, not an npm plugin, so upgrades are manual merges.
- Keeping business code mostly outside core packages (`packages/@core`, `packages/effects`) reduces future merge conflicts.
- Pull upstream often; long gaps make conflict resolution harder.
