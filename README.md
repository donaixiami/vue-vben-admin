# 豆奶后台管理系统前端

基于 Vue Vben Admin 5.7.0 的后台管理前端。当前业务主应用是 `apps/web-ele`，使用 Vue 3、Vite、TypeScript、Element Plus、Vben Common UI 和 VXE Table。

## 项目范围

- 主应用：`apps/web-ele`
- 默认开发端口：`5777`
- 路由模式：后端动态菜单
- 后端服务：同级项目 `../dn_ht_node`
- UI 组件：优先复用 Vben 现有组合和 Element Plus

已接入用户、角色、菜单、部门、通知、文件、存储源、参数、登录日志、定时任务和聊天等模块。

## 环境要求

- Node.js：`^20.19.0 || ^22.18.0 || ^24.0.0`
- pnpm：`>=10.0.0`
- 仓库锁定版本：`pnpm@10.32.1`

## 快速开始

```powershell
pnpm.cmd install
pnpm.cmd dev:ele
```

启动前先检查是否已有实例：

```powershell
Invoke-WebRequest http://localhost:5777 -UseBasicParsing
```

已有当前项目页面时直接复用，不要重复启动。

访问地址：`http://localhost:5777`

## 环境文件

主应用配置位于：

```text
apps/web-ele/.env
apps/web-ele/.env.development
apps/web-ele/.env.production
apps/web-ele/.env.analyze
```

加载顺序遵循 Vite 规则：公共 `.env` 加上当前 mode 对应文件。

### 公共配置

```env
VITE_APP_TITLE=豆奶的后台管理
VITE_APP_NAMESPACE=soy-milk-admin
VITE_APP_STORE_SECURE_KEY=replace_with_a_random_value
VITE_GLOB_CAPTCHA_ENABLED=false
```

规范：

- 每个部署环境使用独立的 `VITE_APP_NAMESPACE`，避免浏览器缓存、Pinia 和 Token 串环境。
- `VITE_APP_STORE_SECURE_KEY` 不应使用仓库示例值。
- `VITE_*` 会被打包进浏览器，不能存放数据库密码、JWT 密钥、AccessKey 或其他服务端秘密。

### 开发环境

```env
VITE_PORT=5777
VITE_BASE=/
VITE_GLOB_API_URL=http://localhost:3000/api
VITE_GLOB_CAPTCHA_ENABLED=false
VITE_NITRO_MOCK=false
VITE_DEVTOOLS=false
VITE_INJECT_APP_LOADING=true
```

建议本地联调关闭 Nitro Mock，直接连接 NestJS 后端。

如果使用局域网域名或自定义域名，应同时把该前端来源加入后端 `CORS_ORIGIN`。

### 生产环境

```env
VITE_BASE=/
VITE_GLOB_API_URL=https://api.example.com/api
VITE_GLOB_CAPTCHA_ENABLED=true
VITE_COMPRESS=none
VITE_PWA=false
VITE_ROUTER_HISTORY=hash
VITE_INJECT_APP_LOADING=true
VITE_ARCHIVER=true
```

生产构建前必须确认 API 地址、验证码开关、路由模式和部署子路径相互匹配。

## 前后端配置对应关系

| 前端 | 后端 | 要求 |
| --- | --- | --- |
| `VITE_GLOB_API_URL` | `PORT`、反向代理路径 | 必须最终指向 `/api` |
| 前端页面 Origin | `CORS_ORIGIN` | 后端必须允许该来源 |
| `VITE_GLOB_CAPTCHA_ENABLED` | `CAPTCHA_ENABLED` | 两端必须一致 |
| 动态页面路径 | `menu.component` | 必须能映射到 `src/views/**/*.vue` |
| 按钮权限码 | `@Permissions()` | 字符串必须完全一致 |

## 请求约定

请求封装：`apps/web-ele/src/api/request.ts`。

后端响应：

```ts
interface ApiResponse<T> {
  code: number;
  data: T;
  message: string;
}
```

约定：

- `code === 0` 表示业务成功。
- `requestClient` 默认解包并返回 `data`。
- 登录后发送 `Authorization: Bearer <token>`。
- 分页接口统一返回 `{ items, total }`。
- 私有图片和文件通过受控媒体接口读取，不能拼接物理路径。
- Blob URL 使用完必须调用 `URL.revokeObjectURL()`。

## 动态路由和权限

主应用使用后端权限模式：

```ts
accessMode: 'backend';
```

页面是否可见由 `/api/system/menu/all` 决定。后端菜单组件路径示例：

```text
后端 component：/system/storage-source/list
前端文件：apps/web-ele/src/views/system/storage-source/list.vue
```

只创建 Vue 页面不会自动生成菜单，还需要：

1. 在后端 `menu` 表中增加页面菜单。
2. 增加按钮权限记录。
3. 将菜单授权给角色。
4. 重新登录或刷新动态菜单。

细粒度按钮优先使用 `v-access:code`，接口本身仍必须由后端 `@Permissions()` 强制校验。

## 页面开发约定

常规后台页面优先使用：

- `Page`
- `useVbenVxeGrid`
- `useVbenDrawer` / `useVbenModal`
- `useVbenForm`
- Element Plus
- 全局 `CellOperation`

