# Cabinet 轻协作方案 — 实施计划 (v2)

> 基于 GPT-5.4 审核反馈修订。收敛范围，修正事实错误，补齐落地决策。

## 概述

将 Cabinet 从单用户知识库改造为支持小团队协作的平台。  
**核心原则：先补基础、再加协作、MVP 先行。**

**预计工期：4-5 周**

---

## 当前系统事实（已验证）

| 项目 | 实际位置/状态 |
|------|--------------|
| SQLite 数据库 | `data/.cabinet.db` (better-sqlite3, WAL mode) |
| 用户存储 | `data/.cabinet-state/users.json` |
| 认证方式 | JWT in cookie (`kb-auth`)，中间件设置 headers |
| 写权限检查 | **无** — PUT/POST/DELETE/PATCH 均无权限校验 |
| 页面 visibility | 仅 GET tree 过滤 private 页面，其他入口未检查 |
| WebSocket 事件 | 纯频道广播，**无 userId 关联**，无认证 |
| 页面形态 | 目录型 (index.md)、独立 .md、website (index.html)、代码文件、PDF/图片/视频 |
| Git API | commit / log / diff / pull / restore，均无独立权限检查 |

---

## 设计决策（本次确定）

### 编辑锁

| 决策点 | 选择 |
|--------|------|
| 加锁时机 | 首次输入时请求锁 |
| 释放 | 页面关闭/切走/心跳超时 (5 min) |
| 超时后谁可续约 | 无人可续约，直接释放 |
| 谁能强制释放 | admin 角色 |
| **写时校验** | **PUT /api/pages 必须验证当前用户持锁，否则 423 Locked** |
| 无锁写入 | 仅允许首次保存时自动获取锁（如果空闲） |

### 评论系统（MVP：页面级）

| 决策点 | 选择 |
|--------|------|
| MVP 范围 | **页面级评论**（不做行内批注，复杂度过高） |
| 支持的内容类型 | 所有有 frontmatter 的 .md 页面 |
| 不支持评论 | 代码文件、PDF、图片、视频（后续迭代） |
| 存储位置 | SQLite `comments` 表（非文件系统，避免形态差异） |
| 移动/重命名 | 评论跟随 page_path，重命名 API 同步更新 |

### 通知系统（MVP：轮询 + 应用内）

| 决策点 | 选择 |
|--------|------|
| MVP 推送方式 | **轮询** (30s interval) + 应用内通知列表 |
| WebSocket 实时推送 | Phase 2 迭代（需先解决 WS 认证 + 用户路由） |
| 通知 payload | 最小披露：仅标题 + 类型 + 时间，点击后检查权限再展示详情 |
| 多标签页 | 轮询天然支持，无需路由 |

### 权限模型（渐进式，不引入 workspace）

| 决策点 | 选择 |
|--------|------|
| MVP 范围 | **不引入 workspace.yaml**，先统一现有权限检查 |
| 权限模型 | 全局角色 (admin/editor/viewer) + 页面 owner/visibility |
| 统一入口 | 新增 `checkPageAccess(user, path, action)` 工具函数 |
| 覆盖范围 | pages、tree、upload、assets、search、git (log/diff/restore/commit/status) 全部接入 |
| 后续迭代 | 验证基础协作闭环后再评估 workspace 模型 |

---

## 技术设计

### 1. 统一读写授权层（前置条件）

**问题**: 当前仅 tree GET 过滤 private 页面，所有写入 API 无权限检查。

**新增**: `src/lib/auth/access-control.ts`

```typescript
type Action = 'read' | 'write' | 'delete' | 'admin';

interface AccessResult {
  allowed: boolean;
  reason?: string;
}

export function checkPageAccess(
  user: RequestUser | null,
  pagePath: string,
  action: Action,
  frontmatter?: { owner?: string; visibility?: string }
): AccessResult {
  // 1. 无认证模式 → 全部允许
  // 2. viewer 角色 → 仅 read
  // 3. private 页面 → 仅 owner 和 admin
  // 4. editor 角色 → read + write
  // 5. admin → 全部允许
}
```

**接入点**（全部需要修改）:
- `PUT /api/pages/[...path]` — write 检查
- `POST /api/pages/[...path]` — write 检查
- `DELETE /api/pages/[...path]` — delete 检查
- `PATCH /api/pages/[...path]` — write 检查（重命名/移动）
- `POST /api/upload/[...path]` — write 检查
- `PUT /api/assets/[...path]` — write 检查
- `POST /api/git/restore` — write 检查 + **仅 admin 可用**（restore 是 repo 级副作用：checkout + commit，脏工作树时拒绝）
- `GET /api/git/log/[...path]` — read 检查（path 已绑定页面，直接走 checkPageAccess）
- `GET /api/git/diff/[hash]` — **MVP 降级：仅 admin 可用**（diff 是 repo-wide 的，无法按页面过滤 private 内容，改为 page-scoped diff 留作后续迭代）
- `POST /api/git/commit` — **仅 admin 可用**（手动 commit 是 repo 级操作）
- `GET /api/git/commit` — **仅 admin 可用**（repo status 可能泄漏 private 文件名）
- `GET /api/pages/[...path]` — read 检查（private 页面）
- `GET /api/search` — 过滤无权限结果

