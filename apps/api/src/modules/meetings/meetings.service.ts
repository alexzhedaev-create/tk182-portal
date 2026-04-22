import { Injectable } from "@nestjs/common";
import type {
  BackofficeContentListFilters,
  BackofficeMeetingRecord,
  CreateMeetingRecordDto,
  MeetingRecord,
  MeetingsPageData,
  UpdateMeetingRecordDto
} from "@tk182/shared-types";

import { ContentService } from "../content/content.service";
import type { UploadedBinaryFile } from "../content/content-file-storage.service";

@Injectable()
export class MeetingsService {
  constructor(private readonly contentService: ContentService) {}

  getMeetingsPageData(): Promise<MeetingsPageData> {
    return this.contentService.getMeetingsPageData();
  }

  listBackofficeMeetingRecords(
    filters: BackofficeContentListFilters = {}
  ): Promise<BackofficeMeetingRecord[]> {
    return this.contentService.listBackofficeMeetingRecords(filters);
  }

  createMeetingRecord(
    userId: string,
    payload: CreateMeetingRecordDto,
    file?: UploadedBinaryFile
  ): Promise<BackofficeMeetingRecord> {
    return this.contentService.createMeetingRecord(userId, payload, file);
  }

  updateMeetingRecord(
    userId: string,
    meetingId: string,
    payload: UpdateMeetingRecordDto,
    file?: UploadedBinaryFile
  ): Promise<BackofficeMeetingRecord> {
    return this.contentService.updateMeetingRecord(userId, meetingId, payload, file);
  }

  publishMeetingRecord(
    userId: string,
    meetingId: string
  ): Promise<BackofficeMeetingRecord> {
    return this.contentService.publishMeetingRecord(userId, meetingId);
  }

  unpublishMeetingRecord(
    userId: string,
    meetingId: string
  ): Promise<BackofficeMeetingRecord> {
    return this.contentService.unpublishMeetingRecord(userId, meetingId);
  }

  getPublicMeetingDownload(meetingId: string) {
    return this.contentService.getPublicMeetingDownload(meetingId);
  }

  getBackofficeMeetingDownload(meetingId: string) {
    return this.contentService.getBackofficeMeetingDownload(meetingId);
  }
}
