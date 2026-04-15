# Mission 1: Cabinet Demo Runtime Split

## Goal

把 Cabinet 从“Web 与 daemon 都跑在 Docker 中”改为“Web 跑在 Docker 中，daemon 跑在宿主机上”，从而让 Cabinet 能调用宿主机已安装并已登录的 `claude` / `codex` CLI，用于稳定的客户演示。

## Why This Mission Exists

Cabinet 当前的 provider 检测与执行逻辑会在**当前运行环境**里寻找并启动 CLI。如果 daemon 跑在容器里，它就只能看到容器内的 `claude` / `codex`，无法直接使用宿主机已有的 CLI 安装与登录态。

Multica 之所以可以“Docker 里部署 + 使用宿主机 CLI”，是因为它把服务端和本地 daemon 分开了。这个 Mission 要为 Cabinet 做一个适合 demo 的最小化版本：保持 Web 容器化，但把 daemon 放回宿主机运行。

## Scope

### In Scope
- 调整 `docker-compose.yml`，让容器只负责 Web 服务
- 调整 Docker 启动方式，移除容器内 daemon 启动
- 为 Web 配置宿主机 daemon 地址
- 确保 Docker 内 Web 可以访问宿主机 daemon（优先使用 `host.docker.internal`）
- 检查并修正 daemon 对浏览器来源/origin 的允许策略
- 在宿主机单独启动 `server/cabinet-daemon.ts`
- 验证 provider 检测能识别宿主机上的 `claude` / `codex`
- 验证从 UI 发起的 agent 操作能实际走通宿主机 daemon

### Out of Scope
- 不做 i18n
- 不做 UI 文案改造
- 不重构 provider 架构为长期的 runtime registry 体系
- 不做跨机器远程 daemon 支持
- 不做生产级部署优化，只服务于本机 demo

## Expected Deliverables

1. Docker 中只跑 Web 的可用配置
2. 宿主机 daemon 的可用启动方式
3. Web 与宿主机 daemon 通信成功
4. Cabinet UI 中的 provider 状态正常
5. 至少一条 agent 执行链路跑通宿主机 CLI
6. 最终 demo 启动说明（最少命令集合）

## Suggested Files to Inspect / Modify

- `Dockerfile`
- `docker-compose.yml`
- `.env.example`（如需补充说明或变量）
- `server/cabinet-daemon.ts`
- `scripts/dev-daemon.mjs`
- `src/lib/runtime/runtime-config.ts`
- `src/lib/agents/daemon-auth.ts`
- `src/lib/agents/provider-cli.ts`
- `src/lib/agents/provider-runtime.ts`
- `src/app/api/health/daemon/route.ts`
- `PROGRESS.md`

## Key Technical Questions To Resolve

1. Web 容器访问宿主机 daemon 的标准地址应使用什么？
   - 首选 `host.docker.internal`
   - 若有平台差异，需至少保证当前 macOS 可用

2. daemon 当前 origin 校验是否会拦截来自 Docker Web 的请求？
   - 需要确认 `CABINET_APP_ORIGIN` / `CABINET_PUBLIC_DAEMON_ORIGIN` 与实际请求来源是否一致

3. Web 端哪些接口/组件依赖 daemon 在线？
   - provider 状态
   - terminal / session
   - agent 会话与一键执行链路

4. 宿主机 daemon 是否需要指定与容器 Web 对应的 app origin？
   - 例如 `http://127.0.0.1:3100` 或 Docker 对应地址

## Success Criteria

- 打开 Docker 中的 Cabinet Web 页面可正常登录
- UI 中 provider 检测可看到宿主机已安装的 `claude` / `codex`
- 执行 agent 相关操作时，宿主机 daemon 日志能看到请求与 CLI 执行
- 不需要在 Docker 容器内额外安装 Claude Code 或 Codex CLI
- 整个 demo 启动流程可以收敛到清晰的 2 段式流程：
  1. 启动 Docker Web
  2. 启动宿主机 daemon

## Validation Checklist

- [ ] Docker Web 容器启动正常
- [ ] 登录页可访问
- [ ] daemon 在宿主机启动正常
- [ ] Web 到 daemon 的健康检查成功
- [ ] provider 检测通过
- [ ] 至少一个 agent 执行路径可用
- [ ] 没有残留“容器内 daemon”启动逻辑

## Handoff Notes For The Mission Owner

- 优先保证“稳定可演示”，不要追求架构完美
- 先打通最短链路：Web -> daemon -> host CLI
- 如果发现 terminal/pty 全量能力过重，至少保证 provider 检测和基本 agent 执行可用
- 完成后请给出最简操作说明，方便另一个 Mission 在联调时直接使用
