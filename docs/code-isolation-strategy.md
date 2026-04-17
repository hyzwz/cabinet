# 代码隔离策略：降低上游合并冲突

## 背景

本 fork (hyzwz/cabinet) 在上游 (hilash/cabinet) 基础上增加了两大核心自定义功能：

1. **i18n 国际化** — 中英文双语，43 个组件文件引入 `useLocale()` 调用
2. **多用户认证 (Auth)** — JWT 认证、角色管理、中间件保护

2026-04-17 首次上游合并（27 commits）中，因上游对 UI 组件做了结构性重构（adapter 架构、ConversationSessionView），导致 4 个 UI 组件的 i18n 翻译丢失。本文档提出系统性的代码隔离方案，从源头降低未来合并冲突。

## 现状分析

### i18n 层

| 指标 | 数值 |
|------|------|
| 核心文件 | 3 个（locale-provider.tsx, language-switcher.tsx, messages.ts） |
| 消费者文件 | 43 个组件直接 `import { useLocale }` |
| 翻译键 | 828 个 |
| 隔离评分 | 🟡 5/10 |

**问题**：i18n 采用"直接注入"模式 — 每个上游组件内部都插入了 `useLocale()` 调用和 `t()` 字符串替换。上游一旦重构组件结构（新增/删除 props、重命名组件、改变渲染逻辑），合并必定冲突。

**当前注入方式**（高耦合）：
```typescript
// 直接修改上游组件 — 每个文件都成为冲突点
import { useLocale } from "@/components/i18n/locale-provider"

export function AgentsWorkspace() {
  const { t } = useLocale()
  return <h1>{t("agents.title")}</h1>  // 替换原来的 "Agents"
}
```

### Auth 层

| 指标 | 数值 |
|------|------|
| 核心文件 | 8 个（middleware, jwt, store, types 等） |
| API 路由 | 7 个端点 |
| 消费者文件 | 6 个 |
| 隔离评分 | 🟡 7/10 |

**优点**：Auth 大部分是全新文件（fork 专属），不修改上游代码。
**风险点**：`src/middleware.ts` 是全新文件但拦截所有请求；如果上游也添加 middleware，会冲突。

### 合并冲突热力图

```
冲突风险: 🔴 高  🟡 中  🟢 低

src/app/layout.tsx                        🔴 — 包裹了 LocaleProvider + AuthInitializer
src/app/agents/conversations/[id]/page.tsx 🔴 — 大量 getMessage() 调用
src/components/agents/agents-workspace.tsx 🔴 — i18n 丢失（已取上游版本）
src/components/jobs/jobs-manager.tsx       🔴 — i18n 丢失（已取上游版本）
src/components/tasks/task-detail-panel.tsx 🔴 — i18n 丢失（已取上游版本）
src/components/layout/status-bar.tsx       🔴 — i18n 丢失（已取上游版本）
src/components/settings/settings-page.tsx  🟡 — 保留了我们的 i18n 版本
src/middleware.ts                          🟡 — fork 专属，但上游可能添加
src/stores/auth-store.ts                  🟢 — fork 专属文件
src/components/i18n/*                     🟢 — fork 专属文件
src/lib/auth/*                            🟢 — fork 专属文件
src/app/api/auth/*                        🟢 — fork 专属文件
```

---

## 策略一：i18n Wrapper 模式（推荐 ⭐）

### 目标

将 i18n 从"直接修改上游组件"改为"包装上游组件"，使上游组件保持原样。

### 原理

```
当前模式（高冲突）:
  上游组件.tsx ← 直接插入 useLocale() 和 t() 调用
  
目标模式（低冲突）:
  上游组件.tsx ← 保持不变
  localized/上游组件.tsx ← 包装层，注入翻译后的 props
```

### 实施方案

#### 方案 A：Props 注入（适合有明确文本 props 的组件）

