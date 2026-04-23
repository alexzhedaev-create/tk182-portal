import { randomUUID } from "node:crypto";

import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import type {
  CommitteeBackofficeData,
  CommitteeEditableOrganizationRecord,
  CommitteeEditablePersonRecord,
  CommitteeOrganizationRecord,
  CommitteePersonRoleRecord,
  CommitteeRoleAssignmentRecord,
  CommitteeRoleCategory,
  CommitteeRoleSummary,
  CommitteeStructureResponse,
  CreateCommitteeOrganizationDto,
  CreateCommitteePersonDto,
  CreateCommitteeRoleAssignmentDto,
  CreateSubcommitteeDto,
  OrganizationSummary,
  SubcommitteeSummary,
  UpdateCommitteeOrganizationDto,
  UpdateCommitteePersonDto,
  UpdateCommitteeRoleAssignmentDto,
  UpdateSubcommitteeDto
} from "@tk182/shared-types";

import { DatabaseService } from "../../common/database/database.service";
import { createModuleStubResponse } from "../../common/stub-response";
import { AuditService } from "../audit/audit.service";

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

interface CommitteeOrganizationRow {
  country_code: string | null;
  id: string;
  name: string;
  short_name: string;
}

interface CommitteePersonRow {
  full_name: string;
  id: string;
  job_title: string;
  organization_country_code: string | null;
  organization_id: string | null;
  organization_name: string | null;
  organization_short_name: string | null;
}

interface CommitteeRoleRow {
  category: CommitteeRoleCategory;
  code: string;
  id: string;
  sort_order: number;
  title: string;
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

const SINGLE_HOLDER_ROLE_CODES = new Set([
  "RESPONSIBLE_SECRETARY",
  "ROSSTANDART_REPRESENTATIVE"
]);

@Injectable()
export class CommitteeService {
  constructor(
    @Inject(DatabaseService)
    private readonly databaseService: DatabaseService,
    @Inject(AuditService)
    private readonly auditService: AuditService
  ) {}

  getSummary() {
    return {
      ...createModuleStubResponse(
        "committee",
        ["public", "secretariat"],
        "Комитетная структура ТК 182 хранит руководство, секретариат, подкомитеты и базовые организации.",
        "Следующий шаг: расширить редактирование структуры комитета через секретариатский backoffice."
      ),
      status: "active" as const
    };
  }

  async getStructure(): Promise<CommitteeStructureResponse> {
    const [roleAssignments, subcommittees] = await Promise.all([
      this.listRoleAssignments(),
      this.listSubcommittees()
    ]);

    const leadership = roleAssignments
      .filter((item) => item.role.category === "leadership")
      .map((item) => this.mapAssignmentToStructureRecord(item));
    const deputyCoChairs = roleAssignments
      .filter((item) => item.role.category === "deputy")
      .map((item) => this.mapAssignmentToStructureRecord(item));
    const secretariat = roleAssignments
      .filter((item) => item.role.category === "secretariat")
      .map((item) => this.mapAssignmentToStructureRecord(item));
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

  async getBackofficeData(): Promise<CommitteeBackofficeData> {
    const [structure, organizations, people, roles, roleAssignments, subcommittees] =
      await Promise.all([
        this.getStructure(),
        this.listOrganizations(),
        this.listPeople(),
        this.listRoles(),
        this.listRoleAssignments(),
        this.listSubcommittees()
      ]);

    return {
      structure,
      organizations,
      people,
      roles,
      roleAssignments,
      subcommittees
    };
  }

  async listOrganizations(): Promise<CommitteeEditableOrganizationRecord[]> {
    const result = await this.databaseService.query<CommitteeOrganizationRow>(
      `
        SELECT
          id,
          name,
          short_name,
          country_code
        FROM organizations
        ORDER BY name ASC
      `
    );

    return result.rows.map((row) => this.mapOrganization(row));
  }

  async createOrganization(
    userId: string,
    payload: CreateCommitteeOrganizationDto
  ): Promise<CommitteeEditableOrganizationRecord> {
    const normalized = await this.normalizeOrganizationPayload(payload);
    const organizationId = `organization-${randomUUID()}`;

    try {
      await this.databaseService.query(
        `
          INSERT INTO organizations (
            id,
            name,
            short_name,
            country_code
          )
          VALUES ($1, $2, $3, $4)
        `,
        [
          organizationId,
          normalized.name,
          normalized.shortName,
          normalized.countryCode
        ]
      );
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        throw new BadRequestException(
          "Организация с таким кратким наименованием уже существует."
        );
      }

      throw error;
    }

    const organization = await this.getOrganizationById(organizationId);

    await this.auditService.recordEvent({
      actorUserId: userId,
      actionType: "COMMITTEE_ORGANIZATION_CREATED",
      entityType: "COMMITTEE_ORGANIZATION",
      entityId: organizationId,
      message: `Создана организация «${organization.name}».`,
      metadata: this.buildOrganizationAuditMetadata(organization)
    });

    return organization;
  }

