import { randomUUID } from "node:crypto";

import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import type {
  ApprovedStandardRecord,
  ContentFileAttachment,
  CreateApprovedStandardDto,
  CreateMeetingRecordDto,
  CreateNewsItemDto,
  CreatePublicDocumentDto,
  MeetingRecord,
  MeetingsPageData,
  MeetingRecordCategory,
  NewsItemRecord,
  PublicDocumentCategory,
  PublicDocumentRecord,
  PublicDocumentsPageData,
  StandardsPageData,
  UpdateApprovedStandardDto,
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

interface NewsRow {
  body: string;
  id: string;
  excerpt: string;
  publication_date: string;
  published_at: string | null;
  status: PublicationStatus;
  title: string;
}

interface PublicDocumentRow extends FileColumns {
  category: PublicDocumentCategory;
  id: string;
  publication_date: string;
  published_at: string | null;
  status: PublicationStatus;
  summary: string;
  title: string;
}

interface MeetingRow extends FileColumns {
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

interface ApprovedStandardRow extends FileColumns {
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

export interface ContentDownload {
  contentDisposition: string;
  mimeType: string;
  sizeBytes: number;
  streamPath: string;
}

@Injectable()
export class ContentService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly auditService: AuditService,
    private readonly contentFileStorageService: ContentFileStorageService
  ) {}

  async listPublishedNewsItems(): Promise<NewsItemRecord[]> {
    const result = await this.databaseService.query<NewsRow>(
      `
        SELECT
          id,
          title,
          excerpt,
          body,
          status,
          publication_date,
          published_at
        FROM news_items
        WHERE status = 'published'
        ORDER BY publication_date DESC, created_at DESC
      `
    );

    return result.rows.map((row) => this.mapNewsItem(row));
  }

  async listBackofficeNewsItems(): Promise<NewsItemRecord[]> {
    const result = await this.databaseService.query<NewsRow>(
      `
        SELECT
          id,
          title,
          excerpt,
          body,
          status,
          publication_date,
          published_at
        FROM news_items
        ORDER BY publication_date DESC, created_at DESC
      `
    );

    return result.rows.map((row) => this.mapNewsItem(row));
  }

  async createNewsItem(userId: string, payload: CreateNewsItemDto): Promise<NewsItemRecord> {
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
          created_by_user_id,
          updated_by_user_id,
          updated_at
        )
        VALUES ($1, $2, $3, $4, 'draft', $5, $6, $6, NOW())
      `,
      [
        newsId,
        normalized.title,
        normalized.excerpt,
        normalized.body,
        normalized.publicationDate,
        userId
      ]
    );

    const item = await this.getNewsItemById(newsId);

    await this.auditService.recordEvent({
      actorUserId: userId,
      actionType: "NEWS_ITEM_CREATED",
      entityType: "NEWS_ITEM",
      entityId: newsId,
      message: `Создана новость «${item.title}».`,
      metadata: {
        title: item.title,
        publicationDate: item.publicationDate,
        status: item.status
      }
    });

    return item;
  }

  async updateNewsItem(
    userId: string,
    newsId: string,
    payload: UpdateNewsItemDto
  ): Promise<NewsItemRecord> {
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
          updated_by_user_id = $6,
          updated_at = NOW()
        WHERE id = $1
      `,
      [
        newsId,
        normalized.title,
        normalized.excerpt,
        normalized.body,
        normalized.publicationDate,
        userId
      ]
    );

    const item = await this.getNewsItemById(newsId);

    await this.auditService.recordEvent({
      actorUserId: userId,
      actionType: "NEWS_ITEM_UPDATED",
      entityType: "NEWS_ITEM",
      entityId: newsId,
      message: `Обновлена новость «${item.title}».`,
      metadata: {
        title: item.title,
        publicationDate: item.publicationDate,
        status: item.status
      }
    });

    return item;
  }

  async publishNewsItem(userId: string, newsId: string): Promise<NewsItemRecord> {
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
        status: item.status
      }
    });

    return item;
  }

  async unpublishNewsItem(userId: string, newsId: string): Promise<NewsItemRecord> {
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
        status: item.status
      }
    });

    return item;
  }

  async listPublishedPublicDocumentsByCategories(
    categories: readonly PublicDocumentCategory[]
  ): Promise<PublicDocumentRecord[]> {
    const rows = await this.listPublicDocumentRows(true, categories);
    return rows.map((row) => this.mapPublicDocument(row));
  }

  async getPublicDocumentsPageData(): Promise<PublicDocumentsPageData> {
    const rows = await this.listPublicDocumentRows(true, [
      "MAIN_DOCUMENTS",
      "WORK_REPORTS",
      "WORK_PLANS"
    ]);

    return {
      sections: PUBLIC_DOCUMENT_CATEGORY_ORDER.filter(
        (category) => category !== "NATIONAL_STANDARDS_PROGRAM"
      ).map((category) => ({
        category,
        documents: rows
          .filter((row) => row.category === category)
          .map((row) => this.mapPublicDocument(row))
      }))
    };
  }

  async listBackofficePublicDocuments(): Promise<PublicDocumentRecord[]> {
    const rows = await this.listPublicDocumentRows(false);
    return rows.map((row) => this.mapPublicDocument(row));
  }

  async createPublicDocument(
    userId: string,
    payload: CreatePublicDocumentDto,
    file?: UploadedBinaryFile
  ): Promise<PublicDocumentRecord> {
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
            status,
            publication_date,
            file_original_name,
            file_stored_name,
            file_mime_type,
            file_size_bytes,
            file_uploaded_at,
            file_uploaded_by_user_id,
            file_description,
            created_by_user_id,
            updated_by_user_id,
            updated_at
          )
          VALUES (
            $1, $2, $3, $4, 'draft', $5,
            $6, $7, $8, $9, $10, $11, $12, $13, $13, NOW()
          )
        `,
        [
          documentId,
          normalized.title,
          normalized.category,
          normalized.summary,
          normalized.publicationDate,
          savedFile?.originalName ?? null,
          savedFile?.storedName ?? null,
          savedFile?.mimeType ?? null,
          savedFile?.sizeBytes ?? null,
          savedFile ? new Date().toISOString() : null,
          savedFile ? userId : null,
          savedFile ? normalized.fileDescription : null,
          userId
        ]
      );
    } catch (error) {
      await this.contentFileStorageService.deleteStoredFile(savedFile?.storedName);
      throw error;
    }

    const document = await this.getPublicDocumentById(documentId);

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
  ): Promise<PublicDocumentRecord> {
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
            publication_date = $5,
            file_original_name = $6,
            file_stored_name = $7,
            file_mime_type = $8,
            file_size_bytes = $9,
            file_uploaded_at = $10,
            file_uploaded_by_user_id = $11,
            file_description = $12,
            updated_by_user_id = $13,
            updated_at = NOW()
          WHERE id = $1
        `,
        [
          documentId,
          normalized.title,
          normalized.category,
          normalized.summary,
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

    const document = await this.getPublicDocumentById(documentId);

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
  ): Promise<PublicDocumentRecord> {
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
  ): Promise<PublicDocumentRecord> {
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

  async getBackofficePublicDocumentDownload(documentId: string): Promise<ContentDownload> {
    const document = await this.getStoredPublicDocumentById(documentId);
    return this.buildDownload(document.attachment);
  }

  async getMeetingsPageData(): Promise<MeetingsPageData> {
    const rows = await this.listMeetingRows(true);

    return {
      sections: MEETING_CATEGORY_ORDER.map((category) => ({
        category,
        meetings: rows
          .filter((row) => row.category === category)
          .map((row) => this.mapMeeting(row))
      }))
    };
  }

  async listBackofficeMeetingRecords(): Promise<MeetingRecord[]> {
    const rows = await this.listMeetingRows(false);
    return rows.map((row) => this.mapMeeting(row));
  }

  async createMeetingRecord(
    userId: string,
    payload: CreateMeetingRecordDto,
    file?: UploadedBinaryFile
  ): Promise<MeetingRecord> {
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
            created_by_user_id,
            updated_by_user_id,
            updated_at
          )
          VALUES (
            $1, $2, $3, $4, $5, $6, $7, 'draft', $8,
            $9, $10, $11, $12, $13, $14, $15, $16, $16, NOW()
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
          userId
        ]
      );
    } catch (error) {
      await this.contentFileStorageService.deleteStoredFile(savedFile?.storedName);
      throw error;
    }

    const meeting = await this.getMeetingRecordById(meetingId);

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
  ): Promise<MeetingRecord> {
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
            updated_by_user_id = $16,
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

    const meeting = await this.getMeetingRecordById(meetingId);

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

  async publishMeetingRecord(userId: string, meetingId: string): Promise<MeetingRecord> {
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

  async unpublishMeetingRecord(userId: string, meetingId: string): Promise<MeetingRecord> {
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

  async getBackofficeMeetingDownload(meetingId: string): Promise<ContentDownload> {
    const meeting = await this.getStoredMeetingRecordById(meetingId);
    return this.buildDownload(meeting.attachment);
  }

  async listPublishedApprovedStandards(): Promise<ApprovedStandardRecord[]> {
    const rows = await this.listApprovedStandardRows(true);
    return rows.map((row) => this.mapApprovedStandard(row));
  }

  async listBackofficeApprovedStandards(): Promise<ApprovedStandardRecord[]> {
    const rows = await this.listApprovedStandardRows(false);
    return rows.map((row) => this.mapApprovedStandard(row));
  }

  async createApprovedStandard(
    userId: string,
    payload: CreateApprovedStandardDto,
    file?: UploadedBinaryFile
  ): Promise<ApprovedStandardRecord> {
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
            created_by_user_id,
            updated_by_user_id,
            updated_at
          )
          VALUES (
            $1, $2, $3, $4, $5, 'draft', $6, $7,
            $8, $9, $10, $11, $12, $13, $14, $15, $15, NOW()
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

    const standard = await this.getApprovedStandardById(standardId);

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
  ): Promise<ApprovedStandardRecord> {
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
            updated_by_user_id = $15,
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

    const standard = await this.getApprovedStandardById(standardId);

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
  ): Promise<ApprovedStandardRecord> {
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
  ): Promise<ApprovedStandardRecord> {
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

  async getBackofficeApprovedStandardDownload(
    standardId: string
  ): Promise<ContentDownload> {
    const standard = await this.getStoredApprovedStandardById(standardId);
    return this.buildDownload(standard.attachment);
  }

  async getStandardsPageData(draftStandards: StandardsPageData["draftStandards"]): Promise<StandardsPageData> {
    const [approvedStandards, nationalStandardsProgramDocuments] = await Promise.all([
      this.listPublishedApprovedStandards(),
      this.listPublishedPublicDocumentsByCategories(["NATIONAL_STANDARDS_PROGRAM"])
    ]);

    return {
      draftStandards,
      approvedStandards,
      nationalStandardsProgramDocuments
    };
  }

  private normalizeNewsPayload(
    payload: CreateNewsItemDto | UpdateNewsItemDto
  ): CreateNewsItemDto {
    const title = payload.title.trim();
    const excerpt = payload.excerpt.trim();
    const body = payload.body.trim();
    const publicationDate = this.parseDate(payload.publicationDate, "Укажите дату публикации новости.");

    if (!title || !excerpt || !body) {
      throw new BadRequestException("Заполните заголовок, краткое описание и текст новости.");
    }

    return {
      title,
      excerpt,
      body,
      publicationDate
    };
  }

  private normalizePublicDocumentPayload(
    payload: CreatePublicDocumentDto | UpdatePublicDocumentDto
  ): CreatePublicDocumentDto {
    const title = payload.title.trim();
    const summary = payload.summary.trim();
    const category = this.parseDocumentCategory(payload.category);
    const publicationDate = this.parseDate(
      payload.publicationDate,
      "Укажите дату публикации документа."
    );
    const fileDescription = this.normalizeOptionalText(payload.fileDescription);

    if (!title || !summary) {
      throw new BadRequestException("Заполните заголовок и описание документа.");
    }

    return {
      title,
      category,
      summary,
      publicationDate,
      fileDescription
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
      fileDescription
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
      fileDescription
    };
  }

  private async listPublicDocumentRows(
    publishedOnly: boolean,
    categories?: readonly PublicDocumentCategory[]
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

    const result = await this.databaseService.query<PublicDocumentRow>(
      `
        SELECT
          pd.id,
          pd.title,
          pd.category,
          pd.summary,
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
          pd.file_description
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
          pd.publication_date DESC,
          pd.title ASC
      `,
      values
    );

    return result.rows;
  }

  private async listMeetingRows(publishedOnly: boolean): Promise<MeetingRow[]> {
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
          mr.file_description
        FROM meeting_records mr
        LEFT JOIN users uploader ON uploader.id = mr.file_uploaded_by_user_id
        ${publishedOnly ? "WHERE mr.status = 'published'" : ""}
        ORDER BY
          CASE mr.category
            WHEN 'MEETING_AGENDA' THEN 0
            ELSE 1
          END,
          mr.meeting_date DESC,
          mr.title ASC
      `
    );

    return result.rows;
  }

  private async listApprovedStandardRows(
    publishedOnly: boolean
  ): Promise<ApprovedStandardRow[]> {
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
        ${publishedOnly ? "WHERE aps.status = 'published'" : ""}
        ORDER BY aps.approval_date DESC, aps.code ASC
      `
    );

    return result.rows;
  }

  private async getNewsItemById(newsId: string): Promise<NewsItemRecord> {
    const result = await this.databaseService.query<NewsRow>(
      `
        SELECT
          id,
          title,
          excerpt,
          body,
          status,
          publication_date,
          published_at
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

    return this.mapNewsItem(row);
  }

  private async assertNewsItemExists(newsId: string): Promise<void> {
    await this.getNewsItemById(newsId);
  }

  private async setNewsStatus(
    newsId: string,
    userId: string,
    status: PublicationStatus
  ): Promise<NewsItemRecord> {
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
          published_at
      `,
      [newsId, status, userId]
    );
    const row = result.rows[0];

    if (!row) {
      throw new NotFoundException("Новость не найдена.");
    }

    return this.mapNewsItem(row);
  }

  private async getPublicDocumentById(documentId: string): Promise<PublicDocumentRecord> {
    const stored = await this.getStoredPublicDocumentById(documentId);
    return this.stripStoredDocument(stored);
  }

  private async getStoredPublicDocumentById(
    documentId: string,
    publishedOnly = false
  ): Promise<PublicDocumentRecord & { attachment: StoredAttachmentInfo | null }> {
    const result = await this.databaseService.query<PublicDocumentRow>(
      `
        SELECT
          pd.id,
          pd.title,
          pd.category,
          pd.summary,
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
          pd.file_description
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
  ): Promise<PublicDocumentRecord> {
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
          file_description
      `,
      [documentId, status, userId]
    );
    const row = result.rows[0];

    if (!row) {
      throw new NotFoundException("Публичный документ не найден.");
    }

    return this.mapPublicDocument(row);
  }

  private async getMeetingRecordById(meetingId: string): Promise<MeetingRecord> {
    const stored = await this.getStoredMeetingRecordById(meetingId);
    return this.stripStoredMeeting(stored);
  }

  private async getStoredMeetingRecordById(
    meetingId: string,
    publishedOnly = false
  ): Promise<MeetingRecord & { attachment: StoredAttachmentInfo | null }> {
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
          mr.file_description
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
  ): Promise<MeetingRecord> {
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
          file_description
      `,
      [meetingId, status, userId]
    );
    const row = result.rows[0];

    if (!row) {
      throw new NotFoundException("Запись заседания не найдена.");
    }

    return this.mapMeeting(row);
  }

  private async getApprovedStandardById(
    standardId: string
  ): Promise<ApprovedStandardRecord> {
    const stored = await this.getStoredApprovedStandardById(standardId);
    return this.stripStoredApprovedStandard(stored);
  }

  private async getStoredApprovedStandardById(
    standardId: string,
    publishedOnly = false
  ): Promise<ApprovedStandardRecord & { attachment: StoredAttachmentInfo | null }> {
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
  ): Promise<ApprovedStandardRecord> {
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

    return this.getApprovedStandardById(row.id);
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
    return {
      id: row.id,
      title: row.title,
      excerpt: row.excerpt,
      body: row.body,
      status: row.status,
      publicationDate: new Date(row.publication_date).toISOString(),
      publishedAt: row.published_at ? new Date(row.published_at).toISOString() : null
    };
  }

  private mapPublicDocument(row: PublicDocumentRow): PublicDocumentRecord {
    return this.stripStoredDocument(this.mapStoredPublicDocument(row));
  }

  private mapStoredPublicDocument(
    row: PublicDocumentRow
  ): PublicDocumentRecord & { attachment: StoredAttachmentInfo | null } {
    return {
      id: row.id,
      title: row.title,
      category: row.category,
      summary: row.summary,
      status: row.status,
      publicationDate: new Date(row.publication_date).toISOString(),
      publishedAt: row.published_at ? new Date(row.published_at).toISOString() : null,
      attachment: this.mapStoredAttachment(row)
    };
  }

  private stripStoredDocument(
    record: PublicDocumentRecord & { attachment: StoredAttachmentInfo | null }
  ): PublicDocumentRecord {
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
    return this.stripStoredMeeting(this.mapStoredMeeting(row));
  }

  private mapStoredMeeting(
    row: MeetingRow
  ): MeetingRecord & { attachment: StoredAttachmentInfo | null } {
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
      attachment: this.mapStoredAttachment(row)
    };
  }

  private stripStoredMeeting(
    record: MeetingRecord & { attachment: StoredAttachmentInfo | null }
  ): MeetingRecord {
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
    return this.stripStoredApprovedStandard(this.mapStoredApprovedStandard(row));
  }

  private mapStoredApprovedStandard(
    row: ApprovedStandardRow
  ): ApprovedStandardRecord & { attachment: StoredAttachmentInfo | null } {
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
    record: ApprovedStandardRecord & { attachment: StoredAttachmentInfo | null }
  ): ApprovedStandardRecord {
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

  private buildDocumentAuditMetadata(document: PublicDocumentRecord): Record<string, unknown> {
    return {
      title: document.title,
      category: document.category,
      publicationDate: document.publicationDate,
      status: document.status,
      originalName: document.attachment?.originalName ?? null
    };
  }

  private buildMeetingAuditMetadata(meeting: MeetingRecord): Record<string, unknown> {
    return {
      title: meeting.title,
      category: meeting.category,
      meetingDate: meeting.meetingDate,
      publicationDate: meeting.publicationDate,
      status: meeting.status,
      originalName: meeting.attachment?.originalName ?? null
    };
  }

  private buildApprovedStandardAuditMetadata(
    standard: ApprovedStandardRecord
  ): Record<string, unknown> {
    return {
      code: standard.code,
      title: standard.title,
      approvalDate: standard.approvalDate,
      publicationDate: standard.publicationDate,
      status: standard.status,
      responsibleSubcommitteeId: standard.responsibleSubcommittee?.id ?? null,
      originalName: standard.attachment?.originalName ?? null
    };
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
