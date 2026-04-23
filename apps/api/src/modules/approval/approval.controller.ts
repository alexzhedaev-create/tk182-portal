import { createReadStream } from "node:fs";

import {
  Body,
  Controller,
  Delete,
  Inject,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Req,
  Res,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import type {
  AssignReviewParticipantDto,
  CreateDraftStandardDto,
  CreateDraftStandardVersionDto,
  CreateReviewCycleDto,
  CreateVersionFileDto,
  CreateReviewCommentDto,
  MutationResponseDto,
  ParticipantAssignedReviewCycle,
  ParticipantDraftStandardCard,
  ParticipantPositionRecord,
  ReviewAttachmentSummary,
  ReviewCommentRecord,
  SecretariatDraftStandardDetail,
  SecretariatDraftStandardListItem,
  SecretariatDraftStandardVersionRecord,
  SecretariatReviewAssignmentRecord,
  SecretariatCycleDetail,
  SecretariatReviewCycleListItem,
  SubmitParticipantPositionDto,
  UpdateDraftStandardDto,
  UpdateReviewCycleDto,
  UpdateVersionFileDto,
  UpdateReviewCommentDto,
  UpdateReviewCommentStatusDto
} from "@tk182/shared-types";

import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { SessionAuthGuard } from "../auth/session-auth.guard";
import type { AuthenticatedRequest, SetHeaderResponse } from "../auth/auth.types";
import { ApprovalService } from "./approval.service";
import type { UploadedBinaryFile } from "./approval-file-storage.service";

@Controller("approval")
export class ApprovalController {
  constructor(
    @Inject(ApprovalService)
    private readonly approvalService: ApprovalService
  ) {}

  @Get()
  getSummary() {
    return this.approvalService.getSummary();
  }

  @Get("secretariat/draft-standards")
  @UseGuards(SessionAuthGuard, RolesGuard)
  @Roles("SECRETARIAT", "ADMIN")
  listSecretariatDraftStandards(): Promise<SecretariatDraftStandardListItem[]> {
    return this.approvalService.listSecretariatDraftStandards();
  }

  @Post("secretariat/draft-standards")
  @UseGuards(SessionAuthGuard, RolesGuard)
  @Roles("SECRETARIAT", "ADMIN")
  createSecretariatDraftStandard(
    @Req() request: AuthenticatedRequest,
    @Body() payload: CreateDraftStandardDto
  ): Promise<SecretariatDraftStandardDetail> {
    return this.approvalService.createSecretariatDraftStandard(
      request.authSession!.user.id,
      payload
    );
  }

  @Get("secretariat/draft-standards/:draftStandardId")
  @UseGuards(SessionAuthGuard, RolesGuard)
  @Roles("SECRETARIAT", "ADMIN")
  getSecretariatDraftStandardDetail(
    @Param("draftStandardId") draftStandardId: string
  ): Promise<SecretariatDraftStandardDetail> {
    return this.approvalService.getSecretariatDraftStandardDetail(draftStandardId);
  }

  @Patch("secretariat/draft-standards/:draftStandardId")
  @UseGuards(SessionAuthGuard, RolesGuard)
  @Roles("SECRETARIAT", "ADMIN")
  updateSecretariatDraftStandard(
    @Req() request: AuthenticatedRequest,
    @Param("draftStandardId") draftStandardId: string,
    @Body() payload: UpdateDraftStandardDto
  ): Promise<SecretariatDraftStandardDetail> {
    return this.approvalService.updateSecretariatDraftStandard(
      request.authSession!.user.id,
      draftStandardId,
      payload
    );
  }

  @Get("secretariat/draft-standards/:draftStandardId/versions")
  @UseGuards(SessionAuthGuard, RolesGuard)
  @Roles("SECRETARIAT", "ADMIN")
  listSecretariatDraftStandardVersions(
    @Param("draftStandardId") draftStandardId: string
  ): Promise<SecretariatDraftStandardVersionRecord[]> {
    return this.approvalService.listSecretariatDraftStandardVersions(draftStandardId);
  }

  @Post("secretariat/draft-standards/:draftStandardId/versions")
  @UseGuards(SessionAuthGuard, RolesGuard)
  @Roles("SECRETARIAT", "ADMIN")
  createSecretariatDraftStandardVersion(
    @Req() request: AuthenticatedRequest,
    @Param("draftStandardId") draftStandardId: string,
    @Body() payload: CreateDraftStandardVersionDto
  ): Promise<SecretariatDraftStandardVersionRecord> {
    return this.approvalService.createSecretariatDraftStandardVersion(
      request.authSession!.user.id,
      draftStandardId,
      payload
    );
  }

  @Post("secretariat/draft-standards/:draftStandardId/cycles")
  @UseGuards(SessionAuthGuard, RolesGuard)
  @Roles("SECRETARIAT", "ADMIN")
  createSecretariatReviewCycle(
    @Req() request: AuthenticatedRequest,
    @Param("draftStandardId") draftStandardId: string,
    @Body() payload: CreateReviewCycleDto
  ): Promise<SecretariatCycleDetail> {
    return this.approvalService.createSecretariatReviewCycle(
      request.authSession!.user.id,
      draftStandardId,
      payload
    );
  }

  @Get("participant/cycles")
  @UseGuards(SessionAuthGuard, RolesGuard)
  @Roles("PARTICIPANT")
  listParticipantCycles(
    @Req() request: AuthenticatedRequest
  ): Promise<ParticipantAssignedReviewCycle[]> {
    return this.approvalService.listAssignedActiveReviewCycles(
      request.authSession!.user.id
    );
  }

  @Get("participant/cycles/:cycleId/drafts/:draftStandardId")
  @UseGuards(SessionAuthGuard, RolesGuard)
  @Roles("PARTICIPANT")
  getParticipantDraftCard(
    @Req() request: AuthenticatedRequest,
    @Param("cycleId") cycleId: string,
    @Param("draftStandardId") draftStandardId: string
  ): Promise<ParticipantDraftStandardCard> {
    return this.approvalService.getParticipantDraftStandardCard(
      request.authSession!.user.id,
      cycleId,
      draftStandardId
    );
  }

  @Get("participant/cycles/:cycleId/drafts/:draftStandardId/files")
  @UseGuards(SessionAuthGuard, RolesGuard)
  @Roles("PARTICIPANT")
  listParticipantVersionFiles(
    @Req() request: AuthenticatedRequest,
    @Param("cycleId") cycleId: string,
    @Param("draftStandardId") draftStandardId: string
  ): Promise<ReviewAttachmentSummary[]> {
    return this.approvalService.listParticipantVersionFiles(
      request.authSession!.user.id,
      cycleId,
      draftStandardId
    );
  }

  @Get("participant/cycles/:cycleId/drafts/:draftStandardId/files/:fileId/download")
  @UseGuards(SessionAuthGuard, RolesGuard)
  @Roles("PARTICIPANT")
  async downloadParticipantVersionFile(
    @Req() request: AuthenticatedRequest,
    @Param("cycleId") cycleId: string,
    @Param("draftStandardId") draftStandardId: string,
    @Param("fileId") fileId: string,
    @Res({ passthrough: true }) response: SetHeaderResponse
  ): Promise<StreamableFile> {
    const download = await this.approvalService.getParticipantVersionFileDownload(
      request.authSession!.user.id,
      cycleId,
      draftStandardId,
      fileId
    );

    response.setHeader("Content-Type", download.mimeType);
    response.setHeader("Content-Length", String(download.sizeBytes));
    response.setHeader("Content-Disposition", download.contentDisposition);
    response.setHeader("Cache-Control", "private, max-age=0, must-revalidate");

    return new StreamableFile(createReadStream(download.streamPath));
  }

  @Get("participant/cycles/:cycleId/drafts/:draftStandardId/comments")
  @UseGuards(SessionAuthGuard, RolesGuard)
  @Roles("PARTICIPANT")
  listParticipantComments(
    @Req() request: AuthenticatedRequest,
    @Param("cycleId") cycleId: string,
    @Param("draftStandardId") draftStandardId: string
  ): Promise<ReviewCommentRecord[]> {
    return this.approvalService.listParticipantComments(
      request.authSession!.user.id,
      cycleId,
      draftStandardId
    );
  }

  @Post("participant/cycles/:cycleId/drafts/:draftStandardId/comments")
  @UseGuards(SessionAuthGuard, RolesGuard)
  @Roles("PARTICIPANT")
  createParticipantComment(
    @Req() request: AuthenticatedRequest,
    @Param("cycleId") cycleId: string,
    @Param("draftStandardId") draftStandardId: string,
    @Body() payload: CreateReviewCommentDto
  ): Promise<ReviewCommentRecord> {
    return this.approvalService.createParticipantComment(
      request.authSession!.user.id,
      cycleId,
      draftStandardId,
      payload
    );
  }

  @Patch("participant/comments/:commentId")
  @UseGuards(SessionAuthGuard, RolesGuard)
  @Roles("PARTICIPANT")
  updateParticipantComment(
    @Req() request: AuthenticatedRequest,
    @Param("commentId") commentId: string,
    @Body() payload: UpdateReviewCommentDto
  ): Promise<ReviewCommentRecord> {
    return this.approvalService.updateParticipantComment(
      request.authSession!.user.id,
      commentId,
      payload
    );
  }

  @Delete("participant/comments/:commentId")
  @UseGuards(SessionAuthGuard, RolesGuard)
  @Roles("PARTICIPANT")
  deleteParticipantComment(
    @Req() request: AuthenticatedRequest,
    @Param("commentId") commentId: string
  ): Promise<MutationResponseDto> {
    return this.approvalService.deleteParticipantComment(
      request.authSession!.user.id,
      commentId
    );
  }

  @Get("participant/cycles/:cycleId/position")
  @UseGuards(SessionAuthGuard, RolesGuard)
  @Roles("PARTICIPANT")
  getParticipantPosition(
    @Req() request: AuthenticatedRequest,
    @Param("cycleId") cycleId: string
  ): Promise<ParticipantPositionRecord | null> {
    return this.approvalService.getParticipantPosition(
      request.authSession!.user.id,
      cycleId
    );
  }

  @Put("participant/cycles/:cycleId/position")
  @UseGuards(SessionAuthGuard, RolesGuard)
  @Roles("PARTICIPANT")
  submitParticipantPosition(
    @Req() request: AuthenticatedRequest,
    @Param("cycleId") cycleId: string,
    @Body() payload: SubmitParticipantPositionDto
  ): Promise<ParticipantPositionRecord> {
    return this.approvalService.submitParticipantPosition(
      request.authSession!.user.id,
      cycleId,
      payload
    );
  }

  @Get("secretariat/cycles")
  @UseGuards(SessionAuthGuard, RolesGuard)
  @Roles("SECRETARIAT", "ADMIN")
  listSecretariatCycles(): Promise<SecretariatReviewCycleListItem[]> {
    return this.approvalService.listSecretariatReviewCycles();
  }

  @Get("secretariat/cycles/:cycleId")
  @UseGuards(SessionAuthGuard, RolesGuard)
  @Roles("SECRETARIAT", "ADMIN")
  getSecretariatCycle(
    @Param("cycleId") cycleId: string
  ): Promise<SecretariatCycleDetail> {
    return this.approvalService.getSecretariatCycleDetail(cycleId);
  }

  @Patch("secretariat/cycles/:cycleId")
  @UseGuards(SessionAuthGuard, RolesGuard)
  @Roles("SECRETARIAT", "ADMIN")
  updateSecretariatCycle(
    @Req() request: AuthenticatedRequest,
    @Param("cycleId") cycleId: string,
    @Body() payload: UpdateReviewCycleDto
  ): Promise<SecretariatCycleDetail> {
    return this.approvalService.updateSecretariatReviewCycle(
      request.authSession!.user.id,
      cycleId,
      payload
    );
  }

  @Get("secretariat/cycles/:cycleId/assignments")
  @UseGuards(SessionAuthGuard, RolesGuard)
  @Roles("SECRETARIAT", "ADMIN")
  listSecretariatCycleAssignments(
    @Param("cycleId") cycleId: string
  ): Promise<SecretariatReviewAssignmentRecord[]> {
    return this.approvalService.listSecretariatCycleAssignments(cycleId);
  }

  @Post("secretariat/cycles/:cycleId/assignments")
  @UseGuards(SessionAuthGuard, RolesGuard)
  @Roles("SECRETARIAT", "ADMIN")
  createSecretariatCycleAssignment(
    @Req() request: AuthenticatedRequest,
    @Param("cycleId") cycleId: string,
    @Body() payload: AssignReviewParticipantDto
  ): Promise<SecretariatReviewAssignmentRecord> {
    return this.approvalService.assignParticipantToCycle(
      request.authSession!.user.id,
      cycleId,
      payload
    );
  }

  @Post("secretariat/cycles/:cycleId/activate")
  @UseGuards(SessionAuthGuard, RolesGuard)
  @Roles("SECRETARIAT", "ADMIN")
  activateSecretariatCycle(
    @Req() request: AuthenticatedRequest,
    @Param("cycleId") cycleId: string
  ): Promise<SecretariatCycleDetail> {
    return this.approvalService.activateSecretariatReviewCycle(
      request.authSession!.user.id,
      cycleId
    );
  }

  @Post("secretariat/cycles/:cycleId/close")
  @UseGuards(SessionAuthGuard, RolesGuard)
  @Roles("SECRETARIAT", "ADMIN")
  closeSecretariatCycle(
    @Req() request: AuthenticatedRequest,
    @Param("cycleId") cycleId: string
  ): Promise<SecretariatCycleDetail> {
    return this.approvalService.closeSecretariatReviewCycle(
      request.authSession!.user.id,
      cycleId
    );
  }

  @Get("secretariat/versions/:versionId/files")
  @UseGuards(SessionAuthGuard, RolesGuard)
  @Roles("SECRETARIAT", "ADMIN")
  listSecretariatVersionFiles(
    @Param("versionId") versionId: string
  ): Promise<ReviewAttachmentSummary[]> {
    return this.approvalService.listSecretariatVersionFiles(versionId);
  }

  @Post("secretariat/versions/:versionId/files")
  @UseGuards(SessionAuthGuard, RolesGuard)
  @Roles("SECRETARIAT", "ADMIN")
  @UseInterceptors(FileInterceptor("file"))
  uploadSecretariatVersionFile(
    @Req() request: AuthenticatedRequest,
    @Param("versionId") versionId: string,
    @UploadedFile() file: UploadedBinaryFile | undefined,
    @Body() payload: CreateVersionFileDto
  ): Promise<ReviewAttachmentSummary> {
    return this.approvalService.uploadSecretariatVersionFile(
      request.authSession!.user.id,
      versionId,
      file,
      payload
    );
  }

  @Patch("secretariat/files/:fileId")
  @UseGuards(SessionAuthGuard, RolesGuard)
  @Roles("SECRETARIAT", "ADMIN")
  updateSecretariatVersionFile(
    @Req() request: AuthenticatedRequest,
    @Param("fileId") fileId: string,
    @Body() payload: UpdateVersionFileDto
  ): Promise<ReviewAttachmentSummary> {
    return this.approvalService.updateSecretariatVersionFile(
      request.authSession!.user.id,
      fileId,
      payload
    );
  }

  @Delete("secretariat/files/:fileId")
  @UseGuards(SessionAuthGuard, RolesGuard)
  @Roles("SECRETARIAT", "ADMIN")
  deleteSecretariatVersionFile(
    @Req() request: AuthenticatedRequest,
    @Param("fileId") fileId: string
  ): Promise<MutationResponseDto> {
    return this.approvalService.deleteSecretariatVersionFile(
      request.authSession!.user.id,
      fileId
    );
  }

  @Get("secretariat/files/:fileId/download")
  @UseGuards(SessionAuthGuard, RolesGuard)
  @Roles("SECRETARIAT", "ADMIN")
  async downloadSecretariatVersionFile(
    @Param("fileId") fileId: string,
    @Res({ passthrough: true }) response: SetHeaderResponse
  ): Promise<StreamableFile> {
    const download = await this.approvalService.getSecretariatVersionFileDownload(
      fileId
    );

    response.setHeader("Content-Type", download.mimeType);
    response.setHeader("Content-Length", String(download.sizeBytes));
    response.setHeader("Content-Disposition", download.contentDisposition);
    response.setHeader("Cache-Control", "private, max-age=0, must-revalidate");

    return new StreamableFile(createReadStream(download.streamPath));
  }

  @Patch("secretariat/comments/:commentId/status")
  @UseGuards(SessionAuthGuard, RolesGuard)
  @Roles("SECRETARIAT", "ADMIN")
  updateSecretariatCommentStatus(
    @Req() request: AuthenticatedRequest,
    @Param("commentId") commentId: string,
    @Body() payload: UpdateReviewCommentStatusDto
  ): Promise<ReviewCommentRecord> {
    return this.approvalService.updateSecretariatCommentStatus(
      request.authSession!.user.id,
      commentId,
      payload
    );
  }
}
