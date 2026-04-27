import test from "node:test";
import assert from "node:assert/strict";
import { getMessage } from "../src/lib/i18n/messages";
import { readFile } from "node:fs/promises";

test("getMessage returns localized settings copy for covered demo surfaces", () => {
  assert.equal(getMessage("settings.title", "zh"), "设置");
  assert.equal(getMessage("settings.tabs.storage", "zh"), "存储");
  assert.equal(getMessage("settings.appearance.themeTitle", "zh"), "主题");
  assert.equal(getMessage("settings.storage.restartRequired", "zh"), "需要重启");
  assert.equal(getMessage("settings.providers.defaultProvider", "zh"), "默认 provider");
  assert.equal(getMessage("settings.integrations.description", "zh"), "配置 AI 员工 可用的工具服务器。启用服务器并提供 API 凭证，以便 AI 员工 访问外部服务。");
  assert.equal(getMessage("settings.notifications.description", "zh"), "配置当 AI 员工 需要你关注时如何接收提醒。");
  assert.equal(getMessage("settings.providers.openTerminalError", "zh"), "无法自动打开终端。请手动打开 Terminal.app（Mac）或系统终端。");
  assert.equal(getMessage("settings.common.comingSoon", "zh"), "即将推出");
  assert.equal(getMessage("settings.updates.checking", "en"), "Checking for GreatClaw updates...");
});

test("covered settings workspace component uses locale message keys instead of hard-coded core UI copy", async () => {
  const source = await readFile(
    new URL("../src/components/settings/settings-page.tsx", import.meta.url),
    "utf8"
  );

  const expectedKeys = [
    't("settings.title")',
    't("settings.refresh")',
    't("settings.tabs.providers")',
    't("settings.appearance.themeTitle")',
    't("settings.storage.title")',
    't("settings.providers.title")',
    't("settings.integrations.title")',
    't("settings.notifications.title")',
    't("settings.about.title")',
  ];

  for (const key of expectedKeys) {
    assert.match(source, new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});

test("settings workspace avoids hard-coded demo-scope English copy in covered surfaces", async () => {
  const source = await readFile(
    new URL("../src/components/settings/settings-page.tsx", import.meta.url),
    "utf8"
  );

  const hardCodedCoveredCopy = [
    "Copy to clipboard",
    "After setup, click ",
    "No providers are installed and logged in. Follow the setup guides below.",
    "Configure tool servers that agents can use. Enable a server and provide API credentials for agents to access external services.",
    "Configure how you receive alerts when agents need your attention.",
    "Notifications are triggered automatically for these events:",
    "Browser push, Telegram, Slack, and email notifications.",
    "Failed to save data directory.",
    "Could not open terminal automatically. Please open Terminal.app (Mac) or your system terminal manually.",
  ];

  for (const text of hardCodedCoveredCopy) {
    assert.doesNotMatch(source, new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});
