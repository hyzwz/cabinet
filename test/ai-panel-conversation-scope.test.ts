import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("AI panel preserves cabinet scope when loading conversation details", async () => {
  const source = await readFile(
    new URL("../src/components/ai-panel/ai-panel.tsx", import.meta.url),
    "utf8"
  );

  assert.match(source, /cabinetPath:\s*conversation\.cabinetPath/);
  assert.match(source, /cabinetPath:\s*selectedLiveSession\.cabinetPath/);
  assert.doesNotMatch(source, /cabinetPath:\s*"\/"/);
});

test("editor live sessions persist the owning cabinet path", async () => {
  const source = await readFile(
    new URL("../src/stores/ai-panel-store.ts", import.meta.url),
    "utf8"
  );

  assert.match(source, /cabinetPath\?:\s*string/);
});

test("AI panel targets the selected tree path for non-markdown files", async () => {
  const source = await readFile(
    new URL("../src/components/ai-panel/ai-panel.tsx", import.meta.url),
    "utf8"
  );

  assert.match(source, /const targetPath = selectedPath \|\| currentPath/);
  assert.match(source, /pagePath:\s*targetPath/);
  assert.match(source, /disabled:\s*!targetPath/);
  assert.doesNotMatch(source, /disabled:\s*!currentPath/);
});
