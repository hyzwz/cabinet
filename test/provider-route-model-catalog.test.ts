import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";

test("provider route keeps daemon status from overriding the local model catalog", async () => {
  const source = await fs.readFile(
    path.join(process.cwd(), "src", "app", "api", "agents", "providers", "route.ts"),
    "utf8"
  );

  assert.match(source, /const statusPayload = \{/);
  assert.match(source, /available: status\.available/);
  assert.match(source, /models: p\.models \|\| \[\]/);
  assert.doesNotMatch(source, /\.\.\.status,\s*\n\s*};/);
});
