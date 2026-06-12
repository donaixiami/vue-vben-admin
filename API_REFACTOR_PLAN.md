# API 接口规范化方案

## 项目说明
- **前端项目**: vue-vben-admin (apps/web-ele)
- **后端项目**: dn_ht_node
- **目标**: 规范化前端所有API接口，确保与后端接口完全对应

## 后端接口概览（基于 openapi-spec.json）

### 1. 认证模块 (Auth)
- `POST /api/auth/login` - 用户登录
- `POST /api/auth/logout` - 用户登出

### 2. 用户模块 (User)
- `GET /api/system/user/info` - 获取用户信息
- `GET /api/system/user/list` - 获取用户列表
- `GET /api/system/user/codes` - 获取用户权限码列表
- `GET /api/system/user/{id}` - 根据ID获取用户信息
- `POST /api/system/user` - 创建用户
- `PUT /api/system/user/{id}` - 更新用户
- `PUT /api/system/user/status/{id}` - 修改用户状态
- `DELETE /api/system/user/{id}` - 删除用户

### 3. 角色模块 (Role)
- `GET /api/system/role/list` - 获取角色列表
- `POST /api/system/role` - 创建角色
- `PUT /api/system/role/{id}` - 修改角色
- `DELETE /api/system/role/{id}` - 删除角色

### 4. 菜单模块 (Menu)
- `GET /api/system/menu/all` - 获取树形菜单列表
- `GET /api/system/menu/list` - 获取菜单列表
- `GET /api/system/menu/tree` - 获取全量树形菜单列表
- `GET /api/system/menu/name-exists` - 查询菜单名称是否存在
- `GET /api/system/menu/path-exists` - 查询路径是否存在
- `POST /api/system/menu` - 创建菜单
- `PUT /api/system/menu/{id}` - 修改菜单
- `DELETE /api/system/menu/{id}` - 删除菜单

### 5. 部门模块 (Dept)
- `GET /api/system/dept/list` - 获取部门列表
- `POST /api/system/dept` - 创建部门
- `PUT /api/system/dept/{id}` - 修改部门
- `DELETE /api/system/dept/{id}` - 删除部门

### 6. 字典模块 (Dictionary)
- `GET /api/system/dictionary/list` - 获取字典列表
- `GET /api/system/dictionary/identifier-exists` - 查询标识符是否存在
- `POST /api/system/dictionary` - 创建字典
- `PUT /api/system/dictionary/{id}` - 修改字典
- `DELETE /api/system/dictionary/{id}` - 删除字典

### 7. 分类模块 (Category Type)
- `GET /api/system/category-type/list` - 获取分类列表
- `GET /api/system/category-type/tree` - 获取分类树
- `POST /api/system/category-type` - 创建分类
- `PUT /api/system/category-type/{id}` - 修改分类
- `DELETE /api/system/category-type/{id}` - 删除分类

### 8. 通知模块 (Notifications)
- `GET /api/system/notifications/list` - 获取消息列表
- `GET /api/system/notifications/{id}` - 获取消息
- `POST /api/system/notifications` - 创建消息
- `PUT /api/system/notifications/{id}` - 修改消息
- `DELETE /api/system/notifications/{id}` - 删除消息

### 9. 文章模块 (Article)
- `GET /api/article/list` - 获取文章列表
- `POST /api/article` - 创建文章
- `PUT /api/article/{id}` - 修改文章
- `DELETE /api/article/{id}` - 删除文章

### 10. 文件上传模块 (Upload)
- `POST /api/file/upload` - 上传文件到本地
- `POST /api/file/upload-oss` - 上传文件到OSS
- `POST /api/file/create-bucket` - 创建OSS Bucket
- `GET /api/file/list` - 请求文件列表
- `GET /api/file/{id}` - 获取文件详情

### 11. 聊天模块 (Chat)
- `POST /api/chat/session` - 创建聊天会话
- `GET /api/chat/history/{sessionId}` - 获取聊天历史

