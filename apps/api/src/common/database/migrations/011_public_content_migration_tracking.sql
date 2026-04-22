ALTER TABLE news_items
  ADD COLUMN IF NOT EXISTS legacy_source_url TEXT,
  ADD COLUMN IF NOT EXISTS legacy_section TEXT NOT NULL DEFAULT 'NEWS',
  ADD COLUMN IF NOT EXISTS migration_status TEXT NOT NULL DEFAULT 'NOT_IMPORTED',
  ADD COLUMN IF NOT EXISTS migration_note TEXT;

ALTER TABLE public_documents
  ADD COLUMN IF NOT EXISTS legacy_source_url TEXT,
  ADD COLUMN IF NOT EXISTS legacy_section TEXT NOT NULL DEFAULT 'MAIN_DOCUMENTS',
  ADD COLUMN IF NOT EXISTS migration_status TEXT NOT NULL DEFAULT 'NOT_IMPORTED',
  ADD COLUMN IF NOT EXISTS migration_note TEXT;

ALTER TABLE meeting_records
  ADD COLUMN IF NOT EXISTS legacy_source_url TEXT,
  ADD COLUMN IF NOT EXISTS legacy_section TEXT NOT NULL DEFAULT 'MEETING_AGENDA',
  ADD COLUMN IF NOT EXISTS migration_status TEXT NOT NULL DEFAULT 'NOT_IMPORTED',
  ADD COLUMN IF NOT EXISTS migration_note TEXT;

ALTER TABLE approved_standards
  ADD COLUMN IF NOT EXISTS legacy_source_url TEXT,
  ADD COLUMN IF NOT EXISTS legacy_section TEXT NOT NULL DEFAULT 'APPROVED_STANDARDS',
  ADD COLUMN IF NOT EXISTS migration_status TEXT NOT NULL DEFAULT 'NOT_IMPORTED',
  ADD COLUMN IF NOT EXISTS migration_note TEXT;

DO $$
BEGIN
  ALTER TABLE news_items
    ADD CONSTRAINT news_items_legacy_section_check
    CHECK (
      legacy_section IN (
        'NEWS',
        'MAIN_DOCUMENTS',
        'WORK_REPORTS',
        'WORK_PLANS',
        'NATIONAL_STANDARDS_PROGRAM',
        'MEETING_MINUTES',
        'MEETING_AGENDA',
        'APPROVED_STANDARDS'
      )
    );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public_documents
    ADD CONSTRAINT public_documents_legacy_section_check
    CHECK (
      legacy_section IN (
        'NEWS',
        'MAIN_DOCUMENTS',
        'WORK_REPORTS',
        'WORK_PLANS',
        'NATIONAL_STANDARDS_PROGRAM',
        'MEETING_MINUTES',
        'MEETING_AGENDA',
        'APPROVED_STANDARDS'
      )
    );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE meeting_records
    ADD CONSTRAINT meeting_records_legacy_section_check
    CHECK (
      legacy_section IN (
        'NEWS',
        'MAIN_DOCUMENTS',
        'WORK_REPORTS',
        'WORK_PLANS',
        'NATIONAL_STANDARDS_PROGRAM',
        'MEETING_MINUTES',
        'MEETING_AGENDA',
        'APPROVED_STANDARDS'
      )
    );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE approved_standards
    ADD CONSTRAINT approved_standards_legacy_section_check
    CHECK (
      legacy_section IN (
        'NEWS',
        'MAIN_DOCUMENTS',
        'WORK_REPORTS',
        'WORK_PLANS',
        'NATIONAL_STANDARDS_PROGRAM',
        'MEETING_MINUTES',
        'MEETING_AGENDA',
        'APPROVED_STANDARDS'
      )
    );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE news_items
    ADD CONSTRAINT news_items_migration_status_check
    CHECK (migration_status IN ('NOT_IMPORTED', 'IMPORTED', 'VERIFIED'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public_documents
    ADD CONSTRAINT public_documents_migration_status_check
    CHECK (migration_status IN ('NOT_IMPORTED', 'IMPORTED', 'VERIFIED'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE meeting_records
    ADD CONSTRAINT meeting_records_migration_status_check
    CHECK (migration_status IN ('NOT_IMPORTED', 'IMPORTED', 'VERIFIED'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE approved_standards
    ADD CONSTRAINT approved_standards_migration_status_check
    CHECK (migration_status IN ('NOT_IMPORTED', 'IMPORTED', 'VERIFIED'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_news_items_migration_status_section
  ON news_items (migration_status, legacy_section);

CREATE INDEX IF NOT EXISTS idx_public_documents_migration_status_section
  ON public_documents (migration_status, legacy_section);

CREATE INDEX IF NOT EXISTS idx_meeting_records_migration_status_section
  ON meeting_records (migration_status, legacy_section);

CREATE INDEX IF NOT EXISTS idx_approved_standards_migration_status_section
  ON approved_standards (migration_status, legacy_section);
