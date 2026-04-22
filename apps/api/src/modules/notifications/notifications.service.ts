import { randomUUID } from "node:crypto";

import { Injectable, NotFoundException } from "@nestjs/common";
import type {
  MarkAllNotificationsReadResponse,
  NotificationRecord,
  NotificationType,
  NotificationUnreadCountDto
} from "@tk182/shared-types";

import { DatabaseService } from "../../common/database/database.service";
import { createModuleStubResponse } from "../../common/stub-response";

interface NotificationRow {
  created_at: string;
  id: string;
  message: string;
  read_at: string | null;
  recipient_user_id: string;
  related_comment_id: string | null;
  related_cycle_id: string | null;
  related_draft_standard_id: string | null;
  related_file_id: string | null;
  target_route: string | null;
  title: string;
  type: NotificationType;
}

interface CreateNotificationInput {
  message: string;
  recipientUserId: string;
  relatedCommentId?: string | null;
  relatedCycleId?: string | null;
  relatedDraftStandardId?: string | null;
  relatedFileId?: string | null;
  targetRoute?: string | null;
  title: string;
  type: NotificationType;
}

@Injectable()
export class NotificationsService {
  constructor(private readonly databaseService: DatabaseService) {}

  getSummary() {
    return {
      ...createModuleStubResponse(
        "notifications",
        ["participant", "secretariat"],
        "Локальные уведомления фиксируют важные изменения по циклам согласования и доступны внутри портала.",
        "Следующий шаг: расширить уведомления на новые циклы, версии и внешние каналы доставки."
      ),
      status: "active" as const
    };
  }

  async createNotification(input: CreateNotificationInput): Promise<void> {
    await this.databaseService.query(
      `
        INSERT INTO notifications (
          id,
          recipient_user_id,
          type,
          title,
          message,
          related_cycle_id,
          related_draft_standard_id,
          related_comment_id,
          related_file_id,
          target_route
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `,
      [
        randomUUID(),
        input.recipientUserId,
        input.type,
        input.title,
        input.message,
        input.relatedCycleId ?? null,
        input.relatedDraftStandardId ?? null,
        input.relatedCommentId ?? null,
        input.relatedFileId ?? null,
        input.targetRoute ?? null
      ]
    );
  }

  async createNotifications(inputs: readonly CreateNotificationInput[]): Promise<void> {
    for (const input of inputs) {
      await this.createNotification(input);
    }
  }

  async listNotificationsForUser(userId: string): Promise<NotificationRecord[]> {
    const result = await this.databaseService.query<NotificationRow>(
      `
        SELECT
          id,
          recipient_user_id,
          created_at,
          read_at,
          type,
          title,
          message,
          related_cycle_id,
          related_draft_standard_id,
          related_comment_id,
          related_file_id,
          target_route
        FROM notifications
        WHERE recipient_user_id = $1
        ORDER BY created_at DESC, id DESC
      `,
      [userId]
    );

    return result.rows.map((row) => this.mapNotification(row));
  }

  async getUnreadCount(userId: string): Promise<NotificationUnreadCountDto> {
    const result = await this.databaseService.query<{ unread_count: string }>(
      `
        SELECT COUNT(*)::text AS unread_count
        FROM notifications
        WHERE recipient_user_id = $1
          AND read_at IS NULL
      `,
      [userId]
    );

    return {
      unreadCount: Number.parseInt(result.rows[0]?.unread_count ?? "0", 10)
    };
  }

  async markNotificationRead(
    userId: string,
    notificationId: string
  ): Promise<NotificationRecord> {
    const result = await this.databaseService.query<NotificationRow>(
      `
        UPDATE notifications
        SET read_at = COALESCE(read_at, NOW())
        WHERE id = $1
          AND recipient_user_id = $2
        RETURNING
          id,
          recipient_user_id,
          created_at,
          read_at,
          type,
          title,
          message,
          related_cycle_id,
          related_draft_standard_id,
          related_comment_id,
          related_file_id,
          target_route
      `,
      [notificationId, userId]
    );
    const row = result.rows[0];

    if (!row) {
      throw new NotFoundException("Уведомление не найдено.");
    }

    return this.mapNotification(row);
  }

  async markAllNotificationsRead(
    userId: string
  ): Promise<MarkAllNotificationsReadResponse> {
    const result = await this.databaseService.query<{ updated_count: string }>(
      `
        WITH updated AS (
          UPDATE notifications
          SET read_at = NOW()
          WHERE recipient_user_id = $1
            AND read_at IS NULL
          RETURNING id
        )
        SELECT COUNT(*)::text AS updated_count
        FROM updated
      `,
      [userId]
    );

    return {
      status: "success",
      message: "Все уведомления отмечены как прочитанные.",
      updatedCount: Number.parseInt(result.rows[0]?.updated_count ?? "0", 10)
    };
  }

  private mapNotification(row: NotificationRow): NotificationRecord {
    return {
      id: row.id,
      recipientUserId: row.recipient_user_id,
      createdAt: new Date(row.created_at).toISOString(),
      readAt: row.read_at ? new Date(row.read_at).toISOString() : null,
      type: row.type,
      title: row.title,
      message: row.message,
      relatedCycleId: row.related_cycle_id,
      relatedDraftStandardId: row.related_draft_standard_id,
      relatedCommentId: row.related_comment_id,
      relatedFileId: row.related_file_id,
      targetRoute: row.target_route
    };
  }
}
