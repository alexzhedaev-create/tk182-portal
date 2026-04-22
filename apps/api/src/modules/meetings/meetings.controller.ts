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
  BackofficeMeetingRecord,
  ContentMigrationStatus,
  CreateMeetingRecordDto,
  LegacyContentSection,
  MeetingRecord,
  MeetingsPageData,
  UpdateMeetingRecordDto
} from "@tk182/shared-types";

import type { AuthenticatedRequest, SetHeaderResponse } from "../auth/auth.types";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { SessionAuthGuard } from "../auth/session-auth.guard";
import type { UploadedBinaryFile } from "../content/content-file-storage.service";
import { MeetingsService } from "./meetings.service";

@Controller("meetings")
export class MeetingsController {
  constructor(private readonly meetingsService: MeetingsService) {}

  @Get()
  getMeetingsPageData(): Promise<MeetingsPageData> {
    return this.meetingsService.getMeetingsPageData();
  }

  @Get("public/:meetingId/download")
  async downloadPublicMeeting(
    @Param("meetingId") meetingId: string,
    @Res({ passthrough: true }) response: SetHeaderResponse
  ): Promise<StreamableFile> {
    const download = await this.meetingsService.getPublicMeetingDownload(meetingId);

    response.setHeader("Content-Type", download.mimeType);
    response.setHeader("Content-Length", String(download.sizeBytes));
    response.setHeader("Content-Disposition", download.contentDisposition);

    return new StreamableFile(createReadStream(download.streamPath));
  }

  @Get("backoffice")
  @UseGuards(SessionAuthGuard, RolesGuard)
  @Roles("SECRETARIAT", "ADMIN")
  listBackofficeMeetingRecords(
    @Query("migrationStatus") migrationStatus?: string,
    @Query("legacySection") legacySection?: string
  ): Promise<BackofficeMeetingRecord[]> {
    return this.meetingsService.listBackofficeMeetingRecords({
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
  createMeetingRecord(
    @Req() request: AuthenticatedRequest,
    @Body() payload: CreateMeetingRecordDto,
    @UploadedFile() file: UploadedBinaryFile | undefined
  ): Promise<BackofficeMeetingRecord> {
    return this.meetingsService.createMeetingRecord(
      request.authSession!.user.id,
      payload,
      file
    );
  }

  @Patch("backoffice/:meetingId")
  @UseGuards(SessionAuthGuard, RolesGuard)
  @Roles("SECRETARIAT", "ADMIN")
  @UseInterceptors(FileInterceptor("file"))
  updateMeetingRecord(
    @Req() request: AuthenticatedRequest,
    @Param("meetingId") meetingId: string,
    @Body() payload: UpdateMeetingRecordDto,
    @UploadedFile() file: UploadedBinaryFile | undefined
  ): Promise<BackofficeMeetingRecord> {
    return this.meetingsService.updateMeetingRecord(
      request.authSession!.user.id,
      meetingId,
      payload,
      file
    );
  }

  @Post("backoffice/:meetingId/publish")
  @UseGuards(SessionAuthGuard, RolesGuard)
  @Roles("SECRETARIAT", "ADMIN")
  publishMeetingRecord(
    @Req() request: AuthenticatedRequest,
    @Param("meetingId") meetingId: string
  ): Promise<BackofficeMeetingRecord> {
    return this.meetingsService.publishMeetingRecord(
      request.authSession!.user.id,
      meetingId
    );
  }

  @Post("backoffice/:meetingId/unpublish")
  @UseGuards(SessionAuthGuard, RolesGuard)
  @Roles("SECRETARIAT", "ADMIN")
  unpublishMeetingRecord(
    @Req() request: AuthenticatedRequest,
    @Param("meetingId") meetingId: string
  ): Promise<BackofficeMeetingRecord> {
    return this.meetingsService.unpublishMeetingRecord(
      request.authSession!.user.id,
      meetingId
    );
  }

  @Get("backoffice/:meetingId/download")
  @UseGuards(SessionAuthGuard, RolesGuard)
  @Roles("SECRETARIAT", "ADMIN")
  async downloadBackofficeMeeting(
    @Param("meetingId") meetingId: string,
    @Res({ passthrough: true }) response: SetHeaderResponse
  ): Promise<StreamableFile> {
    const download = await this.meetingsService.getBackofficeMeetingDownload(meetingId);

    response.setHeader("Content-Type", download.mimeType);
    response.setHeader("Content-Length", String(download.sizeBytes));
    response.setHeader("Content-Disposition", download.contentDisposition);

    return new StreamableFile(createReadStream(download.streamPath));
  }
}