  async updateOrganization(
    userId: string,
    organizationId: string,
    payload: UpdateCommitteeOrganizationDto
  ): Promise<CommitteeEditableOrganizationRecord> {
    const existing = await this.getOrganizationById(organizationId);
    const normalized = await this.normalizeOrganizationPayload(payload, organizationId);

    try {
      await this.databaseService.query(
        `
          UPDATE organizations
          SET
            name = $2,
            short_name = $3,
            country_code = $4,
            updated_at = NOW()
          WHERE id = $1
        `,
        [
          organizationId,
          normalized.name,
          normalized.shortName,
          normalized.countryCode
        ]
      );
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        throw new BadRequestException(
          "Организация с таким кратким наименованием уже существует."
        );
      }

      throw error;
    }

    const updated = await this.getOrganizationById(organizationId);

    if (
      existing.name !== updated.name ||
      existing.shortName !== updated.shortName ||
      existing.countryCode !== updated.countryCode
    ) {
      await this.auditService.recordEvent({
        actorUserId: userId,
        actionType: "COMMITTEE_ORGANIZATION_UPDATED",
        entityType: "COMMITTEE_ORGANIZATION",
        entityId: organizationId,
        message: `Обновлены сведения об организации «${updated.name}».`,
        metadata: {
          ...this.buildOrganizationAuditMetadata(updated),
          previousName: existing.name,
          previousShortName: existing.shortName,
          previousCountryCode: existing.countryCode ?? null
        }
      });
    }

    return updated;
  }

  async listPeople(): Promise<CommitteeEditablePersonRecord[]> {
    const result = await this.databaseService.query<CommitteePersonRow>(
      `
        SELECT
          cp.id,
          cp.full_name,
          cp.job_title,
          o.id AS organization_id,
          o.name AS organization_name,
          o.short_name AS organization_short_name,
          o.country_code AS organization_country_code
        FROM committee_people cp
        LEFT JOIN organizations o ON o.id = cp.organization_id
        ORDER BY cp.full_name ASC
      `
    );

    return result.rows.map((row) => this.mapPerson(row));
  }

  async createPerson(
    userId: string,
    payload: CreateCommitteePersonDto
  ): Promise<CommitteeEditablePersonRecord> {
    const normalized = await this.normalizePersonPayload(payload);
    const personId = `committee-person-${randomUUID()}`;

    await this.databaseService.query(
      `
        INSERT INTO committee_people (
          id,
          full_name,
          job_title,
          organization_id
        )
        VALUES ($1, $2, $3, $4)
      `,
      [
        personId,
        normalized.fullName,
        normalized.jobTitle,
        normalized.organizationId
      ]
    );

    const person = await this.getPersonById(personId);

    await this.auditService.recordEvent({
      actorUserId: userId,
      actionType: "COMMITTEE_PERSON_CREATED",
      entityType: "COMMITTEE_PERSON",
      entityId: personId,
      message: `Создана карточка представителя «${person.fullName}».`,
      metadata: this.buildPersonAuditMetadata(person)
    });

    return person;
  }

