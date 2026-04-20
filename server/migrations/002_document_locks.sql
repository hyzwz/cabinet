-- Document edit locks for collaboration
CREATE TABLE IF NOT EXISTS document_locks (
  page_path TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  username TEXT NOT NULL,
  acquired_at INTEGER NOT NULL,
  last_heartbeat INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_locks_user ON document_locks(user_id);
