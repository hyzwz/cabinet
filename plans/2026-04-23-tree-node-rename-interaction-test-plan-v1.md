# TreeNode Rename Interaction Test Completion Plan

## Objective

补齐 `src/components/sidebar/tree-node.tsx` 的重命名交互测试覆盖，使测试不仅验证已抽离出的校验逻辑与成功提示展示逻辑，还能通过现有 jsdom 测试工具覆盖真实组件交互路径，确保“校验指引”和“成功反馈”在组件层级可被稳定验证。

## Initial Assessment

### Project Structure Summary

- `src/components/sidebar/tree-node.tsx` 是目标组件，当前已将重命名校验与成功提示抽离为可复用单元，便于测试，但组件级交互路径仍未被完整覆盖。来源：`src/components/sidebar/tree-node.tsx:64-98`、`src/components/sidebar/tree-node.tsx:137-142`、`src/components/sidebar/tree-node.tsx:175-190`、`src/components/sidebar/tree-node.tsx:450-490`
- `test/reporting-dom-test-utils.ts` 提供现有 jsdom 挂载与断言能力，适合承载组件级测试。来源：`test/reporting-dom-test-utils.ts:59-122`
- 当前新增测试文件 `test/tree-node-rename-ui.test.ts` 只覆盖纯函数与静态渲染，不是完整交互测试。来源：`test/tree-node-rename-ui.test.ts:1-75`
- 现有测试执行方式支持按单文件运行 `tsx --test`。来源：`package.json:23-25`

### Relevant Files Examination

- `src/components/sidebar/tree-node.tsx:71-89`
  - 信息来源：重命名校验已抽为 `getRenameValidationMessage(...)`
  - 影响：可以继续保留该抽象，但不能替代组件交互测试
- `src/components/sidebar/tree-node.tsx:91-98`
  - 信息来源：成功提示已抽为 `RenameSuccessBadge`
  - 影响：有利于独立验证成功反馈展示，但仍需验证组件状态到展示的联通路径
- `src/components/sidebar/tree-node.tsx:175-190`
  - 信息来源：提交重命名成功后设置 `renameSuccess` 并关闭对话框
  - 影响：组件级测试应覆盖这一状态变化链路
- `src/components/sidebar/tree-node.tsx:465-490`
  - 信息来源：重命名对话框根据 `renameValidationError` 展示指导文案并禁用提交按钮
  - 影响：组件级测试应验证 unchanged/invalid 等状态下的提示与按钮禁用
- `test/tree-node-rename-ui.test.ts:22-75`
  - 信息来源：当前测试仅验证逻辑函数与静态 HTML
  - 影响：可作为补充回归，但不能单独承担原任务验收
- `test/settings-page.test.ts:82-116`
  - 信息来源：已有稳定的 DOM 交互辅助函数模式，如查找按钮、输入赋值、点击事件派发
  - 影响：可参考其交互驱动方式构建 TreeNode 组件测试

### Prioritized Challenges and Risks

1. **最优先：缺少真实组件交互覆盖**
   原因：当前测试没有实际打开 rename dialog，也没有通过 `TreeNode` 组件验证 guidance 与 success 的用户路径，直接影响任务验收。来源：`test/tree-node-rename-ui.test.ts:1-75`
2. **次优先：Base UI ContextMenu/Dialog 在 jsdom 中交互较脆弱**
   原因：此前失败点集中在上下文菜单与对话框打开路径，若不处理好事件触发策略，测试仍可能不稳定。来源：`test/reporting-dom-test-utils.ts:59-122` 与当前审查结论
3. **第三优先：测试覆盖边界可能继续偏向“零件正确”而非“路径正确”**
   原因：即使保留纯函数测试，也需要补足状态流与展示联动，否则无法防止交互回归。来源：`src/components/sidebar/tree-node.tsx:175-190`、`src/components/sidebar/tree-node.tsx:351-352`

## Implementation Plan

