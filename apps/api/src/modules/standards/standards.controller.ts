import { createReadStream } from "node:fs";

import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import type {
  BackofficeApprovedStandardRecord,
  ApprovedStandardRecord,
  ContentMigrationStatus,
  CreateApprovedStandardDto,
  LegacyContentSection,
  PublicStandardsFilters,
  PublicStandardsSection,
  StandardSummary,
  StandardsPageData,
  UpdateApprovedStandardDto
} from "@tk182/shared-types";

import type { AuthenticatedRequest, SetHeaderResponse } from "../auth/auth.types";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { SessionAuthGuard } from "../auth/session-auth.guard";
import type { UploadedBinaryFile } from "../content/content-file-storage.service";
import { StandardsService } from "./standards.service";

@Controller("standards")
export class StandardsController {
  constructor(
    @Inject(StandardsService)
    private readonly standardsService: StandardsService
  ) {}

  @Get()
  listStandards(
    @Query("q") q?: string,
    @Query("responsibleSubcommitteeId") responsibleSubcommitteeId?: string
  ): Promise<StandardSummary[]> {
    return this.standardsService.listStandards({
      ...(q ? { q } : {}),
      ...(responsibleSubcommitteeId ? { responsibleSubcommitteeId } : {})
    });
  }

  @Get("public-content")
  getPublicStandardsPageData(
    @Query("q") q?: string,
    @Query("section") section?: string,
    @Query("dateFrom") dateFrom?: string,
    @Query("dateTo") dateTo?: string,
    @Query("responsibleSubcommitteeId") responsibleSubcommitteeId?: string
  ): Promise<StandardsPageData> {
    const filters: PublicStandardsFilters = {};
    if (q) {
      filters.q = q;
    }
    if (section) {
      filters.section = section as PublicStandardsSection;
    }
    if (dateFrom) {
      filters.dateFrom = dateFrom;
    }
    if (dateTo) {
      filters.dateTo = dateTo;
    }
    if (responsibleSubcommitteeId) {
      filters.responsibleSubcommitteeId = responsibleSubcommitteeId;
    }

    return this.standardsService.getPublicStandardsPageData(filters);
  }

  @Get("approved/:standardId")
  getPublicApprovedStandard(
    @Param("standardId") standardId: string
  ): Promise<ApprovedStandardRecord> {
    return this.standardsService.getPublicApprovedStandard(standardId);
  }

  @Get("approved/:standardId/download")
  async downloadPublicApprovedStandard(
    @Param("standardId") standardId: string,
    @Res({ passthrough: true }) response: SetHeaderResponse
  ): Promise<StreamableFile> {
    const download = await this.standardsService.getPublicApprovedStandardDownload(
      standardId
    );

    response.setHeader("Content-Type", download.mimeType);
    response.setHeader("Content-Length", String(download.sizeBytes));
    response.setHeader("Content-Disposition", download.contentDisposition);

    return new StreamableFile(createReadStream(download.streamPath));
  }

  @Get("backoffice/approved")
  @UseGuards(SessionAuthGuard, RolesGuard)
  @Roles("SECRETARIAT", "ADMIN")
  listBackofficeApprovedStandards(
    @Query("migrationStatus") migrationStatus?: string,
    @Query("legacySection") legacySection?: string
  ): Promise<BackofficeApprovedStandardRecord[]> {
    return this.standardsService.listBackofficeApprovedStandards({
      ...(migrationStatus
        ? { migrationStatus: migrationStatus as ContentMigrationStatus }
        : {}),
      ...(legacySection ? { legacySection: legacySection as LegacyContentSection } : {})
    });
  }

  @Post("backoffice/approved")
  @UseGuards(SessionAuthGuard, RolesGuard)
  @Roles("SECRETARIAT", "ADMIN")
  @UseInterceptors(FileInterceptor("file"))
  createApprovedStandard(
    @Req() request: AuthenticatedRequest,
    @Body() payload: CreateApprovedStandardDto,
    @UploadedFile() file: UploadedBinaryFile | undefined
  ): Promise<BackofficeApprovedStandardRecord> {
    return this.standardsService.createApprovedStandard(
      request.authSession!.user.id,
      payload,
      file
    );
  }

  @Patch("backoffice/approved/:standardId")
  @UseGuards(SessionAuthGuard, RolesGuard)
  @Roles("SECRETARIAT", "ADMIN")
  @UseInterceptors(FileInterceptor("file"))
  updateApprovedStandard(
    @Req() request: AuthenticatedRequest,
    @Param("standardId") standardId: string,
    @Body() payload: UpdateApprovedStandardDto,
    @UploadedFile() file: UploadedBinaryFile | undefined
  ): Promise<BackofficeApprovedStandardRecord> {
    return this.standardsService.updateApprovedStandard(
      request.authSession!.user.id,
      standardId,
      payload,
      file
    );
  }

  @Post("backoffice/approved/:standardId/publish")
  @UseGuards(SessionAuthGuard, RolesGuard)
  @Roles("SECRETARIAT", "ADMIN")
  publishApprovedStandard(
    @Req() request: AuthenticatedRequest,
    @Param("standardId") standardId: string
  ): Promise<BackofficeApprovedStandardRecord> {
    return this.standardsService.publishApprovedStandard(
      request.authSession!.user.id,
      standardId
    );
  }

  @Post("backoffice/approved/:standardId/unpublish")
  @UseGuards(SessionAuthGuard, RolesGuard)
  @Roles("SECRETARIAT", "ADMIN")
  unpublishApprovedStandard(
    @Req() request: AuthenticatedRequest,
    @Param("standardId") standardId: string
  ): Promise<BackofficeApprovedStandardRecord> {
    return this.standardsService.unpublishApprovedStandard(
      request.authSession!.user.id,
      standardId
    );
  }

  @Get("backoffice/approved/:standardId/download")
  @UseGuards(SessionAuthGuard, RolesGuard)
  @Roles("SECRETARIAT", "ADMIN")
  async downloadBackofficeApprovedStandard(
    @Param("standardId") standardId: string,
    @Res({ passthrough: true }) response: SetHeaderResponse
  ): Promise<StreamableFile> {
    const download = await this.standardsService.getBackofficeApprovedStandardDownload(
      standardId
    );

    response.setHeader("Content-Type", download.mimeType);
    response.setHeader("Content-Length", String(download.sizeBytes));
    response.setHeader("Content-Disposition", download.contentDisposition);

    return new StreamableFile(createReadStream(download.streamPath));
  }
}
