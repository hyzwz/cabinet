import { getDb } from "@/lib/db";
import { randomUUID } from "crypto";

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  page_path: string | null;
  actor_name: string | null;
  read: number;
  created_at: number;
}

export type NotificationType = "comment" | "mention" | "lock_released";

export function createNotification(
  userId: string,
  type: NotificationType,
  title: string,
  pagePath?: string,
  actorName?: string
): Notification {
  const db = getDb();
  const id = randomUUID();
  const now = Date.now();

  db.prepare(
    "INSERT INTO notifications (id, user_id, type, title, page_path, actor_name, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).run(id, userId, type, title, pagePath || null, actorName || null, now);

  return {
    id,
    user_id: userId,
    type,
    title,
    page_path: pagePath || null,
    actor_name: actorName || null,
    read: 0,
    created_at: now,
  };
}

export function getNotifications(
  userId: string,
  opts?: { unreadOnly?: boolean; limit?: number; offset?: number }
): Notification[] {
  const db = getDb();
  const limit = opts?.limit || 50;
  const offset = opts?.offset || 0;

  if (opts?.unreadOnly) {
    return db
      .prepare(
        "SELECT * FROM notifications WHERE user_id = ? AND read = 0 ORDER BY created_at DESC LIMIT ? OFFSET ?"
      )
      .all(userId, limit, offset) as Notification[];
  }

  return db
    .prepare(
      "SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?"
    )
    .all(userId, limit, offset) as Notification[];
}

export function getUnreadCount(userId: string): number {
  const db = getDb();
  const row = db
    .prepare(
      "SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND read = 0"
    )
    .get(userId) as { count: number };
  return row.count;
}

export function markAsRead(notificationId: string, userId: string): boolean {
  const db = getDb();
  const result = db
    .prepare(
      "UPDATE notifications SET read = 1 WHERE id = ? AND user_id = ?"
    )
    .run(notificationId, userId);
  return result.changes > 0;
}

export function markAllAsRead(userId: string): number {
  const db = getDb();
  const result = db
    .prepare("UPDATE notifications SET read = 1 WHERE user_id = ? AND read = 0")
    .run(userId);
  return result.changes;
}

export function deleteNotificationsByPath(pagePath: string): void {
  const db = getDb();
  db.prepare("DELETE FROM notifications WHERE page_path = ?").run(pagePath);
  const prefix = pagePath + "/";
  db.prepare("DELETE FROM notifications WHERE page_path LIKE ? || '%'").run(
    prefix
  );
}

export function migrateNotificationPaths(
  oldPath: string,
  newPath: string
): void {
  const db = getDb();
  db.prepare(
    "UPDATE notifications SET page_path = ? WHERE page_path = ?"
  ).run(newPath, oldPath);
  const oldPrefix = oldPath + "/";
  const newPrefix = newPath + "/";
  db.prepare(
    `UPDATE notifications SET page_path = ? || substr(page_path, ?) WHERE page_path LIKE ? || '%'`
  ).run(newPrefix, oldPrefix.length + 1, oldPrefix);
}

/** Delete read notifications older than the given age (default: 30 days) */
export function pruneOldNotifications(maxAgeMs: number = 30 * 24 * 60 * 60 * 1000): number {
  const db = getDb();
  const cutoff = Date.now() - maxAgeMs;
  const result = db
    .prepare("DELETE FROM notifications WHERE read = 1 AND created_at < ?")
    .run(cutoff);
  return result.changes;
}

/** Delete all notifications for a specific user */
export function deleteNotificationsByUser(userId: string): void {
  const db = getDb();
  db.prepare("DELETE FROM notifications WHERE user_id = ?").run(userId);
}

/** Delete all comments by a specific user and all their descendant replies (full subtree) */
export function deleteCommentsByUser(userId: string): void {
  const db = getDb();
  // Use a recursive CTE to collect the full subtree rooted at any comment
  // authored by the deleted user, then delete them all in one pass.
  db.prepare(`
    WITH RECURSIVE subtree(id) AS (
      SELECT id FROM comments WHERE author_id = ?
      UNION ALL
      SELECT c.id FROM comments c
      INNER JOIN subtree s ON c.parent_id = s.id
    )
    DELETE FROM comments WHERE id IN (SELECT id FROM subtree)
  `).run(userId);
}

// Notification triggers

export function notifyPageOwnerOfComment(
  pageOwnerUserId: string,
  pagePath: string,
  pageTitle: string,
  commenterName: string
): void {
  createNotification(
    pageOwnerUserId,
    "comment",
    `${commenterName} commented on "${pageTitle}"`,
    pagePath,
    commenterName
  );
}

export function notifyLockReleased(
  userId: string,
  pagePath: string,
  pageTitle: string
): void {
  createNotification(
    userId,
    "lock_released",
    `Lock released on "${pageTitle}"`,
    pagePath
  );
}

export function notifyMention(
  mentionedUserId: string,
  pagePath: string,
  pageTitle: string,
  mentionerName: string
): void {
  createNotification(
    mentionedUserId,
    "mention",
    `${mentionerName} mentioned you in "${pageTitle}"`,
    pagePath,
    mentionerName
  );
}