```typescript
// src/components/localized/localized-header.tsx
import { Header } from "@/components/layout/header"
import { useLocale } from "@/components/i18n/locale-provider"

export function LocalizedHeader() {
  const { t } = useLocale()
  return (
    <Header
      title={t("header.title")}
      searchPlaceholder={t("header.search")}
      exportLabel={t("header.export")}
    />
  )
}
```

**优点**：上游 Header 完全不修改，合并零冲突。
**缺点**：需要上游组件支持文本 props（很多组件硬编码了文本）。

#### 方案 B：String Map 覆盖（适合文本硬编码的组件）

```typescript
// src/lib/i18n/string-overrides.ts
// 运行时替换 — 不修改源文件

type StringMap = Record<string, string>

const overrides: Record<string, StringMap> = {
  "agents-workspace": {
    "Conversations": "对话列表",
    "New Agent": "新建代理",
    "Start Session": "开始会话",
  },
  // ...
}

export function getOverrides(component: string, locale: string): StringMap {
  return locale === "en" ? {} : overrides[component] ?? {}
}
```

**优点**：完全不修改上游文件。
**缺点**：依赖字符串匹配，上游改文案时需同步更新。

#### 方案 C：最小注入 + 集中管理（实用折中 ⭐ 推荐）

```typescript
// 上游组件中只保留一行 hook 调用，所有翻译逻辑集中到独立文件

// src/lib/i18n/component-strings.ts — 集中管理所有组件的翻译映射
export function getAgentsStrings(t: TFunction) {
  return {
    title: t("agents.title"),
    newAgent: t("agents.newAgent"),
    startSession: t("agents.startSession"),
    // ... 该组件所有字符串
  }
}

// 上游组件中 — 最小改动（仅 2 行）
import { useLocale } from "@/components/i18n/locale-provider"
import { getAgentsStrings } from "@/lib/i18n/component-strings"

export function AgentsWorkspace() {
  const { t } = useLocale()
  const s = getAgentsStrings(t)
  // 使用 s.title 代替 "Agents"
  return <h1>{s.title}</h1>
}
```

**优点**：
- 对上游组件的修改极小（仅 2 行 import + 1 行变量声明）
- 所有翻译逻辑集中在 `component-strings.ts`，不散布在 43 个文件中
- 合并冲突时，最多只需重新添加 2 行，不需要理解整个翻译映射

**缺点**：仍需修改上游文件，但改动面极小。

### 预期效果

| 方案 | 冲突减少 | 实施成本 | 推荐场景 |
|------|---------|---------|---------|
| A: Props 注入 | ~90% | 高（需重构组件接口） | 新建组件 |
| B: String Map | ~95% | 中（需维护映射表） | 大量硬编码文本的组件 |
| C: 最小注入 | ~70% | 低（只需重构现有代码） | **现有 43 个组件的迁移** |

---

## 策略二：Auth 命名空间化

### 目标

将 Auth 相关代码统一到清晰的命名空间下，防止与上游未来可能添加的认证系统碰撞。

### 当前结构

```
src/
  middleware.ts              ← 根级别，高碰撞风险
  stores/auth-store.ts       ← 与上游 stores 同级
  lib/auth/jwt.ts           ← 已有子目录，较好
  lib/auth/request-user.ts
  lib/storage/user-io.ts    ← 混在 storage 工具中
  components/auth/           ← 已有子目录，较好
  app/api/auth/              ← 已有子目录，较好
  types/users.ts             ← 与上游 types 同级
```

### 目标结构

```
src/
  middleware.ts              ← 保持（Next.js 约定位置），但内容模块化
  middleware/
    auth-middleware.ts       ← 提取认证逻辑到此
  stores/
    auth/                    ← 命名空间化
      user.store.ts
      session.store.ts
      index.ts               ← barrel export
  lib/auth/                  ← 保持不变（已良好隔离）
    jwt.ts
    request-user.ts
    user-io.ts               ← 从 storage/ 移入
    index.ts                 ← barrel export
  components/auth/           ← 保持不变（已良好隔离）
  app/api/auth/              ← 保持不变（已良好隔离）
  types/auth.ts              ← 从 users.ts 改名，语义更清晰
```

