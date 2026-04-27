import test from "node:test";
import assert from "node:assert/strict";
import {
  buildImageGenerationConversationPrompt,
  isImageGenerationRequest,
} from "../src/lib/agents/conversation-runner";

test("detects explicit image generation requests", () => {
  assert.equal(isImageGenerationRequest("/image 生成一张封面图"), true);
  assert.equal(isImageGenerationRequest("/img make a cover"), true);
  assert.equal(isImageGenerationRequest("生成图片：会计 AI 工作流"), true);
  assert.equal(isImageGenerationRequest("分析一下这个页面"), false);
});

test("builds a Codex image generation prompt scoped to the current page", async () => {
  const result = await buildImageGenerationConversationPrompt({
    pagePath: "会计事务所AI工作台/01-数据跟踪/追踪话题",
    userMessage: "/image 生成一张会计 AI 工作流公众号封面图",
    cabinetPath: "会计事务所AI工作台",
  });

  assert.equal(result.providerId, "codex-cli");
  assert.equal(result.adapterType, "codex_local");
  assert.equal(result.cabinetPath, "会计事务所AI工作台");
  assert.deepEqual(result.mentionedPaths, ["会计事务所AI工作台/01-数据跟踪/追踪话题"]);
  assert.match(result.title, /生成一张会计 AI 工作流公众号封面图/);
  assert.match(result.prompt, /Use Codex CLI's image generation capability/);
  assert.match(result.prompt, /GPT Image 2/);
  assert.match(result.prompt, /01-数据跟踪\/generated-images/);
  assert.match(result.prompt, /ARTIFACT: 01-数据跟踪\/generated-images\//);
  assert.doesNotMatch(result.prompt, /\/image/);
});
