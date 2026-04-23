import { randomUUID } from "node:crypto";

import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import type {
  BackofficeApprovedStandardRecord,
  BackofficeContentListFilters,
  BackofficeMeetingRecord,
  BackofficeNewsItemRecord,
  BackofficePublicDocumentRecord,
  ApprovedStandardRecord,
  ContentFileAttachment,
  ContentMigrationInfo,
  ContentMigrationStatus,
  CreateApprovedStandardDto,
  CreateLegacyContentInventoryDto,
  CreateMeetingRecordDto,
  CreateNewsItemDto,
  CreatePortalDraftFromInventoryResult,
  CreatePublicDocumentDto,
  LegacyContentInventoryFilters,
  LegacyContentInventoryRecord,
  LegacyContentInventoryStatus,
  LegacyContentSection,
  LinkedPortalEntityReference,
  LinkedPortalEntityType,
  MeetingRecord,
  MeetingsPageData,
  MeetingRecordCategory,
  NewsItemRecord,
  PublicDocumentCategory,
  PublicDocumentsFilters,
  PublicDocumentRecord,
  PublicDocumentsPageData,
  PublicMeetingsFilters,
  PublicNewsFilters,
  PublicStandardsFilters,
  PublicStandardsSection,
  StandardsPageData,
  UpdateApprovedStandardDto,
  UpdateLegacyContentInventoryDto,
  UpdateMeetingRecordDto,
  UpdateNewsItemDto,
  UpdatePublicDocumentDto
} from "@tk182/shared-types";

import { DatabaseService } from "../../common/database/database.service";
import { buildDownloadContentDisposition } from "../../common/storage/local-file-storage";
import { AuditService } from "../audit/audit.service";
import type { SavedContentFile, UploadedBinaryFile } from "./content-file-storage.service";
import { ContentFileStorageService } from "./content-file-storage.service";

type PublicationStatus = "draft" | "published";

type ContentEntityType = "news" | "document" | "meeting" | "approved-standard";

const PUBLIC_DOCUMENT_CATEGORY_ORDER: readonly PublicDocumentCategory[] = [
  "MAIN_DOCUMENTS",
  "WORK_REPORTS",
  "WORK_PLANS",
  "NATIONAL_STANDARDS_PROGRAM"
];

const MEETING_CATEGORY_ORDER: readonly MeetingRecordCategory[] = [
  "MEETING_AGENDA",
  "MEETING_MINUTES"
];

const PUBLIC_STANDARDS_SECTIONS: readonly PublicStandardsSection[] = [
  "DRAFT_STANDARDS",
  "APPROVED_STANDARDS",
  "NATIONAL_STANDARDS_PROGRAM"
];

const MIGRATION_STATUSES: readonly ContentMigrationStatus[] = [
  "NOT_IMPORTED",
  "IMPORTED",
  "VERIFIED"
];

const LEGACY_CONTENT_INVENTORY_STATUSES: readonly LegacyContentInventoryStatus[] = [
  "FOUND",
  "CREATED_IN_PORTAL",
  "VERIFIED",
  "SKIPPED"
];

const LINKED_PORTAL_ENTITY_TYPES: readonly LinkedPortalEntityType[] = [
  "NEWS_ITEM",
  "PUBLIC_DOCUMENT",
  "MEETING_RECORD",
  "APPROVED_STANDARD"
];

const LEGACY_CONTENT_SECTIONS: readonly LegacyContentSection[] = [
  "NEWS",
  "MAIN_DOCUMENTS",
  "WORK_REPORTS",
  "WORK_PLANS",
  "NATIONAL_STANDARDS_PROGRAM",
  "MEETING_MINUTES",
  "MEETING_AGENDA",
  "APPROVED_STANDARDS"
];

const NEWS_LEGACY_SECTIONS: readonly LegacyContentSection[] = ["NEWS"];
const DOCUMENT_LEGACY_SECTIONS: readonly LegacyContentSection[] = [
  "MAIN_DOCUMENTS",
  "WORK_REPORTS",
  "WORK_PLANS",
  "NATIONAL_STANDARDS_PROGRAM"
];
const MEETING_LEGACY_SECTIONS: readonly LegacyContentSection[] = [
  "MEETING_AGENDA",
  "MEETING_MINUTES"
];
const APPROVED_STANDARD_LEGACY_SECTIONS: readonly LegacyContentSection[] = [
  "APPROVED_STANDARDS"
];

interface MigrationColumns {
  legacy_section: LegacyContentSection;
  legacy_source_url: string | null;
  migration_note: string | null;
  migration_status: ContentMigrationStatus;
}

interface FileColumns {
  file_description: string | null;
  file_mime_type: string | null;
  file_original_name: string | null;
  file_size_bytes: string | number | null;
  file_stored_name: string | null;
  file_uploaded_at: string | null;
  file_uploaded_by_user_id: string | null;
  file_uploaded_by_display_name: string | null;
}

interface NewsRow extends MigrationColumns {
  body: string;
  id: string;
  excerpt: string;
  publication_date: string;
  published_at: string | null;
  status: PublicationStatus;
  title: string;
}

interface PublicDocumentRow extends FileColumns, MigrationColumns {
  body: string | null;
  category: PublicDocumentCategory;
  id: string;
  publication_date: string | null;
  published_at: string | null;
  status: PublicationStatus;
  summary: string;
  title: string;
}

interface MeetingRow extends FileColumns, MigrationColumns {
  body: string;
  category: MeetingRecordCategory;
  id: string;
  location: string | null;
  meeting_date: string;
  publication_date: string;
  published_at: string | null;
  status: PublicationStatus;
  summary: string;
  title: string;
}

interface ApprovedStandardRow extends FileColumns, MigrationColumns {
  approval_date: string;
  code: string;
  id: string;
  publication_date: string;
  published_at: string | null;
  responsible_subcommittee_code: string | null;
  responsible_subcommittee_host_country_code: string | null;
  responsible_subcommittee_host_id: string | null;
  responsible_subcommittee_host_name: string | null;
  responsible_subcommittee_host_short_name: string | null;
  responsible_subcommittee_id: string | null;
  responsible_subcommittee_title: string | null;
  status: PublicationStatus;
  summary: string;
  title: string;
}

interface StoredAttachmentInfo extends ContentFileAttachment {
  storedName: string;
  uploadedByUserId: string | null;
}

interface LegacyContentInventoryRow {
  id: string;
  legacy_section: LegacyContentSection;
  legacy_title: string;
  legacy_url: string | null;
  legacy_date: string | null;
  legacy_type: string | null;
  migration_status: LegacyContentInventoryStatus;
  migration_note: string | null;
  linked_portal_entity_type: LinkedPortalEntityType | null;
  linked_portal_entity_id: string | null;
  linked_portal_title: string | null;
}

interface NormalizedLegacyContentInventoryPayload {
  legacyDate: string | null;
  legacySection: LegacyContentSection;
  legacyTitle: string;
  legacyType: string | null;
  legacyUrl: string | null;
  linkedPortalRecord: LinkedPortalEntityReference | null;
  migrationNote: string | null;
  migrationStatus: LegacyContentInventoryStatus;
}

export interface ContentDownload {
  contentDisposition: string;
  mimeType: string;
  sizeBytes: number;
  streamPath: string;
}

@Injectable()
export class ContentService {
  constructor(
    @Inject(DatabaseService)
    private readonly databaseService: DatabaseService,
    @Inject(AuditService)
    private readonly auditService: AuditService,
    @Inject(ContentFileStorageService)
    private readonly contentFileStorageService: ContentFileStorageService
  ) {}

  async listPublishedNewsItems(
    filters: PublicNewsFilters = {}
  ): Promise<NewsItemRecord[]> {
    const conditions = ["status = 'published'"];
    const values: unknown[] = [];

    this.appendPublicNewsFilters(conditions, values, filters);

    const result = await this.databaseService.query<NewsRow>(
      `
        SELECT
          id,
          title,
          excerpt,
          body,
          status,
          publication_date,
          published_at,
          legacy_source_url,
          legacy_section,
          migration_status,
          migration_note
        FROM news_items
        WHERE ${conditions.join(" AND ")}
        ORDER BY publication_date DESC, created_at DESC
      `,
      values
    );

    return result.rows.map((row) => this.mapNewsItem(row));
  }

  async getPublishedNewsItem(newsId: string): Promise<NewsItemRecord> {
    const result = await this.databaseService.query<NewsRow>(
      `
        SELECT
          id,
          title,
          excerpt,
          body,
          status,
          publication_date,
          published_at,
          legacy_source_url,
          legacy_section,
          migration_status,
          migration_note
        FROM news_items
        WHERE id = $1
          AND status = 'published'
        LIMIT 1
      `,
      [newsId]
    );
    const row = result.rows[0];

    if (!row) {
      throw new NotFoundException("Новость не найдена.");
    }

    return this.mapNewsItem(row);
  }

  async listBackofficeNewsItems(
    filters: BackofficeContentListFilters = {}
  ): Promise<BackofficeNewsItemRecord[]> {
    const whereClause = this.buildMigrationWhereClause(filters, "news_items");
    const result = await this.databaseService.query<NewsRow>(
      `
        SELECT
          id,
          title,
          excerpt,
          body,
          status,
          publication_date,
          published_at,
          legacy_source_url,
          legacy_section,
          migration_status,
          migration_note
        FROM news_items
        ${whereClause.sql}
        ORDER BY publication_date DESC, created_at DESC
      `,
      whereClause.values
    );

    return result.rows.map((row) => this.mapBackofficeNewsItem(row));
  }

  async createNewsItem(
    userId: string,
    payload: CreateNewsItemDto
  ): Promise<BackofficeNewsItemRecord> {
    const normalized = this.normalizeNewsPayload(payload);
    const newsId = `news-item-${randomUUID()}`;

    await this.databaseService.query(
      `
        INSERT INTO news_items (
          id,
          title,
          excerpt,
          body,
          status,
          publication_date,
          legacy_source_url,
          legacy_section,
          migration_status,
          migration_note,
          created_by_user_id,
          updated_by_user_id,
          updated_at
        )
        VALUES ($1, $2, $3, $4, 'draft', $5, $6, $7, $8, $9, $10, $10, NOW())
      `,
      [
        newsId,
        normalized.title,
        normalized.excerpt,
        normalized.body,
        normalized.publicationDate,
        normalized.legacySourceUrl,
        normalized.legacySection,
        normalized.migrationStatus,
        normalized.migrationNote,
        userId
      ]
    );

    const item = await this.getBackofficeNewsItemById(newsId);

    await this.auditService.recordEvent({
      actorUserId: userId,
      actionType: "NEWS_ITEM_CREATED",
      entityType: "NEWS_ITEM",
      entityId: newsId,
      message: `Создана новость «${item.title}».`,
      metadata: {
        title: item.title,
        publicationDate: item.publicationDate,
        status: item.status,
        migrationStatus: item.migration.migrationStatus,
        legacySection: item.migration.legacySection,
        legacySourceUrl: item.migration.legacySourceUrl
      }
    });

    return item;
  }

  async updateNewsItem(
    userId: string,
    newsId: string,
    payload: UpdateNewsItemDto
  ): Promise<BackofficeNewsItemRecord> {
    const normalized = this.normalizeNewsPayload(payload);
    await this.assertNewsItemExists(newsId);

    await this.databaseService.query(
      `
        UPDATE news_items
        SET
          title = $2,
          excerpt = $3,
          body = $4,
          publication_date = $5,
          legacy_source_url = $6,
          legacy_section = $7,
          migration_status = $8,
          migration_note = $9,
          updated_by_user_id = $10,
          updated_at = NOW()
        WHERE id = $1
      `,
      [
        newsId,
        normalized.title,
        normalized.excerpt,
        normalized.body,
        normalized.publicationDate,
        normalized.legacySourceUrl,
        normalized.legacySection,
        normalized.migrationStatus,
        normalized.migrationNote,
        userId
      ]
    );

    const item = await this.getBackofficeNewsItemById(newsId);

    await this.auditService.recordEvent({
      actorUserId: userId,
      actionType: "NEWS_ITEM_UPDATED",
      entityType: "NEWS_ITEM",
      entityId: newsId,
      message: `Обновлена новость «${item.title}».`,
      metadata: {
        title: item.title,
        publicationDate: item.publicationDate,
        status: item.status,
        migrationStatus: item.migration.migrationStatus,
        legacySection: item.migration.legacySection,
        legacySourceUrl: item.migration.legacySourceUrl
      }
    });

    return item;
  }

  async publishNewsItem(
    userId: string,
    newsId: string
  ): Promise<BackofficeNewsItemRecord> {
    const item = await this.setNewsStatus(newsId, userId, "published");

    await this.auditService.recordEvent({
      actorUserId: userId,
      actionType: "NEWS_ITEM_PUBLISHED",
      entityType: "NEWS_ITEM",
      entityId: newsId,
      message: `Опубликована новость «${item.title}».`,
      metadata: {
        title: item.title,
        publicationDate: item.publicationDate,
        status: item.status,
        migrationStatus: item.migration.migrationStatus,
        legacySection: item.migration.legacySection,
        legacySourceUrl: item.migration.legacySourceUrl
      }
    });

    return item;
  }

