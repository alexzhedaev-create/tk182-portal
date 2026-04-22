CREATE TABLE IF NOT EXISTS draft_standard_version_files (
  id TEXT PRIMARY KEY,
  version_id TEXT NOT NULL REFERENCES draft_standard_versions(id) ON DELETE CASCADE,
  original_name TEXT NOT NULL,
  stored_name TEXT NOT NULL UNIQUE,
  mime_type TEXT NOT NULL,
  size_bytes BIGINT NOT NULL CHECK (size_bytes >= 0),
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  uploaded_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  visibility TEXT NOT NULL CHECK (
    visibility IN ('ASSIGNED_PARTICIPANTS', 'SECRETARIAT_ONLY')
  ),
  description TEXT
);

CREATE INDEX IF NOT EXISTS idx_draft_standard_version_files_version_id
  ON draft_standard_version_files (version_id);
