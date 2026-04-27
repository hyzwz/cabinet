# Cabinet 待开发项任务计划

## 计划目标

围绕当前仓库里最明确的 active 开发主线，形成一份可执行顺序清晰、依赖关系明确的任务计划：

1. 先完成 **multi-company / cabinet / ACL / reporting** 的领域与权限建模
2. 再推进 **reporting 的 schema、测试、最小 UI 闭环**
3. 最后补齐当前仍处于占位或未开放状态的产品能力

主要依据：
- `plans/2026-04-21-2026-04-21-multi-company-cabinet-reporting-plan-v1.md:84-97`
- `plans/2026-04-21-2026-04-21-multi-company-cabinet-reporting-plan-v1.md:144-173`
- `plans/2026-04-22-reporting-followup-plan-v1.md:94-105`
- `plans/2026-04-22-reporting-followup-plan-v1.md:108-196`
- `PROGRESS.md:219`
- `PROGRESS.md:349-351`
- `PROGRESS.md:14`
- `notifications.md:3-10`

---

## Phase A：领域模型与授权边界

### A1. 定义 multi-company 顶层实体模型
**目标**  
固定公司、柜体、资源、reporting 之间的核心实体，停止概念混用。

**任务**
- 定义 Company
- 定义 CompanyMembership
- 定义 Cabinet
- 定义 CabinetMembership
- 定义 PageResource / PageDerivedResource
- 定义 CabinetReportingLink

**交付物**
- 一份稳定实体清单
- 每个实体的职责边界说明
- 基础关系图或文字化关系说明

**完成标准**
- company / cabinet / resource / reporting 概念不再重叠
- 后续 ACL 与 reporting 可以直接引用这套模型

**依据**
- `plans/2026-04-21-2026-04-21-multi-company-cabinet-reporting-plan-v1.md:86`
- `plans/2026-04-21-2026-04-21-multi-company-cabinet-reporting-plan-v1.md:102-108`

### A2. 明确 ownership chain
**目标**  
建立唯一归属链：company → cabinet → page/resource。

**任务**
- 明确 cabinet 是否唯一属于单 company
- 明确 page/page-derived resource 是否先归 cabinet 再归 company
- 定义唯一性约束
- 确定 cabinet 与文件路径之间的关系是“实体 + 映射”而不是仅路径概念

**交付物**
- ownership chain 规则表
- 唯一性与从属约束列表

**完成标准**
- 任意 page/resource 都能被解释到唯一 cabinet/company
- cabinet 不再只是路径隐式概念

**依据**
- `plans/2026-04-21-2026-04-21-multi-company-cabinet-reporting-plan-v1.md:87`
- `plans/2026-04-21-2026-04-21-multi-company-cabinet-reporting-plan-v1.md:117-118`

### A3. 定义 actor 访问链与 membership 解析
**目标**  
把当前扁平 `CompanyContext` 演进为可信授权输入。

**任务**
- 定义 actor → company memberships
- 定义 active company 的选择语义
- 定义 actor → cabinet memberships → resource 的访问链
- 梳理 system admin / company admin / cabinet admin / member 的边界

**交付物**
- membership 解析链路
- active company 语义定义
- role 层级说明

**完成标准**
- 多租户 deny/allow 规则有明确输入来源
- `CompanyContext` 可被真实 membership 数据替代

**依据**
- `plans/2026-04-21-2026-04-21-multi-company-cabinet-reporting-plan-v1.md:88-89`
- `plans/2026-04-21-2026-04-21-multi-company-cabinet-reporting-plan-v1.md:103-105`

### A4. 建立 cabinet ACL 动作分层
**目标**  
把 cabinet 管理、资源访问、reporting 权限彻底拆层。

**任务**
- 定义普通资源动作
- 定义 cabinet 管理动作
- 定义 reporting 读取动作
- 定义 reporting 管理动作
- 防止继续把 reporting 语义塞进 `read_raw` / `write_raw`

**交付物**
- ACL action matrix
- role × action 对照表

**完成标准**
- company role、cabinet role、reporting action 分层清晰
- 授权中心后续扩展不再靠补丁式追加规则

**依据**
- `plans/2026-04-21-2026-04-21-multi-company-cabinet-reporting-plan-v1.md:91-92`
- `plans/2026-04-21-2026-04-21-multi-company-cabinet-reporting-plan-v1.md:105-106`

---

## Phase B：Cabinet 与 Reporting 结构边界

### B1. 定义 page/resource → cabinet 的归属解析规则
**目标**  
确定 cabinet mapping 的最终策略。

