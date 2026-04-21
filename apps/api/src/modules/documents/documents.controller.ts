import { Controller, Get, UseGuards } from "@nestjs/common";
import type { DocumentSummary, PaginatedResult } from "@tk182/shared-types";

import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { SessionAuthGuard } from "../auth/session-auth.guard";
import { DocumentsService } from "./documents.service";

@Controller("documents")
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get()
  getPublicDocuments(): Promise<PaginatedResult<DocumentSummary>> {
    return this.documentsService.listPublicDocuments();
  }

  @Get("participant")
  @UseGuards(SessionAuthGuard, RolesGuard)
  @Roles("PARTICIPANT", "ADMIN")
  getParticipantDocuments(): Promise<PaginatedResult<DocumentSummary>> {
    return this.documentsService.listParticipantDocuments();
  }

  @Get("secretariat")
  @UseGuards(SessionAuthGuard, RolesGuard)
  @Roles("SECRETARIAT", "ADMIN")
  getSecretariatDocuments(): Promise<PaginatedResult<DocumentSummary>> {
    return this.documentsService.listSecretariatDocuments();
  }
}
