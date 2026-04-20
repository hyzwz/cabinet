import { getDb } from "@/lib/db";

const LOCK_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

export interface DocumentLock {
  page_path: string;
  user_id: string;
  username: string;
  acquired_at: number;
  last_heartbeat: number;
}

function isExpired(lock: DocumentLock): boolean {
  return Date.now() - lock.last_heartbeat > LOCK_TIMEOUT_MS;
}

export function getLock(pagePath: string): DocumentLock | null {
  const db = getDb();
  const lock = db
    .prepare("SELECT * FROM document_locks WHERE page_path = ?")
    .get(pagePath) as DocumentLock | undefined;

  if (!lock) return null;

  if (isExpired(lock)) {
    db.prepare("DELETE FROM document_locks WHERE page_path = ?").run(pagePath);
    return null;
  }

  return lock;
}

export function acquireLock(
  pagePath: string,
  userId: string,
  username: string
): { success: boolean; lock: DocumentLock } {
  const db = getDb();
  const now = Date.now();

  const existing = getLock(pagePath);

  if (existing && existing.user_id === userId) {
    // Already own the lock — refresh heartbeat
    db.prepare(
      "UPDATE document_locks SET last_heartbeat = ? WHERE page_path = ?"
    ).run(now, pagePath);
    return { success: true, lock: { ...existing, last_heartbeat: now } };
  }

  if (existing) {
    // Someone else holds a valid lock
    return { success: false, lock: existing };
  }

  // No lock or expired — acquire
  const lock: DocumentLock = {
    page_path: pagePath,
    user_id: userId,
    username,
    acquired_at: now,
    last_heartbeat: now,
  };

  db.prepare(
    "INSERT OR REPLACE INTO document_locks (page_path, user_id, username, acquired_at, last_heartbeat) VALUES (?, ?, ?, ?, ?)"
  ).run(pagePath, userId, username, now, now);

  return { success: true, lock };
}

export function releaseLock(
  pagePath: string,
  userId: string,
  isAdmin: boolean
): boolean {
  const db = getDb();
  const existing = getLock(pagePath);

  if (!existing) return true;

  if (existing.user_id !== userId && !isAdmin) {
    return false;
  }

  db.prepare("DELETE FROM document_locks WHERE page_path = ?").run(pagePath);
  return true;
}

export function refreshHeartbeat(
  pagePath: string,
  userId: string
): boolean {
  const db = getDb();
  const existing = getLock(pagePath);

  if (!existing || existing.user_id !== userId) return false;

  db.prepare(
    "UPDATE document_locks SET last_heartbeat = ? WHERE page_path = ?"
  ).run(Date.now(), pagePath);
  return true;
}

export function deleteLocksByPath(pagePath: string): void {
  const db = getDb();
  // Exact match
  db.prepare("DELETE FROM document_locks WHERE page_path = ?").run(pagePath);
  // Prefix match for child pages
  const prefix = pagePath + "/";
  db.prepare("DELETE FROM document_locks WHERE page_path LIKE ? || '%'").run(
    prefix
  );
}

export function cleanExpiredLocks(): number {
  const db = getDb();
  const cutoff = Date.now() - LOCK_TIMEOUT_MS;
  const result = db
    .prepare("DELETE FROM document_locks WHERE last_heartbeat < ?")
    .run(cutoff);
  return result.changes;
}

export function migrateLockPaths(oldPath: string, newPath: string): void {
  const db = getDb();
  // Exact match
  db.prepare(
    "UPDATE document_locks SET page_path = ? WHERE page_path = ?"
  ).run(newPath, oldPath);
  // Prefix match
  const oldPrefix = oldPath + "/";
  const newPrefix = newPath + "/";
  db.prepare(
    `UPDATE document_locks SET page_path = ? || substr(page_path, ?) WHERE page_path LIKE ? || '%'`
  ).run(newPrefix, oldPrefix.length + 1, oldPrefix);
}
