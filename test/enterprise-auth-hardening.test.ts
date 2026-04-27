import test from "node:test";
import assert from "node:assert/strict";
import path from "path";
import { NextRequest } from "next/server";
import { normalizeCabinetPath, ROOT_CABINET_PATH } from "@/lib/cabinets/paths";
import { requireAdmin, requireCabinetRead } from "@/lib/auth/route-guards";
import { DATA_DIR, resolveContentPath } from "@/lib/storage/path-utils";
import { resolveScopedWorkdir } from "@/lib/agents/workdir-policy";
import { claudeCodeProvider } from "@/lib/agents/providers/claude-code";

function requestWithRole(role?: string): NextRequest {
  const headers = new Headers();
  if (role) {
    headers.set("x-user-id", `${role}-1`);
    headers.set("x-user-name", role);
    headers.set("x-user-role", role);
  }
  return new NextRequest("http://localhost/api/test", { headers });
}

test("resolveContentPath rejects sibling paths that only share the data-dir prefix", () => {
  const siblingPath = `../${path.basename(DATA_DIR)}-sibling/secret.md`;
  assert.throws(() => resolveContentPath(siblingPath), /Path traversal detected/);
});

test("normalizeCabinetPath rejects traversal segments", () => {
  assert.equal(normalizeCabinetPath("../finance", false), undefined);
  assert.equal(normalizeCabinetPath("team/../finance", false), undefined);
  assert.equal(normalizeCabinetPath("team//finance", false), undefined);
  assert.equal(normalizeCabinetPath("../finance", true), ROOT_CABINET_PATH);
});

test("requireAdmin blocks anonymous and non-admin requests", async () => {
  const anonymous = await requireAdmin(requestWithRole());
  assert.equal(anonymous?.status, 401);

  const editor = await requireAdmin(requestWithRole("editor"));
  assert.equal(editor?.status, 403);

  const admin = await requireAdmin(requestWithRole("admin"));
  assert.equal(admin, null);
});

test("requireCabinetRead requires an authenticated actor", async () => {
  const anonymous = await requireCabinetRead(requestWithRole(), ".");
  assert.equal(anonymous?.status, 401);
});

test("resolveScopedWorkdir stays inside the active cabinet root", () => {
  const cabinetRoot = resolveContentPath("example-text-your-mom");
  assert.equal(
    resolveScopedWorkdir({ cabinetPath: "example-text-your-mom", workdir: "/data" }),
    cabinetRoot,
  );
  assert.equal(
    resolveScopedWorkdir({ cabinetPath: "example-text-your-mom", workdir: "workspace/reports" }),
    path.join(cabinetRoot, "workspace", "reports"),
  );
  assert.throws(
    () => resolveScopedWorkdir({ cabinetPath: "example-text-your-mom", workdir: "../other" }),
    /Invalid agent workdir/,
  );
});

test("dangerous CLI flags can be disabled for enterprise execution", () => {
  const previous = process.env.CABINET_DISABLE_DANGEROUS_CLI_FLAGS;
  process.env.CABINET_DISABLE_DANGEROUS_CLI_FLAGS = "1";
  try {
    const args = claudeCodeProvider.buildArgs?.("hello", DATA_DIR) || [];
    assert.equal(args.includes("--dangerously-skip-permissions"), false);
  } finally {
    if (previous === undefined) {
      delete process.env.CABINET_DISABLE_DANGEROUS_CLI_FLAGS;
    } else {
      process.env.CABINET_DISABLE_DANGEROUS_CLI_FLAGS = previous;
    }
  }
});
