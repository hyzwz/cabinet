import test from "node:test";
import assert from "node:assert/strict";
import fs from "fs/promises";
import path from "path";
import { DATA_DIR } from "../src/lib/storage/path-utils";
import { discoverCabinetPathsSync } from "../src/lib/cabinets/discovery";
import { buildCabinetScopedId } from "../src/lib/cabinets/paths";
import { resolveCabinetDir } from "../src/lib/cabinets/server-paths";
import { readCabinetOverview } from "../src/lib/cabinets/overview";
import { createTask, getTasksForAgent } from "../src/lib/agents/task-inbox";
import {
  deleteAgentJob,
  loadAgentJobsBySlug,
  saveAgentJob,
} from "../src/lib/jobs/job-manager";
import type { JobConfig } from "../src/types/jobs";

type CabinetFixture = {
  root: string;
  appDevelopment: string;
  reddit: string;
  tiktok: string;
  cleanup: () => Promise<void>;
};

function uniqueCabinetPath(): string {
  return `__cabinet-v2-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

async function writeText(relativePath: string, content: string): Promise<void> {
  const filePath = path.join(DATA_DIR, relativePath);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content, "utf8");
}

async function writeCabinet(cabinetPath: string, name: string): Promise<void> {
  await writeText(
    path.join(cabinetPath, ".cabinet"),
    [
      "schemaVersion: 1",
      `id: ${cabinetPath.replace(/[^a-z0-9-]+/gi, "-")}`,
      `name: ${name}`,
      "kind: test",
      "entry: index.md",
      "",
    ].join("\n")
  );
  await writeText(path.join(cabinetPath, "index.md"), `# ${name}\n`);
}

async function writeAgent(
  cabinetPath: string,
  slug: string,
  name: string,
  role: string
): Promise<void> {
  await writeText(
    path.join(cabinetPath, ".agents", slug, "persona.md"),
    [
      "---",
      `name: ${name}`,
      `role: ${role}`,
      "active: true",
      "department: test",
      "---",
      "",
      `${name} is a test agent.`,
      "",
    ].join("\n")
  );
}

async function writeJob(
  cabinetPath: string,
  id: string,
  ownerAgent: string
): Promise<void> {
  await writeText(
    path.join(cabinetPath, ".jobs", `${id}.yaml`),
    [
      `id: ${id}`,
      `name: ${id}`,
      `ownerAgent: ${ownerAgent}`,
      "enabled: true",
      "schedule: 0 9 * * 1-5",
      "prompt: Run the test job.",
      "",
    ].join("\n")
  );
}

async function createCabinetFixture(): Promise<CabinetFixture> {
  const root = uniqueCabinetPath();
  const appDevelopment = `${root}/app-development`;
  const reddit = `${root}/marketing/reddit`;
  const tiktok = `${root}/marketing/tiktok`;

  await writeCabinet(root, "Cabinet V2 Root");
  await writeAgent(root, "ceo", "CEO", "Chief executive officer");
  await writeAgent(root, "cfo", "CFO", "Chief financial officer");
  await writeAgent(root, "coo", "COO", "Chief operating officer");
  await writeAgent(root, "cto", "CTO", "Chief technology officer");
  await writeJob(root, "weekly-root-review", "ceo");

  await writeCabinet(appDevelopment, "App Development");
  await writeAgent(appDevelopment, "devops", "DevOps", "Release engineer");

  await writeCabinet(reddit, "Reddit Marketing");
  await writeAgent(reddit, "researcher", "Researcher", "Market researcher");

  await writeCabinet(tiktok, "TikTok Marketing");
  await writeAgent(tiktok, "trend-scout", "Trend Scout", "Trend researcher");
  await writeJob(tiktok, "daily-trend-scan", "trend-scout");

  return {
    root,
    appDevelopment,
    reddit,
    tiktok,
    cleanup: () => fs.rm(path.join(DATA_DIR, root), { recursive: true, force: true }),
  };
}

test("cabinet discovery includes the root cabinet and nested example cabinets", async () => {
  const fixture = await createCabinetFixture();
  try {
    const cabinetPaths = discoverCabinetPathsSync();

    assert.ok(cabinetPaths.includes(fixture.root), "expected the fixture root cabinet");
    assert.ok(cabinetPaths.includes(fixture.tiktok), "expected the nested TikTok cabinet");
    assert.ok(cabinetPaths.includes(fixture.reddit), "expected the nested Reddit cabinet");
    assert.ok(cabinetPaths.includes(fixture.appDevelopment), "expected the nested app development cabinet");
  } finally {
    await fixture.cleanup();
  }
});

