import { randomUUID } from "node:crypto";

import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import type {
  AssignReviewParticipantDto,
  CreateDraftStandardDto,
  CreateDraftStandardVersionDto,
  CreateReviewCycleDto,
  CreateVersionFileDto,
  CreateReviewCommentDto,
  MutationResponseDto,
  NotificationType,
  ParticipantAssignedReviewCycle,
  ParticipantDraftStandardCard,
  ParticipantPositionRecord,
  ParticipantPositionValue,
  ReviewAttachmentSummary,
  ReviewCommentRecord,
  ReviewCommentStatus,
  ReviewFileVisibility,
  SecretariatCycleDetail,
  SecretariatDraftStandardDetail,
  SecretariatDraftStandardListItem,
  SecretariatDraftStandardRecord,
  SecretariatDraftStandardVersionRecord,
  SecretariatParticipantResponse,
  SecretariatReviewAssignmentRecord,
  SecretariatReviewCycleListItem,
  SubcommitteeSummary,
  SubmitParticipantPositionDto,
  UpdateDraftStandardDto,
  UpdateReviewCycleDto,
  UpdateVersionFileDto,
  UpdateReviewCommentDto,
  UpdateReviewCommentStatusDto
} from "@tk182/shared-types";

import { DatabaseService } from "../../common/database/database.service";
import { buildDownloadContentDisposition } from "../../common/storage/local-file-storage";
import { createModuleStubResponse } from "../../common/stub-response";
import {
  ApprovalFileStorageService,
  type UploadedBinaryFile
} from "./approval-file-storage.service";
import { AuditService } from "../audit/audit.service";
import { NotificationsService } from "../notifications/notifications.service";

interface ParticipantCycleRow {
  assignment_id: string;
  cycle_deadline_at: string;
  cycle_description: string;
  cycle_id: string;
  cycle_opened_at: string;
  cycle_status: "draft" | "open" | "closed";
  cycle_title: string;
  draft_standard_code: string;
  draft_standard_id: string;
  draft_standard_responsible_subcommittee_code: string | null;
  draft_standard_responsible_subcommittee_host_country_code: string | null;
  draft_standard_responsible_subcommittee_host_id: string | null;
  draft_standard_responsible_subcommittee_host_name: string | null;
  draft_standard_responsible_subcommittee_host_short_name: string | null;
  draft_standard_responsible_subcommittee_id: string | null;
  draft_standard_responsible_subcommittee_title: string | null;
  draft_standard_stage: string;
  draft_standard_summary: string;
  draft_standard_title: string;
  version_file_name: string;
  version_file_note: string;
  version_id: string;
  version_label: string;
  version_published_at: string;
  version_revision_summary: string;
}

interface CommentRow {
  author_display_name: string;
  comment_id: string;
  created_at: string;
  cycle_deadline_at: string;
  cycle_status: "draft" | "open" | "closed";
  organization_name: string | null;
  page_ref: string | null;
  point_ref: string | null;
  position_submitted: boolean;
  proposed_text: string;
  rationale: string;
  remark: string;
  review_status: ReviewCommentStatus;
  secretariat_response: string | null;
  section_ref: string;
  updated_at: string;
}

interface CommentMutationRow {
  cycle_deadline_at: string;
  cycle_status: "draft" | "open" | "closed";
  draft_standard_id: string;
  page_ref: string | null;
  point_ref: string | null;
  position_submitted: boolean;
  proposed_text: string;
  rationale: string;
  remark: string;
  review_assignment_id: string;
  review_cycle_id: string;
  review_status: ReviewCommentStatus;
  secretariat_response: string | null;
  section_ref: string;
}

interface ParticipantPositionRow {
  id: string;
  note: string | null;
  position: ParticipantPositionValue;
  submitted_at: string;
  submitted_by_name: string;
}

interface SecretariatCycleRow {
  closed_at: string | null;
  cycle_deadline_at: string;
  cycle_id: string;
  cycle_opened_at: string;
  cycle_status: "draft" | "open" | "closed";
  cycle_title: string;
  draft_standard_code: string;
  draft_standard_id: string;
  draft_standard_responsible_subcommittee_code: string | null;
  draft_standard_responsible_subcommittee_host_country_code: string | null;
  draft_standard_responsible_subcommittee_host_id: string | null;
  draft_standard_responsible_subcommittee_host_name: string | null;
  draft_standard_responsible_subcommittee_host_short_name: string | null;
  draft_standard_responsible_subcommittee_id: string | null;
  draft_standard_responsible_subcommittee_title: string | null;
  draft_standard_stage: string;
  draft_standard_summary: string;
  draft_standard_title: string;
  responded_participants: string;
  total_participants: string;
  version_file_name: string;
  version_file_note: string;
  version_id: string;
  version_label: string;
  version_published_at: string;
  version_revision_summary: string;
}

interface SecretariatParticipantRow {
  assignment_id: string;
  organization_id: string;
  organization_name: string;
  organization_short_name: string;
  participant_display_name: string;
  participant_user_id: string;
  position_id: string | null;
  position_note: string | null;
  position_submitted_at: string | null;
  position_submitted_by_name: string | null;
  position_value: ParticipantPositionValue | null;
  responded_at: string | null;
}

interface ParticipantAssignmentContext {
  assignmentId: string;
  cycleDeadlineAt: Date;
  cycleId: string;
  cycleStatus: "draft" | "open" | "closed";
  draftStandardId: string;
}

interface VersionFileRow {
  description: string | null;
  id: string;
  mime_type: string;
  original_name: string;
  size_bytes: string;
  stored_name: string;
  uploaded_at: string;
  uploaded_by_display_name: string | null;
  version_id: string;
  visibility: ReviewFileVisibility;
}

interface DraftStandardVersionLookupRow {
  draft_standard_id: string;
  id: string;
}

interface VersionAuditContextRow {
  draft_standard_id: string;
  review_cycle_id: string | null;
}

interface SecretariatCommentMutationRow {
  author_user_id: string;
  draft_standard_id: string;
  page_ref: string | null;
  point_ref: string | null;
  review_cycle_id: string;
  review_status: ReviewCommentStatus;
  secretariat_response: string | null;
  section_ref: string;
}

interface VersionNotificationRecipientRow {
  draft_standard_id: string;
  review_cycle_id: string;
  user_id: string;
}

interface VersionFileDownloadPayload {
  contentDisposition: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  streamPath: string;
}

interface DraftStandardListRow {
  active_cycles_count: string;
  code: string;
  created_at: string;
  cycles_count: string;
  id: string;
  latest_version_label: string | null;
  responsible_subcommittee_code: string | null;
  responsible_subcommittee_host_country_code: string | null;
  responsible_subcommittee_host_id: string | null;
  responsible_subcommittee_host_name: string | null;
  responsible_subcommittee_host_short_name: string | null;
  responsible_subcommittee_id: string | null;
  responsible_subcommittee_title: string | null;
  stage: string;
  summary: string;
  title: string;
  updated_at: string;
  versions_count: string;
}

interface DraftStandardRow {
  code: string;
  created_at: string;
  id: string;
  responsible_subcommittee_code: string | null;
  responsible_subcommittee_host_country_code: string | null;
  responsible_subcommittee_host_id: string | null;
  responsible_subcommittee_host_name: string | null;
  responsible_subcommittee_host_short_name: string | null;
  responsible_subcommittee_id: string | null;
  responsible_subcommittee_title: string | null;
  stage: string;
  summary: string;
  title: string;
  updated_at: string;
}

interface DraftStandardVersionRow {
  attachments_count: string;
  draft_standard_id: string;
  file_name: string;
  file_note: string;
  id: string;
  published_at: string;
  revision_summary: string;
  version_label: string;
}

interface ReviewCycleManagementRow {
  created_by_user_id: string | null;
  deadline_at: string;
  description: string;
  draft_standard_id: string;
  draft_standard_version_id: string;
  id: string;
  opens_at: string;
  status: "draft" | "open" | "closed";
  title: string;
}

interface ReviewAssignmentRow {
  assigned_at: string;
  id: string;
  organization_id: string;
  organization_name: string;
  organization_short_name: string;
  responded_at: string | null;
  user_display_name: string;
  user_email: string;
  user_id: string;
}

interface AssignableParticipantRow {
  organization_id: string | null;
  organization_name: string | null;
  organization_short_name: string | null;
  role: "ADMIN" | "SECRETARIAT" | "PARTICIPANT";
  user_display_name: string;
  user_email: string;
  user_id: string;
}

interface CycleNotificationRecipientRow {
  cycle_deadline_at: string;
  cycle_id: string;
  cycle_title: string;
  draft_standard_id: string;
  draft_standard_title: string;
  user_id: string;
}

const REVIEW_COMMENT_STATUSES: readonly ReviewCommentStatus[] = [
  "RECEIVED",
  "IN_REVIEW",
  "ACCEPTED",
  "PARTIALLY_ACCEPTED",
  "REJECTED",
  "NEEDS_CLARIFICATION"
];

const PARTICIPANT_POSITION_VALUES: readonly ParticipantPositionValue[] = [
  "AGREED",
  "AGREED_WITH_COMMENTS",
  "NOT_AGREED"
];

const REVIEW_FILE_VISIBILITIES: readonly ReviewFileVisibility[] = [
  "ASSIGNED_PARTICIPANTS",
  "SECRETARIAT_ONLY"
];

@Injectable()
export class ApprovalService {
  constructor(
    @Inject(DatabaseService)
    private readonly databaseService: DatabaseService,
    @Inject(ApprovalFileStorageService)
    private readonly approvalFileStorageService: ApprovalFileStorageService,
    @Inject(AuditService)
    private readonly auditService: AuditService,
    @Inject(NotificationsService)
    private readonly notificationsService: NotificationsService
  ) {}

  getSummary() {
    return {
      ...createModuleStubResponse(
        "approval",
        ["participant", "secretariat"],
        "Review workflow endpoints now serve active cycles, comments, positions, file attachments, and secretariat review responses.",
        "Expand the current MVP into audit history, richer publication transitions, and broader document lifecycles."
      ),
      status: "active" as const
    };
  }

  async listSecretariatDraftStandards(): Promise<SecretariatDraftStandardListItem[]> {
    const result = await this.databaseService.query<DraftStandardListRow>(
      `
        SELECT
          ds.id,
          ds.code,
          ds.title,
          ds.summary,
          ds.stage,
          sc.id AS responsible_subcommittee_id,
          sc.code AS responsible_subcommittee_code,
          sc.title AS responsible_subcommittee_title,
          host.id AS responsible_subcommittee_host_id,
          host.name AS responsible_subcommittee_host_name,
          host.short_name AS responsible_subcommittee_host_short_name,
          host.country_code AS responsible_subcommittee_host_country_code,
          ds.created_at,
          ds.updated_at,
          (
            SELECT COUNT(*)::text
            FROM draft_standard_versions dsv
            WHERE dsv.draft_standard_id = ds.id
          ) AS versions_count,
          (
            SELECT COUNT(*)::text
            FROM review_cycles rc
            WHERE rc.draft_standard_id = ds.id
          ) AS cycles_count,
          (
            SELECT COUNT(*)::text
            FROM review_cycles rc
            WHERE rc.draft_standard_id = ds.id
              AND rc.status = 'open'
          ) AS active_cycles_count,
          (
            SELECT dsv.version_label
            FROM draft_standard_versions dsv
            WHERE dsv.draft_standard_id = ds.id
            ORDER BY dsv.published_at DESC, dsv.created_at DESC
            LIMIT 1
          ) AS latest_version_label
        FROM draft_standards ds
        LEFT JOIN subcommittees sc ON sc.id = ds.responsible_subcommittee_id
        LEFT JOIN organizations host ON host.id = sc.host_organization_id
        ORDER BY ds.updated_at DESC, ds.code ASC
      `
    );

    return result.rows.map((row) => ({
      draftStandard: this.mapDraftStandard(row),
      versionsCount: Number.parseInt(row.versions_count, 10),
      cyclesCount: Number.parseInt(row.cycles_count, 10),
      activeCyclesCount: Number.parseInt(row.active_cycles_count, 10),
      latestVersionLabel: row.latest_version_label
    }));
  }

  async createSecretariatDraftStandard(
    userId: string,
    payload: CreateDraftStandardDto
  ): Promise<SecretariatDraftStandardDetail> {
    const normalized = this.normalizeDraftStandardPayload(payload);
    await this.assertSubcommitteeExists(normalized.responsibleSubcommitteeId);
    const draftStandardId = `draft-standard-${randomUUID()}`;

    try {
      await this.databaseService.query(
        `
          INSERT INTO draft_standards (
            id,
            code,
            title,
            summary,
            stage,
            responsible_subcommittee_id
          )
          VALUES ($1, $2, $3, $4, $5, $6)
        `,
        [
          draftStandardId,
          normalized.code,
          normalized.title,
          normalized.summary,
          normalized.stage,
          normalized.responsibleSubcommitteeId
        ]
      );
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        throw new BadRequestException(
          "Проект стандарта с таким кодом уже существует."
        );
      }

      throw error;
    }

