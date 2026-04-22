import { Injectable } from "@nestjs/common";
import type {
  ApprovedStandardRecord,
  CreateApprovedStandardDto,
  StandardSummary,
  StandardsPageData,
  UpdateApprovedStandardDto
} from "@tk182/shared-types";

import { DatabaseService } from "../../common/database/database.service";
import { ContentService } from "../content/content.service";
import type { UploadedBinaryFile } from "../content/content-file-storage.service";

interface StandardRow {
  code: string;
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
}

@Injectable()
export class StandardsService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly contentService: ContentService
  ) {}

  async listStandards(): Promise<StandardSummary[]> {
    const result = await this.databaseService.query<StandardRow>(
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
          host.country_code AS responsible_subcommittee_host_country_code
        FROM draft_standards ds
        LEFT JOIN subcommittees sc ON sc.id = ds.responsible_subcommittee_id
        LEFT JOIN organizations host ON host.id = sc.host_organization_id
        ORDER BY ds.code ASC
      `
    );

    return result.rows.map((row) => ({
      id: row.id,
      code: row.code,
      title: row.title,
      summary: row.summary,
      stage: row.stage,
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
    }));
  }

  async getPublicStandardsPageData(): Promise<StandardsPageData> {
    const draftStandards = await this.listStandards();
    return this.contentService.getStandardsPageData(draftStandards);
  }

  listBackofficeApprovedStandards(): Promise<ApprovedStandardRecord[]> {
    return this.contentService.listBackofficeApprovedStandards();
  }

  createApprovedStandard(
    userId: string,
    payload: CreateApprovedStandardDto,
    file?: UploadedBinaryFile
  ): Promise<ApprovedStandardRecord> {
    return this.contentService.createApprovedStandard(userId, payload, file);
  }

  updateApprovedStandard(
    userId: string,
    standardId: string,
    payload: UpdateApprovedStandardDto,
    file?: UploadedBinaryFile
  ): Promise<ApprovedStandardRecord> {
    return this.contentService.updateApprovedStandard(userId, standardId, payload, file);
  }

  publishApprovedStandard(userId: string, standardId: string): Promise<ApprovedStandardRecord> {
    return this.contentService.publishApprovedStandard(userId, standardId);
  }

  unpublishApprovedStandard(
    userId: string,
    standardId: string
  ): Promise<ApprovedStandardRecord> {
    return this.contentService.unpublishApprovedStandard(userId, standardId);
  }

  getPublicApprovedStandardDownload(standardId: string) {
    return this.contentService.getPublicApprovedStandardDownload(standardId);
  }

  getBackofficeApprovedStandardDownload(standardId: string) {
    return this.contentService.getBackofficeApprovedStandardDownload(standardId);
  }
}
