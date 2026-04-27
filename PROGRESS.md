[2026-04-27] 为 `data/会计事务所AI工作台/01-数据跟踪/每日摘要/2026-04-27.md` 生成新一期 AI + 财税服务情报日报，优先整合中注协、IFAC、COSO 与国家税务总局可访问线索，并在联网受限场景下明确标注为演示样例 / 待专业复核。同时更新 `data/会计事务所AI工作台/01-数据跟踪/每日摘要/index.md`，将最新日报置顶。
[2026-04-26] Updated the accounting-firm demo cabinet’s daily intelligence brief under `data/会计事务所AI工作台/01-数据跟踪/每日摘要/2026-04-26.md` with refreshed authority-backed AI, audit, internal-control, tax, and professional-services signals from CICPA, COSO, Thomson Reuters, PwC, MOF, and Jiangsu Tax. Also updated the daily index entry to mark the brief as refreshed and pending professional review.
[2026-04-26] Reintroduced a compact server status indicator after hiding the full StatusBar, preserving online/degraded/offline visibility without showing git sync, chat, contribution, or star controls.
[2026-04-26] Hid the global bottom StatusBar from AppShell so the demo UI no longer shows online/git sync/chat/contribution/star controls along the bottom edge.
[2026-04-26] Cleared stale local provider errors when the host daemon reports a CLI provider as available, so Settings shows the daemon-backed provider status without leftover container-only "not found" messages.
[2026-04-26] Fixed CLI provider detection so host-run adapters prefer the user's Bun and nvm paths before Homebrew, allowing Cabinet to detect the locally installed Codex CLI correctly from the daemon.
[2026-04-26] Made the login page render the multi-user form by default instead of a blank loading state, preventing the Docker demo from getting stuck on the pre-rendered ellipsis while auth mode is checked.
[2026-04-26] Rebuilt data/会计事务所AI工作台 as a customer-demo Cabinet with five AI agent personas, five runnable jobs, and sample deliverables for data tracking, WeChat article creation, HTML reporting, and PPT briefing. Added source lists, demo scripts, CSV data, an embedded HTML dashboard, SVG article artwork, and an 8-slide PPTX artifact while leaving data-bak untouched.
[2026-04-24] Fixed cabinet reporting root-cabinet routing in the app and Docker build by separating canonical `cabinetId` from display `cabinetPath` in reporting requests. Also added runtime manifest-backed reporting ownership fallback so reporting-links POST can resolve and canonicalize cabinet ids from `.cabinet` files without relying on test-only providers, with focused regression coverage across hooks, containers, routes, and auth services.
[2026-04-24] Restored reporting for legacy workspaces that only store `company.name` by deriving a stable company id during company-context resolution and by returning a stable `missing_company_context` error code instead of raw English API text. Localized the reporting surface chrome and reporting-specific company-context error mapping, added locale-stable provider/test coverage, and kept the root-cabinet reporting contract intact.
[2026-04-24] Restored live Docker reporting for single-workspace admin accounts with no explicit membership providers by letting app admins inherit the workspace default company and requested cabinet context. Rebuilt the container and verified authenticated requests to the root-cabinet reporting and reporting-links endpoints now return 200 with `scope.companyId = "jyutech.cn"` instead of company/cabinet context errors.
[2026-04-24] Improved the reporting zero state so empty root-cabinet reporting explains what links and snapshots do instead of looking broken. Added localized empty-state guidance for both panels plus an “Add first reporting link” CTA that focuses the existing child-cabinet input, keeping the reporting surface visible while making the next step obvious.
[2026-04-21] 审查 18 个指定文件及额外发现的 mintlayer/greenpulse 文件，确认所有文件正文均已为中文，无需进一步翻译。frontmatter 中保留的英文均为品牌名（TikTok、Reddit、NeuralFlow 等）或行业通用缩写（CEO、CTO、LP、B2B、AI、ML），符合翻译规范。
[2026-04-20] 将 data/ 目录下所有 md 文档、agent persona 和 job YAML 全面翻译成中文，包括目录名重命名（共 60+ 个目录/文件重命名、100+ 文件内容翻译）。
[2026-04-21] 将任务A知识库的6个文件从英文翻译为中文：index.md、入门指南/index.md、入门指南/应用与代码库/index.md、入门指南/符号链接与知识加载/index.md、.agents/ceo/persona.md、.agents/editor/persona.md。所有 frontmatter 键保持英文，标签值、正文、HTML 表格内容及智能体人设全部翻译为中文。
[2026-04-21] 将视频创作团队知识库的5个文件从英文翻译为中文：入门指南/index.md、入门指南/应用与代码库/index.md、入门指南/符号链接与知识加载/index.md、.agents/ceo/persona.md、.agents/editor/persona.md。frontmatter 键保持英文，所有正文、标签值及 HTML 表格内容均已翻译为中文。
[2026-04-21] 将风投操作系统/.jobs/下的9个YAML作业文件从英文翻译为中文，包括name、description和prompt字段，所有其他字段保持不变。
[2026-04-21] 将"给妈妈发短信"知识库的39个内容文件从英文翻译为中文，涵盖公司战略、财务、运营、头脑风暴、应用开发、发布检查单、PRD、营销（TikTok + Reddit）等全部模块。所有已为中文的文件保持不变，纯中文文件（如上海游记）未做修改。

[2026-04-21] 将"给妈妈发短信"知识库的29个文件（16个智能体 persona.md + 13个 YAML 作业文件）从英文翻译为中文。name/role 字段按规范映射（CEO→首席执行官等），正文与 prompt 全部翻译，所有 YAML 结构键保持不变。

 — 在 src/lib/db.ts 和 server/db.ts 的 WAL pragma 后补加 `busy_timeout = 5000`，使 Next.js 进程与 cabinet-daemon 进程同时写入时，后者等待最多 5 秒而非立即抛 SQLITE_BUSY 错误。WAL 模式已确认启用，适用于目标用户规模（5-50 人自托管团队），无需迁移 PostgreSQL。
 from second audit. (1) Replaced `deleteCommentsByUser()` two-pass deletion with a SQLite recursive CTE (`WITH RECURSIVE subtree`) that collects the full descendant reply chain before deleting — no orphaned rows survive regardless of nesting depth. (2) Added `loadPageMetaWalkUp()` to access-control.ts that walks ancestor path segments until frontmatter is found; upload route and assets GET/PUT now use it instead of `loadPageMeta()`, closing the bypass where uploads to a subdirectory of a private page returned undefined meta and were incorrectly allowed.
 (1) Comments API now loads page frontmatter before access checks, preventing unauthorized read/write on private pages. (2) Locks GET now requires read auth with frontmatter check; POST loads frontmatter for write check — prevents non-owners from observing/locking private pages. (3) Upload API now loads page frontmatter for write access check. (4) Assets GET now checks read access with frontmatter (private attachments no longer publicly readable); PUT also loads frontmatter. (5) Fixed reply-to-reply orphaning: `getComments()` now flattens nested replies into root thread via single-pass id→thread mapping. (6) User deletion now also cleans up comments via `deleteCommentsByUser()`. Added `loadPageMeta()` and `getPagePathFromAssetPath()` helpers to access-control.ts.
[2026-04-20] Phase 4 — Polish and edge case hardening for team collaboration. Added heartbeat failure recovery (3 consecutive failures → auto-release lock). Added lock recheck timer (30s polling when locked by other, auto-detect when lock expires). Added beforeunload handler to release lock on browser/tab close. Disabled editor input (setEditable false) when page is locked by another user. Added dirty worktree check to git restore endpoint (409 if uncommitted changes exist). Added orphaned data cleanup on user deletion (locks + notifications). Added stale read notification pruning in daemon (hourly, 30-day retention). Added utility functions deleteNotificationsByUser and deleteCommentsByUser.
[2026-04-20] Phase 3 — Notifications system for team collaboration. Created SQLite migration `004_notifications.sql`, notification service (`src/lib/collaboration/notification-service.ts`) with create/list/markRead/markAllRead/delete/migrate + trigger helpers for comment/mention/lock_released events. Created notifications API (`/api/notifications`) with GET (list + unread count) and PUT (mark read / mark all read). Built notification bell component in header with unread count badge, dropdown list, click-to-navigate, mark-read, mark-all-read, and 30s polling. Integrated comment notification trigger into comments API (notifies page owner when someone comments). Added notification path sync to pages PATCH and cleanup to pages DELETE. Fixed collaboration store to use auth-store instead of cookie parsing.
[2026-04-20] Phase 2 — Page-level comments for team collaboration. Created SQLite migration `003_comments.sql`, comment service (`src/lib/collaboration/comment-service.ts`) with CRUD + threaded replies + resolve/unresolve + path migration + cascade deletion. Created comments API (`/api/comments/[...path]`) with GET/POST/PUT/DELETE and page-level access control. Integrated comment path sync into pages PATCH (rename/move) and comment cleanup into pages DELETE. Built comment panel UI (`src/components/comments/comment-panel.tsx`) with thread view, reply support, resolve/unresolve, 30s auto-refresh, and ⌘+Enter submit. Added i18n keys for comments (EN + ZH).
[2026-04-20] Phase 1 — Edit locks for team collaboration. Created SQLite migration `002_document_locks.sql`, lock service (`src/lib/collaboration/lock-service.ts`) with acquire/release/heartbeat/cleanup/path-migration operations, lock API routes (`/api/locks/[...path]` for GET/POST/DELETE, `/api/heartbeat/[...path]` for POST). Integrated write-time lock validation into PUT pages handler (returns 423 if locked by another user), lock cleanup on page delete, and lock path migration on page rename/move. Added expired lock cleanup interval to cabinet-daemon (60s). Created frontend collaboration store with lock state management and heartbeat timer, lock banner component showing when page is locked by another user, and lock indicator in editor toolbar. Added i18n keys for lock messages (EN + ZH).
[2026-04-20] Phase 0 — Unified authorization layer for team collaboration. Created `src/lib/auth/access-control.ts` with `checkPageAccess()` and `requireAdmin()`. Applied access checks to all API routes: pages (GET/PUT/POST/PATCH/DELETE), upload, assets, search (private page filtering), and all git endpoints (restore/commit/status/diff → admin-only; log → page-level read check; pull → admin-only). This is the foundation for the lightweight collaboration feature (edit locks, comments, notifications in subsequent phases).
[2026-04-17] Comprehensive i18n restoration: restored ~100 hardcoded English strings back to t() calls across agents-workspace.tsx (~70), jobs-manager.tsx (~25), and status-bar.tsx (~27). Added 30 new translation keys to message catalogs (agents.ts, tasks.ts, layout.ts) with both EN and ZH translations. Created useTriggerLabels() hook and formatRelativeI18n() for module-scope i18n patterns.
[2026-04-17] Code isolation strategy (P0-P4): Created fork manifest (.cabinet-fork.json), split i18n messages into domain files, created auth barrel export, extracted auth middleware factory. Documented strategy in docs/code-isolation-strategy.md.
[2026-04-17] Fixed Chinese (CJK) naming support for pages and cabinets. Replaced all ASCII-only slug regex patterns (`/[^a-z0-9]+/g`) with Unicode-aware `\p{L}\p{N}` patterns across 8 files. Added shared `slugify()` function in path-utils.ts. Chinese titles like "我的工作空间" now produce valid directory names instead of being silently stripped to empty strings.
[2026-04-16] Added admin user management UI in Settings. New "Users" tab (admin-only) shows user list with avatar, role badges, and creation dates. Supports creating new users with username/password/role, editing user display name/password/role, and deleting users — all via dialog modals. Full i18n support (English + Chinese). Integrated into existing settings page tab system.
[2026-04-16] Added multi-user authentication system (Phase 1). Users stored in `data/.cabinet-state/users.json` (no database). JWT-based auth with auto-generated secret. First registered user becomes admin. Login page adapts to three modes: legacy single-password, multi-user login, and first-user setup. Git commits now include author identity. Pages support `owner` and `visibility` (private/team) frontmatter fields, with private pages filtered from tree and blocked in API. Added user management endpoints (admin CRUD), logout, auth store, and user menu in header. Fully backward-compatible with existing `KB_PASSWORD` env var.
[2026-04-16] Refreshed the `data/example-text-your-mom/company/updates/index.md` and `data/example-text-your-mom/company/goals/index.md` executive pages with a midday CEO checkpoint. The update records that product sprint progress, TikTok briefs, and Reddit monitoring still lack visible dated artifacts, and narrows the immediate company ask to one shipped/moved product item, one TikTok brief, one Reddit artifact, and a confirmed RT-4 Friday writeup.
[2026-04-16] Refreshed the `data/vc-os/intelligence/ukraine-war-update-2026-04-16.md` brief with later April 16 public reporting, updating the headline strike summary to reflect broader missile/drone attacks on Kyiv, Odesa, and Dnipro plus higher confirmed casualty figures. This keeps the intelligence note aligned with the latest open-source reporting before answering the user's battlefield question.
[2026-04-15] Added a new root knowledge base roadmap page under `data/roadmap` that organizes Cabinet priorities into near-, mid-, and longer-term phases around stability, onboarding, AI editing, and distribution. Updated the KB home page to surface the roadmap as a primary entry point and summarize the current focus areas.
[2026-04-15] Localized the remaining covered Settings providers/core surface copy by routing provider setup affordances and badges through the shared zh/en message catalog, and added a focused regression test guarding against new hard-coded covered-surface strings in settings-page.tsx. This keeps the Settings demo path localized with English fallback while staying scoped to the existing client i18n layer.
[2026-04-15] Localized the Tasks workspace core demo copy in tasks-board.tsx, including the board filters/loading state, schedule controls/dialog labels, and first-screen summaries via the shared zh/en message catalog. This keeps Tasks board and schedule surfaces on the demo path locale-aware with English fallback while staying scoped to the existing i18n layer.
[2026-04-15] Fixed the Tasks workspace typecheck regression by restoring the board scope label to use the existing visibility option label lookup instead of passing unsupported arguments through the locale helper. This keeps the change narrowly scoped to the Tasks board locale wiring and unblocks workspace-tasks-core-copy validation.

[2026-04-16] Updated the Text Your Mom CEO updates page with a same-day executive readout for Apr 16, highlighting the three biggest priorities: proving the April 14 sprint is shipping, validating that marketing activation is producing artifacts, and keeping the RT-4 investigation on track for Friday's decision point.

# Progress

[2026-04-15] Added the demo i18n foundation: a lightweight client-side locale provider with persisted `zh`/`en` state, English fallback message lookup, and automatic `html lang` synchronization. Added a visible language switcher next to the theme control across shared header chrome, and wired the login surface to use localized copy before authentication without affecting theme persistence.

