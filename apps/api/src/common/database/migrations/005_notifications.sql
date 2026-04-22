CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  recipient_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  read_at TIMESTAMPTZ,
  type TEXT NOT NULL CHECK (
    type IN (
      'ASSIGNED_TO_ACTIVE_CYCLE',
      'COMMENT_STATUS_CHANGED',
      'SECRETARIAT_RESPONSE_UPDATED',
      'FINAL_POSITION_SUBMITTED',
      'FINAL_POSITION_UPDATED',
      'VERSION_FILE_UPLOADED'
    )
  ),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  related_cycle_id TEXT,
  related_draft_standard_id TEXT,
  related_comment_id TEXT,
  related_file_id TEXT,
  target_route TEXT
);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient_created_at
  ON notifications (recipient_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient_read_at
  ON notifications (recipient_user_id, read_at, created_at DESC);
