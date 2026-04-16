import test from "node:test";
import assert from "node:assert/strict";
import { formatMessage, getMessage, isLocale, normalizeLocale, type Locale } from "../src/lib/i18n/messages";

test("normalizeLocale defaults to zh for unsupported input", () => {
  assert.equal(normalizeLocale(undefined), "zh");
  assert.equal(normalizeLocale("fr"), "zh");
});

test("isLocale only accepts zh and en", () => {
  assert.equal(isLocale("zh"), true);
  assert.equal(isLocale("en"), true);
  assert.equal(isLocale("jp"), false);
});

test("getMessage returns locale-specific value when present", () => {
  assert.equal(getMessage("login.helper", "zh"), "输入密码以继续");
  assert.equal(getMessage("login.helper", "en"), "Enter password to continue");
  assert.equal(getMessage("login.passwordPlaceholder", "zh"), "密码");
  assert.equal(getMessage("login.signIn", "zh"), "登录");
  assert.equal(getMessage("login.wrongPassword", "zh"), "密码错误");
  assert.equal(getMessage("login.connectionError", "en"), "Connection error");
  assert.equal(getMessage("login.loading", "en"), "...");
});

test("getMessage falls back to English when zh translation is missing", () => {
  assert.equal(getMessage("header.productName", "zh"), "GreatClaw");
  assert.equal(getMessage("header.productName", "en"), "GreatClaw");
  assert.equal(getMessage("home.registry.browseAll", "zh"), "Browse all →");
});

test("getMessage returns localized shell copy for the covered home and header surfaces", () => {
  assert.equal(getMessage("home.greeting.morning", "zh"), "早上好");
  assert.equal(getMessage("home.greeting.afternoon", "zh"), "下午好");
  assert.equal(getMessage("home.greeting.evening", "zh"), "晚上好");
  assert.equal(getMessage("home.displayNameFallback", "zh"), "朋友");
  assert.equal(getMessage("home.prompt", "zh"), "今天我们要做什么？");
  assert.equal(getMessage("home.composerPlaceholder", "zh"), "我想创建……");
  assert.equal(getMessage("home.quickActions.brainstormIdeas", "zh"), "头脑风暴创意");
  assert.equal(getMessage("home.quickActions.mapUserJourney", "zh"), "梳理用户旅程");
  assert.equal(getMessage("home.quickActions.planRoadmap", "zh"), "规划路线图");
  assert.equal(getMessage("home.quickActions.createResearchPlan", "zh"), "创建研究计划");
  assert.equal(getMessage("home.quickActions.createRequirementsDoc", "zh"), "创建需求文档");
  assert.equal(getMessage("home.registry.heading", "zh"), "导入一个现成的零人工团队");
  assert.equal(getMessage("home.registry.importingTemplate", "zh"), "正在导入 {name}...");
  assert.equal(
    getMessage("home.registry.importingDescription", "zh"),
    "正在从注册表下载 AI 代理、任务和内容"
  );
  assert.equal(
    getMessage("home.registry.importingWarning", "zh"),
    "导入期间请不要刷新页面"
  );
  assert.equal(getMessage("header.export.copyMarkdown", "zh"), "复制 Markdown");
  assert.equal(getMessage("header.export.copyHtml", "zh"), "复制为 HTML");
  assert.equal(getMessage("header.export.downloadMarkdown", "zh"), "下载 .md");
  assert.equal(getMessage("header.export.downloadPdf", "zh"), "下载 PDF");
  assert.equal(getMessage("header.searchHint", "zh"), "搜索");
  assert.equal(getMessage("theme.default", "zh"), "默认");
  assert.equal(getMessage("theme.light", "zh"), "浅色");
  assert.equal(getMessage("theme.dark", "zh"), "深色");
  assert.equal(getMessage("theme.darkThemes", "zh"), "深色主题");
  assert.equal(getMessage("theme.lightThemes", "zh"), "浅色主题");
});


test("getMessage returns localized sidebar and editor copy for covered demo surfaces", () => {
  assert.equal(getMessage("sidebar.newPage", "zh"), "新建页面");
  assert.equal(getMessage("sidebar.newCabinet", "zh"), "新建工作空间");
  assert.equal(getMessage("sidebar.createNewPage", "zh"), "创建新页面");
  assert.equal(getMessage("sidebar.createNewCabinet", "zh"), "创建新工作空间");
  assert.equal(getMessage("sidebar.createCabinet", "zh"), "创建工作空间");
  assert.equal(getMessage("sidebar.importFromRegistry", "zh"), "从注册表导入");
  assert.equal(getMessage("sidebar.cabinetName", "zh"), "工作空间名称");
  assert.equal(getMessage("sidebar.back", "zh"), "返回");
  assert.equal(getMessage("sidebar.agents", "zh"), "AI 代理");
  assert.equal(getMessage("sidebar.tasks", "zh"), "任务");
  assert.equal(getMessage("sidebar.data", "zh"), "数据");
  assert.equal(getMessage("sidebar.addFirstPage", "zh"), "添加你的第一个页面");
  assert.equal(getMessage("sidebar.addCabinetData", "zh"), "添加 cabinet 数据");
  assert.equal(getMessage("sidebar.emptyOwnAgents", "zh"), "此 cabinet 还没有本地 AI 代理。");
  assert.equal(getMessage("sidebar.emptyVisibleAgents", "zh"), "所选 cabinet 范围内没有可见的 AI 代理。");
  assert.equal(getMessage("sidebar.addSubPage", "zh"), "添加子页面");
  assert.equal(getMessage("sidebar.loadKnowledge", "zh"), "加载知识");
  assert.equal(getMessage("sidebar.copyRelativePath", "zh"), "复制相对路径");
  assert.equal(getMessage("sidebar.copyFullPath", "zh"), "复制完整路径");
  assert.equal(getMessage("sidebar.openInFinder", "zh"), "在 Finder 中打开");
  assert.equal(getMessage("sidebar.rename", "zh"), "重命名");
  assert.equal(getMessage("sidebar.delete", "zh"), "删除");
  assert.equal(getMessage("sidebar.unlink", "zh"), "取消链接");
  assert.equal(getMessage("sidebar.folder", "zh"), "文件夹");
  assert.equal(getMessage("sidebar.browse", "zh"), "浏览");
  assert.equal(getMessage("sidebar.name", "zh"), "名称");
  assert.equal(getMessage("sidebar.forDevelopers", "zh"), "开发者选项");
  assert.equal(getMessage("sidebar.remoteUrl", "zh"), "远程 URL");
  assert.equal(getMessage("sidebar.description", "zh"), "描述");
  assert.equal(getMessage("sidebar.load", "zh"), "加载");
  assert.equal(getMessage("sidebar.pageTitlePlaceholder", "zh"), "页面标题...");
  assert.equal(getMessage("sidebar.deleteCabinetTitle", "zh"), "删除工作空间 \"{title}\"");
  assert.equal(getMessage("editor.heading1", "zh"), "标题 1");
  assert.equal(getMessage("editor.heading2", "zh"), "标题 2");
  assert.equal(getMessage("editor.heading3", "zh"), "标题 3");
  assert.equal(getMessage("editor.bold", "zh"), "加粗");
  assert.equal(getMessage("editor.italic", "zh"), "斜体");
  assert.equal(getMessage("editor.strikethrough", "zh"), "删除线");
  assert.equal(getMessage("editor.inlineCode", "zh"), "行内代码");
  assert.equal(getMessage("editor.bulletList", "zh"), "项目符号列表");
  assert.equal(getMessage("editor.orderedList", "zh"), "有序列表");
  assert.equal(getMessage("editor.blockquote", "zh"), "引用");
  assert.equal(getMessage("editor.checklist", "zh"), "清单");
  assert.equal(getMessage("editor.codeBlock", "zh"), "代码块");
  assert.equal(getMessage("editor.divider", "zh"), "分隔线");
  assert.equal(getMessage("editor.undo", "zh"), "撤销");
  assert.equal(getMessage("editor.redo", "zh"), "重做");
  assert.equal(getMessage("editor.switchToRtl", "zh"), "切换为 RTL");
  assert.equal(getMessage("editor.switchToLtr", "zh"), "切换为 LTR");
  assert.equal(getMessage("editor.preview", "zh"), "预览");
  assert.equal(getMessage("editor.source", "zh"), "源码");
  assert.equal(getMessage("editor.noPageSelected", "zh"), "未选择页面");
  assert.equal(getMessage("editor.selectPageHint", "zh"), "请从侧边栏选择页面或新建一个页面");
  assert.equal(getMessage("editor.aiPrompt", "zh"), "你希望如何编辑这个页面？");
  assert.equal(getMessage("editor.saving", "zh"), "保存中...");
  assert.equal(getMessage("editor.saved", "zh"), "已保存");
  assert.equal(getMessage("editor.saveFailed", "zh"), "保存失败");
});