## 前端接口现状分析

### ✅ 已规范的模块
1. **认证模块** (`apps/web-ele/src/api/core/auth.ts`)
   - ✅ 登录、登出、刷新token、权限码获取

2. **用户信息** (`apps/web-ele/src/api/core/user.ts`)
   - ✅ 获取用户信息

3. **角色模块** (`apps/web-ele/src/api/system/role.ts`)
   - ✅ CRUD操作完整

4. **部门模块** (`apps/web-ele/src/api/system/dept.ts`)
   - ✅ CRUD操作完整

5. **字典模块** (`apps/web-ele/src/api/system/dictionary.ts`)
   - ✅ CRUD操作完整

6. **分类模块** (`apps/web-ele/src/api/system/category-type.ts`)
   - ✅ CRUD操作完整

7. **通知模块** (`apps/web-ele/src/api/system/notifications.ts`)
   - ✅ CRUD操作完整

### ⚠️ 需要优化的模块

#### 1. 菜单模块 (`apps/web-ele/src/api/system/menu.ts`)
**问题**:
- ❌ 存在重复函数 `getMenuList` 和 `getMenuList_1`
- ❌ 缺少获取树形菜单数据的接口 `/api/system/menu/tree`

**修复方案**:
```typescript
// 重命名函数，明确用途
getMenuList() -> getMenuTree()  // 对应 /api/system/menu/all
getMenuList_1() -> getMenuList()  // 对应 /api/system/menu/list
// 新增
getMenuTreeData() // 对应 /api/system/menu/tree
```

#### 2. 用户模块 (`apps/web-ele/src/api/system/user.ts`)
**问题**:
- ❌ 缺少根据ID获取单个用户的接口
- ❌ 注释错误（写的是"角色"应该是"用户"）

**修复方案**:
```typescript
// 新增
getUserById(id: string) // GET /api/system/user/{id}
// 修复注释
```

#### 3. 文章模块 (`apps/web-ele/src/api/article-manage/article-list.ts`)
**问题**:
- ❌ 注释错误（复制的角色模块注释）
- ❌ 缺少根据ID获取文章详情的接口

**修复方案**:
```typescript
// 修复注释
// 新增
getArticleById(id: string) // GET /api/article/{id}
```

#### 4. 文件上传模块 (`apps/web-ele/src/api/system/file.ts`)
**问题**:
- ❌ 接口路径可能不规范
- ❌ 缺少文件列表和详情查询接口

**需要检查并完善**

### 🆕 缺失的模块

1. **聊天模块** - 需要新建 `apps/web-ele/src/api/chat/index.ts`
2. **文件管理完善** - 需要完善 OSS 上传等接口

## 修复优先级

### P0 (高优先级 - 影响功能)
1. ✅ 修复认证模块退出登录token问题 (已完成)
2. 🔧 修复菜单模块重复函数命名
3. 🔧 用户模块新增获取单个用户接口

### P1 (中优先级 - 规范性)
1. 修复所有注释错误
2. 统一命名规范

### P2 (低优先级 - 扩展功能)
1. 补充聊天模块接口
2. 完善文件上传模块

## 命名规范建议

### API函数命名规范
```typescript
// 获取列表
get{Module}List() 
// 获取树形结构
get{Module}Tree()
// 根据ID获取
get{Module}ById(id)
// 创建
create{Module}(data)
// 更新
update{Module}(id, data)
// 删除
delete{Module}(id)
// 检查存在性
is{Field}Exists(value, id?)
```

### TypeScript类型命名规范
```typescript
// 命名空间
export namespace System{Module}Api { }
// 接口类型
export interface System{Module} { }
// DTO类型
export interface Create{Module}Dto { }
export interface Update{Module}Dto { }
```

## 下一步行动

1. 修复菜单模块命名问题
2. 补充缺失的接口函数
3. 修正所有注释错误
4. 统一代码风格
5. 提交规范化改动

---
**创建时间**: 2026-06-13
**负责人**: Claude Code
