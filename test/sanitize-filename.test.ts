import test from "node:test";
import assert from "node:assert/strict";

test("sanitizeFilename is available from a client-safe storage helper module", async () => {
  const mod = await import("../src/lib/storage/sanitize-filename");
  const sanitizeFilename = Reflect.get(mod, "sanitizeFilename");

  assert.equal(typeof sanitizeFilename, "function");
  assert.equal(
    (sanitizeFilename as (value: string) => string)("  项目 / 测试:AI?  "),
    "项目-测试ai"
  );
});