test("covered sidebar and editor components use locale message keys instead of hard-coded UI copy", async () => {
  const files = {
    treeView: await import("node:fs/promises").then((fs) =>
      fs.readFile(new URL("../src/components/sidebar/tree-view.tsx", import.meta.url), "utf8")
    ),
    treeNode: await import("node:fs/promises").then((fs) =>
      fs.readFile(new URL("../src/components/sidebar/tree-node.tsx", import.meta.url), "utf8")
    ),
    newCabinetDialog: await import("node:fs/promises").then((fs) =>
      fs.readFile(new URL("../src/components/sidebar/new-cabinet-dialog.tsx", import.meta.url), "utf8")
    ),
    linkRepoDialog: await import("node:fs/promises").then((fs) =>
      fs.readFile(new URL("../src/components/sidebar/link-repo-dialog.tsx", import.meta.url), "utf8")
    ),
    editorToolbar: await import("node:fs/promises").then((fs) =>
      fs.readFile(new URL("../src/components/editor/editor-toolbar.tsx", import.meta.url), "utf8")
    ),
    editor: await import("node:fs/promises").then((fs) =>
      fs.readFile(new URL("../src/components/editor/editor.tsx", import.meta.url), "utf8")
    ),
  };

  assert.match(files.treeView, /t\("sidebar\.back"\)/);
  assert.match(files.treeView, /t\("sidebar\.tasks"\)/);
  assert.match(files.treeView, /sidebar\.copyRelativePath/);
  assert.match(files.treeView, /sidebar\.copyFullPath/);
  assert.match(files.treeView, /sidebar\.openInFinder/);
  assert.match(files.treeView, /t\("sidebar\.renameSoon"\)/);
  assert.match(files.treeView, /t\("sidebar\.addAgent"\)/);
  assert.doesNotMatch(files.treeView, />Copy Relative Path</);
  assert.doesNotMatch(files.treeView, />Copy Full Path</);
  assert.doesNotMatch(files.treeView, />Open in Finder</);
  assert.doesNotMatch(files.treeView, />Coming soon</);
  assert.doesNotMatch(files.treeView, /title="Add agent"/);

  assert.match(files.treeNode, /t\("sidebar\.addSubPage"\)/);
  assert.match(files.newCabinetDialog, /t\("sidebar\.selectAgents"\)/);
  assert.match(files.newCabinetDialog, /t\("sidebar\.selectedCount"/);
  assert.match(files.linkRepoDialog, /t\("sidebar\.loadKnowledge"\)/);
  assert.match(files.editorToolbar, /t\("editor\.heading1"\)/);
  assert.match(files.editorToolbar, /t\("editor\.switchToRtl"\)/);
  assert.match(files.editor, /t\("editor\.source"\)/);
  assert.match(files.editor, /t\("editor\.noPageSelected"\)/);
  assert.match(files.editor, /t\("editor\.aiPrompt"\)/);
  assert.match(files.editor, /t\("editor\.saveFailed"\)/);
});


test("getMessage returns localized agents workspace copy for covered demo surfaces", () => {
  assert.equal(getMessage("agents.orgChart.title", "zh"), "你的团队组织架构");
  assert.equal(getMessage("agents.orgChart.fallbackRole", "zh"), "首席执行官");
  assert.equal(getMessage("agents.conversations.allAgents", "zh"), "所有 AI 代理");
  assert.equal(getMessage("agents.filters.jobs", "zh"), "定时任务");
  assert.equal(getMessage("agents.filters.manual", "zh"), "手动");
  assert.equal(getMessage("agents.filters.job", "zh"), "定时任务");
  assert.equal(getMessage("agents.filters.heartbeat", "zh"), "心跳");
  assert.equal(getMessage("agents.filters.anyStatus", "zh"), "任意状态");
  assert.equal(formatMessage("agents.orgChart.moreCount", "zh", { count: 3 }), "+3 个更多");
  assert.equal(formatMessage("agents.orgChart.countLabel.lead", "zh", { count: 1 }), "1 名负责人");
  assert.equal(formatMessage("agents.orgChart.countLabel.agent_one", "en", { count: 1 }), "1 agent");
  assert.equal(formatMessage("agents.orgChart.countLabel.agent_other", "en", { count: 2 }), "2 agents");
  assert.equal(getMessage("agents.status.running", "zh"), "运行中");
  assert.equal(getMessage("agents.conversation.settings", "zh"), "设置");
  assert.equal(getMessage("agents.library.browse", "zh"), "浏览 AI 代理库");
  assert.equal(getMessage("agents.custom.createAgent", "zh"), "创建 AI 代理");
  assert.equal(getMessage("agents.settings.write", "zh"), "编写");
  assert.equal(getMessage("agents.jobs.save", "zh"), "保存定时任务");
});

test("covered agents workspace component uses locale message keys instead of hard-coded core UI copy", async () => {
  const file = await import("node:fs/promises").then((fs) =>
    fs.readFile(new URL("../src/components/agents/agents-workspace.tsx", import.meta.url), "utf8")
  );

  assert.match(file, /t\("agents\.orgChart\.title"\)/);
  assert.match(file, /t\("agents\.conversations\.allAgents"\)/);
  assert.match(file, /localizedTriggerLabels/);
  assert.match(file, /localizedStatusLabels/);
  assert.match(file, /t\("agents\.conversation\.settings"\)/);
  assert.match(file, /t\("agents\.library\.browse"\)/);
  assert.match(file, /t\("agents\.settings\.write"\)/);
  assert.match(file, /t\("agents\.jobs\.save"\)/);
  assert.match(file, /t\("agents\.library\.bringIn"\)/);
  assert.match(file, /t\("agents\.library\.empty"\)/);
  assert.match(file, /t\("agents\.custom\.description"\)/);
  assert.match(file, /t\("agents\.settings\.editAgent"\)/);
  assert.match(file, /t\("agents\.settings\.heartbeat"\)/);
  assert.match(file, /t\("agents\.settings\.pause"\)/);
  assert.match(file, /t\("agents\.settings\.activate"\)/);
  assert.match(file, /t\("agents\.settings\.avatar"\)/);
  assert.match(file, /t\("agents\.settings\.removeAgent"\)/);
  assert.match(file, /t\("agents\.settings\.continue"\)/);
  assert.match(file, /t\("agents\.jobs\.new"\)/);
  assert.match(file, /t\("agents\.jobs\.edit"\)/);
  assert.match(file, /t\("agents\.jobs\.starterLibrary"\)/);
  assert.match(file, /t\("agents\.jobs\.useTemplate"\)/);
  assert.match(file, /t\("agents\.jobs\.emptyDescription"\)/);
  assert.match(file, /t\("agents\.general\.manualOnly"\)/);
  assert.match(file, /t\("agents\.settings\.field\.name"\)/);
  assert.match(file, /t\("agents\.settings\.field\.slug"\)/);
  assert.match(file, /t\("agents\.settings\.field\.role"\)/);
  assert.match(file, /t\("agents\.settings\.field\.department"\)/);
  assert.match(file, /t\("agents\.settings\.field\.type"\)/);
  assert.match(file, /t\("agents\.settings\.field\.provider"\)/);
  assert.match(file, /t\("agents\.settings\.field\.workspace"\)/);
  assert.match(file, /t\("agents\.settings\.field\.instructions"\)/);
  assert.match(file, /t\("agents\.settings\.field\.avatar"\)/);
  assert.match(file, /t\("agents\.settings\.startActive"\)/);
  assert.match(file, /t\("agents\.settings\.roleSummaryEmpty"\)/);
  assert.match(file, /t\("agents\.settings\.instructionsPlaceholder"\)/);
  assert.match(file, /t\("agents\.settings\.namePlaceholder"\)/);
  assert.match(file, /t\("agents\.settings\.rolePlaceholder"\)/);
  assert.match(file, /t\("agents\.settings\.slugPlaceholder"\)/);
  assert.match(file, /t\("agents\.settings\.workspacePlaceholder"\)/);
  assert.match(file, /agents\.conversation\.edited/);
  assert.match(file, /t\("agents\.conversation\.loading"\)/);
  assert.match(file, /t\("agents\.conversation\.detailsField\.jobName"\)/);
  assert.match(file, /t\("agents\.conversation\.detailsValue\.notAvailable"\)/);
  assert.match(file, /t\("agents\.conversation\.detailsValue\.none"\)/);
  assert.match(file, /t\("agents\.orgChart\.sendTask"/);
  assert.match(file, /t\("agents\.layout\.resizeConversations"\)/);
  assert.match(file, /agents\.jobs\.suggestedSchedule/);
  assert.match(file, /agents\.jobs\.listTitleHint/);
  assert.match(file, /t\("agents\.filters\.manual"\)/);
  assert.match(file, /format\("agents\.orgChart\.moreCount"/);
  assert.match(file, /format\("agents\.orgChart\.countLabel\.lead"/);
  assert.match(file, /group\.agents\.length === 1[\s\S]*agents\.orgChart\.countLabel\.agent_one[\s\S]*agents\.orgChart\.countLabel\.agent_other/);
  assert.doesNotMatch(file, />Your Team Org Chart</);
  assert.doesNotMatch(file, />All agents</);
  assert.doesNotMatch(file, />No conversations yet\./);
  assert.doesNotMatch(file, />Browse Agent Library</);
  assert.doesNotMatch(file, />Save job</);
  assert.doesNotMatch(file, /"Bringing in\.\.\."/);
  assert.doesNotMatch(file, />Edit your own agent</);
  assert.doesNotMatch(file, />Edit agent</);
  assert.doesNotMatch(file, />New job</);
  assert.doesNotMatch(file, />Starter Library</);
  assert.doesNotMatch(file, />Manual</);
  assert.doesNotMatch(file, /No jobs yet\. Start from scratch or use a library template\./);
  assert.doesNotMatch(file, />Remove agent</);
  assert.doesNotMatch(file, />Continue</);
  assert.doesNotMatch(file, />Start active</);
  assert.doesNotMatch(file, />Name</);
  assert.doesNotMatch(file, />Slug</);
  assert.doesNotMatch(file, />Department</);
  assert.doesNotMatch(file, />Workspace</);
  assert.doesNotMatch(file, /No role summary yet/);
  assert.doesNotMatch(file, /Define how this agent should work inside Cabinet and the KB\./);
  assert.doesNotMatch(file, /edited: /);
  assert.doesNotMatch(file, /Loading conversation\.\.\./);
  assert.doesNotMatch(file, /Suggested schedule:/);
  assert.doesNotMatch(file, /Per-agent recurring prompts/);
  assert.doesNotMatch(file, /\}\s*more/);
  assert.doesNotMatch(file, /\$\{leadCount\} lead/);
});

test("getMessage returns localized tasks workspace copy for covered demo surfaces", () => {
  assert.equal(getMessage("tasks.board.title.allCabinets", "zh"), "全部 Cabinets 任务看板");
  assert.equal(getMessage("tasks.board.title.cabinet", "zh"), "{name} 任务看板");
  assert.equal(getMessage("tasks.board.openSchedule", "zh"), "定时任务与心跳");
  assert.equal(getMessage("tasks.common.refresh", "zh"), "刷新");
  assert.equal(getMessage("tasks.filters.all", "zh"), "全部");
  assert.equal(getMessage("tasks.filters.manual", "zh"), "手动");
  assert.equal(getMessage("tasks.filters.jobs", "zh"), "任务");
  assert.equal(getMessage("tasks.filters.heartbeat", "zh"), "心跳");
  assert.equal(getMessage("tasks.filters.allVisibleAgents", "zh"), "所有可见 AI 代理");
  assert.equal(getMessage("tasks.filters.ownAgentsOnly", "zh"), "仅本 Cabinet AI 代理");
  assert.equal(getMessage("tasks.lane.inbox.title", "zh"), "收件箱");
  assert.equal(getMessage("tasks.lane.running.empty", "zh"), "当前没有正在运行的任务。");
  assert.equal(getMessage("tasks.dialog.create.title", "zh"), "需要完成什么？");
  assert.equal(getMessage("tasks.dialog.create.addToInbox", "zh"), "加入收件箱");
  assert.equal(getMessage("tasks.dialog.assign.title", "zh"), "分配草稿");
  assert.equal(getMessage("tasks.dialog.assign.noVisibleAgents", "zh"), "没有可见的 AI 代理");
  assert.equal(getMessage("tasks.rowActions.stop", "zh"), "停止");
  assert.equal(getMessage("tasks.bulk.killAll", "zh"), "全部停止");
  assert.equal(getMessage("tasks.schedule.header", "zh"), "定时任务与心跳");
  assert.equal(getMessage("tasks.schedule.backToBoard", "zh"), "返回看板");
  assert.equal(getMessage("tasks.schedule.calendar", "zh"), "日历");
  assert.equal(getMessage("tasks.schedule.list", "zh"), "列表");
  assert.equal(getMessage("tasks.schedule.today", "zh"), "今天");
  assert.equal(getMessage("tasks.schedule.fullScreen", "zh"), "全屏");
  assert.equal(getMessage("tasks.schedule.exitFullScreen", "zh"), "退出全屏");
  assert.equal(getMessage("tasks.schedule.runNow", "zh"), "立即运行");
  assert.equal(getMessage("tasks.schedule.cancel", "zh"), "取消");
  assert.equal(getMessage("tasks.schedule.save", "zh"), "保存");
  assert.equal(getMessage("tasks.schedule.saving", "zh"), "保存中...");
  assert.equal(getMessage("tasks.schedule.field.schedule", "zh"), "调度");
  assert.equal(getMessage("tasks.schedule.field.prompt", "zh"), "提示词");
  assert.equal(getMessage("tasks.schedule.field.enabled", "zh"), "已启用");
  assert.equal(getMessage("tasks.schedule.field.active", "zh"), "活跃");
});

test("covered tasks workspace component uses locale message keys instead of hard-coded core UI copy", async () => {
  const file = await import("node:fs/promises").then((fs) =>
    fs.readFile(new URL("../src/components/tasks/tasks-board.tsx", import.meta.url), "utf8")
  );

  assert.match(file, /useLocale\(\)/);
  assert.match(file, /format\("tasks\.board\.title\.cabinet", \{ name: cabinetName \}\)/);
  assert.match(file, /localizedTriggerLabels/);
  assert.match(file, /localizedLaneCopy/);
  assert.match(file, /t\("tasks\.board\.openSchedule"\)/);
  assert.match(file, /t\("tasks\.common\.refresh"\)/);
  assert.match(file, /t\("tasks\.filters\.allVisibleAgents"\)/);
  assert.match(file, /t\("tasks\.lane\.inbox\.title"\)/);
  assert.match(file, /t\("tasks\.dialog\.create\.title"\)/);
  assert.match(file, /t\("tasks\.dialog\.assign\.title"\)/);
  assert.match(file, /t\("tasks\.rowActions\.stop"\)/);
  assert.match(file, /t\("tasks\.bulk\.killAll"\)/);
  assert.match(file, /t\("tasks\.schedule\.header"\)/);
  assert.match(file, /t\("tasks\.schedule\.field\.schedule"\)/);
  assert.match(file, /t\("tasks\.loading"\)/);
  assert.doesNotMatch(file, />Jobs & Heartbeats</);
  assert.doesNotMatch(file, />Refresh</);
  assert.doesNotMatch(file, />What needs to get done\\?</);
  assert.doesNotMatch(file, />Assign Draft</);
  assert.doesNotMatch(file, />Kill All</);
  assert.doesNotMatch(file, />Restart All</);
  assert.doesNotMatch(file, />Back to Board</);
  assert.doesNotMatch(file, />Calendar</);
  assert.doesNotMatch(file, />List</);
  assert.doesNotMatch(file, />Today</);
  assert.doesNotMatch(file, />Loading the task board\.\.\.</);
  assert.doesNotMatch(file, /placeholder="All visible agents"/);
  assert.doesNotMatch(file, />All visible agents</);
  assert.doesNotMatch(file, />Heartbeat</);
});

test("getMessage returns localized secondary agents, task detail, and search copy for covered follow-up surfaces", () => {
  assert.equal(getMessage("agents.library.title", "zh"), "AI 代理库");
  assert.equal(getMessage("agents.library.add", "zh"), "添加");
  assert.equal(getMessage("agents.library.adding", "zh"), "添加中...");
  assert.equal(getMessage("agents.list.title", "zh"), "AI 代理");
  assert.equal(getMessage("agents.list.addFromLibrary", "zh"), "从 Library 添加");
  assert.equal(getMessage("agents.list.newAgent", "zh"), "新建 AI 代理");
  assert.equal(getMessage("agents.general.title", "zh"), "通用");
  assert.equal(getMessage("agents.general.send", "zh"), "发送");
  assert.equal(getMessage("agents.detail.tabs.definition", "zh"), "定义");
  assert.equal(getMessage("agents.detail.tabs.jobs", "zh"), "定时任务");
  assert.equal(getMessage("agents.detail.field.department", "zh"), "部门");
  assert.equal(getMessage("agents.detail.jobs.emptyTitle", "zh"), "尚未配置定时任务");
  assert.equal(getMessage("agents.detail.sessions.empty", "zh"), "向 {name} 发送一个提示词以开始实时会话。");
  assert.equal(getMessage("tasks.detail.loadError", "zh"), "无法加载对话详情。");
  assert.equal(getMessage("search.placeholder", "zh"), "搜索页面...");
  assert.equal(getMessage("search.noResults", "zh"), "未找到结果");
  assert.equal(getMessage("search.askAi", "zh"), "询问 AI");
  assert.equal(getMessage("search.aiSearching", "zh"), "AI 搜索中...");
});

test("covered follow-up components use locale message keys instead of hard-coded core UI copy", async () => {
  const fs = await import("node:fs/promises");
  const files = {
    agentList: await fs.readFile(new URL("../src/components/agents/agent-list.tsx", import.meta.url), "utf8"),
    agentDetail: await fs.readFile(new URL("../src/components/agents/agent-detail.tsx", import.meta.url), "utf8"),
    generalAgentView: await fs.readFile(new URL("../src/components/agents/general-agent-view.tsx", import.meta.url), "utf8"),
    taskDetailPanel: await fs.readFile(new URL("../src/components/tasks/task-detail-panel.tsx", import.meta.url), "utf8"),
    searchDialog: await fs.readFile(new URL("../src/components/search/search-dialog.tsx", import.meta.url), "utf8"),
  };

  assert.match(files.agentList, /useLocale\(\)/);
  assert.match(files.agentList, /t\("agents\.library\.title"\)/);
  assert.match(files.agentList, /t\("agents\.list\.addFromLibrary"\)/);
  assert.match(files.agentList, /t\("agents\.list\.newAgent"\)/);
  assert.doesNotMatch(files.agentList, />Agent Library</);
  assert.doesNotMatch(files.agentList, />Add from Library</);
  assert.doesNotMatch(files.agentList, />New Agent</);

  assert.match(files.agentDetail, /useLocale\(\)/);
  assert.match(files.agentDetail, /t\("agents\.detail\.tabs\.definition"\)/);
  assert.match(files.agentDetail, /t\("agents\.detail\.jobs\.loading"\)/);
  assert.match(files.agentDetail, /format\("agents\.detail\.sessions\.empty", \{ name: persona\.name \}\)/);
  assert.doesNotMatch(files.agentDetail, />Definition</);
  assert.doesNotMatch(files.agentDetail, />Loading jobs\.\.\.</);
  assert.doesNotMatch(files.agentDetail, />No jobs configured</);

  assert.match(files.generalAgentView, /useLocale\(\)/);
  assert.match(files.generalAgentView, /t\("agents\.general\.title"\)/);
  assert.match(files.generalAgentView, /t\("agents\.general\.send"\)/);
  assert.doesNotMatch(files.generalAgentView, />General</);
  assert.doesNotMatch(files.generalAgentView, />Send</);

  assert.match(files.taskDetailPanel, /useLocale\(\)/);
  assert.match(files.taskDetailPanel, /formatRelative\(conversation\.startedAt, t\)/);
  assert.match(files.taskDetailPanel, /t\("tasks\.detail\.loadError"\)/);
  assert.doesNotMatch(files.taskDetailPanel, />Loading\.\.\.</);
  assert.doesNotMatch(files.taskDetailPanel, /Could not load conversation detail\./);

  assert.match(files.searchDialog, /useLocale\(\)/);
  assert.match(files.searchDialog, /t\("search\.placeholder"\)/);
  assert.match(files.searchDialog, /t\("search\.noResults"\)/);
  assert.match(files.searchDialog, /t\("search\.askAi"\)/);
  assert.doesNotMatch(files.searchDialog, /placeholder="Search pages\.\.\."/);
  assert.doesNotMatch(files.searchDialog, />No results found</);
  assert.doesNotMatch(files.searchDialog, />Ask AI</);
});

test("getMessage returns localized AI panel, conversation result, and jobs manager copy for covered follow-up surfaces", () => {
  assert.equal(getMessage("aiPanel.title", "zh"), "AI 编辑器");
  assert.equal(getMessage("aiPanel.emptyPrompt", "zh"), "告诉我你想如何编辑这个页面。");
  assert.equal(getMessage("aiPanel.liveSessions", "zh"), "实时会话");
  assert.equal(getMessage("aiPanel.openPage", "zh"), "打开页面");
  assert.equal(getMessage("aiPanel.pendingFailed", "zh"), "无法启动");
  assert.equal(getMessage("conversation.prompt", "zh"), "提示词");
  assert.equal(getMessage("conversation.openTranscript", "zh"), "打开 transcript");
  assert.equal(getMessage("conversation.result", "zh"), "结果");
  assert.equal(getMessage("conversation.noSummary", "zh"), "未捕获到摘要。");
  assert.equal(getMessage("conversation.context", "zh"), "上下文");
  assert.equal(getMessage("conversation.artifacts", "zh"), "产物");
  assert.equal(getMessage("conversation.noArtifacts", "zh"), "本次运行未记录任何产物。");
  assert.equal(getMessage("jobs.title", "zh"), "定时任务");
  assert.equal(getMessage("jobs.subtitle", "zh"), "按 agent 配置周期性工作");
  assert.equal(getMessage("jobs.allAgents", "zh"), "所有 AI 代理");
  assert.equal(getMessage("jobs.loadingAgents", "zh"), "正在加载 AI 代理...");
  assert.equal(getMessage("jobs.filters.anyStatus", "zh"), "任意状态");
  assert.equal(getMessage("jobs.emptyConversations", "zh"), "还没有计划运行。");
  assert.equal(getMessage("jobs.selectAgent", "zh"), "选择一个 AI 代理");
  assert.equal(getMessage("jobs.heartbeat.title", "zh"), "心跳");
  assert.equal(getMessage("jobs.jobName", "zh"), "定时任务名称");
  assert.equal(getMessage("jobs.saveJob", "zh"), "保存定时任务");
});

test("covered AI panel, conversation result, and jobs manager components use locale message keys instead of hard-coded core UI copy", async () => {
  const fs = await import("node:fs/promises");
  const files = {
    aiPanel: await fs.readFile(new URL("../src/components/ai-panel/ai-panel.tsx", import.meta.url), "utf8"),
    conversationResult: await fs.readFile(new URL("../src/components/agents/conversation-result-view.tsx", import.meta.url), "utf8"),
    jobsManager: await fs.readFile(new URL("../src/components/jobs/jobs-manager.tsx", import.meta.url), "utf8"),
  };

  assert.match(files.aiPanel, /useLocale\(\)/);
  assert.match(files.aiPanel, /t\("aiPanel\.title"\)/);
  assert.match(files.aiPanel, /t\("aiPanel\.openPage"\)/);
  assert.match(files.aiPanel, /t\("aiPanel\.pendingStartingTitle"\)/);
  assert.doesNotMatch(files.aiPanel, />AI Editor</);
  assert.doesNotMatch(files.aiPanel, />Open Page</);
  assert.doesNotMatch(files.aiPanel, /Starting the live editor stream/);

  assert.match(files.conversationResult, /useLocale\(\)/);
  assert.match(files.conversationResult, /t\("conversation\.prompt"\)/);
  assert.match(files.conversationResult, /t\("conversation\.openTranscript"\)/);
  assert.match(files.conversationResult, /t\("conversation\.artifacts"\)/);
  assert.doesNotMatch(files.conversationResult, />Prompt</);
  assert.doesNotMatch(files.conversationResult, />Result</);
  assert.doesNotMatch(files.conversationResult, />Artifacts</);

  assert.match(files.jobsManager, /useLocale\(\)/);
  assert.match(files.jobsManager, /t\("jobs\.title"\)/);
  assert.match(files.jobsManager, /format\("jobs\.scheduledRunsForAgent", \{ name: selectedAgent\.name \}\)/);
  assert.match(files.jobsManager, /t\("jobs\.filters\.anyStatus"\)/);
  assert.match(files.jobsManager, /t\("jobs\.selectAgent"\)/);
  assert.doesNotMatch(files.jobsManager, />Jobs</);
  assert.doesNotMatch(files.jobsManager, />All agents</);
  assert.doesNotMatch(files.jobsManager, />Loading agents\.\.\.</);
});

test("getMessage returns localized layout chrome copy for covered follow-up surfaces", () => {
  assert.equal(getMessage("layout.status.aiPlaceholder", "zh"), "如何编辑这个页面？");
  assert.equal(getMessage("layout.status.health.allRunning", "zh"), "所有系统运行正常");
  assert.equal(getMessage("layout.status.health.appDown", "zh"), "应用服务未响应");
  assert.equal(getMessage("layout.status.health.degraded", "zh"), "已降级");
  assert.equal(getMessage("layout.status.saved", "zh"), "已保存");
  assert.equal(getMessage("layout.status.ready", "zh"), "就绪");
  assert.equal(getMessage("layout.status.uncommitted", "zh"), "{count} 个未提交");
  assert.equal(getMessage("layout.status.pullLatest", "zh"), "拉取最新 GitHub 变更并刷新");
  assert.equal(getMessage("layout.status.discord", "zh"), "前往 Discord 获取支持和反馈");
  assert.equal(getMessage("layout.update.title", "zh"), "GreatClaw 更新");
  assert.equal(getMessage("layout.update.later", "zh"), "稍后");
  assert.equal(getMessage("layout.update.releaseNotes", "zh"), "发布说明");
  assert.equal(getMessage("layout.notifications.completed", "zh"), "已完成");
  assert.equal(getMessage("layout.notifications.failed", "zh"), "失败");
});

test("covered layout components use locale message keys instead of hard-coded core UI copy", async () => {
  const fs = await import("node:fs/promises");
  const files = {
    statusBar: await fs.readFile(new URL("../src/components/layout/status-bar.tsx", import.meta.url), "utf8"),
    updateDialog: await fs.readFile(new URL("../src/components/layout/update-dialog.tsx", import.meta.url), "utf8"),
    notificationToasts: await fs.readFile(new URL("../src/components/layout/notification-toasts.tsx", import.meta.url), "utf8"),
  };

  assert.match(files.statusBar, /useLocale\(\)/);
  assert.match(files.statusBar, /t\("layout\.status\.aiPlaceholder"\)/);
  assert.match(files.statusBar, /t\("layout\.status\.saved"\)/);
  assert.match(files.statusBar, /format\("layout\.status\.uncommitted", \{ count: uncommitted \}\)/);
  assert.doesNotMatch(files.statusBar, /placeholder="How to edit this page\?"/);
  assert.doesNotMatch(files.statusBar, />All systems running</);

  assert.match(files.updateDialog, /useLocale\(\)/);
  assert.match(files.updateDialog, /t\("layout\.update\.title"\)/);
  assert.match(files.updateDialog, /t\("layout\.update\.later"\)/);
  assert.doesNotMatch(files.updateDialog, />Later</);

  assert.match(files.notificationToasts, /useLocale\(\)/);
  assert.match(files.notificationToasts, /t\("layout\.notifications\.completed"\)/);
  assert.match(files.notificationToasts, /t\("layout\.notifications\.failed"\)/);
  assert.doesNotMatch(files.notificationToasts, />Completed</);
  assert.doesNotMatch(files.notificationToasts, />Failed</);
});

test("getMessage returns localized mission-control batch copy for covered follow-up surfaces", () => {
  assert.equal(getMessage("mission.header.companyOs", "zh"), "Company OS");
  assert.equal(getMessage("mission.header.yourCompanyOs", "zh"), "你的 Company OS");
  assert.equal(getMessage("mission.header.startTeam", "zh"), "启动团队");
  assert.equal(getMessage("mission.header.newAgent", "zh"), "新建 Agent");
  assert.equal(getMessage("mission.goals.allGoals", "zh"), "全部目标");
  assert.equal(getMessage("mission.empty.noAgents", "zh"), "尚未配置 agents");
  assert.equal(getMessage("mission.empty.createFirstAgent", "zh"), "创建你的第一个 agent，开始使用 GreatClaw Agents。");
  assert.equal(getMessage("mission.createAgent", "zh"), "创建 Agent");
  assert.equal(getMessage("mission.workspaceGallery.title", "zh"), "工作区图库");
  assert.equal(getMessage("mission.workspaceGallery.back", "zh"), "返回 Mission Control");
  assert.equal(getMessage("mission.workspaceGallery.loading", "zh"), "正在扫描工作区...");
  assert.equal(getMessage("mission.pulse.agents", "zh"), "Agents");
  assert.equal(getMessage("mission.pulse.runningPlays", "zh"), "运行中的 Plays");
  assert.equal(getMessage("mission.pulse.costBreakdown", "zh"), "成本明细");
  assert.equal(getMessage("mission.schedule.showCron", "zh"), "显示 cron 表达式");
});

test("covered mission-control components use locale message keys instead of hard-coded core UI copy", async () => {
  const fs = await import("node:fs/promises");
  const files = {
    missionControl: await fs.readFile(new URL("../src/components/mission-control/mission-control.tsx", import.meta.url), "utf8"),
    workspaceGallery: await fs.readFile(new URL("../src/components/mission-control/workspace-gallery.tsx", import.meta.url), "utf8"),
    pulseStrip: await fs.readFile(new URL("../src/components/mission-control/pulse-strip.tsx", import.meta.url), "utf8"),
    schedulePicker: await fs.readFile(new URL("../src/components/mission-control/schedule-picker.tsx", import.meta.url), "utf8"),
  };

  assert.match(files.missionControl, /useLocale\(\)/);
  assert.match(files.missionControl, /t\("mission\.header\.startTeam"\)/);
  assert.match(files.missionControl, /t\("mission\.createAgent"\)/);
  assert.doesNotMatch(files.missionControl, />Start Team</);
  assert.doesNotMatch(files.missionControl, />Create Agent</);

  assert.match(files.workspaceGallery, /useLocale\(\)/);
  assert.match(files.workspaceGallery, /t\("mission\.workspaceGallery\.title"\)/);
  assert.match(files.workspaceGallery, /t\("mission\.workspaceGallery\.loading"\)/);
  assert.doesNotMatch(files.workspaceGallery, />Workspace Gallery</);

  assert.match(files.pulseStrip, /useLocale\(\)/);
  assert.match(files.pulseStrip, /t\("mission\.pulse\.agents"\)/);
  assert.match(files.pulseStrip, /t\("mission\.pulse\.runningPlays"\)/);
  assert.doesNotMatch(files.pulseStrip, /label="Agents"/);

  assert.match(files.schedulePicker, /useLocale\(\)/);
  assert.match(files.schedulePicker, /t\("mission\.schedule\.showCron"\)/);
  assert.doesNotMatch(files.schedulePicker, /Show cron expression/);
});

test("getMessage returns localized mission-control dialog and detail copy for covered follow-up surfaces", () => {
  assert.equal(getMessage("mission.detail.live", "zh"), "运行中");
  assert.equal(getMessage("mission.detail.paused", "zh"), "已暂停");
  assert.equal(getMessage("mission.detail.departmentLead", "zh"), "部门负责人");
  assert.equal(getMessage("mission.detail.goals", "zh"), "目标");
  assert.equal(getMessage("mission.detail.workspaceEmpty", "zh"), "还没有工作区文件。agent 运行后会在这里创建文件。");
  assert.equal(getMessage("mission.detail.taskInbox", "zh"), "任务收件箱");
  assert.equal(getMessage("mission.detail.runHeartbeat", "zh"), "运行 Heartbeat");
  assert.equal(getMessage("mission.slack.thread", "zh"), "线程");
  assert.equal(getMessage("mission.slack.noReplies", "zh"), "这个线程里还没有回复。");
  assert.equal(getMessage("mission.slack.you", "zh"), "你");
  assert.equal(getMessage("mission.slack.reply", "zh"), "回复");
  assert.equal(getMessage("mission.slack.thinking", "zh"), "思考中");
  assert.equal(getMessage("mission.slack.title", "zh"), "Agent Slack");
  assert.equal(formatMessage("mission.slack.emptyChannel", "zh", { channel: "general" }), "#general 里还没有消息。agents 运行后会在这里发消息。");
  assert.equal(getMessage("mission.dialog.avatar", "zh"), "头像");
  assert.equal(getMessage("mission.dialog.name", "zh"), "名称");
  assert.equal(getMessage("mission.dialog.role", "zh"), "角色");
  assert.equal(getMessage("mission.dialog.provider", "zh"), "Provider");
  assert.equal(getMessage("mission.dialog.addGoal", "zh"), "添加目标");
  assert.equal(getMessage("mission.dialog.creating", "zh"), "创建中...");
  assert.equal(getMessage("mission.dialog.saveChanges", "zh"), "保存更改");
});

test("covered mission-control detail/dialog components use locale message keys instead of hard-coded core UI copy", async () => {
  const fs = await import("node:fs/promises");
  const files = {
    agentDetailPanel: await fs.readFile(new URL("../src/components/mission-control/agent-detail-panel.tsx", import.meta.url), "utf8"),
    slackPanel: await fs.readFile(new URL("../src/components/mission-control/slack-panel.tsx", import.meta.url), "utf8"),
    createAgentDialog: await fs.readFile(new URL("../src/components/mission-control/create-agent-dialog.tsx", import.meta.url), "utf8"),
    editAgentDialog: await fs.readFile(new URL("../src/components/mission-control/edit-agent-dialog.tsx", import.meta.url), "utf8"),
  };

  assert.match(files.agentDetailPanel, /useLocale\(\)/);
  assert.match(files.agentDetailPanel, /t\("mission\.detail\.live"\)/);
  assert.match(files.agentDetailPanel, /t\("mission\.detail\.goals"\)/);
  assert.doesNotMatch(files.agentDetailPanel, />Live</);
  assert.doesNotMatch(files.agentDetailPanel, /title="Edit agent configuration"/);

  assert.match(files.slackPanel, /useLocale\(\)/);
  assert.match(files.slackPanel, /t\("mission\.slack\.thread"\)/);
  assert.match(files.slackPanel, /t\("mission\.slack\.reply"\)/);
  assert.match(files.slackPanel, /t\("mission\.slack\.title"\)/);
  assert.match(files.slackPanel, /t\("mission\.slack\.emptyChannel"/);
  assert.doesNotMatch(files.slackPanel, />Thread</);
  assert.doesNotMatch(files.slackPanel, />Reply</);
  assert.doesNotMatch(files.slackPanel, />Agent Slack</);
  assert.doesNotMatch(files.slackPanel, /No messages in #\$\{activeChannel\} yet/);

  assert.match(files.createAgentDialog, /useLocale\(\)/);
  assert.match(files.createAgentDialog, /t\("mission\.dialog\.avatar"\)/);
  assert.match(files.createAgentDialog, /t\("mission\.dialog\.addGoal"\)/);
  assert.doesNotMatch(files.createAgentDialog, />Avatar</);
  assert.doesNotMatch(files.createAgentDialog, /\{creating \? "Creating\.\.\." : "Create Agent"\}/);

  assert.match(files.editAgentDialog, /useLocale\(\)/);
  assert.match(files.editAgentDialog, /t\("mission\.dialog\.name"\)/);
  assert.match(files.editAgentDialog, /t\("mission\.dialog\.saveChanges"\)/);
  assert.doesNotMatch(files.editAgentDialog, />Save Changes</);
});

test("getMessage returns localized cabinet surfaces copy for the next follow-up batch", () => {
  assert.equal(getMessage("cabinets.org.empty", "zh"), "这个 cabinet 还没有配置 agents。");
  assert.equal(formatMessage("cabinets.org.visibleAgents", "zh", { count: 3, suffix: "s" }), "3 个可见 agents");
  assert.equal(formatMessage("cabinets.org.openChat", "zh", { name: "Ada" }), "与 Ada 打开对话");
  assert.equal(formatMessage("cabinets.org.depth", "zh", { depth: 2 }), "深度 2");
  assert.equal(formatMessage("cabinets.composer.placeholderSelected", "zh", { name: "Ada" }), "Ada 应该处理什么？");
  assert.equal(getMessage("cabinets.composer.placeholderNoAgent", "zh"), "选择一个 agent，并描述下一个任务。");
  assert.equal(getMessage("cabinets.composer.noMentionResults", "zh"), "没有匹配的 agents 或页面。");
  assert.equal(getMessage("cabinets.composer.startConversation", "zh"), "开始对话");
  assert.equal(getMessage("cabinets.composer.mentionHint", "zh"), "使用 @ 来提及");
  assert.equal(getMessage("cabinets.composer.newLine", "zh"), "换行");
  assert.equal(getMessage("cabinets.composer.noVisibleAgents", "zh"), "没有可见 agents");
  assert.equal(getMessage("cabinets.scheduler.live", "zh"), "运行中");
  assert.equal(getMessage("cabinets.scheduler.stopAll", "zh"), "全部停止");
  assert.equal(getMessage("cabinets.scheduler.menu.restartAll", "zh"), "重启全部 agents");
  assert.equal(getMessage("cabinets.scheduler.menu.startDescription", "zh"), "启用心跳与 cron 任务");
  assert.equal(formatMessage("cabinets.scheduler.summary", "zh", { active: 2, total: 5 }), "2/5 个本 cabinet agents 处于激活状态。仅影响此 cabinet，不影响子 cabinet agents。");
  assert.equal(getMessage("cabinets.activity.title", "zh"), "动态");
  assert.equal(getMessage("cabinets.activity.loading", "zh"), "加载中...");
  assert.equal(formatMessage("cabinets.activity.recent", "zh", { count: 4 }), "4 条最近记录");
  assert.equal(formatMessage("cabinets.activity.running", "zh", { count: 2 }), "2 个运行中");
  assert.equal(getMessage("cabinets.activity.viewAll", "zh"), "查看全部");
  assert.equal(getMessage("cabinets.activity.empty", "zh"), "还没有对话。运行 heartbeat 或给 agent 发送任务即可开始。");
  assert.equal(getMessage("cabinets.activity.loadingFeed", "zh"), "正在加载动态...");
  assert.equal(getMessage("cabinets.stats.agents", "zh"), "AI 代理");
  assert.equal(formatMessage("cabinets.stats.visibleAgentsTitle", "zh", { count: 3 }), "3 个可见 agents");
  assert.equal(getMessage("cabinets.stats.noActiveAgents", "zh"), "没有 agent 处于激活状态。");
  assert.equal(formatMessage("cabinets.stats.paused", "zh", { count: 2 }), "已暂停（2）");
  assert.equal(getMessage("cabinets.stats.noPendingTasks", "zh"), "没有待处理任务。");
  assert.equal(formatMessage("cabinets.stats.jobsTitle", "zh", { count: 4 }), "4 个任务");
  assert.equal(formatMessage("cabinets.stats.disabled", "zh", { count: 1 }), "已禁用（1）");
  assert.equal(getMessage("cabinets.stats.noJobs", "zh"), "还没有配置 jobs。");
  assert.equal(formatMessage("cabinets.stats.heartbeatsTitle", "zh", { count: 2 }), "2 个心跳");
  assert.equal(getMessage("cabinets.stats.noHeartbeats", "zh"), "还没有配置 heartbeats。");
  assert.equal(getMessage("cabinets.schedule.empty", "zh"), "还没有配置 jobs 或 heartbeats。");
  assert.equal(formatMessage("cabinets.schedule.heartbeatName", "zh", { name: "Ada" }), "Ada heartbeat");
  assert.equal(getMessage("cabinets.schedule.enabled", "zh"), "开启");
  assert.equal(getMessage("cabinets.schedule.disabled", "zh"), "关闭");
});

test("covered cabinet components use locale message keys instead of hard-coded core UI copy", async () => {
  const fs = await import("node:fs/promises");
  const files = {
    cabinetView: await fs.readFile(new URL("../src/components/cabinets/cabinet-view.tsx", import.meta.url), "utf8"),
    cabinetTaskComposer: await fs.readFile(new URL("../src/components/cabinets/cabinet-task-composer.tsx", import.meta.url), "utf8"),
    cabinetSchedulerControls: await fs.readFile(new URL("../src/components/cabinets/cabinet-scheduler-controls.tsx", import.meta.url), "utf8"),
    activityFeed: await fs.readFile(new URL("../src/components/cabinets/activity-feed.tsx", import.meta.url), "utf8"),
    interactiveStatStrip: await fs.readFile(new URL("../src/components/cabinets/interactive-stat-strip.tsx", import.meta.url), "utf8"),
    scheduleList: await fs.readFile(new URL("../src/components/cabinets/schedule-list.tsx", import.meta.url), "utf8"),
  };

  assert.match(files.cabinetView, /useLocale\(\)/);
  assert.match(files.cabinetView, /t\("cabinets\.org\.empty"\)/);
  assert.match(files.cabinetView, /format\("cabinets\.org\.visibleAgents"/);
  assert.match(files.cabinetView, /format\("cabinets\.org\.openChat"/);
  assert.match(files.cabinetView, /format\("cabinets\.org\.depth"/);
  assert.doesNotMatch(files.cabinetView, /No agents configured for this cabinet yet\./);
  assert.doesNotMatch(files.cabinetView, /visible agent\{agents\.length === 1 \? "" : "s"\}/);
  assert.doesNotMatch(files.cabinetView, /Open chat with \$\{agent\.name\}/);
  assert.doesNotMatch(files.cabinetView, /depth \$\{child\.cabinetDepth \?\? 1\}/);

  assert.match(files.cabinetTaskComposer, /useLocale\(\)/);
  assert.match(files.cabinetTaskComposer, /format\("cabinets\.composer\.placeholderSelected"/);
  assert.match(files.cabinetTaskComposer, /t\("cabinets\.composer\.placeholderNoAgent"\)/);
  assert.match(files.cabinetTaskComposer, /t\("cabinets\.composer\.noVisibleAgents"\)/);
  assert.doesNotMatch(files.cabinetTaskComposer, /What should \$\{selectedAgent\.name\} work on\?/);
  assert.doesNotMatch(files.cabinetTaskComposer, /Choose an agent and describe the next task\./);
  assert.doesNotMatch(files.cabinetTaskComposer, /No agents or pages match\./);
  assert.doesNotMatch(files.cabinetTaskComposer, /aria-label="Start conversation"/);

  assert.match(files.cabinetSchedulerControls, /useLocale\(\)/);
  assert.match(files.cabinetSchedulerControls, /t\("cabinets\.scheduler\.live"\)/);
  assert.match(files.cabinetSchedulerControls, /format\("cabinets\.scheduler\.startAllTitle"/);
  assert.match(files.cabinetSchedulerControls, /format\("cabinets\.scheduler\.summary"/);
  assert.doesNotMatch(files.cabinetSchedulerControls, />Live</);
  assert.doesNotMatch(files.cabinetSchedulerControls, />Stop All</);
  assert.doesNotMatch(files.cabinetSchedulerControls, />Restart all agents</);

  assert.match(files.activityFeed, /useLocale\(\)/);
  assert.match(files.activityFeed, /t\("cabinets\.activity\.title"\)/);
  assert.match(files.activityFeed, /format\("cabinets\.activity\.recent"/);
  assert.match(files.activityFeed, /format\("cabinets\.activity\.running"/);
  assert.doesNotMatch(files.activityFeed, />Activity</);
  assert.doesNotMatch(files.activityFeed, /Loading activity\.\.\./);
  assert.doesNotMatch(files.activityFeed, /No conversations yet\./);

  assert.match(files.interactiveStatStrip, /useLocale\(\)/);
  assert.match(files.interactiveStatStrip, /t\("cabinets\.stats\.agents"\)/);
  assert.match(files.interactiveStatStrip, /format\("cabinets\.stats\.visibleAgentsTitle"/);
  assert.match(files.interactiveStatStrip, /format\("cabinets\.stats\.jobsTitle"/);
  assert.doesNotMatch(files.interactiveStatStrip, /Visible Agents/);
  assert.doesNotMatch(files.interactiveStatStrip, /No agents configured\./);
  assert.doesNotMatch(files.interactiveStatStrip, /No pending tasks\./);

  assert.match(files.scheduleList, /useLocale\(\)/);
  assert.match(files.scheduleList, /t\("cabinets\.schedule\.empty"\)/);
  assert.match(files.scheduleList, /format\("cabinets\.schedule\.heartbeatName"/);
  assert.match(files.scheduleList, /t\("cabinets\.schedule\.enabled"\)/);
  assert.doesNotMatch(files.scheduleList, /No jobs or heartbeats configured yet\./);
  assert.doesNotMatch(files.scheduleList, /item\.enabled \? "On" : "Off"/);
});

test("getMessage returns localized cabinet home shell copy for the next follow-up batch", () => {
  assert.equal(getMessage("cabinets.home.prompt", "zh"), "今天我们要处理什么？");
  assert.equal(formatMessage("cabinets.home.headline", "zh", { greeting: "早上好", name: "jyutech.cn" }), "早上好，jyutech.cn。今天我们要处理什么？");
  assert.equal(getMessage("cabinets.home.orgTitle", "zh"), "GreatClaw 团队");
  assert.equal(getMessage("cabinets.home.openAgentsWorkspace", "zh"), "打开 AI 代理工作区");
  assert.equal(getMessage("cabinets.home.loadingBoard", "zh"), "正在加载 cabinet 看板... ");
  assert.equal(getMessage("cabinets.home.scheduleTitle", "zh"), "任务与心跳");
  assert.equal(formatMessage("cabinets.home.scheduleSummary", "zh", { jobs: 5, heartbeats: 3 }), "5 个 jobs，3 个 heartbeats");
  assert.equal(getMessage("cabinets.home.calendar", "zh"), "日历");
  assert.equal(getMessage("cabinets.home.list", "zh"), "列表");
  assert.equal(getMessage("cabinets.home.today", "zh"), "今天");
  assert.equal(getMessage("cabinets.home.fullScreen", "zh"), "全屏");
  assert.equal(getMessage("cabinets.home.exitFullScreen", "zh"), "退出全屏");
  assert.equal(getMessage("cabinets.home.boardDescriptionFallback", "zh"), "面向 agents、jobs 与知识的便携软件层。 ");
});

test("covered cabinet home components use locale message keys instead of hard-coded shell copy", async () => {
  const fs = await import("node:fs/promises");
  const files = {
    cabinetView: await fs.readFile(new URL("../src/components/cabinets/cabinet-view.tsx", import.meta.url), "utf8"),
    cabinetTaskComposer: await fs.readFile(new URL("../src/components/cabinets/cabinet-task-composer.tsx", import.meta.url), "utf8"),
  };

  assert.match(files.cabinetTaskComposer, /t\("cabinets\.home\.prompt"\)/);
  assert.match(files.cabinetTaskComposer, /format\("cabinets\.home\.headline"/);
  assert.match(files.cabinetTaskComposer, /t\("cabinets\.home\.boardDescriptionFallback"\)/);
  assert.doesNotMatch(files.cabinetTaskComposer, /What are we working on today\?/);

  assert.match(files.cabinetView, /t\("cabinets\.home\.orgTitle"\)/);
  assert.match(files.cabinetView, /t\("cabinets\.home\.openAgentsWorkspace"\)/);
  assert.match(files.cabinetView, /t\("cabinets\.home\.loadingBoard"\)/);
  assert.match(files.cabinetView, /t\("cabinets\.home\.scheduleTitle"\)/);
  assert.match(files.cabinetView, /format\("cabinets\.home\.scheduleSummary"/);
  assert.match(files.cabinetView, /t\("cabinets\.home\.calendar"\)/);
  assert.match(files.cabinetView, /t\("cabinets\.home\.list"\)/);
  assert.match(files.cabinetView, /t\("cabinets\.home\.today"\)/);
  assert.match(files.cabinetView, /t\("cabinets\.home\.fullScreen"\)/);
  assert.match(files.cabinetView, /t\("cabinets\.home\.exitFullScreen"\)/);
  assert.doesNotMatch(files.cabinetView, />Cabinet team</);
  assert.doesNotMatch(files.cabinetView, />Open agents workspace</);
  assert.doesNotMatch(files.cabinetView, /Loading mission board\.\.\./);
  assert.doesNotMatch(files.cabinetView, />Jobs & heartbeats</);
  assert.doesNotMatch(files.cabinetView, />Calendar</);
  assert.doesNotMatch(files.cabinetView, />List</);
  assert.doesNotMatch(files.cabinetView, />Today</);
  assert.doesNotMatch(files.cabinetView, /Exit full screen/);
  assert.doesNotMatch(files.cabinetView, /Portable software layer for agents, jobs, and knowledge\./);
});

test("getMessage returns localized cabinet calendar chrome copy for the next follow-up batch", () => {
  assert.equal(getMessage("cabinets.home.day", "zh"), "日");
  assert.equal(getMessage("cabinets.home.week", "zh"), "周");
  assert.equal(getMessage("cabinets.home.month", "zh"), "月");
  assert.equal(getMessage("cabinets.calendar.monday", "zh"), "周一");
  assert.equal(getMessage("cabinets.calendar.sunday", "zh"), "周日");
  assert.equal(getMessage("cabinets.calendar.january", "zh"), "1月");
  assert.equal(getMessage("cabinets.calendar.april", "zh"), "4月");
  assert.equal(getMessage("cabinets.calendar.more", "zh"), "更多");
  assert.equal(getMessage("cabinets.scheduler.menu.stopDescription", "zh"), "暂停心跳与 cron 任务");
});

test("covered cabinet calendar components use locale message keys instead of hard-coded calendar copy", async () => {
  const fs = await import("node:fs/promises");
  const files = {
    cabinetView: await fs.readFile(new URL("../src/components/cabinets/cabinet-view.tsx", import.meta.url), "utf8"),
    scheduleCalendar: await fs.readFile(new URL("../src/components/cabinets/schedule-calendar.tsx", import.meta.url), "utf8"),
    cabinetSchedulerControls: await fs.readFile(new URL("../src/components/cabinets/cabinet-scheduler-controls.tsx", import.meta.url), "utf8"),
  };

  assert.match(files.cabinetView, /t\("cabinets\.home\.day"\)/);
  assert.match(files.cabinetView, /t\("cabinets\.home\.week"\)/);
  assert.match(files.cabinetView, /t\("cabinets\.home\.month"\)/);
  assert.doesNotMatch(files.cabinetView, />day</);
  assert.doesNotMatch(files.cabinetView, />week</);
  assert.doesNotMatch(files.cabinetView, />month</);

  assert.match(files.scheduleCalendar, /useLocale\(\)/);
  assert.match(files.scheduleCalendar, /t\("cabinets\.calendar\.monday"\)/);
  assert.match(files.scheduleCalendar, /t\("cabinets\.calendar\.january"\)/);
  assert.match(files.scheduleCalendar, /t\("cabinets\.calendar\.more"\)/);

  assert.match(files.cabinetSchedulerControls, /t\("cabinets\.scheduler\.menu\.stopDescription"\)/);
});

test("getMessage returns localized cabinet dialog and header chrome copy for the next follow-up batch", () => {
  assert.equal(getMessage("cabinets.header.scope", "zh"), "范围");
  assert.equal(getMessage("cabinets.dialog.jobFallback", "zh"), "任务");
  assert.equal(getMessage("cabinets.dialog.runNow", "zh"), "立即运行");
  assert.equal(getMessage("cabinets.dialog.schedule", "zh"), "调度");
  assert.equal(getMessage("cabinets.dialog.prompt", "zh"), "提示词");
  assert.equal(getMessage("cabinets.dialog.jobPromptPlaceholder", "zh"), "这个 job 应该做什么？");
  assert.equal(getMessage("cabinets.dialog.enabled", "zh"), "已启用");
  assert.equal(getMessage("cabinets.dialog.cancel", "zh"), "取消");
  assert.equal(getMessage("cabinets.dialog.saving", "zh"), "保存中... ");
  assert.equal(getMessage("cabinets.dialog.save", "zh"), "保存");
  assert.equal(getMessage("cabinets.dialog.heartbeatTitle", "zh"), "心跳");
  assert.equal(getMessage("cabinets.dialog.active", "zh"), "运行中");
});

test("covered cabinet dialog and header components use locale message keys instead of hard-coded chrome copy", async () => {
  const fs = await import("node:fs/promises");
  const file = await fs.readFile(new URL("../src/components/cabinets/cabinet-view.tsx", import.meta.url), "utf8");

  assert.match(file, /t\("cabinets\.header\.scope"\)/);
  assert.match(file, /t\("cabinets\.dialog\.jobFallback"\)/);
  assert.match(file, /t\("cabinets\.dialog\.runNow"\)/);
  assert.match(file, /t\("cabinets\.dialog\.schedule"\)/);
  assert.match(file, /t\("cabinets\.dialog\.prompt"\)/);
  assert.match(file, /t\("cabinets\.dialog\.jobPromptPlaceholder"\)/);
  assert.match(file, /t\("cabinets\.dialog\.enabled"\)/);
  assert.match(file, /t\("cabinets\.dialog\.cancel"\)/);
  assert.match(file, /t\("cabinets\.dialog\.saving"\)/);
  assert.match(file, /t\("cabinets\.dialog\.save"\)/);
  assert.match(file, /t\("cabinets\.dialog\.heartbeatTitle"\)/);
  assert.match(file, /t\("cabinets\.dialog\.active"\)/);
  assert.doesNotMatch(file, />Scope</);
  assert.doesNotMatch(file, /\|\| "Job"/);
  assert.doesNotMatch(file, />Schedule</);
  assert.doesNotMatch(file, />Prompt</);
  assert.doesNotMatch(file, /What should this job do\?/);
  assert.doesNotMatch(file, />Heartbeat</);
  assert.doesNotMatch(file, />Active</);
});

test("getMessage returns localized cabinet status card and schedules panel copy for the next follow-up batch", () => {
  assert.equal(getMessage("cabinets.status.never", "zh"), "从未");
  assert.equal(getMessage("cabinets.status.justNow", "zh"), "刚刚");
  assert.equal(formatMessage("cabinets.status.minutesAgo", "zh", { count: 5 }), "5 分钟前");
  assert.equal(getMessage("cabinets.status.running", "zh"), "运行中");
  assert.equal(getMessage("cabinets.status.idle", "zh"), "空闲");
  assert.equal(getMessage("cabinets.status.paused", "zh"), "已暂停");
  assert.equal(getMessage("cabinets.status.noRecentActivity", "zh"), "还没有最近活动");
  assert.equal(formatMessage("cabinets.status.taskCount", "zh", { count: 2, suffix: "" }), "2 个任务");
  assert.equal(formatMessage("cabinets.status.sendTask", "zh", { name: "Ada" }), "给 Ada 发送任务");
  assert.equal(getMessage("cabinets.grid.title", "zh"), "AI 代理");
  assert.equal(getMessage("cabinets.grid.empty", "zh"), "这个 cabinet 还没有配置 agents。");
  assert.equal(formatMessage("cabinets.grid.depth", "zh", { depth: 2 }), "深度 2");
  assert.equal(getMessage("cabinets.schedules.title", "zh"), "任务与心跳");
  assert.equal(formatMessage("cabinets.schedules.summary", "zh", { jobs: 3, heartbeats: 2 }), "当前范围内有 3 个 scheduled jobs 和 2 个 active heartbeats。 ");
  assert.equal(getMessage("cabinets.schedules.jobsHeading", "zh"), "Scheduled jobs");
  assert.equal(getMessage("cabinets.schedules.heartbeatsHeading", "zh"), "心跳");
  assert.equal(getMessage("cabinets.schedules.noJobs", "zh"), "这个 cabinet 还没有配置 jobs。");
  assert.equal(getMessage("cabinets.schedules.noHeartbeats", "zh"), "还没有配置 heartbeats。");
  assert.equal(getMessage("cabinets.schedules.enabled", "zh"), "开启");
  assert.equal(getMessage("cabinets.schedules.disabled", "zh"), "关闭");
});

test("covered cabinet status card and schedules panel components use locale message keys instead of hard-coded copy", async () => {
  const fs = await import("node:fs/promises");
  const files = {
    agentStatusCard: await fs.readFile(new URL("../src/components/cabinets/agent-status-card.tsx", import.meta.url), "utf8"),
    agentStatusGrid: await fs.readFile(new URL("../src/components/cabinets/agent-status-grid.tsx", import.meta.url), "utf8"),
    schedulesPanel: await fs.readFile(new URL("../src/components/cabinets/schedules-panel.tsx", import.meta.url), "utf8"),
  };

  assert.match(files.agentStatusCard, /useLocale\(\)/);
  assert.match(files.agentStatusCard, /t\("cabinets\.status\.running"\)/);
  assert.match(files.agentStatusCard, /t\("cabinets\.status\.noRecentActivity"\)/);
  assert.match(files.agentStatusCard, /format\("cabinets\.status\.sendTask"/);
  assert.doesNotMatch(files.agentStatusCard, />Running</);
  assert.doesNotMatch(files.agentStatusCard, />Idle</);
  assert.doesNotMatch(files.agentStatusCard, />Paused</);
  assert.doesNotMatch(files.agentStatusCard, /No recent activity/);
  assert.doesNotMatch(files.agentStatusCard, /Send task to \$\{agent\.name\}/);

  assert.match(files.agentStatusGrid, /useLocale\(\)/);
  assert.match(files.agentStatusGrid, /t\("cabinets\.grid\.title"\)/);
  assert.match(files.agentStatusGrid, /t\("cabinets\.grid\.empty"\)/);
  assert.match(files.agentStatusGrid, /format\("cabinets\.grid\.depth"/);
  assert.doesNotMatch(files.agentStatusGrid, />Agents</);
  assert.doesNotMatch(files.agentStatusGrid, /No agents configured for this cabinet yet\./);
  assert.doesNotMatch(files.agentStatusGrid, /depth \$\{child\.cabinetDepth \?\? 1\}/);

  assert.match(files.schedulesPanel, /useLocale\(\)/);
  assert.match(files.schedulesPanel, /t\("cabinets\.schedules\.title"\)/);
  assert.match(files.schedulesPanel, /format\("cabinets\.schedules\.summary"/);
  assert.match(files.schedulesPanel, /t\("cabinets\.schedules\.enabled"\)/);
  assert.doesNotMatch(files.schedulesPanel, />Jobs and heartbeats</);
  assert.doesNotMatch(files.schedulesPanel, /No cabinet jobs configured yet\./);
  assert.doesNotMatch(files.schedulesPanel, /No heartbeats configured yet\./);
  assert.doesNotMatch(files.schedulesPanel, /job\.enabled \? "On" : "Off"/);
});

test("getMessage returns localized cabinet schedule list and grid scope copy for the next follow-up batch", () => {
  assert.equal(getMessage("cabinets.grid.scope", "zh"), "范围");
  assert.equal(getMessage("cabinets.schedule.unknownAgent", "zh"), "未知 agent");
});

test("covered cabinet schedule list and grid scope components use locale message keys instead of hard-coded copy", async () => {
  const fs = await import("node:fs/promises");
  const files = {
    agentStatusGrid: await fs.readFile(new URL("../src/components/cabinets/agent-status-grid.tsx", import.meta.url), "utf8"),
    scheduleList: await fs.readFile(new URL("../src/components/cabinets/schedule-list.tsx", import.meta.url), "utf8"),
  };

  assert.match(files.agentStatusGrid, /t\("cabinets\.grid\.scope"\)/);
  assert.doesNotMatch(files.agentStatusGrid, />Scope</);

  assert.match(files.scheduleList, /t\("cabinets\.schedule\.unknownAgent"\)/);
  assert.doesNotMatch(files.scheduleList, /\|\| "Unknown"/);
});

test("getMessage returns localized layout status popup copy for covered follow-up surfaces", () => {
  assert.equal(getMessage("layout.status.popup.appServer", "zh"), "应用服务");
  assert.equal(getMessage("layout.status.popup.running", "zh"), "运行中");
  assert.equal(getMessage("layout.status.popup.down", "zh"), "已停止");
  assert.equal(getMessage("layout.status.popup.providers", "zh"), "AI 代理 Providers");
  assert.equal(getMessage("layout.status.popup.checking", "zh"), "检查中... ");
  assert.equal(getMessage("layout.status.popup.available", "zh"), "可用");
  assert.equal(getMessage("layout.status.popup.noneReady", "zh"), "均未就绪");
  assert.equal(getMessage("layout.status.popup.ready", "zh"), "就绪");
  assert.equal(getMessage("layout.status.popup.notLoggedIn", "zh"), "未登录");
  assert.equal(getMessage("layout.status.popup.notInstalled", "zh"), "未安装");
  assert.equal(getMessage("layout.status.popup.howToFix", "zh"), "如何修复");
  assert.equal(getMessage("layout.status.popup.configureInSettings", "zh"), "在设置中配置");
});

test("covered layout status popup uses locale message keys instead of hard-coded service copy", async () => {
  const file = await import("node:fs/promises").then((fs) =>
    fs.readFile(new URL("../src/components/layout/status-bar.tsx", import.meta.url), "utf8")
  );

  assert.match(file, /t\("layout\.status\.popup\.appServer"\)/);
  assert.match(file, /t\("layout\.status\.popup\.running"\)/);
  assert.match(file, /t\("layout\.status\.popup\.providers"\)/);
  assert.match(file, /t\("layout\.status\.popup\.howToFix"\)/);
  assert.match(file, /t\("layout\.status\.popup\.configureInSettings"\)/);
  assert.doesNotMatch(file, />App Server</);
  assert.doesNotMatch(file, />Running</);
  assert.doesNotMatch(file, />Down</);
  assert.doesNotMatch(file, />Agent Providers</);
  assert.doesNotMatch(file, />How to fix</);
  assert.doesNotMatch(file, />Configure in Settings</);
});

test("getMessage returns localized layout status popup remediation copy for covered follow-up surfaces", () => {
  assert.equal(getMessage("layout.status.popup.noProvidersInstalled", "zh"), "还没有安装或登录任何 agent provider。 ");
  assert.equal(getMessage("layout.status.popup.allFeaturesAvailable", "zh"), "GreatClaw 已完全可用。所有功能均可使用。");
  assert.equal(getMessage("layout.status.popup.dismiss", "zh"), "关闭");
});

test("covered layout status popup remediation copy uses locale message keys instead of hard-coded text", async () => {
  const file = await import("node:fs/promises").then((fs) =>
    fs.readFile(new URL("../src/components/layout/status-bar.tsx", import.meta.url), "utf8")
  );

  assert.match(file, /t\("layout\.status\.popup\.noProvidersInstalled"\)/);
  assert.match(file, /t\("layout\.status\.popup\.allFeaturesAvailable"\)/);
  assert.match(file, /t\("layout\.status\.popup\.dismiss"\)/);
  assert.doesNotMatch(file, /No agent providers are installed or logged in\./);
  assert.doesNotMatch(file, /Cabinet is fully operational\. All features are available\./);
  assert.doesNotMatch(file, /aria-label="Dismiss"/);
});

test("getMessage returns localized layout status save and update tooltip copy for covered follow-up surfaces", () => {
  assert.equal(getMessage("layout.status.saving", "zh"), "保存中...");
  assert.equal(getMessage("layout.status.restartSettingsTitle", "zh"), "打开设置以查看已安装的更新");
});

test("covered layout status save and update tooltip copy uses locale message keys instead of hard-coded text", async () => {
  const file = await import("node:fs/promises").then((fs) =>
    fs.readFile(new URL("../src/components/layout/status-bar.tsx", import.meta.url), "utf8")
  );

  assert.match(file, /t\("layout\.status\.saving"\)/);
  assert.match(file, /t\("layout\.status\.restartSettingsTitle"\)/);
  assert.doesNotMatch(file, /\? "Saving\.\.\."/);
  assert.doesNotMatch(file, /title="Open Settings to review the installed update"/);
});

test("getMessage returns localized layout update available copy for covered follow-up surfaces", () => {
  assert.equal(getMessage("layout.status.updateAvailableTitle", "zh"), "GreatClaw {version} 可用");
  assert.equal(getMessage("layout.status.updateAvailableLabel", "zh"), "有可用更新：{version}");
});

test("covered layout update available button uses locale message keys instead of hard-coded text", async () => {
  const file = await import("node:fs/promises").then((fs) =>
    fs.readFile(new URL("../src/components/layout/status-bar.tsx", import.meta.url), "utf8")
  );

  assert.match(file, /t\("layout\.status\.updateAvailableTitle"/);
  assert.match(file, /format\("layout\.status\.updateAvailableLabel"/);
  assert.doesNotMatch(file, /title=\{`Cabinet \$\{update\.latest\.version\} is available`\}/);
  assert.doesNotMatch(file, /Update \{update\.latest\.version\} available/);
});

test("getMessage returns localized conversation transcript page copy for covered follow-up surfaces", () => {
  assert.equal(getMessage("conversation.page.title", "zh"), "对话记录");
  assert.equal(getMessage("conversation.page.backToCabinet", "zh"), "返回 GreatClaw");
  assert.equal(getMessage("conversation.page.started", "zh"), "开始时间");
  assert.equal(getMessage("conversation.page.completed", "zh"), "完成时间");
  assert.equal(getMessage("conversation.page.transcriptFile", "zh"), "转录文件");
  assert.equal(getMessage("conversation.page.requestedPrompt", "zh"), "请求提示词");
  assert.equal(getMessage("conversation.page.requestedPromptDescription", "zh"), "触发本次运行的原始任务请求。 ");
  assert.equal(getMessage("conversation.page.resultDescription", "zh"), "完成时捕获的结构化元数据。 ");
  assert.equal(getMessage("conversation.page.promptFile", "zh"), "Prompt 文件");
});

test("covered conversation transcript page uses locale message keys instead of hard-coded copy", async () => {
  const file = await import("node:fs/promises").then((fs) =>
    fs.readFile(new URL("../src/app/agents/conversations/[id]/page.tsx", import.meta.url), "utf8")
  );

  assert.match(file, /t\("conversation\.page\.title"\)/);
  assert.match(file, /t\("conversation\.page\.backToCabinet"\)/);
  assert.match(file, /t\("conversation\.page\.started"\)/);
  assert.match(file, /t\("conversation\.page\.completed"\)/);
  assert.match(file, /t\("conversation\.page\.transcriptFile"\)/);
  assert.match(file, /t\("conversation\.page\.requestedPrompt"\)/);
  assert.match(file, /t\("conversation\.page\.requestedPromptDescription"\)/);
  assert.match(file, /t\("conversation\.page\.resultDescription"\)/);
  assert.match(file, /t\("conversation\.page\.promptFile"\)/);
  assert.doesNotMatch(file, /Conversation Transcript/);
  assert.doesNotMatch(file, /Back to Cabinet/);
  assert.doesNotMatch(file, /label="Started"/);
  assert.doesNotMatch(file, /label="Completed"/);
  assert.doesNotMatch(file, /label="Transcript File"/);
  assert.doesNotMatch(file, />Requested Prompt</);
  assert.doesNotMatch(file, /The original task request that started this run\./);
  assert.doesNotMatch(file, /Structured metadata captured at completion\./);
  assert.doesNotMatch(file, /label="Prompt File"/);
});

test("getMessage returns localized agents settings and org chart dialog copy for the next follow-up batch", () => {
  assert.equal(getMessage("agents.settings.runHeartbeat", "zh"), "运行心跳");
  assert.equal(getMessage("agents.settings.meta.role", "zh"), "角色");
  assert.equal(getMessage("agents.settings.meta.department", "zh"), "部门");
  assert.equal(getMessage("agents.settings.meta.type", "zh"), "类型");
  assert.equal(getMessage("agents.settings.meta.workspace", "zh"), "工作区");
  assert.equal(getMessage("agents.settings.meta.notSet", "zh"), "未设置");
  assert.equal(getMessage("agents.settings.previewEmpty", "zh"), "还没有可预览的内容。 ");
  assert.equal(getMessage("agents.settings.name", "zh"), "名称");
  assert.equal(getMessage("agents.settings.role", "zh"), "角色");
  assert.equal(getMessage("agents.settings.department", "zh"), "部门");
  assert.equal(getMessage("agents.settings.type", "zh"), "类型");
  assert.equal(getMessage("agents.settings.provider", "zh"), "Provider");
  assert.equal(getMessage("agents.settings.workspace", "zh"), "工作区");
  assert.equal(getMessage("agents.jobs.runNow", "zh"), "立即运行");
  assert.equal(getMessage("agents.jobs.enabled", "zh"), "已启用");
});

test("covered agents settings and org chart dialogs use locale message keys instead of hard-coded copy", async () => {
  const file = await import("node:fs/promises").then((fs) =>
    fs.readFile(new URL("../src/components/agents/agents-workspace.tsx", import.meta.url), "utf8")
  );

  assert.match(file, /t\("agents\.settings\.runHeartbeat"\)/);
  assert.match(file, /t\("agents\.settings\.meta\.role"\)/);
  assert.match(file, /t\("agents\.settings\.meta\.notSet"\)/);
  assert.match(file, /t\("agents\.settings\.previewEmpty"\)/);
  assert.match(file, /t\("agents\.settings\.name"\)/);
  assert.match(file, /t\("agents\.settings\.provider"\)/);
  assert.match(file, /t\("agents\.jobs\.runNow"\)/);
  assert.match(file, /t\("agents\.jobs\.enabled"\)/);
  assert.doesNotMatch(file, /Nothing to preview yet\./);
});

test("getMessage returns key when missing from all locales", () => {
  assert.equal(getMessage("missing.key" as never, "zh" satisfies Locale), "missing.key");
});
