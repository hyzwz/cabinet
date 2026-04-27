/**
 * Pure filename sanitizer — safe for both server and client imports.
 * Separated from path-utils to avoid pulling Node.js runtime config into client bundles.
 */
export function sanitizeFilename(name: string): string {
  return name
    .replace(/[^\p{L}\p{N}\s_-]/gu, "")
    .trim()
    .replace(/\s+/g, "-")
    .toLowerCase();
}
