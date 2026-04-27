# Multi-Company, Cabinet Permissions, and Child Cabinet Reporting Plan v2

## Objective

在当前已完成的 page/page-derived 统一授权基础设施之上，收口下一阶段的 active 规划为一条主线：

1. 先固化 company、cabinet、page/page-derived resource、reporting 的领域模型
2. 再把占位的 `CompanyContext` 演进为真实租户上下文
3. 再建立 cabinet ACL 与 company/cabinet 级授权决策
4. 最后推进 child cabinet reporting 的关系模型、权限边界与服务/API 规划

本计划的目标不是立即展开完整 UI 或 hierarchy 产品化，而是把 multi-company / cabinet / reporting 的服务端边界、关系链和实施顺序统一成唯一 active 计划入口。

---

## Current Planning Context

### Already Completed Foundation

- page 与 page-derived 资源的统一授权主链已经完成，授权入口已收口到统一中心：`src/lib/auth/page-authorization.ts`
- pages/comments/locks/assets/upload 的授权迁移与 legacy 清理已进入历史计划阶段
- reporting 后端最小闭环已经存在，后续产品化 follow-up 已单独由 `plans/2026-04-22-reporting-followup-plan-v1.md` 跟进

### Why This Plan Exists

当前 active 的 multi-company 方向实际上分散在两份高度重叠的计划里：

- 一份偏领域建模
- 一份偏多 company / cabinet / reporting 实施路线

这会造成重复入口和阅读负担。因此本文件吸收两者，作为 multi-company 主线的唯一 active 计划。

---

## Initial Assessment

### Project Structure Summary

当前统一授权体系已经能稳定处理 page 与 page-derived resource，但其上层组织模型仍不完整：

- `CompanyContext` 仍然主要是 request 级占位
- page/page-derived resource 尚未稳定归属到显式 cabinet 领域模型
- cabinet ACL、membership、reporting link 等业务层边界尚未统一定义

这意味着下一阶段不能继续零散往授权中心里补规则，而应先把 company → cabinet → resource → reporting 的关系模型和实施顺序明确下来。

### Relevant Files Examination

- `src/lib/auth/page-authorization.ts`
  - 当前统一授权中心与现有 `CompanyContext` 占位入口
- `plans/2026-04-22-reporting-followup-plan-v1.md:5-11`
  - 已单独承担 reporting 后端闭环之后的 schema/UI/provider follow-up
- `PRD.md`
  - 提供 company context 与 cabinet 概念的早期产品锚点

---

## Ranked Challenges and Risks

1. **缺少真实 company membership 数据模型，导致 CompanyContext 无法成为可信授权输入**  
   Implication: 如果 actor 与 company 的关系不明确，multi-company deny 规则无法安全落地。

2. **cabinet 既是业务组织边界，又是授权边界，但目前尚未进入稳定主模型**  
   Implication: 如果 cabinet 只被路径隐式表达，后续 ACL、mapping、reporting 都会变得脆弱。

3. **child cabinet reporting 很容易被误实现为写权限继承或层级天然继承**  
   Implication: 必须把 reporting 定义为独立 action/resource 边界，而不是 cabinet write 的延伸。

4. **reporting follow-up 已有单独 active plan，若本文件不做边界收口，会与其重复**  
   Implication: 本文件必须只保留 reporting 的上层模型/权限/实施顺序，不重复 schema/UI follow-up。

---

## Clarity Assessment

- 假设 1：company 是顶层租户边界；一个 cabinet 仅属于一个 company。
- 假设 2：page 与 page-derived resource 应先归属于 cabinet，再由 cabinet 归属于 company。
- 假设 3：cabinet 是业务/授权实体，不应只被当作文件树路径概念。
- 假设 4：child cabinet reporting 是独立的 read/manage 边界，而不是对子 cabinet 编辑权限的自然继承。
- 假设 5：reporting 的 schema/UI/provider follow-up 继续由 `plans/2026-04-22-reporting-followup-plan-v1.md` 单独承接；本计划只负责其上游模型与权限边界。

---

## Implementation Plan

