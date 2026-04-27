import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { buildEditorConversationPrompt } from "../src/lib/agents/conversation-runner";
import { DATA_DIR } from "../src/lib/storage/path-utils";

const fixtureRoot = ".tmp-ai-editor-non-markdown";

test.after(async () => {
  await fs.rm(path.join(DATA_DIR, fixtureRoot), { recursive: true, force: true });
});

test("editor prompt resolves embedded website directories to index.html", async () => {
  const websiteDir = path.join(DATA_DIR, fixtureRoot, "html-report");
  await fs.mkdir(websiteDir, { recursive: true });
  await fs.writeFile(
    path.join(websiteDir, "index.html"),
    "<!doctype html><html><body><h1>客户AI财税服务成熟度看板</h1></body></html>",
    "utf8"
  );

  const result = await buildEditorConversationPrompt({
    pagePath: `${fixtureRoot}/html-report`,
    userMessage: "把标题改得更适合客户汇报",
    cabinetPath: fixtureRoot,
  });

  assert.match(result.prompt, /Primary editable target: \.tmp-ai-editor-non-markdown\/html-report\/index\.html/);
  assert.match(result.prompt, /Target type: HTML embedded website/);
  assert.match(result.prompt, /客户AI财税服务成熟度看板/);
});

test("editor prompt includes CSV text as editable context", async () => {
  await fs.mkdir(path.join(DATA_DIR, fixtureRoot), { recursive: true });
  await fs.writeFile(
    path.join(DATA_DIR, fixtureRoot, "metrics.csv"),
    "name,value\n数据安全,42\n流程自动化,55\n",
    "utf8"
  );

  const result = await buildEditorConversationPrompt({
    pagePath: `${fixtureRoot}/metrics.csv`,
    userMessage: "把数据安全改成 50",
    cabinetPath: fixtureRoot,
  });

  assert.match(result.prompt, /Primary editable target: \.tmp-ai-editor-non-markdown\/metrics\.csv/);
  assert.match(result.prompt, /Target type: CSV data file/);
  assert.match(result.prompt, /数据安全,42/);
});

test("editor prompt treats images as editable binary targets", async () => {
  await fs.mkdir(path.join(DATA_DIR, fixtureRoot), { recursive: true });
  await fs.writeFile(
    path.join(DATA_DIR, fixtureRoot, "cover.png"),
    Buffer.from("89504e470d0a1a0a", "hex")
  );

  const result = await buildEditorConversationPrompt({
    pagePath: `${fixtureRoot}/cover.png`,
    userMessage: "把图片改成更明亮的风格",
    cabinetPath: fixtureRoot,
  });

  assert.match(result.prompt, /Primary editable target: \.tmp-ai-editor-non-markdown\/cover\.png/);
  assert.match(result.prompt, /Target type: PNG image/);
  assert.match(result.prompt, /edit or regenerate the binary image file in place/);
});
