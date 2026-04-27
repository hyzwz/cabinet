# Cabinet 开发计划进度核对与后续执行计划（2026-04-23）

## 目的

基于现有计划 `docs/cabinet-development-plan-2026-04-23.md` 与当前代码实现状态，重新整理：

1. 已完成项
2. 部分完成项
3. 未完成项
4. 接下来建议执行顺序

本文件作为新的执行基线，后续开发优先以这里的状态判断为准。

---

## 当前总体结论

当前进度不是从零开始，而是已经完成了：

- `page-authorization` 核心授权主线的结构化拆分
- reporting schema/build/normalize 的第一轮收口
- reporting read-only UI 与 reporting-links 管理 UI 的首轮落地
- reporting route → service → UI 的基本消费链打通
- page authorization 以及 reporting container 的部分回归验证

因此，原计划中的 **Phase C 与 Phase D 已经推进明显，Phase A 与 Phase B 处于“代码里已有事实实现，但缺少显式文档化/系统化收口”的状态**。

---

## 一、逐项核对结果

### A1. 定义 multi-company 顶层实体模型
**状态：部分完成**

**已落实到代码中的实体：**
- `CabinetReportingLink`：`src/lib/auth/reporting.ts:20-29`
- `ReportingSnapshotSummary`：`src/lib/auth/reporting.ts:31-45`
- `ReportingSnapshot` / `ReportingSnapshotSchema`：`src/lib/auth/reporting.ts:121-135`
- company / cabinet / ownership 相关类型由 page authorization 模块统一承载：`src/lib/auth/page-authorization.ts:71-240`

**判断：**
- 实体已经存在于代码中
- 但还没有形成“统一对外可复用的顶层模型说明/单一模型入口”
- 计划要求的“稳定实体清单 + 职责边界说明”还未显式收口成单独结构

**结论：**
- 功能层面部分完成
- 架构收口层面未完成

---

### A2. 明确 ownership chain
**状态：部分完成**

**已有实现依据：**
- ownership 解析与链路判定在 page authorization 中已经形成稳定逻辑：`src/lib/auth/page-authorization.ts:241-537`
- reporting 读取与管理也显式复用 ownership / scope alignment：`src/lib/auth/reporting.ts:407-431`, `src/lib/auth/reporting.ts:843-919`
- reporting link 创建时已验证 parent/child cabinet 的 company 一致性：`src/lib/auth/reporting.ts:474-500`

**判断：**
- “company → cabinet → resource” 这条归属链已经被代码实际使用
- 但唯一性约束、路径映射策略、实体/路径边界仍缺少统一明确文档化表达

**结论：**
- 运行逻辑部分完成
- 模型约束定义未完全完成

---

### A3. 定义 actor 访问链与 membership 解析
**状态：基本完成**

**已有实现依据：**
- `Actor`、`CompanyContext`、`CabinetContext` 等授权输入已成型：`src/lib/auth/page-authorization.ts:91-240`
- company membership / active company 解析已独立成模块：`src/lib/auth/page-authorization/company-context.ts:1-199`
- cabinet membership / cabinet context 解析已独立成模块：`src/lib/auth/page-authorization/cabinet-context.ts:1-248`
- 主授权入口已使用这些上下文进行统一调度：`src/lib/auth/page-authorization.ts:718-1001`

**判断：**
- 这项是前面重构主线里完成度最高的一项
- “active company 语义”“membership 输入链路”“company/cabinet role 边界”都已经进入可执行代码

**结论：**
- 基本完成
- 若要彻底关闭，需要补一版简短边界说明，但代码层已到位

---

### A4. 建立 cabinet ACL 动作分层
**状态：基本完成**

**已有实现依据：**
- action 类型已明确分层：`src/lib/auth/page-authorization.ts:27-39`
- `read_reporting` / `manage_reporting` 已从普通动作中独立：`src/lib/auth/page-authorization.ts:32-33`
- reporting 判定 helper 已独立：`src/lib/auth/page-authorization/decision-helpers.ts:181-325`

**判断：**
- 计划里要求防止继续把 reporting 塞进普通 read/write 语义，这件事已经做到
- action matrix 虽未以文档形式显式输出，但代码实际分层已经存在

**结论：**
- 基本完成

---

### B1. 定义 page/resource → cabinet 的归属解析规则
**状态：部分完成**

**已有实现依据：**
- ownership chain 支持从 virtual path 解析归属：`src/lib/auth/reporting.ts:422-430`
- page authorization 中存在资源归属/上下文解析主线：`src/lib/auth/page-authorization.ts:241-537`, `src/lib/auth/page-authorization.ts:718-1001`

**判断：**
- 规则已经被实现和调用
- 但“路径解析 / registry 映射 / 混合模式”的最终策略没有明确冻结
- 计划要求的“唯一来源”和“解析优先级规则”仍需显式收口

**结论：**
- 部分完成

---

### B2. 定义 child cabinet reporting link 约束
**状态：完成度较高，接近完成**