  async unpublishNewsItem(
    userId: string,
    newsId: string
  ): Promise<BackofficeNewsItemRecord> {
    const item = await this.setNewsStatus(newsId, userId, "draft");

    await this.auditService.recordEvent({
      actorUserId: userId,
      actionType: "NEWS_ITEM_UNPUBLISHED",
      entityType: "NEWS_ITEM",
      entityId: newsId,
      message: `Снята с публикации новость «${item.title}».`,
      metadata: {
        title: item.title,
        publicationDate: item.publicationDate,
        status: item.status,
        migrationStatus: item.migration.migrationStatus,
        legacySection: item.migration.legacySection,
        legacySourceUrl: item.migration.legacySourceUrl
      }
    });

    return item;
  }

  async listPublishedPublicDocumentsByCategories(
    categories: readonly PublicDocumentCategory[],
    filters: PublicDocumentsFilters = {}
  ): Promise<PublicDocumentRecord[]> {
    const rows = await this.listPublicDocumentRows(true, categories, undefined, filters);
    return rows.map((row) => this.mapPublicDocument(row));
  }

  async getPublicDocumentsPageData(
    filters: PublicDocumentsFilters = {}
  ): Promise<PublicDocumentsPageData> {
    const selectedCategory = filters.category
      ? this.parseDocumentCategory(filters.category)
      : null;
    const visibleCategories = PUBLIC_DOCUMENT_CATEGORY_ORDER.filter(
      (category) =>
        category !== "NATIONAL_STANDARDS_PROGRAM" &&
        (!selectedCategory || category === selectedCategory)
    );
    const rows = await this.listPublicDocumentRows(
      true,
      visibleCategories,
      undefined,
      filters
    );

    return {
      sections: visibleCategories.map((category) => ({
        category,
        documents: rows
          .filter((row) => row.category === category)
          .map((row) => this.mapPublicDocument(row))
      }))
    };
  }

  async listBackofficePublicDocuments(
    filters: BackofficeContentListFilters = {}
  ): Promise<BackofficePublicDocumentRecord[]> {
    const rows = await this.listPublicDocumentRows(false, undefined, filters);
    return rows.map((row) => this.mapBackofficePublicDocument(row));
  }

  async createPublicDocument(
    userId: string,
    payload: CreatePublicDocumentDto,
    file?: UploadedBinaryFile
  ): Promise<BackofficePublicDocumentRecord> {
    const normalized = this.normalizePublicDocumentPayload(payload);
    const documentId = `public-document-${randomUUID()}`;
    const savedFile = file ? await this.contentFileStorageService.saveUploadedFile(file) : null;

    try {
      await this.databaseService.query(
        `
          INSERT INTO public_documents (
            id,
            title,
            category,
            summary,
            body,
            status,
            publication_date,
            file_original_name,
            file_stored_name,
            file_mime_type,
            file_size_bytes,
            file_uploaded_at,
            file_uploaded_by_user_id,
            file_description,
            legacy_source_url,
            legacy_section,
            migration_status,
            migration_note,
            created_by_user_id,
            updated_by_user_id,
            updated_at
          )
          VALUES (
            $1, $2, $3, $4, $5, 'draft', $6,
            $7, $8, $9, $10, $11, $12, $13,
            $14, $15, $16, $17, $18, $18, NOW()
          )
        `,
        [
          documentId,
          normalized.title,
          normalized.category,
          normalized.summary,
          normalized.body,
          normalized.publicationDate,
          savedFile?.originalName ?? null,
          savedFile?.storedName ?? null,
          savedFile?.mimeType ?? null,
          savedFile?.sizeBytes ?? null,
          savedFile ? new Date().toISOString() : null,
          savedFile ? userId : null,
          savedFile ? normalized.fileDescription : null,
          normalized.legacySourceUrl,
          normalized.legacySection,
          normalized.migrationStatus,
          normalized.migrationNote,
          userId
        ]
      );
    } catch (error) {
      await this.contentFileStorageService.deleteStoredFile(savedFile?.storedName);
      throw error;
    }

    const document = await this.getBackofficePublicDocumentById(documentId);

    await this.auditService.recordEvent({
      actorUserId: userId,
      actionType: "PUBLIC_DOCUMENT_CREATED",
      entityType: "PUBLIC_DOCUMENT",
      entityId: documentId,
      message: `Создан публичный документ «${document.title}».`,
      metadata: this.buildDocumentAuditMetadata(document)
    });

    return document;
  }

  async updatePublicDocument(
    userId: string,
    documentId: string,
    payload: UpdatePublicDocumentDto,
    file?: UploadedBinaryFile
  ): Promise<BackofficePublicDocumentRecord> {
    const existing = await this.getStoredPublicDocumentById(documentId);
    const normalized = this.normalizePublicDocumentPayload(payload);
    const savedFile = file ? await this.contentFileStorageService.saveUploadedFile(file) : null;

    try {
      await this.databaseService.query(
        `
          UPDATE public_documents
          SET
            title = $2,
            category = $3,
            summary = $4,
            body = $5,
            publication_date = $6,
            file_original_name = $7,
            file_stored_name = $8,
            file_mime_type = $9,
            file_size_bytes = $10,
            file_uploaded_at = $11,
            file_uploaded_by_user_id = $12,
            file_description = $13,
            legacy_source_url = $14,
            legacy_section = $15,
            migration_status = $16,
            migration_note = $17,
            updated_by_user_id = $18,
            updated_at = NOW()
          WHERE id = $1
        `,
        [
          documentId,
          normalized.title,
          normalized.category,
          normalized.summary,
          normalized.body,
          normalized.publicationDate,
          savedFile?.originalName ?? existing.attachment?.originalName ?? null,
          savedFile?.storedName ?? existing.attachment?.storedName ?? null,
          savedFile?.mimeType ?? existing.attachment?.mimeType ?? null,
          savedFile?.sizeBytes ?? existing.attachment?.sizeBytes ?? null,
          savedFile?.uploadedAt ?? existing.attachment?.uploadedAt ?? null,
          savedFile ? userId : existing.attachment?.uploadedByUserId ?? null,
          savedFile
            ? normalized.fileDescription
            : existing.attachment
              ? normalized.fileDescription
              : null,
          normalized.legacySourceUrl,
          normalized.legacySection,
          normalized.migrationStatus,
          normalized.migrationNote,
          userId
        ]
      );
    } catch (error) {
      await this.contentFileStorageService.deleteStoredFile(savedFile?.storedName);
      throw error;
    }

    if (savedFile && existing.attachment?.storedName) {
      await this.contentFileStorageService.deleteStoredFile(existing.attachment.storedName);
    }

    const document = await this.getBackofficePublicDocumentById(documentId);

    await this.auditService.recordEvent({
      actorUserId: userId,
      actionType: "PUBLIC_DOCUMENT_UPDATED",
      entityType: "PUBLIC_DOCUMENT",
      entityId: documentId,
      message: `Обновлен публичный документ «${document.title}».`,
      metadata: this.buildDocumentAuditMetadata(document)
    });

    return document;
  }

  async publishPublicDocument(
    userId: string,
    documentId: string
  ): Promise<BackofficePublicDocumentRecord> {
    const document = await this.setPublicDocumentStatus(documentId, userId, "published");

    await this.auditService.recordEvent({
      actorUserId: userId,
      actionType: "PUBLIC_DOCUMENT_PUBLISHED",
      entityType: "PUBLIC_DOCUMENT",
      entityId: documentId,
      message: `Опубликован публичный документ «${document.title}».`,
      metadata: this.buildDocumentAuditMetadata(document)
    });

    return document;
  }

  async unpublishPublicDocument(
    userId: string,
    documentId: string
  ): Promise<BackofficePublicDocumentRecord> {
    const document = await this.setPublicDocumentStatus(documentId, userId, "draft");

    await this.auditService.recordEvent({
      actorUserId: userId,
      actionType: "PUBLIC_DOCUMENT_UNPUBLISHED",
      entityType: "PUBLIC_DOCUMENT",
      entityId: documentId,
      message: `Снят с публикации документ «${document.title}».`,
      metadata: this.buildDocumentAuditMetadata(document)
    });

    return document;
  }

  async getPublicDocumentDownload(documentId: string): Promise<ContentDownload> {
    const document = await this.getStoredPublicDocumentById(documentId, true);
    return this.buildDownload(document.attachment);
  }

  async getPublicDocument(documentId: string): Promise<PublicDocumentRecord> {
    const stored = await this.getStoredPublicDocumentById(documentId, true);
    return this.stripStoredDocument(stored);
  }

  async getBackofficePublicDocumentDownload(documentId: string): Promise<ContentDownload> {
    const document = await this.getStoredPublicDocumentById(documentId);
    return this.buildDownload(document.attachment);
  }

  async getMeetingsPageData(
    filters: PublicMeetingsFilters = {}
  ): Promise<MeetingsPageData> {
    const selectedCategory = filters.category
      ? this.parseMeetingCategory(filters.category)
      : null;
    const visibleCategories = MEETING_CATEGORY_ORDER.filter(
      (category) => !selectedCategory || category === selectedCategory
    );
    const rows = await this.listMeetingRows(true, undefined, filters);

    return {
      sections: visibleCategories.map((category) => ({
        category,
        meetings: rows
          .filter((row) => row.category === category)
          .map((row) => this.mapMeeting(row))
      }))
    };
  }

  async listBackofficeMeetingRecords(
    filters: BackofficeContentListFilters = {}
  ): Promise<BackofficeMeetingRecord[]> {
    const rows = await this.listMeetingRows(false, filters);
    return rows.map((row) => this.mapBackofficeMeeting(row));
  }

  async createMeetingRecord(
    userId: string,
    payload: CreateMeetingRecordDto,
    file?: UploadedBinaryFile
  ): Promise<BackofficeMeetingRecord> {
    const normalized = this.normalizeMeetingPayload(payload);
    const meetingId = `meeting-record-${randomUUID()}`;
    const savedFile = file ? await this.contentFileStorageService.saveUploadedFile(file) : null;

    try {
      await this.databaseService.query(
        `
          INSERT INTO meeting_records (
            id,
            title,
            category,
            summary,
            body,
            location,
            meeting_date,
            status,
            publication_date,
            file_original_name,
            file_stored_name,
            file_mime_type,
            file_size_bytes,
            file_uploaded_at,
            file_uploaded_by_user_id,
            file_description,
            legacy_source_url,
            legacy_section,
            migration_status,
            migration_note,
            created_by_user_id,
            updated_by_user_id,
            updated_at
          )
          VALUES (
            $1, $2, $3, $4, $5, $6, $7, 'draft', $8,
            $9, $10, $11, $12, $13, $14, $15,
            $16, $17, $18, $19, $20, $20, NOW()
          )
        `,
        [
          meetingId,
          normalized.title,
          normalized.category,
          normalized.summary,
          normalized.body,
          normalized.location,
          normalized.meetingDate,
          normalized.publicationDate,
          savedFile?.originalName ?? null,
          savedFile?.storedName ?? null,
          savedFile?.mimeType ?? null,
          savedFile?.sizeBytes ?? null,
          savedFile ? new Date().toISOString() : null,
          savedFile ? userId : null,
          savedFile ? normalized.fileDescription : null,
          normalized.legacySourceUrl,
          normalized.legacySection,
          normalized.migrationStatus,
          normalized.migrationNote,
          userId
        ]
      );
    } catch (error) {
      await this.contentFileStorageService.deleteStoredFile(savedFile?.storedName);
      throw error;
    }

    const meeting = await this.getBackofficeMeetingRecordById(meetingId);

    await this.auditService.recordEvent({
      actorUserId: userId,
      actionType: "MEETING_RECORD_CREATED",
      entityType: "MEETING_RECORD",
      entityId: meetingId,
      message: `Создана запись заседания «${meeting.title}».`,
      metadata: this.buildMeetingAuditMetadata(meeting)
    });

    return meeting;
  }

