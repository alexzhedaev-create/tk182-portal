CREATE TABLE IF NOT EXISTS audit_events (
  id TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actor_user_id TEXT NOT NULL,
  actor_role TEXT NOT NULL CHECK (
    actor_role IN ('ADMIN', 'SECRETARIAT', 'PARTICIPANT')
  ),
  actor_display_name TEXT NOT NULL,
  action_type TEXT NOT NULL CHECK (
    action_type IN (
      'COMMENT_CREATED',
      'COMMENT_UPDATED',
      'COMMENT_DELETED',
      'POSITION_SUBMITTED',
      'POSITION_UPDATED',
      'COMMENT_STATUS_CHANGED',
      'SECRETARIAT_RESPONSE_UPDATED',
      'FILE_UPLOADED',
      'FILE_METADATA_CHANGED',
      'FILE_DELETED'
    )
  ),
  entity_type TEXT NOT NULL CHECK (
    entity_type IN (
      'REVIEW_COMMENT',
      'PARTICIPANT_POSITION',
      'VERSION_FILE'
    )
  ),
  entity_id TEXT NOT NULL,
  related_cycle_id TEXT,
  related_draft_standard_id TEXT,
  related_comment_id TEXT,
  related_file_id TEXT,
  message TEXT NOT NULL,
  metadata_json JSONB
);

CREATE INDEX IF NOT EXISTS idx_audit_events_cycle_created_at
  ON audit_events (related_cycle_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_events_draft_created_at
  ON audit_events (related_draft_standard_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_events_actor_created_at
  ON audit_events (actor_user_id, created_at DESC);
