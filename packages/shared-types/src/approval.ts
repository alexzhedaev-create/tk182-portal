import type { AuthRole } from "./auth";

export type ReviewCycleStatus = "draft" | "open" | "closed";

export type ReviewCommentStatus =
  | "RECEIVED"
  | "IN_REVIEW"
  | "ACCEPTED"
  | "PARTIALLY_ACCEPTED"
  | "REJECTED"
  | "NEEDS_CLARIFICATION";

export type ParticipantPositionValue =
  | "AGREED"
  | "AGREED_WITH_COMMENTS"
  | "NOT_AGREED";

export type ReviewFileVisibility =
  | "ASSIGNED_PARTICIPANTS"
  | "SECRETARIAT_ONLY";

export type AuditActionType =
  | "COMMENT_CREATED"
  | "COMMENT_UPDATED"
  | "COMMENT_DELETED"
  | "POSITION_SUBMITTED"
  | "POSITION_UPDATED"
  | "COMMENT_STATUS_CHANGED"
  | "SECRETARIAT_RESPONSE_UPDATED"
  | "FILE_UPLOADED"
  | "FILE_METADATA_CHANGED"
  | "FILE_DELETED";

export type AuditEntityType =
  | "REVIEW_COMMENT"
  | "PARTICIPANT_POSITION"
  | "VERSION_FILE";

export interface DraftStandardSummary {
  id: string;
  code: string;
  title: string;
  summary: string;
  stage: string;
}

export interface DraftStandardVersionSummary {
  id: string;
  versionLabel: string;
  revisionSummary: string;
  fileName: string;
  fileNote: string;
  publishedAt: string;
}

export interface ReviewAttachmentSummary {
  id: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  uploadedAt: string;
  uploadedByDisplayName: string | null;
  versionId: string;
  visibility: ReviewFileVisibility;
  description: string | null;
}

export interface ReviewCycleSummary {
  id: string;
  title: string;
  status: ReviewCycleStatus;
  opensAt: string;
  deadlineAt: string;
  closedAt: string | null;
}

export interface ParticipantAssignedReviewCycle {
  assignmentId: string;
  cycle: ReviewCycleSummary;
  draftStandard: DraftStandardSummary;
  currentVersion: DraftStandardVersionSummary;
}

export interface ParticipantDraftStandardCard {
  cycle: ReviewCycleSummary & {
    description: string;
  };
  draftStandard: DraftStandardSummary;
  currentVersion: DraftStandardVersionSummary;
  attachments: ReviewAttachmentSummary[];
}

export interface ReviewCommentRecord {
  id: string;
  sectionRef: string;
  pointRef: string | null;
  pageRef: string | null;
  remark: string;
  proposedText: string;
  rationale: string;
  reviewStatus: ReviewCommentStatus;
  secretariatResponse: string | null;
  authorDisplayName: string;
  organizationName: string | null;
  createdAt: string;
  updatedAt: string;
  canEdit: boolean;
}

export interface ParticipantPositionRecord {
  id: string;
  position: ParticipantPositionValue;
  note: string | null;
  submittedAt: string;
  submittedByName: string;
}

export interface SecretariatReviewCycleListItem {
  cycle: ReviewCycleSummary;
  draftStandard: DraftStandardSummary;
  currentVersion: DraftStandardVersionSummary;
  totalParticipants: number;
  respondedParticipants: number;
  pendingParticipants: number;
}

export interface SecretariatParticipantResponse {
  assignmentId: string;
  organizationId: string;
  organizationName: string;
  organizationShortName: string;
  participantUserId: string;
  participantDisplayName: string;
  responded: boolean;
  respondedAt: string | null;
  position: ParticipantPositionRecord | null;
}

export interface SecretariatCycleDetail {
  cycle: SecretariatReviewCycleListItem;
  participants: SecretariatParticipantResponse[];
  comments: ReviewCommentRecord[];
  versionFiles: ReviewAttachmentSummary[];
}

export interface ApprovalAuditEvent {
  id: string;
  timestamp: string;
  actorUserId: string;
  actorRole: AuthRole;
  actorDisplayName: string;
  actionType: AuditActionType;
  entityType: AuditEntityType;
  entityId: string;
  relatedCycleId: string | null;
  relatedDraftStandardId: string | null;
  relatedCommentId: string | null;
  relatedFileId: string | null;
  message: string;
  metadata: Record<string, unknown> | null;
}

export interface CreateReviewCommentDto {
  sectionRef: string;
  pointRef?: string | null;
  pageRef?: string | null;
  remark: string;
  proposedText: string;
  rationale: string;
}

export interface UpdateReviewCommentDto {
  sectionRef: string;
  pointRef?: string | null;
  pageRef?: string | null;
  remark: string;
  proposedText: string;
  rationale: string;
}

export interface SubmitParticipantPositionDto {
  position: ParticipantPositionValue;
  note?: string | null;
}

export interface UpdateReviewCommentStatusDto {
  reviewStatus?: ReviewCommentStatus;
  status?: ReviewCommentStatus;
  secretariatResponse?: string | null;
}

export interface CreateVersionFileDto {
  description?: string | null;
  visibility?: ReviewFileVisibility | null;
}

export interface UpdateVersionFileDto {
  description?: string | null;
  visibility?: ReviewFileVisibility | null;
}

export interface MutationResponseDto {
  status: "success";
  message: string;
}

export interface NotificationSummary {
  id: string;
  channel: "email" | "in-app";
  topic: string;
  enabled: boolean;
}

export interface AuditEntrySummary {
  id: string;
  action: AuditActionType;
  actorId: string;
  createdAt: string;
}
