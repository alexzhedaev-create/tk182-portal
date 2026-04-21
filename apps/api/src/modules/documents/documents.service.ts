import { Injectable } from "@nestjs/common";
import type { DocumentSummary, PaginatedResult } from "@tk182/shared-types";

import { DatabaseService } from "../../common/database/database.service";

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
  constructor(private readonly databaseService: DatabaseService) {}

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
