# Reporting Follow-up Plan v1

## Objective

在已完成 reporting 服务层、授权层、API 层与 snapshot 刷新链的基础上，继续推进 reporting 的后续开发，优先完成：

1. `ReportingSnapshotSummary` schema 的最终冻结与共享契约收口
2. reporting UI 的最小只读落地
3. reporting 持久层与更完整使用流验证的增强准备

本计划聚焦“把 reporting 从后端最小闭环推进到可被产品实际消费的阶段”，但仍然**不进入完整 hierarchy / 多 parent / 跨 company reporting / 完整 UI 产品化**。

---

## Current Progress Snapshot

### 已完成基线

#### Reporting 服务与模型
- `CabinetReportingLink`、`ReportingSnapshot`、`ReportingSnapshotSummary` 已存在：`src/lib/auth/reporting.ts:14-65`
- summary builder / normalize 已存在：`src/lib/auth/reporting.ts:75-156`
- relation provider / snapshot provider 已存在：`src/lib/auth/reporting.ts:184-316`
- relation service / read service / refresh service 已存在：`src/lib/auth/reporting.ts:469-872`

#### Reporting 授权
- `read_reporting` / `manage_reporting` 已接入统一授权中心：`src/lib/auth/page-authorization.ts:853-898`

#### Reporting API
- 读取 reporting：`src/app/api/cabinets/[cabinetId]/reporting/route.ts:17-70`
- 管理 reporting links：`src/app/api/cabinets/[cabinetId]/reporting-links/route.ts:1-165`

#### Reporting 验证
- route/auth 测试已补：`test/page-authorization.test.ts:1043-1244`
- 最近构建链路已通过：`npm run build`

### 当前差距

虽然 reporting 后端最小闭环已经成立，但还存在这些缺口：

1. `ReportingSnapshotSummary` 虽然已显式化，但需要最终冻结为共享契约，减少后续 UI 接入时的字段漂移风险。
2. 当前没有 reporting UI，已有 API 还未被页面/组件实际消费。
3. route 级测试已经具备，但更完整的“真实使用流”验证仍然不足。
4. 文件型 provider 仍是 MVP，还缺更稳的迁移/兼容策略。

---

## Relevant Files Examination

### Reporting 核心
- `src/lib/auth/reporting.ts:27-65`
  - 当前 summary/schema 定义位置
- `src/lib/auth/reporting.ts:75-156`
  - summary builder / normalize 入口
- `src/lib/auth/reporting.ts:626-639`
  - 基于 cabinet overview 的 snapshot summary 生成逻辑

### Reporting API
- `src/app/api/cabinets/[cabinetId]/reporting/route.ts:17-70`
  - reporting 读取入口
- `src/app/api/cabinets/[cabinetId]/reporting-links/route.ts:1-165`
  - reporting-links 最小管理入口

### UI 入口与 Cabinet 页面
- `src/components/cabinets/cabinet-view.tsx`
- `src/app/page.tsx`
- `src/components/layout/app-shell.tsx`

### 现有类型与 overview 数据源
- `src/types/cabinets.ts:65-75`
- `src/lib/cabinets/overview.ts`
- `src/app/api/cabinets/overview/route.ts:5-23`

### 测试
- `test/page-authorization.test.ts:1043-1244`

---

## Ranked Challenges and Risks

1. **summary schema 若继续漂移，会让 UI/API 契约反复变化**
   - 风险最高，因为已经到了 API 可消费阶段。

2. **refresh 依赖 `CabinetOverview` 结构，overview 改动会传导到 reporting**
   - 需要通过共享 builder/schema 降低耦合影响。

3. **UI 若直接耦合 route 原始 payload，后续持久层或 schema 微调会引发回归**
   - 需要先冻结 schema，再做最小 UI。

4. **文件型 provider 仍是 MVP，若继续扩大使用范围，迁移成本会上升**
   - 当前不应一次性做大，只应增强兼容与验证。

---

## Implementation Plan

