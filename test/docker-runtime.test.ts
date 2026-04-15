import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

test("docker image build copies Next static assets into the standalone runtime", async () => {
  const dockerfile = await readFile(join(process.cwd(), "Dockerfile"), "utf8");

  assert.match(
    dockerfile,
    /cp -R \.next\/static \.next\/standalone\/\.next\/static/
  );
});
