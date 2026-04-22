import { randomUUID } from "node:crypto";

import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import type {
  CreateVersionFileDto,
  CreateReviewCommentDto,
  MutationResponseDto,
  ParticipantAssignedReviewCycle,
  ParticipantDraftStandardCard,
  ParticipantPositionRecord,
  ParticipantPositionValue,
  ReviewAttachmentSummary,
  ReviewCommentRecord,
  ReviewCommentStatus,
  ReviewFileVisibility,
  SecretariatCycleDetail,
  SecretariatParticipantResponse,
  SecretariatReviewCycleListItem,
  SubmitParticipantPositionDto,
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
  draft_standard_id: string;
  page_ref: string | null;
  point_ref: string | null;
  review_cycle_id: string;
  review_status: ReviewCommentStatus;
  secretariat_response: string | null;
  section_ref: string;
}

interface VersionFileDownloadPayload {
  contentDisposition: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  streamPath: string;
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
    private readonly databaseService: DatabaseService,
    private readonly approvalFileStorageService: ApprovalFileStorageService,
    private readonly auditService: AuditService
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
          dsv.id AS version_id,
          dsv.version_label,
          dsv.revision_summary AS version_revision_summary,
          dsv.file_name AS version_file_name,
          dsv.file_note AS version_file_note,
          dsv.published_at AS version_published_at
        FROM review_assignments ra
        INNER JOIN review_cycles rc ON rc.id = ra.review_cycle_id
        INNER JOIN draft_standards ds ON ds.id = rc.draft_standard_id
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
        INNER JOIN draft_standard_versions dsv ON dsv.id = rc.draft_standard_version_id
        LEFT JOIN review_assignments ra ON ra.review_cycle_id = rc.id
        LEFT JOIN participant_positions pp ON pp.review_assignment_id = ra.id
        GROUP BY
          rc.id,
          ds.id,
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
    const cycle = await this.getSecretariatCycle(cycleId);
    const participants = await this.getSecretariatParticipants(cycleId);
    const comments = await this.getSecretariatComments(cycleId);
    const versionFiles = await this.listSecretariatVersionFiles(cycle.currentVersion.id);

    return {
      cycle,
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
    }

    if (comment.secretariat_response !== updatedComment.secretariatResponse) {
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
    }

    return updatedComment;
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
          dsv.id AS version_id,
          dsv.version_label,
          dsv.revision_summary AS version_revision_summary,
          dsv.file_name AS version_file_name,
          dsv.file_note AS version_file_note,
          dsv.published_at AS version_published_at
        FROM review_assignments ra
        INNER JOIN review_cycles rc ON rc.id = ra.review_cycle_id
        INNER JOIN draft_standards ds ON ds.id = rc.draft_standard_id
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
        INNER JOIN draft_standard_versions dsv ON dsv.id = rc.draft_standard_version_id
        LEFT JOIN review_assignments ra ON ra.review_cycle_id = rc.id
        LEFT JOIN participant_positions pp ON pp.review_assignment_id = ra.id
        WHERE rc.id = $1
        GROUP BY
          rc.id,
          ds.id,
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
        stage: row.draft_standard_stage
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
        stage: row.draft_standard_stage
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
        stage: row.draft_standard_stage
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

  private normalizeOptionalText(value: string | null | undefined): string | null {
    const trimmed = value?.trim();

    return trimmed ? trimmed : null;
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
}
