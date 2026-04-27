import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { resolveConversationArtifactPaths } from "@/lib/agents/conversation-artifacts";

test("resolveConversationArtifactPaths falls back to real KB files when the agent reports a bad path", async () => {
  const rootDir = await fs.mkdtemp(path.join(os.tmpdir(), "cabinet-artifacts-"));
  const summaryDir = path.join(rootDir, "每日摘要");
  const internalDir = path.join(rootDir, ".agents", ".memory");

  await fs.mkdir(summaryDir, { recursive: true });
  await fs.mkdir(internalDir, { recursive: true });
  await fs.writeFile(path.join(summaryDir, "index.md"), "# archive\n", "utf8");
  await fs.writeFile(path.join(summaryDir, "2026-04-23.md"), "# daily\n", "utf8");
  await fs.writeFile(path.join(internalDir, "context.md"), "ignore\n", "utf8");

  const startedAt = "2026-04-23T03:00:00.000Z";
  const completedAt = "2026-04-23T03:06:18.000Z";
  const touchedAt = new Date("2026-04-23T03:03:00.000Z");

  await fs.utimes(path.join(summaryDir, "index.md"), touchedAt, touchedAt);
  await fs.utimes(path.join(summaryDir, "2026-04-23.md"), touchedAt, touchedAt);
  await fs.utimes(path.join(internalDir, "context.md"), touchedAt, touchedAt);

  const artifacts = await resolveConversationArtifactPaths({
    rootDir,
    reportedPaths: ["PROGRESS/每日摘要/index.md"],
    startedAt,
    completedAt,
  });

  assert.deepEqual(artifacts, ["每日摘要/2026-04-23", "每日摘要"]);
});