  async updateMeetingRecord(
    userId: string,
    meetingId: string,
    payload: UpdateMeetingRecordDto,
    file?: UploadedBinaryFile
  ): Promise<BackofficeMeetingRecord> {
    const existing = await this.getStoredMeetingRecordById(meetingId);
    const normalized = this.normalizeMeetingPayload(payload);
    const savedFile = file ? await this.contentFileStorageService.saveUploadedFile(file) : null;

    try {
      await this.databaseService.query(
        `
          UPDATE meeting_records
          SET
            title = $2,
            category = $3,
            summary = $4,
            body = $5,
            location = $6,
            meeting_date = $7,
            publication_date = $8,
            file_original_name = $9,
            file_stored_name = $10,
            file_mime_type = $11,
            file_size_bytes = $12,
            file_uploaded_at = $13,
            file_uploaded_by_user_id = $14,
            file_description = $15,
            legacy_source_url = $16,
            legacy_section = $17,
            migration_status = $18,
            migration_note = $19,
            updated_by_user_id = $20,
            updated_at = NOW()
          WHERE id = $1
        `,
        [
          meetingId,
          normalized.title,
          normalized.category,
          normalized.summary,
          normalized.body,
          normalized.location,
          normalized.meetingDate,
          normalized.publicationDate,
          savedFile?.originalName ?? existing.attachment?.originalName ?? null,
          savedFile?.storedName ?? existing.attachment?.storedName ?? null,
          savedFile?.mimeType ?? existing.attachment?.mimeType ?? null,
          savedFile?.sizeBytes ?? existing.attachment?.sizeBytes ?? null,
          savedFile?.uploadedAt ?? existing.attachment?.uploadedAt ?? null,
          savedFile ? userId : existing.attachment?.uploadedByUserId ?? null,
          savedFile
            ? normalized.fileDescription
            : existing.attachment
              ? normalized.fileDescription
              : null,
          normalized.legacySourceUrl,
          normalized.legacySection,
          normalized.migrationStatus,
          normalized.migrationNote,
          userId
        ]
      );
    } catch (error) {
      await this.contentFileStorageService.deleteStoredFile(savedFile?.storedName);
      throw error;
    }

    if (savedFile && existing.attachment?.storedName) {
      await this.contentFileStorageService.deleteStoredFile(existing.attachment.storedName);
    }

    const meeting = await this.getBackofficeMeetingRecordById(meetingId);

    await this.auditService.recordEvent({
      actorUserId: userId,
      actionType: "MEETING_RECORD_UPDATED",
      entityType: "MEETING_RECORD",
      entityId: meetingId,
      message: `Обновлена запись заседания «${meeting.title}».`,
      metadata: this.buildMeetingAuditMetadata(meeting)
    });

    return meeting;
  }

  async publishMeetingRecord(
    userId: string,
    meetingId: string
  ): Promise<BackofficeMeetingRecord> {
    const meeting = await this.setMeetingStatus(meetingId, userId, "published");

    await this.auditService.recordEvent({
      actorUserId: userId,
      actionType: "MEETING_RECORD_PUBLISHED",
      entityType: "MEETING_RECORD",
      entityId: meetingId,
      message: `Опубликована запись заседания «${meeting.title}».`,
      metadata: this.buildMeetingAuditMetadata(meeting)
    });

    return meeting;
  }

  async unpublishMeetingRecord(
    userId: string,
    meetingId: string
  ): Promise<BackofficeMeetingRecord> {
    const meeting = await this.setMeetingStatus(meetingId, userId, "draft");

    await this.auditService.recordEvent({
      actorUserId: userId,
      actionType: "MEETING_RECORD_UNPUBLISHED",
      entityType: "MEETING_RECORD",
      entityId: meetingId,
      message: `Снята с публикации запись заседания «${meeting.title}».`,
      metadata: this.buildMeetingAuditMetadata(meeting)
    });

    return meeting;
  }

  async getPublicMeetingDownload(meetingId: string): Promise<ContentDownload> {
    const meeting = await this.getStoredMeetingRecordById(meetingId, true);
    return this.buildDownload(meeting.attachment);
  }

  async getPublicMeeting(meetingId: string): Promise<MeetingRecord> {
    const stored = await this.getStoredMeetingRecordById(meetingId, true);
    return this.stripStoredMeeting(stored);
  }

  async getBackofficeMeetingDownload(meetingId: string): Promise<ContentDownload> {
    const meeting = await this.getStoredMeetingRecordById(meetingId);
    return this.buildDownload(meeting.attachment);
  }

  async listPublishedApprovedStandards(
    filters: PublicStandardsFilters = {}
  ): Promise<ApprovedStandardRecord[]> {
    const rows = await this.listApprovedStandardRows(true, undefined, filters);
    return rows.map((row) => this.mapApprovedStandard(row));
  }

  async listBackofficeApprovedStandards(
    filters: BackofficeContentListFilters = {}
  ): Promise<BackofficeApprovedStandardRecord[]> {
    const rows = await this.listApprovedStandardRows(false, filters);
    return rows.map((row) => this.mapBackofficeApprovedStandard(row));
  }

  async createApprovedStandard(
    userId: string,
    payload: CreateApprovedStandardDto,
    file?: UploadedBinaryFile
  ): Promise<BackofficeApprovedStandardRecord> {
    const normalized = await this.normalizeApprovedStandardPayload(payload);
    const standardId = `approved-standard-${randomUUID()}`;
    const savedFile = file ? await this.contentFileStorageService.saveUploadedFile(file) : null;

    try {
      await this.databaseService.query(
        `
          INSERT INTO approved_standards (
            id,
            code,
            title,
            summary,
            approval_date,
            status,
            publication_date,
            responsible_subcommittee_id,
            file_original_name,
            file_stored_name,
            file_mime_type,
            file_size_bytes,
            file_uploaded_at,
            file_uploaded_by_user_id,
            file_description,
            legacy_source_url,
            legacy_section,
            migration_status,
            migration_note,
            created_by_user_id,
            updated_by_user_id,
            updated_at
          )
          VALUES (
            $1, $2, $3, $4, $5, 'draft', $6, $7,
            $8, $9, $10, $11, $12, $13, $14,
            $15, $16, $17, $18, $19, $19, NOW()
          )
        `,
        [
          standardId,
          normalized.code,
          normalized.title,
          normalized.summary,
          normalized.approvalDate,
          normalized.publicationDate,
          normalized.responsibleSubcommitteeId,
          savedFile?.originalName ?? null,
          savedFile?.storedName ?? null,
          savedFile?.mimeType ?? null,
          savedFile?.sizeBytes ?? null,
          savedFile ? new Date().toISOString() : null,
          savedFile ? userId : null,
          savedFile ? normalized.fileDescription : null,
          normalized.legacySourceUrl,
          normalized.legacySection,
          normalized.migrationStatus,
          normalized.migrationNote,
          userId
        ]
      );
    } catch (error) {
      await this.contentFileStorageService.deleteStoredFile(savedFile?.storedName);

      if (this.isUniqueViolation(error)) {
        throw new BadRequestException(
          "Утвержденный стандарт с таким обозначением уже существует."
        );
      }

      throw error;
    }

    const standard = await this.getBackofficeApprovedStandardById(standardId);

    await this.auditService.recordEvent({
      actorUserId: userId,
      actionType: "APPROVED_STANDARD_CREATED",
      entityType: "APPROVED_STANDARD",
      entityId: standardId,
      message: `Создан утвержденный стандарт «${standard.code}».`,
      metadata: this.buildApprovedStandardAuditMetadata(standard)
    });

    return standard;
  }

  async updateApprovedStandard(
    userId: string,
    standardId: string,
    payload: UpdateApprovedStandardDto,
    file?: UploadedBinaryFile
  ): Promise<BackofficeApprovedStandardRecord> {
    const existing = await this.getStoredApprovedStandardById(standardId);
    const normalized = await this.normalizeApprovedStandardPayload(payload);
    const savedFile = file ? await this.contentFileStorageService.saveUploadedFile(file) : null;

    try {
      await this.databaseService.query(
        `
          UPDATE approved_standards
          SET
            code = $2,
            title = $3,
            summary = $4,
            approval_date = $5,
            publication_date = $6,
            responsible_subcommittee_id = $7,
            file_original_name = $8,
            file_stored_name = $9,
            file_mime_type = $10,
            file_size_bytes = $11,
            file_uploaded_at = $12,
            file_uploaded_by_user_id = $13,
            file_description = $14,
            legacy_source_url = $15,
            legacy_section = $16,
            migration_status = $17,
            migration_note = $18,
            updated_by_user_id = $19,
            updated_at = NOW()
          WHERE id = $1
        `,
        [
          standardId,
          normalized.code,
          normalized.title,
          normalized.summary,
          normalized.approvalDate,
          normalized.publicationDate,
          normalized.responsibleSubcommitteeId,
          savedFile?.originalName ?? existing.attachment?.originalName ?? null,
          savedFile?.storedName ?? existing.attachment?.storedName ?? null,
          savedFile?.mimeType ?? existing.attachment?.mimeType ?? null,
          savedFile?.sizeBytes ?? existing.attachment?.sizeBytes ?? null,
          savedFile?.uploadedAt ?? existing.attachment?.uploadedAt ?? null,
          savedFile ? userId : existing.attachment?.uploadedByUserId ?? null,
          savedFile
            ? normalized.fileDescription
            : existing.attachment
              ? normalized.fileDescription
              : null,
          normalized.legacySourceUrl,
          normalized.legacySection,
          normalized.migrationStatus,
          normalized.migrationNote,
          userId
        ]
      );
    } catch (error) {
      await this.contentFileStorageService.deleteStoredFile(savedFile?.storedName);

      if (this.isUniqueViolation(error)) {
        throw new BadRequestException(
          "Утвержденный стандарт с таким обозначением уже существует."
        );
      }

      throw error;
    }

    if (savedFile && existing.attachment?.storedName) {
      await this.contentFileStorageService.deleteStoredFile(existing.attachment.storedName);
    }

    const standard = await this.getBackofficeApprovedStandardById(standardId);

    await this.auditService.recordEvent({
      actorUserId: userId,
      actionType: "APPROVED_STANDARD_UPDATED",
      entityType: "APPROVED_STANDARD",
      entityId: standardId,
      message: `Обновлен утвержденный стандарт «${standard.code}».`,
      metadata: this.buildApprovedStandardAuditMetadata(standard)
    });

    return standard;
  }

  async publishApprovedStandard(
    userId: string,
    standardId: string
  ): Promise<BackofficeApprovedStandardRecord> {
    const standard = await this.setApprovedStandardStatus(standardId, userId, "published");

    await this.auditService.recordEvent({
      actorUserId: userId,
      actionType: "APPROVED_STANDARD_PUBLISHED",
      entityType: "APPROVED_STANDARD",
      entityId: standardId,
      message: `Опубликован утвержденный стандарт «${standard.code}».`,
      metadata: this.buildApprovedStandardAuditMetadata(standard)
    });

    return standard;
  }

  async unpublishApprovedStandard(
    userId: string,
    standardId: string
  ): Promise<BackofficeApprovedStandardRecord> {
    const standard = await this.setApprovedStandardStatus(standardId, userId, "draft");

    await this.auditService.recordEvent({
      actorUserId: userId,
      actionType: "APPROVED_STANDARD_UNPUBLISHED",
      entityType: "APPROVED_STANDARD",
      entityId: standardId,
      message: `Снят с публикации утвержденный стандарт «${standard.code}».`,
      metadata: this.buildApprovedStandardAuditMetadata(standard)
    });

    return standard;
  }

  async getPublicApprovedStandardDownload(standardId: string): Promise<ContentDownload> {
    const standard = await this.getStoredApprovedStandardById(standardId, true);
    return this.buildDownload(standard.attachment);
  }

  async getPublicApprovedStandard(
    standardId: string
  ): Promise<ApprovedStandardRecord> {
    const stored = await this.getStoredApprovedStandardById(standardId, true);
    return this.stripStoredApprovedStandard(stored);
  }

  async getBackofficeApprovedStandardDownload(
    standardId: string
  ): Promise<ContentDownload> {
    const standard = await this.getStoredApprovedStandardById(standardId);
    return this.buildDownload(standard.attachment);
  }

  async getStandardsPageData(
    draftStandards: StandardsPageData["draftStandards"],
    filters: PublicStandardsFilters = {}
  ): Promise<StandardsPageData> {
    const selectedSection = filters.section
      ? this.parsePublicStandardsSection(filters.section)
      : null;
    const includeDraftStandards = !selectedSection || selectedSection === "DRAFT_STANDARDS";
    const includeApprovedStandards =
      !selectedSection || selectedSection === "APPROVED_STANDARDS";
    const includeProgramDocuments =
      !selectedSection || selectedSection === "NATIONAL_STANDARDS_PROGRAM";
    const draftStandardsForPublic = this.filterDraftStandardsForPublic(
      draftStandards,
      filters
    );
    const [approvedStandards, nationalStandardsProgramDocuments] = await Promise.all([
      includeApprovedStandards ? this.listPublishedApprovedStandards(filters) : [],
      includeProgramDocuments
        ? this.listPublishedPublicDocumentsByCategories(
            ["NATIONAL_STANDARDS_PROGRAM"],
            {
              ...(filters.q ? { q: filters.q } : {}),
              ...(filters.dateFrom ? { dateFrom: filters.dateFrom } : {}),
              ...(filters.dateTo ? { dateTo: filters.dateTo } : {}),
              category: "NATIONAL_STANDARDS_PROGRAM"
            }
          )
        : []
    ]);

    return {
      draftStandards: includeDraftStandards ? draftStandardsForPublic : [],
      approvedStandards,
      nationalStandardsProgramDocuments
    };
  }

