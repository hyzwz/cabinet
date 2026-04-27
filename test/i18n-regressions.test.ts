import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { cronToHuman } from "../src/lib/agents/cron-utils";

test("cronToHuman returns zh schedule copy for known presets", () => {
  assert.equal(cronToHuman("0 9 * * 1-5", "zh"), "工作日上午 9:00");
  assert.equal(cronToHuman("*/15 * * * *", "zh"), "每 15 分钟");
});

test("shared composer key-hint footer avoids hard-coded English copy", async () => {
  const source = await readFile(
    new URL("../src/components/composer/composer-input.tsx", import.meta.url),
    "utf8"
  );

  assert.doesNotMatch(source, /use @ to mention/);
  assert.doesNotMatch(source, /new line/);
});

test("cabinet greeting helper avoids hard-coded English greetings", async () => {
  const source = await readFile(
    new URL("../src/components/cabinets/cabinet-utils.ts", import.meta.url),
    "utf8"
  );

  assert.doesNotMatch(source, /Good morning/);
  assert.doesNotMatch(source, /Good afternoon/);
  assert.doesNotMatch(source, /Good evening/);
});

test("editor and mission placeholders avoid hard-coded English input hints", async () => {
  const [aiPanelSource, slackPanelSource, agentDetailSource] = await Promise.all([
    readFile(
      new URL("../src/components/ai-panel/ai-panel.tsx", import.meta.url),
      "utf8"
    ),
    readFile(
      new URL("../src/components/mission-control/slack-panel.tsx", import.meta.url),
      "utf8"
    ),
    readFile(
      new URL("../src/components/mission-control/agent-detail-panel.tsx", import.meta.url),
      "utf8"
    ),
  ]);

  assert.doesNotMatch(aiPanelSource, /Ask anything\.\.\. use @ to mention pages or agents/);
  assert.doesNotMatch(aiPanelSource, /Select a page first\.\.\./);
  assert.doesNotMatch(slackPanelSource, /Reply in thread\.\.\./);
  assert.doesNotMatch(slackPanelSource, /Message #\$\{activeChannel\}\.\.\. \(@mention agents\)/);
  assert.doesNotMatch(agentDetailSource, /Heartbeat:/);
});
