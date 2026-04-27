# TreeNode Rename Interaction Completion Checklist

## Objective

评估当前 `TreeNode` rename 测试改动是否已经达到原始开发任务的完成标准，并给出可执行的补齐检查项，供后续实现或验收使用。

## Implementation Plan

- [ ] 检查当前测试是否真正挂载了 `TreeNode` 组件并使用现有 jsdom 测试工具驱动 rename 路径；若仍停留在导出函数或静态渲染测试，则标记为未完成。理由：原始任务明确要求组件级 rename interaction 覆盖。
- [ ] 检查当前测试是否覆盖 unchanged-name guidance 的真实显示路径，包括 rename dialog 内 guidance 文案出现以及提交按钮 disabled。理由：这部分直接对应用户可见的验证反馈。
- [ ] 检查当前测试是否覆盖 successful rename 后 tree node 本体上的 success feedback，而不是仅验证独立 badge 组件可渲染。理由：原任务要求验证成功反馈的真实组件行为。
- [ ] 检查测试是否仅修改了相关测试文件与必要的最小组件支持代码，没有扩散到无关业务逻辑。理由：原始任务要求避免修改不相关代码。
- [ ] 检查目标测试文件是否已经按指定命令单独运行并通过，且命令与结果可以被精确复现。理由：运行特定测试文件是原始任务的显式交付内容。
- [ ] 检查当前抽离出的重命名校验逻辑与成功提示组件是否仍与组件内部行为保持一致，避免出现“单测通过但真实组件路径不一致”的情况。理由：当前方案部分依赖逻辑抽离作为过渡覆盖。

## Verification Criteria

- [ ] 存在至少一个使用 jsdom utilities 挂载 `TreeNode` 的测试用例。
- [ ] rename dialog 中对 unchanged 输入显示正确 guidance，并禁用提交按钮。
- [ ] rename 成功后在 `TreeNode` 实例中可见成功反馈文案。
- [ ] 目标测试文件可以通过单独命令运行通过。
- [ ] 相关改动范围限定在目标组件与测试支持范围内。

## Potential Risks and Mitigations

1. **测试被误判为完成**
   Mitigation: 将“逻辑/展示测试”和“组件交互测试”分开验收，只有后者满足时才判定原任务完成。

2. **Base UI 在 jsdom 下导致交互测试脆弱**
   Mitigation: 使用现有 DOM utilities、稳定的事件分发方式以及最小必要的测试环境 stub，减少对实现细节的依赖。

3. **抽离逻辑与真实组件行为产生偏差**
   Mitigation: 保留抽离测试的同时，追加真实组件路径测试作为最终校验层。

## Alternative Approaches

1. **阶段性接受当前结果**：接受逻辑与展示测试作为过渡交付，后续再补真实交互测试；优点是能快速获得稳定回归覆盖，缺点是严格意义上未完成原任务。
2. **补齐最小交互测试后再验收**：在保留现有稳定测试的基础上，增加一个真实 `TreeNode` jsdom 交互用例；优点是完成度最高，缺点是需要额外处理菜单和对话框交互细节。
3. **完全按用户路径重建测试**：围绕 context menu、dialog、input、submit 全链路重做；优点是最接近真实行为，缺点是实现和维护成本更高。