  async listLegacyContentInventory(
    filters: LegacyContentInventoryFilters = {}
  ): Promise<LegacyContentInventoryRecord[]> {
    const conditions: string[] = [];
    const values: unknown[] = [];

    this.appendLegacyInventoryFilters(conditions, values, filters, "lci");

    const result = await this.databaseService.query<LegacyContentInventoryRow>(
      `
        SELECT
          lci.id,
          lci.legacy_section,
          lci.legacy_title,
          lci.legacy_url,
          lci.legacy_date,
          lci.legacy_type,
          lci.migration_status,
          lci.migration_note,
          lci.linked_portal_entity_type,
          lci.linked_portal_entity_id,
          CASE
            WHEN lci.linked_portal_entity_type = 'NEWS_ITEM' THEN news.title
            WHEN lci.linked_portal_entity_type = 'PUBLIC_DOCUMENT' THEN documents.title
            WHEN lci.linked_portal_entity_type = 'MEETING_RECORD' THEN meetings.title
            WHEN lci.linked_portal_entity_type = 'APPROVED_STANDARD'
              THEN CONCAT(standards.code, ' — ', standards.title)
            ELSE NULL
          END AS linked_portal_title
        FROM legacy_content_inventory lci
        LEFT JOIN news_items news
          ON lci.linked_portal_entity_type = 'NEWS_ITEM'
          AND news.id = lci.linked_portal_entity_id
        LEFT JOIN public_documents documents
          ON lci.linked_portal_entity_type = 'PUBLIC_DOCUMENT'
          AND documents.id = lci.linked_portal_entity_id
        LEFT JOIN meeting_records meetings
          ON lci.linked_portal_entity_type = 'MEETING_RECORD'
          AND meetings.id = lci.linked_portal_entity_id
        LEFT JOIN approved_standards standards
          ON lci.linked_portal_entity_type = 'APPROVED_STANDARD'
          AND standards.id = lci.linked_portal_entity_id
        ${conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : ""}
        ORDER BY
          CASE lci.legacy_section
            WHEN 'NEWS' THEN 0
            WHEN 'MAIN_DOCUMENTS' THEN 1
            WHEN 'WORK_REPORTS' THEN 2
            WHEN 'WORK_PLANS' THEN 3
            WHEN 'NATIONAL_STANDARDS_PROGRAM' THEN 4
            WHEN 'MEETING_AGENDA' THEN 5
            WHEN 'MEETING_MINUTES' THEN 6
            ELSE 7
          END,
          COALESCE(lci.legacy_date, lci.updated_at) DESC,
          lci.legacy_title ASC
      `,
      values
    );

    return result.rows.map((row) => this.mapLegacyContentInventoryRecord(row));
  }

  async createLegacyContentInventory(
    userId: string,
    payload: CreateLegacyContentInventoryDto
  ): Promise<LegacyContentInventoryRecord> {
    const normalized = await this.normalizeLegacyContentInventoryPayload(payload);
    const inventoryId = `legacy-content-inventory-${randomUUID()}`;

    await this.databaseService.query(
      `
        INSERT INTO legacy_content_inventory (
          id,
          legacy_section,
          legacy_title,
          legacy_url,
          legacy_date,
          legacy_type,
          migration_status,
          migration_note,
          linked_portal_entity_type,
          linked_portal_entity_id,
          created_by_user_id,
          updated_by_user_id,
          updated_at
        )
        VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $11, NOW()
        )
      `,
      [
        inventoryId,
        normalized.legacySection,
        normalized.legacyTitle,
        normalized.legacyUrl,
        normalized.legacyDate,
        normalized.legacyType,
        normalized.migrationStatus,
        normalized.migrationNote,
        normalized.linkedPortalRecord?.entityType ?? null,
        normalized.linkedPortalRecord?.entityId ?? null,
        userId
      ]
    );

    const item = await this.getLegacyContentInventoryById(inventoryId);

    await this.auditService.recordEvent({
      actorUserId: userId,
      actionType: "LEGACY_CONTENT_INVENTORY_CREATED",
      entityType: "LEGACY_CONTENT_INVENTORY",
      entityId: inventoryId,
      message: `Добавлена запись в реестр старого сайта «${item.legacyTitle}».`,
      metadata: this.buildLegacyContentInventoryAuditMetadata(item)
    });

    return item;
  }

  async updateLegacyContentInventory(
    userId: string,
    inventoryId: string,
    payload: UpdateLegacyContentInventoryDto
  ): Promise<LegacyContentInventoryRecord> {
    const normalized = await this.normalizeLegacyContentInventoryPayload(payload);
    await this.getLegacyContentInventoryById(inventoryId);

    await this.databaseService.query(
      `
        UPDATE legacy_content_inventory
        SET
          legacy_section = $2,
          legacy_title = $3,
          legacy_url = $4,
          legacy_date = $5,
          legacy_type = $6,
          migration_status = $7,
          migration_note = $8,
          linked_portal_entity_type = $9,
          linked_portal_entity_id = $10,
          updated_by_user_id = $11,
          updated_at = NOW()
        WHERE id = $1
      `,
      [
        inventoryId,
        normalized.legacySection,
        normalized.legacyTitle,
        normalized.legacyUrl,
        normalized.legacyDate,
        normalized.legacyType,
        normalized.migrationStatus,
        normalized.migrationNote,
        normalized.linkedPortalRecord?.entityType ?? null,
        normalized.linkedPortalRecord?.entityId ?? null,
        userId
      ]
    );

    const item = await this.getLegacyContentInventoryById(inventoryId);

    await this.auditService.recordEvent({
      actorUserId: userId,
      actionType: "LEGACY_CONTENT_INVENTORY_UPDATED",
      entityType: "LEGACY_CONTENT_INVENTORY",
      entityId: inventoryId,
      message: `Обновлена запись реестра старого сайта «${item.legacyTitle}».`,
      metadata: this.buildLegacyContentInventoryAuditMetadata(item)
    });

    return item;
  }

  async createPortalDraftFromLegacyInventory(
    userId: string,
    inventoryId: string
  ): Promise<CreatePortalDraftFromInventoryResult> {
    const inventoryRecord = await this.getLegacyContentInventoryById(inventoryId);

    if (inventoryRecord.linkedPortalRecord) {
      throw new BadRequestException(
        "Для этой записи реестра уже создана и связана запись портала."
      );
    }

    if (inventoryRecord.migrationStatus === "SKIPPED") {
      throw new BadRequestException(
        "Для записи со статусом «Не переносить» нельзя создать запись портала."
      );
    }

    const targetEntityType = this.inferLinkedPortalEntityTypeFromLegacySection(
      inventoryRecord.legacySection
    );
    const publicationDate = inventoryRecord.legacyDate ?? new Date().toISOString();

    let createdPortalRecord: LinkedPortalEntityReference;

    switch (targetEntityType) {
      case "NEWS_ITEM": {
        const createdItem = await this.createNewsItem(userId, {
          title: inventoryRecord.legacyTitle,
          excerpt: this.buildLegacyInventorySummary(
            inventoryRecord,
            "Материал перенесен из реестра старого сайта. Заполните краткое описание перед публикацией."
          ),
          body: this.buildLegacyInventoryBody(
            inventoryRecord,
            "Черновик новости создан из реестра материалов старого сайта. Дополните текст и проверьте данные перед публикацией."
          ),
          publicationDate,
          legacySection: inventoryRecord.legacySection,
          legacySourceUrl: inventoryRecord.legacyUrl,
          migrationStatus: "NOT_IMPORTED",
          migrationNote: inventoryRecord.migrationNote
        });

        createdPortalRecord = {
          entityType: "NEWS_ITEM",
          entityId: createdItem.id,
          title: createdItem.title
        };
        break;
      }
      case "PUBLIC_DOCUMENT": {
        const category = this.mapLegacySectionToPublicDocumentCategory(
          inventoryRecord.legacySection
        );
        const createdDocument = await this.createPublicDocument(userId, {
          title: inventoryRecord.legacyTitle,
          summary: this.buildLegacyInventorySummary(
            inventoryRecord,
            "Черновик публичного документа создан из реестра старого сайта. Дополните описание, загрузите файл и уточните реквизиты."
          ),
          body: this.buildLegacyInventoryBody(
            inventoryRecord,
            "Черновик публичного документа создан из реестра старого сайта."
          ),
          category,
          publicationDate: inventoryRecord.legacyDate ?? null,
          fileDescription: inventoryRecord.migrationNote,
          legacySection: inventoryRecord.legacySection,
          legacySourceUrl: inventoryRecord.legacyUrl,
          migrationStatus: "NOT_IMPORTED",
          migrationNote: inventoryRecord.migrationNote
        });

        createdPortalRecord = {
          entityType: "PUBLIC_DOCUMENT",
          entityId: createdDocument.id,
          title: createdDocument.title
        };
        break;
      }
      case "MEETING_RECORD": {
        const category = this.mapLegacySectionToMeetingCategory(
          inventoryRecord.legacySection
        );
        const createdMeeting = await this.createMeetingRecord(userId, {
          title: inventoryRecord.legacyTitle,
          summary: this.buildLegacyInventorySummary(
            inventoryRecord,
            "Черновик записи заседания создан из реестра старого сайта. Проверьте дату, содержание и вложения."
          ),
          body: this.buildLegacyInventoryBody(
            inventoryRecord,
            "Черновик записи заседания создан из реестра материалов старого сайта. Дополните содержание протокола или повестки перед публикацией."
          ),
          location: null,
          category,
          meetingDate: publicationDate,
          publicationDate,
          fileDescription: inventoryRecord.migrationNote,
          legacySection: inventoryRecord.legacySection,
          legacySourceUrl: inventoryRecord.legacyUrl,
          migrationStatus: "NOT_IMPORTED",
          migrationNote: inventoryRecord.migrationNote
        });

        createdPortalRecord = {
          entityType: "MEETING_RECORD",
          entityId: createdMeeting.id,
          title: createdMeeting.title
        };
        break;
      }
      case "APPROVED_STANDARD": {
        const placeholderCode = `ТРЕБУЕТ-УТОЧНЕНИЯ-${Date.now()}`;
        const createdStandard = await this.createApprovedStandard(userId, {
          code: placeholderCode,
          title: inventoryRecord.legacyTitle,
          summary: this.buildLegacyInventorySummary(
            inventoryRecord,
            "Черновик карточки утвержденного стандарта создан из реестра старого сайта. Уточните обозначение, описание, файл и ответственный подкомитет."
          ),
          approvalDate: publicationDate,
          publicationDate,
          responsibleSubcommitteeId: null,
          fileDescription: inventoryRecord.migrationNote,
          legacySection: inventoryRecord.legacySection,
          legacySourceUrl: inventoryRecord.legacyUrl,
          migrationStatus: "NOT_IMPORTED",
          migrationNote: inventoryRecord.migrationNote
        });

        createdPortalRecord = {
          entityType: "APPROVED_STANDARD",
          entityId: createdStandard.id,
          title: `${createdStandard.code} — ${createdStandard.title}`
        };
        break;
      }
      default:
        throw new BadRequestException("Для выбранного раздела нельзя создать запись портала.");
    }

    const updatedInventoryRecord = await this.updateLegacyContentInventory(userId, inventoryId, {
      legacySection: inventoryRecord.legacySection,
      legacyTitle: inventoryRecord.legacyTitle,
      legacyUrl: inventoryRecord.legacyUrl,
      legacyDate: inventoryRecord.legacyDate,
      legacyType: inventoryRecord.legacyType,
      migrationStatus: "CREATED_IN_PORTAL",
      migrationNote: inventoryRecord.migrationNote,
      linkedPortalEntityType: createdPortalRecord.entityType,
      linkedPortalEntityId: createdPortalRecord.entityId
    });

    return {
      createdPortalRecord,
      inventoryRecord: updatedInventoryRecord
    };
  }

