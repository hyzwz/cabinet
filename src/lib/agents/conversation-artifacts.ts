import fs from "node:fs/promises";
import path from "node:path";
import { normalizeArtifactRecordPath } from "@/lib/navigation/artifact-path";
import { fileExists } from "@/lib/storage/fs-operations";

const CLOCK_SKEW_TOLERANCE_MS = 60_000;
const IGNORED_DIRS = new Set([
  ".agents",
  ".cabinet-state",
  "node_modules",
  "__pycache__",
  ".venv",
  "dist",
  "build",
  "out",
  "coverage",
]);

function compareArtifactPaths(a: string, b: string): number {
  const depthDiff = b.split("/").length - a.split("/").length;
  if (depthDiff !== 0) return depthDiff;
  return a.localeCompare(b, "zh-Hans-CN");
}

function toRelativeArtifactPath(rootDir: string, filePath: string): string {
  return path.relative(rootDir, filePath).split(path.sep).join("/");
}

async function artifactExistsInRoot(rootDir: string, artifactPath: string): Promise<boolean> {
  const resolved = path.resolve(rootDir, artifactPath);
  if (!resolved.startsWith(rootDir)) {
    return false;
  }

  const candidates = [
    resolved,
    `${resolved}.md`,
    path.join(resolved, "index.md"),
  ];

  for (const candidate of candidates) {
    if (await fileExists(candidate)) {
      return true;
    }
  }

  return false;
}

export function mergeArtifactRecordPaths(...groups: string[][]): string[] {
  const merged = new Set<string>();
  for (const group of groups) {
    for (const path of group) {
      const normalized = normalizeArtifactRecordPath(path);
      if (normalized) {
        merged.add(normalized);
      }
    }
  }
  return Array.from(merged).sort(compareArtifactPaths);
}

export async function collectModifiedKbArtifactPaths(
  rootDir: string,
  startedAt: string,
  completedAt: string
): Promise<string[]> {
  const startMs = Date.parse(startedAt);
  const endMs = Date.parse(completedAt);
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) {
    return [];
  }

  const entries: string[] = [];
  const minTime = Math.min(startMs, endMs) - CLOCK_SKEW_TOLERANCE_MS;
  const maxTime = Math.max(startMs, endMs) + CLOCK_SKEW_TOLERANCE_MS;

  async function walk(dir: string): Promise<void> {
    const dirEntries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of dirEntries) {
      if (entry.name.startsWith(".")) continue;
      if (entry.isDirectory() && IGNORED_DIRS.has(entry.name)) continue;

      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
        continue;
      }

      const stat = await fs.stat(fullPath);
      if (stat.mtimeMs < minTime || stat.mtimeMs > maxTime) {
        continue;
      }

      entries.push(toRelativeArtifactPath(rootDir, fullPath));
    }
  }

  try {
    await walk(rootDir);
  } catch {
    return [];
  }

  return mergeArtifactRecordPaths(entries);
}

export async function resolveConversationArtifactPaths(input: {
  rootDir: string;
  reportedPaths: string[];
  startedAt: string;
  completedAt: string;
}): Promise<string[]> {
  const reportedPaths = mergeArtifactRecordPaths(input.reportedPaths);
  const existingReported: string[] = [];

  for (const artifactPath of reportedPaths) {
    if (await artifactExistsInRoot(input.rootDir, artifactPath)) {
      existingReported.push(artifactPath);
    }
  }

  const modifiedPaths = await collectModifiedKbArtifactPaths(
    input.rootDir,
    input.startedAt,
    input.completedAt
  );

  return mergeArtifactRecordPaths(existingReported, modifiedPaths);
}
