import test from "node:test";
import assert from "node:assert/strict";
import { getMessage, isLocale, normalizeLocale, type Locale } from "../src/lib/i18n/messages";

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
  assert.equal(getMessage("header.productName", "zh"), "Cabinet");
  assert.equal(getMessage("header.productName", "en"), "Cabinet");
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
    "正在从注册表下载 agents、jobs 和内容"
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
  assert.equal(getMessage("sidebar.newCabinet", "zh"), "新建 Cabinet");
  assert.equal(getMessage("sidebar.createNewPage", "zh"), "创建新页面");
  assert.equal(getMessage("sidebar.createNewCabinet", "zh"), "创建新 Cabinet");
  assert.equal(getMessage("sidebar.createCabinet", "zh"), "创建 Cabinet");
  assert.equal(getMessage("sidebar.importFromRegistry", "zh"), "从注册表导入");
  assert.equal(getMessage("sidebar.cabinetName", "zh"), "Cabinet 名称");
  assert.equal(getMessage("sidebar.back", "zh"), "返回");
  assert.equal(getMessage("sidebar.agents", "zh"), "Agents");
  assert.equal(getMessage("sidebar.tasks", "zh"), "Tasks");
  assert.equal(getMessage("sidebar.data", "zh"), "数据");
  assert.equal(getMessage("sidebar.addFirstPage", "zh"), "添加你的第一个页面");
  assert.equal(getMessage("sidebar.addCabinetData", "zh"), "添加 cabinet 数据");
  assert.equal(getMessage("sidebar.emptyOwnAgents", "zh"), "此 cabinet 还没有本地 agents。");
  assert.equal(getMessage("sidebar.emptyVisibleAgents", "zh"), "所选 cabinet 范围内没有可见的 agents。");
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
  assert.equal(getMessage("sidebar.deleteCabinetTitle", "zh"), "删除 Cabinet \"{title}\"");
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
  assert.equal(getMessage("agents.conversations.allAgents", "zh"), "所有 agents");
  assert.equal(getMessage("agents.filters.jobs", "zh"), "任务");
  assert.equal(getMessage("agents.filters.job", "zh"), "任务");
  assert.equal(getMessage("agents.filters.heartbeat", "zh"), "心跳");
  assert.equal(getMessage("agents.filters.anyStatus", "zh"), "任意状态");
  assert.equal(getMessage("agents.status.running", "zh"), "运行中");
  assert.equal(getMessage("agents.conversation.settings", "zh"), "设置");
  assert.equal(getMessage("agents.library.browse", "zh"), "浏览 Agent Library");
  assert.equal(getMessage("agents.custom.createAgent", "zh"), "创建 agent");
  assert.equal(getMessage("agents.settings.write", "zh"), "编写");
  assert.equal(getMessage("agents.jobs.save", "zh"), "保存 job");
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
  assert.match(file, /t\("agents\.settings\.editAgent"\)/);
  assert.match(file, /t\("agents\.settings\.heartbeat"\)/);
  assert.match(file, /t\("agents\.jobs\.new"\)/);
  assert.match(file, /t\("agents\.jobs\.edit"\)/);
  assert.doesNotMatch(file, />Your Team Org Chart</);
  assert.doesNotMatch(file, />All agents</);
  assert.doesNotMatch(file, />No conversations yet\./);
  assert.doesNotMatch(file, />Browse Agent Library</);
  assert.doesNotMatch(file, />Save job</);
  assert.doesNotMatch(file, /"Bringing in\.\.\."/);
  assert.doesNotMatch(file, />Edit your own agent</);
  assert.doesNotMatch(file, />Edit agent</);
  assert.doesNotMatch(file, />New job</);
});

test("getMessage returns localized tasks workspace copy for covered demo surfaces", () => {
  assert.equal(getMessage("tasks.board.title.allCabinets", "zh"), "全部 Cabinets 任务看板");
  assert.equal(getMessage("tasks.board.title.cabinet", "zh"), "{name} 任务看板");
  assert.equal(getMessage("tasks.board.openSchedule", "zh"), "Jobs 与 Heartbeats");
  assert.equal(getMessage("tasks.common.refresh", "zh"), "刷新");
  assert.equal(getMessage("tasks.filters.all", "zh"), "全部");
  assert.equal(getMessage("tasks.filters.manual", "zh"), "手动");
  assert.equal(getMessage("tasks.filters.jobs", "zh"), "任务");
  assert.equal(getMessage("tasks.filters.heartbeat", "zh"), "心跳");
  assert.equal(getMessage("tasks.filters.allVisibleAgents", "zh"), "所有可见 agents");
  assert.equal(getMessage("tasks.filters.ownAgentsOnly", "zh"), "仅本 Cabinet agents");
  assert.equal(getMessage("tasks.lane.inbox.title", "zh"), "收件箱");
  assert.equal(getMessage("tasks.lane.running.empty", "zh"), "当前没有正在运行的任务。");
  assert.equal(getMessage("tasks.dialog.create.title", "zh"), "需要完成什么？");
  assert.equal(getMessage("tasks.dialog.create.addToInbox", "zh"), "加入收件箱");
  assert.equal(getMessage("tasks.dialog.assign.title", "zh"), "分配草稿");
  assert.equal(getMessage("tasks.dialog.assign.noVisibleAgents", "zh"), "没有可见的 agents");
  assert.equal(getMessage("tasks.rowActions.stop", "zh"), "停止");
  assert.equal(getMessage("tasks.bulk.killAll", "zh"), "全部停止");
  assert.equal(getMessage("tasks.schedule.header", "zh"), "Jobs 与 heartbeats");
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
  assert.doesNotMatch(file, />Run now</);
  assert.doesNotMatch(file, />Loading the task board\.\.\.</);
  assert.doesNotMatch(file, /placeholder="All visible agents"/);
  assert.doesNotMatch(file, />All visible agents</);
  assert.doesNotMatch(file, />Heartbeat</);
});

test("getMessage returns key when missing from all locales", () => {
  assert.equal(getMessage("missing.key" as never, "zh" satisfies Locale), "missing.key");
});