[2026-04-14] CLI: `cabinetai run` is now fully all-in-one — no `create` needed first. Extracted scaffold logic into `cabinetai/src/lib/scaffold.ts` and added `resolveOrBootstrapCabinetRoot()` which auto-creates the cabinet structure (`.cabinet`, `.agents/`, `.jobs/`, `.cabinet-state/`) in the current directory if none is found. `ensureApp()` then detects and installs the web app if needed. Updated Quick Start in README and CABINETAI.md to reflect the single-command flow.

[2026-04-14] CLI: all user-facing messages and README docs now show `npx cabinetai run` instead of bare `cabinetai run`. Users install via npx, so the bare command doesn't exist.

[2026-04-14] Fixed task completion detection stuck on "running". Two bugs: (1) after ANSI stripping the `❯` idle prompt merged onto the same line as `⏵⏵ bypass permissions on`, so the exact-match regex `/^[❯>]$/` never matched — loosened to `/^[❯>](?:\s|$)/`; (2) Claude Code's completion timing line uses many verbs beyond "Brewed" (Sautéed, Baked, Churned, Crunched, etc.) — `isClaudeIdleTailNoise` now matches any spinner-prefixed `Verb for [time]` pattern generically instead of hardcoding individual verbs.

[2026-04-14] Unified `cabinetai-plan.md` and `CABINETAI_DEPLOYMENT.md` into single `CABINETAI.md`. Synced all three package versions to 0.3.1 (app, create-cabinet, cabinetai). Published both npm packages with READMEs.

[2026-04-14] CLI: added `cabinetai uninstall` command. Default removes cached app versions from `~/.cabinet/app/`; `--all` removes the entire `~/.cabinet` directory. Cabinet data directories are never touched.

[2026-04-14] Registry API: added `?limit=N` query param (defaults to 10) so the onboarding carousel caps at 10 templates. The full registry browser passes `limit=100` to show all.

[2026-04-14] Fix sidebar labels: cabinet name in header, "Data" for content section. The top header now always prefers the .cabinet manifest name (e.g. "APPLE") over the index.md frontmatter title ("Knowledge Base"). Previously, clicking the cabinet overview caused activeCabinet to resolve to the root tree node whose frontmatter title was "Knowledge Base".

[2026-04-14] Onboarding wizard: removed directory picker from Step 7 (CLI already owns dir selection via CABINET_DATA_DIR), added .cabinet manifest detection at wizard start with a WelcomeBackStep for existing cabinets that pre-fills company name, and added "team of teams" framing subtitle to Step 2's TeamBuildStep title.

[2026-04-14] Added zoom/pan controls to Mermaid viewer: toolbar buttons for zoom in/out/reset with percentage display, Ctrl+scroll wheel zoom, and click-drag panning with grab cursor.

[2026-04-14] Fixed Mermaid viewer error handling: added `suppressErrorRendering` and `mermaid.parse()` pre-validation so syntax errors show a clean inline error message instead of mermaid injecting broken error SVGs into the DOM.

[2026-04-14] After importing a registry cabinet in onboarding Step 2, show a "Your cabinet has been created" success screen with an animated file tree (cabinet name, .agents/, .jobs/, counts) that reveals line-by-line, then a "Continue setup" button to proceed through the remaining onboarding steps instead of skipping them.

[2026-04-14] Onboarding Step 2: removed "Coming soon" blur from the team carousel, connected it to live registry templates from /api/registry, made cards clickable with an inline import dialog (POST /api/registry/import), and added a "Browse all" button that opens the full RegistryBrowser in a dialog.

[2026-04-14] Added ai-hedge-fund cabinet to data/ — a full multi-agent stock analysis system inspired by virattt/ai-hedge-fund. Includes 12 agents (Portfolio Manager, Risk Manager, 6 legendary investor personas: Buffett/Munger/Graham/Lynch/Burry/Wood, and 4 analyst agents: Fundamentals/Valuation/Sentiment/Technicals), 3 scheduled jobs, example signals.csv with live-format data for AAPL/NVDA/META, portfolio tracking, investor philosophy research pages, and risk management parameters.

[2026-04-14] Extracted scaffoldCabinet() to src/lib/storage/cabinet-scaffold.ts — unified duplicated cabinet bootstrap logic (dirs, .cabinet manifest, index.md) previously spread across onboarding/setup and cabinets/create API routes. Both routes now call the shared utility.

[2026-04-14] Fixed onboarding to comply with cabinet protocol: `POST /api/onboarding/setup` now creates the root `.cabinet` YAML manifest (schemaVersion, id, name, kind, version, description, entry), `index.md` entry point, and `.cabinet-state/` runtime directory — all three were previously missing from root cabinet initialization.

[2026-04-13] Fix job cards in ScheduleList not opening when agent lookup fails — removed agentRef guard from click handler, falls back to slug/name/emoji already on the item.

[2026-04-13] Fixed Warp Ventures OS cabinet protocol compliance: added .cabinet identity files (root + 3 child cabinets: deal-flow, portfolio, intelligence), .cabinet-state/.gitkeep in all 4 cabinets, 4 agent personas (.agents/managing-partner, analyst, portfolio-manager, deal-scout), description fields and correct ownerAgent/agentSlug assignments across all 9 job YAMLs, and quoted cron schedule strings.

[2026-04-13] Created "Warp Ventures OS" — a comprehensive VC operating system cabinet under data/vc-os. Includes 47 files across 9 modules: Intelligence Hub (daily X digest, 5 watchlist topics, live intelligence feed webapp), Events Calendar webapp, Deal Flow kanban webapp with 15 deals, Portfolio section with 5 companies each having metrics CSVs and news logs, Portfolio Dashboard webapp with Chart.js charts, Competitors section with Mermaid landscape diagram, Team profiles, LP management with commitments CSV, Finance section with IRR model/cap table/fees CSVs and Q1 report, and Programs (Fellowship + Accelerator) with cohort CSVs. Nine scheduled jobs across root/.jobs, portfolio/.jobs, intelligence/.jobs, and deal-flow/.jobs for daily briefs, portfolio health checks, deal pipeline reviews, board prep, LP updates, competitor intel, and market maps.

[2026-04-13] Moved AI edit pill to the status bar (bottom), centered via absolute positioning; shows for all KB content (MD, CSV, PDF, webapp, dirs) whenever section.type === "page". Header reverted to original simple layout.

[2026-04-13] Fix "Add cabinet data" creating pages at root instead of inside the active cabinet — button now opens the kbSubPage dialog (which uses dataRootPath) instead of the root NewPageDialog.

[2026-04-13] Fix "New Page" failing at root level — added POST handler to /api/pages/route.ts so creating a root page no longer hits a 405.

[2026-04-13] Task board inbox empty state now shows an "Add task" button instead of instructing users to click the header Add button.

[2026-04-13] Sidebar "New Page" and "New Cabinet" buttons now use text-xs, tighter gap/padding, and whitespace-nowrap to keep labels on a single line.

[2026-04-13] Constrain Jobs & heartbeats calendar to 600px height with a scrollbar. MonthView grid is now scrollable within a flex-1 overflow-y-auto wrapper; the section no longer grows to full content height.

[2026-04-13] Paper theme updated to exact warm parchment palette from runcabinet.com: background #FAF6F1, card #FFFFFF, sidebar #F3EDE4, primary/ring #8B5E3C, secondary #F5E6D3, muted #FAF2EA, foreground #3B2F2F, muted-foreground #A89888, border #E8DDD0. All values converted to OKLCh. Accent preview color updated to #8B5E3C.

[2026-04-13] Registry import: fix GitHub 403 rate-limit error on large templates (e.g. career-ops). Replaced recursive per-directory API calls with a single Git Trees API call (GET /git/trees/HEAD?recursive=1), then download files via raw.githubusercontent.com which has no API rate limit. Reduces GitHub API usage from O(directories) to 1 call per import.

[2026-04-13] Fullscreen "New Cabinet" dialog: replaced the two-step small dialog with a single fullscreen overlay (fixed inset-0 z-50, backdrop-blur-md) rendered via createPortal. All fields shown at once — cabinet name input, full agent grid picker, and "or import a pre-made team →" registry link at the bottom. AgentPicker got a layout="grid" prop so department columns wrap instead of horizontal-scroll in the fullscreen context. Fixed agents-not-appearing bug: LIBRARY_DIR in create/route.ts was pointing to the non-existent DATA_DIR/.agents/.library — corrected to PROJECT_ROOT/src/lib/agents/library where templates actually live.

[2026-04-13] Task board header cleanup: moved "Jobs & Heartbeats" schedule button to topmost right corner of the title row (flex justify-between), removed schedule toggle from filter row so it's back to original (agent filter + scope select + Refresh only). Fixed LayoutList not-defined runtime error by adding the import.

