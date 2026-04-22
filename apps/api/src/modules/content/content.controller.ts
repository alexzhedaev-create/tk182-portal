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
  UseGuards
} from "@nestjs/common";
import type {
  CreatePortalDraftFromInventoryResult,
  CreateLegacyContentInventoryDto,
  LegacyContentInventoryRecord,
  LegacyContentInventoryStatus,
  LegacyContentSection,
  UpdateLegacyContentInventoryDto
} from "@tk182/shared-types";

import type { AuthenticatedRequest } from "../auth/auth.types";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { SessionAuthGuard } from "../auth/session-auth.guard";
import { ContentService } from "./content.service";

@Controller("content")
export class ContentController {
  constructor(@Inject(ContentService) private readonly contentService: ContentService) {}

  @Get("backoffice/inventory")
  @UseGuards(SessionAuthGuard, RolesGuard)
  @Roles("SECRETARIAT", "ADMIN")
  listLegacyContentInventory(
    @Query("migrationStatus") migrationStatus?: string,
    @Query("legacySection") legacySection?: string
  ): Promise<LegacyContentInventoryRecord[]> {
    return this.contentService.listLegacyContentInventory({
      ...(migrationStatus
        ? { migrationStatus: migrationStatus as LegacyContentInventoryStatus }
        : {}),
      ...(legacySection ? { legacySection: legacySection as LegacyContentSection } : {})
    });
  }

  @Post("backoffice/inventory")
  @UseGuards(SessionAuthGuard, RolesGuard)
  @Roles("SECRETARIAT", "ADMIN")
  createLegacyContentInventory(
    @Req() request: AuthenticatedRequest,
    @Body() payload: CreateLegacyContentInventoryDto
  ): Promise<LegacyContentInventoryRecord> {
    return this.contentService.createLegacyContentInventory(
      request.authSession!.user.id,
      payload
    );
  }

  @Patch("backoffice/inventory/:inventoryId")
  @UseGuards(SessionAuthGuard, RolesGuard)
  @Roles("SECRETARIAT", "ADMIN")
  updateLegacyContentInventory(
    @Req() request: AuthenticatedRequest,
    @Param("inventoryId") inventoryId: string,
    @Body() payload: UpdateLegacyContentInventoryDto
  ): Promise<LegacyContentInventoryRecord> {
    return this.contentService.updateLegacyContentInventory(
      request.authSession!.user.id,
      inventoryId,
      payload
    );
  }

  @Post("backoffice/inventory/:inventoryId/create-portal-draft")
  @UseGuards(SessionAuthGuard, RolesGuard)
  @Roles("SECRETARIAT", "ADMIN")
  createPortalDraftFromInventory(
    @Req() request: AuthenticatedRequest,
    @Param("inventoryId") inventoryId: string
  ): Promise<CreatePortalDraftFromInventoryResult> {
    return this.contentService.createPortalDraftFromLegacyInventory(
      request.authSession!.user.id,
      inventoryId
    );
  }
}
