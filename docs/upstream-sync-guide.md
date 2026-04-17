# 上游同步指南 (Upstream Sync Guide)

## 仓库结构

| Remote   | URL                                    | 说明         |
|----------|----------------------------------------|-------------|
| origin   | https://github.com/hyzwz/cabinet.git  | 你的 fork    |
| upstream | https://github.com/hilash/cabinet.git  | 上游原始仓库 |

## 日常同步流程

### 1. 查看上游更新
```bash
npm run sync:upstream
```
这会 fetch 上游并显示新 commit 列表。

### 2. 创建合并分支
```bash
git checkout -b merge/upstream-$(date +%Y-%m-%d)
```

### 3. 执行合并
```bash
git merge upstream/main
```

### 4. 解决冲突
冲突解决优先级：
- **后端 adapter/provider 代码** → 优先采用上游（架构性变更）
- **UI 组件** → 根据情况：
  - 如果上游重构了组件结构 → 采用上游，后续重新添加 i18n
  - 如果只是文本/样式改动 → 保留我们的 i18n 版本
- **PROGRESS.md** → 自动 union merge（`.gitattributes` 已配置）
- **data/ 内容文件** → 自动保留我们的版本

### 5. 验证 & 合入
```bash
npx tsc --noEmit        # 类型检查
git checkout main
git merge merge/upstream-YYYY-MM-DD
git push origin main
git branch -d merge/upstream-YYYY-MM-DD
```

## 我们的自定义功能清单

合并时需要确保以下功能不被覆盖：

| 功能 | 关键文件 |
|------|---------|
| i18n 国际化 | `src/components/i18n/`, locale messages, `useLocale()` 调用 |
| 多用户认证 | `src/app/api/auth/`, `src/middleware.ts`, `src/stores/auth-store.ts` |
| 中文命名 | `src/lib/storage/path-utils.ts` (`slugify` 函数) |
| Docker 部署 | `Dockerfile`, `docker-compose.yml` |
| Hermes Agent | `src/lib/agents/providers/hermes-cli.ts` |

## 建议同步频率

- **每周一次** `npm run sync:upstream` 检查更新
- **累积不超过 ~15 个上游 commit** 时执行合并
- 上游有大重构时（看 commit message 带 `refactor:`）提前合并，避免冲突堆积
