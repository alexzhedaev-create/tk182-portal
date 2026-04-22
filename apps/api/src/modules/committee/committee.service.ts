import { Injectable } from "@nestjs/common";
import type {
  CommitteeOrganizationRecord,
  CommitteePersonRoleRecord,
  CommitteeRoleCategory,
  CommitteeStructureResponse,
  OrganizationSummary,
  SubcommitteeSummary
} from "@tk182/shared-types";

import { DatabaseService } from "../../common/database/database.service";
import { createModuleStubResponse } from "../../common/stub-response";

interface CommitteePersonRoleRow {
  assignment_id: string;
  organization_country_code: string | null;
  organization_id: string | null;
  organization_name: string | null;
  organization_short_name: string | null;
  person_full_name: string;
  person_id: string;
  person_job_title: string;
  role_category: CommitteeRoleCategory;
  role_code: string;
  role_id: string;
  role_title: string;
  sort_order: number;
}

interface SubcommitteeRow {
  code: string;
  host_organization_country_code: string | null;
  host_organization_id: string;
  host_organization_name: string;
  host_organization_short_name: string;
  id: string;
  title: string;
}

@Injectable()
export class CommitteeService {
  constructor(private readonly databaseService: DatabaseService) {}

  getSummary() {
    return {
      ...createModuleStubResponse(
        "committee",
        ["public", "secretariat"],
        "Комитетная структура ТК 182 хранит руководство, секретариат, подкомитеты и базовые организации.",
        "Следующий шаг: расширить публичные карточки комитетных проектов и связать структуру с открытыми публикациями."
      ),
      status: "active" as const
    };
  }

  async getStructure(): Promise<CommitteeStructureResponse> {
    const [personRoles, subcommittees] = await Promise.all([
      this.listPersonRoles(),
      this.listSubcommitteeRows()
    ]);

    const leadership = personRoles.filter((item) => item.role.category === "leadership");
    const deputyCoChairs = personRoles.filter((item) => item.role.category === "deputy");
    const secretariat = personRoles.filter((item) => item.role.category === "secretariat");
    const secretariatHostOrganization =
      secretariat.find((item) => item.role.code === "RESPONSIBLE_SECRETARY")?.person
        .organization ?? null;

    return {
      leadership,
      deputyCoChairs,
      secretariat,
      secretariatHostOrganization,
      subcommittees,
      organizations: this.buildCommitteeOrganizations(
        leadership,
        deputyCoChairs,
        secretariat,
        subcommittees,
        secretariatHostOrganization
      )
    };
  }

  async listSubcommittees(): Promise<SubcommitteeSummary[]> {
    const rows = await this.listSubcommitteeRows();

    return rows;
  }

  private async listPersonRoles(): Promise<CommitteePersonRoleRecord[]> {
    const result = await this.databaseService.query<CommitteePersonRoleRow>(
      `
        SELECT
          cpr.id AS assignment_id,
          cpr.sort_order,
          cr.id AS role_id,
          cr.code AS role_code,
          cr.title AS role_title,
          cr.category AS role_category,
          cp.id AS person_id,
          cp.full_name AS person_full_name,
          cp.job_title AS person_job_title,
          o.id AS organization_id,
          o.name AS organization_name,
          o.short_name AS organization_short_name,
          o.country_code AS organization_country_code
        FROM committee_person_roles cpr
        INNER JOIN committee_roles cr ON cr.id = cpr.committee_role_id
        INNER JOIN committee_people cp ON cp.id = cpr.committee_person_id
        LEFT JOIN organizations o ON o.id = cp.organization_id
        ORDER BY
          CASE cr.category
            WHEN 'leadership' THEN 0
            WHEN 'deputy' THEN 1
            ELSE 2
          END,
          cpr.sort_order ASC,
          cp.full_name ASC
      `
    );

    return result.rows.map((row) => ({
      id: row.assignment_id,
      sortOrder: row.sort_order,
      role: {
        id: row.role_id,
        code: row.role_code,
        title: row.role_title,
        category: row.role_category
      },
      person: {
        id: row.person_id,
        fullName: row.person_full_name,
        jobTitle: row.person_job_title,
        organization: row.organization_id
          ? {
              id: row.organization_id,
              name: row.organization_name ?? row.organization_short_name ?? "Организация",
              shortName:
                row.organization_short_name ?? row.organization_name ?? "Организация",
              ...(row.organization_country_code
                ? { countryCode: row.organization_country_code }
                : {})
            }
          : null
      }
    }));
  }

  private async listSubcommitteeRows(): Promise<SubcommitteeSummary[]> {
    const result = await this.databaseService.query<SubcommitteeRow>(
      `
        SELECT
          sc.id,
          sc.code,
          sc.title,
          o.id AS host_organization_id,
          o.name AS host_organization_name,
          o.short_name AS host_organization_short_name,
          o.country_code AS host_organization_country_code
        FROM subcommittees sc
        INNER JOIN organizations o ON o.id = sc.host_organization_id
        ORDER BY sc.code ASC
      `
    );

    return result.rows.map((row) => ({
      id: row.id,
      code: row.code,
      title: row.title,
      hostOrganization: {
        id: row.host_organization_id,
        name: row.host_organization_name,
        shortName: row.host_organization_short_name,
        ...(row.host_organization_country_code
          ? { countryCode: row.host_organization_country_code }
          : {})
      }
    }));
  }

  private buildCommitteeOrganizations(
    leadership: CommitteePersonRoleRecord[],
    deputyCoChairs: CommitteePersonRoleRecord[],
    secretariat: CommitteePersonRoleRecord[],
    subcommittees: SubcommitteeSummary[],
    secretariatHostOrganization: OrganizationSummary | null
  ): CommitteeOrganizationRecord[] {
    const organizations = new Map<string, CommitteeOrganizationRecord>();
    const personRoles = [...leadership, ...deputyCoChairs, ...secretariat];

    const ensureOrganization = (organization: OrganizationSummary): CommitteeOrganizationRecord => {
      const existing = organizations.get(organization.id);

      if (existing) {
        return existing;
      }

      const created: CommitteeOrganizationRecord = {
        ...organization,
        committeeFunctions: [],
        representedPeople: [],
        hostedSubcommittees: []
      };
      organizations.set(organization.id, created);
      return created;
    };

    for (const assignment of personRoles) {
      const organization = assignment.person.organization;

      if (!organization) {
        continue;
      }

      const target = ensureOrganization(organization);

      if (!target.committeeFunctions.includes(assignment.role.title)) {
        target.committeeFunctions.push(assignment.role.title);
      }

      if (!target.representedPeople.some((person) => person.id === assignment.person.id)) {
        target.representedPeople.push(assignment.person);
      }
    }

    for (const subcommittee of subcommittees) {
      const target = ensureOrganization(subcommittee.hostOrganization);
      target.hostedSubcommittees.push(subcommittee);

      const functionLabel = `Базовая организация ${subcommittee.code}`;

      if (!target.committeeFunctions.includes(functionLabel)) {
        target.committeeFunctions.push(functionLabel);
      }
    }

    if (secretariatHostOrganization) {
      const target = ensureOrganization(secretariatHostOrganization);

      if (!target.committeeFunctions.includes("Ведёт секретариат ТК 182")) {
        target.committeeFunctions.unshift("Ведёт секретариат ТК 182");
      }
    }

    return [...organizations.values()].sort((left, right) =>
      left.name.localeCompare(right.name, "ru")
    );
  }
}
