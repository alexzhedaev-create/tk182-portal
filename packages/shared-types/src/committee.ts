import type { OrganizationSummary } from "./organization";

export type CommitteeRoleCategory = "leadership" | "deputy" | "secretariat";

export interface CommitteeRoleSummary {
  id: string;
  code: string;
  title: string;
  category: CommitteeRoleCategory;
}

export interface CommitteePersonSummary {
  id: string;
  fullName: string;
  jobTitle: string;
  organization: OrganizationSummary | null;
}

export interface CommitteePersonRoleRecord {
  id: string;
  role: CommitteeRoleSummary;
  person: CommitteePersonSummary;
  sortOrder: number;
}

export interface SubcommitteeSummary {
  id: string;
  code: string;
  title: string;
  hostOrganization: OrganizationSummary;
}

export interface CommitteeOrganizationRecord extends OrganizationSummary {
  committeeFunctions: string[];
  representedPeople: CommitteePersonSummary[];
  hostedSubcommittees: SubcommitteeSummary[];
}

export interface CommitteeStructureResponse {
  leadership: CommitteePersonRoleRecord[];
  deputyCoChairs: CommitteePersonRoleRecord[];
  secretariat: CommitteePersonRoleRecord[];
  secretariatHostOrganization: OrganizationSummary | null;
  subcommittees: SubcommitteeSummary[];
  organizations: CommitteeOrganizationRecord[];
}
