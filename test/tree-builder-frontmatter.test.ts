import test from "node:test";
import assert from "node:assert/strict";

import { normalizeFrontmatterTitle } from "@/lib/storage/tree-builder";

test("normalizeFrontmatterTitle handles YAML date titles as display strings", () => {
  assert.equal(
    normalizeFrontmatterTitle(new Date("2026-04-26T00:00:00.000Z"), "fallback"),
    "2026-04-26"
  );
});

test("normalizeFrontmatterTitle falls back for object titles", () => {
  assert.equal(normalizeFrontmatterTitle({ value: "not a title" }, "fallback"), "fallback");
});
