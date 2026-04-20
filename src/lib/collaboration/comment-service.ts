import { getDb } from "@/lib/db";
import { randomUUID } from "crypto";

export interface Comment {
  id: string;
  page_path: string;
  author_id: string;
  author_name: string;
  content: string;
  parent_id: string | null;
  created_at: number;
  updated_at: number | null;
  resolved_at: number | null;
}

export interface CommentThread extends Comment {
  replies: Comment[];
}

export function getComments(pagePath: string): CommentThread[] {
  const db = getDb();
  const rows = db
    .prepare(
      "SELECT * FROM comments WHERE page_path = ? ORDER BY created_at ASC"
    )
    .all(pagePath) as Comment[];

  // Build tree: top-level comments with flattened replies.
  // byId maps every comment id → its root CommentThread, so reply-to-reply
  // chains are flattened into the root thread's replies array.
  const topLevel: CommentThread[] = [];
  const byId = new Map<string, CommentThread>();

  for (const row of rows) {
    if (!row.parent_id) {
      const thread: CommentThread = { ...row, replies: [] };
      topLevel.push(thread);
      byId.set(row.id, thread);
    } else {
      const rootThread = byId.get(row.parent_id);
      if (rootThread) {
        rootThread.replies.push(row);
        byId.set(row.id, rootThread);
      }
      // If parent not found, it was deleted — orphan is skipped
    }
  }

  return topLevel;
}

export function getCommentCount(pagePath: string): number {
  const db = getDb();
  const row = db
    .prepare("SELECT COUNT(*) as count FROM comments WHERE page_path = ?")
    .get(pagePath) as { count: number };
  return row.count;
}

export function addComment(
  pagePath: string,
  authorId: string,
  authorName: string,
  content: string,
  parentId?: string
): Comment {
  const db = getDb();
  const id = randomUUID();
  const now = Date.now();

  db.prepare(
    "INSERT INTO comments (id, page_path, author_id, author_name, content, parent_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).run(id, pagePath, authorId, authorName, content, parentId || null, now);

  return {
    id,
    page_path: pagePath,
    author_id: authorId,
    author_name: authorName,
    content,
    parent_id: parentId || null,
    created_at: now,
    updated_at: null,
    resolved_at: null,
  };
}

export function updateComment(
  commentId: string,
  userId: string,
  isAdmin: boolean,
  updates: { content?: string; resolved?: boolean }
): boolean {
  const db = getDb();
  const existing = db
    .prepare("SELECT * FROM comments WHERE id = ?")
    .get(commentId) as Comment | undefined;

  if (!existing) return false;
  if (existing.author_id !== userId && !isAdmin) return false;

  const now = Date.now();
  if (updates.content !== undefined) {
    db.prepare(
      "UPDATE comments SET content = ?, updated_at = ? WHERE id = ?"
    ).run(updates.content, now, commentId);
  }
  if (updates.resolved !== undefined) {
    db.prepare("UPDATE comments SET resolved_at = ? WHERE id = ?").run(
      updates.resolved ? now : null,
      commentId
    );
  }

  return true;
}

export function deleteComment(
  commentId: string,
  userId: string,
  isAdmin: boolean
): boolean {
  const db = getDb();
  const existing = db
    .prepare("SELECT * FROM comments WHERE id = ?")
    .get(commentId) as Comment | undefined;

  if (!existing) return false;
  if (existing.author_id !== userId && !isAdmin) return false;

  // Delete the comment and all descendants recursively using a CTE
  db.prepare(`
    WITH RECURSIVE subtree(id) AS (
      SELECT id FROM comments WHERE id = ?
      UNION ALL
      SELECT c.id FROM comments c
      INNER JOIN subtree s ON c.parent_id = s.id
    )
    DELETE FROM comments WHERE id IN (SELECT id FROM subtree)
  `).run(commentId);
  return true;
}

export function deleteCommentsByPath(pagePath: string): void {
  const db = getDb();
  db.prepare("DELETE FROM comments WHERE page_path = ?").run(pagePath);
  const prefix = pagePath + "/";
  db.prepare("DELETE FROM comments WHERE page_path LIKE ? || '%'").run(prefix);
}

export function migrateCommentPaths(
  oldPath: string,
  newPath: string
): void {
  const db = getDb();
  // Exact match
  db.prepare("UPDATE comments SET page_path = ? WHERE page_path = ?").run(
    newPath,
    oldPath
  );
  // Prefix match
  const oldPrefix = oldPath + "/";
  const newPrefix = newPath + "/";
  db.prepare(
    `UPDATE comments SET page_path = ? || substr(page_path, ?) WHERE page_path LIKE ? || '%'`
  ).run(newPrefix, oldPrefix.length + 1, oldPrefix);
}
