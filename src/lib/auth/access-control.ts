/**
 * Unified page-level access control for Cabinet.
 *
 * Every read/write API should call checkPageAccess() before performing
 * the operation.  This centralises the owner/visibility/role logic that
 * was previously scattered (or missing) across individual routes.
 */

import type { RequestUser } from "./request-user";

export type AccessAction = "read" | "write" | "delete" | "admin";

export interface AccessResult {
  allowed: boolean;
  reason?: string;
}

interface PageMeta {
  owner?: string;
  visibility?: string;
}

/**
 * Check whether `user` may perform `action` on the page at `pagePath`.
 *
 * Rules (evaluated in order):
 *  1. No-auth / legacy mode (user is null) → allow everything
 *  2. admin role → allow everything
 *  3. "admin" action → deny (only admins reach here)
 *  4. viewer role → read only
 *  5. private page → owner only (read & write)
 *  6. editor role → read + write + delete
 */
export function checkPageAccess(
  user: RequestUser | null,
  _pagePath: string,
  action: AccessAction,
  meta?: PageMeta,
): AccessResult {
  // No-auth / legacy mode — everything is allowed
  if (!user) return { allowed: true };

  // Admin can do anything
  if (user.role === "admin") return { allowed: true };

  // Actions restricted to admin
  if (action === "admin") {
    return { allowed: false, reason: "Admin access required" };
  }

  // Viewer can only read
  if (user.role === "viewer") {
    if (action !== "read") {
      return { allowed: false, reason: "Viewers have read-only access" };
    }
  }

  // Private page — only owner (and admin, handled above) can access
  if (meta?.visibility === "private" && meta?.owner) {
    if (user.username !== meta.owner) {
      return { allowed: false, reason: "Access denied — private page" };
    }
  }

  return { allowed: true };
}

/**
 * Require admin role.  Convenience wrapper for git mutation endpoints.
 */
export function requireAdmin(user: RequestUser | null): AccessResult {
  if (!user) return { allowed: true }; // no-auth mode
  if (user.role === "admin") return { allowed: true };
  return { allowed: false, reason: "Admin access required" };
}

/**
 * Load page metadata (owner, visibility) for access control checks.
 * Returns undefined if the page doesn't exist or has no frontmatter.
 */
export async function loadPageMeta(virtualPath: string): Promise<PageMeta | undefined> {
  try {
    const { readPage } = await import("@/lib/storage/page-io");
    const page = await readPage(virtualPath);
    return page.frontmatter;
  } catch {
    return undefined;
  }
}

/**
 * Walk up the path hierarchy to find the nearest ancestor page with frontmatter.
 * Used for upload/asset paths that may be subdirectories of a private page.
 * e.g. "notes/my-page/assets/img.png" → tries "notes/my-page/assets/img.png",
 *      then "notes/my-page/assets", then "notes/my-page", then "notes", then "".
 */
export async function loadPageMetaWalkUp(virtualPath: string): Promise<PageMeta | undefined> {
  const parts = virtualPath.split("/").filter(Boolean);
  // Try from the given path up to the root
  for (let len = parts.length; len >= 1; len--) {
    const candidate = parts.slice(0, len).join("/");
    const meta = await loadPageMeta(candidate);
    if (meta !== undefined) return meta;
  }
  return undefined;
}

/**
 * Extract the page path from an asset/upload path.
 * Assets live inside a page directory, so we strip the filename to get the page.
 * e.g. "notes/my-page/image.png" → "notes/my-page"
 */
export function getPagePathFromAssetPath(assetPath: string): string {
  const parts = assetPath.split("/");
  // Remove the last segment (filename) to get the page directory
  if (parts.length > 1) {
    return parts.slice(0, -1).join("/");
  }
  return assetPath;
}