test("cabinet overview keeps own scope separate from descendant scope", async () => {
  const fixture = await createCabinetFixture();
  try {
    const ownOverview = await readCabinetOverview(fixture.root, {
      visibilityMode: "own",
    });
    const expandedOverview = await readCabinetOverview(fixture.root, {
      visibilityMode: "children-2",
    });

    const ownChildPaths = ownOverview.children.map((child) => child.path).sort();
    for (const requiredChild of [
      fixture.appDevelopment,
      fixture.reddit,
      fixture.tiktok,
    ]) {
      assert.ok(
        ownChildPaths.includes(requiredChild),
        `expected child cabinet ${requiredChild} to be present`
      );
    }

    const ownAgentSlugs = ownOverview.agents.map((agent) => agent.slug);
    assert.deepEqual(ownAgentSlugs.sort(), ["ceo", "cfo", "coo", "cto"].sort());
    assert.ok(
      !ownAgentSlugs.includes("trend-scout"),
      "own visibility should not include descendant cabinet agents"
    );

    const expandedScopedIds = expandedOverview.agents.map((agent) => agent.scopedId);
    assert.ok(
      expandedScopedIds.includes(buildCabinetScopedId(fixture.root, "agent", "cto")),
      "expected the root cabinet CTO scoped id"
    );
    assert.ok(
      expandedScopedIds.includes(buildCabinetScopedId(fixture.tiktok, "agent", "trend-scout")),
      "expected descendant cabinet scoped ids when descendants are visible"
    );

    const inheritedAgents = expandedOverview.agents.filter((agent) => agent.inherited);
    assert.ok(
      inheritedAgents.every((agent) => agent.cabinetDepth >= 1),
      "expected descendant agents to be marked as inherited"
    );
    assert.ok(
      inheritedAgents.some((agent) => agent.slug === "trend-scout"),
      "expected descendant agents to be present in expanded overview"
    );
  } finally {
    await fixture.cleanup();
  }
});

test("cabinet overview includes descendant jobs within configured visibility", async () => {
  const fixture = await createCabinetFixture();
  try {
    const overview = await readCabinetOverview(fixture.root, {
      visibilityMode: "children-2",
    });

    assert.ok(
      overview.jobs.some((job) => job.cabinetPath === fixture.root),
      "expected root cabinet jobs in overview"
    );
    assert.ok(
      overview.jobs.some((job) => job.cabinetPath === fixture.tiktok),
      "expected descendant cabinet jobs in overview"
    );

    const descendantJob = overview.jobs.find((job) => job.cabinetPath === fixture.tiktok);
    assert.ok(descendantJob, "expected descendant job to be present");
    assert.equal(descendantJob?.inherited, true);
    assert.equal(descendantJob?.cabinetDepth, 1);
  } finally {
    await fixture.cleanup();
  }
});

test("cabinet overview reports missing cabinets", async () => {
  await assert.rejects(
    () => readCabinetOverview("does-not-exist", { visibilityMode: "own" }),
    /Cabinet not found/
  );
});

test("creating a task stores it under the scoped agent inbox", async () => {
  const fixture = await createCabinetFixture();
  try {
    const agentSlug = "cto";
    const scopedAgentId = buildCabinetScopedId(fixture.root, "agent", agentSlug);
    const task = await createTask({
      fromAgent: "ceo",
      toAgent: agentSlug,
      title: `Review cabinet roadmap ${Date.now()}`,
      description: "Validate cabinet-scoped task persistence",
      kbRefs: [],
      priority: 1,
      cabinetPath: fixture.root,
    });

    const tasks = await getTasksForAgent(agentSlug, undefined, fixture.root);
    assert.ok(tasks.some((entry) => entry.id === task.id), "expected created task to be retrievable");
    assert.equal(task.cabinetPath, fixture.root);
    assert.equal(typeof task.id, "string");
    assert.notEqual(task.id.length, 0);
    assert.ok(scopedAgentId.includes(agentSlug));
  } finally {
    await fixture.cleanup();
  }
});

test("cabinet scoped jobs are read and deleted from the cabinet directory", async () => {
  const fixture = await createCabinetFixture();
  try {
    const cabinetDir = resolveCabinetDir(fixture.tiktok);
    const jobsDir = path.join(cabinetDir, ".jobs");
    const agentSlug = "trend-scout";
    const jobId = `cabinet-test-${Date.now()}`;
    const jobConfig: JobConfig = {
      id: jobId,
      name: "Cabinet Test Job",
      description: "Verifies cabinet scoped job persistence",
      prompt: "Run a scoped task",
      schedule: "0 * * * *",
      ownerAgent: agentSlug,
      enabled: true,
    };

    const savedJob = await saveAgentJob(agentSlug, jobConfig, fixture.tiktok);

    const savedPath = path.join(jobsDir, `${savedJob.id}.yaml`);
    await fs.access(savedPath);

    const jobs = await loadAgentJobsBySlug(agentSlug, fixture.tiktok);
    assert.ok(jobs.some((job) => job.id === savedJob.id), "expected saved job to be discoverable");

    await deleteAgentJob(agentSlug, savedJob.id, fixture.tiktok);
    await assert.rejects(() => fs.access(savedPath), /ENOENT/);
  } finally {
    await fixture.cleanup();
  }
});

test("cabinet data dir remains available for overview fixtures", async () => {
  const stat = await fs.stat(DATA_DIR);
  assert.equal(stat.isDirectory(), true);
});