---

### 2. 编辑锁（带写时校验）

**存储**: `data/.cabinet.db` 新增表

```sql
CREATE TABLE document_locks (
  page_path TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  username TEXT NOT NULL,
  acquired_at INTEGER NOT NULL,
  last_heartbeat INTEGER NOT NULL
);
```

**API**:
```
POST   /api/pages/[...path]/lock      → 请求锁（返回 200 或 423）
DELETE /api/pages/[...path]/lock      → 释放锁
GET    /api/pages/[...path]/lock      → 查询锁状态
POST   /api/pages/[...path]/heartbeat → 心跳续约
```

**写时校验**（关键闭环）:
```typescript
// PUT /api/pages/[...path]/route.ts 修改
export async function PUT(req, { params }) {
  const user = getRequestUser(req);
  const access = checkPageAccess(user, path, 'write', frontmatter);
  if (!access.allowed) return Response.json({ error: access.reason }, { status: 403 });

  // 锁校验（注意：user 结构为 { userId, username, displayName, role }）
  const lock = getLock(path);
  if (lock && lock.user_id !== user.userId) {
    return Response.json({
      error: 'Document is locked',
      lockedBy: lock.username,
      acquiredAt: lock.acquired_at
    }, { status: 423 });
  }
  // 无锁时：自动获取锁（如果空闲）
  if (!lock) acquireLock(path, user);

  await writePage(path, content, frontmatter);
  // ...
}
```

**超时清理**: daemon 定时任务（每 60s 扫描 last_heartbeat > 5min 的锁并删除）

---

### 3. 页面级评论

**存储**: SQLite（统一存储，避免文件形态差异）

```sql
CREATE TABLE comments (
  id TEXT PRIMARY KEY,
  page_path TEXT NOT NULL,
  author_id TEXT NOT NULL,
  author_name TEXT NOT NULL,
  content TEXT NOT NULL,          -- markdown 格式
  parent_id TEXT,                 -- 回复时指向父评论
  created_at INTEGER NOT NULL,
  updated_at INTEGER,
  resolved_at INTEGER,            -- 已解决的评论
  FOREIGN KEY (parent_id) REFERENCES comments(id)
);
CREATE INDEX idx_comments_page ON comments(page_path);
```

**API**:
```
GET    /api/pages/[...path]/comments     → 获取页面评论（树状）
POST   /api/pages/[...path]/comments     → 新增评论
PUT    /api/pages/[...path]/comments/:id → 编辑/解决
DELETE /api/pages/[...path]/comments/:id → 删除（仅作者或 admin）
```

**重命名/移动时路径同步**（含目录树前缀迁移）:
```typescript
// PATCH /api/pages/[...path] 重命名/移动逻辑中增加：
// 精确匹配（独立 .md 或目录页本身）
db.prepare('UPDATE comments SET page_path = ? WHERE page_path = ?')
  .run(newPath, oldPath);
db.prepare('UPDATE document_locks SET page_path = ? WHERE page_path = ?')
  .run(newPath, oldPath);

// 前缀匹配（目录下的所有子页面）
// 例如 oldPath="projects/a" → newPath="archive/a"
// 则 "projects/a/sub1" → "archive/a/sub1"
const oldPrefix = oldPath + '/';
const newPrefix = newPath + '/';
db.prepare(`
  UPDATE comments 
  SET page_path = ? || substr(page_path, ?) 
  WHERE page_path LIKE ? || '%'
`).run(newPrefix, oldPrefix.length + 1, oldPrefix);

db.prepare(`
  UPDATE document_locks 
  SET page_path = ? || substr(page_path, ?) 
  WHERE page_path LIKE ? || '%'
`).run(newPrefix, oldPrefix.length + 1, oldPrefix);

// notifications 同理
db.prepare(`
  UPDATE notifications 
  SET page_path = ? || substr(page_path, ?) 
  WHERE page_path LIKE ? || '%'
`).run(newPrefix, oldPrefix.length + 1, oldPrefix);
db.prepare('UPDATE notifications SET page_path = ? WHERE page_path = ?')
  .run(newPath, oldPath);
```

**前端 UI**:
- 编辑器右侧或底部评论面板
- 显示评论线程（支持回复）
- 评论数量 badge 显示在页面标题旁

---

### 4. 通知系统（轮询 MVP）

**存储**: SQLite

```sql
CREATE TABLE notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL,              -- 'comment', 'mention', 'lock_released'
  title TEXT NOT NULL,             -- 最小披露：不含页面内容
  page_path TEXT,
  actor_name TEXT,
  read INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL
);
CREATE INDEX idx_notif_user ON notifications(user_id, read, created_at);
```

**API**:
```
GET  /api/notifications           → 获取当前用户通知（分页）
PUT  /api/notifications/:id/read  → 标记已读
PUT  /api/notifications/read-all  → 全部标记已读
```

**触发场景**:
- 有人评论了你拥有的页面
- 评论中 @你 (`@username`)
- 你等待的编辑锁被释放