**任务**
- 判断采用路径解析、registry 映射或混合模式
- 明确 cabinet mapping 的唯一来源
- 确保 ACL、reporting 聚合都依赖同一映射规则

**交付物**
- cabinet mapping 方案
- 解析优先级规则

**完成标准**
- cabinet 归属规则可测试、可复用
- 不会因不同模块各自解析而漂移

**依据**
- `plans/2026-04-21-2026-04-21-multi-company-cabinet-reporting-plan-v1.md:90`

### B2. 定义 child cabinet reporting link 约束
**目标**  
防止 reporting 被误做成写权限继承。

**任务**
- 定义 parent/child 关系
- 定义是否允许跨 company
- 定义是否允许 self link
- 定义是否允许多 parent
- 显式列出 reporting 禁止事项

**交付物**
- reporting link constraint 清单
- 允许/禁止场景表

**完成标准**
- reporting 是独立 action/resource 边界
- child reporting 不等于 child cabinet 编辑权限继承

**依据**
- `plans/2026-04-21-2026-04-21-multi-company-cabinet-reporting-plan-v1.md:92`
- `plans/2026-04-21-2026-04-21-multi-company-cabinet-reporting-plan-v1.md:120-124`

### B3. 规划 reporting 服务/API 边界
**目标**  
把 reporting 相关职责拆到稳定服务层。

**任务**
- 区分关系管理
- 区分汇总读取
- 区分上卷计算
- 明确哪些能力属于 reporting，哪些不属于 cabinet CRUD

**交付物**
- reporting service boundary
- API responsibility 列表
- 下一阶段 provider/service/context/types 输入清单

**完成标准**
- reporting 不混入 cabinet CRUD 主分支
- 后续编码阶段有稳定接口输入

**依据**
- `plans/2026-04-21-2026-04-21-multi-company-cabinet-reporting-plan-v1.md:93-97`
- `plans/2026-04-21-2026-04-21-multi-company-cabinet-reporting-plan-v1.md:167-173`

### B4. 补验证矩阵
**目标**  
在进入实现前，先把关键权限场景测清楚。

**任务**
- membership 场景
- company mismatch 场景
- cabinet role 场景
- reporting read/manage 场景

**交付物**
- 验证矩阵
- 场景覆盖表

**完成标准**
- 新增模型与权限边界具备可回归验证基础

**依据**
- `plans/2026-04-21-2026-04-21-multi-company-cabinet-reporting-plan-v1.md:94-95`
- `plans/2026-04-21-2026-04-21-multi-company-cabinet-reporting-plan-v1.md:169-172`

---

## Phase C：Reporting schema 收口与测试补强

### C1. 冻结 `ReportingSnapshotSummary` schema
**目标**  
为 UI 接入提供稳定共享契约。

**任务**
- 冻结字段集合
- 明确可扩展点
- 避免 route / refresh / 测试各自拼结构

**交付物**
- 最小稳定 schema
- 共享契约边界说明

**完成标准**
- schema 不再在 UI 接入前继续漂移

**依据**
- `plans/2026-04-22-reporting-followup-plan-v1.md:96-98`
- `plans/2026-04-22-reporting-followup-plan-v1.md:127-135`

### C2. 收口 builder / normalize 入口
**目标**  
让 reporting summary 只从一个共享入口产出。

**任务**
- builder 唯一化
- normalize 唯一化
- route 与 refresh 统一使用共享逻辑

**交付物**
- 单一 summary builder/normalize 入口

**完成标准**
- 代码与测试只通过共享类型/builder 表达 summary

**依据**
- `plans/2026-04-22-reporting-followup-plan-v1.md:97`
- `plans/2026-04-22-reporting-followup-plan-v1.md:129-130`

### C3. 补 reporting schema 回归测试
**目标**  
冻结后立即加测试护栏。

**任务**
- 为 reporting route 补字段断言
- 为 schema 关键字段补回归测试
- 跑已有 page authorization 相关测试

**交付物**
- schema regression tests
- route assertions

**完成标准**
- reporting route 对 summary schema 有明确断言
- 指定测试链通过

**依据**
- `plans/2026-04-22-reporting-followup-plan-v1.md:98-99`
- `plans/2026-04-22-reporting-followup-plan-v1.md:129-135`
- `plans/2026-04-22-reporting-followup-plan-v1.md:190-196`

---

## Phase D：Reporting 最小 UI 闭环

### D1. 实现 reporting 最小只读视图
**目标**  
让已有 reporting API 被实际页面消费。

**任务**
- 设计最小展示块
- 消费 `/api/cabinets/[cabinetId]/reporting`
- 做无数据空态
- 不引入复杂导航重构

**交付物**
- reporting read-only UI
- 空态展示

