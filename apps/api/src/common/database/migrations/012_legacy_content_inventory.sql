CREATE TABLE IF NOT EXISTS legacy_content_inventory (
  id TEXT PRIMARY KEY,
  legacy_section TEXT NOT NULL,
  legacy_title TEXT NOT NULL,
  legacy_url TEXT,
  legacy_date TIMESTAMPTZ,
  legacy_type TEXT,
  migration_status TEXT NOT NULL DEFAULT 'FOUND',
  migration_note TEXT,
  linked_portal_entity_type TEXT,
  linked_portal_entity_id TEXT,
  created_by_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  updated_by_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT legacy_content_inventory_legacy_section_check CHECK (
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
  ),
  CONSTRAINT legacy_content_inventory_migration_status_check CHECK (
    migration_status IN ('FOUND', 'CREATED_IN_PORTAL', 'VERIFIED', 'SKIPPED')
  ),
  CONSTRAINT legacy_content_inventory_linked_entity_type_check CHECK (
    linked_portal_entity_type IS NULL OR linked_portal_entity_type IN (
      'NEWS_ITEM',
      'PUBLIC_DOCUMENT',
      'MEETING_RECORD',
      'APPROVED_STANDARD'
    )
  ),
  CONSTRAINT legacy_content_inventory_link_pair_check CHECK (
    (
      linked_portal_entity_type IS NULL
      AND linked_portal_entity_id IS NULL
    ) OR (
      linked_portal_entity_type IS NOT NULL
      AND linked_portal_entity_id IS NOT NULL
    )
  )
);

CREATE INDEX IF NOT EXISTS idx_legacy_content_inventory_section_status
  ON legacy_content_inventory (legacy_section, migration_status);

CREATE INDEX IF NOT EXISTS idx_legacy_content_inventory_linked_entity
  ON legacy_content_inventory (linked_portal_entity_type, linked_portal_entity_id);
