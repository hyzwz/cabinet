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
  assert.equal(getMessage("settings.common.comingSoon", "zh"), "即将推出");
  assert.equal(getMessage("settings.updates.checking", "en"), "Checking for Cabinet updates...");
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
    't("settings.common.comingSoon")',
    't("settings.about.title")',
  ];

  for (const key of expectedKeys) {
    assert.match(source, new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});
