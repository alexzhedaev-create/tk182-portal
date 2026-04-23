import { randomUUID } from "node:crypto";

import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import type {
  ApprovalAuditEvent,
  AuditActionType,
  AuditEntityType,
  AuthRole
} from "@tk182/shared-types";

import { DatabaseService } from "../../common/database/database.service";
import { createModuleStubResponse } from "../../common/stub-response";

interface AuditActorSnapshotRow {
  display_name: string;
  role: AuthRole;
}

interface AuditEventRow {
  action_type: AuditActionType;
  actor_display_name: string;
  actor_role: AuthRole;
  actor_user_id: string;
  created_at: string;
  entity_id: string;
  entity_type: AuditEntityType;
  id: string;
  message: string;
  metadata_json: Record<string, unknown> | null;
  related_comment_id: string | null;
  related_cycle_id: string | null;
  related_draft_standard_id: string | null;
  related_file_id: string | null;
}

interface AuditEventFilters {
  actionType?: string | undefined;
  actorUserId?: string | undefined;
  entityType?: string | undefined;
}

interface RecordAuditEventInput {
  actionType: AuditActionType;
  actorUserId: string;
  entityId: string;
  entityType: AuditEntityType;
  message: string;
  metadata?: Record<string, unknown> | null;
  relatedCommentId?: string | null;
  relatedCycleId?: string | null;
  relatedDraftStandardId?: string | null;
  relatedFileId?: string | null;
}

@Injectable()
export class AuditService {
  constructor(
    @Inject(DatabaseService)
    private readonly databaseService: DatabaseService
  ) {}

  getSummary() {
    return {
      ...createModuleStubResponse(
        "audit",
        ["secretariat"],
        "Журнал изменений фиксирует ключевые действия участников и секретариата по циклам согласования.",
        "Следующий шаг: расширить аудит на публикацию материалов, уведомления и административные операции."
      ),
      status: "active" as const
    };
  }

  async recordEvent(input: RecordAuditEventInput): Promise<void> {
    const actor = await this.getActorSnapshot(input.actorUserId);

    await this.databaseService.query(
      `
        INSERT INTO audit_events (
          id,
          actor_user_id,
          actor_role,
          actor_display_name,
          action_type,
          entity_type,
          entity_id,
          related_cycle_id,
          related_draft_standard_id,
          related_comment_id,
          related_file_id,
          message,
          metadata_json
        )
        VALUES (
          $1,
          $2,
          $3,
          $4,
          $5,
          $6,
          $7,
          $8,
          $9,
          $10,
          $11,
          $12,
          $13::jsonb
        )
      `,
      [
        randomUUID(),
        input.actorUserId,
        actor.role,
        actor.display_name,
        input.actionType,
        input.entityType,
        input.entityId,
        input.relatedCycleId ?? null,
        input.relatedDraftStandardId ?? null,
        input.relatedCommentId ?? null,
        input.relatedFileId ?? null,
        input.message,
        input.metadata ? JSON.stringify(input.metadata) : null
      ]
    );
  }

  listReviewCycleEvents(
    cycleId: string,
    filters: AuditEventFilters = {}
  ): Promise<ApprovalAuditEvent[]> {
    return this.listEvents("related_cycle_id = $1", [cycleId], filters);
  }

  listDraftStandardEvents(
    draftStandardId: string,
    filters: AuditEventFilters = {}
  ): Promise<ApprovalAuditEvent[]> {
    return this.listEvents("related_draft_standard_id = $1", [draftStandardId], filters);
  }

  listCommitteeEvents(
    filters: AuditEventFilters = {}
  ): Promise<ApprovalAuditEvent[]> {
    return this.listEvents(
      "entity_type = ANY($1::text[])",
      [[
        "COMMITTEE_ORGANIZATION",
        "COMMITTEE_PERSON",
        "COMMITTEE_ROLE_ASSIGNMENT",
        "SUBCOMMITTEE"
      ]],
      filters
    );
  }

  listContentEvents(
    filters: AuditEventFilters = {}
  ): Promise<ApprovalAuditEvent[]> {
    return this.listEvents(
      "entity_type = ANY($1::text[])",
      [[
        "NEWS_ITEM",
        "PUBLIC_DOCUMENT",
        "MEETING_RECORD",
        "APPROVED_STANDARD",
        "LEGACY_CONTENT_INVENTORY"
      ]],
      filters
    );
  }

  private async listEvents(
    baseCondition: string,
    baseValues: readonly unknown[],
    filters: AuditEventFilters
  ): Promise<ApprovalAuditEvent[]> {
    const conditions = [baseCondition];
    const values = [...baseValues];

    if (filters.actionType) {
      values.push(filters.actionType);
      conditions.push(`action_type = $${values.length}`);
    }

    if (filters.entityType) {
      values.push(filters.entityType);
      conditions.push(`entity_type = $${values.length}`);
    }

    if (filters.actorUserId) {
      values.push(filters.actorUserId);
      conditions.push(`actor_user_id = $${values.length}`);
    }

    const result = await this.databaseService.query<AuditEventRow>(
      `
        SELECT
          id,
          created_at,
          actor_user_id,
          actor_role,
          actor_display_name,
          action_type,
          entity_type,
          entity_id,
          related_cycle_id,
          related_draft_standard_id,
          related_comment_id,
          related_file_id,
          message,
          metadata_json
        FROM audit_events
        WHERE ${conditions.join("\n          AND ")}
        ORDER BY created_at DESC, id DESC
      `,
      values
    );

    return result.rows.map((row) => ({
      id: row.id,
      timestamp: new Date(row.created_at).toISOString(),
      actorUserId: row.actor_user_id,
      actorRole: row.actor_role,
      actorDisplayName: row.actor_display_name,
      actionType: row.action_type,
      entityType: row.entity_type,
      entityId: row.entity_id,
      relatedCycleId: row.related_cycle_id,
      relatedDraftStandardId: row.related_draft_standard_id,
      relatedCommentId: row.related_comment_id,
      relatedFileId: row.related_file_id,
      message: row.message,
      metadata: row.metadata_json
    }));
  }

  private async getActorSnapshot(userId: string): Promise<AuditActorSnapshotRow> {
    const result = await this.databaseService.query<AuditActorSnapshotRow>(
      `
        SELECT
          display_name,
          role
        FROM users
        WHERE id = $1
        LIMIT 1
      `,
      [userId]
    );
    const actor = result.rows[0];

    if (!actor) {
      throw new NotFoundException("Пользователь для записи аудита не найден.");
    }

    return actor;
  }
}
