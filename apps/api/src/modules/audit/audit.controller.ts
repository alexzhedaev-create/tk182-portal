import { Controller, Get, Inject, Param, Query, UseGuards } from "@nestjs/common";

import type { ApprovalAuditEvent } from "@tk182/shared-types";

import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { SessionAuthGuard } from "../auth/session-auth.guard";
import { AuditService } from "./audit.service";

@Controller("audit")
export class AuditController {
  constructor(@Inject(AuditService) private readonly auditService: AuditService) {}

  @Get()
  getSummary() {
    return this.auditService.getSummary();
  }

  @Get("review-cycles/:cycleId/events")
  @UseGuards(SessionAuthGuard, RolesGuard)
  @Roles("SECRETARIAT", "ADMIN")
  listReviewCycleEvents(
    @Param("cycleId") cycleId: string,
    @Query("actionType") actionType?: string,
    @Query("entityType") entityType?: string,
    @Query("actorUserId") actorUserId?: string
  ): Promise<ApprovalAuditEvent[]> {
    return this.auditService.listReviewCycleEvents(cycleId, {
      actionType,
      entityType,
      actorUserId
    });
  }

  @Get("draft-standards/:draftStandardId/events")
  @UseGuards(SessionAuthGuard, RolesGuard)
  @Roles("SECRETARIAT", "ADMIN")
  listDraftStandardEvents(
    @Param("draftStandardId") draftStandardId: string,
    @Query("actionType") actionType?: string,
    @Query("entityType") entityType?: string,
    @Query("actorUserId") actorUserId?: string
  ): Promise<ApprovalAuditEvent[]> {
    return this.auditService.listDraftStandardEvents(draftStandardId, {
      actionType,
      entityType,
      actorUserId
    });
  }

  @Get("committee/events")
  @UseGuards(SessionAuthGuard, RolesGuard)
  @Roles("SECRETARIAT", "ADMIN")
  listCommitteeEvents(
    @Query("actionType") actionType?: string,
    @Query("entityType") entityType?: string,
    @Query("actorUserId") actorUserId?: string
  ): Promise<ApprovalAuditEvent[]> {
    return this.auditService.listCommitteeEvents({
      actionType,
      entityType,
      actorUserId
    });
  }

  @Get("content/events")
  @UseGuards(SessionAuthGuard, RolesGuard)
  @Roles("SECRETARIAT", "ADMIN")
  listContentEvents(
    @Query("actionType") actionType?: string,
    @Query("entityType") entityType?: string,
    @Query("actorUserId") actorUserId?: string
  ): Promise<ApprovalAuditEvent[]> {
    return this.auditService.listContentEvents({
      actionType,
      entityType,
      actorUserId
    });
  }
}