### 关键改动

#### 1. 模块化 Middleware

```typescript
// src/middleware/auth-middleware.ts
export interface AuthMiddlewareConfig {
  protectedPaths: RegExp[]
  publicPaths: string[]
  loginPath: string
}

export function createAuthMiddleware(config: AuthMiddlewareConfig) {
  return async (req: NextRequest): Promise<NextResponse | null> => {
    // 当前 middleware.ts 中的认证逻辑移至此处
    // 返回 null 表示放行，返回 NextResponse 表示拦截
  }
}

// src/middleware.ts — 变为薄壳
import { createAuthMiddleware } from "@/middleware/auth-middleware"

const authMiddleware = createAuthMiddleware({
  protectedPaths: [/^\/(?!api\/auth|api\/health|_next|favicon).*$/],
  publicPaths: ["/login", "/api/auth", "/api/health"],
  loginPath: "/login",
})

export async function middleware(req: NextRequest) {
  return authMiddleware(req) ?? NextResponse.next()
}
```

**好处**：如果上游添加自己的 middleware，只需在 `middleware.ts` 中组合两个中间件，不需要合并复杂逻辑。

#### 2. Barrel Export

```typescript
// src/lib/auth/index.ts
export { jwtSign, jwtVerify } from "./jwt"
export { getRequestUser } from "./request-user"
export { readUsers, writeUser, deleteUser, hashPassword, verifyPassword } from "./user-io"
export type { User, SafeUser, JwtPayload, UserRole } from "@/types/auth"
```

所有 auth 消费者只需 `import { ... } from "@/lib/auth"`，内部重构不影响外部。

---

## 策略三：i18n 消息目录分片

### 目标

将 828 键的巨型 `messages.ts`（1921 行）拆分为按功能域的小文件，降低合并冲突概率，提升可维护性。

### 当前结构

```
src/lib/i18n/
  messages.ts    ← 1921 行，828 个键，所有翻译集中在一个文件
```

### 目标结构

```
src/lib/i18n/
  messages/
    index.ts          ← 合并所有 namespace 导出
    core.ts           ← 通用 UI（按钮、确认、取消、加载...）
    layout.ts         ← header, sidebar, status-bar
    editor.ts         ← 编辑器工具栏、预览
    agents.ts         ← 代理相关
    tasks.ts          ← 任务看板
    settings.ts       ← 设置页面
    auth.ts           ← 登录、注册、用户管理
    home.ts           ← 首页
    search.ts         ← 搜索对话框
    cabinets.ts       ← Cabinet 工作空间视图
    mission-control.ts ← Mission Control 面板
  messages.ts         ← 保留为 re-export（向后兼容）
```

### 合并逻辑

```typescript
// src/lib/i18n/messages/index.ts
import { coreMessages } from "./core"
import { layoutMessages } from "./layout"
import { editorMessages } from "./editor"
import { agentsMessages } from "./agents"
// ...

export const messages: Messages = deepMerge(
  coreMessages,
  layoutMessages,
  editorMessages,
  agentsMessages,
  // ...
)
```

### 好处

- 上游重构某个组件时，只有对应的翻译分片可能需要更新
- 新增功能翻译只需添加新分片文件
- Code review 时更容易定位翻译变更的范围

---

## 策略四：创建 Fork 自定义清单

### 目标

维护一份机器可读的清单文件，标注哪些文件是 fork 专属、哪些是修改过的上游文件，用于合并时的快速判断。

### 文件

