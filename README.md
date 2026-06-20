# Backend Management System Frontend

这是一个基于 Vue Vben Admin 5.7.0 二次开发的后台管理系统前端项目。当前仓库重点维护 `apps/web-ele` Element Plus 版本，用于对接本地后端项目 `dn_ht_node`。

## 项目定位

- 主应用：`apps/web-ele`
- UI 技术栈：Vue 3、Vite、TypeScript、Element Plus、Vben Common UI、Vxe Table
- 权限模式：后端菜单驱动路由，前端根据 `/system/menu/all` 返回的菜单生成可访问页面
- 后端项目：`D:\bangong\myProject\BackendManagementSystem\dn_ht_node`
- 恢复上下文：见 `docs/PROJECT_CONTEXT.md`

## 已接入模块

- 登录认证：登录、退出、刷新 token、用户信息、权限码
- 系统用户：用户列表、创建、更新、状态切换、删除
- 角色管理：角色列表、创建、更新、删除
- 菜单管理：菜单树、菜单列表、名称/路径校验、创建、更新、删除
- 部门管理：部门列表、创建、更新、删除
- 字典管理：字典列表、标识校验、创建、更新、状态切换、删除
- 分类类型：列表、树结构、创建、更新、删除
- 消息通知：通知管理、发布、撤回、站内收件箱、未读数、已读处理
- 文件管理：文件列表、详情、上传、OSS 上传、删除
- 登录日志：列表、删除、清空
- 文章管理：文章列表、详情、创建、更新、删除

## 本地环境

推荐环境：

- Node.js：`^20.19.0 || ^22.18.0 || ^24.0.0`
- pnpm：`>=10.0.0`，当前锁定 `pnpm@10.32.1`

安装依赖：

```bash
pnpm install
```

启动 Element Plus 应用：

```bash
pnpm dev:ele
```

默认开发端口来自 `apps/web-ele/.env.development`：

```text
VITE_PORT=5777
```

访问地址通常为：

```text
http://localhost:5777
```

Windows PowerShell 如果阻止 `pnpm.ps1`，可使用：

```powershell
pnpm.cmd dev:ele
```

## 常用命令

```bash
# 启动当前主应用
pnpm dev:ele

# 启动全部 dev 应用
pnpm dev

# 类型检查当前主应用
pnpm -F @vben/web-ele run typecheck

# 构建当前主应用
pnpm build:ele

# 运行单元测试
pnpm test:unit
```

## 后端接口约定

请求封装位于 `apps/web-ele/src/api/request.ts`，当前约定如下：

- 成功码：`code === 0`
- 数据字段：`data`
- `requestClient` 返回业务 `data`
- 分页返回：`{ items, total }`
- 登录后请求头：`Authorization: Bearer <token>`
- 语言请求头：`Accept-Language`

后端统一响应结构：

```ts
{
  code: number;
  data: unknown;
  error: unknown;
  message: string;
}
```

分页结构：

```ts
{
  items: unknown[];
  total: number;
}
```

## 接口地址配置

接口地址通过 `apps/web-ele/.env.development` 和生产环境 env 文件配置。

当前开发环境示例：

```text
VITE_GLOB_API_URL=http://www.example.com:3000/api
VITE_NITRO_MOCK=true
```

注意：

- 当 `VITE_GLOB_API_URL` 是绝对地址时，请求会直接访问该地址，不会走本地 `/api` 代理。
- 如果要使用本地代理或 mock，请将 `VITE_GLOB_API_URL` 调整为 `/api`。
- `apps/backend-mock` 的 Nitro mock 默认端口为 `5320`，并且会拦截部分 `/api/system/*` 写操作，所以 mock 更适合登录、菜单、只读联调。

## 路由和菜单

当前 `apps/web-ele` 使用后端权限模式：

```ts
accessMode: 'backend';
```

这意味着：

- 页面是否可见由后端菜单数据决定。
- 只添加本地路由文件不会自动出现在菜单中。
- 后端菜单的 `component` 必须能匹配 `apps/web-ele/src/views/**/*.vue`。

例如：

```text
后端 component: /system/menu/list
前端文件: apps/web-ele/src/views/system/menu/list.vue
```

如果路径不匹配，路由会降级到 404，并在控制台输出类似 `route component is invalid` 的提示。

## 目录说明

```text
apps/web-ele                  当前主要维护的 Element Plus 前端应用
apps/backend-mock             Vite 开发时可用的 Nitro mock 后端
apps/web-antd                 Ant Design Vue 版本
apps/web-naive                Naive UI 版本
apps/web-tdesign              TDesign 版本
docs/PROJECT_CONTEXT.md       项目恢复上下文和协作记忆
apps/web-ele/docs             Element Plus 应用专属文档
packages/@core                Vben 核心 UI、布局、偏好设置等包
packages/effects              access、request、plugins 等效果层包
packages/stores               Pinia 状态包
packages/utils                路由、菜单和通用工具
internal/vite-config          Vite 共享配置
scripts                       项目脚本和内部 CLI
```

## 开发约定

- 业务接口优先放在 `apps/web-ele/src/api`。
- 业务页面优先放在 `apps/web-ele/src/views`。
- `apps/web-ele` 相关文档统一放在 `apps/web-ele/docs`。
- 常见 CRUD 页面使用 `data.ts`、`list.vue`、`modules/form.vue` 的结构。
- 表格优先使用 `useVbenVxeGrid` 和全局 `CellOperation`。
- 表单优先使用 Vben Form 适配层，Element Plus 组件需要先在 adapter 中注册。
- 修改接口、路由、权限、模块约定或重要上下文时，同步更新 `docs/PROJECT_CONTEXT.md`。

## 参考文档

- 项目恢复上下文：`docs/PROJECT_CONTEXT.md`
- Element Plus 应用文档：`apps/web-ele/docs/README.md`
- Vben 官方文档：<https://doc.vben.pro/>
- 上游仓库：<https://github.com/vbenjs/vue-vben-admin>

## License

本仓库继承上游 Vue Vben Admin 的 MIT License，详见 `LICENSE`。