[2026-04-13] Registry browser redesign: rewrote registry-browser.tsx to faithfully match the cabinets-website design. Warm parchment palette (#FAF6F1 bg, #8B5E3C accent, #3B2F2F text) scoped to the component. List view has search + domain filter chips + list rows with stats. Detail view has warm header strip with stats, org chart (full port of cabinet-org-chart.tsx — VLine/HBranch connectors, department columns, agent/job nodes, child cabinet nodes, stats footer), agents grid, jobs list, readme prose, import CTA banner. Both scroll properly via overflow-y-auto + min-h-0 (no ScrollArea dependency).

[2026-04-13] Text Your Mom CEO heartbeat: executed marketing activation that was decided but not done earlier. Enabled all 6 marketing jobs across TikTok and Reddit cabinets (4 daily scans + 2 weekly digests). Updated team directory from 8/16 Active to 16/16 Active. Sent activation orders with specific deliverables to both marketing cabinet leads. Answered CFO's open data request on finance page (pricing $4.99/mo, burn ~$12K/mo, organic/paid split 60/40). Updated goals page with execution checkpoints for the week. Sent coordination messages to COO and CFO.

[2026-04-13] Registry browser: full cabinet registry browsing experience as a new "registry" section. Home screen has "Browse all" link next to the carousel heading. The browser has a search bar + filterable list of all 8 registry templates, and clicking one opens a detail view with header, stats, cabinet structure tree, agent cards grid, job list, readme, and two "Import Cabinet" CTAs (top bar + inline banner). Detail data fetched live from GitHub via new GET /api/registry/[slug] endpoint that parses .cabinet manifests, agents, jobs, and child cabinets. Import flow uses the same fullscreen overlay + page reload pattern.

[2026-04-13] Import UX polish: clicking Import now closes the dialog and shows a fullscreen blur overlay with spinner and progress text while downloading. On error, reopens the dialog with the error message. Added "Cabinet names can't be renamed later" warning under the name input.

[2026-04-13] Cabinet creation and registry import: Added "New Cabinet" button to sidebar (multi-step dialog with name input + agent picker), "Create Cabinet Here" right-click option in tree context menu, and replaced the "Coming soon" home screen carousel with clickable registry import cards. Created shared AgentPicker component and useAgentPicker hook extracted from onboarding wizard. New APIs: POST /api/cabinets/create (creates .cabinet + .agents/ + .jobs/ structure with selected agents from library), GET /api/registry (serves bundled manifest of 8 registry templates), POST /api/registry/import (downloads templates from GitHub hilash/cabinets repo). New files: agent-picker.tsx, use-agent-picker.ts, new-cabinet-dialog.tsx, registry-manifest.ts, github-fetch.ts, plus 3 API routes.

[2026-04-13] Pipeline Conductor first heartbeat: stood up 3 missing agent personas (conductor, evaluator, cv-tailor). Assessed pipeline state — Scanner has populated 50 roles across 14 companies (Anthropic, Stripe, Figma, Vercel, Linear, Supabase, Databricks, Airtable, Scale AI, Airbnb, dbt Labs, Brex, Resend, Clerk), all in "Discovered" status with zero evaluations. Identified critical blocker: master CV and proof points are still templates, blocking all Block B evaluations and downstream CV tailoring. Updated career-ops hub with accurate pipeline health metrics and agent roster.

[2026-04-15] Added the demo i18n foundation: a lightweight client-side locale provider with persisted `zh`/`en` state, English fallback message lookup, and automatic `html lang` synchronization. Added a visible language switcher next to the theme control across shared header chrome, and wired the login surface to use localized copy before authentication without affecting theme persistence.
[2026-04-16] Claude Code model labels now include version numbers in the runtime picker ("Claude Opus 4.7", "Claude Sonnet 4.6", "Claude Haiku 4.5"), with Opus listed first.

[2026-04-16] Runtime picker: fixed gap between tabs and model table by wrapping the TabsList in a flex container, eliminating the CSS inline-flex baseline descender space that was adding ~4px below the tab buttons. Inactive tabs now use bg-muted/60 so the active tab stands out clearly.

[2026-04-16] COO heartbeat for Text Your Mom: delivered mid-week operating review (Apr 14 week). Audited Tuesday Proof-of-Life — all three cabinets missed (app-dev, TikTok, Reddit). Identified TikTok image-creator produced two script-ready briefs today (first marketing output ever). Reddit remains dark with zero job runs. Created content-calendar/index.md for TikTok, appended COO review to company/operations, updated COO memory, and sent urgent messages to CEO, Reddit researcher, and DevOps agent.

[2026-04-16] Models picker: renamed "Task Model" → "Selected Model", collapsed model info into a single row (icon + name + Provider · Effort with effort-toned colors), header row transparent (no box), tabs row retains background styling.

[2026-04-16] Models picker: removed bottom margin (mb-1.5) from the selected model banner row.

[2026-04-16] Models picker: provider tab backgrounds set to bg-background (matching the table) using !important overrides to beat line-variant transparent base styles; removed all borders from tabs.

[2026-04-16] Resume Tailor heartbeat for hila-finds-job: audited master resume — found it still contains placeholder content with a critical career target mismatch (summary says EM/Director of Engineering but all 12 pipeline jobs are PM roles). Created detailed tailoring briefs for both "Saved" jobs (Figma Senior PM Collaboration and dbt Labs Senior PM Core) with keyword maps, gap analyses, cover letter angles, and next-step checklists. Flagged the EM→PM narrative gap as a blocker on the master resume. Both briefs ready to generate tailored resumes the moment real experience is entered.

[2026-04-16] Networking Scout heartbeat for hila-finds-job: audited all 13 contacts against pipeline state. Created outreach-drafts-apr-16.md with 7 personalized, ready-to-send messages (Sarah Lin follow-up, Marcus Stripe check-in, David Park first touch, Alex Rivera mock-interview ask, Dana Kim post-Round-2 thank you, Jake Wilson post-screen check-in, Chris Donovan dormant reconnect). Updated networking/index.md with this week's priority table. Flagged contacts not to contact this week to avoid over-messaging active processes.

[2026-04-16] DevOps daily bug triage for Text Your Mom app-development cabinet. Updated bug-triage.csv with fix targets, DevOps risk framing, and CTO-confirmed root cause notes for all 5 bugs. RT-4 (reminder 2h late) flagged as P2 blocker with zero delivery telemetry; PC-3 (paywall dismiss) and OB-5 (nickname) confirmed for this sprint. Updated DevOps agent context memory.

[2026-04-16] Michael Burry heartbeat: upgraded NVDA bear thesis from watching (Apr 14, conviction 3) to active bear signal (conviction 4) — specific catalyst is Blackwell hyperscaler uptake data at Q1 FY2027 earnings ~late May 2026; 57 Buy / 0 Sell consensus, Google TPU v6 / Amazon Trainium 2 / Microsoft Maia already live in production, DCF 25% premium, 37% downside on estimate + multiple compression. Initiated META bear signal (conviction 3) focused on cash flow arithmetic: $115-135B capex committed yields ~negative FCF in Q1 2026; FCF/NI already 0.72x; Reality Labs $24B/year annualized under unchecked dual-class governance. Both signals appended to market-analysis/signals.csv with catalyst and timeframe per Burry methodology.

[2026-04-16] Benjamin Graham heartbeat: conducted NCAV and balance sheet quality screens on AAPL, NVDA, and META. AAPL: negative NCAV (-$138B), P/B 48x — neutral, conviction 2. NVDA: trading at ~36x estimated NCAV, P/E 56x, pure growth speculation — bearish, conviction 4. META: NCAV near zero, P/E 23x, DCF-based cheapness not Graham cheapness — neutral, conviction 2. All three signals appended to market-analysis/signals.csv.

[2026-04-16] Warren Buffett heartbeat: evaluated NVDA through the four filters. CUDA switching-cost moat acknowledged, Jensen Huang rated excellent capital allocator, but 40%+ hyperscaler concentration and 56x P/E with 25% DCF premium leaves no margin of safety — neutral signal, conviction 2. Signal appended to market-analysis/signals.csv.

[2026-04-16] Charlie Munger heartbeat: applied inversion analysis to NVDA and META. NVDA flagged bearish — lollapalooza consensus (57 Buy / 0 Sell), 25% DCF premium, hyperscaler silicon competition risk. META flagged neutral — PEG attractive but dual-class governance and $115-135B capex bet create unacceptable minority shareholder risk. Signals appended to market-analysis/signals.csv.

[2026-04-16] Models picker: replaced generic Lucide icons in ProviderGlyph with brand images — Claude AI symbol SVG for Claude Code (icon="sparkles") and ChatGPT logo PNG for Codex CLI (icon="bot").

[2026-04-16] Peter Lynch heartbeat: wrote three signals to market-analysis/signals.csv using corrected prices from fundamentals analyst (AAPL $260.48, NVDA $188.63, META $629.86). NVDA neutral (PEG 0.77 trailing / 1.6 forward, customer concentration disqualifier, fully discovered by Wall Street). META downgraded from bullish to neutral — corrected price re-rates PEG from 0.96 to 1.17, hold existing position but do not add, stalwart sell trigger at P/E 36x. AAPL downgraded to bearish — corrected price re-rates PEG to 3.8 (stalwart sell rule triggered at P/E 42x vs 16.5x threshold).

[2026-04-14] CLI: `cabinetai run` is now fully all-in-one — no `create` needed first. Extracted scaffold logic into `cabinetai/src/lib/scaffold.ts` and added `resolveOrBootstrapCabinetRoot()` which auto-creates the cabinet structure (`.cabinet`, `.agents/`, `.jobs/`, `.cabinet-state/`) in the current directory if none is found. `ensureApp()` then detects and installs the web app if needed. Updated Quick Start in README and CABINETAI.md to reflect the single-command flow.

[2026-04-14] CLI: all user-facing messages and README docs now show `npx cabinetai run` instead of bare `cabinetai run`. Users install via npx, so the bare command doesn't exist.

[2026-04-14] Fixed task completion detection stuck on "running". Two bugs: (1) after ANSI stripping the `❯` idle prompt merged onto the same line as `⏵⏵ bypass permissions on`, so the exact-match regex `/^[❯>]$/` never matched — loosened to `/^[❯>](?:\s|$)/`; (2) Claude Code's completion timing line uses many verbs beyond "Brewed" (Sautéed, Baked, Churned, Crunched, etc.) — `isClaudeIdleTailNoise` now matches any spinner-prefixed `Verb for [time]` pattern generically instead of hardcoding individual verbs.

[2026-04-14] Unified `cabinetai-plan.md` and `CABINETAI_DEPLOYMENT.md` into single `CABINETAI.md`. Synced all three package versions to 0.3.1 (app, create-cabinet, cabinetai). Published both npm packages with READMEs.

[2026-04-14] CLI: added `cabinetai uninstall` command. Default removes cached app versions from `~/.cabinet/app/`; `--all` removes the entire `~/.cabinet` directory. Cabinet data directories are never touched.

[2026-04-14] Registry API: added `?limit=N` query param (defaults to 10) so the onboarding carousel caps at 10 templates. The full registry browser passes `limit=100` to show all.

[2026-04-14] Fix sidebar labels: cabinet name in header, "Data" for content section. The top header now always prefers the .cabinet manifest name (e.g. "APPLE") over the index.md frontmatter title ("Knowledge Base"). Previously, clicking the cabinet overview caused activeCabinet to resolve to the root tree node whose frontmatter title was "Knowledge Base".

[2026-04-14] Onboarding wizard: removed directory picker from Step 7 (CLI already owns dir selection via CABINET_DATA_DIR), added .cabinet manifest detection at wizard start with a WelcomeBackStep for existing cabinets that pre-fills company name, and added "team of teams" framing subtitle to Step 2's TeamBuildStep title.

[2026-04-14] Added zoom/pan controls to Mermaid viewer: toolbar buttons for zoom in/out/reset with percentage display, Ctrl+scroll wheel zoom, and click-drag panning with grab cursor.

[2026-04-14] Fixed Mermaid viewer error handling: added `suppressErrorRendering` and `mermaid.parse()` pre-validation so syntax errors show a clean inline error message instead of mermaid injecting broken error SVGs into the DOM.

[2026-04-14] After importing a registry cabinet in onboarding Step 2, show a "Your cabinet has been created" success screen with an animated file tree (cabinet name, .agents/, .jobs/, counts) that reveals line-by-line, then a "Continue setup" button to proceed through the remaining onboarding steps instead of skipping them.

[2026-04-14] Onboarding Step 2: removed "Coming soon" blur from the team carousel, connected it to live registry templates from /api/registry, made cards clickable with an inline import dialog (POST /api/registry/import), and added a "Browse all" button that opens the full RegistryBrowser in a dialog.

[2026-04-14] Added ai-hedge-fund cabinet to data/ — a full multi-agent stock analysis system inspired by virattt/ai-hedge-fund. Includes 12 agents (Portfolio Manager, Risk Manager, 6 legendary investor personas: Buffett/Munger/Graham/Lynch/Burry/Wood, and 4 analyst agents: Fundamentals/Valuation/Sentiment/Technicals), 3 scheduled jobs, example signals.csv with live-format data for AAPL/NVDA/META, portfolio tracking, investor philosophy research pages, and risk management parameters.

[2026-04-14] Extracted scaffoldCabinet() to src/lib/storage/cabinet-scaffold.ts — unified duplicated cabinet bootstrap logic (dirs, .cabinet manifest, index.md) previously spread across onboarding/setup and cabinets/create API routes. Both routes now call the shared utility.

[2026-04-14] Fixed onboarding to comply with cabinet protocol: `POST /api/onboarding/setup` now creates the root `.cabinet` YAML manifest (schemaVersion, id, name, kind, version, description, entry), `index.md` entry point, and `.cabinet-state/` runtime directory — all three were previously missing from root cabinet initialization.

[2026-04-13] Fix job cards in ScheduleList not opening when agent lookup fails — removed agentRef guard from click handler, falls back to slug/name/emoji already on the item.

[2026-04-13] Fixed Warp Ventures OS cabinet protocol compliance: added .cabinet identity files (root + 3 child cabinets: deal-flow, portfolio, intelligence), .cabinet-state/.gitkeep in all 4 cabinets, 4 agent personas (.agents/managing-partner, analyst, portfolio-manager, deal-scout), description fields and correct ownerAgent/agentSlug assignments across all 9 job YAMLs, and quoted cron schedule strings.

[2026-04-13] Created "Warp Ventures OS" — a comprehensive VC operating system cabinet under data/vc-os. Includes 47 files across 9 modules: Intelligence Hub (daily X digest, 5 watchlist topics, live intelligence feed webapp), Events Calendar webapp, Deal Flow kanban webapp with 15 deals, Portfolio section with 5 companies each having metrics CSVs and news logs, Portfolio Dashboard webapp with Chart.js charts, Competitors section with Mermaid landscape diagram, Team profiles, LP management with commitments CSV, Finance section with IRR model/cap table/fees CSVs and Q1 report, and Programs (Fellowship + Accelerator) with cohort CSVs. Nine scheduled jobs across root/.jobs, portfolio/.jobs, intelligence/.jobs, and deal-flow/.jobs for daily briefs, portfolio health checks, deal pipeline reviews, board prep, LP updates, competitor intel, and market maps.

[2026-04-13] Moved AI edit pill to the status bar (bottom), centered via absolute positioning; shows for all KB content (MD, CSV, PDF, webapp, dirs) whenever section.type === "page". Header reverted to original simple layout.

[2026-04-13] Fix "Add cabinet data" creating pages at root instead of inside the active cabinet — button now opens the kbSubPage dialog (which uses dataRootPath) instead of the root NewPageDialog.

[2026-04-13] Fix "New Page" failing at root level — added POST handler to /api/pages/route.ts so creating a root page no longer hits a 405.

[2026-04-13] Task board inbox empty state now shows an "Add task" button instead of instructing users to click the header Add button.

[2026-04-13] Sidebar "New Page" and "New Cabinet" buttons now use text-xs, tighter gap/padding, and whitespace-nowrap to keep labels on a single line.

[2026-04-13] Constrain Jobs & heartbeats calendar to 600px height with a scrollbar. MonthView grid is now scrollable within a flex-1 overflow-y-auto wrapper; the section no longer grows to full content height.

[2026-04-13] Paper theme updated to exact warm parchment palette from runcabinet.com: background #FAF6F1, card #FFFFFF, sidebar #F3EDE4, primary/ring #8B5E3C, secondary #F5E6D3, muted #FAF2EA, foreground #3B2F2F, muted-foreground #A89888, border #E8DDD0. All values converted to OKLCh. Accent preview color updated to #8B5E3C.

[2026-04-13] Registry import: fix GitHub 403 rate-limit error on large templates (e.g. career-ops). Replaced recursive per-directory API calls with a single Git Trees API call (GET /git/trees/HEAD?recursive=1), then download files via raw.githubusercontent.com which has no API rate limit. Reduces GitHub API usage from O(directories) to 1 call per import.

[2026-04-13] Fullscreen "New Cabinet" dialog: replaced the two-step small dialog with a single fullscreen overlay (fixed inset-0 z-50, backdrop-blur-md) rendered via createPortal. All fields shown at once — cabinet name input, full agent grid picker, and "or import a pre-made team →" registry link at the bottom. AgentPicker got a layout="grid" prop so department columns wrap instead of horizontal-scroll in the fullscreen context. Fixed agents-not-appearing bug: LIBRARY_DIR in create/route.ts was pointing to the non-existent DATA_DIR/.agents/.library — corrected to PROJECT_ROOT/src/lib/agents/library where templates actually live.

[2026-04-13] Task board header cleanup: moved "Jobs & Heartbeats" schedule button to topmost right corner of the title row (flex justify-between), removed schedule toggle from filter row so it's back to original (agent filter + scope select + Refresh only). Fixed LayoutList not-defined runtime error by adding the import.

[2026-04-13] Registry browser redesign: rewrote registry-browser.tsx to faithfully match the cabinets-website design. Warm parchment palette (#FAF6F1 bg, #8B5E3C accent, #3B2F2F text) scoped to the component. List view has search + domain filter chips + list rows with stats. Detail view has warm header strip with stats, org chart (full port of cabinet-org-chart.tsx — VLine/HBranch connectors, department columns, agent/job nodes, child cabinet nodes, stats footer), agents grid, jobs list, readme prose, import CTA banner. Both scroll properly via overflow-y-auto + min-h-0 (no ScrollArea dependency).

[2026-04-13] Text Your Mom CEO heartbeat: executed marketing activation that was decided but not done earlier. Enabled all 6 marketing jobs across TikTok and Reddit cabinets (4 daily scans + 2 weekly digests). Updated team directory from 8/16 Active to 16/16 Active. Sent activation orders with specific deliverables to both marketing cabinet leads. Answered CFO's open data request on finance page (pricing $4.99/mo, burn ~$12K/mo, organic/paid split 60/40). Updated goals page with execution checkpoints for the week. Sent coordination messages to COO and CFO.

[2026-04-13] Registry browser: full cabinet registry browsing experience as a new "registry" section. Home screen has "Browse all" link next to the carousel heading. The browser has a search bar + filterable list of all 8 registry templates, and clicking one opens a detail view with header, stats, cabinet structure tree, agent cards grid, job list, readme, and two "Import Cabinet" CTAs (top bar + inline banner). Detail data fetched live from GitHub via new GET /api/registry/[slug] endpoint that parses .cabinet manifests, agents, jobs, and child cabinets. Import flow uses the same fullscreen overlay + page reload pattern.

[2026-04-13] Import UX polish: clicking Import now closes the dialog and shows a fullscreen blur overlay with spinner and progress text while downloading. On error, reopens the dialog with the error message. Added "Cabinet names can't be renamed later" warning under the name input.

[2026-04-13] Cabinet creation and registry import: Added "New Cabinet" button to sidebar (multi-step dialog with name input + agent picker), "Create Cabinet Here" right-click option in tree context menu, and replaced the "Coming soon" home screen carousel with clickable registry import cards. Created shared AgentPicker component and useAgentPicker hook extracted from onboarding wizard. New APIs: POST /api/cabinets/create (creates .cabinet + .agents/ + .jobs/ structure with selected agents from library), GET /api/registry (serves bundled manifest of 8 registry templates), POST /api/registry/import (downloads templates from GitHub hilash/cabinets repo). New files: agent-picker.tsx, use-agent-picker.ts, new-cabinet-dialog.tsx, registry-manifest.ts, github-fetch.ts, plus 3 API routes.

[2026-04-13] Pipeline Conductor first heartbeat: stood up 3 missing agent personas (conductor, evaluator, cv-tailor). Assessed pipeline state — Scanner has populated 50 roles across 14 companies (Anthropic, Stripe, Figma, Vercel, Linear, Supabase, Databricks, Airtable, Scale AI, Airbnb, dbt Labs, Brex, Resend, Clerk), all in "Discovered" status with zero evaluations. Identified critical blocker: master CV and proof points are still templates, blocking all Block B evaluations and downstream CV tailoring. Updated career-ops hub with accurate pipeline health metrics and agent roster.

[2026-04-13] Pattern Analyst heartbeat v2: produced end-of-day pattern analysis (pattern-analysis-2026-04-13-v2.md). Key finding: 0/7 recommendations from two prior reports have been executed. Funnel metrics stable (19 entries, 12 beyond Evaluated, scoring system validated). Escalated execution gap to Pipeline Conductor. Critical actions: n8n follow-up (4 days overdue), ElevenLabs apply (by Apr 15), failure/recovery STAR+R story (before Apr 16 panel). Two new discoveries assessed (Linear IC PM #18 — high priority, Cohere #19 — needs location verification).

[2026-04-13] Tasks board: clicking a conversation opens a right-side detail panel at the app-shell level (like the AI panel), not inside the board. Added `taskPanelConversation` to app-store, created `TaskDetailPanel` component rendered in the app shell layout. Running tasks show a live WebTerminal; completed/failed show ConversationResultView. X button closes the panel. The board stays fully visible underneath.

[2026-04-13] Replaced the Jobs & Heartbeats sidebar with a full-width schedule section featuring two views: (1) Calendar view (default) with day/week/month modes — a CSS Grid time grid showing jobs and heartbeats as color-coded pills positioned at their scheduled times, with current-time red line indicator, today highlighting, agent emoji markers, navigation arrows, and "Today" snap button. Month view shows a calendar grid with event badges per day cell. (2) List view — full-width responsive card grid. Both views open the same job/heartbeat edit dialogs on click. Extracted `computeNextCronRun` from persona-manager.ts into shared `cron-compute.ts` with `getScheduleEvents`, `getViewRange`, and `getAgentColor` helpers for client-side cron → event computation.

[2026-04-13] Added job and heartbeat edit dialogs to the cabinet main page SchedulesPanel. Clicking a job opens a dialog with schedule picker, prompt editor, enabled toggle, "Run now" button, and save — matching the agents workspace org chart popups. Clicking a heartbeat opens a similar dialog with schedule picker, active toggle, run, and save. Both dialogs use the same SchedulePicker component and API endpoints as the workspace.

[2026-04-13] Iterated on cabinet main page layout: moved title + description into the header bar (task-board style), put compact stats and scope depth pills in one row below (stats left, scope right), removed the Agent Status Grid section (org chart already covers agents), removed "Back to Cabinet" button. Updated cabinet task composer @ mentions to show both agents AND pages (was agents-only), with page chips and mentionedPaths sent to the API.

[2026-04-13] Redesigned the cabinet main page (CabinetView) as a mission control dashboard. Extracted 5 sub-components from the monolithic 1470-line file into separate modules (cabinet-utils.ts, cabinet-task-composer.tsx, cabinet-scheduler-controls.tsx, schedules-panel.tsx). Built 4 new components: InteractiveStatStrip (clickable metric cards with popover breakdowns), AgentStatusCard (live status cards with running/idle/paused indicators and glow animation), AgentStatusGrid (agent cards grid with integrated depth filter), and ActivityFeed (redesigned conversation list with pinned running items and emoji avatars). New layout order: stats strip, org chart (moved up as hero), composer, agent status cards, activity feed, schedules. Added cabinet-card-glow CSS animation for running agents.

[2026-04-13] Created `cabinetai` CLI package — a new npm package that serves as the primary runtime CLI for Cabinet. Architecture: app installs to `~/.cabinet/app/v{version}/` (auto-downloaded on first use), cabinets are lightweight data directories anywhere on disk. Commands: `create` (scaffold .cabinet + .agents/ + .jobs/ + index.md), `run` (ensure app installed, start Next.js + daemon pointing at cabinet dir), `doctor` (health checks), `update` (download newer app version), `import` (fetch templates from hilash/cabinets registry), `list` (discover cabinets in directory tree). Built with TypeScript + esbuild + Commander.js. Refactored `create-cabinet` to thin wrapper. Updated release pipeline (release.sh, release.yml, manifest generator, .gitignore).

[2026-04-13] Added depth dropdown to the sidebar header next to the "CABINET" label and to the agents workspace org chart navbar. Both compact Select dropdowns show Own/+1/+2/All options controlling which agents from child cabinets are visible. Reuses existing visibility infrastructure from app-store, works at both root and sub-cabinet levels, and syncs with the cabinet page depth pills.

[2026-04-13] Added right-click context menu to the Cabinet header in the sidebar. Shows: Rename (disabled with "coming soon" tooltip), Copy Relative Path (nested cabinets only), Copy Full Path, Open in Finder, and Delete (nested cabinets only, with confirmation). Root cabinet hides Rename-breaking and destructive options.

[2026-04-13] Pattern Analyst heartbeat: updated career-ops pattern analysis with recommendation adoption tracker (0/7 actioned — critical gap), pipeline update (17→19 entries, +2 discoveries, +1 location-failed), revised scorecard, and escalation tasks for Interview Strategist (failure/recovery story before Apr 16 panel) and CV Tailor (ElevenLabs application before Apr 15).

[2026-04-13] Composer hint bar: moved quick action chips below the composer on the home screen. Added grey hints below all composer cards — "use @ to mention" on the left and "Shift + Enter new line" on the right (responsive, hidden on small screens). Send button stays inside the card. Also added hints to cabinet-specific page composer (cabinet-view.tsx) and standardized its keyboard to Shift+Enter for newline.

[2026-04-13] Unified composer component: Created shared `useComposer` hook and `ComposerInput` component that replaces 4 duplicate input implementations (home screen, agent workspace panel + quick-send popup, AI panel editor chat, task board). All surfaces now support `@` mentions for both pages and agents in a single unified dropdown with grouped sections. The "Add Inbox Task" dialog was redesigned from a rigid form (title/description/priority fields) into a conversational composer. Extracted shared `flattenTree` and `makePageContextLabel` into `src/lib/tree-utils.ts`. Submit behavior is Enter to send, Shift+Enter for newline across all surfaces.

[2026-04-13] CEO operating review: surveyed all cabinets, confirmed Option A (activate marketing this week), answered CFO data questions (pricing $4.99/mo, burn ~$12K/mo, 60/40 organic/paid split), set April 26 check-in criteria, flagged COO/DevOps overlap and CEO brief/review overlap, introduced decision-deadline process fix for blockers. Updated company/operations and company/goals.

[2026-04-23] 完成 x-每日资讯 今日 X.com 跟踪：基于近 24 小时与 Claude、Anthropic、OpenAI、Cursor、MCP、Claude Code 相关关键词筛选高价值动态，新增 `data/x-每日资讯/每日摘要/2026-04-23.md`。同时更新 `data/x-每日资讯/每日摘要/index.md` 归档入口，将最新摘要置顶并刷新“最近一次更新”指向。

[2026-04-13] CEO weekly operating review (scheduled job): Full cross-cabinet review covering root + app-development + marketing/tiktok + marketing/reddit. Wins: DevOps sprint plan, CTO RT-4 ownership, CFO unit economics, COO financial risk tracking. Made Option A decision official for marketing activation with specific deadlines. Introduced Tuesday proof-of-life process fix. Saved to company/operations/index.md.

[2026-04-13] DevOps agent: created weekly sprint plan for week of April 14 at backlog/sprint-2026-04-14. Priorities: ship 4 small stories (OB-2, OB-5, OB-6, PC-3), start OB-1 and OB-3, run first release as a dry run of the pipeline. Updated release checklist with actionable items and staged rollout plan for the first release.

[2026-04-13] Removed legacy run-agent.sh script and its references from Electron packaging configs. The in-app agent system has superseded this manual bash loop approach.

[2026-04-13] Upgraded "What needs to get done?" create-task dialog: title is now larger (text-xl), random placeholder sentences rotate each open, DialogDescription removed, CEO agent pre-selected as default mention chip (persistent — typing doesn't clear it), "Start now" button added alongside "Add to inbox" (bypasses inbox, directly starts a conversation with the resolved agent), Cmd+Enter keyboard shortcut triggers Start now, keyboard hint bar shown beneath buttons. Extended ComposerInput with secondaryAction and onKeyDown interceptor props; extended useComposer with initialMentionedAgents that are pinned against auto-removal.

[2026-04-12] Cabinet view: moved visibility depth selector from a separate column to a subtle inline pill bar beneath stats (more grounded). Added Start All / Stop All / Restart All controls to the cabinet header bar, scoped to own-cabinet agents only (no sub-cabinets). Scheduler API now accepts optional cabinetPath to scope start-all/stop-all operations.

[2026-04-12] Task board header: moved selectors and refresh button to same row as filter chips (chips left, selectors right). Active chip color now matches its type (sky for Manual, emerald for Jobs, pink for Heartbeat) instead of generic primary.

[2026-04-12] Made BACK button icon smaller (2.5) and nudged it up to align with the center of the letter height.

[2026-04-12] Removed scope/visibility label text next to AGENTS in sidebar (e.g. "Cabinet · Include two cabinet levels") and added more spacing between CABINET header and AGENTS sub-item.

[2026-04-12] Sidebar cleanup: removed chevron from main cabinet header (always expanded, no collapse needed), made cabinet icon amber/yellow to match child cabinet icons, and toned down the BACK button (smaller text, lighter color, smaller icon).

[2026-04-12] Removed inline Job editor panel from the agent settings jobs view. The jobs list now fills the full width. Clicking a job opens the styled New Job popup (now context-aware: "Edit Job" title, Run + Delete in footer, "Save job" button when editing an existing job).

[2026-04-12] Redesigned "New Job" popup to match the "Edit Agent" dialog style exactly: two-column layout with the prompt textarea on the left (60vh tall, bg-muted/60 borderless), fields grid on the right (uppercase tracking labels, muted-fill inputs), and a proper footer with Starter Library ghost button on the left and Cancel + Create on the right.

[2026-04-12] Fixed search API recursing into embedded app/website directories. `collectPages` in `src/app/api/search/route.ts` now skips directories that have `index.html` but no `index.md`, preventing internal files like `about.md` inside a pipeline app from appearing in Cmd+K search results.

[2026-04-12] Created data/getting-started/ KB section with three pages: index (full file-type matrix + sidebar icon reference + keyboard shortcuts + features overview), apps-and-repos (embedded apps, full-screen .app mode, .repo.yaml spec), and symlinks-and-load-knowledge (Load Knowledge flow, .cabinet-meta, .repo.yaml, CABINET_DATA_DIR). Updated data/CLAUDE.md with a supported file types table covering all 13 types the tree-builder recognises. Updated data/index.md with a link to the new guide.

[2026-04-12] Cabinet page agents section: replaced individual bordered cards with a compact divider-based list. Agents are grouped by department (executive first, general last) with a muted section label row. Each row shows emoji, name, role, heartbeat pill, and active dot. The lead/CEO agent gets a small amber Crown icon inline with their name instead of a separate card.

[2026-04-12] GitHub stars counter animation in status bar: on first load, the star count animates from 0 to the real fetched value over 2 seconds using an ease-out cubic curve (requestAnimationFrame). When the counter reaches the final number, 8 gold ✦ particles burst outward in all 45° directions using CSS custom properties and a @keyframes animation. The explosion auto-hides after 900ms. Falls back to the static star count until real data arrives.

[2026-04-12] Added CabinetTaskComposer to cabinet homepage: a "What are we working on?" prompt box below the header with agent pills for all visible agents. Own-cabinet agents appear as a pill row; child-cabinet agents are grouped under their cabinet name as a labeled row below. Selecting a pill sets the target agent; Enter submits and navigates to the new conversation. Also updated buildManualConversationPrompt and the conversations POST route to accept cabinetPath so child-cabinet agent tasks run in the right cwd and store conversations in the correct cabinet.

[2026-04-12] Added RecentConversations panel to cabinet homepage: full-width card below the header showing the 20 most recent conversations across visible cabinets. Each row shows status icon (spinning/check/x), agent emoji, title, summary snippet, trigger pill (Manual/Job/Heartbeat), and relative timestamp. Running conversations show a pulsing indicator in the header. Clicking any row navigates directly to that conversation in the agent workspace. Auto-refreshes every 6 seconds.

[2026-04-12] Redesigned cabinet homepage to match the app design system: clean header with large title, description, stat pills (rounded-full bg-muted/primary tokens), and a segmented visibility scope control. Org chart uses proper rounded-xl border bg-card containers with CEO featured in a slightly elevated card, department labels as uppercase mono caps, and agent rows with emoji + role + heartbeat badge. Schedules panel follows the same card pattern with Clock/HeartPulse icon headers and rows with status badges. Removed gradient banner, icon box, kind tag, and parent name from back button.

[2026-04-12] Multi-cabinet conversation aggregation: when viewing a cabinet with "Include children" or "Include all descendants" visibility mode, the Agents Workspace now aggregates conversations from all visible cabinet directories. The conversations API accepts a `visibilityMode` query param and uses `readCabinetOverview` to discover descendant cabinet paths, then merges and sorts conversations from all of them. AgentsWorkspace passes the current visibility mode and re-fetches when it changes.

[2026-04-12] CEO agent first heartbeat for Text Your Mom example cabinet: created company/updates page with weekly priorities, added reality check to goals (50K MAU target requires marketing activation this week), added action-by-metric table to KPIs page, and linked updates section from root index. Three priorities set: ship P1 onboarding stories, activate paused marketing cabinets, and start investigating the critical reminder timing bug.

[2026-04-12] Cabinet UI interaction layer: clicking agents in the sidebar now opens AgentsWorkspace scoped to the cabinet (passes cabinetPath through section state → app-shell → AgentsWorkspace). Agent cards in the cabinet dashboard org chart are clickable. All agent API calls (persona GET, run, toggle, jobs) pass cabinetPath for cabinet-scoped resolution. JobsManager accepts cabinetPath prop.

[2026-04-11] Daemon recursive cabinet scheduling: the daemon now discovers all `.cabinet` files recursively under DATA_DIR and schedules heartbeats and jobs for every cabinet's agents. Schedule keys are cabinet-qualified (e.g., `example-text-your-mom/marketing/tiktok::heartbeat::trend-scout`) to prevent slug collisions across cabinets. Cabinet-level `.jobs/*.yaml` with `ownerAgent` are picked up alongside legacy agent-scoped jobs. The file watcher now monitors `**/.agents/*/persona.md`, `**/.jobs/*.yaml`, and `**/.cabinet` across all depths. API endpoints accept `cabinetPath` in request body so heartbeats and jobs execute in the correct cabinet scope with the right cwd.

[2026-04-11] Cleaned data directory: moved all old content (agents, jobs, missions, playbooks, chat, and content dirs) to `old-data/` at project root. Created root `.cabinet` manifest and `index.md` for the root cabinet. Renamed `data/.cabinet/` (runtime config dir) to `data/.cabinet-state/` to avoid conflict with `.cabinet` manifest file.

[2026-04-11] Onboarding provider step: redesigned to show only working providers as selectable radio cards with model selector. Users choose their default provider (Claude Code or Codex CLI) and pick a model (sonnet/opus/haiku or o3/o4-mini/gpt-4.1). Selection is saved to provider settings on launch. Non-working providers show setup guides in an expandable section.

[2026-04-11] Onboarding launch step: replaced right-side activity feed with animated agent chat preview. Agents now appear to talk to each other in a #general channel — CEO greets the team, delegates tasks to selected agents by name, and agents reply and coordinate. Messages appear one-by-one with typing indicators. Panel height reduced.

[2026-04-11] Onboarding wizard: added final "Start your Cabinet" step with summary card (company, agents, provider status) and data directory choice — "Start fresh here" uses the current dir, "Open existing cabinet" lets users pick a folder via native OS dialog. If a custom dir is chosen, it's saved via the data-dir API before launching.

[2026-04-11] Onboarding intro page: added staggered entrance animations. Elements fade in and slide up sequentially — card border appears first, then "cabinet" title, pronunciation/noun, each dictionary definition one by one, tagline lines, and finally the "Get started" button. Total sequence ~4.2s.

[2026-04-11] Onboarding wizard: limited agent selection to max 5 with CEO and Editor as mandatory (can't uncheck, show "Required" label). Unchecked agents dim and become unclickable at limit. Added counter display. Changed "How big is your team?" to a blurred "Pre-made multi-human multi-agent teams" section with "Coming soon" overlay.

[2026-04-11] Added show/hide hidden files setting in Appearance tab with checkbox and keyboard shortcut display (⌘⇧. / Ctrl+Shift+.). The toggle is persisted to localStorage and reloads the sidebar tree. Also registered the global keyboard shortcut matching macOS Finder behavior.

[2026-04-11] Added fallback viewer for unsupported file types. Files like .docx, .zip, .psd, .fig, .dmg etc. now appear in the sidebar (grayed out) and show a centered "Open in Finder" + "Download" view. Uses a whitelist approach — only common document, archive, and design file extensions are shown; everything else is silently skipped. Added `/api/system/reveal` endpoint for macOS Finder integration.

[2026-04-11] Added Storage tab to Settings with data directory picker. Users can view the current data dir path, browse for a new one, or type a path manually. The setting is persisted to `.cabinet-install.json` and read by `getManagedDataDir()` at startup (env var still takes priority). A restart banner shows when the path changes. Also updated the About tab to show the actual data dir path.

[2026-04-11] Added Mermaid diagram viewer for .mermaid and .mmd files. Renders diagrams with the mermaid library, supports source toggle, copy source, and SVG export. Follows the current Cabinet theme (dark/light). Shows error state with fallback to source view if rendering fails.

[2026-04-11] Updated documentation for direct symlinks: shortened Load Knowledge section in getting-started, updated apps-and-repos page, added new "Symlinks and Load Knowledge" guide page under getting-started, updated data/CLAUDE.md linked repos section, and added Link2 + new file type icons to the sidebar icons table.

[2026-04-11] Added source/code viewer, image viewer, and video/audio player as first-class file viewers. Code files (.js, .ts, .py, .json, .yaml, .sh, .sql, +25 more extensions) open in a dark-themed source viewer with line numbers, copy, download, wrap toggle, and raw view. Images (.png, .jpg, .gif, .webp, .svg) render centered on a dark background with download/open-in-tab. Video/audio (.mp4, .webm, .mp3, .wav) use native HTML5 players. Tree builder now classifies files by extension and shows type-specific sidebar icons. Added node_modules and other build dirs to the hidden entries filter.

[2026-04-11] Load Knowledge now creates direct symlinks (`data/my-project -> /external/path`) instead of wrapper directories with a `source` symlink inside. Metadata is stored as dotfiles (`.cabinet-meta`, `.repo.yaml`) in the target directory, while legacy `.cabinet.yaml` is still read for compatibility. Added `isLinked` flag to TreeNode for UI differentiation — linked dirs show a Link2 icon and "Unlink" instead of "Delete" in context menus. Updated linked-folder page fallback and symlink cleanup to support the new metadata file plus the legacy filename during transition.

[2026-04-11] Added "Copy Relative Path" and "Copy Full Path" options to sidebar context menus. TreeNode menu gets both options; Knowledge Base root menu gets "Copy Full Path". Full path is resolved via `/api/health` with a client-side cache.

[2026-04-11] Added expandable setup guides to the Settings > Providers tab. Each CLI provider now has a "Guide" button that reveals step-by-step installation instructions with numbered steps, terminal commands (with copy buttons), "Open terminal" button, and external links (e.g. Claude billing). Also added a "Re-check providers" button. Matches the onboarding wizard's setup guide UX.

[2026-04-11] Added agent provider health status to the status bar. The health indicator now shows amber "Degraded" when no agent providers are available. Clicking the status dot opens a popup showing App Server, Daemon, and Agent Providers sections with per-provider status (Ready / Not logged in / Not installed). Provider status is fetched once on mount and refreshed each time the popup opens, with 30s server-side caching to avoid excessive CLI spawning.

[2026-04-11] Added Codex CLI login verification to onboarding agent provider step. Health check now runs `codex login status` to detect authentication (e.g. "Logged in using ChatGPT") instead of assuming authenticated when the binary exists. Updated the Codex setup guide to use `npm i -g @openai/codex` and simplified steps to: install, login, verify.

[2026-04-11] Updated Discord invite link to new permanent invite (discord.gg/hJa5TRTbTH) across README, onboarding wizard, status bar, settings page, and agent job configs.

[2026-04-10] Redesigned onboarding step 1 from "Tell me about your project" to "Welcome to your Cabinet". Added name and role fields (role uses predefined pill buttons: CEO, Marketer, Engineer, Designer, Product, Other). Moved goals question to step 2. Step 1 now requires both name and company name to proceed.

[2026-04-10] Fixed duplicate-key crash when a standalone .md file and a same-named directory coexist (e.g. `harry-potter.md` + `harry-potter/`). Tree builder now skips the standalone file when a directory exists. Link-repo API now auto-promotes standalone .md pages to directories with index.md when loading knowledge into them. Added warning banner to Load Knowledge dialog when the target page already has sub-pages.

[2026-04-10] Removed the first-launch data directory dialog from Electron. Cabinet now silently seeds default content (getting-started, example-cabinet-carousel-factory, agent library) into the managed data dir on every launch. Also fixed the build script referencing a wrong directory name (`cabinet-example` → `example-cabinet-carousel-factory`) and added `index.md` to the seed content. Created a new "Setup and Deployment" guide page covering data directory locations, custom `CABINET_DATA_DIR`, and upgrade instructions. Rewrote all getting-started pages to remove Harry Potter references and use the Carousel Factory example instead.

[2026-04-10] Renamed "Add Symlink" to "Load Knowledge" across the UI. Redesigned the dialog: top section has folder picker and name (for everyone), collapsible "For Developers" section exposes remote URL and description fields with explanation about symlinks and .repo.yaml. API now auto-detects git repos — only creates .repo.yaml for actual repos, plain directories just get the symlink. Updated getting-started docs.

[2026-04-10] Updated server health indicator to track both servers independently — App Server (Next.js) and Daemon (agents, jobs, terminal). Shows green "Online" when both are up, amber "Degraded" when only the daemon is down, and red "Offline" when the app server is down. Popup shows per-server status with colored dots and explains which features are affected. Added `/api/health/daemon` proxy route and updated middleware to allow all health endpoints.

[2026-04-10] Made "Add Symlink" available at every level of the sidebar tree, not just the root Knowledge Base label. Added the option to tree-node.tsx context menu, added parentPath prop to LinkRepoDialog, and updated the link-repo API to support creating symlinked repos inside subdirectories.

[2026-04-10] Restored "Add Symlink" option to the Knowledge Base context menu. It was lost when the sidebar was restructured to nest KB under Cabinet (commit e011d02). Moved LinkRepoDialog and its state from sidebar.tsx into tree-view.tsx where the context menu lives.

[2026-04-10] Added all 7 sidebar icon types to the example workspace: Posts Editor (full-screen .app with carousel slide previews, placeholder images, prompts, and platform/status filters), Brand Kit (embedded website without .app — Globe icon), media-kit.pdf (PDF — FileType icon). Updated .gitignore to track the renamed example directory and agent library templates.

[2026-04-10] Replaced Harry Potter example workspace with "Cabinet Carousel Factory" — a TikTok/Instagram/LinkedIn carousel content factory for marketing Cabinet itself. Includes: index.md (HQ page with brand guide, pipeline, hook formulas, posting schedule), competitors.csv (15 KB competitors updated daily by cron), content-ideas.csv (carousel backlog), content-calendar full-screen HTML app (.app) with Cabinet website design language (warm parchment, serif display, terminal chrome), .repo.yaml linking to Cabinet repo. Created 4 new agent personas (Trend Scout, Script Writer, Image Creator, Post Optimizer) and 3 scheduled jobs (morning briefing, daily competitor scan, weekly digest). Deleted old HP-themed content and jobs.

[2026-04-10] Fixed onboarding wizard to show all 20 agent library templates during fresh start, grouped by department (Leadership, Marketing, Engineering, etc.). Previously only 2-4 agents were shown via hardcoded suggestions. Now fetches templates from /api/agents/library and uses keyword matching against company description to smart pre-check relevant agents.

[2026-04-10] Pinned domain tag and agent count to the bottom of each carousel card using flex-col with mt-auto, and set a fixed card height so the footer row aligns consistently across all cards.

[2026-04-10] Made the "cabinet" logo in the sidebar header clickable — clicking it now navigates to the home screen, matching the behavior of clicking the Cabinet section label.

[2026-04-10] Added infinite carousel of "Cabinets" at the bottom of the home screen — 50 pre-made zero-human team templates with name, description, agent count, and color-coded domain badges. Carousel auto-scrolls and pauses on hover.

[2026-04-10] Changed home screen prompt input from single-line input to textarea. Enter submits the conversation, Ctrl/Cmd+Enter inserts a new line. Added a keyboard hint (⌘ + ↵ new line) next to the send button.

[2026-04-10] Added home screen that appears when clicking "Cabinet" in the sidebar. Shows a time-based greeting with the company name, a text input for creating tasks, and quick action buttons. Submitting a prompt starts a conversation with the General agent via /api/agents/conversations and navigates directly to the conversation view. Added conversationId to SelectedSection so the agents workspace auto-selects and opens the new conversation. Default app route changed from agents to home.

[2026-04-10] Made Knowledge Base sidebar item editable. Added data/index.md as the root KB page, a root /api/pages route for parameterless access, and split the KB sidebar button so the chevron toggles expand/collapse while clicking the label opens the page in the editor.

[2026-04-10] Unified sidebar: Agents and Knowledge Base nested under collapsible "Cabinet" parent. All items now use identical TreeNode styles (13px text, gap-1.5, h-4 w-4 icons, depth-based paddingLeft indentation, same hover/active classes). KB tree nodes render at depth 2 so they align with agent child items.

[2026-04-10] Fix false "Update 0.2.6 available" shown when already on 0.2.6. Root cause: stale cabinet-release.json (0.2.4) was used as current version instead of package.json. Updated the manifest and made readBundledReleaseManifest always use package.json version as source of truth.

[2026-04-10] Added Connect section to the About settings tab with Discord link (recommended) and email (hi@runcabinet.com).

[2026-04-10] Added default White and Black themes (neutral, no accent color) to the appearance tab. Reduced blur on coming-soon overlays from 3px to 2px with higher opacity.

[2026-04-10] Notifications settings tab now shows a blurred preview with "Coming Soon" overlay, matching the integrations tab treatment.

[2026-04-10] Integrations settings tab now shows a blurred preview of the MCP servers and scheduling UI with a centered "Coming Soon" overlay card on top.

[2026-04-10] Moved About section from Providers tab into its own About tab in settings with correct version (0.2.6) and product info.

[2026-04-10] Settings page tabs now sync with the URL hash (e.g. #/settings/updates, #/settings/appearance). Browser back/forward navigates between tabs. Added min-h-0 + overflow-hidden to the ScrollArea so tab content is properly scrollable.

[2026-04-09] Fix pty.node macOS Gatekeeper warning: added xattr quarantine flag removal before ad-hoc codesigning of extracted native binaries in Electron main process.

[2026-04-09] Added `export const dynamic = "force-dynamic"` to all `/api/system/*` route handlers. Without this, Next.js could cache these routes during production builds, potentially serving stale update check results and triggering a false "update available" popup on fresh installs.

[2026-04-09] Added Apple Developer certificate import step to release workflow for proper codesigning and notarization in CI. Deduplicated getNvmNodeBin() in cabinet-daemon.ts to use the shared nvm-path.ts utility.

[2026-04-09] Cap prompt containers to max-h with vertical-only scrolling. Added "Open Transcript" button to the prompt section in conversation-result-view (matching the existing one in Artifacts). Also added anchor link on the full transcript page.

[2026-04-09] Apply markdown rendering to Prompt section on transcript page via ContentViewer. Extracted parsing logic into shared transcript-parser.ts so server components can pre-render text blocks as HTML (client hydration doesn't work on this standalone page). Both prompt and transcript text blocks now render with full prose markdown styling.

[2026-04-09] Improved transcript viewer: pre-processes embedded diff headers glued to text, detects cabinet metadata blocks (SUMMARY/CONTEXT/ARTIFACT inside fenced blocks), renders orphaned diff lines with proper green/red coloring, renders markdown links and inline code in text blocks, styles token count as a badge footer. Also added +N/-N addition/removal counts in diff file headers.

[2026-04-09] Rich transcript viewer: diff blocks show green/red for additions/removals with file headers, fenced code blocks get language labels, structured metadata lines (SUMMARY, CONTEXT, ARTIFACT, DECISION, LEARNING, GOAL_UPDATE, MESSAGE_TO) render as colored badges. Copy button added to transcript section.

[2026-04-09] Render prompt as markdown on the transcript page too, with a copy button. Server-side markdown rendering via markdownToHtml, matching the prose styling used elsewhere.

[2026-04-09] Render conversation prompt as markdown in the ConversationResultView panel instead of plain text. Uses the existing render-md API endpoint with prose styling, falling back to plain text while loading.

[2026-04-09] Unified toolbar controls across all file types. Extracted Search, Terminal, AI Panel, and Theme Picker into a shared `HeaderActions` component. CSV, PDF, and Website/App viewers now include these global controls in their toolbars, matching the markdown editor experience.

[2026-04-09] Added "Open in Finder" option to each sidebar tree item's right-click context menu. Reveals the item in Finder (macOS) or Explorer (Windows) instead of only supporting the top-level knowledge base directory.

[2026-04-09] Fixed Claude CLI not being found in Electron DMG builds. The packaged app inherits macOS GUI PATH which lacks NVM paths. Added NVM bin detection (scans ~/.nvm/versions/node/) to RUNTIME_PATH in provider-cli.ts, enrichedPath in cabinet-daemon.ts, and commandCandidates in claude-code provider.


[2026-04-10] Added send icon to each agent card in the Team Org Chart. Clicking it opens the agent's workspace with the composer focused, letting users quickly send a task to any agent directly from the org chart. Also added to the CEO card.

[2026-04-10] Replaced send-icon navigation with a quick-send popup dialog on the Org Chart. Clicking the send icon on any agent card opens a blurred-backdrop modal with the full chat composer (textarea, @mentions, keyboard shortcuts). Submitting navigates to the conversation view.

[2026-04-10] Added in-app toast notifications for agent task completion/failure. When a conversation finishes, a slide-in toast appears in the bottom-right with agent emoji, status, and title. Clicking navigates to the conversation. Uses an in-memory notification queue drained by SSE. Documented in notifications.md.

[2026-04-10] Added notification sounds for task completion/failure toasts. Uses Web Audio API to synthesize tones — ascending chime for success, descending tone for failure. No audio files needed.

[2026-04-13] COO heartbeat: posted Week of April 13 operating review at example-text-your-mom/company/operations. Added "Marketing Activated?" and "Financial Risk" columns per CFO request. Sent messages to CFO (confirming column addition), CEO (overdue items + activation checklist), and Product Manager (OB-3 resizing + OB-6 schema priority). Created concrete 5-step activation checklist for paused marketing cabinets.

[2026-04-13] Separated chevron toggle from page navigation in sidebar tree nodes — clicking the chevron now only expands/collapses, clicking the label navigates.

[2026-04-13] Agents page: moved conversations panel to the right side; added heartbeat schedule and job pills to each agent card in the org chart.

[2026-04-13] Registry detail About section now renders markdown via dangerouslySetInnerHTML using server-side unified/remark HTML conversion. Added .registry-prose CSS class with parchment-palette styles (headings, lists, code blocks, blockquotes) to globals.css.

[2026-04-13] Registry About section: strip [[wiki links]] before rendering, fix list bullets (list-style-type: disc), increase vertical spacing for readability.

[2026-04-13] Replace native window.confirm() delete prompts in sidebar with styled Dialog — triangle-alert icon in destructive/10 background, context-aware title/description for cabinet vs page vs linked dir. Updated both tree-node and tree-view cabinet delete dialogs.

[2026-04-13] White and Black themes now explicitly set font to var(--font-sans) so they use Inter rather than the browser default when data-custom-theme is active. Also optimized registry template download to use a single recursive git tree API call instead of recursive per-directory listing.

[2026-04-13] Cabinet scheduler controls: replace alarming red/green split-button with neutral muted styling; add pulsing green "Live" indicator when agents are active; unify button sizing (same height, icon size, padding).

[2026-04-13] Fix split button separation: wrap main+chevron in a shared flex container so they render as one joined control.

[2026-04-13] New Cabinet dialog: replace tiny "import a pre-made team →" text link with a full-width card button featuring icon, title, description, and arrow — separated from the create form by an "or" divider.

[2026-04-13] New Cabinet dialog: move "Import from Registry" to header top-right as a compact button next to close; remove bottom card + or-divider that made dialog too tall.

[2026-04-13] Registry browser header: add "cabinets.sh" and "Star us" (→ github.com/hilash/cabinets) link buttons in top-right. Also committed calendar overflow fix from cabinet-view/schedule-calendar.

[2026-04-13] Registry header buttons: cabinets.sh uses accentBg/accent colors; Star us uses filled accent (#8B5E3C) with white text as primary CTA.

[2026-04-13] Registry header title changed from "Cabinet Registry" to "Cabinets | AI teams, off the shelf" with the tagline in muted weight.

[2026-04-13] Editor conversations now resolve their owning cabinet by walking up the directory tree to find the nearest .cabinet manifest. Added findOwningCabinetPathForPage utility. Conversations list shows "edited: {path}" for editor agent entries.

[2026-04-13] AI Editor panel now shows optimistic "starting" sessions immediately after submit and promotes one selected live session to a visible stream area, even when work is running on another page. Added page/agent context chips, "Open Page" jump action, and background-mounted hidden terminals for non-selected sessions so streaming stays alive while the UI feels responsive.

[2026-04-13] Moved editor file-type and Cabinet-structure knowledge out of `data/getting-started` and into the canonical editor library template at `src/lib/agents/library/editor/persona.md`. New cabinet creation and onboarding now resolve agent templates from the seeded library or source fallback, enforce mandatory `ceo` + `editor`, and create full agent scaffolds including `workspace/`.

[2026-04-13] AI editor runs now use the owning cabinet's `editor` persona when editing a page inside a cabinet, fall back to the shared editor template when needed, and default their working directory to the owning cabinet instead of the global data root. Electron packaging now seeds `.agents/.library` from `src/lib/agents/library` so fresh managed data directories can install agents correctly.
[2026-04-15] Added a single-container Docker deployment for local Cabinet demos with `Dockerfile` and `docker-compose.yml`. The container builds the Next.js app, starts the daemon and web server together, mounts the existing `data/` directory, and supports a demo password via `KB_PASSWORD`.
[2026-04-15] Adjusted the Docker demo port mapping to 3100/3101 to avoid collisions with existing local containers while keeping Cabinet internal ports at 3000/3001.
[2026-04-15] Split the demo runtime so Docker serves only the Cabinet web app while the daemon runs on the host. Updated the container to use the standalone Next.js server, point daemon requests at `host.docker.internal:4100`, and publish only the web port for the local demo flow.
[2026-04-15] Split the local demo runtime so the Docker container serves only the web UI while the daemon runs on the host. Added a host-daemon env helper and relaxed CLI availability checks to recognize Codex versions that print successfully but return a non-zero status during `--version` probing.
[2026-04-15] Stopped mounting the host `data/` directory into the Docker web container so provider settings and daemon health now come from the host-run daemon rather than stale container-side config.
[2026-04-15] Routed provider status APIs through the host daemon so dockerized web UI reflects real host CLI availability/authentication for Claude Code and Codex in the split-runtime demo. Added a daemon provider-status endpoint and reused it in both provider list/status Next.js routes.

[2026-04-15] Provider APIs now read host daemon truth for authenticated availability in the Docker web app. The daemon /providers endpoint returns the full provider payload (metadata, settings, usage, availability, auth), and the web GET /api/agents/providers route now proxies that payload so UI state matches the host-run daemon.

[2026-04-15] Fixed the Docker demo provider status cache so the web container stops serving stale local-provider results after switching to the host daemon URL. Verified the live :3100 app now reaches the host daemon for health and provider status checks.

[2026-04-15] Localized the demo login surface copy through the shared zh/en i18n layer, including helper text, password placeholder, submit label, inline auth/connection errors, and loading state, while keeping the existing client-side login flow and header language switcher intact.

[2026-04-15] Localized the demo home and shared header shell copy through the zh/en message layer, covering greeting/prompt text, quick actions, registry teaser/import states, header export labels, search hint, and theme menu labels. Added i18n message formatting for template/count strings and extended the i18n tests to cover the new shell keys and English fallback behavior.

[2026-04-15] Localized the demo-visible sidebar and editor core UI for zh/en, covering sidebar actions, tree/context dialogs, load-knowledge flows, editor toolbar labels, source/preview toggle, empty state, AI prompt, and save-state copy. Added i18n assertions for these sidebar/editor surfaces while preserving English fallback behavior.
[2026-04-15] Localized remaining sidebar core literals and cabinet-creation copy, added focused regression coverage to catch hard-coded sidebar/editor strings, and verified sidebar-to-editor locale persistence in zh/en on the demo path.
[2026-04-15] Localized the Agents workspace demo-path core copy in zh/en, covering org-chart labels, visible run filters and statuses, conversation actions, and immediate agent settings/library/job affordances with English fallback. Added regression checks for the new Agents i18n keys and component wiring.
[2026-04-15] Localized the demo-scope Tasks workspace core copy in tasks-board.tsx, covering the board header and filters, lane labels and immediate actions, and the schedule view/dialog labels with zh/en message keys. Added regression assertions for the covered Tasks surface and preserved English fallback through the shared i18n layer.
[2026-04-15] Fixed the Tasks board locale-title helper call so the cabinet board title uses the supported formatter signature again, unblocking local TypeScript validation for the demo Tasks i18n surface. Added a regression assertion covering the formatted title usage in the shared i18n core test.
[2026-04-15] Completed Mission 1 Docker deployment closure: switched Google Fonts (Inter, JetBrains Mono, Instrument Serif) from next/font/google to self-hosted next/font/local with .woff2 files in src/app/fonts/ to eliminate external network dependency during Docker build. Fixed Dockerfile to clean build-time data artifacts (rm -rf data .next/standalone/data). Added CABINET_DATA_DIR=/app/data env var and ./data:/app/data volume mount in docker-compose.yml to resolve token mismatch caused by Next.js standalone server CWD being /app/.next/standalone. Fixed tasks-board.tsx JSX syntax and i18n call errors. Both /api/agents/providers/status and /api/agents/providers endpoints verified working — Claude Code shows available:true, authenticated:true from Docker container through host daemon.
[2026-04-15] Localized the Settings workspace core demo copy in settings-page.tsx, covering the page header, tab labels, appearance/storage/providers top-level text, and placeholder-tab preview labels through the shared zh/en message catalog. Added focused i18n tests for the Settings surface so covered strings stay keyed with English fallback behavior.
[2026-04-15] Localized the Settings demo surface placeholder and helper copy for providers, integrations, and notifications, including English fallback-backed alerts and preview text. Added settings i18n assertions for the newly covered first-screen copy and verified lint/typecheck with the repo test baseline still blocked by the known hard-coded path test.

[2026-04-15] Localized the remaining covered Agents first-screen copy in agents-workspace by routing the Manual filter chip, org-chart overflow summary, and department count labels through the shared locale catalog. Added focused regression coverage and re-verified the Agents surface in zh/en on the source app.
[2026-04-15] Fixed the Docker demo frontend packaging path so the standalone Next.js runtime now includes `/_next/static/*` assets inside `.next/standalone/.next/static`. Rebuilt and redeployed the Cabinet container on port 3100, then verified the login screen loads styled UI assets and hydrates its password form correctly.

[2026-04-16] Fixed agent session stuck bug: the daemon's 1500ms fallback timer was submitting prompts before Claude Code TUI initialized (~11s). Changed to skip the fallback for readyStrategy="claude" and rely on claudePromptReady() detection. Also fixed detection to match "shift+tabtocycle" (ANSI-stripped, spaceless variant). Added 30s safety fallback. Fixed Codex CLI detection: added ~/.bun/bin to RUNTIME_PATH and commandCandidates, and reordered PATH to put nvm before /usr/local/bin (which had Node v25.1.0 that broke codex native deps). Both providers now detected and functional.

[2026-04-16] Fixed Codex CLI PTY spawn PATH ordering: moved nvm bin to first position in enrichedPath (cabinet-daemon.ts) so the PTY environment uses Node v22.16.0 instead of v25.1.0. Added ~/.bun/bin to enrichedPath. Codex now launches correctly — remaining issue is auth token expiry (user needs to re-login with codex in terminal).

[2026-04-16] Localized the next demo-adjacent UI batch by wiring zh/en message keys into secondary Agents views, the task detail side panel, and the search dialog, then added regression coverage to guard those surfaces against new hard-coded copy.

[2026-04-16] Localized the next follow-up batch by routing AI panel status/empty states, conversation result chrome, and the jobs manager workspace through the shared zh/en message catalog, with added regression coverage for those surfaces.

[2026-04-16] Localized the layout follow-up batch by wiring the status bar, update dialog, and notification toasts into the shared zh/en catalog, and added regression tests to keep those chrome surfaces free of new hard-coded copy.

[2026-04-16] Localized the first mission-control follow-up batch by routing the main mission header/empty states, workspace gallery, pulse strip metric labels, and schedule picker chrome through the shared zh/en message catalog, with regression tests protecting those visible surfaces.

[2026-04-16] Localized the next mission-control batch by wiring agent detail, slack thread chrome, and create/edit agent dialog copy through the shared zh/en catalog, and added regression tests to keep those surfaces from reintroducing hard-coded strings.
[2026-04-16] Fixed the pre-existing mission-control Slack panel lint blockers by deferring its initial async loaders out of effect bodies, removed two unused dialog/detail imports, and localized the remaining Slack panel header/empty-state copy with regression coverage.
[2026-04-16] Localized the next cabinets demo batch across the cabinet org chart, task composer, scheduler controls, activity feed, stat strip, and schedule list, and added regression coverage for those surfaces in the core i18n tests.
[2026-04-16] Localized the remaining cabinet home shell copy covering the headline, board description fallback, org chart heading, agents workspace CTA, loading state, and schedule toolbar labels, with regression coverage added to the core i18n test suite.

[2026-04-16] Integrated Hermes Agent as third provider engine (alongside Claude Code and Codex CLI). New file hermes-cli.ts implements AgentProvider with one-shot CLI PTY mode (hermes chat --yolo -Q -q). Health check parses hermes status for API key presence and hermes --version for version. Added hermes venv paths to RUNTIME_PATH and enrichedPath. All three providers now detected: claude-code, codex-cli, hermes-cli.
[2026-04-16] Localized the remaining cabinet schedule chrome for the day/week/month toggle, month and weekday labels, calendar overflow badge, and scheduler stop description, with regression coverage added for the calendar surfaces.
[2026-04-16] Localized the next cabinet chrome batch in the header scope pill and job/heartbeat dialogs, covering run/save/cancel labels, prompt and schedule captions, enabled/active toggles, and fallback job title, with regression coverage added to the core i18n suite.

[2026-04-16] Fixed Hermes Agent not selectable in Settings UI. Root cause: Docker container had old build without hermes-cli registered in provider-registry. Added .worktrees to .dockerignore (was causing "no space left on device"), freed 31GB Docker cache, rebuilt container. All 3 providers now selectable in UI.
[2026-04-16] Localized cabinet status cards and schedules panel copy, including relative activity timestamps, task badges, child cabinet depth labels, and jobs/heartbeats summaries. Added regression coverage for the new cabinet i18n keys and aligned the status grid effect with the current react-hooks lint rule.

[2026-04-16] Fixed switching default provider not migrating existing agent assignments. When changing default provider in settings, all agents assigned to the old default are now automatically migrated to the new provider. Root cause: each agent persona.md had hardcoded provider field, and the default switch only changed settings but not agent assignments.
[2026-04-16] Localized the remaining cabinet schedule-list fallback label and the agent status grid scope label, plus added regression coverage to keep those strings on locale keys. Re-ran scoped typecheck and lint; the i18n test target still only has the pre-existing path-specific conversation-output-cleaning failure.
[2026-04-16] Localized the status-bar service health popup labels and provider readiness states, replacing hard-coded service copy with locale keys and adding regression coverage for those popup strings. Scoped typecheck and lint pass; the targeted test run still only hits the unrelated hard-coded path failure in conversation-output-cleaning.test.ts.
[2026-04-16] Localized the remaining visible status-bar popup copy for provider warnings, all-good state, and dismiss accessibility label, then added regression coverage to keep those remediation strings on locale keys. Scoped typecheck and lint pass; the targeted test run still only has the unrelated hard-coded path failure in conversation-output-cleaning.test.ts.
[2026-04-16] Localized the status bar save-state label and restart-required tooltip, then extended the i18n regression suite to guard those layout strings against future hard-coded regressions. Scoped typecheck and lint pass; the targeted test run still only fails on the unrelated hard-coded path assertion in conversation-output-cleaning.test.ts.
[2026-04-16] Fixed empty artifacts in conversation detail page. When agents complete work but don't output a structured cabinet block with ARTIFACT lines, the artifacts section showed "No artifacts recorded." Added fallback artifact detection that extracts file paths from git diff headers in the transcript (patterns like "→ b/path/file.md"), tool output ("Wrote to /data/..."), and Claude-style markers. Verified the researcher conversation now correctly shows both created/modified files.
[2026-04-16] Localized the standalone conversation transcript page, including header labels, requested prompt copy, result metadata labels, and artifact empty states, with locale-aware server rendering based on the query locale. Added regression coverage for the page strings; scoped lint passed, and the targeted test run still only fails on the unrelated hard-coded path assertion in conversation-output-cleaning.test.ts.
[2026-04-16] Localized the remaining agents workspace settings and org-chart editing surfaces, including metadata labels, heartbeat/job dialogs, and covered regression checks for the current demo path. This keeps the visible agents configuration flow aligned with the shared zh/en message catalog and avoids new hard-coded UI copy on those surfaces.
[2026-04-16] Localized the remaining agents workspace editing and job-library surfaces, including custom-agent creation, scheduled-job dialogs, instructions panels, and the General-agent empty state. Added focused i18n regression coverage so these visible demo-path settings flows stay on the shared zh/en message catalog with English fallback.
[2026-04-16] Enhanced WebTerminal with robust connection handling: added visible connection status overlay (connecting/error states), automatic WebSocket retry (3 attempts with backoff), HTTP polling fallback when WebSocket fails, retry button for manual recovery, and minimum container height to prevent zero-size rendering. Fixes blank screen issue when viewing running agent sessions.
[2026-04-16] Localized another agents workspace batch covering custom-agent field labels/placeholders, conversation detail/debug labels, org-chart task tooltips, conversation edited/loading copy, and quick-send composer prompts. Extended the focused i18n regression so these remaining visible agents surfaces stay on shared zh/en messages with fallback behavior.
[2026-04-16] Localized the remaining visible agents settings chrome from the latest screenshot, including the library schedule hint and jobs list tooltip text. Extended the focused agents i18n regression to guard those labels so this settings view stays aligned with the shared zh/en catalog.

[2026-04-16] Simplified status bar: removed git status, sync button, Discord/GitHub/Stars links, AI edit pill, and all related state/effects. Only the health indicator dot (green/amber/red) with its diagnostic popup remains.

[2026-04-16] Removed 'Import a pre-made zero-human team' carousel from onboarding page and 'Connect' section (Discord/email) from settings About tab.
[2026-04-16] 统一了中文 i18n 术语，将 agents/jobs/heartbeats 在已覆盖界面中改为 AI 代理、任务、心跳，并同步修正相关测试期望与 agents workspace 的触发标签类型问题。
[2026-04-16] 修正中文术语映射：task 统一为任务，jobs 统一为定时任务，并同步更新相关 i18n 文案与测试期望。
[2026-04-16] 将今天中国自然灾害信息整理为知识库简报，汇总了四川资中地震、广西桂林地质灾害黄色预警，以及多省暴雨和强对流预警，并附上官方来源链接。

[2026-04-15] Updated stale runtime docs across `README.md`, `AI-claude-editor.md`, `CLAUDE.md`, `AI_PROVIDER_RUNTIME_PROGRESS.md`, and `data/getting-started/index.md` to reflect the current adapter-based execution model. Documented that tasks/jobs/heartbeats now default to structured transcript-driven runs, listed the remaining migration work, and clarified that `WebTerminal` is being kept intentionally for interactive and future tmux-like Cabinet features.

[2026-04-16] Cathie Wood heartbeat: applied disruptive innovation lens to AAPL and META. AAPL rated bullish conviction 3 — Apple Intelligence + health platform convergence is compelling but AAPL is a platform defender, not early-stage disruptor; 5-year bull case $350. META rated bullish conviction 5 — sits at exact AI × spatial computing × social convergence ARK targets; $115-135B capex is Wright's Law in action; 5-year bull case $1,400. Both signals appended to market-analysis/signals.csv.

[2026-04-16] Image Creator heartbeat: designed 2 TikTok carousels from Script Writer briefs. Carousel 01 ("Text your mom before she sends ?", 5 slides) uses lock-screen mockup + iMessage chat bubble + giant red "?" aesthetic. Carousel 02 ("The fake mental math of reply guilt", 6 slides) uses iOS Screen Time stats card + progress bar + timer CTA aesthetic. Both saved to data/example-text-your-mom/marketing/tiktok/carousels/ and content-ideas.csv updated to "Designed" status.

[2026-04-17] Phase 3 完成：添加 .gitattributes 合并策略、docs/upstream-sync-guide.md 同步指南、npm run sync:upstream 脚本。已推送到 origin。

[2026-04-17] Phase 4 分析完成：i18n 层涉及 43 个文件（3 核心 + 43 消费者），冲突风险高；Auth 层共 13 个文件，隔离度好（大部分为 fork 专属文件）。建议：(1) i18n 提取为插件/wrapper 模式减少 ~70% 冲突；(2) Auth 命名空间化；(3) Middleware 模块化。

[2026-04-17] Re-applied i18n translations to status-bar.tsx. Added useLocale import and replaced all hardcoded user-visible strings with t() translation calls using existing message catalog keys.

[2026-04-17] 实施代码隔离策略 P0-P4：
- P0: 创建 .fork-manifest.json，记录 fork 自定义文件分类（fork-only/fork-modified/i18n-consumers/needs-re-i18n）
- P1: 将 messages.ts（1921行）拆分为 12 个领域文件（agents/auth/cabinets/core/editor/home/layout/mission-control/search/settings/sidebar/tasks），保持公共 API 完全向后兼容
- P2: 恢复 4 个因合并丢失 i18n 的组件（agents-workspace/jobs-manager/status-bar），补充 3 个缺失翻译键
- P3: 创建 src/lib/auth/index.ts barrel export，统一 auth 模块入口
- P4: 提取 middleware 认证逻辑到 src/middleware/auth-middleware.ts，主 middleware.ts 变为薄壳（~30行），支持未来与上游 middleware 组合

[2026-04-17] Replaced all ~27 remaining hardcoded English display strings in status-bar.tsx with t() i18n calls. Covers: AI placeholder, server status aria-label, provider status labels, troubleshooting messages, dismiss button, save/pull status indicators, update banner, git status, pull button, social links (Discord/GitHub), and Sync/Chat/Contribute button text.

[2026-04-17] Completed i18n for jobs-manager.tsx: replaced all remaining hardcoded English display strings with t() calls. Converted formatRelative utility to accept t parameter. Added jobs.filters.running and jobs.filters.failed keys to tasks.ts (EN + ZH).

[2026-04-17] Comprehensive i18n pass on agents-workspace.tsx: replaced ~70 hardcoded English display strings with t() calls. Added useTriggerLabels() hook for module-scope TRIGGER_LABELS, formatRelativeI18n() for time formatting, and ActivityBeacon's own useLocale(). Added 'agents.settings.runtime' and 'agents.settings.notInstalled' keys to agents.ts with Chinese translations.

[2026-04-23] Restored and tested the TreeNode rename flow on the clean rename worktree baseline. Added exported rename validation / success UI helpers, extracted a reusable `TreeNodeRenameForm` so the rename interaction can be tested without brittle Base UI portal dependencies, added focused rename unit + interaction tests, and hardened the shared jsdom DOM harness with a real URL plus missing DOM globals.
[2026-04-23] Closed the remaining rename worktree build gap by restoring `src/components/cabinets/reporting-helpers.ts` and the `PageMetaData` / `readPageMeta()` export in `src/lib/storage/page-io.ts`, matching the reporting/auth baseline this branch was missing. With those baseline blockers removed, the rename-focused tests still pass and `npm run build` now succeeds in the same worktree.
[2026-04-23] TreeNode rename interaction tests: rewrote test/tree-node-rename-interaction.test.ts to mount the real TreeNode component and exercise the full ContextMenu → Rename → Dialog path via contextmenu event + portal click. Created test/dom-preload.ts to pre-set globalThis.document before Base UI module evaluation (fixing useIsoLayoutEffect noop capture in Node.js). Added dom-preload import to tree-node-rename-ui.test.ts. All 8 tests pass (2 interaction + 6 unit). No production code modified.
[2026-04-23] Tightened the strict TreeNode rename test harness by moving Base UI jsdom polyfills under `withDomContainer()` lifecycle management and adding `test/reporting-dom-test-utils.test.ts` to lock in restore semantics for previously-absent globals. This removes hidden global leakage from the interaction test setup while keeping the real ContextMenu → Rename → Dialog coverage green.
[2026-04-23] Tightened the DOM test utils restore contract further by removing unreachable polyfill restore branches and adding a falsy-value regression case that proves original property descriptors are restored instead of deleting pre-existing keys. The strict TreeNode rename interaction coverage remains green after the cleanup.
[2026-04-23] Fixed the follow-up DOM test utils typecheck regression by reading `MouseEvent` from a `Window & typeof globalThis` view before assigning the `PointerEvent` polyfill. This keeps the strict TreeNode rename jsdom harness build-clean without changing runtime behavior.
[2026-04-23] After merging `feature/tree-node-rename-interaction` into `main`, reconciled the four stash-colliding rename files. Kept the merged `tree-node.tsx`, `reporting-helpers.ts`, and `tree-node-rename-ui.test.ts` because they were already equivalent or strictly more complete, and selectively restored the sidebar i18n terminology updates in `src/lib/i18n/messages/sidebar.ts` without reverting the rename strings required by the new interaction coverage.
[2026-04-20] 新增 X.com 每日资讯采集项目空间。在 data/x-每日资讯/ 创建中文 KB 空间（主页、追踪话题配置、每日摘要目录），并在 src/lib/jobs/job-library.ts 添加「X.com 每日资讯摘要」Job 模板（每天早 8 点，通过 xreach-cli 搜索 X.com 热门话题，AI 整理中文摘要存入知识库）。

[2026-04-20] 为 x-每日资讯 项目空间添加 .cabinet 文件，使其在侧边栏显示为工作空间（橙色图标）而非普通目录。

[2026-04-20] 为 x-每日资讯 工作空间添加「资讯分析师」Agent（.agents/analyst/persona.md）和对应的每日 Job（.jobs/x-daily-intel-digest.yaml），使 Jobs 和 Agent 正确关联到该 Cabinet 空间。

[2026-04-20] 升级 X.com 每日资讯 Job 为双语采集模式：英文关键词为主（自动翻译）、中文补充，每个关键词抓取量从 15 增至 20 条，timeout 从 900s 增至 1800s，追踪话题配置页拆分为英文/中文两组。

[2026-04-20] 将知识库 11 个文件翻译为中文，包含入门指南（含 HTML 表格）、应用与代码库、符号链接与知识加载、产品路线图、自然灾害简报（标签）、以及各 Agent persona（CEO/CTO/编辑/研究员/内容营销），所有正文、frontmatter title 与 tags 均已完成中文化。
\n[2026-04-20] Fixed remaining English wikilinks in 任务A: translated [[Apps and Repos]]→[[应用与代码库]], [[Symlinks and Load Knowledge]]→[[符号链接与知识加载]], [[Getting Started]]→[[入门指南]]. All 12 markdown files across 视频创作团队 and 任务A confirmed fully in Chinese.

[2026-04-20] 重新翻译入门指南三个文件（入门指南/index.md、应用与代码库/index.md、符号链接与知识加载/index.md），以用户提供的完整中文内容替换全文，保留所有 HTML 表格标签、代码块及文件路径不变。

[2026-04-20] 将 /data/风投操作系统/ 目录下的所有 Markdown 文件从英文翻译为中文，共翻译 31 个 .md 文件（包括各模块 index、被投企业档案、情报简报、X 动态监控列表、合伙人会议材料等）以及 4 个 .agents persona.md 文件；YAML frontmatter 键名保持英文，仅翻译值内容；文件名与目录名未作修改；.jobs YAML 文件的 prompt 字段已预先为中文无需重复处理。
[2026-04-20] 将风投操作系统知识库中35个文件从英文翻译为中文，涵盖主索引、情报中心（每日简报、X观察列表、专项研究）、交易流、竞争对手分析、财务报告、有限合伙人管理、投资组合（5家被投企业）、投资项目及团队页面，以及4个智能体角色配置文件。翻译标题、标签值及正文，保留代码块、URL、维基链接和YAML键名不变。
[2026-04-21] 为 x-每日资讯/每日摘要/2026-04-20-再次抓取测试.md 添加“一句话总结”，概括当日资讯主线为 MCP 标准化、latent reasoning、Claude 接入摩擦，以及 AI 编程工具从单点竞争转向多工具协同与安全。

[2026-04-21] 完成 Cabinet 服务重启。机器重启后 Docker UI（localhost:3100）已运行，通过 npm run dev:daemon 启动后端 daemon（localhost:4100）。两项服务均已验证正常，22 个预定任务和心跳已加载。

[2026-04-21] 完成 Cabinet 全面代码分析。扫描 321 个 TypeScript 文件，识别 12 个问题：3 个严重（编辑器跨页面污染、PUT 锁未释放、缺失类型 catch）、4 个中等（并发上传、frontmatter 验证、autoCommit 错误处理、Tree 缓存过期）、5 个轻微。详细报告见分析文档。

[2026-04-22] 将前端 i18n 中所有中文 "AI 代理" 统一改为 "AI 员工"。涵盖 7 个文件（agents/tasks/sidebar/cabinets/home/layout/settings）共 79 处，包括英文对象中意外混入的 5 处中文。保留 key 名和英文翻译不变，lint 通过。

[2026-04-23] 补齐 i18n 中文翻译：新增 home.registry.browseAll、header.productName 两个缺失 ZH 条目；将 21 个 ZH 值仍为英文的 key 翻译为中文（涵盖 Provider/Providers、Jobs/Heartbeats/Starter Library、Daemon、Company OS、Agents、Agent Slack、Scheduled jobs、Job id/sidebar.jobSingular/Plural 等）。保留品牌名/技术缩写/placeholder 示例值等 C 类条目原文不动。
[2026-04-23] 修复第二轮 i18n 漏网文案：cabinet 首页问候语改为走 `home.greeting.*`，共享 Composer 页脚的 “use @ to mention / new line” 接入通用 locale 文案，cron 人类可读文案与调度快捷选项支持中文输出（如“工作日上午 9:00”）。同时用当前代码重建并重新部署本机 Docker 的 Cabinet Web，确保 3100 上是最新前端。

[2026-04-23] 继续补齐漏网 i18n：为 AI panel 输入框、Mission Control Slack 输入框和 Agent 详情里的 Heartbeat 标签补上 zh/en 文案 key，并新增回归测试覆盖这些 placeholder/label，防止后续再回退成英文硬编码。
[2026-04-23] 修复删除目录/页面失效：删除接口不再用 `readPage()` 阻止普通目录节点删除，并统一删除目标解析，支持侧边栏虚拟路径删除纯目录与独立 `.md` 页面。新增回归测试覆盖这两种删除路径，构建通过。
[2026-04-23] 为 Docker 部署拆分 `sanitizeFilename` 纯模块，避免 `path-utils` 经由客户端依赖链把 Node `fs` 拉进浏览器打包。新增回归测试覆盖该纯 helper，并重建本地 docker compose 的 cabinet 服务，3100 健康检查恢复正常。
[2026-04-23] 修复 agent 产物跳转链路：产物路径现在会规范化为 Cabinet 页面路径，cabinet 内相对产物会自动补上 cabinet 前缀，点击产物会写入浏览器历史，回退可返回原页面。补充了产物回退解析逻辑，当 agent 上报了不存在的路径时，会回落到本次运行期间真实落盘的 KB 文件，并新增回归测试覆盖路径规范化与错误产物兜底。
[2026-04-23] 修复全局页面历史记录：`useHashRoute` 对用户触发的 section / page 切换改为写入浏览器历史栈，不再用 `replaceState` 覆盖上一页，因此普通 md 文件之间、以及其他系统页面之间的前进/回退都能按顺序工作。新增真实 hook 回归测试覆盖常规页面切换必须 `push` 新历史记录，并将修复重建部署到本机 Docker。
[2026-04-23] 修复任务看板 i18n 漏洞：cabinet 可见范围选项改为通过共享 locale helper 输出，不再在中文界面显示 “Own/Own agents only”。同时将 tasks board 的复数后缀改为按 locale 处理，避免中文摘要里出现 `草稿s`、`运行s`、`AI 员工s`，并补了对应回归测试。
[2026-04-24] 修复 cabinet reporting 的根柜子路由问题：reporting 面板和 reporting links 现在使用 canonical cabinet id 命中 `/api/cabinets/[cabinetId]/...`，同时把 `cabinetPath` 保留在 query/body 里，避免根路径 `.` 把动态路由段折叠掉。补充了 request builder、hooks、reporting 容器和 cabinet-view 传参链路的回归测试，并为 root cabinet 的 link 创建请求补齐 parent/child path 上下文。
[2026-04-24] 将 data/getting-started/apps-and-repos/index.md 翻译为中文，保留原有 markdown 结构、代码块与 `.repo.yaml` 示例不变。同步中文化页面标题、标签、正文说明与表格字段描述，并更新 modified 日期。
[2026-04-26] 修复 AI 编辑器会话详情在子 Cabinet 中加载失败的问题：实时编辑创建的会话现在会把 `cabinetPath` 保留到 AI panel 的 live/history 状态，并传给详情查询，不再硬编码根目录 `/`。新增回归测试覆盖 AI panel 的会话范围传递，避免再次出现 “Could not load conversation detail.”。
[2026-04-26] 清理 AI panel 同文件静态检查问题：移除不再使用的图标与类型 import，并把会话选择相关 effect 中的同步 setState 延后到 microtask，以满足当前 ESLint React hooks 规则。
[2026-04-26] 重建并重启 `cabinet-demo` Docker Web 容器，使 localhost:3100 使用最新 AI panel 会话范围修复。验证容器内 bundle 已不再硬编码 `cabinetPath: "/"`，并确认 `/api/health` 与 `/api/health/daemon` 返回 200。
[2026-04-26] 为 Codex CLI 供应商补充 `gpt-5.5` 和 `gpt-5.4` 主力模型选项，并放在模型选择列表最前面；两个模型都支持 low/medium/high/xhigh 推理强度。新增 provider runtime 回归测试，确保 Settings 默认模型选择能持续显示这两个模型。
[2026-04-26] 重建并重启 `cabinet-demo` Docker Web 容器，使 localhost:3100 的供应商设置页加载包含 `gpt-5.5` / `gpt-5.4` 的最新 Codex CLI 模型清单；容器内源码和 standalone bundle 均已验证包含这两个模型。
[2026-04-26] 禁用供应商配置读取缓存：`/api/agents/providers` 现在强制动态并返回 `Cache-Control: no-store`，Settings 页拉取供应商清单也使用 `cache: "no-store"`，避免 Docker Web 更新后浏览器继续展示旧模型列表。
[2026-04-26] 修复供应商模型清单被 daemon 状态覆盖的问题：Settings 供应商接口现在只从 daemon 合并 available/authenticated/version/error 运行状态，不再让 daemon 返回的旧 models 覆盖 Web 本地模型目录。新增回归测试锁定该合并边界。
[2026-04-26] 为 AI 编辑器补充 Codex CLI 图片生成入口：新增 `image_generation` 会话意图和 `/image`/`生成图片` 请求识别，专用 prompt 会要求 Codex 使用 GPT Image 2 图片生成能力并把 PNG 保存到当前页面旁的 `generated-images/` 目录，同时在 AI 面板输入区增加“生成图片”二级按钮。
[2026-04-26] 修复 Markdown 中父级相对图片路径渲染失败：`markdownToHtml` 现在会把 `../图片素材/file.png` 等相对资源统一改写为 `/api/assets/...`，避免浏览器按当前应用 URL 解析导致图片加载失败。新增回归测试覆盖父级相对图片资源、外部图片和 data URL。
[2026-04-26] 将 AI 编辑器实时会话的 Live Output 改为默认折叠的可展开面板，只保留标题、状态和展开控制常驻显示，避免右侧窄面板被中间输出内容挤满。
[2026-04-26] 重建并重启 `cabinet-demo` Docker Web 容器，使 localhost:3100 使用最新 AI 编辑器 Live Output 默认折叠改动；验证 `/api/health` 与 `/api/health/daemon` 返回 200，并确认容器内 standalone bundle 包含 `conversation-live-output` 与 `expandedOutputId`。
[2026-04-26] 扩展 AI 编辑器的非 Markdown 文件支持：AI panel 现在以当前树选中路径作为编辑目标，HTML 嵌入网站、CSV 和图片文件的 editor prompt 会明确给出可编辑目标；HTML/CSV/图片 viewer 会在 AI 会话完成后刷新当前资源。
[2026-04-26] 整理 AI panel 非 Markdown 目标支持改动的 JSX 缩进，保持打开历史会话目标与 Composer 输入区的结构清晰。
[2026-04-26] 为会计事务所 AI 工作台的 `wechat-editor` persona 增加 `md2wechat` 公众号 HTML 输出流程：公众号排版请求必须走 `inspect -> preview -> convert`，草稿上传和图片帖发布按用户明确意图分流；若本机缺少 `MD2WECHAT_API_KEY`，agent 需降级生成 preview artifact 并说明最终转换前置条件。同步验证本机 `md2wechat` CLI 可用，并用断言覆盖提示词中的关键命令路由。
[2026-04-26] Updated the wechat-editor agent persona and its demo-brief job prompt so generated HTML previews use Cabinet-renderable preview directories with `index.html` instead of standalone `.html` files.

[2026-04-26] Adjusted the wechat-editor fallback flow: when `MD2WECHAT_API_KEY` is missing, the agent must generate a Cabinet local display HTML page instead of using the `md2wechat --mode ai` degraded report as the article preview. Updated the 公众号文章 workspace index to point at renderable preview directories.

[2026-04-27] Fixed stale embedded HTML previews by making `WebsiteViewer` start with a fresh cache-buster per mount/path change and by serving `.html` assets with `Cache-Control: no-store`; this prevents regenerated Cabinet website previews from continuing to show cached degraded `md2wechat` output.

[2026-04-27] Tightened `wechat-editor` preview output rules so each article produces only one renderable HTML preview directory: `.preview/index.html` when `MD2WECHAT_API_KEY` is configured, or `.ai-preview/index.html` as the Cabinet local display fallback when it is not. Updated the WeChat article workspace index to list only the active fallback preview.
[2026-04-27] Updated the 会计事务所 AI 工作台 `deck-strategist` persona so PPT generation now defaults to the local `guizang-ppt-skill` HTML deck workflow. The prompt records the skill/template/reference paths, required theme and layout checks, output directory convention, and when to fall back to traditional PPTX.
[2026-04-27] Added an internal PowerPoint preview path for Cabinet: `.ppt/.pptx` now route as presentation files, `.pptx` assets are parsed through a new OOXML preview API, and the editor renders slide text with download/open controls. Added a targeted regression test for presentation classification and PPTX text extraction.
[2026-04-27] Rebuilt and restarted the `cabinet-demo` Docker service so localhost:3100 now includes the PPTX presentation preview route and viewer. Verified the container health endpoint and confirmed the built standalone server contains `/api/previews/presentation/[...path]`.
[2026-04-27] Added `deck-strategist-2` as a second PPT strategist for the 会计事务所 AI 工作台. This Codex-backed persona uses `gpt-image-2` for full-slide image-based PPT generation, adds a disabled manual image-PPT job, and updates the workspace index and deliverable index to distinguish it from the existing web-PPT strategist.
[2026-04-27] Added an editable HTML-deck-to-PPTX path for the 会计事务所 AI 工作台. A new `scripts/html_deck_to_editable_pptx.py` converter rebuilds Cabinet HTML decks as editable PPTX text boxes, shapes, and separate media, with regression coverage; `deck-strategist-3` and a disabled manual job now own this workflow.
[2026-04-27] Generated `04-PPT文档/AI财税服务升级建议-editable.pptx` from the existing HTML web deck and updated `PPT生成说明.md` with the PPT策略师3 conversion command, output path, and known visual differences from the browser deck.
[2026-04-27] Fixed the misleading PPTX preview surface in Cabinet by changing `PresentationViewer` from a fake slide-canvas layout to an explicit text-outline preview. The viewer now tells users Cabinet extracts PPTX text only and directs visual layout checks to Download/Open in PowerPoint, WPS, or the browser; regression coverage prevents reintroducing the old `aspect-video` pseudo-slide rendering.
[2026-04-27] Rebuilt and restarted the `cabinet-demo` Docker service so localhost:3100 includes the corrected PPTX text-outline viewer. Verified `/api/health` and `/api/health/daemon` return OK and confirmed the rebuilt standalone bundle contains the new PPTX preview wording.
[2026-04-27] Fixed the tree builder so frontmatter titles parsed by YAML as non-string values, especially date-like titles such as `2026-04-26`, no longer crash `/api/tree`. Added regression coverage for title normalization and verified the existing 会计事务所 AI 工作台 tree renders from the real data directory.
[2026-04-27] Upgraded PPTX preview from text-outline-only to visual preview first: the presentation preview API can now convert `.pptx` to PDF with LibreOffice, the viewer embeds that PDF when available, and text outline remains as the fallback. Docker now installs headless LibreOffice plus CJK fonts so the production container can render slide layouts.
[2026-04-27] Fixed AI editor panel spacing by adding a compact density for embedded conversation views, using it inside the right-side AI panel, restoring input-area padding, and preventing the panel from shrinking in the app shell flex row.
[2026-04-27] Rebuilt and restarted the `cabinet-demo` Docker Web container so localhost:3100 includes the AI editor compact-spacing fix. Verified `/api/health` and `/api/health/daemon` return OK, and confirmed the standalone/static bundles contain the updated AI panel `shrink-0` class and `conversation-live-output` view marker.
[2026-04-27] Widened the right-side AI editor panel and restored a stronger horizontal gutter across its header, session lists, expanded run cards, and input area after visual verification showed the first compact pass still looked edge-tight. Rebuilt and restarted `cabinet-demo`; verified localhost:3100 health plus production bundle markers for `w-[520px] min-w-[460px]` and `px-5 py-4`.
[2026-04-27] Cleaned the visible console errors from the AI editor flow: disabled StarterKit's built-in Link mark before registering Cabinet's customized Link extension, and stopped hash-route page loading from requesting non-Markdown embedded assets such as `index.html` through `/api/pages`.
[2026-04-27] Rebuilt and restarted the `cabinet-demo` Docker service with the AI editor console-error cleanup. Verified the Next.js production build, localhost:3100 health endpoints, and container source markers for the Link-extension and non-Markdown hash-route fixes.
[2026-04-27] Removed the embedded website iframe's `allow-same-origin` sandbox permission so Chrome no longer warns about combining it with `allow-scripts`, while keeping scripts, forms, popups, and downloads enabled for local HTML deck previews.
[2026-04-27] Tightened repository ignore rules so local Cabinet data, data backups, and machine-local agent/skill configuration directories stay out of future team commits while code, docs, and tests can be staged separately.
[2026-04-27] Fixed legacy workspace company fallback so file-backed membership resolution derives the default company from the root cabinet manifest name before falling back to its technical id. This keeps reporting authorization stable when local `data/.agents/.config/company.json` is absent.
[2026-04-27] Applied the same legacy root-manifest company fallback to request-time authorization context resolution, so reporting routes can derive company scope without relying on ignored local data configuration files.
[2026-04-27] Updated the core i18n regression expectations to match the current Chinese vocabulary for AI employees, scheduled jobs, provider labels, and mission-control surfaces while keeping local data fixtures out of this repository batch.
[2026-04-27] Reworked the cabinet v2 regression suite to create and clean up its own temporary cabinet fixtures under `DATA_DIR`, removing its dependency on tracked example `data` content that should no longer be staged with application code.
[2026-04-27] Narrowed the settings i18n regression so it verifies the message keys actually used by the settings surface while preserving the stricter check against hard-coded English demo copy.