  async updatePerson(
    userId: string,
    personId: string,
    payload: UpdateCommitteePersonDto
  ): Promise<CommitteeEditablePersonRecord> {
    const existing = await this.getPersonById(personId);
    const normalized = await this.normalizePersonPayload(payload);

    await this.databaseService.query(
      `
        UPDATE committee_people
        SET
          full_name = $2,
          job_title = $3,
          organization_id = $4,
          updated_at = NOW()
        WHERE id = $1
      `,
      [personId, normalized.fullName, normalized.jobTitle, normalized.organizationId]
    );

    const updated = await this.getPersonById(personId);

    if (
      existing.fullName !== updated.fullName ||
      existing.jobTitle !== updated.jobTitle ||
      existing.organizationId !== updated.organizationId
    ) {
      await this.auditService.recordEvent({
        actorUserId: userId,
        actionType: "COMMITTEE_PERSON_UPDATED",
        entityType: "COMMITTEE_PERSON",
        entityId: personId,
        message: `Обновлены сведения о представителе «${updated.fullName}».`,
        metadata: {
          ...this.buildPersonAuditMetadata(updated),
          previousFullName: existing.fullName,
          previousJobTitle: existing.jobTitle,
          previousOrganizationId: existing.organizationId
        }
      });
    }

    return updated;
  }

  async listRoles(): Promise<CommitteeRoleSummary[]> {
    const result = await this.databaseService.query<CommitteeRoleRow>(
      `
        SELECT
          id,
          code,
          title,
          category,
          sort_order
        FROM committee_roles
        ORDER BY
          CASE category
            WHEN 'leadership' THEN 0
            WHEN 'deputy' THEN 1
            ELSE 2
          END,
          sort_order ASC,
          title ASC
      `
    );

    return result.rows.map((row) => this.mapRole(row));
  }

  async listRoleAssignments(): Promise<CommitteeRoleAssignmentRecord[]> {
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

    return result.rows.map((row) => this.mapRoleAssignment(row));
  }

  async createRoleAssignment(
    userId: string,
    payload: CreateCommitteeRoleAssignmentDto
  ): Promise<CommitteeRoleAssignmentRecord> {
    const normalized = await this.normalizeRoleAssignmentPayload(payload);
    const role = await this.getRoleById(normalized.roleId);
    await this.assertSingleHolderRoleAvailability(role.code);
    const assignmentId = `committee-person-role-${randomUUID()}`;

    try {
      await this.databaseService.query(
        `
          INSERT INTO committee_person_roles (
            id,
            committee_person_id,
            committee_role_id,
            sort_order
          )
          VALUES ($1, $2, $3, $4)
        `,
        [
          assignmentId,
          normalized.personId,
          normalized.roleId,
          normalized.sortOrder
        ]
      );
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        throw new BadRequestException(
          "Такое назначение роли уже существует для выбранного представителя."
        );
      }

      throw error;
    }

    const assignment = await this.getRoleAssignmentById(assignmentId);

    await this.auditService.recordEvent({
      actorUserId: userId,
      actionType: "COMMITTEE_ROLE_ASSIGNMENT_CREATED",
      entityType: "COMMITTEE_ROLE_ASSIGNMENT",
      entityId: assignmentId,
      message: `Представителю «${assignment.person.fullName}» назначена роль «${assignment.role.title}».`,
      metadata: this.buildRoleAssignmentAuditMetadata(assignment)
    });