- [ ] Task 1. 冻结 `ReportingSnapshotSummary` schema，并明确共享契约边界。理由：避免 UI 接入前 schema 继续漂移。
- [ ] Task 2. 把 summary builder / normalize 的共享入口收口为唯一来源。理由：避免 route、refresh、测试各自拼结构。
- [ ] Task 3. 为 reporting API 补更严格的 schema 断言与回归测试。理由：确保字段冻结后可稳定演进。
- [ ] Task 4. 实现 reporting UI 最小只读视图。理由：让现有 API 真正被页面消费，形成最小产品闭环。
- [ ] Task 5. 决定 reporting UI 的入口位置，并最小接入 cabinet 视图或 app 主视图。理由：降低 UI 接线风险，避免大范围重构导航。
- [ ] Task 6. 为 reporting UI 增加最小集成验证。理由：确保 route → UI 消费链可工作。
- [ ] Task 7. 评估 reporting-links 是否需要最小管理 UI，仅输出结论。理由：先判断是否值得进入下一轮，而不是本轮直接做。
- [ ] Task 8. 盘点文件型 relation/snapshot provider 的增强点。理由：为下一阶段持久层产品化准备输入，而不在本轮过度扩张。
- [ ] Task 9. 形成下一轮开发入口（UI 扩展 or provider 增强）的执行建议。理由：让本阶段完成后能顺畅衔接下一轮。

---

## Recommended Execution Order

### Phase A — Schema 收口
1. Task 1
2. Task 2
3. Task 3

### Phase B — UI 最小落地
4. Task 4
5. Task 5
6. Task 6

### Phase C — 后续准备
7. Task 7
8. Task 8
9. Task 9

---

## Verification Criteria

- [ ] `ReportingSnapshotSummary` 的字段结构在代码与测试中只通过共享类型/builder 表达
- [ ] reporting route 测试对 summary schema 有明确断言
- [ ] reporting UI 能成功消费 `/api/cabinets/[cabinetId]/reporting`
- [ ] reporting UI 能在无数据时展示空态，而不是崩溃
- [ ] reporting UI 不引入新的构建错误
- [ ] `node --import tsx --test test/page-authorization.test.ts` 通过
- [ ] `npm run build` 通过

---

## Potential Risks and Mitigations

### Risk 1: UI 入口选错，导致接线扩散到过多页面
**Mitigation:** 优先复用现有 `CabinetView` 或其相邻视图做最小只读块，不新增复杂路由体系。

### Risk 2: summary schema 冻结过早，后续业务字段还会加
**Mitigation:** 冻结的是“当前最小稳定集”，并通过 builder/normalize 保留受控扩展点。

### Risk 3: refresh 与 UI 共同依赖 overview，导致耦合增加
**Mitigation:** UI 只消费 reporting API 返回的 summary，不直接读 overview 结构。

### Risk 4: provider 增强与 UI 落地同时推进，造成范围扩散
**Mitigation:** 本轮只做 provider 增强评估，不做重构级改造。

---

## Alternative Approaches

### 方案 A：先做 UI，不先冻结 schema
- 优点：页面更快可见
- 缺点：后续 schema 漂移会带来 UI 返工

### 方案 B：先继续增强 provider，不做 UI
- 优点：后端更稳
- 缺点：产品侧仍然不可见，无法验证真实消费链

### 当前推荐
先做：
1. schema 收口
2. 最小 UI 只读落地
3. provider 增强评估

这是风险最低、反馈最快的顺序。

---

## Deliverables

本阶段结束时，期望至少得到：

1. 一套明确冻结的 `ReportingSnapshotSummary` 共享契约
2. 一条可工作的 reporting UI 最小展示链路
3. 一组覆盖 schema 与 UI 消费链的测试/验证结果
4. 一份 provider 后续增强建议清单

---

## Next Step Recommendation

本计划最建议的立即实施入口是：

### 先执行 Task 1 + Task 2 + Task 3
也就是：
- 冻结 schema
- 收口共享 builder/normalize
- 补强 schema 测试

在这一步稳定后，再进入 reporting UI 最小落地。
