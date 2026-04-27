import path from "path";
import { DATA_DIR, isPathInside, resolveContentPath } from "@/lib/storage/path-utils";

function normalizeWorkdirInput(value?: string | null): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().replace(/\\/g, "/");
  if (!trimmed || trimmed === "/" || trimmed === "/data") return null;

  if (trimmed === "." || trimmed === "/data/") return null;
  if (trimmed.startsWith("/data/")) {
    return trimmed.slice("/data/".length);
  }
  return trimmed.replace(/^\/+/, "");
}

function validateRelativeWorkdir(relativePath: string): void {
  const segments = relativePath.split("/");
  if (
    relativePath.length === 0 ||
    path.isAbsolute(relativePath) ||
    segments.some((segment) => !segment || segment === "." || segment === "..")
  ) {
    throw new Error("Invalid agent workdir");
  }
}

export function resolveScopedWorkdir(input: {
  workdir?: string | null;
  cabinetPath?: string | null;
}): string {
  const baseCwd = input.cabinetPath ? resolveContentPath(input.cabinetPath) : DATA_DIR;
  const relativeWorkdir = normalizeWorkdirInput(input.workdir);
  if (!relativeWorkdir) return baseCwd;

  validateRelativeWorkdir(relativeWorkdir);
  const resolved = path.resolve(baseCwd, relativeWorkdir);
  if (!isPathInside(baseCwd, resolved) || !isPathInside(DATA_DIR, resolved)) {
    throw new Error("Agent workdir must stay inside the active cabinet");
  }
  return resolved;
}

export function normalizeStoredWorkdir(value?: string | null): string {
  const relativeWorkdir = normalizeWorkdirInput(value);
  if (!relativeWorkdir) return "/data";
  validateRelativeWorkdir(relativeWorkdir);
  return relativeWorkdir;
}
