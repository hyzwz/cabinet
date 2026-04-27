import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { access, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { DATA_DIR } from "../src/lib/storage/path-utils";

test("delete path checks treat plain directory nodes as existing content", async () => {
  const pageIo = await import("../src/lib/storage/page-io");
  const canDeletePath = Reflect.get(pageIo, "canDeletePath");

  assert.equal(typeof canDeletePath, "function");

  const tempRoot = await mkdtemp(path.join(DATA_DIR, "__delete-path-test-"));
  const plainDir = path.join(tempRoot, "folder-only");
  const nestedDir = path.join(plainDir, "child");
  const virtualPath = path.relative(DATA_DIR, plainDir).split(path.sep).join("/");

  try {
    await mkdir(nestedDir, { recursive: true });
    await writeFile(path.join(nestedDir, "note.txt"), "hello");

    const result = await (canDeletePath as (virtualPath: string) => Promise<boolean>)(virtualPath);
    assert.equal(result, true);
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});

test("deletePage removes standalone markdown files addressed by virtual path", async () => {
  const pageIo = await import("../src/lib/storage/page-io");
  const deletePage = Reflect.get(pageIo, "deletePage");

  assert.equal(typeof deletePage, "function");

  const tempRoot = await mkdtemp(path.join(DATA_DIR, "__delete-file-test-"));
  const filePath = path.join(tempRoot, "standalone.md");
  const virtualPath = path.relative(DATA_DIR, filePath).replace(/\.md$/, "").split(path.sep).join("/");

  try {
    await writeFile(filePath, "# standalone");

    await (deletePage as (virtualPath: string) => Promise<void>)(virtualPath);

    await assert.rejects(() => access(filePath));
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});
