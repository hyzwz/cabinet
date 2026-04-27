import path from "path";
import { getManagedDataDir, isElectronRuntime, PROJECT_ROOT } from "@/lib/runtime/runtime-config";

export const DATA_DIR = getManagedDataDir();
export const CABINET_INTERNAL_DIR = path.join(DATA_DIR, ".cabinet-state");
export const ROOT_INSTALL_METADATA_PATH = path.join(PROJECT_ROOT, ".cabinet-install.json");
export const DATA_INSTALL_METADATA_PATH = path.join(CABINET_INTERNAL_DIR, "install.json");
export const PROJECT_RELEASE_MANIFEST_PATH = path.join(PROJECT_ROOT, "cabinet-release.json");
export const UPDATE_STATUS_PATH = path.join(CABINET_INTERNAL_DIR, "update-status.json");
export const FILE_SCHEMA_STATE_PATH = path.join(CABINET_INTERNAL_DIR, "file-schema.json");
export const BACKUP_ROOT = isElectronRuntime()
  ? path.join(path.dirname(DATA_DIR), "cabinet-backups")
  : path.resolve(PROJECT_ROOT, "..", ".cabinet-backups", path.basename(PROJECT_ROOT));

export function isPathInside(basePath: string, fsPath: string): boolean {
  const relative = path.relative(basePath, fsPath);
  return relative === "" || (!!relative && !relative.startsWith("..") && !path.isAbsolute(relative));
}

export function isPathInsideDataDir(fsPath: string): boolean {
  return isPathInside(DATA_DIR, fsPath);
}

export function resolveContentPath(virtualPath: string): string {
  const resolved = path.resolve(DATA_DIR, virtualPath);
  if (!isPathInsideDataDir(resolved)) {
    throw new Error("Path traversal detected");
  }
  return resolved;
}

export function virtualPathFromFs(fsPath: string): string {
  return fsPath.replace(DATA_DIR, "").replace(/^\//, "");
}

export { sanitizeFilename } from "./sanitize-filename";

/** Shared slug generator — supports CJK and other Unicode scripts */
export { slugify } from "./slugify";

export function isMarkdownFile(name: string): boolean {
  return name.endsWith(".md");
}

const IGNORED_DIRS = new Set(["node_modules", "__pycache__", ".venv", "dist", "build", "out", "coverage"]);

export function isHiddenEntry(name: string): boolean {
  return name.startsWith(".") || IGNORED_DIRS.has(name);
}
