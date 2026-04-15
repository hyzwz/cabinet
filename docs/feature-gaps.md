# Cabinet 功能完成度清单

> 生成时间：2026-04-15 | 基于 PRD.md 交叉审计代码库

## 概览

PRD Phase 1（Foundation）和 Phase 2（Onboarding）**已全部完成**。
超额交付了 9 项非 PRD 功能（多 Cabinet、CLI、Registry、i18n 等）。
以下是尚未完成或需要补充的功能清单。

---

## 现有 Demo 内容

项目内置了 3 个演示用 Cabinet，用于展示多 Cabinet 嵌套、Agent 团队协作、Job 调度等核心功能。

### Demo 1: Root Cabinet（jyutech.cn）

根 Cabinet，包含基础团队和入门文档。

| 内容 | 详情 |
|------|------|
| Agent × 5 | CEO、CTO、Content Marketer、Editor、Researcher |
| Job | 无 |
| 内容页 | `index.md` + `getting-started/`（3 篇入门指南） |
| Chat 频道 × 4 | #general、#content、#marketing、#leadership（均为空） |

### Demo 2: Text Your Mom（example-text-your-mom）

完整的 B2C 创业公司模拟，用于测试嵌套 Cabinet 行为。包含 3 层组织结构。

| 层级 | Cabinet | Agent | Job | 内容页 |
|------|---------|-------|-----|--------|
| 根 | text-your-mom-root | CEO、CFO、COO、CTO（4 人） | 3 个（周报、月度 Runway、运营复盘） | company/ 下 9 个模块（战略/财务/KPI/运营/团队等） |
| 子 | app-development | CTO、DevOps、PM、QA（4 人） | 3 个（日 Bug Triage、发版检查、周 Sprint） | backlog/、prds/（4 份 PRD）、roadmap/、release-checklist/ |
| 子 | marketing/reddit | Copywriter、Data Analyst、Growth Marketer、Researcher（4 人） | 无 | analytics/、comment-opportunities/、experiments/ |
| 子 | marketing/tiktok | Image Creator、Post Optimizer、Script Writer、Trend Scout（4 人） | 无 | analytics/、briefs/ |

**合计：** 16 个 Agent、6 个 Job、30+ 内容页

### Demo 3: VC OS（vc-os）

模拟 $200M Fund II VC 基金运营系统（Warp Ventures）。

| 层级 | Cabinet | Agent | Job | 内容页 |
|------|---------|-------|-----|--------|
| 根 | vc-os-root | Analyst、Deal Scout、Managing Partner、Portfolio Manager（4 人） | 5 个（日晨报、竞品情报、LP 月报、Portfolio 新闻、周合伙人会） | index.md |
| 子 | deal-flow | 继承父级 | 无 | pipeline-review 文档 |
| 子 | intelligence | 继承父级 | 无 | daily-brief 文档 |
| 子 | portfolio | 继承父级 | 无 | index.md |
| 模块 | competitors/、events/、finance/、lps/、programs/、team/ | — | — | 含 Q1 报告、LP 通信等 |

**合计：** 4 个 Agent、5 个 Job、8 个模块

### Demo 数据汇总

| 指标 | 数量 |
|------|------|
| Cabinet（根 + 子） | 3 根 + 5 子 = **8 个** |
| Agent 总数 | **25 个**（去重） |
| Job 总数 | **14 个** |
| 内容页 | **50+ 篇** |
| Chat 频道 | **4 个** |
| 知识模块 | **12+ 个** |

---

## ❌ 未实现

### 1. Skill 管理系统（PRD Phase 3）

| 项目 | 状态 |
|------|------|
| Agent `/skills/` 目录结构 | ✅ scaffold 已创建 |
| Skill `.md` 文件格式 | ✅ PRD 定义了 |
| Agent Detail 中 "Skills" Tab | ❌ 没有（只有 definition/jobs/sessions 三个 tab） |
| Skill CRUD API (`/api/agents/.../skills`) | ❌ 不存在 |
| Skill 浏览/添加 UI | ❌ 不存在 |
| Skill 运行时集成（注入到 agent prompt） | ❌ 未实现 |

**影响：** Agent 无法通过 UI 管理技能。磁盘上的 skills 目录始终为空。

### 2. Email 通知

| 项目 | 状态 |
|------|------|
| 通知服务框架 | ✅ `notification-service.ts` 已有 |
| Email 通道配置 UI | ✅ 在 settings 中列出 |
| Email 发送逻辑 | ❌ 仅有配置项，无实际发送代码 |

### 3. 浏览器推送通知

| 项目 | 状态 |
|------|------|
| 通道配置 UI | ✅ 在 settings 中列出 |
| Service Worker / Push API | ❌ 未实现 |
| 推送逻辑 | ❌ 仅有配置项 |

---

## ⚠️ 部分实现

### 4. 备份恢复

| 项目 | 状态 |
|------|------|
| `createDataBackup()` | ✅ 完整实现，带时间戳 |
| `createProjectSnapshotBackup()` | ✅ 完整实现 |
| 更新前自动备份 | ✅ `update-service.ts` 会先备份 |
| Settings 中手动备份按钮 | ✅ 已有 |
| **恢复 UI** | ❌ 没有。只能手动从文件系统恢复 |
| **恢复 API** | ❌ 没有 `/api/system/restore` 端点 |

### 5. Slack 集成

