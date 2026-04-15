# Mission 2: Cabinet Demo i18n for Core UI

## Goal

为 Cabinet 做一个**演示范围**的中英文双语切换能力：默认中文，顶部栏可切换中/英，仅覆盖下周客户 demo 会展示到的核心页面，不做全量国际化。

## Why This Mission Exists

客户来自中欧，需要多语言界面；但这次目标是客户演示，不是一次性把整个 Cabinet 全量国际化。当前项目没有现成的 i18n 基础设施，且大量文案硬编码在各组件中，因此本 Mission 采用“demo 优先、范围受控”的策略：先把客户一定会看到的关键页面做成可切换双语。

## Scope

### In Scope
- 增加最小可用的 i18n 基础设施
- 支持两种语言：`zh` 与 `en`
- 默认语言为中文
- 顶部栏增加语言切换器
- 语言选择持久化（建议 localStorage）
- 覆盖以下页面/区域：
  - 登录页
  - 首页
  - 侧边栏
  - 编辑器核心 UI
  - Agents / 任务主界面
  - 设置页
- 保证未覆盖页面不会因为缺失翻译而报错

### Out of Scope
- 不做全站完整 i18n
- 不覆盖 onboarding 全量文案
- 不覆盖 transcript viewer、registry 深层页面、低频内部页面
- 不做多语言路由（如 `/zh`、`/en`）
- 不做服务端翻译资源加载系统，优先做前端 demo 级方案

## Expected Deliverables

1. 一套最小可用 i18n 机制
2. 顶部栏语言切换器
3. 默认中文
4. `zh` / `en` 文案字典
5. 关键 demo 页面支持双语切换
6. 未覆盖页面可继续显示英文但不影响使用

## Suggested Files to Inspect / Modify

### Likely New Files
- `src/lib/i18n/*` 或 `src/i18n/*`
- `src/components/layout/language-switcher.tsx`
- 翻译字典文件（如 `src/lib/i18n/messages/zh.ts`、`src/lib/i18n/messages/en.ts`）

### Likely Existing Files
- `src/app/layout.tsx`
- `src/app/login/page.tsx`
- `src/components/layout/header-actions.tsx`
- `src/components/layout/header.tsx`
- `src/components/home/home-screen.tsx`
- `src/components/sidebar/*`
- `src/components/editor/*`
- `src/components/agents/*`
- `src/components/tasks/*`
- `src/components/settings/settings-page.tsx`
- `PROGRESS.md`

## Translation Coverage Priorities

### Priority 1 — Must Translate
- 登录页主文案与按钮
- 首页核心标题、空态、主操作区文案
- 顶部栏按钮/提示
- 侧边栏关键操作与主导航文案
- Agents / Tasks 主界面的标题、关键按钮、主状态文本
- 设置页核心标题与常见操作项

### Priority 2 — Translate If They Appear On Demo Path
- 编辑器工具栏核心动作
- 搜索与空状态文案
- 任务相关常用按钮

### Priority 3 — Leave As English For Now
- transcript 细节页
- onboarding 大量长文案
- 低频系统页面
- 深层 registry 文案

## Key Technical Questions To Resolve

1. 采用什么级别的 i18n 机制最合适？
   - 要足够轻量，适合 demo
   - 不要引入过重的框架改造

2. 如何组织翻译 key？
   - 应按页面/区域分组，避免后续失控

3. 默认中文如何落地？
   - 初次进入默认 `zh`
   - 用户切换后记住选择

4. 顶部栏切换器放在哪？
   - 应保证客户一眼能看到，切换后立即生效

5. 未覆盖文案如何兜底？
   - 回退到英文或 key，但不能报错

## Success Criteria

- 打开 Cabinet 后默认显示中文（在本次覆盖范围内）
- 顶部栏可切换到英文
- 切换后关键 demo 页面文案即时更新
- 刷新页面后语言偏好仍保留
- 未翻译页面不影响演示，不出现明显报错或空白

## Validation Checklist

- [ ] 默认语言为中文
- [ ] 顶部栏有语言切换器
- [ ] 登录页中英文切换正常
- [ ] 首页中英文切换正常
- [ ] 侧边栏中英文切换正常
- [ ] 编辑器核心 UI 中英文切换正常
- [ ] Agents / 任务主界面中英文切换正常
- [ ] 设置页中英文切换正常
- [ ] 刷新后语言偏好保留
- [ ] 未覆盖页面不会报错

## Handoff Notes For The Mission Owner

- 这是 demo 范围 i18n，不是全量国际化，请严格控 scope
- 优先翻译客户一定会看到的 UI，避免被 onboarding 或低频页面吞掉工时
- 文案 key 建议从一开始按模块命名，方便后续继续扩展
- 与 Mission 1 的联调点主要在顶部栏、首页、Agents 主界面；不要依赖 Docker/daemon 改动完成后才开始前端部分
