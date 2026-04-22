import { Injectable } from "@nestjs/common";
import type {
  BackofficeContentListFilters,
  BackofficePublicDocumentRecord,
  CreatePublicDocumentDto,
  DocumentSummary,
  PaginatedResult,
  PublicDocumentRecord,
  PublicDocumentsPageData,
  UpdatePublicDocumentDto
} from "@tk182/shared-types";

import { DatabaseService } from "../../common/database/database.service";
import { ContentService } from "../content/content.service";
import type { UploadedBinaryFile } from "../content/content-file-storage.service";

type DocumentVisibility = DocumentSummary["visibility"];

interface DocumentRow {
  category: string;
  id: string;
  published_at: string;
  summary: string;
  title: string;
  visibility: DocumentVisibility;
}

@Injectable()
export class DocumentsService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly contentService: ContentService
  ) {}

  getPublicDocumentsPageData(): Promise<PublicDocumentsPageData> {
    return this.contentService.getPublicDocumentsPageData();
  }

  listBackofficePublicDocuments(
    filters: BackofficeContentListFilters = {}
  ): Promise<BackofficePublicDocumentRecord[]> {
    return this.contentService.listBackofficePublicDocuments(filters);
  }

  createPublicDocument(
    userId: string,
    payload: CreatePublicDocumentDto,
    file?: UploadedBinaryFile
  ): Promise<BackofficePublicDocumentRecord> {
    return this.contentService.createPublicDocument(userId, payload, file);
  }

  updatePublicDocument(
    userId: string,
    documentId: string,
    payload: UpdatePublicDocumentDto,
    file?: UploadedBinaryFile
  ): Promise<BackofficePublicDocumentRecord> {
    return this.contentService.updatePublicDocument(userId, documentId, payload, file);
  }

  publishPublicDocument(
    userId: string,
    documentId: string
  ): Promise<BackofficePublicDocumentRecord> {
    return this.contentService.publishPublicDocument(userId, documentId);
  }

  unpublishPublicDocument(
    userId: string,
    documentId: string
  ): Promise<BackofficePublicDocumentRecord> {
    return this.contentService.unpublishPublicDocument(userId, documentId);
  }

  getPublicDocumentDownload(documentId: string) {
    return this.contentService.getPublicDocumentDownload(documentId);
  }

  getBackofficePublicDocumentDownload(documentId: string) {
    return this.contentService.getBackofficePublicDocumentDownload(documentId);
  }

  listPublicDocuments(): Promise<PaginatedResult<DocumentSummary>> {
    return this.listDocumentsByVisibility(["public"]);
  }

  listParticipantDocuments(): Promise<PaginatedResult<DocumentSummary>> {
    return this.listDocumentsByVisibility(["public", "participant"]);
  }

  listSecretariatDocuments(): Promise<PaginatedResult<DocumentSummary>> {
    return this.listDocumentsByVisibility(["public", "participant", "secretariat"]);
  }

  private async listDocumentsByVisibility(
    visibility: DocumentVisibility[]
  ): Promise<PaginatedResult<DocumentSummary>> {
    const placeholders = visibility.map((_, index) => `$${index + 1}`).join(", ");
    const result = await this.databaseService.query<DocumentRow>(
      `
        SELECT id, title, category, visibility, summary, published_at
        FROM documents
        WHERE visibility IN (${placeholders})
        ORDER BY published_at DESC, title ASC
      `,
      visibility
    );

    const items = result.rows.map((row) => ({
      id: row.id,
      title: row.title,
      category: row.category,
      visibility: row.visibility,
      summary: row.summary,
      publishedAt: new Date(row.published_at).toISOString()
    }));

    return {
      items,
      total: items.length,
      page: 1,
      pageSize: items.length
    };
  }
}