推荐目录：

```text
apps/web-ele/src/api/<module>/
apps/web-ele/src/views/<module>/<feature>/
  data.ts
  list.vue
  modules/form.vue
  modules/__tests__/
```

规则：

- 优先组合现有组件，不复制原型 HTML 的手写布局。
- 新行为遵循 BDD 骨架确认和 TDD 红绿重构。
- 危险操作使用明确的二次确认，不能按按钮文案猜测动作。
- 列表中的临时 Blob URL、定时器和 Socket 监听必须在刷新或卸载时释放。
- API、菜单组件路径和权限码发生变化时同步更新后端和项目文档。

## 文件与存储源

存储源页面：

```text
系统管理 → 存储源管理
```

当前支持：

- 本地存储
- 阿里云 OSS

管理端只填写云密钥的环境变量引用名，不填写真实 AccessKey。新增来源后先执行健康检查，再启用；新增来源不会迁移历史文件。

### 新驱动前端接入示例

新存储类型不能只在下拉框中增加选项，后端必须先实现并注册驱动。以后端新增的七牛云 `qiniu_kodo` 为例，前端需要同步修改：

1. `apps/web-ele/src/api/system/storage-source.ts`：把 `Driver` 扩展为 `'local' | 'aliyun_oss' | 'qiniu_kodo'`。
2. `views/system/storage-source/data.ts`：增加“七牛云 Kodo”选项和动态字段。
3. `modules/storage-source-form.ts`：只把七牛云允许的字段组装进 `config`。
4. 补齐驱动切换、编辑锁定、密钥明文不进入 payload 的测试。

驱动选项示例：

```ts
const DRIVER_LABELS = {
  local: '本地存储',
  aliyun_oss: '阿里云 OSS',
  qiniu_kodo: '七牛云 Kodo',
};
```

七牛云动态字段：

```text
region
bucket
accessKeyRef
secretKeyRef
keyPrefix
```

提交示例：

```json
{
  "code": "qiniu_primary",
  "name": "七牛云主存储",
  "driver": "qiniu_kodo",
  "priority": 200,
  "enabled": false,
  "isFallback": false,
  "config": {
    "region": "z0",
    "bucket": "soy-milk-private",
    "accessKeyRef": "QINIU_ACCESS_KEY",
    "secretKeyRef": "QINIU_SECRET_KEY",
    "keyPrefix": "uploads/"
  }
}
```

管理端不得提供真实 AccessKey/SecretKey 输入框。完整的后端驱动、注册、校验和验收示例见 `../dn_ht_node/README.md` 的“七牛云 Kodo 接入示例”。

文件管理中的图片“查看”动作使用列表返回的短期 `previewMediaRef` 拉取 Blob，不拼接物理路径。关闭预览、刷新列表或离开页面时必须释放 Blob URL；非图片不显示查看动作。

## 常用命令

```powershell
# 启动 Element Plus 主应用
pnpm.cmd dev:ele

# 类型检查
pnpm.cmd -F @vben/web-ele run typecheck

# 聚焦测试
pnpm.cmd exec vitest run apps/web-ele/src/views/system/storage-source

# 全量单元测试
pnpm.cmd test:unit

# 生产构建
pnpm.cmd build:ele

# 代码检查与格式化
pnpm.cmd lint
pnpm.cmd format
```

## 目录结构

```text
apps/web-ele/             Element Plus 主应用
apps/backend-mock/        Nitro Mock，仅用于独立前端开发
packages/@core/           Vben 核心能力
packages/effects/         access、request 等效果层
packages/stores/          Pinia 状态
packages/utils/           路由与通用工具
docs/PROJECT_CONTEXT.md   项目上下文与长期约定
```

## 生产发布检查

- 确认 `.env.production` 没有开发域名和 Mock 配置。
- 执行类型检查、全量测试和生产构建。
- 确认后端 CORS、HTTPS、反向代理和 `/api` 路径正确。
- 使用普通角色验证菜单和按钮权限，不只测试超级管理员。
- 验证登录、刷新 Token、文件上传、私有图片、存储健康检查和聊天连接。
- 发布后检查浏览器控制台和失败请求，禁止忽略 404、CORS 与动态组件错误。

## 常见问题

### 页面存在但菜单不显示

检查后端菜单记录、角色授权以及 `menu.component` 是否与 Vue 文件路径一致。

### 请求仍然访问旧域名

修改正确的 mode 文件后重启 Vite。`VITE_*` 在启动或构建时注入，运行中修改不会自动生效。

### 本地接口被 Mock 拦截

将 `VITE_NITRO_MOCK=false`，重启前端并确认 `VITE_GLOB_API_URL` 指向真实后端。

### 图片接口成功但页面不显示

私有媒体通常需要携带 Token 获取 Blob，再创建本地 URL；同时检查 CORS，避免在通配来源下混用凭证模式。

更多背景见 [docs/PROJECT_CONTEXT.md](docs/PROJECT_CONTEXT.md)。上游框架文档见 [Vben 官方文档](https://doc.vben.pro/)。

## License

本仓库沿用 Vue Vben Admin 的 MIT License，详见 `LICENSE`。