**已有实现依据：**
- 禁止 self link：`src/lib/auth/reporting.ts:467-469`
- 禁止跨 company：`src/lib/auth/reporting.ts:490-500`
- 禁止重复 active parent：`src/lib/auth/reporting.ts:502-534`
- 检测 reporting cycle：`src/lib/auth/reporting.ts:536-572`

**判断：**
- 这项在代码层面已经非常明确
- 计划要求的主要约束几乎都已落地
- 尚缺的是把这些约束整理成正式规则清单

**结论：**
- 近似完成

---

### B3. 规划 reporting 服务/API 边界
**状态：基本完成**

**已有实现依据：**
- relation service：`src/lib/auth/reporting.ts:574-694`
- snapshot provider / refresh service：`src/lib/auth/reporting.ts:797-817`, `src/lib/auth/reporting.ts:1007-1105`
- read service：`src/lib/auth/reporting.ts:824-833`, `src/lib/auth/reporting.ts:1107-1167`
- reporting route：`src/app/api/cabinets/[cabinetId]/reporting/route.ts:18-85`
- reporting-links route：`src/app/api/cabinets/[cabinetId]/reporting-links/route.ts:98-207`

**判断：**
- relation 管理、summary 读取、snapshot refresh 已分层
- reporting 没有直接混进 cabinet CRUD 主分支，而是形成独立 route/service 结构
- 但 reporting.ts 仍依赖 page auth 的较多类型与能力，模块边界仍可继续收窄

**结论：**
- 基本完成
- 有后续边界优化空间

---

### B4. 补验证矩阵
**状态：部分完成**

**已有实现依据：**
- page authorization 测试基线存在且前面已验证：`test/page-authorization.test.ts`
- reporting 容器交互与可视化链路测试存在：`test/reporting-containers.test.ts:24-506`

**判断：**
- 已覆盖部分授权与 UI 场景
- 但计划里要求的是 membership / company mismatch / cabinet role / reporting read/manage 的系统验证矩阵
- 当前测试更像“关键链路覆盖”，还不是“矩阵化验证”

**结论：**
- 部分完成

---

### C1. 冻结 `ReportingSnapshotSummary` schema
**状态：基本完成**

**已有实现依据：**
- schema 字段集合：`src/lib/auth/reporting.ts:31-45`
- 字段常量：`src/lib/auth/reporting.ts:64-81`
- defaults / empty summary：`src/lib/auth/reporting.ts:88-118`
- schema version：`src/lib/auth/reporting.ts:129-135`

**判断：**
- 字段集合和默认值已被集中定义
- 已有明确 schema version，满足“收口”的核心要求

**结论：**
- 基本完成

---

### C2. 收口 builder / normalize 入口
**状态：完成**

**已有实现依据：**
- `buildReportingSnapshotSummary`：`src/lib/auth/reporting.ts:195-201`
- `buildReportingSnapshotSchema`：`src/lib/auth/reporting.ts:203-212`
- `normalizeReportingSnapshot`：`src/lib/auth/reporting.ts:214-233`
- route / refresh 中统一使用 builder：`src/lib/auth/reporting.ts:1055-1094`

**判断：**
- builder 与 normalize 已形成共享入口
- route/refresh/读取链路已复用同一 summary 结构

**结论：**
- 完成

---

### C3. 补 reporting schema 回归测试
**状态：部分完成**

**已有实现依据：**
- reporting 容器测试覆盖了 route → UI 的部分消费结果：`test/reporting-containers.test.ts:24-506`
- page authorization 回归链已稳定：`test/page-authorization.test.ts`

**不足：**
- 尚未看到专门针对 reporting route summary 字段集合的 schema 断言测试
- 也未看到对 `REPORTING_SNAPSHOT_SUMMARY_FIELDS` / schema version 的直接回归测试

**结论：**
- 部分完成
- 这是当前最值得补的测试缺口之一

---

### D1. 实现 reporting 最小只读视图
**状态：完成**

**已有实现依据：**
- ReportingPanel 已消费 reporting API：`src/components/cabinets/reporting-containers.tsx:355-466`
- snapshots hook 会请求 `/api/cabinets/[cabinetId]/reporting`：`src/components/cabinets/use-reporting-data.ts:397-478`
- 有空态/错误态反馈：`src/components/cabinets/reporting-containers.tsx:454-463`

**结论：**
- 完成

---

### D2. 确定 UI 接入位置
**状态：完成**

**已有实现依据：**
- reporting 已接入 `CabinetView`：`src/components/cabinets/cabinet-view.tsx:790-806`
- 首页通过 `AppShell` 进入现有 cabinet 展示结构：`src/app/page.tsx:3-6`

**结论：**
- 完成

---

### D3. 增加最小 UI 集成验证
**状态：基本完成**

**已有实现依据：**
- reporting 容器集成测试存在：`test/reporting-containers.test.ts:24-506`
- 前面已确认 `npm run build` 可通过

**判断：**
- route → UI 消费链已有实际测试
- 若严格按计划，还可以补 API 级字段断言与更明确的 build/test 组合验证记录

**结论：**
- 基本完成

---

