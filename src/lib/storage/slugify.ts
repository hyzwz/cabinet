/**
 * Pure slugify function — safe for both server and client imports.
 * Separated from path-utils to avoid pulling Node.js `fs` into client bundles.
 */
export function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-|-$/g, "");
}
