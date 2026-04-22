CREATE TABLE IF NOT EXISTS committee_roles (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  category TEXT NOT NULL CHECK (
    category IN ('leadership', 'deputy', 'secretariat')
  ),
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS committee_people (
  id TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  job_title TEXT NOT NULL,
  organization_id TEXT REFERENCES organizations(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS committee_person_roles (
  id TEXT PRIMARY KEY,
  committee_person_id TEXT NOT NULL REFERENCES committee_people(id) ON DELETE CASCADE,
  committee_role_id TEXT NOT NULL REFERENCES committee_roles(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  UNIQUE (committee_person_id, committee_role_id)
);

CREATE TABLE IF NOT EXISTS subcommittees (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  host_organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE draft_standards
  ADD COLUMN IF NOT EXISTS responsible_subcommittee_id TEXT
  REFERENCES subcommittees(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_committee_people_organization
  ON committee_people (organization_id);

CREATE INDEX IF NOT EXISTS idx_committee_person_roles_person_sort
  ON committee_person_roles (committee_person_id, sort_order);

CREATE INDEX IF NOT EXISTS idx_subcommittees_host_organization
  ON subcommittees (host_organization_id);

CREATE INDEX IF NOT EXISTS idx_draft_standards_responsible_subcommittee
  ON draft_standards (responsible_subcommittee_id);
