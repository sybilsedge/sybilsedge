CREATE TABLE IF NOT EXISTS twin_interactions (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp      TEXT    NOT NULL,
  session_id     TEXT    NOT NULL,
  message        TEXT    NOT NULL,
  is_new_session INTEGER NOT NULL DEFAULT 0,
  user_agent     TEXT,
  referrer       TEXT
);

CREATE INDEX IF NOT EXISTS idx_session_id  ON twin_interactions(session_id);
CREATE INDEX IF NOT EXISTS idx_timestamp   ON twin_interactions(timestamp);