  private async getLegacyContentInventoryById(
    inventoryId: string
  ): Promise<LegacyContentInventoryRecord> {
    const result = await this.databaseService.query<LegacyContentInventoryRow>(
      `
        SELECT
          lci.id,
          lci.legacy_section,
          lci.legacy_title,
          lci.legacy_url,
          lci.legacy_date,
          lci.legacy_type,
          lci.migration_status,
          lci.migration_note,
          lci.linked_portal_entity_type,
          lci.linked_portal_entity_id,
          CASE
            WHEN lci.linked_portal_entity_type = 'NEWS_ITEM' THEN news.title
            WHEN lci.linked_portal_entity_type = 'PUBLIC_DOCUMENT' THEN documents.title
            WHEN lci.linked_portal_entity_type = 'MEETING_RECORD' THEN meetings.title
            WHEN lci.linked_portal_entity_type = 'APPROVED_STANDARD'
              THEN CONCAT(standards.code, ' — ', standards.title)
            ELSE NULL
          END AS linked_portal_title
        FROM legacy_content_inventory lci
        LEFT JOIN news_items news
          ON lci.linked_portal_entity_type = 'NEWS_ITEM'
          AND news.id = lci.linked_portal_entity_id
        LEFT JOIN public_documents documents
          ON lci.linked_portal_entity_type = 'PUBLIC_DOCUMENT'
          AND documents.id = lci.linked_portal_entity_id
        LEFT JOIN meeting_records meetings
          ON lci.linked_portal_entity_type = 'MEETING_RECORD'
          AND meetings.id = lci.linked_portal_entity_id
        LEFT JOIN approved_standards standards
          ON lci.linked_portal_entity_type = 'APPROVED_STANDARD'
          AND standards.id = lci.linked_portal_entity_id
        WHERE lci.id = $1
        LIMIT 1
      `,
      [inventoryId]
    );
    const row = result.rows[0];

    if (!row) {
      throw new NotFoundException("Запись реестра старого сайта не найдена.");
    }

    return this.mapLegacyContentInventoryRecord(row);
  }

  private mapLegacyContentInventoryRecord(
    row: LegacyContentInventoryRow
  ): LegacyContentInventoryRecord {
    return {
      id: row.id,
      legacySection: row.legacy_section,
      legacyTitle: row.legacy_title,
      legacyUrl: row.legacy_url,
      legacyDate: row.legacy_date ? new Date(row.legacy_date).toISOString() : null,
      legacyType: row.legacy_type,
      migrationStatus: row.migration_status,
      migrationNote: row.migration_note,
      linkedPortalRecord:
        row.linked_portal_entity_type &&
        row.linked_portal_entity_id &&
        row.linked_portal_title
          ? {
              entityType: row.linked_portal_entity_type,
              entityId: row.linked_portal_entity_id,
              title: row.linked_portal_title
            }
          : null
    };
  }

  private buildLegacyContentInventoryAuditMetadata(
    item: LegacyContentInventoryRecord
  ): Record<string, unknown> {
    return {
      legacySection: item.legacySection,
      legacyTitle: item.legacyTitle,
      legacyUrl: item.legacyUrl,
      legacyDate: item.legacyDate,
      legacyType: item.legacyType,
      migrationStatus: item.migrationStatus,
      linkedPortalEntityType: item.linkedPortalRecord?.entityType ?? null,
      linkedPortalEntityId: item.linkedPortalRecord?.entityId ?? null,
      linkedPortalTitle: item.linkedPortalRecord?.title ?? null
    };
  }

  private async normalizeLegacyContentInventoryPayload(
    payload: CreateLegacyContentInventoryDto | UpdateLegacyContentInventoryDto
  ): Promise<NormalizedLegacyContentInventoryPayload> {
    const legacyTitle = payload.legacyTitle.trim();
    const legacySection = this.parseLegacySection(payload.legacySection);
    const legacyUrl = this.normalizeLegacySourceUrl(payload.legacyUrl);
    const legacyDate = this.parseOptionalDate(
      payload.legacyDate,
      "Укажите корректную дату материала старого сайта."
    );
    const legacyType = this.normalizeOptionalText(payload.legacyType);
    const migrationStatus = this.parseLegacyInventoryStatus(payload.migrationStatus);
    const migrationNote = this.normalizeOptionalText(payload.migrationNote);
    const linkedPortalEntityType = this.normalizeOptionalText(payload.linkedPortalEntityType);
    const linkedPortalEntityId = this.normalizeOptionalText(payload.linkedPortalEntityId);

    if (!legacyTitle) {
      throw new BadRequestException("Укажите название материала со старого сайта.");
    }

    if ((linkedPortalEntityType && !linkedPortalEntityId) || (!linkedPortalEntityType && linkedPortalEntityId)) {
      throw new BadRequestException(
        "Чтобы связать запись, выберите и тип, и идентификатор записи портала."
      );
    }

    const linkedPortalRecord =
      linkedPortalEntityType && linkedPortalEntityId
        ? await this.getLinkedPortalEntityRecord(
            this.parseLinkedPortalEntityType(linkedPortalEntityType),
            linkedPortalEntityId
          )
        : null;

    if (linkedPortalRecord) {
      this.assertLegacySectionSupportsLinkedEntity(
        legacySection,
        linkedPortalRecord.entityType
      );
    }

    if (!linkedPortalRecord && ["CREATED_IN_PORTAL", "VERIFIED"].includes(migrationStatus)) {
      throw new BadRequestException(
        "Для статусов «Создано в портале» и «Проверено» выберите связанную запись портала."
      );
    }

    if (linkedPortalRecord && ["FOUND", "SKIPPED"].includes(migrationStatus)) {
      throw new BadRequestException(
        "Для связанной записи портала используйте статус «Создано в портале» или «Проверено»."
      );
    }

    return {
      legacyTitle,
      legacySection,
      legacyUrl,
      legacyDate,
      legacyType,
      migrationStatus,
      migrationNote,
      linkedPortalRecord
    };
  }

  private normalizeNewsPayload(
    payload: CreateNewsItemDto | UpdateNewsItemDto
  ): CreateNewsItemDto {
    const title = payload.title.trim();
    const excerpt = payload.excerpt.trim();
    const body = payload.body.trim();
    const publicationDate = this.parseDate(payload.publicationDate, "Укажите дату публикации новости.");
    const migration = this.normalizeMigrationFields(payload, NEWS_LEGACY_SECTIONS, "NEWS");

    if (!title || !excerpt || !body) {
      throw new BadRequestException("Заполните заголовок, краткое описание и текст новости.");
    }

    return {
      title,
      excerpt,
      body,
      publicationDate,
      ...migration
    };
  }

  private normalizePublicDocumentPayload(
    payload: CreatePublicDocumentDto | UpdatePublicDocumentDto
  ): CreatePublicDocumentDto {
    const title = payload.title.trim();
    const summary = payload.summary.trim();
    const body = this.normalizeOptionalText(payload.body);
    const category = this.parseDocumentCategory(payload.category);
    const publicationDate = this.parseOptionalDate(
      payload.publicationDate,
      "Укажите дату публикации документа."
    );
    const fileDescription = this.normalizeOptionalText(payload.fileDescription);
    const migration = this.normalizeMigrationFields(
      payload,
      DOCUMENT_LEGACY_SECTIONS,
      category
    );

    if (!title || !summary) {
      throw new BadRequestException("Заполните заголовок и описание документа.");
    }

    return {
      title,
      category,
      summary,
      body,
      publicationDate,
      fileDescription,
      ...migration
    };
  }

  private normalizeMeetingPayload(
    payload: CreateMeetingRecordDto | UpdateMeetingRecordDto
  ): CreateMeetingRecordDto {
    const title = payload.title.trim();
    const summary = payload.summary.trim();
    const body = payload.body.trim();
    const category = this.parseMeetingCategory(payload.category);
    const meetingDate = this.parseDate(payload.meetingDate, "Укажите дату заседания.");
    const publicationDate = this.parseDate(
      payload.publicationDate,
      "Укажите дату публикации записи заседания."
    );
    const location = this.normalizeOptionalText(payload.location);
    const fileDescription = this.normalizeOptionalText(payload.fileDescription);
    const migration = this.normalizeMigrationFields(
      payload,
      MEETING_LEGACY_SECTIONS,
      category
    );

    if (!title || !summary || !body) {
      throw new BadRequestException(
        "Заполните заголовок, краткое описание и содержание записи заседания."
      );
    }

    return {
      title,
      category,
      summary,
      body,
      meetingDate,
      publicationDate,
      location,
      fileDescription,
      ...migration
    };
  }

  private async normalizeApprovedStandardPayload(
    payload: CreateApprovedStandardDto | UpdateApprovedStandardDto
  ): Promise<CreateApprovedStandardDto> {
    const code = payload.code.trim();
    const title = payload.title.trim();
    const summary = payload.summary.trim();
    const approvalDate = this.parseDate(
      payload.approvalDate,
      "Укажите дату утверждения стандарта."
    );
    const publicationDate = this.parseDate(
      payload.publicationDate,
      "Укажите дату публикации утвержденного стандарта."
    );
    const responsibleSubcommitteeId = this.normalizeOptionalText(
      payload.responsibleSubcommitteeId
    );
    const fileDescription = this.normalizeOptionalText(payload.fileDescription);
    const migration = this.normalizeMigrationFields(
      payload,
      APPROVED_STANDARD_LEGACY_SECTIONS,
      "APPROVED_STANDARDS"
    );

    if (!code || !title || !summary) {
      throw new BadRequestException(
        "Заполните обозначение, название и описание утвержденного стандарта."
      );
    }

    if (responsibleSubcommitteeId) {
      await this.assertSubcommitteeExists(responsibleSubcommitteeId);
    }

    return {
      code,
      title,
      summary,
      approvalDate,
      publicationDate,
      responsibleSubcommitteeId,
      fileDescription,
      ...migration
    };
  }

  private async listPublicDocumentRows(
    publishedOnly: boolean,
    categories?: readonly PublicDocumentCategory[],
    backofficeFilters?: BackofficeContentListFilters,
    publicFilters?: PublicDocumentsFilters
  ): Promise<PublicDocumentRow[]> {
    const conditions: string[] = [];
    const values: unknown[] = [];

    if (publishedOnly) {
      conditions.push("pd.status = 'published'");
    }

    if (categories && categories.length > 0) {
      values.push(categories);
      conditions.push(`pd.category = ANY($${values.length}::text[])`);
    }

    if (publishedOnly) {
      this.appendPublicDocumentsFilters(conditions, values, publicFilters ?? {}, "pd");
    } else {
      this.appendMigrationFilters(conditions, values, backofficeFilters ?? {}, "pd");
    }

    const result = await this.databaseService.query<PublicDocumentRow>(
      `
        SELECT
          pd.id,
          pd.title,
          pd.category,
          pd.summary,
          pd.body,
          pd.status,
          pd.publication_date,
          pd.published_at,
          pd.file_original_name,
          pd.file_stored_name,
          pd.file_mime_type,
          pd.file_size_bytes,
          pd.file_uploaded_at,
          pd.file_uploaded_by_user_id,
          uploader.display_name AS file_uploaded_by_display_name,
          pd.file_description,
          pd.legacy_source_url,
          pd.legacy_section,
          pd.migration_status,
          pd.migration_note
        FROM public_documents pd
        LEFT JOIN users uploader ON uploader.id = pd.file_uploaded_by_user_id
        ${conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : ""}
        ORDER BY
          CASE pd.category
            WHEN 'MAIN_DOCUMENTS' THEN 0
            WHEN 'WORK_REPORTS' THEN 1
            WHEN 'WORK_PLANS' THEN 2
            ELSE 3
          END,
          pd.publication_date DESC NULLS LAST,
          pd.title ASC
      `,
      values
    );

    return result.rows;
  }

  private async listMeetingRows(
    publishedOnly: boolean,
    backofficeFilters?: BackofficeContentListFilters,
    publicFilters?: PublicMeetingsFilters
  ): Promise<MeetingRow[]> {
    const conditions: string[] = [];
    const values: unknown[] = [];

    if (publishedOnly) {
      conditions.push("mr.status = 'published'");
      this.appendPublicMeetingsFilters(conditions, values, publicFilters ?? {}, "mr");
    } else {
      this.appendMigrationFilters(conditions, values, backofficeFilters ?? {}, "mr");
    }

    const result = await this.databaseService.query<MeetingRow>(
      `
        SELECT
          mr.id,
          mr.title,
          mr.category,
          mr.summary,
          mr.body,
          mr.location,
          mr.meeting_date,
          mr.status,
          mr.publication_date,
          mr.published_at,
          mr.file_original_name,
          mr.file_stored_name,
          mr.file_mime_type,
          mr.file_size_bytes,
          mr.file_uploaded_at,
          mr.file_uploaded_by_user_id,
          uploader.display_name AS file_uploaded_by_display_name,
          mr.file_description,
          mr.legacy_source_url,
          mr.legacy_section,
          mr.migration_status,
          mr.migration_note
        FROM meeting_records mr
        LEFT JOIN users uploader ON uploader.id = mr.file_uploaded_by_user_id
        ${conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : ""}
        ORDER BY
          CASE mr.category
            WHEN 'MEETING_AGENDA' THEN 0
            ELSE 1
          END,
          mr.meeting_date DESC,
          mr.title ASC
      `,
      values
    );

    return result.rows;
  }