### E1. 评估 reporting-links 最小管理 UI
**状态：超出原计划，已先行落地初版**

**已有实现依据：**
- ReportingLinksPanel 已存在：`src/components/cabinets/reporting-containers.tsx:80-353`
- reporting-links hook 与 create/update/refresh 交互已存在：`src/components/cabinets/use-reporting-data.ts:26-348`
- reporting-links API 已存在：`src/app/api/cabinets/[cabinetId]/reporting-links/route.ts:98-207`

**判断：**
- 原计划只是“评估是否值得进入下一轮”
- 当前代码实际上已经直接实现了一个最小管理 UI
- 因此这项应改写为“评估是否继续扩展当前最小管理 UI，而不是是否要开始做”

**结论：**
- 原计划项已过时，需要更新

---

### E2. Integrations 设置页正式产品化
**状态：未开始**

**已有依据：**
- `PROGRESS.md:351`

**结论：**
- 未开始

---

### E3. Notifications 设置页正式产品化
**状态：未开始**

**已有依据：**
- `PROGRESS.md:349`
- `notifications.md:3-10`

**结论：**
- 未开始

---

### E4. Cabinet Rename 功能评估与落地准备
**状态：未开始**

**已有依据：**
- `PROGRESS.md:219`

**结论：**
- 未开始

---

## 二、按完成度归类

### 已完成
1. A3 定义 actor 访问链与 membership 解析（代码层基本完成）
2. A4 建立 cabinet ACL 动作分层（代码层基本完成）
3. C2 收口 reporting builder / normalize
4. D1 实现 reporting 最小只读视图
5. D2 确定 UI 接入位置
6. D3 增加最小 UI 集成验证（基本完成）
7. E1 reporting-links 最小管理 UI 已提前落地初版

### 部分完成
1. A1 定义 multi-company 顶层实体模型
2. A2 明确 ownership chain
3. B1 定义 page/resource → cabinet 的归属解析规则
4. B2 定义 child cabinet reporting link 约束
5. B3 规划 reporting 服务/API 边界
6. B4 补验证矩阵
7. C1 冻结 `ReportingSnapshotSummary` schema
8. C3 补 reporting schema 回归测试

### 未开始
1. E2 Integrations 设置页正式产品化
2. E3 Notifications 设置页正式产品化
3. E4 Cabinet Rename 功能评估与落地准备

---

## 三、更新后的建议执行顺序

### 第一优先级：补齐“模型定义与验证护栏”
原因：当前功能已经能跑，但模型层仍有隐式事实，测试护栏不够完整。

1. A1 顶层实体模型收口
2. A2 ownership chain 与唯一性约束收口
3. B1 cabinet mapping / resource ownership 规则收口
4. B4 验证矩阵补齐
5. C3 reporting schema 回归测试补齐

### 第二优先级：整理 reporting 边界并做最小收尾
1. B2 将 reporting link 约束整理为正式规则清单
2. B3 收窄 reporting.ts 与 page authorization 的模块边界
3. C1 将 schema 冻结状态显式化并补断言
4. E1 评估是否扩展当前 reporting-links 管理 UI

### 第三优先级：产品后续能力
1. E2 Integrations
2. E3 Notifications
3. E4 Cabinet Rename

---

## 四、建议新的收敛版任务清单

接下来建议把开发计划收敛为下面 9 个执行项：

1. 收口 Company / Cabinet / Resource / Reporting 顶层实体模型
2. 收口 ownership chain、唯一性约束与 page/resource → cabinet 映射规则
3. 把 reporting link 结构约束整理为正式规则清单并补测试
4. 补齐 multi-company / cabinet / reporting 权限验证矩阵
5. 为 reporting route 与 summary schema 增加直接字段断言测试
6. 收窄 `src/lib/auth/reporting.ts` 与 page authorization 的边界
7. 评估并决定是否扩展当前 reporting-links 最小管理 UI
8. 正式产品化 Integrations 设置页
9. 正式产品化 Notifications 设置页，并评估 Cabinet Rename 前置条件

---

## 五、最适合现在立即开工的任务

### 推荐立即开始组
1. B4 补验证矩阵
2. C3 补 reporting schema 回归测试
3. A1/A2/B1 把当前代码中的隐式模型规则整理成稳定结构

### 最推荐的第一步

**先补 C3 + B4。**

原因：
- 当前 reporting 功能主线已经存在，但缺少更扎实的回归护栏
- 在继续推进模型收口或边界优化前，先把测试补上，风险最低
- 这会直接保护：`src/lib/auth/reporting.ts:31-233`, `src/app/api/cabinets/[cabinetId]/reporting/route.ts:18-85`, `src/components/cabinets/reporting-containers.tsx:355-466`

---

## 六、当前建议结论

如果现在继续开发，建议下一步直接进入：

1. 为 reporting route / schema 增加明确字段断言测试
2. 同步补 multi-company / company mismatch / cabinet mismatch / reporting read/manage 的权限矩阵测试
3. 测试稳定后，再回头收口 A1/A2/B1 的模型定义
