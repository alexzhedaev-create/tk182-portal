CREATE TABLE IF NOT EXISTS news_items (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  excerpt TEXT NOT NULL,
  body TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('draft', 'published')),
  publication_date TIMESTAMPTZ NOT NULL,
  published_at TIMESTAMPTZ,
  created_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  updated_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public_documents (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT NOT NULL CHECK (
    category IN (
      'MAIN_DOCUMENTS',
      'WORK_REPORTS',
      'WORK_PLANS',
      'NATIONAL_STANDARDS_PROGRAM'
    )
  ),
  summary TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('draft', 'published')),
  publication_date TIMESTAMPTZ NOT NULL,
  published_at TIMESTAMPTZ,
  file_original_name TEXT,
  file_stored_name TEXT,
  file_mime_type TEXT,
  file_size_bytes BIGINT,
  file_uploaded_at TIMESTAMPTZ,
  file_uploaded_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  file_description TEXT,
  created_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  updated_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS meeting_records (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT NOT NULL CHECK (
    category IN ('MEETING_MINUTES', 'MEETING_AGENDA')
  ),
  summary TEXT NOT NULL,
  body TEXT NOT NULL,
  location TEXT,
  meeting_date TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('draft', 'published')),
  publication_date TIMESTAMPTZ NOT NULL,
  published_at TIMESTAMPTZ,
  file_original_name TEXT,
  file_stored_name TEXT,
  file_mime_type TEXT,
  file_size_bytes BIGINT,
  file_uploaded_at TIMESTAMPTZ,
  file_uploaded_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  file_description TEXT,
  created_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  updated_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS approved_standards (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  approval_date TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('draft', 'published')),
  publication_date TIMESTAMPTZ NOT NULL,
  published_at TIMESTAMPTZ,
  responsible_subcommittee_id TEXT REFERENCES subcommittees(id) ON DELETE SET NULL,
  file_original_name TEXT,
  file_stored_name TEXT,
  file_mime_type TEXT,
  file_size_bytes BIGINT,
  file_uploaded_at TIMESTAMPTZ,
  file_uploaded_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  file_description TEXT,
  created_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  updated_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_news_items_status_publication_date
  ON news_items (status, publication_date DESC);

CREATE INDEX IF NOT EXISTS idx_public_documents_status_category_publication_date
  ON public_documents (status, category, publication_date DESC);

CREATE INDEX IF NOT EXISTS idx_meeting_records_status_category_meeting_date
  ON meeting_records (status, category, meeting_date DESC);

CREATE INDEX IF NOT EXISTS idx_approved_standards_status_approval_date
  ON approved_standards (status, approval_date DESC);

CREATE INDEX IF NOT EXISTS idx_approved_standards_responsible_subcommittee
  ON approved_standards (responsible_subcommittee_id);