  private async listApprovedStandardRows(
    publishedOnly: boolean,
    backofficeFilters?: BackofficeContentListFilters,
    publicFilters?: PublicStandardsFilters
  ): Promise<ApprovedStandardRow[]> {
    const conditions: string[] = [];
    const values: unknown[] = [];

    if (publishedOnly) {
      conditions.push("aps.status = 'published'");
      this.appendPublicApprovedStandardsFilters(
        conditions,
        values,
        publicFilters ?? {},
        "aps"
      );
    } else {
      this.appendMigrationFilters(conditions, values, backofficeFilters ?? {}, "aps");
    }

    const result = await this.databaseService.query<ApprovedStandardRow>(
      `
        SELECT
          aps.id,
          aps.code,
          aps.title,
          aps.summary,
          aps.status,
          aps.approval_date,
          aps.publication_date,
          aps.published_at,
          aps.file_original_name,
          aps.file_stored_name,
          aps.file_mime_type,
          aps.file_size_bytes,
          aps.file_uploaded_at,
          aps.file_uploaded_by_user_id,
          uploader.display_name AS file_uploaded_by_display_name,
          aps.file_description,
          aps.legacy_source_url,
          aps.legacy_section,
          aps.migration_status,
          aps.migration_note,
          sc.id AS responsible_subcommittee_id,
          sc.code AS responsible_subcommittee_code,
          sc.title AS responsible_subcommittee_title,
          host.id AS responsible_subcommittee_host_id,
          host.name AS responsible_subcommittee_host_name,
          host.short_name AS responsible_subcommittee_host_short_name,
          host.country_code AS responsible_subcommittee_host_country_code
        FROM approved_standards aps
        LEFT JOIN users uploader ON uploader.id = aps.file_uploaded_by_user_id
        LEFT JOIN subcommittees sc ON sc.id = aps.responsible_subcommittee_id
        LEFT JOIN organizations host ON host.id = sc.host_organization_id
        ${conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : ""}
        ORDER BY aps.approval_date DESC, aps.code ASC
      `,
      values
    );

    return result.rows;
  }

  private async getBackofficeNewsItemById(
    newsId: string
  ): Promise<BackofficeNewsItemRecord> {
    const result = await this.databaseService.query<NewsRow>(
      `
        SELECT
          id,
          title,
          excerpt,
          body,
          status,
          publication_date,
          published_at,
          legacy_source_url,
          legacy_section,
          migration_status,
          migration_note
        FROM news_items
        WHERE id = $1
        LIMIT 1
      `,
      [newsId]
    );
    const row = result.rows[0];

    if (!row) {
      throw new NotFoundException("Новость не найдена.");
    }

    return this.mapBackofficeNewsItem(row);
  }

  private async assertNewsItemExists(newsId: string): Promise<void> {
    await this.getBackofficeNewsItemById(newsId);
  }

  private async setNewsStatus(
    newsId: string,
    userId: string,
    status: PublicationStatus
  ): Promise<BackofficeNewsItemRecord> {
    const result = await this.databaseService.query<NewsRow>(
      `
        UPDATE news_items
        SET
          status = $2,
          published_at = CASE WHEN $2 = 'published' THEN NOW() ELSE NULL END,
          updated_by_user_id = $3,
          updated_at = NOW()
        WHERE id = $1
        RETURNING
          id,
          title,
          excerpt,
          body,
          status,
          publication_date,
          published_at,
          legacy_source_url,
          legacy_section,
          migration_status,
          migration_note
      `,
      [newsId, status, userId]
    );
    const row = result.rows[0];

    if (!row) {
      throw new NotFoundException("Новость не найдена.");
    }

    return this.mapBackofficeNewsItem(row);
  }

  private async getBackofficePublicDocumentById(
    documentId: string
  ): Promise<BackofficePublicDocumentRecord> {
    const stored = await this.getStoredPublicDocumentById(documentId);
    return this.stripStoredDocument(stored);
  }

  private async getStoredPublicDocumentById(
    documentId: string,
    publishedOnly = false
  ): Promise<BackofficePublicDocumentRecord & { attachment: StoredAttachmentInfo | null }> {
    const result = await this.databaseService.query<PublicDocumentRow>(
      `
        SELECT
          pd.id,
          pd.title,
          pd.category,
          pd.summary,
          pd.body,
          pd.status,
          pd.publication_date,
          pd.published_at,
          pd.file_original_name,
          pd.file_stored_name,
          pd.file_mime_type,
          pd.file_size_bytes,
          pd.file_uploaded_at,
          pd.file_uploaded_by_user_id,
          uploader.display_name AS file_uploaded_by_display_name,
          pd.file_description,
          pd.legacy_source_url,
          pd.legacy_section,
          pd.migration_status,
          pd.migration_note
        FROM public_documents pd
        LEFT JOIN users uploader ON uploader.id = pd.file_uploaded_by_user_id
        WHERE pd.id = $1
          ${publishedOnly ? "AND pd.status = 'published'" : ""}
        LIMIT 1
      `,
      [documentId]
    );
    const row = result.rows[0];

    if (!row) {
      throw new NotFoundException("Публичный документ не найден.");
    }

    return this.mapStoredPublicDocument(row);
  }

  private async setPublicDocumentStatus(
    documentId: string,
    userId: string,
    status: PublicationStatus
  ): Promise<BackofficePublicDocumentRecord> {
    const result = await this.databaseService.query<PublicDocumentRow>(
      `
        UPDATE public_documents
        SET
          status = $2,
          published_at = CASE WHEN $2 = 'published' THEN NOW() ELSE NULL END,
          updated_by_user_id = $3,
          updated_at = NOW()
        WHERE id = $1
        RETURNING
          id,
          title,
          category,
          summary,
          body,
          status,
          publication_date,
          published_at,
          file_original_name,
          file_stored_name,
          file_mime_type,
          file_size_bytes,
          file_uploaded_at,
          file_uploaded_by_user_id,
          NULL::text AS file_uploaded_by_display_name,
          file_description,
          legacy_source_url,
          legacy_section,
          migration_status,
          migration_note
      `,
      [documentId, status, userId]
    );
    const row = result.rows[0];

    if (!row) {
      throw new NotFoundException("Публичный документ не найден.");
    }

    return this.mapBackofficePublicDocument(row);
  }

  private async getBackofficeMeetingRecordById(
    meetingId: string
  ): Promise<BackofficeMeetingRecord> {
    const stored = await this.getStoredMeetingRecordById(meetingId);
    return this.stripStoredMeeting(stored);
  }

  private async getStoredMeetingRecordById(
    meetingId: string,
    publishedOnly = false
  ): Promise<BackofficeMeetingRecord & { attachment: StoredAttachmentInfo | null }> {
    const result = await this.databaseService.query<MeetingRow>(
      `
        SELECT
          mr.id,
          mr.title,
          mr.category,
          mr.summary,
          mr.body,
          mr.location,
          mr.meeting_date,
          mr.status,
          mr.publication_date,
          mr.published_at,
          mr.file_original_name,
          mr.file_stored_name,
          mr.file_mime_type,
          mr.file_size_bytes,
          mr.file_uploaded_at,
          mr.file_uploaded_by_user_id,
          uploader.display_name AS file_uploaded_by_display_name,
          mr.file_description,
          mr.legacy_source_url,
          mr.legacy_section,
          mr.migration_status,
          mr.migration_note
        FROM meeting_records mr
        LEFT JOIN users uploader ON uploader.id = mr.file_uploaded_by_user_id
        WHERE mr.id = $1
          ${publishedOnly ? "AND mr.status = 'published'" : ""}
        LIMIT 1
      `,
      [meetingId]
    );
    const row = result.rows[0];

    if (!row) {
      throw new NotFoundException("Запись заседания не найдена.");
    }

    return this.mapStoredMeeting(row);
  }

  private async setMeetingStatus(
    meetingId: string,
    userId: string,
    status: PublicationStatus
  ): Promise<BackofficeMeetingRecord> {
    const result = await this.databaseService.query<MeetingRow>(
      `
        UPDATE meeting_records
        SET
          status = $2,
          published_at = CASE WHEN $2 = 'published' THEN NOW() ELSE NULL END,
          updated_by_user_id = $3,
          updated_at = NOW()
        WHERE id = $1
        RETURNING
          id,
          title,
          category,
          summary,
          body,
          location,
          meeting_date,
          status,
          publication_date,
          published_at,
          file_original_name,
          file_stored_name,
          file_mime_type,
          file_size_bytes,
          file_uploaded_at,
          file_uploaded_by_user_id,
          NULL::text AS file_uploaded_by_display_name,
          file_description,
          legacy_source_url,
          legacy_section,
          migration_status,
          migration_note
      `,
      [meetingId, status, userId]
    );
    const row = result.rows[0];

    if (!row) {
      throw new NotFoundException("Запись заседания не найдена.");
    }

    return this.mapBackofficeMeeting(row);
  }

  private async getBackofficeApprovedStandardById(
    standardId: string
  ): Promise<BackofficeApprovedStandardRecord> {
    const stored = await this.getStoredApprovedStandardById(standardId);
    return this.stripStoredApprovedStandard(stored);
  }

  private async getStoredApprovedStandardById(
    standardId: string,
    publishedOnly = false
  ): Promise<BackofficeApprovedStandardRecord & { attachment: StoredAttachmentInfo | null }> {
    const result = await this.databaseService.query<ApprovedStandardRow>(
      `
        SELECT
          aps.id,
          aps.code,
          aps.title,
          aps.summary,
          aps.status,
          aps.approval_date,
          aps.publication_date,
          aps.published_at,
          aps.file_original_name,
          aps.file_stored_name,
          aps.file_mime_type,
          aps.file_size_bytes,
          aps.file_uploaded_at,
          aps.file_uploaded_by_user_id,
          uploader.display_name AS file_uploaded_by_display_name,
          aps.file_description,
          aps.legacy_source_url,
          aps.legacy_section,
          aps.migration_status,
          aps.migration_note,
          sc.id AS responsible_subcommittee_id,
          sc.code AS responsible_subcommittee_code,
          sc.title AS responsible_subcommittee_title,
          host.id AS responsible_subcommittee_host_id,
          host.name AS responsible_subcommittee_host_name,
          host.short_name AS responsible_subcommittee_host_short_name,
          host.country_code AS responsible_subcommittee_host_country_code
        FROM approved_standards aps
        LEFT JOIN users uploader ON uploader.id = aps.file_uploaded_by_user_id
        LEFT JOIN subcommittees sc ON sc.id = aps.responsible_subcommittee_id
        LEFT JOIN organizations host ON host.id = sc.host_organization_id
        WHERE aps.id = $1
          ${publishedOnly ? "AND aps.status = 'published'" : ""}
        LIMIT 1
      `,
      [standardId]
    );
    const row = result.rows[0];

    if (!row) {
      throw new NotFoundException("Утвержденный стандарт не найден.");
    }

    return this.mapStoredApprovedStandard(row);
  }

