CREATE TABLE IF NOT EXISTS draft_standards (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  stage TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS draft_standard_versions (
  id TEXT PRIMARY KEY,
  draft_standard_id TEXT NOT NULL REFERENCES draft_standards(id) ON DELETE CASCADE,
  version_label TEXT NOT NULL,
  revision_summary TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_note TEXT NOT NULL,
  published_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS review_cycles (
  id TEXT PRIMARY KEY,
  draft_standard_id TEXT NOT NULL REFERENCES draft_standards(id) ON DELETE CASCADE,
  draft_standard_version_id TEXT NOT NULL REFERENCES draft_standard_versions(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('draft', 'open', 'closed')),
  opens_at TIMESTAMPTZ NOT NULL,
  deadline_at TIMESTAMPTZ NOT NULL,
  closed_at TIMESTAMPTZ,
  created_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (deadline_at >= opens_at)
);

CREATE TABLE IF NOT EXISTS review_assignments (
  id TEXT PRIMARY KEY,
  review_cycle_id TEXT NOT NULL REFERENCES review_cycles(id) ON DELETE CASCADE,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  responded_at TIMESTAMPTZ,
  UNIQUE (review_cycle_id, user_id)
);

CREATE TABLE IF NOT EXISTS review_comments (
  id TEXT PRIMARY KEY,
  review_cycle_id TEXT NOT NULL REFERENCES review_cycles(id) ON DELETE CASCADE,
  draft_standard_id TEXT NOT NULL REFERENCES draft_standards(id) ON DELETE CASCADE,
  draft_standard_version_id TEXT NOT NULL REFERENCES draft_standard_versions(id) ON DELETE CASCADE,
  review_assignment_id TEXT NOT NULL REFERENCES review_assignments(id) ON DELETE CASCADE,
  author_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  section_ref TEXT NOT NULL,
  point_ref TEXT,
  page_ref TEXT,
  remark TEXT NOT NULL,
  proposed_text TEXT NOT NULL,
  rationale TEXT NOT NULL,
  review_status TEXT NOT NULL CHECK (
    review_status IN (
      'RECEIVED',
      'IN_REVIEW',
      'ACCEPTED',
      'PARTIALLY_ACCEPTED',
      'REJECTED',
      'NEEDS_CLARIFICATION'
    )
  ) DEFAULT 'RECEIVED',
  secretariat_response TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS participant_positions (
  id TEXT PRIMARY KEY,
  review_cycle_id TEXT NOT NULL REFERENCES review_cycles(id) ON DELETE CASCADE,
  review_assignment_id TEXT NOT NULL REFERENCES review_assignments(id) ON DELETE CASCADE,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  submitted_by_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  position TEXT NOT NULL CHECK (
    position IN ('AGREED', 'AGREED_WITH_COMMENTS', 'NOT_AGREED')
  ),
  note TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (review_assignment_id)
);

CREATE INDEX IF NOT EXISTS idx_draft_standard_versions_standard
  ON draft_standard_versions(draft_standard_id, published_at DESC);

CREATE INDEX IF NOT EXISTS idx_review_cycles_status_deadline
  ON review_cycles(status, deadline_at DESC);

CREATE INDEX IF NOT EXISTS idx_review_assignments_cycle
  ON review_assignments(review_cycle_id);

CREATE INDEX IF NOT EXISTS idx_review_assignments_user
  ON review_assignments(user_id, review_cycle_id);

CREATE INDEX IF NOT EXISTS idx_review_comments_cycle
  ON review_comments(review_cycle_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_review_comments_assignment
  ON review_comments(review_assignment_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_participant_positions_cycle
  ON participant_positions(review_cycle_id, submitted_at DESC);