| 项目 | 状态 |
|------|------|
| 内部 Slack-like 消息系统 | ✅ `slack-manager.ts`，JSONL 存储 |
| 外部 Slack Webhook 推送 | ✅ 通知服务支持 |
| 接收外部 Slack 事件（@mention） | ✅ `/api/agents/slack` route |
| Agent Heartbeat `SLACK [channel]: msg` | ✅ 解析并投递 |
| **向外部 Slack 主动发消息** | ❌ 仅单向接收 |
| **Slack OAuth 完整集成** | ❌ 仅 Webhook，非完整 Slack App |
| **内部频道 UI** | ⚠️ 有组件但未深度集成到主界面 |

### 6. 通知系统

| 通道 | 状态 |
|------|------|
| Telegram Bot | ✅ 完整实现 |
| Slack Webhook | ✅ 完整实现 |
| Email | ❌ 仅配置项 |
| 浏览器推送 | ❌ 仅配置项 |
| 通知测试端点 | ✅ `/api/agents/config/notifications/test` |

### 7. Agent Memory 系统

| 项目 | 状态 |
|------|------|
| `readMemory()` / `writeMemory()` | ✅ `persona-manager.ts` |
| Heartbeat 自动写入 context/decisions/learnings | ✅ `heartbeat.ts` 解析结构化输出 |
| Stats 追踪（heartbeat 次数、最近运行） | ✅ |
| Mission Control 中查看 Memory | ✅ 只读 tab |
| **主 Agent Detail 页面查看 Memory** | ❌ 只在旧 mission-control 组件中 |
| **UI 编辑 Memory** | ❌ 完全只读 |

### 8. 任务看板

| 项目 | 状态 |
|------|------|
| 任务 CRUD（文件存储） | ✅ `task-inbox.ts` |
| 看板视图（inbox/running/completed/failed） | ✅ `tasks-board.tsx` |
| 创建任务对话框 | ✅ |
| 任务详情面板 | ✅ |
| 日历/列表视图切换 | ✅ |
| Agent Heartbeat 创建任务 (`TASK_CREATE`) | ✅ |
| **拖拽排序** | ❌ 无拖拽交互 |
| **任务优先级 UI** | ⚠️ 数据支持但 UI 展示有限 |

---

## ✅ 已完成（核心功能）

| 功能 | 备注 |
|------|------|
| Agent 系统（创建/编辑/删除/列表/详情） | 完整 CRUD + Org Chart |
| Agent Library（~20 模板） | CEO, COO, CTO, Content Marketer 等 |
| Agent 执行（Claude Code CLI） | Daemon 调度 + PTY + 输出捕获 |
| Job 调度（node-cron） | 递归 Cabinet 发现 + 多 Cabinet 调度 |
| Heartbeat 系统 | 定时心跳 + 结构化输出解析 |
| Onboarding 向导（5 个问题） | 完整流程含团队建议和创建 |
| WYSIWYG 编辑器（Tiptap） | Markdown 双向转换 + Toolbar |
| 侧栏文件树 + 拖拽 | 完整树操作 + 右键菜单 |
| 全文搜索 (Cmd+K) | 标题 + 内容 + 标签过滤 |
| Git 集成 | 自动提交 + 历史 + Diff + 恢复 |
| Web 终端 (xterm.js) | WebSocket PTY + 多 Tab + 会话保持 |
| AI 面板 (Claude 编辑) | @ mention + 直接文件编辑 |
| Docker 部署 | 字体自托管 + Host Daemon 架构 |
| 多 Cabinet 系统 | 递归发现 + 可见性深度 + 创建对话框 |
| `cabinetai` CLI（7 命令） | create/run/import/list/doctor/update/uninstall |
| Registry 浏览器 | 8+ 模板 + GitHub 导入 |
| i18n 中英文 | 客户端 locale + 语言切换 |
| Electron 桌面应用 | macOS DMG + 自动更新 + 代码签名 |
| CI/CD (GitHub Actions) | tag 触发 → NPM + GitHub Release + Electron |
| 嵌入式应用 (.app 全屏) | iframe 渲染 + 自动折叠侧栏 |
| Mermaid 图表查看器 | 缩放/平移 + 主题同步 |
| Agent Gallery | 扫描 agent 产出物 + 类型检测 |
| Inter-Agent 通信 | 消息投递 + 任务创建 + Slack 转发 |
| 版本更新检查 | 对比 release manifest + 自动备份 |
| 链接外部仓库 (.repo.yaml) | Symlink + Git 检测 + 上下文注入 |

---

## 超额交付（非 PRD 功能）

这些功能在原始 PRD 中未规划，但已经实现：

1. **多 Cabinet 递归调度** — Daemon 自动发现所有 `.cabinet` 文件
2. **Cabinet 可见性深度选择器** — Own / +1 / +2 / All
3. **`cabinetai` CLI 包** — 完整的运行时 CLI
4. **Registry 系统** — 8+ 预制模板 + GitHub 导入
5. **i18n 国际化** — 中英文支持 + 语言切换
6. **Mermaid 渲染器** — .mermaid/.mmd 文件查看
7. **嵌入式应用系统** — index.html + .app 标记
8. **Docker 部署架构** — Web 容器 + Host Daemon
9. **示例 Cabinet** — VC OS、对冲基金、Text Your Mom 等

---

## 建议优先级

### 立即可做（小范围收尾）
1. Agent Detail 加 Memory 查看 tab
2. 备份恢复 API + 简单恢复 UI

### 中期（Phase 3 核心）
3. Skill 管理 CRUD（UI + API + runtime 注入）
4. Email 通知实现
5. 任务看板拖拽

### 长期 / 按需
6. 浏览器推送通知
7. Slack OAuth 完整集成
8. Memory 编辑 UI
