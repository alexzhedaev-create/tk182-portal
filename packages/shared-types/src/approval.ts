import type { AuthRole } from "./auth";
import type { SubcommitteeSummary } from "./committee";

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

export type NotificationType =
  | "ASSIGNED_TO_ACTIVE_CYCLE"
  | "COMMENT_STATUS_CHANGED"
  | "SECRETARIAT_RESPONSE_UPDATED"
  | "FINAL_POSITION_SUBMITTED"
  | "FINAL_POSITION_UPDATED"
  | "VERSION_FILE_UPLOADED";

export type AuditActionType =
  | "DRAFT_STANDARD_CREATED"
  | "DRAFT_STANDARD_UPDATED"
  | "COMMITTEE_ORGANIZATION_CREATED"
  | "COMMITTEE_ORGANIZATION_UPDATED"
  | "COMMITTEE_PERSON_CREATED"
  | "COMMITTEE_PERSON_UPDATED"
  | "COMMITTEE_ROLE_ASSIGNMENT_CREATED"
  | "COMMITTEE_ROLE_ASSIGNMENT_UPDATED"
  | "SUBCOMMITTEE_CREATED"
  | "SUBCOMMITTEE_UPDATED"
  | "VERSION_CREATED"
  | "REVIEW_CYCLE_CREATED"
  | "REVIEW_CYCLE_UPDATED"
  | "REVIEW_CYCLE_ACTIVATED"
  | "REVIEW_CYCLE_CLOSED"
  | "REVIEW_ASSIGNMENT_CREATED"
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
  | "DRAFT_STANDARD"
  | "DRAFT_STANDARD_VERSION"
  | "COMMITTEE_ORGANIZATION"
  | "COMMITTEE_PERSON"
  | "COMMITTEE_ROLE_ASSIGNMENT"
  | "SUBCOMMITTEE"
  | "REVIEW_CYCLE"
  | "REVIEW_ASSIGNMENT"
  | "REVIEW_COMMENT"
  | "PARTICIPANT_POSITION"
  | "VERSION_FILE";

export interface DraftStandardSummary {
  id: string;
  code: string;
  title: string;
  summary: string;
  stage: string;
  responsibleSubcommittee: SubcommitteeSummary | null;
}

export interface DraftStandardVersionSummary {
  id: string;
  versionLabel: string;
  revisionSummary: string;
  fileName: string;
  fileNote: string;
  publishedAt: string;
}

export interface SecretariatDraftStandardRecord extends DraftStandardSummary {
  createdAt: string;
  updatedAt: string;
}

export interface SecretariatDraftStandardListItem {
  draftStandard: SecretariatDraftStandardRecord;
  versionsCount: number;
  cyclesCount: number;
  activeCyclesCount: number;
  latestVersionLabel: string | null;
}

export interface SecretariatDraftStandardVersionRecord
  extends DraftStandardVersionSummary {
  draftStandardId: string;
  attachmentsCount: number;
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
  description: string;
  participants: SecretariatParticipantResponse[];
  comments: ReviewCommentRecord[];
  versionFiles: ReviewAttachmentSummary[];
}

export interface SecretariatReviewAssignmentRecord {
  id: string;
  organizationId: string;
  organizationName: string;
  organizationShortName: string;
  userId: string;
  userDisplayName: string;
  userEmail: string;
  assignedAt: string;
  respondedAt: string | null;
}

export interface SecretariatDraftStandardDetail {
  draftStandard: SecretariatDraftStandardRecord;
  versions: SecretariatDraftStandardVersionRecord[];
  cycles: SecretariatReviewCycleListItem[];
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

export interface CreateDraftStandardDto {
  code: string;
  title: string;
  summary: string;
  stage: string;
  responsibleSubcommitteeId: string;
}

export interface UpdateDraftStandardDto {
  code: string;
  title: string;
  summary: string;
  stage: string;
  responsibleSubcommitteeId: string;
}

export interface CreateDraftStandardVersionDto {
  versionLabel: string;
  revisionSummary: string;
  fileName: string;
  fileNote: string;
  publishedAt: string;
}

export interface CreateReviewCycleDto {
  draftStandardVersionId: string;
  title: string;
  description: string;
  opensAt: string;
  deadlineAt: string;
}

export interface UpdateReviewCycleDto {
  draftStandardVersionId?: string | null;
  title: string;
  description: string;
  opensAt: string;
  deadlineAt: string;
}

export interface AssignReviewParticipantDto {
  userId: string;
  organizationId: string;
}

export interface MutationResponseDto {
  status: "success";
  message: string;
}

export interface NotificationRecord {
  id: string;
  recipientUserId: string;
  createdAt: string;
  readAt: string | null;
  type: NotificationType;
  title: string;
  message: string;
  relatedCycleId: string | null;
  relatedDraftStandardId: string | null;
  relatedCommentId: string | null;
  relatedFileId: string | null;
  targetRoute: string | null;
}

export interface NotificationUnreadCountDto {
  unreadCount: number;
}

export interface MarkAllNotificationsReadResponse extends MutationResponseDto {
  updatedCount: number;
}

export interface AuditEntrySummary {
  id: string;
  action: AuditActionType;
  actorId: string;
  createdAt: string;
}
