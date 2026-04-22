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

export interface CommitteeEditableOrganizationRecord extends OrganizationSummary {}

export interface CommitteeEditablePersonRecord {
  id: string;
  fullName: string;
  jobTitle: string;
  organizationId: string | null;
  organization: OrganizationSummary | null;
}

export interface CommitteeRoleAssignmentRecord {
  id: string;
  personId: string;
  roleId: string;
  sortOrder: number;
  person: CommitteePersonSummary;
  role: CommitteeRoleSummary;
}

export interface CommitteeBackofficeData {
  structure: CommitteeStructureResponse;
  organizations: CommitteeEditableOrganizationRecord[];
  people: CommitteeEditablePersonRecord[];
  roles: CommitteeRoleSummary[];
  roleAssignments: CommitteeRoleAssignmentRecord[];
  subcommittees: SubcommitteeSummary[];
}

export interface CreateCommitteeOrganizationDto {
  name: string;
  shortName: string;
  countryCode?: string | null;
}

export interface UpdateCommitteeOrganizationDto {
  name: string;
  shortName: string;
  countryCode?: string | null;
}

export interface CreateCommitteePersonDto {
  fullName: string;
  jobTitle: string;
  organizationId?: string | null;
}

export interface UpdateCommitteePersonDto {
  fullName: string;
  jobTitle: string;
  organizationId?: string | null;
}

export interface CreateSubcommitteeDto {
  code: string;
  title: string;
  hostOrganizationId: string;
}

export interface UpdateSubcommitteeDto {
  code: string;
  title: string;
  hostOrganizationId: string;
}

export interface CreateCommitteeRoleAssignmentDto {
  personId: string;
  roleId: string;
  sortOrder: number;
}

export interface UpdateCommitteeRoleAssignmentDto {
  personId: string;
  roleId: string;
  sortOrder: number;
}