- [ ] Task 1. 定义顶层实体清单：Company、CompanyMembership、Cabinet、CabinetMembership、PageResource、PageDerivedResource、CabinetReportingLink。理由：先固定 multi-company 主线涉及的对象，避免 company/cabinet/reporting 概念继续重叠。
- [ ] Task 2. 明确 company → cabinet → page/page-derived resource 的从属关系与唯一性约束。理由：后续 ACL、resource mapping 与 reporting 关系都依赖稳定 ownership chain。
- [ ] Task 3. 定义 actor 访问链：actor → company memberships → active company → cabinet memberships → resource。理由：当前 `Actor` 与 `CompanyContext` 都过于扁平，无法支撑真实多租户授权。
- [ ] Task 4. 定义 company 与 cabinet 的角色分层，至少覆盖 company admin/member 与 cabinet admin/editor/viewer。理由：避免把 system admin、company admin、cabinet admin、resource write 混成一层。
- [ ] Task 5. 定义 page/page-derived resource 到 cabinet 的归属解析规则，明确是路径解析、registry 映射，还是混合模式。理由：cabinet ACL 与 reporting 聚合都依赖稳定的 cabinet mapping。
- [ ] Task 6. 定义 cabinet 级授权动作分层，区分普通资源动作、cabinet 管理动作、reporting 读取动作、reporting 管理动作。理由：防止继续把 reporting 或 cabinet 管理语义塞进 `read_raw` / `write_raw`。
- [ ] Task 7. 定义 child cabinet reporting 关系模型与硬约束，包括 parent/child、是否允许跨 company、是否允许 self link、是否允许多 parent。理由：reporting 的结构约束必须先于 route/service 细节被明确。
- [ ] Task 8. 规划 child cabinet reporting 的服务/API 边界，区分“关系管理”“汇总读取”“上卷计算”三类责任。理由：避免把 reporting 直接混入 cabinet CRUD 或 resource auth 分支。
- [ ] Task 9. 为 multi-company / cabinet / reporting 形成验证矩阵，至少覆盖 membership、company mismatch、cabinet role、reporting read/manage 四类场景。理由：当前回归保障仍主要集中在 page authorization，不足以支撑更高层业务规则。
- [ ] Task 10. 给出实施顺序建议：先领域建模，再 CompanyContext/membership，再 cabinet ACL，再 reporting 关系与权限。理由：把 active 规划落成可执行阶段顺序，避免并行发散。
- [ ] Task 11. 输出下一阶段实施输入清单，明确需要新增或扩展的 provider/service/context/types。理由：为后续真正进入编码阶段提供稳定边界。

---

## Verification Criteria

- [ ] 已明确顶层实体清单及其职责边界。
- [ ] 已明确 company → cabinet → page/resource 的归属链。
- [ ] 已明确 actor 的 membership 解析路径与 active company 选择语义。
- [ ] 已明确 company role、cabinet role、reporting action 的分层规则。
- [ ] 已明确 child cabinet reporting 的结构约束、权限边界与服务责任划分。
- [ ] 已形成可直接输入下一阶段实施的 provider/service/context/types 清单。
- [ ] 已与 `plans/2026-04-22-reporting-followup-plan-v1.md` 完成边界切分，不再重复其 schema/UI follow-up 内容。

---

## Potential Risks and Mitigations

1. **真实 membership 数据源尚不存在或结构不稳定**  
   Mitigation: 先抽象 membership provider 接口，让授权中心依赖稳定领域接口。

2. **cabinet 被误建模为纯路径概念**  
   Mitigation: 明确区分 cabinet 业务实体与路径解析线索，不让 ACL 完全耦死在文件树上。

3. **reporting 与权限继承混淆**  
   Mitigation: 把 reporting action 定义为独立边界，并在计划中显式列出禁止事项。

4. **与 reporting follow-up plan 重复，导致 active 文档再次膨胀**  
   Mitigation: 本文件只处理上层模型/权限/实施顺序；schema/UI/provider follow-up 继续留在 reporting follow-up plan。

---

## Explicit Non-Goals

本计划当前不直接展开：

- reporting UI 最小只读落地
- `ReportingSnapshotSummary` schema 冻结
- reporting provider 持久层增强
- 完整 child cabinet hierarchy 产品化
- 跨 company reporting
- 大规模前端导航或管理界面改造

这些内容由更后续的实施计划承接，尤其是：
- `plans/2026-04-22-reporting-followup-plan-v1.md`

---

## Recommended Execution Order

### Phase A — Domain Modeling
1. Task 1
2. Task 2
3. Task 3
4. Task 4
5. Task 5
6. Task 6

### Phase B — Reporting Structure Boundary
7. Task 7
8. Task 8

### Phase C — Validation and Implementation Handoff
9. Task 9
10. Task 10
11. Task 11

---

## Deliverables

本计划结束时，应该至少得到：

1. 一份稳定的 multi-company / cabinet / reporting 领域模型
2. 一份 company/cabinet/reporting action 分层规则
3. 一份 reporting 结构约束与服务责任边界说明
4. 一份覆盖 membership、cabinet ACL、reporting 权限的验证矩阵
5. 一份可直接进入编码阶段的实施输入清单