**前端**:
- Header 添加 🔔 铃铛图标 + 未读数角标
- 30s 轮询 `GET /api/notifications?unread=true`
- 下拉列表展示通知，点击跳转

**隐私保护**:
- 通知列表 API 仅返回当前用户自己的通知
- title 字段仅含 "Alice 在「页面名」添加了评论"，不含内容
- 点击后前端请求页面详情，此时走正常权限检查

---

## 实施阶段（修订后顺序）

### Phase 0: 统一授权层 (3-4 天)
- 新增 `src/lib/auth/access-control.ts`
- 所有读写 API 接入 `checkPageAccess()`
- 补充 viewer 角色的只读限制
- 测试：确认 private 页面在所有入口都不泄漏

### Phase 1: 编辑锁 (4-5 天)
- SQLite document_locks 表
- 锁 API (acquire/release/heartbeat/query)
- **PUT /api/pages 写时锁校验**
- daemon 超时清理定时任务
- 前端：锁状态横幅 + 心跳发送 + 锁释放监听
- admin 强制释放按钮
- **页面删除时清理锁** (DELETE handler 中同步删除)

### Phase 2: 页面评论 (4-5 天)
- SQLite comments 表
- 评论 CRUD API
- 重命名/移动时路径同步（含目录前缀迁移）
- **页面删除时清理评论** (DELETE handler 中级联删除)
- 前端：评论面板 + 线程 UI（支持回复）
- 评论权限检查（继承页面 read 权限才能看评论）
- **@mention 不在此阶段实现**，移至 Phase 3 通知阶段

### Phase 3: 通知系统 (3-4 天)
- SQLite notifications 表
- 通知 API (list/mark-read)
- 评论/锁释放触发通知写入
- 前端：铃铛 + 轮询 + 通知下拉列表
- @mention 解析 + 通知（评论中 `@username` → 触发通知）
- 评论面板中集成 @mention 输入（用户名自动补全）

### Phase 4: 打磨与边缘场景 (2-3 天)
- 用户禁用/删除时的数据处理（orphaned 评论/通知）
- 错误恢复（心跳失败、网络断开重连）
- Git history 展示增强（作者映射，已有 /api/git/log）
- 边缘测试：并发锁竞争、大量评论性能、目录深层移动

---

## 文件改动预估（修订后）

| 操作 | 文件 |
|------|------|
| **新增** | `src/lib/auth/access-control.ts` |
| **新增** | `src/app/api/pages/[...path]/lock/route.ts` |
| **新增** | `src/app/api/pages/[...path]/heartbeat/route.ts` |
| **新增** | `src/app/api/pages/[...path]/comments/route.ts` |
| **新增** | `src/app/api/notifications/route.ts` |
| **新增** | `src/lib/collaboration/lock-service.ts` |
| **新增** | `src/lib/collaboration/comment-service.ts` |
| **新增** | `src/lib/collaboration/notification-service.ts` |
| **新增** | `src/stores/collaboration-store.ts` |
| **新增** | `src/components/comments/comment-panel.tsx` |
| **新增** | `src/components/notifications/notification-bell.tsx` |
| **新增** | `src/components/editor/lock-banner.tsx` |
| **修改** | `src/app/api/pages/[...path]/route.ts` (权限 + 锁校验) |
| **修改** | `src/app/api/upload/[...path]/route.ts` (权限检查) |
| **修改** | `src/app/api/assets/[...path]/route.ts` (权限检查) |
| **修改** | `src/app/api/tree/route.ts` (统一过滤) |
| **修改** | `src/app/api/search/route.ts` (权限过滤) |
| **修改** | `src/app/api/git/restore/route.ts` (admin only + 脏工作树检查) |
| **修改** | `src/app/api/git/log/[...path]/route.ts` (read 权限检查) |
| **修改** | `src/app/api/git/diff/[hash]/route.ts` (admin only) |
| **修改** | `src/app/api/git/commit/route.ts` (admin only) |
| **修改** | `server/cabinet-daemon.ts` (锁超时清理任务) |
| **修改** | `src/components/editor/editor.tsx` (锁状态集成) |
| **修改** | `src/components/layout/header.tsx` (通知铃铛) |

**新增 ~12 文件，修改 ~11 文件，新增代码 ~2000-2500 行**

---

## 明确排除（本次不做）

| 排除项 | 原因 |
|--------|------|
| 行内批注 | 复杂度过高（位置漂移、Tiptap Mark），不符合 MVP |
| 工作空间模型 | 需先验证基础协作闭环，后续迭代评估 |
| WebSocket 实时推送 | 需先解决 WS 认证 + userId 路由，轮询够用 |
| 非 .md 页面评论 | PDF/图片/视频评论后续迭代 |
| 分享链接 | 权限模型稳定后再做 |

---

## 后续迭代方向（Phase 5+）

验证 MVP 协作闭环后，按需推进：
1. WebSocket 实时通知（daemon 增加 userId 认证 + 路由）
2. 行内批注（Tiptap Mark + 位置漂移处理）
3. 工作空间模型（团队空间/个人空间）
4. 非 markdown 内容评论
5. 分享链接 + 外部访客
