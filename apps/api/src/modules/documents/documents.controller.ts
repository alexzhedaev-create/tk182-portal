import { createReadStream } from "node:fs";

import {
  Body,
  Controller,
  Get,
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
  BackofficePublicDocumentRecord,
  ContentMigrationStatus,
  CreatePublicDocumentDto,
  DocumentSummary,
  LegacyContentSection,
  PaginatedResult,
  PublicDocumentRecord,
  PublicDocumentsPageData,
  UpdatePublicDocumentDto
} from "@tk182/shared-types";

import type { AuthenticatedRequest, SetHeaderResponse } from "../auth/auth.types";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { SessionAuthGuard } from "../auth/session-auth.guard";
import type { UploadedBinaryFile } from "../content/content-file-storage.service";
import { DocumentsService } from "./documents.service";

@Controller("documents")
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get()
  getPublicDocuments(): Promise<PublicDocumentsPageData> {
    return this.documentsService.getPublicDocumentsPageData();
  }

  @Get("public/:documentId")
  getPublicDocument(
    @Param("documentId") documentId: string
  ): Promise<PublicDocumentRecord> {
    return this.documentsService.getPublicDocument(documentId);
  }

  @Get("public/:documentId/download")
  async downloadPublicDocument(
    @Param("documentId") documentId: string,
    @Res({ passthrough: true }) response: SetHeaderResponse
  ): Promise<StreamableFile> {
    const download = await this.documentsService.getPublicDocumentDownload(documentId);

    response.setHeader("Content-Type", download.mimeType);
    response.setHeader("Content-Length", String(download.sizeBytes));
    response.setHeader("Content-Disposition", download.contentDisposition);

    return new StreamableFile(createReadStream(download.streamPath));
  }

  @Get("participant")
  @UseGuards(SessionAuthGuard, RolesGuard)
  @Roles("PARTICIPANT")
  getParticipantDocuments(): Promise<PaginatedResult<DocumentSummary>> {
    return this.documentsService.listParticipantDocuments();
  }

  @Get("secretariat")
  @UseGuards(SessionAuthGuard, RolesGuard)
  @Roles("SECRETARIAT", "ADMIN")
  getSecretariatDocuments(): Promise<PaginatedResult<DocumentSummary>> {
    return this.documentsService.listSecretariatDocuments();
  }

  @Get("backoffice")
  @UseGuards(SessionAuthGuard, RolesGuard)
  @Roles("SECRETARIAT", "ADMIN")
  listBackofficePublicDocuments(
    @Query("migrationStatus") migrationStatus?: string,
    @Query("legacySection") legacySection?: string
  ): Promise<BackofficePublicDocumentRecord[]> {
    return this.documentsService.listBackofficePublicDocuments({
      ...(migrationStatus
        ? { migrationStatus: migrationStatus as ContentMigrationStatus }
        : {}),
      ...(legacySection ? { legacySection: legacySection as LegacyContentSection } : {})
    });
  }

  @Post("backoffice")
  @UseGuards(SessionAuthGuard, RolesGuard)
  @Roles("SECRETARIAT", "ADMIN")
  @UseInterceptors(FileInterceptor("file"))
  createPublicDocument(
    @Req() request: AuthenticatedRequest,
    @Body() payload: CreatePublicDocumentDto,
    @UploadedFile() file: UploadedBinaryFile | undefined
  ): Promise<BackofficePublicDocumentRecord> {
    return this.documentsService.createPublicDocument(
      request.authSession!.user.id,
      payload,
      file
    );
  }

  @Patch("backoffice/:documentId")
  @UseGuards(SessionAuthGuard, RolesGuard)
  @Roles("SECRETARIAT", "ADMIN")
  @UseInterceptors(FileInterceptor("file"))
  updatePublicDocument(
    @Req() request: AuthenticatedRequest,
    @Param("documentId") documentId: string,
    @Body() payload: UpdatePublicDocumentDto,
    @UploadedFile() file: UploadedBinaryFile | undefined
  ): Promise<BackofficePublicDocumentRecord> {
    return this.documentsService.updatePublicDocument(
      request.authSession!.user.id,
      documentId,
      payload,
      file
    );
  }

  @Post("backoffice/:documentId/publish")
  @UseGuards(SessionAuthGuard, RolesGuard)
  @Roles("SECRETARIAT", "ADMIN")
  publishPublicDocument(
    @Req() request: AuthenticatedRequest,
    @Param("documentId") documentId: string
  ): Promise<BackofficePublicDocumentRecord> {
    return this.documentsService.publishPublicDocument(
      request.authSession!.user.id,
      documentId
    );
  }

  @Post("backoffice/:documentId/unpublish")
  @UseGuards(SessionAuthGuard, RolesGuard)
  @Roles("SECRETARIAT", "ADMIN")
  unpublishPublicDocument(
    @Req() request: AuthenticatedRequest,
    @Param("documentId") documentId: string
  ): Promise<BackofficePublicDocumentRecord> {
    return this.documentsService.unpublishPublicDocument(
      request.authSession!.user.id,
      documentId
    );
  }

  @Get("backoffice/:documentId/download")
  @UseGuards(SessionAuthGuard, RolesGuard)
  @Roles("SECRETARIAT", "ADMIN")
  async downloadBackofficePublicDocument(
    @Param("documentId") documentId: string,
    @Res({ passthrough: true }) response: SetHeaderResponse
  ): Promise<StreamableFile> {
    const download = await this.documentsService.getBackofficePublicDocumentDownload(
      documentId
    );

    response.setHeader("Content-Type", download.mimeType);
    response.setHeader("Content-Length", String(download.sizeBytes));
    response.setHeader("Content-Disposition", download.contentDisposition);

    return new StreamableFile(createReadStream(download.streamPath));
  }
}