    return assignment;
  }

  async updateRoleAssignment(
    userId: string,
    assignmentId: string,
    payload: UpdateCommitteeRoleAssignmentDto
  ): Promise<CommitteeRoleAssignmentRecord> {
    const existing = await this.getRoleAssignmentById(assignmentId);
    const normalized = await this.normalizeRoleAssignmentPayload(payload);
    const role = await this.getRoleById(normalized.roleId);
    await this.assertSingleHolderRoleAvailability(role.code, assignmentId);

    try {
      await this.databaseService.query(
        `
          UPDATE committee_person_roles
          SET
            committee_person_id = $2,
            committee_role_id = $3,
            sort_order = $4,
            updated_at = NOW()
          WHERE id = $1
        `,
        [
          assignmentId,
          normalized.personId,
          normalized.roleId,
          normalized.sortOrder
        ]
      );
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        throw new BadRequestException(
          "Такое назначение роли уже существует для выбранного представителя."
        );
      }

      throw error;
    }

    const updated = await this.getRoleAssignmentById(assignmentId);

    if (
      existing.personId !== updated.personId ||
      existing.roleId !== updated.roleId ||
      existing.sortOrder !== updated.sortOrder
    ) {
      await this.auditService.recordEvent({
        actorUserId: userId,
        actionType: "COMMITTEE_ROLE_ASSIGNMENT_UPDATED",
        entityType: "COMMITTEE_ROLE_ASSIGNMENT",
        entityId: assignmentId,
        message: `Обновлено назначение роли «${updated.role.title}» для «${updated.person.fullName}».`,
        metadata: {
          ...this.buildRoleAssignmentAuditMetadata(updated),
          previousPersonId: existing.personId,
          previousRoleId: existing.roleId,
          previousSortOrder: existing.sortOrder
        }
      });
    }

    return updated;
  }

  async listSubcommittees(): Promise<SubcommitteeSummary[]> {
    const rows = await this.listSubcommitteeRows();

    return rows.map((row) => this.mapSubcommittee(row));
  }

  async createSubcommittee(
    userId: string,
    payload: CreateSubcommitteeDto
  ): Promise<SubcommitteeSummary> {
    const normalized = await this.normalizeSubcommitteePayload(payload);
    const subcommitteeId = `subcommittee-${randomUUID()}`;

    try {
      await this.databaseService.query(
        `
          INSERT INTO subcommittees (
            id,
            code,
            title,
            host_organization_id
          )
          VALUES ($1, $2, $3, $4)
        `,
        [
          subcommitteeId,
          normalized.code,
          normalized.title,
          normalized.hostOrganizationId
        ]
      );
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        throw new BadRequestException(
          "Подкомитет с таким кодом уже существует."
        );
      }

      throw error;
    }

    const subcommittee = await this.getSubcommitteeById(subcommitteeId);

    await this.auditService.recordEvent({
      actorUserId: userId,
      actionType: "SUBCOMMITTEE_CREATED",
      entityType: "SUBCOMMITTEE",
      entityId: subcommitteeId,
      message: `Создан подкомитет «${subcommittee.code} — ${subcommittee.title}».`,
      metadata: this.buildSubcommitteeAuditMetadata(subcommittee)
    });

    return subcommittee;
  }

  async updateSubcommittee(
    userId: string,
    subcommitteeId: string,
    payload: UpdateSubcommitteeDto
  ): Promise<SubcommitteeSummary> {
    const existing = await this.getSubcommitteeById(subcommitteeId);
    const normalized = await this.normalizeSubcommitteePayload(payload, subcommitteeId);

    try {
      await this.databaseService.query(
        `
          UPDATE subcommittees
          SET
            code = $2,
            title = $3,
            host_organization_id = $4,
            updated_at = NOW()
          WHERE id = $1
        `,
        [
          subcommitteeId,
          normalized.code,
          normalized.title,
          normalized.hostOrganizationId
        ]
      );
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        throw new BadRequestException(
          "Подкомитет с таким кодом уже существует."
        );
      }

      throw error;
    }

    const updated = await this.getSubcommitteeById(subcommitteeId);

    if (
      existing.code !== updated.code ||
      existing.title !== updated.title ||
      existing.hostOrganization.id !== updated.hostOrganization.id
    ) {
      await this.auditService.recordEvent({
        actorUserId: userId,
        actionType: "SUBCOMMITTEE_UPDATED",
        entityType: "SUBCOMMITTEE",
        entityId: subcommitteeId,
        message: `Обновлены сведения о подкомитете «${updated.code} — ${updated.title}».`,
        metadata: {
          ...this.buildSubcommitteeAuditMetadata(updated),
          previousCode: existing.code,
          previousTitle: existing.title,
          previousHostOrganizationId: existing.hostOrganization.id
        }
      });
    }

    return updated;
  }

  private mapAssignmentToStructureRecord(
    assignment: CommitteeRoleAssignmentRecord
  ): CommitteePersonRoleRecord {
    return {
      id: assignment.id,
      role: assignment.role,
      person: assignment.person,
      sortOrder: assignment.sortOrder
    };
  }

  private async listSubcommitteeRows(): Promise<SubcommitteeRow[]> {
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

    return result.rows;
  }

  private async getOrganizationById(
    organizationId: string
  ): Promise<CommitteeEditableOrganizationRecord> {
    const result = await this.databaseService.query<CommitteeOrganizationRow>(
      `
        SELECT
          id,
          name,
          short_name,
          country_code
        FROM organizations
        WHERE id = $1
        LIMIT 1
      `,
      [organizationId]
    );
    const row = result.rows[0];

    if (!row) {
      throw new NotFoundException("Организация не найдена.");
    }

    return this.mapOrganization(row);
  }

  private async getPersonById(personId: string): Promise<CommitteeEditablePersonRecord> {
    const result = await this.databaseService.query<CommitteePersonRow>(
      `
        SELECT
          cp.id,
          cp.full_name,
          cp.job_title,
          o.id AS organization_id,
          o.name AS organization_name,
          o.short_name AS organization_short_name,
          o.country_code AS organization_country_code
        FROM committee_people cp
        LEFT JOIN organizations o ON o.id = cp.organization_id
        WHERE cp.id = $1
        LIMIT 1
      `,
      [personId]
    );
    const row = result.rows[0];

    if (!row) {
      throw new NotFoundException("Представитель не найден.");
    }

    return this.mapPerson(row);
  }

  private async getRoleById(roleId: string): Promise<CommitteeRoleSummary> {
    const result = await this.databaseService.query<CommitteeRoleRow>(
      `
        SELECT
          id,
          code,
          title,
          category,
          sort_order
        FROM committee_roles
        WHERE id = $1
        LIMIT 1
      `,
      [roleId]
    );
    const row = result.rows[0];

    if (!row) {
      throw new NotFoundException("Комитетная роль не найдена.");
    }

    return this.mapRole(row);
  }

  private async getRoleAssignmentById(
    assignmentId: string
  ): Promise<CommitteeRoleAssignmentRecord> {
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
        WHERE cpr.id = $1
        LIMIT 1
      `,
      [assignmentId]
    );
    const row = result.rows[0];

    if (!row) {
      throw new NotFoundException("Назначение роли не найдено.");
    }

    return this.mapRoleAssignment(row);
  }

  private async getSubcommitteeById(
    subcommitteeId: string
  ): Promise<SubcommitteeSummary> {
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
        WHERE sc.id = $1
        LIMIT 1
      `,
      [subcommitteeId]
    );
    const row = result.rows[0];

    if (!row) {
      throw new NotFoundException("Подкомитет не найден.");
    }

    return this.mapSubcommittee(row);
  }

  private async normalizeOrganizationPayload(
    payload: CreateCommitteeOrganizationDto | UpdateCommitteeOrganizationDto,
    organizationId?: string
  ): Promise<{
    countryCode: string | null;
    name: string;
    shortName: string;
  }> {
    const name = payload.name.trim();
    const shortName = payload.shortName.trim();
    const countryCode = this.normalizeOptionalText(payload.countryCode)?.toUpperCase() ?? null;

    if (!name || !shortName) {
      throw new BadRequestException(
        "Заполните полное и краткое наименование организации."
      );
    }

    await this.assertOrganizationNameAvailability(name, shortName, organizationId);

    return {
      name,
      shortName,
      countryCode
    };
  }

  private async normalizePersonPayload(
    payload: CreateCommitteePersonDto | UpdateCommitteePersonDto
  ): Promise<{
    fullName: string;
    jobTitle: string;
    organizationId: string | null;
  }> {
    const fullName = payload.fullName.trim();
    const jobTitle = payload.jobTitle.trim();
    const organizationId = this.normalizeOptionalText(payload.organizationId);

    if (!fullName || !jobTitle) {
      throw new BadRequestException(
        "Заполните ФИО и должность представителя."
      );
    }

    if (organizationId) {
      await this.getOrganizationById(organizationId);
    }

    return {
      fullName,
      jobTitle,
      organizationId
    };
  }

  private async normalizeSubcommitteePayload(
    payload: CreateSubcommitteeDto | UpdateSubcommitteeDto,
    subcommitteeId?: string
  ): Promise<{
    code: string;
    hostOrganizationId: string;
    title: string;
  }> {
    const code = payload.code.trim();
    const title = payload.title.trim();
    const hostOrganizationId = payload.hostOrganizationId.trim();

    if (!code || !title || !hostOrganizationId) {
      throw new BadRequestException(
        "Заполните код, название и базовую организацию подкомитета."
      );
    }

    await this.getOrganizationById(hostOrganizationId);
    await this.assertSubcommitteeCodeAvailability(code, subcommitteeId);

    return {
      code,
      title,
      hostOrganizationId
    };
  }

  private async normalizeRoleAssignmentPayload(
    payload: CreateCommitteeRoleAssignmentDto | UpdateCommitteeRoleAssignmentDto
  ): Promise<{
    personId: string;
    roleId: string;
    sortOrder: number;
  }> {
    const personId = payload.personId.trim();
    const roleId = payload.roleId.trim();
    const sortOrder = Number(payload.sortOrder);

    if (!personId || !roleId || !Number.isFinite(sortOrder) || sortOrder < 0) {
      throw new BadRequestException(
        "Заполните представителя, роль и корректный порядок отображения."
      );
    }

    await this.getPersonById(personId);
    await this.getRoleById(roleId);

    return {
      personId,
      roleId,
      sortOrder
    };
  }

  private async assertOrganizationNameAvailability(
    name: string,
    shortName: string,
    organizationId?: string
  ): Promise<void> {
    const values: string[] = [name.toLowerCase(), shortName.toLowerCase()];
    const exclusion = organizationId ? `AND id <> $3` : "";

    if (organizationId) {
      values.push(organizationId);
    }

    const result = await this.databaseService.query<CommitteeOrganizationRow>(
      `
        SELECT
          id,
          name,
          short_name,
          country_code
        FROM organizations
        WHERE (
          LOWER(name) = $1
          OR LOWER(short_name) = $2
        )
        ${exclusion}
        LIMIT 1
      `,
      values
    );

    const existing = result.rows[0];

    if (!existing) {
      return;
    }

    if (existing.name.toLowerCase() === name.toLowerCase()) {
      throw new BadRequestException(
        "Организация с таким полным наименованием уже существует."
      );
    }

    throw new BadRequestException(
      "Организация с таким кратким наименованием уже существует."
    );
  }

  private async assertSubcommitteeCodeAvailability(
    code: string,
    subcommitteeId?: string
  ): Promise<void> {
    const values: string[] = [code.toLowerCase()];
    const exclusion = subcommitteeId ? `AND id <> $2` : "";

    if (subcommitteeId) {
      values.push(subcommitteeId);
    }

    const result = await this.databaseService.query<{ id: string }>(
      `
        SELECT id
        FROM subcommittees
        WHERE LOWER(code) = $1
        ${exclusion}
        LIMIT 1
      `,
      values
    );

    if (result.rows[0]) {
      throw new BadRequestException(
        "Подкомитет с таким кодом уже существует."
      );
    }
  }

  private async assertSingleHolderRoleAvailability(
    roleCode: string,
    assignmentId?: string
  ): Promise<void> {
    if (!SINGLE_HOLDER_ROLE_CODES.has(roleCode)) {
      return;
    }

    const values: string[] = [roleCode];
    const exclusion = assignmentId ? `AND cpr.id <> $2` : "";

    if (assignmentId) {
      values.push(assignmentId);
    }

    const result = await this.databaseService.query<{ id: string }>(
      `
        SELECT cpr.id
        FROM committee_person_roles cpr
        INNER JOIN committee_roles cr ON cr.id = cpr.committee_role_id
        WHERE cr.code = $1
        ${exclusion}
        LIMIT 1
      `,
      values
    );

    if (result.rows[0]) {
      throw new BadRequestException(
        "Эта роль уже назначена другому представителю. Сначала обновите существующее назначение."
      );
    }
  }

  private mapOrganization(
    row: CommitteeOrganizationRow
  ): CommitteeEditableOrganizationRecord {
    return {
      id: row.id,
      name: row.name,
      shortName: row.short_name,
      ...(row.country_code ? { countryCode: row.country_code } : {})
    };
  }

  private mapPerson(row: CommitteePersonRow): CommitteeEditablePersonRecord {
    return {
      id: row.id,
      fullName: row.full_name,
      jobTitle: row.job_title,
      organizationId: row.organization_id,
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
    };
  }

  private mapRole(row: CommitteeRoleRow): CommitteeRoleSummary {
    return {
      id: row.id,
      code: row.code,
      title: row.title,
      category: row.category
    };
  }

  private mapRoleAssignment(
    row: CommitteePersonRoleRow
  ): CommitteeRoleAssignmentRecord {
    return {
      id: row.assignment_id,
      personId: row.person_id,
      roleId: row.role_id,
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
    };
  }

  private mapSubcommittee(row: SubcommitteeRow): SubcommitteeSummary {
    return {
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
    };
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

    const ensureOrganization = (
      organization: OrganizationSummary
    ): CommitteeOrganizationRecord => {
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

  private buildOrganizationAuditMetadata(
    organization: CommitteeEditableOrganizationRecord
  ): Record<string, unknown> {
    return {
      name: organization.name,
      shortName: organization.shortName,
      countryCode: organization.countryCode ?? null
    };
  }

  private buildPersonAuditMetadata(
    person: CommitteeEditablePersonRecord
  ): Record<string, unknown> {
    return {
      fullName: person.fullName,
      jobTitle: person.jobTitle,
      organizationId: person.organizationId,
      organizationName: person.organization?.name ?? null
    };
  }

  private buildRoleAssignmentAuditMetadata(
    assignment: CommitteeRoleAssignmentRecord
  ): Record<string, unknown> {
    return {
      personId: assignment.personId,
      personFullName: assignment.person.fullName,
      roleId: assignment.roleId,
      roleCode: assignment.role.code,
      roleTitle: assignment.role.title,
      sortOrder: assignment.sortOrder
    };
  }

  private buildSubcommitteeAuditMetadata(
    subcommittee: SubcommitteeSummary
  ): Record<string, unknown> {
    return {
      code: subcommittee.code,
      title: subcommittee.title,
      hostOrganizationId: subcommittee.hostOrganization.id,
      hostOrganizationName: subcommittee.hostOrganization.name
    };
  }

  private normalizeOptionalText(value: string | null | undefined): string | null {
    const trimmed = value?.trim();

    return trimmed ? trimmed : null;
  }

  private isUniqueViolation(error: unknown): boolean {
    return (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "23505"
    );
  }
}