  private async setApprovedStandardStatus(
    standardId: string,
    userId: string,
    status: PublicationStatus
  ): Promise<BackofficeApprovedStandardRecord> {
    const result = await this.databaseService.query<ApprovedStandardRow>(
      `
        UPDATE approved_standards
        SET
          status = $2,
          published_at = CASE WHEN $2 = 'published' THEN NOW() ELSE NULL END,
          updated_by_user_id = $3,
          updated_at = NOW()
        WHERE id = $1
        RETURNING
          id,
          code,
          title,
          summary,
          status,
          approval_date,
          publication_date,
          published_at,
          file_original_name,
          file_stored_name,
          file_mime_type,
          file_size_bytes,
          file_uploaded_at,
          file_uploaded_by_user_id,
          NULL::text AS file_uploaded_by_display_name,
          file_description,
          legacy_source_url,
          legacy_section,
          migration_status,
          migration_note,
          NULL::text AS responsible_subcommittee_id,
          NULL::text AS responsible_subcommittee_code,
          NULL::text AS responsible_subcommittee_title,
          NULL::text AS responsible_subcommittee_host_id,
          NULL::text AS responsible_subcommittee_host_name,
          NULL::text AS responsible_subcommittee_host_short_name,
          NULL::text AS responsible_subcommittee_host_country_code
      `,
      [standardId, status, userId]
    );
    const row = result.rows[0];

    if (!row) {
      throw new NotFoundException("Утвержденный стандарт не найден.");
    }

    return this.getBackofficeApprovedStandardById(row.id);
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
      throw new BadRequestException("Ответственный подкомитет не найден.");
    }
  }

  private async buildDownload(attachment: StoredAttachmentInfo | null): Promise<ContentDownload> {
    if (!attachment) {
      throw new NotFoundException("Для этой записи файл не загружен.");
    }

    return {
      streamPath: await this.contentFileStorageService.resolveExistingFilePath(
        attachment.storedName
      ),
      mimeType: attachment.mimeType,
      sizeBytes: attachment.sizeBytes,
      contentDisposition: buildDownloadContentDisposition(attachment.originalName)
    };
  }

  private mapNewsItem(row: NewsRow): NewsItemRecord {
    const { migration, ...item } = this.mapBackofficeNewsItem(row);
    return item;
  }

  private mapBackofficeNewsItem(row: NewsRow): BackofficeNewsItemRecord {
    return {
      id: row.id,
      title: row.title,
      excerpt: row.excerpt,
      body: row.body,
      status: row.status,
      publicationDate: new Date(row.publication_date).toISOString(),
      publishedAt: row.published_at ? new Date(row.published_at).toISOString() : null,
      migration: this.mapMigrationInfo(row)
    };
  }

  private mapPublicDocument(row: PublicDocumentRow): PublicDocumentRecord {
    const { migration, ...document } = this.mapBackofficePublicDocument(row);
    return document;
  }

  private mapBackofficePublicDocument(
    row: PublicDocumentRow
  ): BackofficePublicDocumentRecord {
    return this.stripStoredDocument(this.mapStoredPublicDocument(row));
  }

  private mapStoredPublicDocument(
    row: PublicDocumentRow
  ): BackofficePublicDocumentRecord & { attachment: StoredAttachmentInfo | null } {
    return {
      id: row.id,
      title: row.title,
      category: row.category,
      summary: row.summary,
      body: row.body ?? null,
      status: row.status,
      publicationDate: row.publication_date
        ? new Date(row.publication_date).toISOString()
        : null,
      publishedAt: row.published_at ? new Date(row.published_at).toISOString() : null,
      attachment: this.mapStoredAttachment(row),
      migration: this.mapMigrationInfo(row)
    };
  }

  private stripStoredDocument(
    record: BackofficePublicDocumentRecord & { attachment: StoredAttachmentInfo | null }
  ): BackofficePublicDocumentRecord {
    return {
      ...record,
      attachment: record.attachment
        ? {
            description: record.attachment.description,
            mimeType: record.attachment.mimeType,
            originalName: record.attachment.originalName,
            sizeBytes: record.attachment.sizeBytes,
            uploadedAt: record.attachment.uploadedAt,
            uploadedByDisplayName: record.attachment.uploadedByDisplayName
          }
        : null
    };
  }

  private mapMeeting(row: MeetingRow): MeetingRecord {
    const { migration, ...meeting } = this.mapBackofficeMeeting(row);
    return meeting;
  }

  private mapBackofficeMeeting(row: MeetingRow): BackofficeMeetingRecord {
    return this.stripStoredMeeting(this.mapStoredMeeting(row));
  }

  private mapStoredMeeting(
    row: MeetingRow
  ): BackofficeMeetingRecord & { attachment: StoredAttachmentInfo | null } {
    return {
      id: row.id,
      title: row.title,
      category: row.category,
      summary: row.summary,
      body: row.body,
      location: row.location,
      meetingDate: new Date(row.meeting_date).toISOString(),
      status: row.status,
      publicationDate: new Date(row.publication_date).toISOString(),
      publishedAt: row.published_at ? new Date(row.published_at).toISOString() : null,
      attachment: this.mapStoredAttachment(row),
      migration: this.mapMigrationInfo(row)
    };
  }

  private stripStoredMeeting(
    record: BackofficeMeetingRecord & { attachment: StoredAttachmentInfo | null }
  ): BackofficeMeetingRecord {
    return {
      ...record,
      attachment: record.attachment
        ? {
            description: record.attachment.description,
            mimeType: record.attachment.mimeType,
            originalName: record.attachment.originalName,
            sizeBytes: record.attachment.sizeBytes,
            uploadedAt: record.attachment.uploadedAt,
            uploadedByDisplayName: record.attachment.uploadedByDisplayName
          }
        : null
    };
  }

  private mapApprovedStandard(row: ApprovedStandardRow): ApprovedStandardRecord {
    const { migration, ...standard } = this.mapBackofficeApprovedStandard(row);
    return standard;
  }

  private mapBackofficeApprovedStandard(
    row: ApprovedStandardRow
  ): BackofficeApprovedStandardRecord {
    return this.stripStoredApprovedStandard(this.mapStoredApprovedStandard(row));
  }

  private mapStoredApprovedStandard(
    row: ApprovedStandardRow
  ): BackofficeApprovedStandardRecord & { attachment: StoredAttachmentInfo | null } {
    return {
      id: row.id,
      code: row.code,
      title: row.title,
      summary: row.summary,
      status: row.status,
      approvalDate: new Date(row.approval_date).toISOString(),
      publicationDate: new Date(row.publication_date).toISOString(),
      publishedAt: row.published_at ? new Date(row.published_at).toISOString() : null,
      attachment: this.mapStoredAttachment(row),
      migration: this.mapMigrationInfo(row),
      responsibleSubcommittee: row.responsible_subcommittee_id
        ? {
            id: row.responsible_subcommittee_id,
            code: row.responsible_subcommittee_code ?? "ПК",
            title: row.responsible_subcommittee_title ?? "Подкомитет",
            hostOrganization: {
              id: row.responsible_subcommittee_host_id ?? "organization",
              name:
                row.responsible_subcommittee_host_name ??
                row.responsible_subcommittee_host_short_name ??
                "Организация",
              shortName:
                row.responsible_subcommittee_host_short_name ??
                row.responsible_subcommittee_host_name ??
                "Организация",
              ...(row.responsible_subcommittee_host_country_code
                ? { countryCode: row.responsible_subcommittee_host_country_code }
                : {})
            }
          }
        : null
    };
  }

  private stripStoredApprovedStandard(
    record: BackofficeApprovedStandardRecord & { attachment: StoredAttachmentInfo | null }
  ): BackofficeApprovedStandardRecord {
    return {
      ...record,
      attachment: record.attachment
        ? {
            description: record.attachment.description,
            mimeType: record.attachment.mimeType,
            originalName: record.attachment.originalName,
            sizeBytes: record.attachment.sizeBytes,
            uploadedAt: record.attachment.uploadedAt,
            uploadedByDisplayName: record.attachment.uploadedByDisplayName
          }
        : null
    };
  }

  private mapMigrationInfo(row: MigrationColumns): ContentMigrationInfo {
    return {
      legacySourceUrl: row.legacy_source_url,
      legacySection: row.legacy_section,
      migrationStatus: row.migration_status,
      migrationNote: row.migration_note
    };
  }

  private mapStoredAttachment(row: FileColumns): StoredAttachmentInfo | null {
    if (
      !row.file_stored_name ||
      !row.file_original_name ||
      !row.file_mime_type ||
      !row.file_uploaded_at
    ) {
      return null;
    }

    return {
      storedName: row.file_stored_name,
      originalName: row.file_original_name,
      mimeType: row.file_mime_type,
      sizeBytes: Number(row.file_size_bytes ?? 0),
      uploadedAt: new Date(row.file_uploaded_at).toISOString(),
      uploadedByDisplayName: row.file_uploaded_by_display_name ?? null,
      uploadedByUserId: row.file_uploaded_by_user_id,
      description: row.file_description ?? null
    };
  }

  private buildDocumentAuditMetadata(
    document: PublicDocumentRecord | BackofficePublicDocumentRecord
  ): Record<string, unknown> {
    const metadata: Record<string, unknown> = {
      title: document.title,
      category: document.category,
      publicationDate: document.publicationDate,
      status: document.status,
      originalName: document.attachment?.originalName ?? null
    };

    if ("migration" in document) {
      metadata.migrationStatus = document.migration.migrationStatus;
      metadata.legacySection = document.migration.legacySection;
      metadata.legacySourceUrl = document.migration.legacySourceUrl;
    }

    return metadata;
  }

  private buildMeetingAuditMetadata(
    meeting: MeetingRecord | BackofficeMeetingRecord
  ): Record<string, unknown> {
    const metadata: Record<string, unknown> = {
      title: meeting.title,
      category: meeting.category,
      meetingDate: meeting.meetingDate,
      publicationDate: meeting.publicationDate,
      status: meeting.status,
      originalName: meeting.attachment?.originalName ?? null
    };

    if ("migration" in meeting) {
      metadata.migrationStatus = meeting.migration.migrationStatus;
      metadata.legacySection = meeting.migration.legacySection;
      metadata.legacySourceUrl = meeting.migration.legacySourceUrl;
    }

    return metadata;
  }

  private buildApprovedStandardAuditMetadata(
    standard: ApprovedStandardRecord | BackofficeApprovedStandardRecord
  ): Record<string, unknown> {
    const metadata: Record<string, unknown> = {
      code: standard.code,
      title: standard.title,
      approvalDate: standard.approvalDate,
      publicationDate: standard.publicationDate,
      status: standard.status,
      responsibleSubcommitteeId: standard.responsibleSubcommittee?.id ?? null,
      originalName: standard.attachment?.originalName ?? null
    };

    if ("migration" in standard) {
      metadata.migrationStatus = standard.migration.migrationStatus;
      metadata.legacySection = standard.migration.legacySection;
      metadata.legacySourceUrl = standard.migration.legacySourceUrl;
    }

    return metadata;
  }

  private normalizeMigrationFields(
    payload: {
      legacySection: LegacyContentSection;
      legacySourceUrl?: string | null;
      migrationNote?: string | null;
      migrationStatus: ContentMigrationStatus;
    },
    allowedSections: readonly LegacyContentSection[],
    defaultSection: LegacyContentSection
  ): ContentMigrationInfo {
    return {
      legacySourceUrl: this.normalizeLegacySourceUrl(payload.legacySourceUrl),
      legacySection: this.parseLegacySection(
        payload.legacySection ?? defaultSection,
        allowedSections
      ),
      migrationStatus: this.parseMigrationStatus(payload.migrationStatus),
      migrationNote: this.normalizeOptionalText(payload.migrationNote)
    };
  }

  private async getLinkedPortalEntityRecord(
    entityType: LinkedPortalEntityType,
    entityId: string
  ): Promise<LinkedPortalEntityReference> {
    switch (entityType) {
      case "NEWS_ITEM": {
        const result = await this.databaseService.query<{ id: string; title: string }>(
          `
            SELECT id, title
            FROM news_items
            WHERE id = $1
            LIMIT 1
          `,
          [entityId]
        );
        const row = result.rows[0];

        if (!row) {
          break;
        }

        return {
          entityType,
          entityId: row.id,
          title: row.title
        };
      }
      case "PUBLIC_DOCUMENT": {
        const result = await this.databaseService.query<{ id: string; title: string }>(
          `
            SELECT id, title
            FROM public_documents
            WHERE id = $1
            LIMIT 1
          `,
          [entityId]
        );
        const row = result.rows[0];

        if (!row) {
          break;
        }

        return {
          entityType,
          entityId: row.id,
          title: row.title
        };
      }
      case "MEETING_RECORD": {
        const result = await this.databaseService.query<{ id: string; title: string }>(
          `
            SELECT id, title
            FROM meeting_records
            WHERE id = $1
            LIMIT 1
          `,
          [entityId]
        );
        const row = result.rows[0];

        if (!row) {
          break;
        }

        return {
          entityType,
          entityId: row.id,
          title: row.title
        };
      }
      case "APPROVED_STANDARD": {
        const result = await this.databaseService.query<{
          code: string;
          id: string;
          title: string;
        }>(
          `
            SELECT id, code, title
            FROM approved_standards
            WHERE id = $1
            LIMIT 1
          `,
          [entityId]
        );
        const row = result.rows[0];

        if (!row) {
          break;
        }

        return {
          entityType,
          entityId: row.id,
          title: `${row.code} — ${row.title}`
        };
      }
      default:
        break;
    }

    throw new BadRequestException("Связанная запись портала не найдена.");
  }

  private inferLinkedPortalEntityTypeFromLegacySection(
    legacySection: LegacyContentSection
  ): LinkedPortalEntityType {
    if (NEWS_LEGACY_SECTIONS.includes(legacySection)) {
      return "NEWS_ITEM";
    }

    if (DOCUMENT_LEGACY_SECTIONS.includes(legacySection)) {
      return "PUBLIC_DOCUMENT";
    }

    if (MEETING_LEGACY_SECTIONS.includes(legacySection)) {
      return "MEETING_RECORD";
    }

    if (APPROVED_STANDARD_LEGACY_SECTIONS.includes(legacySection)) {
      return "APPROVED_STANDARD";
    }

    throw new BadRequestException("Для выбранного раздела старого сайта нельзя определить тип записи портала.");
  }

  private mapLegacySectionToPublicDocumentCategory(
    legacySection: LegacyContentSection
  ): PublicDocumentCategory {
    if (DOCUMENT_LEGACY_SECTIONS.includes(legacySection)) {
      return legacySection as PublicDocumentCategory;
    }

    throw new BadRequestException("Раздел старого сайта не соответствует категории публичного документа.");
  }

  private mapLegacySectionToMeetingCategory(
    legacySection: LegacyContentSection
  ): MeetingRecordCategory {
    if (MEETING_LEGACY_SECTIONS.includes(legacySection)) {
      return legacySection as MeetingRecordCategory;
    }

    throw new BadRequestException("Раздел старого сайта не соответствует категории записи заседания.");
  }

  private buildLegacyInventorySummary(
    item: LegacyContentInventoryRecord,
    fallbackText: string
  ): string {
    const note = item.migrationNote?.trim();
    return note ? `${fallbackText} ${note}`.trim() : fallbackText;
  }

  private buildLegacyInventoryBody(
    item: LegacyContentInventoryRecord,
    fallbackText: string
  ): string {
    const parts = [fallbackText];

    if (item.legacyUrl) {
      parts.push(`Источник на старом сайте: ${item.legacyUrl}`);
    }

    if (item.migrationNote) {
      parts.push(`Комментарий по переносу: ${item.migrationNote}`);
    }

    return parts.join("\n\n");
  }

  private assertLegacySectionSupportsLinkedEntity(
    legacySection: LegacyContentSection,
    entityType: LinkedPortalEntityType
  ): void {
    const allowedSections = this.getAllowedLegacySectionsForLinkedEntity(entityType);

    if (!allowedSections.includes(legacySection)) {
      throw new BadRequestException(
        "Тип связанной записи портала не соответствует выбранному разделу старого сайта."
      );
    }
  }

  private getAllowedLegacySectionsForLinkedEntity(
    entityType: LinkedPortalEntityType
  ): readonly LegacyContentSection[] {
    switch (entityType) {
      case "NEWS_ITEM":
        return NEWS_LEGACY_SECTIONS;
      case "PUBLIC_DOCUMENT":
        return DOCUMENT_LEGACY_SECTIONS;
      case "MEETING_RECORD":
        return MEETING_LEGACY_SECTIONS;
      case "APPROVED_STANDARD":
        return APPROVED_STANDARD_LEGACY_SECTIONS;
      default:
        return LEGACY_CONTENT_SECTIONS;
    }
  }

  private normalizeLegacySourceUrl(value: string | null | undefined): string | null {
    const normalized = this.normalizeOptionalText(value);

    if (!normalized) {
      return null;
    }

    try {
      const parsed = new URL(normalized);

      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        throw new Error("unsupported");
      }

      return parsed.toString();
    } catch {
      throw new BadRequestException("Укажите корректную ссылку на материал старого сайта.");
    }
  }

  private parseLegacySection(
    value: string,
    allowedSections = LEGACY_CONTENT_SECTIONS
  ): LegacyContentSection {
    if (
      LEGACY_CONTENT_SECTIONS.includes(value as LegacyContentSection) &&
      allowedSections.includes(value as LegacyContentSection)
    ) {
      return value as LegacyContentSection;
    }

    throw new BadRequestException("Выберите корректный раздел старого сайта.");
  }

  private parseMigrationStatus(value: string): ContentMigrationStatus {
    if (MIGRATION_STATUSES.includes(value as ContentMigrationStatus)) {
      return value as ContentMigrationStatus;
    }

    throw new BadRequestException("Выберите корректный статус переноса.");
  }

  private parseLegacyInventoryStatus(value: string): LegacyContentInventoryStatus {
    if (LEGACY_CONTENT_INVENTORY_STATUSES.includes(value as LegacyContentInventoryStatus)) {
      return value as LegacyContentInventoryStatus;
    }

    throw new BadRequestException("Выберите корректный статус реестра старого сайта.");
  }

  private parseLinkedPortalEntityType(value: string): LinkedPortalEntityType {
    if (LINKED_PORTAL_ENTITY_TYPES.includes(value as LinkedPortalEntityType)) {
      return value as LinkedPortalEntityType;
    }

    throw new BadRequestException("Выберите корректный тип связанной записи портала.");
  }

  private filterDraftStandardsForPublic(
    draftStandards: StandardsPageData["draftStandards"],
    filters: PublicStandardsFilters
  ): StandardsPageData["draftStandards"] {
    const query = this.normalizeOptionalText(filters.q)?.toLocaleLowerCase("ru") ?? null;
    const responsibleSubcommitteeId = this.normalizeOptionalText(
      filters.responsibleSubcommitteeId
    );
    const hasDateFilter = Boolean(
      this.normalizeOptionalText(filters.dateFrom) || this.normalizeOptionalText(filters.dateTo)
    );

    if (hasDateFilter) {
      return [];
    }

    return draftStandards.filter((standard) => {
      if (
        responsibleSubcommitteeId &&
        standard.responsibleSubcommittee?.id !== responsibleSubcommitteeId
      ) {
        return false;
      }

      if (!query) {
        return true;
      }

      return [
        standard.code,
        standard.title,
        standard.summary,
        standard.stage,
        standard.responsibleSubcommittee?.code ?? "",
        standard.responsibleSubcommittee?.title ?? "",
        standard.responsibleSubcommittee?.hostOrganization.name ?? ""
      ]
        .join(" ")
        .toLocaleLowerCase("ru")
        .includes(query);
    });
  }

  private appendPublicNewsFilters(
    conditions: string[],
    values: unknown[],
    filters: PublicNewsFilters
  ): void {
    this.appendPublicTextSearchFilter(conditions, values, filters.q, [
      "title",
      "excerpt",
      "body"
    ]);
    this.appendPublicDateRangeFilters(
      conditions,
      values,
      filters.dateFrom,
      filters.dateTo,
      "publication_date",
      "Укажите корректную начальную дату фильтра новостей.",
      "Укажите корректную конечную дату фильтра новостей."
    );
  }

  private appendPublicDocumentsFilters(
    conditions: string[],
    values: unknown[],
    filters: PublicDocumentsFilters,
    tableAlias: string
  ): void {
    if (filters.category) {
      values.push(this.parseDocumentCategory(filters.category));
      conditions.push(`${tableAlias}.category = $${values.length}`);
    }

    this.appendPublicTextSearchFilter(conditions, values, filters.q, [
      `${tableAlias}.title`,
      `${tableAlias}.summary`,
      `${tableAlias}.body`,
      `${tableAlias}.file_original_name`,
      `${tableAlias}.file_description`
    ]);
    this.appendPublicDateRangeFilters(
      conditions,
      values,
      filters.dateFrom,
      filters.dateTo,
      `${tableAlias}.publication_date`,
      "Укажите корректную начальную дату фильтра документов.",
      "Укажите корректную конечную дату фильтра документов."
    );
  }

  private appendPublicMeetingsFilters(
    conditions: string[],
    values: unknown[],
    filters: PublicMeetingsFilters,
    tableAlias: string
  ): void {
    if (filters.category) {
      values.push(this.parseMeetingCategory(filters.category));
      conditions.push(`${tableAlias}.category = $${values.length}`);
    }

    this.appendPublicTextSearchFilter(conditions, values, filters.q, [
      `${tableAlias}.title`,
      `${tableAlias}.summary`,
      `${tableAlias}.body`,
      `${tableAlias}.location`,
      `${tableAlias}.file_original_name`,
      `${tableAlias}.file_description`
    ]);
    this.appendPublicDateRangeFilters(
      conditions,
      values,
      filters.dateFrom,
      filters.dateTo,
      `${tableAlias}.meeting_date`,
      "Укажите корректную начальную дату фильтра заседаний.",
      "Укажите корректную конечную дату фильтра заседаний."
    );
  }

  private appendPublicApprovedStandardsFilters(
    conditions: string[],
    values: unknown[],
    filters: PublicStandardsFilters,
    tableAlias: string
  ): void {
    const responsibleSubcommitteeId = this.normalizeOptionalText(
      filters.responsibleSubcommitteeId
    );

    if (responsibleSubcommitteeId) {
      values.push(responsibleSubcommitteeId);
      conditions.push(`${tableAlias}.responsible_subcommittee_id = $${values.length}`);
    }

    this.appendPublicTextSearchFilter(conditions, values, filters.q, [
      `${tableAlias}.code`,
      `${tableAlias}.title`,
      `${tableAlias}.summary`,
      "sc.code",
      "sc.title",
      "host.name",
      "host.short_name"
    ]);
    this.appendPublicDateRangeFilters(
      conditions,
      values,
      filters.dateFrom,
      filters.dateTo,
      `${tableAlias}.publication_date`,
      "Укажите корректную начальную дату фильтра стандартов.",
      "Укажите корректную конечную дату фильтра стандартов."
    );
  }

  private appendPublicTextSearchFilter(
    conditions: string[],
    values: unknown[],
    query: string | null | undefined,
    columns: readonly string[]
  ): void {
    const normalizedQuery = this.normalizeOptionalText(query);

    if (!normalizedQuery) {
      return;
    }

    values.push(`%${normalizedQuery}%`);
    const placeholder = `$${values.length}`;
    conditions.push(
      `(${columns.map((column) => `${column} ILIKE ${placeholder}`).join(" OR ")})`
    );
  }

  private appendPublicDateRangeFilters(
    conditions: string[],
    values: unknown[],
    dateFrom: string | null | undefined,
    dateTo: string | null | undefined,
    column: string,
    fromErrorMessage: string,
    toErrorMessage: string
  ): void {
    const normalizedDateFrom = this.parsePublicFilterDateBoundary(
      dateFrom,
      fromErrorMessage,
      false
    );
    const normalizedDateTo = this.parsePublicFilterDateBoundary(
      dateTo,
      toErrorMessage,
      true
    );

    if (
      normalizedDateFrom &&
      normalizedDateTo &&
      new Date(normalizedDateFrom).getTime() > new Date(normalizedDateTo).getTime()
    ) {
      throw new BadRequestException(
        "Дата окончания фильтра не может быть раньше даты начала."
      );
    }

    if (normalizedDateFrom) {
      values.push(normalizedDateFrom);
      conditions.push(`${column} >= $${values.length}`);
    }

    if (normalizedDateTo) {
      values.push(normalizedDateTo);
      conditions.push(`${column} <= $${values.length}`);
    }
  }

  private parsePublicStandardsSection(value: string): PublicStandardsSection {
    if (PUBLIC_STANDARDS_SECTIONS.includes(value as PublicStandardsSection)) {
      return value as PublicStandardsSection;
    }

    throw new BadRequestException("Выберите корректный раздел стандартов.");
  }

  private buildMigrationWhereClause(
    filters: BackofficeContentListFilters,
    tableName: string
  ): { sql: string; values: unknown[] } {
    const conditions: string[] = [];
    const values: unknown[] = [];

    this.appendMigrationFilters(conditions, values, filters, tableName);

    return {
      sql: conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "",
      values
    };
  }

  private appendMigrationFilters(
    conditions: string[],
    values: unknown[],
    filters: BackofficeContentListFilters,
    tableAlias: string
  ): void {
    if (filters.migrationStatus) {
      values.push(this.parseMigrationStatus(filters.migrationStatus));
      conditions.push(`${tableAlias}.migration_status = $${values.length}`);
    }

    if (filters.legacySection) {
      values.push(this.parseLegacySection(filters.legacySection));
      conditions.push(`${tableAlias}.legacy_section = $${values.length}`);
    }
  }

  private appendLegacyInventoryFilters(
    conditions: string[],
    values: unknown[],
    filters: LegacyContentInventoryFilters,
    tableAlias: string
  ): void {
    if (filters.migrationStatus) {
      values.push(this.parseLegacyInventoryStatus(filters.migrationStatus));
      conditions.push(`${tableAlias}.migration_status = $${values.length}`);
    }

    if (filters.legacySection) {
      values.push(this.parseLegacySection(filters.legacySection));
      conditions.push(`${tableAlias}.legacy_section = $${values.length}`);
    }
  }

  private parseDocumentCategory(value: string): PublicDocumentCategory {
    if (PUBLIC_DOCUMENT_CATEGORY_ORDER.includes(value as PublicDocumentCategory)) {
      return value as PublicDocumentCategory;
    }

    throw new BadRequestException("Выберите корректную категорию публичного документа.");
  }

  private parseMeetingCategory(value: string): MeetingRecordCategory {
    if (MEETING_CATEGORY_ORDER.includes(value as MeetingRecordCategory)) {
      return value as MeetingRecordCategory;
    }

    throw new BadRequestException("Выберите корректную категорию записи заседания.");
  }

  private parseDate(value: string, errorMessage: string): string {
    const parsed = new Date(value);

    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException(errorMessage);
    }

    return parsed.toISOString();
  }

  private parsePublicFilterDateBoundary(
    value: string | null | undefined,
    errorMessage: string,
    endOfDay: boolean
  ): string | null {
    const normalized = this.normalizeOptionalText(value);

    if (!normalized) {
      return null;
    }

    const parsed = new Date(normalized);

    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException(errorMessage);
    }

    if (/^\d{4}-\d{2}-\d{2}$/u.test(normalized)) {
      if (endOfDay) {
        parsed.setUTCHours(23, 59, 59, 999);
      } else {
        parsed.setUTCHours(0, 0, 0, 0);
      }
    }

    return parsed.toISOString();
  }

  private parseOptionalDate(
    value: string | null | undefined,
    errorMessage: string
  ): string | null {
    const normalized = this.normalizeOptionalText(value);

    return normalized ? this.parseDate(normalized, errorMessage) : null;
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