    const createdDraftStandard = await this.getDraftStandardRowById(draftStandardId);

    await this.auditService.recordEvent({
      actorUserId: userId,
      actionType: "DRAFT_STANDARD_CREATED",
      entityType: "DRAFT_STANDARD",
      entityId: draftStandardId,
      relatedDraftStandardId: draftStandardId,
      message: `Создан проект стандарта «${createdDraftStandard.title}».`,
      metadata: this.buildDraftStandardAuditMetadata(createdDraftStandard)
    });

    return this.getSecretariatDraftStandardDetail(draftStandardId);
  }

  async getSecretariatDraftStandardDetail(
    draftStandardId: string
  ): Promise<SecretariatDraftStandardDetail> {
    const draftStandard = this.mapDraftStandard(
      await this.getDraftStandardRowById(draftStandardId)
    );
    const [versions, cycles] = await Promise.all([
      this.listSecretariatDraftStandardVersions(draftStandardId),
      this.listSecretariatReviewCyclesByDraftStandard(draftStandardId)
    ]);

    return {
      draftStandard,
      versions,
      cycles
    };
  }

  async updateSecretariatDraftStandard(
    userId: string,
    draftStandardId: string,
    payload: UpdateDraftStandardDto
  ): Promise<SecretariatDraftStandardDetail> {
    const existing = await this.getDraftStandardRowById(draftStandardId);
    const normalized = this.normalizeDraftStandardPayload(payload);
    await this.assertSubcommitteeExists(normalized.responsibleSubcommitteeId);

    try {
      await this.databaseService.query(
        `
          UPDATE draft_standards
          SET
            code = $2,
            title = $3,
            summary = $4,
            stage = $5,
            responsible_subcommittee_id = $6,
            updated_at = NOW()
          WHERE id = $1
        `,
        [
          draftStandardId,
          normalized.code,
          normalized.title,
          normalized.summary,
          normalized.stage,
          normalized.responsibleSubcommitteeId
        ]
      );
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        throw new BadRequestException(
          "Проект стандарта с таким кодом уже существует."
        );
      }

      throw error;
    }

    const updated = await this.getDraftStandardRowById(draftStandardId);

    if (
      existing.code !== updated.code ||
      existing.title !== updated.title ||
      existing.summary !== updated.summary ||
      existing.stage !== updated.stage ||
      existing.responsible_subcommittee_id !== updated.responsible_subcommittee_id
    ) {
      await this.auditService.recordEvent({
        actorUserId: userId,
        actionType: "DRAFT_STANDARD_UPDATED",
        entityType: "DRAFT_STANDARD",
        entityId: draftStandardId,
        relatedDraftStandardId: draftStandardId,
        message: `Обновлены сведения о проекте стандарта «${updated.title}».`,
        metadata: {
          ...this.buildDraftStandardAuditMetadata(updated),
          previousCode: existing.code,
          previousTitle: existing.title,
          previousSummary: existing.summary,
          previousStage: existing.stage,
          previousResponsibleSubcommitteeId: existing.responsible_subcommittee_id
        }
      });
    }

    return this.getSecretariatDraftStandardDetail(draftStandardId);
  }

  async listSecretariatDraftStandardVersions(
    draftStandardId: string
  ): Promise<SecretariatDraftStandardVersionRecord[]> {
    await this.getDraftStandardRowById(draftStandardId);

    const result = await this.databaseService.query<DraftStandardVersionRow>(
      `
        SELECT
          dsv.id,
          dsv.draft_standard_id,
          dsv.version_label,
          dsv.revision_summary,
          dsv.file_name,
          dsv.file_note,
          dsv.published_at,
          COUNT(vf.id)::text AS attachments_count
        FROM draft_standard_versions dsv
        LEFT JOIN draft_standard_version_files vf ON vf.version_id = dsv.id
        WHERE dsv.draft_standard_id = $1
        GROUP BY dsv.id
        ORDER BY dsv.published_at DESC, dsv.created_at DESC
      `,
      [draftStandardId]
    );

    return result.rows.map((row) => this.mapDraftStandardVersion(row));
  }

  async createSecretariatDraftStandardVersion(
    userId: string,
    draftStandardId: string,
    payload: CreateDraftStandardVersionDto
  ): Promise<SecretariatDraftStandardVersionRecord> {
    const draftStandard = await this.getDraftStandardRowById(draftStandardId);
    const normalized = this.normalizeDraftStandardVersionPayload(payload);
    const versionId = `draft-standard-version-${randomUUID()}`;

    await this.databaseService.query(
      `
        INSERT INTO draft_standard_versions (
          id,
          draft_standard_id,
          version_label,
          revision_summary,
          file_name,
          file_note,
          published_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `,
      [
        versionId,
        draftStandardId,
        normalized.versionLabel,
        normalized.revisionSummary,
        normalized.fileName,
        normalized.fileNote,
        normalized.publishedAt.toISOString()
      ]
    );

    const createdVersion = await this.getDraftStandardVersionRecord(versionId);

    await this.auditService.recordEvent({
      actorUserId: userId,
      actionType: "VERSION_CREATED",
      entityType: "DRAFT_STANDARD_VERSION",
      entityId: versionId,
      relatedDraftStandardId: draftStandardId,
      message: `Создана версия «${createdVersion.versionLabel}» для проекта стандарта «${draftStandard.title}».`,
      metadata: this.buildDraftStandardVersionAuditMetadata(createdVersion)
    });

    return createdVersion;
  }

  async createSecretariatReviewCycle(
    userId: string,
    draftStandardId: string,
    payload: CreateReviewCycleDto
  ): Promise<SecretariatCycleDetail> {
    const draftStandard = await this.getDraftStandardRowById(draftStandardId);
    const normalized = await this.normalizeReviewCyclePayload(
      draftStandardId,
      payload
    );
    const cycleId = `review-cycle-${randomUUID()}`;

    await this.databaseService.query(
      `
        INSERT INTO review_cycles (
          id,
          draft_standard_id,
          draft_standard_version_id,
          title,
          description,
          status,
          opens_at,
          deadline_at,
          created_by_user_id
        )
        VALUES ($1, $2, $3, $4, $5, 'draft', $6, $7, $8)
      `,
      [
        cycleId,
        draftStandardId,
        normalized.draftStandardVersionId,
        normalized.title,
        normalized.description,
        normalized.opensAt.toISOString(),
        normalized.deadlineAt.toISOString(),
        userId
      ]
    );

    const createdCycle = await this.getReviewCycleManagementRow(cycleId);

    await this.auditService.recordEvent({
      actorUserId: userId,
      actionType: "REVIEW_CYCLE_CREATED",
      entityType: "REVIEW_CYCLE",
      entityId: cycleId,
      relatedCycleId: cycleId,
      relatedDraftStandardId: draftStandardId,
      message: `Создан цикл согласования «${createdCycle.title}» для проекта стандарта «${draftStandard.title}».`,
      metadata: this.buildReviewCycleAuditMetadata(createdCycle)
    });

    return this.getSecretariatCycleDetail(cycleId);
  }

  async updateSecretariatReviewCycle(
    userId: string,
    cycleId: string,
    payload: UpdateReviewCycleDto
  ): Promise<SecretariatCycleDetail> {
    const existing = await this.getReviewCycleManagementRow(cycleId);

    if (existing.status === "closed") {
      throw new ForbiddenException(
        "Закрытый цикл нельзя редактировать. Создайте новый цикл при необходимости."
      );
    }

    const normalized = await this.normalizeReviewCyclePayload(
      existing.draft_standard_id,
      payload,
      existing.draft_standard_version_id
    );

    await this.databaseService.query(
      `
        UPDATE review_cycles
        SET
          draft_standard_version_id = $2,
          title = $3,
          description = $4,
          opens_at = $5,
          deadline_at = $6,
          updated_at = NOW()
        WHERE id = $1
      `,
      [
        cycleId,
        normalized.draftStandardVersionId,
        normalized.title,
        normalized.description,
        normalized.opensAt.toISOString(),
        normalized.deadlineAt.toISOString()
      ]
    );

    const updated = await this.getReviewCycleManagementRow(cycleId);

    if (
      existing.draft_standard_version_id !== updated.draft_standard_version_id ||
      existing.title !== updated.title ||
      existing.description !== updated.description ||
      existing.opens_at !== updated.opens_at ||
      existing.deadline_at !== updated.deadline_at
    ) {
      await this.auditService.recordEvent({
        actorUserId: userId,
        actionType: "REVIEW_CYCLE_UPDATED",
        entityType: "REVIEW_CYCLE",
        entityId: cycleId,
        relatedCycleId: cycleId,
        relatedDraftStandardId: existing.draft_standard_id,
        message: `Обновлены параметры цикла согласования «${updated.title}».`,
        metadata: {
          ...this.buildReviewCycleAuditMetadata(updated),
          previousDraftStandardVersionId: existing.draft_standard_version_id,
          previousTitle: existing.title,
          previousDescription: existing.description,
          previousOpensAt: new Date(existing.opens_at).toISOString(),
          previousDeadlineAt: new Date(existing.deadline_at).toISOString()
        }
      });
    }

    return this.getSecretariatCycleDetail(cycleId);
  }

  async listSecretariatCycleAssignments(
    cycleId: string
  ): Promise<SecretariatReviewAssignmentRecord[]> {
    await this.getReviewCycleManagementRow(cycleId);

    const result = await this.databaseService.query<ReviewAssignmentRow>(
      `
        SELECT
          ra.id,
          ra.assigned_at,
          ra.responded_at,
          o.id AS organization_id,
          o.name AS organization_name,
          o.short_name AS organization_short_name,
          u.id AS user_id,
          u.display_name AS user_display_name,
          u.email AS user_email
        FROM review_assignments ra
        INNER JOIN organizations o ON o.id = ra.organization_id
        INNER JOIN users u ON u.id = ra.user_id
        WHERE ra.review_cycle_id = $1
        ORDER BY o.name ASC, u.display_name ASC
      `,
      [cycleId]
    );

    return result.rows.map((row) => this.mapReviewAssignment(row));
  }

  async assignParticipantToCycle(
    userId: string,
    cycleId: string,
    payload: AssignReviewParticipantDto
  ): Promise<SecretariatReviewAssignmentRecord> {
    const cycle = await this.getReviewCycleManagementRow(cycleId);

    if (cycle.status === "closed") {
      throw new ForbiddenException(
        "Нельзя назначить участника на закрытый цикл согласования."
      );
    }

    const participant = await this.getAssignableParticipant(payload.userId);
    const organizationId = this.normalizeAssignmentOrganization(
      payload.organizationId,
      participant.organization_id
    );
    const assignmentId = `review-assignment-${randomUUID()}`;

    try {
      await this.databaseService.query(
        `
          INSERT INTO review_assignments (
            id,
            review_cycle_id,
            organization_id,
            user_id
          )
          VALUES ($1, $2, $3, $4)
        `,
        [assignmentId, cycleId, organizationId, participant.user_id]
      );
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        throw new BadRequestException(
          "Этот участник уже назначен на выбранный цикл согласования."
        );
      }

      throw error;
    }

    const assignment = await this.getReviewAssignmentById(assignmentId);

    await this.auditService.recordEvent({
      actorUserId: userId,
      actionType: "REVIEW_ASSIGNMENT_CREATED",
      entityType: "REVIEW_ASSIGNMENT",
      entityId: assignmentId,
      relatedCycleId: cycleId,
      relatedDraftStandardId: cycle.draft_standard_id,
      message: `Участник «${assignment.userDisplayName}» назначен на цикл «${cycle.title}».`,
      metadata: this.buildReviewAssignmentAuditMetadata(assignment)
    });

    if (cycle.status === "open") {
      await this.notificationsService.createNotification({
        recipientUserId: assignment.userId,
        type: "ASSIGNED_TO_ACTIVE_CYCLE",
        title: "Вы назначены на активный цикл согласования",
        message: `Вам назначен цикл «${cycle.title}». Срок ответа — ${this.formatDateLabel(
          cycle.deadline_at
        )}.`,
        relatedCycleId: cycle.id,
        relatedDraftStandardId: cycle.draft_standard_id,
        targetRoute: this.buildParticipantCycleRoute(
          cycle.id,
          cycle.draft_standard_id
        )
      });
    }

    return assignment;
  }

  async activateSecretariatReviewCycle(
    userId: string,
    cycleId: string
  ): Promise<SecretariatCycleDetail> {
    const cycle = await this.getReviewCycleManagementRow(cycleId);

    if (cycle.status === "closed") {
      throw new ForbiddenException(
        "Закрытый цикл нельзя повторно открыть в MVP. Создайте новый цикл."
      );
    }

    if (cycle.status === "open") {
      return this.getSecretariatCycleDetail(cycleId);
    }

    const assignments = await this.listSecretariatCycleAssignments(cycleId);

    if (assignments.length < 1) {
      throw new BadRequestException(
        "Нельзя открыть цикл без хотя бы одного назначенного участника."
      );
    }

    await this.databaseService.query(
      `
        UPDATE review_cycles
        SET
          status = 'open',
          closed_at = NULL,
          updated_at = NOW()
        WHERE id = $1
      `,
      [cycleId]
    );

    await this.auditService.recordEvent({
      actorUserId: userId,
      actionType: "REVIEW_CYCLE_ACTIVATED",
      entityType: "REVIEW_CYCLE",
      entityId: cycleId,
      relatedCycleId: cycleId,
      relatedDraftStandardId: cycle.draft_standard_id,
      message: `Цикл согласования «${cycle.title}» открыт для участников.`,
      metadata: this.buildReviewCycleAuditMetadata({
        ...cycle,
        status: "open"
      })
    });

    await this.createCycleAssignmentNotifications(cycleId);

    return this.getSecretariatCycleDetail(cycleId);
  }

  async closeSecretariatReviewCycle(
    userId: string,
    cycleId: string
  ): Promise<SecretariatCycleDetail> {
    const cycle = await this.getReviewCycleManagementRow(cycleId);

    if (cycle.status === "closed") {
      return this.getSecretariatCycleDetail(cycleId);
    }

    await this.databaseService.query(
      `
        UPDATE review_cycles
        SET
          status = 'closed',
          closed_at = NOW(),
          updated_at = NOW()
        WHERE id = $1
      `,
      [cycleId]
    );

    await this.auditService.recordEvent({
      actorUserId: userId,
      actionType: "REVIEW_CYCLE_CLOSED",
      entityType: "REVIEW_CYCLE",
      entityId: cycleId,
      relatedCycleId: cycleId,
      relatedDraftStandardId: cycle.draft_standard_id,
      message: `Цикл согласования «${cycle.title}» закрыт.`,
      metadata: this.buildReviewCycleAuditMetadata({
        ...cycle,
        status: "closed"
      })
    });

    return this.getSecretariatCycleDetail(cycleId);
  }

  async listAssignedActiveReviewCycles(
    userId: string
  ): Promise<ParticipantAssignedReviewCycle[]> {
    const result = await this.databaseService.query<ParticipantCycleRow>(
      `
        SELECT
          ra.id AS assignment_id,
          rc.id AS cycle_id,
          rc.title AS cycle_title,
          rc.description AS cycle_description,
          rc.status AS cycle_status,
          rc.opens_at AS cycle_opened_at,
          rc.deadline_at AS cycle_deadline_at,
          ds.id AS draft_standard_id,
          ds.code AS draft_standard_code,
          ds.title AS draft_standard_title,
          ds.summary AS draft_standard_summary,
          ds.stage AS draft_standard_stage,
          sc.id AS draft_standard_responsible_subcommittee_id,
          sc.code AS draft_standard_responsible_subcommittee_code,
          sc.title AS draft_standard_responsible_subcommittee_title,
          host.id AS draft_standard_responsible_subcommittee_host_id,
          host.name AS draft_standard_responsible_subcommittee_host_name,
          host.short_name AS draft_standard_responsible_subcommittee_host_short_name,
          host.country_code AS draft_standard_responsible_subcommittee_host_country_code,
          dsv.id AS version_id,
          dsv.version_label,
          dsv.revision_summary AS version_revision_summary,
          dsv.file_name AS version_file_name,
          dsv.file_note AS version_file_note,
          dsv.published_at AS version_published_at
        FROM review_assignments ra
        INNER JOIN review_cycles rc ON rc.id = ra.review_cycle_id
        INNER JOIN draft_standards ds ON ds.id = rc.draft_standard_id
        LEFT JOIN subcommittees sc ON sc.id = ds.responsible_subcommittee_id
        LEFT JOIN organizations host ON host.id = sc.host_organization_id
        INNER JOIN draft_standard_versions dsv ON dsv.id = rc.draft_standard_version_id
        WHERE ra.user_id = $1
          AND rc.status = 'open'
        ORDER BY rc.deadline_at ASC, ds.code ASC
      `,
      [userId]
    );

    return result.rows.map((row) => this.mapParticipantAssignedCycle(row));
  }

  async getParticipantDraftStandardCard(
    userId: string,
    cycleId: string,
    draftStandardId: string
  ): Promise<ParticipantDraftStandardCard> {
    const row = await this.getParticipantCycleRow(userId, cycleId, draftStandardId);
    const attachments = await this.listParticipantVersionFiles(
      userId,
      cycleId,
      draftStandardId
    );

    return this.mapParticipantDraftStandardCard(row, attachments);
  }

  async listParticipantComments(
    userId: string,
    cycleId: string,
    draftStandardId: string
  ): Promise<ReviewCommentRecord[]> {
    await this.getParticipantCycleRow(userId, cycleId, draftStandardId);

    const result = await this.databaseService.query<CommentRow>(
      `
        SELECT
          c.id AS comment_id,
          c.section_ref,
          c.point_ref,
          c.page_ref,
          c.remark,
          c.proposed_text,
          c.rationale,
          c.review_status,
          c.secretariat_response,
          c.created_at,
          c.updated_at,
          u.display_name AS author_display_name,
          o.name AS organization_name,
          rc.status AS cycle_status,
          rc.deadline_at AS cycle_deadline_at,
          EXISTS (
            SELECT 1
            FROM participant_positions pp
            WHERE pp.review_assignment_id = c.review_assignment_id
          ) AS position_submitted
        FROM review_comments c
        INNER JOIN users u ON u.id = c.author_user_id
        LEFT JOIN organizations o ON o.id = c.organization_id
        INNER JOIN review_cycles rc ON rc.id = c.review_cycle_id
        WHERE c.author_user_id = $1
          AND c.review_cycle_id = $2
          AND c.draft_standard_id = $3
        ORDER BY c.created_at ASC
      `,
      [userId, cycleId, draftStandardId]
    );

    return result.rows.map((row) => this.mapComment(row));
  }

  async createParticipantComment(
    userId: string,
    cycleId: string,
    draftStandardId: string,
    payload: CreateReviewCommentDto
  ): Promise<ReviewCommentRecord> {
    const context = await this.getParticipantContext(userId, cycleId, draftStandardId);
    this.assertCycleIsEditable(context.cycleStatus, context.cycleDeadlineAt);
    await this.assertNoSubmittedPosition(context.assignmentId);

    const normalized = this.normalizeCommentPayload(payload);
    const commentId = randomUUID();

    await this.databaseService.query(
      `
        INSERT INTO review_comments (
          id,
          review_cycle_id,
          draft_standard_id,
          draft_standard_version_id,
          review_assignment_id,
          author_user_id,
          organization_id,
          section_ref,
          point_ref,
          page_ref,
          remark,
          proposed_text,
          rationale
        )
        SELECT
          $1,
          rc.id,
          ds.id,
          rc.draft_standard_version_id,
          ra.id,
          ra.user_id,
          ra.organization_id,
          $2,
          $3,
          $4,
          $5,
          $6,
          $7
        FROM review_assignments ra
        INNER JOIN review_cycles rc ON rc.id = ra.review_cycle_id
        INNER JOIN draft_standards ds ON ds.id = rc.draft_standard_id
        WHERE ra.id = $8
      `,
      [
        commentId,
        normalized.sectionRef,
        normalized.pointRef,
        normalized.pageRef,
        normalized.remark,
        normalized.proposedText,
        normalized.rationale,
        context.assignmentId
      ]
    );

    const createdComment = await this.getParticipantCommentById(userId, commentId);

    await this.auditService.recordEvent({
      actorUserId: userId,
      actionType: "COMMENT_CREATED",
      entityType: "REVIEW_COMMENT",
      entityId: commentId,
      relatedCycleId: cycleId,
      relatedDraftStandardId: draftStandardId,
      relatedCommentId: commentId,
      message: `Создано замечание участника по ${this.formatCommentLocation(
        createdComment.sectionRef,
        createdComment.pointRef,
        createdComment.pageRef
      )}.`,
      metadata: this.buildCommentAuditMetadata(createdComment)
    });

    return createdComment;
  }

  async updateParticipantComment(
    userId: string,
    commentId: string,
    payload: UpdateReviewCommentDto
  ): Promise<ReviewCommentRecord> {
    const normalized = this.normalizeCommentPayload(payload);
    const comment = await this.getParticipantCommentMutationRow(userId, commentId);

    this.assertCycleIsEditable(comment.cycle_status, new Date(comment.cycle_deadline_at));

    if (comment.position_submitted) {
      throw new ForbiddenException(
        "После отправки итоговой позиции редактирование замечаний недоступно."
      );
    }

    if (comment.review_status !== "RECEIVED") {
      throw new ForbiddenException(
        "Замечание уже передано в обработку и больше не может быть изменено."
      );
    }

    await this.databaseService.query(
      `
        UPDATE review_comments
        SET
          section_ref = $2,
          point_ref = $3,
          page_ref = $4,
          remark = $5,
          proposed_text = $6,
          rationale = $7,
          updated_at = NOW()
        WHERE id = $1
      `,
      [
        commentId,
        normalized.sectionRef,
        normalized.pointRef,
        normalized.pageRef,
        normalized.remark,
        normalized.proposedText,
        normalized.rationale
      ]
    );

    const updatedComment = await this.getParticipantCommentById(userId, commentId);

    if (
      comment.section_ref !== updatedComment.sectionRef ||
      comment.point_ref !== updatedComment.pointRef ||
      comment.page_ref !== updatedComment.pageRef ||
      comment.remark !== updatedComment.remark ||
      comment.proposed_text !== updatedComment.proposedText ||
      comment.rationale !== updatedComment.rationale
    ) {
      await this.auditService.recordEvent({
        actorUserId: userId,
        actionType: "COMMENT_UPDATED",
        entityType: "REVIEW_COMMENT",
        entityId: commentId,
        relatedCycleId: comment.review_cycle_id,
        relatedDraftStandardId: comment.draft_standard_id,
        relatedCommentId: commentId,
        message: `Обновлено замечание участника по ${this.formatCommentLocation(
          updatedComment.sectionRef,
          updatedComment.pointRef,
          updatedComment.pageRef
        )}.`,
        metadata: {
          ...this.buildCommentAuditMetadata(updatedComment),
          previousSectionRef: comment.section_ref,
          previousPointRef: comment.point_ref,
          previousPageRef: comment.page_ref
        }
      });
    }

    return updatedComment;
  }

  async deleteParticipantComment(
    userId: string,
    commentId: string
  ): Promise<MutationResponseDto> {
    const comment = await this.getParticipantCommentMutationRow(userId, commentId);

    this.assertCycleIsEditable(comment.cycle_status, new Date(comment.cycle_deadline_at));

    if (comment.position_submitted) {
      throw new ForbiddenException(
        "После отправки итоговой позиции удаление замечаний недоступно."
      );
    }

    if (comment.review_status !== "RECEIVED") {
      throw new ForbiddenException(
        "Замечание уже передано в обработку и больше не может быть удалено."
      );
    }

    await this.databaseService.query(`DELETE FROM review_comments WHERE id = $1`, [commentId]);

    await this.auditService.recordEvent({
      actorUserId: userId,
      actionType: "COMMENT_DELETED",
      entityType: "REVIEW_COMMENT",
      entityId: commentId,
      relatedCycleId: comment.review_cycle_id,
      relatedDraftStandardId: comment.draft_standard_id,
      relatedCommentId: commentId,
      message: `Удалено замечание участника по ${this.formatCommentLocation(
        comment.section_ref,
        comment.point_ref,
        comment.page_ref
      )}.`,
      metadata: this.buildCommentAuditMetadata({
        sectionRef: comment.section_ref,
        pointRef: comment.point_ref,
        pageRef: comment.page_ref,
        remark: comment.remark,
        proposedText: comment.proposed_text,
        rationale: comment.rationale
      })
    });

    return {
      status: "success",
      message: "Замечание удалено."
    };
  }

  async submitParticipantPosition(
    userId: string,
    cycleId: string,
    payload: SubmitParticipantPositionDto
  ): Promise<ParticipantPositionRecord> {
    const context = await this.getParticipantContext(userId, cycleId);
    this.assertCycleIsEditable(context.cycleStatus, context.cycleDeadlineAt);
    const existingPosition = await this.getParticipantPosition(userId, cycleId);

    const position = this.normalizeParticipantPosition(payload);
    const positionId = randomUUID();

    await this.databaseService.withClient(async (client) => {
      await client.query(
        `
          INSERT INTO participant_positions (
            id,
            review_cycle_id,
            review_assignment_id,
            organization_id,
            submitted_by_user_id,
            position,
            note,
            submitted_at
          )
          SELECT
            $1,
            ra.review_cycle_id,
            ra.id,
            ra.organization_id,
            ra.user_id,
            $2,
            $3,
            NOW()
          FROM review_assignments ra
          WHERE ra.id = $4
          ON CONFLICT (review_assignment_id) DO UPDATE
          SET
            submitted_by_user_id = EXCLUDED.submitted_by_user_id,
            position = EXCLUDED.position,
            note = EXCLUDED.note,
            submitted_at = NOW()
        `,
        [positionId, position.position, position.note, context.assignmentId]
      );

      await client.query(
        `
          UPDATE review_assignments
          SET responded_at = NOW()
          WHERE id = $1
        `,
        [context.assignmentId]
      );
    });

    const savedPosition = await this.getParticipantPosition(userId, cycleId);

    if (!savedPosition) {
      throw new NotFoundException("Не удалось сохранить итоговую позицию.");
    }

    if (
      !existingPosition ||
      existingPosition.position !== savedPosition.position ||
      existingPosition.note !== savedPosition.note
    ) {
      const actionType = existingPosition ? "POSITION_UPDATED" : "POSITION_SUBMITTED";
      const actionMessage = existingPosition
        ? "Обновлена итоговая позиция участника"
        : "Зафиксирована итоговая позиция участника";
      const notificationType: NotificationType = existingPosition
        ? "FINAL_POSITION_UPDATED"
        : "FINAL_POSITION_SUBMITTED";

      await this.auditService.recordEvent({
        actorUserId: userId,
        actionType,
        entityType: "PARTICIPANT_POSITION",
        entityId: savedPosition.id,
        relatedCycleId: context.cycleId,
        relatedDraftStandardId: context.draftStandardId,
        message: `${actionMessage}: «${this.formatParticipantPositionLabel(
          savedPosition.position
        )}».`,
        metadata: {
          position: savedPosition.position,
          positionLabel: this.formatParticipantPositionLabel(savedPosition.position),
          note: savedPosition.note,
          previousPosition: existingPosition?.position ?? null,
          previousNote: existingPosition?.note ?? null
        }
      });

      await this.notificationsService.createNotification({
        recipientUserId: userId,
        type: notificationType,
        title: existingPosition
          ? "Итоговая позиция обновлена"
          : "Итоговая позиция отправлена",
        message: `По вашему проекту согласования зафиксирована позиция «${this.formatParticipantPositionLabel(
          savedPosition.position
        )}».`,
        relatedCycleId: context.cycleId,
        relatedDraftStandardId: context.draftStandardId,
        targetRoute: this.buildParticipantCycleRoute(
          context.cycleId,
          context.draftStandardId
        )
      });
    }

    return savedPosition;
  }

  async getParticipantPosition(
    userId: string,
    cycleId: string
  ): Promise<ParticipantPositionRecord | null> {
    const context = await this.getParticipantContext(userId, cycleId);
    const result = await this.databaseService.query<ParticipantPositionRow>(
      `
        SELECT
          pp.id,
          pp.position,
          pp.note,
          pp.submitted_at,
          submitter.display_name AS submitted_by_name
        FROM participant_positions pp
        INNER JOIN users submitter ON submitter.id = pp.submitted_by_user_id
        WHERE pp.review_assignment_id = $1
        LIMIT 1
      `,
      [context.assignmentId]
    );

    const row = result.rows[0];

    if (!row) {
      return null;
    }

    return this.mapParticipantPosition(row);
  }

  async listParticipantVersionFiles(
    userId: string,
    cycleId: string,
    draftStandardId: string
  ): Promise<ReviewAttachmentSummary[]> {
    const row = await this.getParticipantCycleRow(userId, cycleId, draftStandardId);

    return this.listVersionFilesByVersionId(row.version_id, "ASSIGNED_PARTICIPANTS");
  }

  async getParticipantVersionFileDownload(
    userId: string,
    cycleId: string,
    draftStandardId: string,
    fileId: string
  ): Promise<VersionFileDownloadPayload> {
    const row = await this.getParticipantCycleRow(userId, cycleId, draftStandardId);
    const file = await this.getVersionFileById(
      fileId,
      row.version_id,
      "ASSIGNED_PARTICIPANTS"
    );

    return this.buildVersionFileDownloadPayload(file);
  }

  async uploadSecretariatVersionFile(
    userId: string,
    versionId: string,
    file: UploadedBinaryFile | undefined,
    payload: CreateVersionFileDto
  ): Promise<ReviewAttachmentSummary> {
    const versionContext = await this.getVersionAuditContext(versionId);

    const normalized = this.normalizeVersionFilePayload(payload);
    const savedFile = await this.approvalFileStorageService.saveUploadedFile(file);
    const fileId = randomUUID();

    try {
      await this.databaseService.query(
        `
          INSERT INTO draft_standard_version_files (
            id,
            version_id,
            original_name,
            stored_name,
            mime_type,
            size_bytes,
            uploaded_by_user_id,
            visibility,
            description
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `,
        [
          fileId,
          versionId,
          savedFile.originalName,
          savedFile.storedName,
          savedFile.mimeType,
          savedFile.sizeBytes,
          userId,
          normalized.visibility,
          normalized.description
        ]
      );
    } catch (error) {
      await this.approvalFileStorageService.deleteStoredFile(savedFile.storedName);
      throw error;
    }

    const createdFile = await this.getVersionFileById(fileId, versionId);

    await this.auditService.recordEvent({
      actorUserId: userId,
      actionType: "FILE_UPLOADED",
      entityType: "VERSION_FILE",
      entityId: fileId,
      relatedCycleId: versionContext.review_cycle_id,
      relatedDraftStandardId: versionContext.draft_standard_id,
      relatedFileId: fileId,
      message: `Загружен файл версии «${createdFile.originalName}».`,
      metadata: this.buildVersionFileAuditMetadata(createdFile)
    });

    if (createdFile.visibility === "ASSIGNED_PARTICIPANTS") {
      const recipients = await this.listNotificationRecipientsForVersion(versionId);

      await this.notificationsService.createNotifications(
        recipients.map((recipient) => ({
          recipientUserId: recipient.user_id,
          type: "VERSION_FILE_UPLOADED" as const,
          title: "Добавлен новый файл версии",
          message: `По назначенному вам проекту стандарта опубликован файл «${createdFile.originalName}».`,
          relatedCycleId: recipient.review_cycle_id,
          relatedDraftStandardId: recipient.draft_standard_id,
          relatedFileId: fileId,
          targetRoute: this.buildParticipantCycleRoute(
            recipient.review_cycle_id,
            recipient.draft_standard_id
          )
        }))
      );
    }

    return this.pickVersionFileSummary(createdFile);
  }

  async listSecretariatVersionFiles(
    versionId: string
  ): Promise<ReviewAttachmentSummary[]> {
    await this.getDraftStandardVersionById(versionId);

    return this.listVersionFilesByVersionId(versionId);
  }

  async updateSecretariatVersionFile(
    userId: string,
    fileId: string,
    payload: UpdateVersionFileDto
  ): Promise<ReviewAttachmentSummary> {
    const file = await this.getVersionFileById(fileId);
    const versionContext = await this.getVersionAuditContext(file.versionId);
    const normalized = this.normalizeVersionFilePayload(payload, file.visibility);

    await this.databaseService.query(
      `
        UPDATE draft_standard_version_files
        SET
          description = $2,
          visibility = $3,
          updated_at = NOW()
        WHERE id = $1
      `,
      [fileId, normalized.description, normalized.visibility]
    );

    const updatedFile = await this.getVersionFileById(fileId, file.versionId);

    if (
      file.description !== updatedFile.description ||
      file.visibility !== updatedFile.visibility
    ) {
      await this.auditService.recordEvent({
        actorUserId: userId,
        actionType: "FILE_METADATA_CHANGED",
        entityType: "VERSION_FILE",
        entityId: fileId,
        relatedCycleId: versionContext.review_cycle_id,
        relatedDraftStandardId: versionContext.draft_standard_id,
        relatedFileId: fileId,
        message: `Обновлены сведения о файле «${updatedFile.originalName}».`,
        metadata: {
          ...this.buildVersionFileAuditMetadata(updatedFile),
          previousDescription: file.description,
          previousVisibility: file.visibility,
          visibilityLabel: this.formatFileVisibilityLabel(updatedFile.visibility),
          previousVisibilityLabel: this.formatFileVisibilityLabel(file.visibility)
        }
      });
    }

    return this.pickVersionFileSummary(updatedFile);
  }

  async deleteSecretariatVersionFile(
    userId: string,
    fileId: string
  ): Promise<MutationResponseDto> {
    const file = await this.getVersionFileById(fileId);
    const versionContext = await this.getVersionAuditContext(file.versionId);

    await this.databaseService.query(
      `DELETE FROM draft_standard_version_files WHERE id = $1`,
      [fileId]
    );
    await this.approvalFileStorageService.deleteStoredFile(file.storedName);

    await this.auditService.recordEvent({
      actorUserId: userId,
      actionType: "FILE_DELETED",
      entityType: "VERSION_FILE",
      entityId: fileId,
      relatedCycleId: versionContext.review_cycle_id,
      relatedDraftStandardId: versionContext.draft_standard_id,
      relatedFileId: fileId,
      message: `Удален файл версии «${file.originalName}».`,
      metadata: this.buildVersionFileAuditMetadata(file)
    });

    return {
      status: "success",
      message: "Файл удален."
    };
  }

  async getSecretariatVersionFileDownload(
    fileId: string
  ): Promise<VersionFileDownloadPayload> {
    const file = await this.getVersionFileById(fileId);

    return this.buildVersionFileDownloadPayload(file);
  }

  async listSecretariatReviewCycles(): Promise<SecretariatReviewCycleListItem[]> {
    const result = await this.databaseService.query<SecretariatCycleRow>(
      `
        SELECT
          rc.id AS cycle_id,
          rc.title AS cycle_title,
          rc.status AS cycle_status,
          rc.opens_at AS cycle_opened_at,
          rc.deadline_at AS cycle_deadline_at,
          rc.closed_at,
          ds.id AS draft_standard_id,
          ds.code AS draft_standard_code,
          ds.title AS draft_standard_title,
          ds.summary AS draft_standard_summary,
          ds.stage AS draft_standard_stage,
          sc.id AS draft_standard_responsible_subcommittee_id,
          sc.code AS draft_standard_responsible_subcommittee_code,
          sc.title AS draft_standard_responsible_subcommittee_title,
          host.id AS draft_standard_responsible_subcommittee_host_id,
          host.name AS draft_standard_responsible_subcommittee_host_name,
          host.short_name AS draft_standard_responsible_subcommittee_host_short_name,
          host.country_code AS draft_standard_responsible_subcommittee_host_country_code,
          dsv.id AS version_id,
          dsv.version_label,
          dsv.revision_summary AS version_revision_summary,
          dsv.file_name AS version_file_name,
          dsv.file_note AS version_file_note,
          dsv.published_at AS version_published_at,
          COUNT(ra.id)::text AS total_participants,
          COUNT(pp.id)::text AS responded_participants
        FROM review_cycles rc
        INNER JOIN draft_standards ds ON ds.id = rc.draft_standard_id
        LEFT JOIN subcommittees sc ON sc.id = ds.responsible_subcommittee_id
        LEFT JOIN organizations host ON host.id = sc.host_organization_id
        INNER JOIN draft_standard_versions dsv ON dsv.id = rc.draft_standard_version_id
        LEFT JOIN review_assignments ra ON ra.review_cycle_id = rc.id
        LEFT JOIN participant_positions pp ON pp.review_assignment_id = ra.id
        GROUP BY
          rc.id,
          ds.id,
          sc.id,
          host.id,
          dsv.id
        ORDER BY
          CASE rc.status
            WHEN 'open' THEN 0
            WHEN 'draft' THEN 1
            ELSE 2
          END,
          rc.deadline_at DESC
      `
    );

    return result.rows.map((row) => this.mapSecretariatCycle(row));
  }

  async getSecretariatCycleDetail(cycleId: string): Promise<SecretariatCycleDetail> {
    const [cycle, management] = await Promise.all([
      this.getSecretariatCycle(cycleId),
      this.getReviewCycleManagementRow(cycleId)
    ]);
    const participants = await this.getSecretariatParticipants(cycleId);
    const comments = await this.getSecretariatComments(cycleId);
    const versionFiles = await this.listSecretariatVersionFiles(cycle.currentVersion.id);

    return {
      cycle,
      description: management.description,
      participants,
      comments,
      versionFiles
    };
  }

  async updateSecretariatCommentStatus(
    userId: string,
    commentId: string,
    payload: UpdateReviewCommentStatusDto
  ): Promise<ReviewCommentRecord> {
    const normalized = this.normalizeReviewStatusPayload(payload);
    const comment = await this.getSecretariatCommentMutationRow(commentId);

    await this.databaseService.query(
      `
        UPDATE review_comments
        SET
          review_status = $2,
          secretariat_response = $3,
          updated_at = NOW()
        WHERE id = $1
      `,
      [commentId, normalized.reviewStatus, normalized.secretariatResponse]
    );

    const comments = await this.getSecretariatComments(comment.review_cycle_id);
    const updatedComment = comments.find((item) => item.id === commentId);

    if (!updatedComment) {
      throw new NotFoundException("Обновленное замечание не найдено.");
    }

    if (comment.review_status !== updatedComment.reviewStatus) {
      await this.auditService.recordEvent({
        actorUserId: userId,
        actionType: "COMMENT_STATUS_CHANGED",
        entityType: "REVIEW_COMMENT",
        entityId: commentId,
        relatedCycleId: comment.review_cycle_id,
        relatedDraftStandardId: comment.draft_standard_id,
        relatedCommentId: commentId,
        message: `Изменен статус замечания на «${this.formatReviewCommentStatusLabel(
          updatedComment.reviewStatus
        )}».`,
        metadata: {
          ...this.buildCommentAuditMetadata(updatedComment),
          previousReviewStatus: comment.review_status,
          previousReviewStatusLabel: this.formatReviewCommentStatusLabel(
            comment.review_status
          ),
          reviewStatus: updatedComment.reviewStatus,
          reviewStatusLabel: this.formatReviewCommentStatusLabel(
            updatedComment.reviewStatus
          )
        }
      });

      await this.notificationsService.createNotification({
        recipientUserId: comment.author_user_id,
        type: "COMMENT_STATUS_CHANGED",
        title: "Изменен статус замечания",
        message: `Секретариат изменил статус вашего замечания на «${this.formatReviewCommentStatusLabel(
          updatedComment.reviewStatus
        )}».`,
        relatedCycleId: comment.review_cycle_id,
        relatedDraftStandardId: comment.draft_standard_id,
        relatedCommentId: commentId,
        targetRoute: this.buildParticipantCycleRoute(
          comment.review_cycle_id,
          comment.draft_standard_id
        )
      });
    }

    if (
      comment.secretariat_response !== updatedComment.secretariatResponse &&
      updatedComment.secretariatResponse
    ) {
      await this.auditService.recordEvent({
        actorUserId: userId,
        actionType: "SECRETARIAT_RESPONSE_UPDATED",
        entityType: "REVIEW_COMMENT",
        entityId: commentId,
        relatedCycleId: comment.review_cycle_id,
        relatedDraftStandardId: comment.draft_standard_id,
        relatedCommentId: commentId,
        message: "Обновлен ответ секретариата по замечанию.",
        metadata: {
          ...this.buildCommentAuditMetadata(updatedComment),
          previousSecretariatResponse: comment.secretariat_response,
          secretariatResponse: updatedComment.secretariatResponse
        }
      });

      await this.notificationsService.createNotification({
        recipientUserId: comment.author_user_id,
        type: "SECRETARIAT_RESPONSE_UPDATED",
        title: "Добавлен ответ секретариата",
        message: "По вашему замечанию опубликован новый ответ секретариата.",
        relatedCycleId: comment.review_cycle_id,
        relatedDraftStandardId: comment.draft_standard_id,
        relatedCommentId: commentId,
        targetRoute: this.buildParticipantCycleRoute(
          comment.review_cycle_id,
          comment.draft_standard_id
        )
      });
    }

    return updatedComment;
  }

  private async listSecretariatReviewCyclesByDraftStandard(
    draftStandardId: string
  ): Promise<SecretariatReviewCycleListItem[]> {
    const result = await this.databaseService.query<SecretariatCycleRow>(
      `
        SELECT
          rc.id AS cycle_id,
          rc.title AS cycle_title,
          rc.status AS cycle_status,
          rc.opens_at AS cycle_opened_at,
          rc.deadline_at AS cycle_deadline_at,
          rc.closed_at,
          ds.id AS draft_standard_id,
          ds.code AS draft_standard_code,
          ds.title AS draft_standard_title,
          ds.summary AS draft_standard_summary,
          ds.stage AS draft_standard_stage,
          sc.id AS draft_standard_responsible_subcommittee_id,
          sc.code AS draft_standard_responsible_subcommittee_code,
          sc.title AS draft_standard_responsible_subcommittee_title,
          host.id AS draft_standard_responsible_subcommittee_host_id,
          host.name AS draft_standard_responsible_subcommittee_host_name,
          host.short_name AS draft_standard_responsible_subcommittee_host_short_name,
          host.country_code AS draft_standard_responsible_subcommittee_host_country_code,
          dsv.id AS version_id,
          dsv.version_label,
          dsv.revision_summary AS version_revision_summary,
          dsv.file_name AS version_file_name,
          dsv.file_note AS version_file_note,
          dsv.published_at AS version_published_at,
          COUNT(ra.id)::text AS total_participants,
          COUNT(pp.id)::text AS responded_participants
        FROM review_cycles rc
        INNER JOIN draft_standards ds ON ds.id = rc.draft_standard_id
        LEFT JOIN subcommittees sc ON sc.id = ds.responsible_subcommittee_id
        LEFT JOIN organizations host ON host.id = sc.host_organization_id
        INNER JOIN draft_standard_versions dsv ON dsv.id = rc.draft_standard_version_id
        LEFT JOIN review_assignments ra ON ra.review_cycle_id = rc.id
        LEFT JOIN participant_positions pp ON pp.review_assignment_id = ra.id
        WHERE rc.draft_standard_id = $1
        GROUP BY
          rc.id,
          ds.id,
          sc.id,
          host.id,
          dsv.id
        ORDER BY
          CASE rc.status
            WHEN 'open' THEN 0
            WHEN 'draft' THEN 1
            ELSE 2
          END,
          rc.deadline_at DESC
      `,
      [draftStandardId]
    );

    return result.rows.map((row) => this.mapSecretariatCycle(row));
  }

  private async getDraftStandardRowById(
    draftStandardId: string
  ): Promise<DraftStandardRow> {
    const result = await this.databaseService.query<DraftStandardRow>(
      `
        SELECT
          ds.id,
          ds.code,
          ds.title,
          ds.summary,
          ds.stage,
          sc.id AS responsible_subcommittee_id,
          sc.code AS responsible_subcommittee_code,
          sc.title AS responsible_subcommittee_title,
          host.id AS responsible_subcommittee_host_id,
          host.name AS responsible_subcommittee_host_name,
          host.short_name AS responsible_subcommittee_host_short_name,
          host.country_code AS responsible_subcommittee_host_country_code,
          ds.created_at,
          ds.updated_at
        FROM draft_standards ds
        LEFT JOIN subcommittees sc ON sc.id = ds.responsible_subcommittee_id
        LEFT JOIN organizations host ON host.id = sc.host_organization_id
        WHERE ds.id = $1
        LIMIT 1
      `,
      [draftStandardId]
    );
    const row = result.rows[0];

    if (!row) {
      throw new NotFoundException("Проект стандарта не найден.");
    }

    return row;
  }

  private async getDraftStandardVersionRecord(
    versionId: string
  ): Promise<SecretariatDraftStandardVersionRecord> {
    const result = await this.databaseService.query<DraftStandardVersionRow>(
      `
        SELECT
          dsv.id,
          dsv.draft_standard_id,
          dsv.version_label,
          dsv.revision_summary,
          dsv.file_name,
          dsv.file_note,
          dsv.published_at,
          COUNT(vf.id)::text AS attachments_count
        FROM draft_standard_versions dsv
        LEFT JOIN draft_standard_version_files vf ON vf.version_id = dsv.id
        WHERE dsv.id = $1
        GROUP BY dsv.id
        LIMIT 1
      `,
      [versionId]
    );
    const row = result.rows[0];

    if (!row) {
      throw new NotFoundException("Версия проекта стандарта не найдена.");
    }

    return this.mapDraftStandardVersion(row);
  }

  private async getReviewCycleManagementRow(
    cycleId: string
  ): Promise<ReviewCycleManagementRow> {
    const result = await this.databaseService.query<ReviewCycleManagementRow>(
      `
        SELECT
          id,
          draft_standard_id,
          draft_standard_version_id,
          title,
          description,
          status,
          opens_at,
          deadline_at,
          created_by_user_id
        FROM review_cycles
        WHERE id = $1
        LIMIT 1
      `,
      [cycleId]
    );
    const row = result.rows[0];

    if (!row) {
      throw new NotFoundException("Цикл согласования не найден.");
    }

    return row;
  }

  private async getReviewAssignmentById(
    assignmentId: string
  ): Promise<SecretariatReviewAssignmentRecord> {
    const result = await this.databaseService.query<ReviewAssignmentRow>(
      `
        SELECT
          ra.id,
          ra.assigned_at,
          ra.responded_at,
          o.id AS organization_id,
          o.name AS organization_name,
          o.short_name AS organization_short_name,
          u.id AS user_id,
          u.display_name AS user_display_name,
          u.email AS user_email
        FROM review_assignments ra
        INNER JOIN organizations o ON o.id = ra.organization_id
        INNER JOIN users u ON u.id = ra.user_id
        WHERE ra.id = $1
        LIMIT 1
      `,
      [assignmentId]
    );
    const row = result.rows[0];

    if (!row) {
      throw new NotFoundException("Назначение участника не найдено.");
    }

    return this.mapReviewAssignment(row);
  }

  private async getAssignableParticipant(
    userId: string
  ): Promise<AssignableParticipantRow> {
    const result = await this.databaseService.query<AssignableParticipantRow>(
      `
        SELECT
          u.id AS user_id,
          u.display_name AS user_display_name,
          u.email AS user_email,
          u.role,
          o.id AS organization_id,
          o.name AS organization_name,
          o.short_name AS organization_short_name
        FROM users u
        LEFT JOIN organizations o ON o.id = u.organization_id
        WHERE u.id = $1
        LIMIT 1
      `,
      [userId]
    );
    const row = result.rows[0];

    if (!row) {
      throw new NotFoundException("Участник для назначения не найден.");
    }

    if (row.role !== "PARTICIPANT") {
      throw new BadRequestException(
        "Назначать на цикл согласования можно только пользователей с ролью участника."
      );
    }

    if (!row.organization_id) {
      throw new BadRequestException(
        "У выбранного участника не указана организация."
      );
    }

    return row;
  }

  private async createCycleAssignmentNotifications(cycleId: string): Promise<void> {
    const result = await this.databaseService.query<CycleNotificationRecipientRow>(
      `
        SELECT
          ra.user_id,
          rc.id AS cycle_id,
          rc.title AS cycle_title,
          rc.deadline_at AS cycle_deadline_at,
          rc.draft_standard_id,
          ds.title AS draft_standard_title
        FROM review_assignments ra
        INNER JOIN review_cycles rc ON rc.id = ra.review_cycle_id
        INNER JOIN draft_standards ds ON ds.id = rc.draft_standard_id
        WHERE ra.review_cycle_id = $1
        ORDER BY ra.assigned_at ASC
      `,
      [cycleId]
    );

    await this.notificationsService.createNotifications(
      result.rows.map((row) => ({
        recipientUserId: row.user_id,
        type: "ASSIGNED_TO_ACTIVE_CYCLE" as const,
        title: "Открыт новый цикл согласования",
        message: `Для вас открыт цикл «${row.cycle_title}» по проекту стандарта «${row.draft_standard_title}». Срок ответа — ${this.formatDateLabel(
          row.cycle_deadline_at
        )}.`,
        relatedCycleId: row.cycle_id,
        relatedDraftStandardId: row.draft_standard_id,
        targetRoute: this.buildParticipantCycleRoute(
          row.cycle_id,
          row.draft_standard_id
        )
      }))
    );
  }

  private async getParticipantCycleRow(
    userId: string,
    cycleId: string,
    draftStandardId?: string
  ): Promise<ParticipantCycleRow> {
    const parameters: string[] = [userId, cycleId];
    const draftStandardFilter = draftStandardId
      ? `AND ds.id = $3`
      : "";

    if (draftStandardId) {
      parameters.push(draftStandardId);
    }

    const result = await this.databaseService.query<ParticipantCycleRow>(
      `
        SELECT
          ra.id AS assignment_id,
          rc.id AS cycle_id,
          rc.title AS cycle_title,
          rc.description AS cycle_description,
          rc.status AS cycle_status,
          rc.opens_at AS cycle_opened_at,
          rc.deadline_at AS cycle_deadline_at,
          ds.id AS draft_standard_id,
          ds.code AS draft_standard_code,
          ds.title AS draft_standard_title,
          ds.summary AS draft_standard_summary,
          ds.stage AS draft_standard_stage,
          sc.id AS draft_standard_responsible_subcommittee_id,
          sc.code AS draft_standard_responsible_subcommittee_code,
          sc.title AS draft_standard_responsible_subcommittee_title,
          host.id AS draft_standard_responsible_subcommittee_host_id,
          host.name AS draft_standard_responsible_subcommittee_host_name,
          host.short_name AS draft_standard_responsible_subcommittee_host_short_name,
          host.country_code AS draft_standard_responsible_subcommittee_host_country_code,
          dsv.id AS version_id,
          dsv.version_label,
          dsv.revision_summary AS version_revision_summary,
          dsv.file_name AS version_file_name,
          dsv.file_note AS version_file_note,
          dsv.published_at AS version_published_at
        FROM review_assignments ra
        INNER JOIN review_cycles rc ON rc.id = ra.review_cycle_id
        INNER JOIN draft_standards ds ON ds.id = rc.draft_standard_id
        LEFT JOIN subcommittees sc ON sc.id = ds.responsible_subcommittee_id
        LEFT JOIN organizations host ON host.id = sc.host_organization_id
        INNER JOIN draft_standard_versions dsv ON dsv.id = rc.draft_standard_version_id
        WHERE ra.user_id = $1
          AND rc.id = $2
          ${draftStandardFilter}
        LIMIT 1
      `,
      parameters
    );

    const row = result.rows[0];

    if (!row) {
      throw new NotFoundException("Назначенный цикл согласования не найден.");
    }

    return row;
  }

  private async getParticipantContext(
    userId: string,
    cycleId: string,
    draftStandardId?: string
  ): Promise<ParticipantAssignmentContext> {
    const row = await this.getParticipantCycleRow(userId, cycleId, draftStandardId);

    return {
      assignmentId: row.assignment_id,
      cycleId: row.cycle_id,
      draftStandardId: row.draft_standard_id,
      cycleStatus: row.cycle_status,
      cycleDeadlineAt: new Date(row.cycle_deadline_at)
    };
  }

  private async assertNoSubmittedPosition(assignmentId: string): Promise<void> {
    const result = await this.databaseService.query<{ exists: boolean }>(
      `
        SELECT EXISTS (
          SELECT 1
          FROM participant_positions
          WHERE review_assignment_id = $1
        ) AS exists
      `,
      [assignmentId]
    );

    if (result.rows[0]?.exists) {
      throw new ForbiddenException(
        "Итоговая позиция уже отправлена. Новые замечания добавить нельзя."
      );
    }
  }

  private async getParticipantCommentById(
    userId: string,
    commentId: string
  ): Promise<ReviewCommentRecord> {
    const result = await this.databaseService.query<CommentRow>(
      `
        SELECT
          c.id AS comment_id,
          c.section_ref,
          c.point_ref,
          c.page_ref,
          c.remark,
          c.proposed_text,
          c.rationale,
          c.review_status,
          c.secretariat_response,
          c.created_at,
          c.updated_at,
          u.display_name AS author_display_name,
          o.name AS organization_name,
          rc.status AS cycle_status,
          rc.deadline_at AS cycle_deadline_at,
          EXISTS (
            SELECT 1
            FROM participant_positions pp
            WHERE pp.review_assignment_id = c.review_assignment_id
          ) AS position_submitted
        FROM review_comments c
        INNER JOIN users u ON u.id = c.author_user_id
        LEFT JOIN organizations o ON o.id = c.organization_id
        INNER JOIN review_cycles rc ON rc.id = c.review_cycle_id
        WHERE c.id = $1
          AND c.author_user_id = $2
        LIMIT 1
      `,
      [commentId, userId]
    );

    const row = result.rows[0];

    if (!row) {
      throw new NotFoundException("Замечание не найдено.");
    }

    return this.mapComment(row);
  }

  private async getParticipantCommentMutationRow(
    userId: string,
    commentId: string
  ): Promise<CommentMutationRow> {
    const result = await this.databaseService.query<CommentMutationRow>(
      `
        SELECT
          c.review_assignment_id,
          c.review_cycle_id,
          c.review_status,
          c.draft_standard_id,
          c.section_ref,
          c.point_ref,
          c.page_ref,
          c.remark,
          c.proposed_text,
          c.rationale,
          c.secretariat_response,
          rc.status AS cycle_status,
          rc.deadline_at AS cycle_deadline_at,
          EXISTS (
            SELECT 1
            FROM participant_positions pp
            WHERE pp.review_assignment_id = c.review_assignment_id
          ) AS position_submitted
        FROM review_comments c
        INNER JOIN review_cycles rc ON rc.id = c.review_cycle_id
        WHERE c.id = $1
          AND c.author_user_id = $2
        LIMIT 1
      `,
      [commentId, userId]
    );

    const row = result.rows[0];

    if (!row) {
      throw new NotFoundException("Замечание не найдено.");
    }

    return row;
  }

  private async getSecretariatCommentMutationRow(
    commentId: string
  ): Promise<SecretariatCommentMutationRow> {
    const result = await this.databaseService.query<SecretariatCommentMutationRow>(
      `
        SELECT
          author_user_id,
          review_cycle_id,
          draft_standard_id,
          section_ref,
          point_ref,
          page_ref,
          review_status,
          secretariat_response
        FROM review_comments
        WHERE id = $1
        LIMIT 1
      `,
      [commentId]
    );
    const row = result.rows[0];

    if (!row) {
      throw new NotFoundException("Замечание не найдено.");
    }

    return row;
  }

  private async getSecretariatCycle(
    cycleId: string
  ): Promise<SecretariatReviewCycleListItem> {
    const result = await this.databaseService.query<SecretariatCycleRow>(
      `
        SELECT
          rc.id AS cycle_id,
          rc.title AS cycle_title,
          rc.status AS cycle_status,
          rc.opens_at AS cycle_opened_at,
          rc.deadline_at AS cycle_deadline_at,
          rc.closed_at,
          ds.id AS draft_standard_id,
          ds.code AS draft_standard_code,
          ds.title AS draft_standard_title,
          ds.summary AS draft_standard_summary,
          ds.stage AS draft_standard_stage,
          sc.id AS draft_standard_responsible_subcommittee_id,
          sc.code AS draft_standard_responsible_subcommittee_code,
          sc.title AS draft_standard_responsible_subcommittee_title,
          host.id AS draft_standard_responsible_subcommittee_host_id,
          host.name AS draft_standard_responsible_subcommittee_host_name,
          host.short_name AS draft_standard_responsible_subcommittee_host_short_name,
          host.country_code AS draft_standard_responsible_subcommittee_host_country_code,
          dsv.id AS version_id,
          dsv.version_label,
          dsv.revision_summary AS version_revision_summary,
          dsv.file_name AS version_file_name,
          dsv.file_note AS version_file_note,
          dsv.published_at AS version_published_at,
          COUNT(ra.id)::text AS total_participants,
          COUNT(pp.id)::text AS responded_participants
        FROM review_cycles rc
        INNER JOIN draft_standards ds ON ds.id = rc.draft_standard_id
        LEFT JOIN subcommittees sc ON sc.id = ds.responsible_subcommittee_id
        LEFT JOIN organizations host ON host.id = sc.host_organization_id
        INNER JOIN draft_standard_versions dsv ON dsv.id = rc.draft_standard_version_id
        LEFT JOIN review_assignments ra ON ra.review_cycle_id = rc.id
        LEFT JOIN participant_positions pp ON pp.review_assignment_id = ra.id
        WHERE rc.id = $1
        GROUP BY
          rc.id,
          ds.id,
          sc.id,
          host.id,
          dsv.id
        LIMIT 1
      `,
      [cycleId]
    );

    const row = result.rows[0];

    if (!row) {
      throw new NotFoundException("Цикл согласования не найден.");
    }

    return this.mapSecretariatCycle(row);
  }

  private async getSecretariatParticipants(
    cycleId: string
  ): Promise<SecretariatParticipantResponse[]> {
    const result = await this.databaseService.query<SecretariatParticipantRow>(
      `
        SELECT
          ra.id AS assignment_id,
          o.id AS organization_id,
          o.name AS organization_name,
          o.short_name AS organization_short_name,
          u.id AS participant_user_id,
          u.display_name AS participant_display_name,
          ra.responded_at,
          pp.id AS position_id,
          pp.position AS position_value,
          pp.note AS position_note,
          pp.submitted_at AS position_submitted_at,
          submitter.display_name AS position_submitted_by_name
        FROM review_assignments ra
        INNER JOIN organizations o ON o.id = ra.organization_id
        INNER JOIN users u ON u.id = ra.user_id
        LEFT JOIN participant_positions pp ON pp.review_assignment_id = ra.id
        LEFT JOIN users submitter ON submitter.id = pp.submitted_by_user_id
        WHERE ra.review_cycle_id = $1
        ORDER BY o.name ASC, u.display_name ASC
      `,
      [cycleId]
    );

    return result.rows.map((row) => ({
      assignmentId: row.assignment_id,
      organizationId: row.organization_id,
      organizationName: row.organization_name,
      organizationShortName: row.organization_short_name,
      participantUserId: row.participant_user_id,
      participantDisplayName: row.participant_display_name,
      responded: Boolean(row.position_id || row.responded_at),
      respondedAt: row.position_submitted_at ?? row.responded_at,
      position: row.position_id
        ? {
            id: row.position_id,
            position: row.position_value ?? "AGREED",
            note: row.position_note,
            submittedAt: new Date(
              row.position_submitted_at ?? row.responded_at ?? Date.now()
            ).toISOString(),
            submittedByName:
              row.position_submitted_by_name ?? row.participant_display_name
          }
        : null
    }));
  }

  private async getSecretariatComments(cycleId: string): Promise<ReviewCommentRecord[]> {
    const result = await this.databaseService.query<CommentRow>(
      `
        SELECT
          c.id AS comment_id,
          c.section_ref,
          c.point_ref,
          c.page_ref,
          c.remark,
          c.proposed_text,
          c.rationale,
          c.review_status,
          c.secretariat_response,
          c.created_at,
          c.updated_at,
          u.display_name AS author_display_name,
          o.name AS organization_name,
          rc.status AS cycle_status,
          rc.deadline_at AS cycle_deadline_at,
          EXISTS (
            SELECT 1
            FROM participant_positions pp
            WHERE pp.review_assignment_id = c.review_assignment_id
          ) AS position_submitted
        FROM review_comments c
        INNER JOIN users u ON u.id = c.author_user_id
        LEFT JOIN organizations o ON o.id = c.organization_id
        INNER JOIN review_cycles rc ON rc.id = c.review_cycle_id
        WHERE c.review_cycle_id = $1
        ORDER BY o.name ASC NULLS LAST, u.display_name ASC, c.created_at ASC
      `,
      [cycleId]
    );

    return result.rows.map((row) => ({
      ...this.mapComment(row),
      canEdit: false
    }));
  }

  private async getDraftStandardVersionById(
    versionId: string
  ): Promise<DraftStandardVersionLookupRow> {
    const result = await this.databaseService.query<DraftStandardVersionLookupRow>(
      `
        SELECT
          id,
          draft_standard_id
        FROM draft_standard_versions
        WHERE id = $1
        LIMIT 1
      `,
      [versionId]
    );

    const row = result.rows[0];

    if (!row) {
      throw new NotFoundException("Версия проекта стандарта не найдена.");
    }

    return row;
  }

  private async getVersionAuditContext(versionId: string): Promise<VersionAuditContextRow> {
    const result = await this.databaseService.query<VersionAuditContextRow>(
      `
        SELECT
          dsv.draft_standard_id,
          (
            SELECT rc.id
            FROM review_cycles rc
            WHERE rc.draft_standard_version_id = dsv.id
            ORDER BY
              CASE rc.status
                WHEN 'open' THEN 0
                WHEN 'draft' THEN 1
                ELSE 2
              END,
              rc.deadline_at DESC
            LIMIT 1
          ) AS review_cycle_id
        FROM draft_standard_versions dsv
        WHERE dsv.id = $1
        LIMIT 1
      `,
      [versionId]
    );
    const row = result.rows[0];

    if (!row) {
      throw new NotFoundException("Версия проекта стандарта не найдена.");
    }

    return row;
  }

  private async listNotificationRecipientsForVersion(
    versionId: string
  ): Promise<VersionNotificationRecipientRow[]> {
    const result = await this.databaseService.query<VersionNotificationRecipientRow>(
      `
        SELECT DISTINCT
          ra.user_id,
          rc.id AS review_cycle_id,
          rc.draft_standard_id
        FROM review_assignments ra
        INNER JOIN review_cycles rc ON rc.id = ra.review_cycle_id
        WHERE rc.draft_standard_version_id = $1
          AND rc.status = 'open'
      `,
      [versionId]
    );

    return result.rows;
  }

  private async listVersionFilesByVersionId(
    versionId: string,
    visibility?: ReviewFileVisibility
  ): Promise<ReviewAttachmentSummary[]> {
    const parameters: [string, ...string[]] =
      visibility === undefined ? [versionId] : [versionId, visibility];
    const visibilityFilter =
      visibility === undefined ? "" : `AND vf.visibility = $2`;

    const result = await this.databaseService.query<VersionFileRow>(
      `
        SELECT
          vf.id,
          vf.version_id,
          vf.original_name,
          vf.stored_name,
          vf.mime_type,
          vf.size_bytes::text AS size_bytes,
          vf.uploaded_at,
          vf.visibility,
          vf.description,
          uploader.display_name AS uploaded_by_display_name
        FROM draft_standard_version_files vf
        LEFT JOIN users uploader ON uploader.id = vf.uploaded_by_user_id
        WHERE vf.version_id = $1
          ${visibilityFilter}
        ORDER BY vf.uploaded_at DESC, vf.original_name ASC
      `,
      parameters
    );

    return result.rows.map((row) => this.mapVersionFile(row));
  }

  private async getVersionFileById(
    fileId: string,
    versionId?: string,
    visibility?: ReviewFileVisibility
  ): Promise<VersionFileRow & ReviewAttachmentSummary & { storedName: string }> {
    const parameters: string[] = [fileId];
    const conditions = [`vf.id = $1`];

    if (versionId) {
      parameters.push(versionId);
      conditions.push(`vf.version_id = $${parameters.length}`);
    }

    if (visibility) {
      parameters.push(visibility);
      conditions.push(`vf.visibility = $${parameters.length}`);
    }

    const result = await this.databaseService.query<VersionFileRow>(
      `
        SELECT
          vf.id,
          vf.version_id,
          vf.original_name,
          vf.stored_name,
          vf.mime_type,
          vf.size_bytes::text AS size_bytes,
          vf.uploaded_at,
          vf.visibility,
          vf.description,
          uploader.display_name AS uploaded_by_display_name
        FROM draft_standard_version_files vf
        LEFT JOIN users uploader ON uploader.id = vf.uploaded_by_user_id
        WHERE ${conditions.join("\n          AND ")}
        LIMIT 1
      `,
      parameters
    );

    const row = result.rows[0];

    if (!row) {
      throw new NotFoundException("Файл версии не найден.");
    }

    const mappedFile = this.mapVersionFile(row);

    return {
      ...row,
      ...mappedFile,
      storedName: row.stored_name
    };
  }

  private async buildVersionFileDownloadPayload(
    file: ReviewAttachmentSummary & { mimeType: string; originalName: string; storedName: string }
  ): Promise<VersionFileDownloadPayload> {
    const streamPath = await this.approvalFileStorageService.resolveExistingFilePath(
      file.storedName
    );

    return {
      streamPath,
      fileName: file.originalName,
      mimeType: file.mimeType,
      sizeBytes: file.sizeBytes,
      contentDisposition: buildDownloadContentDisposition(file.originalName)
    };
  }

  private async assertSubcommitteeExists(subcommitteeId: string): Promise<void> {
    const result = await this.databaseService.query<{ id: string }>(
      `
        SELECT id
        FROM subcommittees
        WHERE id = $1
        LIMIT 1
      `,
      [subcommitteeId]
    );

    if (!result.rows[0]) {
      throw new BadRequestException(
        "Выберите корректный ответственный подкомитет для проекта стандарта."
      );
    }
  }

  private mapSubcommitteeSummary(fields: {
    code: string | null;
    hostCountryCode: string | null;
    hostId: string | null;
    hostName: string | null;
    hostShortName: string | null;
    id: string | null;
    title: string | null;
  }): SubcommitteeSummary | null {
    if (!fields.id) {
      return null;
    }

    return {
      id: fields.id,
      code: fields.code ?? "ПК",
      title: fields.title ?? "Подкомитет",
      hostOrganization: {
        id: fields.hostId ?? "organization",
        name: fields.hostName ?? fields.hostShortName ?? "Организация",
        shortName: fields.hostShortName ?? fields.hostName ?? "Организация",
        ...(fields.hostCountryCode ? { countryCode: fields.hostCountryCode } : {})
      }
    };
  }

  private mapDraftStandardResponsibleSubcommittee(
    row: DraftStandardRow | DraftStandardListRow
  ): SubcommitteeSummary | null {
    return this.mapSubcommitteeSummary({
      id: row.responsible_subcommittee_id,
      code: row.responsible_subcommittee_code,
      title: row.responsible_subcommittee_title,
      hostId: row.responsible_subcommittee_host_id,
      hostName: row.responsible_subcommittee_host_name,
      hostShortName: row.responsible_subcommittee_host_short_name,
      hostCountryCode: row.responsible_subcommittee_host_country_code
    });
  }

  private mapCycleDraftStandardResponsibleSubcommittee(
    row: ParticipantCycleRow | SecretariatCycleRow
  ): SubcommitteeSummary | null {
    return this.mapSubcommitteeSummary({
      id: row.draft_standard_responsible_subcommittee_id,
      code: row.draft_standard_responsible_subcommittee_code,
      title: row.draft_standard_responsible_subcommittee_title,
      hostId: row.draft_standard_responsible_subcommittee_host_id,
      hostName: row.draft_standard_responsible_subcommittee_host_name,
      hostShortName: row.draft_standard_responsible_subcommittee_host_short_name,
      hostCountryCode: row.draft_standard_responsible_subcommittee_host_country_code
    });
  }

  private mapParticipantAssignedCycle(
    row: ParticipantCycleRow
  ): ParticipantAssignedReviewCycle {
    return {
      assignmentId: row.assignment_id,
      cycle: {
        id: row.cycle_id,
        title: row.cycle_title,
        status: row.cycle_status,
        opensAt: new Date(row.cycle_opened_at).toISOString(),
        deadlineAt: new Date(row.cycle_deadline_at).toISOString(),
        closedAt: null
      },
      draftStandard: {
        id: row.draft_standard_id,
        code: row.draft_standard_code,
        title: row.draft_standard_title,
        summary: row.draft_standard_summary,
        stage: row.draft_standard_stage,
        responsibleSubcommittee: this.mapCycleDraftStandardResponsibleSubcommittee(row)
      },
      currentVersion: {
        id: row.version_id,
        versionLabel: row.version_label,
        revisionSummary: row.version_revision_summary,
        fileName: row.version_file_name,
        fileNote: row.version_file_note,
        publishedAt: new Date(row.version_published_at).toISOString()
      }
    };
  }

  private mapParticipantDraftStandardCard(
    row: ParticipantCycleRow,
    attachments: ReviewAttachmentSummary[]
  ): ParticipantDraftStandardCard {
    return {
      cycle: {
        id: row.cycle_id,
        title: row.cycle_title,
        description: row.cycle_description,
        status: row.cycle_status,
        opensAt: new Date(row.cycle_opened_at).toISOString(),
        deadlineAt: new Date(row.cycle_deadline_at).toISOString(),
        closedAt: null
      },
      draftStandard: {
        id: row.draft_standard_id,
        code: row.draft_standard_code,
        title: row.draft_standard_title,
        summary: row.draft_standard_summary,
        stage: row.draft_standard_stage,
        responsibleSubcommittee: this.mapCycleDraftStandardResponsibleSubcommittee(row)
      },
      currentVersion: {
        id: row.version_id,
        versionLabel: row.version_label,
        revisionSummary: row.version_revision_summary,
        fileName: row.version_file_name,
        fileNote: row.version_file_note,
        publishedAt: new Date(row.version_published_at).toISOString()
      },
      attachments
    };
  }

  private mapVersionFile(row: VersionFileRow): ReviewAttachmentSummary {
    return {
      id: row.id,
      versionId: row.version_id,
      originalName: row.original_name,
      mimeType: row.mime_type,
      sizeBytes: Number.parseInt(row.size_bytes, 10),
      uploadedAt: new Date(row.uploaded_at).toISOString(),
      uploadedByDisplayName: row.uploaded_by_display_name,
      visibility: row.visibility,
      description: row.description
    };
  }

  private pickVersionFileSummary(
    file: ReviewAttachmentSummary
  ): ReviewAttachmentSummary {
    return {
      id: file.id,
      versionId: file.versionId,
      originalName: file.originalName,
      mimeType: file.mimeType,
      sizeBytes: file.sizeBytes,
      uploadedAt: file.uploadedAt,
      uploadedByDisplayName: file.uploadedByDisplayName,
      visibility: file.visibility,
      description: file.description
    };
  }

  private mapComment(row: CommentRow): ReviewCommentRecord {
    return {
      id: row.comment_id,
      sectionRef: row.section_ref,
      pointRef: row.point_ref,
      pageRef: row.page_ref,
      remark: row.remark,
      proposedText: row.proposed_text,
      rationale: row.rationale,
      reviewStatus: row.review_status,
      secretariatResponse: row.secretariat_response,
      authorDisplayName: row.author_display_name,
      organizationName: row.organization_name,
      createdAt: new Date(row.created_at).toISOString(),
      updatedAt: new Date(row.updated_at).toISOString(),
      canEdit:
        row.review_status === "RECEIVED" &&
        row.cycle_status === "open" &&
        new Date(row.cycle_deadline_at).getTime() > Date.now() &&
        !row.position_submitted
    };
  }

  private mapParticipantPosition(
    row: ParticipantPositionRow
  ): ParticipantPositionRecord {
    return {
      id: row.id,
      position: row.position,
      note: row.note,
      submittedAt: new Date(row.submitted_at).toISOString(),
      submittedByName: row.submitted_by_name
    };
  }

  private mapSecretariatCycle(
    row: SecretariatCycleRow
  ): SecretariatReviewCycleListItem {
    const totalParticipants = Number.parseInt(row.total_participants, 10);
    const respondedParticipants = Number.parseInt(row.responded_participants, 10);

    return {
      cycle: {
        id: row.cycle_id,
        title: row.cycle_title,
        status: row.cycle_status,
        opensAt: new Date(row.cycle_opened_at).toISOString(),
        deadlineAt: new Date(row.cycle_deadline_at).toISOString(),
        closedAt: row.closed_at ? new Date(row.closed_at).toISOString() : null
      },
      draftStandard: {
        id: row.draft_standard_id,
        code: row.draft_standard_code,
        title: row.draft_standard_title,
        summary: row.draft_standard_summary,
        stage: row.draft_standard_stage,
        responsibleSubcommittee: this.mapCycleDraftStandardResponsibleSubcommittee(row)
      },
      currentVersion: {
        id: row.version_id,
        versionLabel: row.version_label,
        revisionSummary: row.version_revision_summary,
        fileName: row.version_file_name,
        fileNote: row.version_file_note,
        publishedAt: new Date(row.version_published_at).toISOString()
      },
      totalParticipants,
      respondedParticipants,
      pendingParticipants: Math.max(totalParticipants - respondedParticipants, 0)
    };
  }

  private mapDraftStandard(
    row: DraftStandardRow | DraftStandardListRow
  ): SecretariatDraftStandardRecord {
    return {
      id: row.id,
      code: row.code,
      title: row.title,
      summary: row.summary,
      stage: row.stage,
      responsibleSubcommittee: this.mapDraftStandardResponsibleSubcommittee(row),
      createdAt: new Date(row.created_at).toISOString(),
      updatedAt: new Date(row.updated_at).toISOString()
    };
  }

  private mapDraftStandardVersion(
    row: DraftStandardVersionRow
  ): SecretariatDraftStandardVersionRecord {
    return {
      id: row.id,
      draftStandardId: row.draft_standard_id,
      versionLabel: row.version_label,
      revisionSummary: row.revision_summary,
      fileName: row.file_name,
      fileNote: row.file_note,
      publishedAt: new Date(row.published_at).toISOString(),
      attachmentsCount: Number.parseInt(row.attachments_count, 10)
    };
  }

  private mapReviewAssignment(
    row: ReviewAssignmentRow
  ): SecretariatReviewAssignmentRecord {
    return {
      id: row.id,
      organizationId: row.organization_id,
      organizationName: row.organization_name,
      organizationShortName: row.organization_short_name,
      userId: row.user_id,
      userDisplayName: row.user_display_name,
      userEmail: row.user_email,
      assignedAt: new Date(row.assigned_at).toISOString(),
      respondedAt: row.responded_at ? new Date(row.responded_at).toISOString() : null
    };
  }

  private normalizeDraftStandardPayload(
    payload: CreateDraftStandardDto | UpdateDraftStandardDto
  ): Required<UpdateDraftStandardDto> {
    const code = payload.code.trim();
    const title = payload.title.trim();
    const summary = payload.summary.trim();
    const stage = payload.stage.trim();
    const responsibleSubcommitteeId = payload.responsibleSubcommitteeId.trim();

    if (!code || !title || !summary || !stage || !responsibleSubcommitteeId) {
      throw new BadRequestException(
        "Заполните код, название, краткое описание, стадию проекта стандарта и ответственный подкомитет."
      );
    }

    return {
      code,
      title,
      summary,
      stage,
      responsibleSubcommitteeId
    };
  }

  private normalizeDraftStandardVersionPayload(
    payload: CreateDraftStandardVersionDto
  ): {
    fileName: string;
    fileNote: string;
    publishedAt: Date;
    revisionSummary: string;
    versionLabel: string;
  } {
    const versionLabel = payload.versionLabel.trim();
    const revisionSummary = payload.revisionSummary.trim();
    const fileName = payload.fileName.trim();
    const fileNote = payload.fileNote.trim();
    const publishedAt = this.parseRequiredDate(
      payload.publishedAt,
      "Укажите корректную дату публикации версии."
    );

    if (!versionLabel || !revisionSummary || !fileName || !fileNote) {
      throw new BadRequestException(
        "Заполните метку версии, описание изменений, имя файла и описание файла."
      );
    }

    return {
      versionLabel,
      revisionSummary,
      fileName,
      fileNote,
      publishedAt
    };
  }

  private async normalizeReviewCyclePayload(
    draftStandardId: string,
    payload: CreateReviewCycleDto | UpdateReviewCycleDto,
    fallbackVersionId?: string
  ): Promise<{
    deadlineAt: Date;
    description: string;
    draftStandardVersionId: string;
    opensAt: Date;
    title: string;
  }> {
    const draftStandardVersionId =
      payload.draftStandardVersionId ?? fallbackVersionId ?? null;
    const title = payload.title.trim();
    const description = payload.description.trim();
    const opensAt = this.parseRequiredDate(
      payload.opensAt,
      "Укажите корректную дату начала согласования."
    );
    const deadlineAt = this.parseRequiredDate(
      payload.deadlineAt,
      "Укажите корректный срок согласования."
    );

    if (!draftStandardVersionId) {
      throw new BadRequestException("Выберите версию проекта стандарта для цикла.");
    }

    if (!title || !description) {
      throw new BadRequestException(
        "Заполните название и описание цикла согласования."
      );
    }

    if (deadlineAt.getTime() < opensAt.getTime()) {
      throw new BadRequestException(
        "Срок согласования не может быть раньше даты начала цикла."
      );
    }

    const version = await this.getDraftStandardVersionById(draftStandardVersionId);

    if (version.draft_standard_id !== draftStandardId) {
      throw new BadRequestException(
        "Выбранная версия не относится к указанному проекту стандарта."
      );
    }

    return {
      draftStandardVersionId,
      title,
      description,
      opensAt,
      deadlineAt
    };
  }

  private normalizeCommentPayload(
    payload: CreateReviewCommentDto | UpdateReviewCommentDto
  ): Required<CreateReviewCommentDto> {
    const sectionRef = payload.sectionRef.trim();
    const remark = payload.remark.trim();
    const proposedText = payload.proposedText.trim();
    const rationale = payload.rationale.trim();
    const pointRef = this.normalizeOptionalText(payload.pointRef);
    const pageRef = this.normalizeOptionalText(payload.pageRef);

    if (!sectionRef || !remark || !proposedText || !rationale) {
      throw new BadRequestException(
        "Заполните обязательные поля замечания: раздел, замечание, предлагаемую редакцию и обоснование."
      );
    }

    return {
      sectionRef,
      pointRef,
      pageRef,
      remark,
      proposedText,
      rationale
    };
  }

  private normalizeParticipantPosition(
    payload: SubmitParticipantPositionDto
  ): Required<SubmitParticipantPositionDto> {
    if (!PARTICIPANT_POSITION_VALUES.includes(payload.position)) {
      throw new BadRequestException("Указана недопустимая итоговая позиция.");
    }

    return {
      position: payload.position,
      note: this.normalizeOptionalText(payload.note)
    };
  }

  private normalizeReviewStatusPayload(
    payload: UpdateReviewCommentStatusDto
  ): Required<UpdateReviewCommentStatusDto> {
    const reviewStatus = payload.reviewStatus ?? payload.status;

    if (!reviewStatus || !REVIEW_COMMENT_STATUSES.includes(reviewStatus)) {
      throw new BadRequestException("Указан недопустимый статус рассмотрения.");
    }

    return {
      reviewStatus,
      status: reviewStatus,
      secretariatResponse: this.normalizeOptionalText(payload.secretariatResponse)
    };
  }

  private normalizeVersionFilePayload(
    payload: CreateVersionFileDto | UpdateVersionFileDto,
    fallbackVisibility: ReviewFileVisibility = "ASSIGNED_PARTICIPANTS"
  ): {
    description: string | null;
    visibility: ReviewFileVisibility;
  } {
    const visibility = payload.visibility ?? fallbackVisibility;

    if (!REVIEW_FILE_VISIBILITIES.includes(visibility)) {
      throw new BadRequestException("Указана недопустимая видимость файла.");
    }

    return {
      description: this.normalizeOptionalText(payload.description),
      visibility
    };
  }

  private normalizeAssignmentOrganization(
    organizationId: string,
    participantOrganizationId: string | null
  ): string {
    const normalizedOrganizationId = organizationId.trim();

    if (!normalizedOrganizationId) {
      throw new BadRequestException("Укажите организацию для назначения участника.");
    }

    if (!participantOrganizationId) {
      throw new BadRequestException(
        "У выбранного участника не определена организация."
      );
    }

    if (normalizedOrganizationId !== participantOrganizationId) {
      throw new BadRequestException(
        "Указанная организация не совпадает с организацией выбранного участника."
      );
    }

    return normalizedOrganizationId;
  }

  private normalizeOptionalText(value: string | null | undefined): string | null {
    const trimmed = value?.trim();

    return trimmed ? trimmed : null;
  }

  private parseRequiredDate(value: string, message: string): Date {
    const parsed = new Date(value);

    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException(message);
    }

    return parsed;
  }

  private buildCommentAuditMetadata(comment: {
    pageRef?: string | null;
    pointRef?: string | null;
    proposedText?: string;
    rationale?: string;
    remark?: string;
    sectionRef: string;
  }): Record<string, unknown> {
    return {
      sectionRef: comment.sectionRef,
      pointRef: comment.pointRef ?? null,
      pageRef: comment.pageRef ?? null,
      remark: comment.remark ?? null,
      proposedText: comment.proposedText ?? null,
      rationale: comment.rationale ?? null
    };
  }

  private buildDraftStandardAuditMetadata(draftStandard: {
    code: string;
    responsible_subcommittee_code?: string | null;
    responsible_subcommittee_id?: string | null;
    responsible_subcommittee_title?: string | null;
    stage: string;
    summary: string;
    title: string;
  }): Record<string, unknown> {
    return {
      code: draftStandard.code,
      title: draftStandard.title,
      summary: draftStandard.summary,
      stage: draftStandard.stage,
      responsibleSubcommitteeId: draftStandard.responsible_subcommittee_id ?? null,
      responsibleSubcommitteeCode: draftStandard.responsible_subcommittee_code ?? null,
      responsibleSubcommitteeTitle:
        draftStandard.responsible_subcommittee_title ?? null
    };
  }

  private buildDraftStandardVersionAuditMetadata(version: {
    attachmentsCount: number;
    draftStandardId: string;
    fileName: string;
    fileNote: string;
    publishedAt: string;
    revisionSummary: string;
    versionLabel: string;
  }): Record<string, unknown> {
    return {
      draftStandardId: version.draftStandardId,
      versionLabel: version.versionLabel,
      revisionSummary: version.revisionSummary,
      fileName: version.fileName,
      fileNote: version.fileNote,
      publishedAt: version.publishedAt,
      attachmentsCount: version.attachmentsCount
    };
  }

  private buildReviewCycleAuditMetadata(cycle: {
    deadline_at?: string;
    deadlineAt?: string;
    description: string;
    draft_standard_version_id: string;
    opens_at?: string;
    opensAt?: string;
    status: "draft" | "open" | "closed";
    title: string;
  }): Record<string, unknown> {
    const opensAt = cycle.opensAt ?? cycle.opens_at ?? null;
    const deadlineAt = cycle.deadlineAt ?? cycle.deadline_at ?? null;

    return {
      title: cycle.title,
      description: cycle.description,
      status: cycle.status,
      statusLabel: this.formatReviewCycleStatusLabel(cycle.status),
      draftStandardVersionId: cycle.draft_standard_version_id,
      opensAt: opensAt ? new Date(opensAt).toISOString() : null,
      deadlineAt: deadlineAt ? new Date(deadlineAt).toISOString() : null
    };
  }

  private buildReviewAssignmentAuditMetadata(
    assignment: SecretariatReviewAssignmentRecord
  ): Record<string, unknown> {
    return {
      organizationId: assignment.organizationId,
      organizationName: assignment.organizationName,
      userId: assignment.userId,
      userDisplayName: assignment.userDisplayName,
      userEmail: assignment.userEmail,
      assignedAt: assignment.assignedAt
    };
  }

  private buildVersionFileAuditMetadata(file: {
    description: string | null;
    mimeType: string;
    originalName: string;
    sizeBytes: number;
    versionId: string;
    visibility: ReviewFileVisibility;
  }): Record<string, unknown> {
    return {
      originalName: file.originalName,
      mimeType: file.mimeType,
      sizeBytes: file.sizeBytes,
      description: file.description,
      versionId: file.versionId,
      visibility: file.visibility,
      visibilityLabel: this.formatFileVisibilityLabel(file.visibility)
    };
  }

  private formatCommentLocation(
    sectionRef: string,
    pointRef: string | null,
    pageRef: string | null
  ): string {
    const segments = [`разделу «${sectionRef}»`];

    if (pointRef) {
      segments.push(pointRef);
    }

    if (pageRef) {
      segments.push(`стр. ${pageRef}`);
    }

    return segments.join(", ");
  }

  private formatReviewCommentStatusLabel(status: ReviewCommentStatus): string {
    switch (status) {
      case "RECEIVED":
        return "Получено";
      case "IN_REVIEW":
        return "На рассмотрении";
      case "ACCEPTED":
        return "Принято";
      case "PARTIALLY_ACCEPTED":
        return "Принято частично";
      case "REJECTED":
        return "Отклонено";
      case "NEEDS_CLARIFICATION":
        return "Нужно уточнение";
      default:
        return status;
    }
  }

  private formatParticipantPositionLabel(position: ParticipantPositionValue): string {
    switch (position) {
      case "AGREED":
        return "Согласовано";
      case "AGREED_WITH_COMMENTS":
        return "Согласовано с замечаниями";
      case "NOT_AGREED":
        return "Не согласовано";
      default:
        return position;
    }
  }

  private formatReviewCycleStatusLabel(status: "draft" | "open" | "closed"): string {
    switch (status) {
      case "draft":
        return "Черновик";
      case "open":
        return "Открыт";
      case "closed":
        return "Закрыт";
      default:
        return status;
    }
  }

  private formatFileVisibilityLabel(visibility: ReviewFileVisibility): string {
    switch (visibility) {
      case "ASSIGNED_PARTICIPANTS":
        return "Доступно участникам";
      case "SECRETARIAT_ONLY":
        return "Только секретариат";
      default:
        return visibility;
    }
  }

  private formatDateLabel(value: string | Date): string {
    return new Intl.DateTimeFormat("ru-RU", {
      dateStyle: "medium"
    }).format(new Date(value));
  }

  private buildParticipantCycleRoute(
    cycleId: string,
    draftStandardId: string
  ): string {
    return `/participant/reviews/${cycleId}/${draftStandardId}`;
  }

  private assertCycleIsEditable(
    cycleStatus: "draft" | "open" | "closed",
    deadlineAt: Date
  ): void {
    if (cycleStatus !== "open") {
      throw new ForbiddenException(
        "Изменение данных доступно только для активного цикла согласования."
      );
    }

    if (deadlineAt.getTime() <= Date.now()) {
      throw new ForbiddenException(
        "Срок согласования уже истек. Изменение замечаний и позиции недоступно."
      );
    }
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