**完成标准**
- reporting UI 能正常展示 summary
- 无数据不崩溃

**依据**
- `plans/2026-04-22-reporting-followup-plan-v1.md:99-101`
- `plans/2026-04-22-reporting-followup-plan-v1.md:131-133`

### D2. 确定 UI 接入位置
**目标**  
把 reporting 用最小成本接入现有产品结构。

**候选位置**
- `CabinetView`
- app 主视图附近已有 cabinet 展示层

相关入口文件：
- `src/components/cabinets/cabinet-view.tsx`
- `src/app/page.tsx`
- `src/components/layout/app-shell.tsx`

**依据**
- `plans/2026-04-22-reporting-followup-plan-v1.md:63-67`

**完成标准**
- 入口位置固定
- 不引发大范围页面结构重构

### D3. 增加最小 UI 集成验证
**目标**  
验证 route → UI 消费链真实可用。

**任务**
- 补最小集成验证
- 跑 build
- 确认无构建错误

**完成标准**
- UI 消费链成立
- `npm run build` 通过

**依据**
- `plans/2026-04-22-reporting-followup-plan-v1.md:101-105`
- `plans/2026-04-22-reporting-followup-plan-v1.md:133-135`

---

## Phase E：后续产品能力补齐

### E1. 评估 reporting-links 最小管理 UI
**目标**  
不直接做大，先出结论。

**任务**
- 判断是否值得进入下一轮
- 只输出结论与推荐方案

**依据**
- `plans/2026-04-22-reporting-followup-plan-v1.md:102-104`

### E2. Integrations 设置页正式产品化
**现状**
- 仍处于 Coming Soon 占位  
  依据：`PROGRESS.md:351`

**建议任务**
- 确认 Integrations 范围
- 梳理 MCP / 调度 / 外部连接能力的优先顺序
- 决定只读版还是可配置版先落地

### E3. Notifications 设置页正式产品化
**现状**
- 仍处于 Coming Soon 占位  
  依据：`PROGRESS.md:349`

**建议任务**
- 梳理通知类型
- 设计通知偏好设置
- 对接现有 collaboration notification system

**参考**
- `PROGRESS.md:14`
- `notifications.md:3-10`

### E4. Cabinet Rename 功能评估与落地准备
**现状**
- Rename 仍被禁用  
  依据：`PROGRESS.md:219`

**建议任务**
- 评估路径迁移影响
- 评估 cabinet identity / child cabinet / reporting link / jobs / conversations 的影响范围
- 明确是否要等 cabinet 实体模型稳定后再开发

---

## 推荐执行顺序

### 推荐顺序 1：架构优先
1. Phase A
2. Phase B
3. Phase C
4. Phase D
5. Phase E

这是最稳的顺序，和现有 active plan 一致：
- `plans/2026-04-21-2026-04-21-multi-company-cabinet-reporting-plan-v1.md:144-161`
- `plans/2026-04-22-reporting-followup-plan-v1.md:108-123`

---

## 最适合立即开工的任务

如果现在要直接进入执行，建议从这 3 组开始：

### 立即开工组 1
- A1 定义 multi-company 顶层实体模型
- A2 明确 ownership chain
- A3 定义 actor/membership 访问链

### 立即开工组 2
- C1 冻结 `ReportingSnapshotSummary` schema
- C2 收口 builder / normalize
- C3 补 reporting schema 测试

### 立即开工组 3
- D1 实现 reporting 最小只读 UI
- D2 确定接入位置
- D3 跑集成验证

其中最推荐先做的是：

**先做 A1-A4，再做 C1-C3。**

原因：
- 上层模型决定权限语义，依据 `plans/2026-04-21-2026-04-21-multi-company-cabinet-reporting-plan-v1.md:5-12`
- reporting follow-up 明确要求先做 schema 收口，再做 UI，见 `plans/2026-04-22-reporting-followup-plan-v1.md:186-196`

---

## 最终收敛版任务清单

当前新计划可直接收敛为下面 12 个执行项：

1. 定义 Company / Cabinet / Resource / Reporting 顶层实体
2. 明确 ownership chain 与唯一性约束
3. 定义 membership 与 active company 访问链
4. 建立 cabinet ACL 动作分层
5. 确定 page/resource → cabinet 归属解析规则
6. 定义 child cabinet reporting 结构约束
7. 规划 reporting 服务/API 边界
8. 补 multi-company / cabinet / reporting 验证矩阵
9. 冻结 `ReportingSnapshotSummary` schema
10. 收口 reporting builder / normalize
11. 实现 reporting 最小只读 UI
12. 评估并规划 Integrations / Notifications / Cabinet Rename