- [ ] Task 1. 审核并确认当前 `test/tree-node-rename-ui.test.ts` 的定位，将其视为“逻辑与展示单元测试”而非交互测试基线。理由：避免误判当前覆盖范围，明确后续补测目标。状态：Not Started
- [ ] Task 2. 基于现有 jsdom 工具为 `TreeNode` 构建稳定的最小挂载场景，仅注入本次 rename 流程必须依赖的 store 状态与浏览器环境。理由：减少上下文噪音，提升交互测试稳定性。状态：Not Started
- [ ] Task 3. 设计一个可靠的 rename dialog 打开策略，优先复用现有组件结构与测试工具，而不是继续扩大实现层抽离范围。理由：原任务要求覆盖组件交互，重点在于验证真实用户路径。状态：Not Started
- [ ] Task 4. 新增或修复组件级测试，覆盖“未修改名称时显示 guidance 且提交按钮禁用”的场景。理由：这是最核心的校验指引行为，直接对应 `renameValidationError` 渲染与按钮状态。状态：Not Started
- [ ] Task 5. 新增或修复组件级测试，覆盖“成功提交 rename 后展示 success feedback”的场景。理由：需要验证从提交、成功返回到 badge 展示的状态联通链路，而不仅是单独渲染 badge。状态：Not Started
- [ ] Task 6. 保留并整理 `getRenameValidationMessage(...)` 与 `RenameSuccessBadge` 的单元测试，作为组件级测试之外的补充防线。理由：纯逻辑测试更稳定，适合作为快速回归保护。状态：Not Started
- [ ] Task 7. 运行目标单文件测试，并确认最终使用的特定测试文件可以独立通过。理由：原始任务要求运行 specific test file，因此必须保留可重复执行的单文件验证入口。状态：Not Started
- [ ] Task 8. 复核是否有不必要的公共导出或仅为测试服务的结构泄漏，并在不影响目标的前提下控制变更范围。理由：避免为测试便利而扩大组件模块边界。状态：Not Started

## Verification Criteria

- [ ] `TreeNode` 组件测试能在 jsdom 环境下稳定打开 rename 相关 UI，并断言 guidance 文案存在
- [ ] unchanged rename 场景下，提交按钮为禁用状态，且提示文案与 `sidebar.renameUnchangedPrompt` 对应
- [ ] successful rename 场景下，组件层能展示 success feedback，而不是仅验证独立 badge 组件
- [ ] 纯函数与纯展示测试继续通过，作为补充回归保护
- [ ] 特定测试文件可通过 `tsx --test <file>` 独立运行成功

## Potential Risks and Mitigations

1. **Base UI 组件在 jsdom 中事件链复杂，导致菜单或对话框无法稳定打开**
   Mitigation: 优先复用仓库中已验证的事件派发模式与 act 封装，必要时从“直接打开受控状态”角度构造最小交互入口，但仍保持组件层验证。

2. **测试为了稳定而过度抽离组件内部逻辑，进一步偏离真实交互路径**
   Mitigation: 将逻辑抽离控制在已有范围内，不再为了测试额外拆分更多 UI 控件；新增测试必须至少覆盖一次真实组件状态变更链路。

3. **成功提示测试只验证静态渲染，无法防止提交链路回归**
   Mitigation: 要求 success 场景测试断言 `renamePage` 调用与组件最终显示结果同时成立。

4. **变更范围扩大到无关代码**
   Mitigation: 仅允许修改目标组件测试、必要的测试辅助函数，以及与 rename 流程直接相关的最小代码区域。

## Alternative Approaches

1. **方案 A：继续强化当前纯函数/纯展示测试**
   说明：实现成本低、稳定性高，但无法满足“组件级 rename interaction”验收要求，适合作为补充而非最终方案。

2. **方案 B：补一组最小组件交互测试，同时保留当前单元测试**
   说明：覆盖最完整、验收匹配度最高；成本略高，但能兼顾稳定性与真实路径验证，建议优先采用。

3. **方案 C：为 ContextMenu/Dialog 额外封装测试辅助层**
   说明：可提升后续类似测试复用性，但当前任务范围偏大，除非现有工具无法支撑，否则不建议优先选择。

## Assumptions and Clarity Notes

- [ ] 假设当前抽离出的 `getRenameValidationMessage(...)` 与 `RenameSuccessBadge` 会被保留，因为它们已经形成明确的可测试边界。来源：`src/components/sidebar/tree-node.tsx:71-98`
- [ ] 假设当前任务重点仍是补齐交互测试，而不是回退现有重构。来源：用户目标与现有测试状态差异
- [ ] 假设可以在 `docs/` 下新增此计划文档，因为这是用户明确要求的输出形式