```jsonc
// .fork-manifest.json
{
  "version": 1,
  "description": "hyzwz/cabinet fork 自定义文件清单",
  "categories": {
    "fork-only": {
      "description": "Fork 专属文件，上游不存在",
      "files": [
        "src/components/i18n/locale-provider.tsx",
        "src/components/i18n/language-switcher.tsx",
        "src/lib/i18n/messages.ts",
        "src/middleware.ts",
        "src/stores/auth-store.ts",
        "src/lib/auth/jwt.ts",
        "src/lib/auth/request-user.ts",
        "src/lib/storage/user-io.ts",
        "src/components/auth/auth-initializer.tsx",
        "src/components/auth/user-menu.tsx",
        "src/app/api/auth/**",
        "src/app/login/page.tsx",
        "src/types/users.ts",
        "src/components/settings/users-tab.tsx",
        "Dockerfile",
        "docker-compose.yml",
        "docs/upstream-sync-guide.md",
        "docs/code-isolation-strategy.md",
        ".gitattributes"
      ]
    },
    "fork-modified": {
      "description": "修改过的上游文件（合并时需注意）",
      "files": [
        "src/app/layout.tsx",
        "src/lib/storage/path-utils.ts",
        "src/lib/agents/provider-registry.ts",
        "src/components/layout/header-actions.tsx",
        "src/components/settings/settings-page.tsx",
        "package.json"
      ]
    },
    "i18n-injected": {
      "description": "注入了 useLocale() 的上游组件（合并重点关注）",
      "count": 43,
      "pattern": "grep -r 'useLocale' src/ --include='*.tsx' -l"
    },
    "needs-re-i18n": {
      "description": "上次合并中丢失 i18n 的文件，需要重新国际化",
      "files": [
        "src/components/agents/agents-workspace.tsx",
        "src/components/jobs/jobs-manager.tsx",
        "src/components/tasks/task-detail-panel.tsx",
        "src/components/layout/status-bar.tsx"
      ]
    }
  }
}
```

### 用途

1. **合并前**：快速查看哪些文件是 fork 专属（不可能冲突）、哪些是修改过的（需要注意）
2. **合并后**：检查 `needs-re-i18n` 列表，确认是否需要重新添加翻译
3. **CI/CD**：可编写脚本验证 fork-only 文件未被上游覆盖

---

## 实施优先级

| 优先级 | 策略 | 预期冲突减少 | 实施成本 | 建议时机 |
|--------|------|-------------|---------|---------|
| **P0** | 创建 `.fork-manifest.json` | — | 极低 | 立即 |
| **P1** | i18n 消息目录分片（策略三） | ~20% | 低 | 本周 |
| **P2** | i18n 最小注入模式（策略一 方案 C） | ~70% | 中 | 下次合并前 |
| **P3** | Auth 命名空间化（策略二） | ~40% | 中 | 下次合并前 |
| **P4** | Middleware 模块化（策略二的子项） | ~30% | 低 | 下次合并前 |

---

## 待恢复 i18n 的组件

以下 4 个组件在 2026-04-17 合并中因上游结构性重构而丢失了 i18n 翻译：

| 组件 | 文件路径 | 丢失原因 |
|------|---------|---------|
| AgentsWorkspace | `src/components/agents/agents-workspace.tsx` | 上游引入 ConversationSessionView 替代 WebTerminal+ConversationResultView |
| JobsManager | `src/components/jobs/jobs-manager.tsx` | 上游引入 ConversationSessionView |
| TaskDetailPanel | `src/components/tasks/task-detail-panel.tsx` | 上游引入 ConversationSessionView |
| StatusBar | `src/components/layout/status-bar.tsx` | 上游重构 provider 状态显示逻辑 |

**恢复方式**：
1. 对照 `src/lib/i18n/messages.ts` 中已有的翻译键
2. 在组件中添加 `useLocale()` hook 和 `t()` 调用
3. 如果采用策略一方案 C，则使用 `component-strings.ts` 集中管理

---

## 长期目标

```
合并冲突数量趋势（目标）

今天:     ████████████  12 个冲突文件
策略实施后: ████         3-4 个冲突文件
理想状态:   ██           1-2 个冲突文件（仅 layout.tsx 等少数入口文件）
```

通过以上策略的逐步实施，将 fork 的维护成本从"每次合并需要数小时手动解决冲突"降低到"每次合并仅需几分钟确认"。
