import "server-only";

import type {
  ApprovalAuditEvent,
  BackofficeApprovedStandardRecord,
  BackofficeContentListFilters,
  BackofficeMeetingRecord,
  BackofficeNewsItemRecord,
  BackofficePublicDocumentRecord,
  ApprovedStandardRecord,
  AuthenticatedUser,
  CommitteeBackofficeData,
  CommitteeStructureResponse,
  LegacyContentInventoryFilters,
  LegacyContentInventoryRecord,
  MeetingRecord,
  MeetingsPageData,
  NewsItemRecord,
  DocumentSummary,
  NotificationRecord,
  NotificationUnreadCountDto,
  OrganizationSummary,
  PaginatedResult,
  ParticipantAssignedReviewCycle,
  ParticipantDraftStandardCard,
  ParticipantPositionRecord,
  ReviewCommentRecord,
  PublicDocumentRecord,
  PublicDocumentsPageData,
  StandardSummary,
  StandardsPageData,
  SubcommitteeSummary,
  SecretariatCycleDetail,
  SecretariatDraftStandardDetail,
  SecretariatDraftStandardListItem,
  SecretariatReviewAssignmentRecord,
  SecretariatReviewCycleListItem,
  SessionResponseDto
} from "@tk182/shared-types";
import { cookies } from "next/headers";

import type { WorkspaceArea } from "./auth";

const defaultApiUrl = "http://127.0.0.1:3001";

function getInternalApiUrl(): string {
  return process.env.API_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_URL ?? defaultApiUrl;
}

export function getPublicApiUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL ?? defaultApiUrl;
}

function buildCookieHeader(): string | null {
  const cookieStore = cookies();
  const cookieEntries = cookieStore
    .getAll()
    .map(({ name, value }) => `${name}=${encodeURIComponent(value)}`);

  return cookieEntries.length > 0 ? cookieEntries.join("; ") : null;
}

async function fetchFromApi<T>(path: string): Promise<T> {
  const headers = new Headers();
  const cookieHeader = buildCookieHeader();

  if (cookieHeader) {
    headers.set("cookie", cookieHeader);
  }

  const response = await fetch(`${getInternalApiUrl()}${path}`, {
    headers,
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`API request to ${path} failed with status ${response.status}.`);
  }

  const responseText = await response.text();

  if (!responseText.trim()) {
    return null as T;
  }

  return JSON.parse(responseText) as T;
}

export function getServerSession(): Promise<SessionResponseDto> {
  return fetchFromApi<SessionResponseDto>("/auth/session");
}

export function getWorkspaceDocuments(
  area: WorkspaceArea
): Promise<PaginatedResult<DocumentSummary>> {
  return fetchFromApi<PaginatedResult<DocumentSummary>>(`/documents/${area}`);
}

export function getCommitteeStructure(): Promise<CommitteeStructureResponse> {
  return fetchFromApi<CommitteeStructureResponse>("/committee");
}

export function getCommitteeSubcommittees(): Promise<SubcommitteeSummary[]> {
  return fetchFromApi<SubcommitteeSummary[]>("/committee/subcommittees");
}

export function getCommitteeBackofficeData(): Promise<CommitteeBackofficeData> {
  return fetchFromApi<CommitteeBackofficeData>("/committee/backoffice");
}

export function getPublicStandards(): Promise<StandardSummary[]> {
  return fetchFromApi<StandardSummary[]>("/standards");
}

export function getPublicStandardsPageData(): Promise<StandardsPageData> {
  return fetchFromApi<StandardsPageData>("/standards/public-content");
}

export function getPublicNewsItems(): Promise<NewsItemRecord[]> {
  return fetchFromApi<NewsItemRecord[]>("/news");
}

export function getPublicNewsItem(newsId: string): Promise<NewsItemRecord> {
  return fetchFromApi<NewsItemRecord>(`/news/${encodeURIComponent(newsId)}`);
}

export function getPublicDocumentsPageData(): Promise<PublicDocumentsPageData> {
  return fetchFromApi<PublicDocumentsPageData>("/documents");
}

export function getPublicDocument(documentId: string): Promise<PublicDocumentRecord> {
  return fetchFromApi<PublicDocumentRecord>(
    `/documents/public/${encodeURIComponent(documentId)}`
  );
}

export function getPublicMeetingsPageData(): Promise<MeetingsPageData> {
  return fetchFromApi<MeetingsPageData>("/meetings");
}

export function getPublicMeeting(meetingId: string): Promise<MeetingRecord> {
  return fetchFromApi<MeetingRecord>(`/meetings/public/${encodeURIComponent(meetingId)}`);
}

export function getPublicApprovedStandard(
  standardId: string
): Promise<ApprovedStandardRecord> {
  return fetchFromApi<ApprovedStandardRecord>(
    `/standards/approved/${encodeURIComponent(standardId)}`
  );
}

export function getParticipantAssignedCycles(): Promise<ParticipantAssignedReviewCycle[]> {
  return fetchFromApi<ParticipantAssignedReviewCycle[]>("/approval/participant/cycles");
}

export function getParticipantDraftCard(
  cycleId: string,
  draftStandardId: string
): Promise<ParticipantDraftStandardCard> {
  return fetchFromApi<ParticipantDraftStandardCard>(
    `/approval/participant/cycles/${encodeURIComponent(cycleId)}/drafts/${encodeURIComponent(
      draftStandardId
    )}`
  );
}

export function getParticipantComments(
  cycleId: string,
  draftStandardId: string
): Promise<ReviewCommentRecord[]> {
  return fetchFromApi<ReviewCommentRecord[]>(
    `/approval/participant/cycles/${encodeURIComponent(
      cycleId
    )}/drafts/${encodeURIComponent(draftStandardId)}/comments`
  );
}

export function getParticipantPosition(
  cycleId: string
): Promise<ParticipantPositionRecord | null> {
  return fetchFromApi<ParticipantPositionRecord | null>(
    `/approval/participant/cycles/${encodeURIComponent(cycleId)}/position`
  );
}

export function getSecretariatCycles(): Promise<SecretariatReviewCycleListItem[]> {
  return fetchFromApi<SecretariatReviewCycleListItem[]>("/approval/secretariat/cycles");
}

export function getSecretariatDraftStandards(): Promise<SecretariatDraftStandardListItem[]> {
  return fetchFromApi<SecretariatDraftStandardListItem[]>(
    "/approval/secretariat/draft-standards"
  );
}

export function getSecretariatDraftStandardDetail(
  draftStandardId: string
): Promise<SecretariatDraftStandardDetail> {
  return fetchFromApi<SecretariatDraftStandardDetail>(
    `/approval/secretariat/draft-standards/${encodeURIComponent(draftStandardId)}`
  );
}

export function getSecretariatCycleDetail(
  cycleId: string
): Promise<SecretariatCycleDetail> {
  return fetchFromApi<SecretariatCycleDetail>(
    `/approval/secretariat/cycles/${encodeURIComponent(cycleId)}`
  );
}

export function getSecretariatCycleAssignments(
  cycleId: string
): Promise<SecretariatReviewAssignmentRecord[]> {
  return fetchFromApi<SecretariatReviewAssignmentRecord[]>(
    `/approval/secretariat/cycles/${encodeURIComponent(cycleId)}/assignments`
  );
}

export function getReviewCycleAuditEvents(
  cycleId: string
): Promise<ApprovalAuditEvent[]> {
  return fetchFromApi<ApprovalAuditEvent[]>(
    `/audit/review-cycles/${encodeURIComponent(cycleId)}/events`
  );
}

export function getCommitteeAuditEvents(): Promise<ApprovalAuditEvent[]> {
  return fetchFromApi<ApprovalAuditEvent[]>("/audit/committee/events");
}

export function getContentAuditEvents(): Promise<ApprovalAuditEvent[]> {
  return fetchFromApi<ApprovalAuditEvent[]>("/audit/content/events");
}

function buildLegacyInventoryFilterQuery(
  filters: LegacyContentInventoryFilters = {}
): string {
  const searchParams = new URLSearchParams();

  if (filters.migrationStatus) {
    searchParams.set("migrationStatus", filters.migrationStatus);
  }

  if (filters.legacySection) {
    searchParams.set("legacySection", filters.legacySection);
  }

  const query = searchParams.toString();
  return query ? `?${query}` : "";
}

function buildContentFilterQuery(filters: BackofficeContentListFilters = {}): string {
  const searchParams = new URLSearchParams();

  if (filters.migrationStatus) {
    searchParams.set("migrationStatus", filters.migrationStatus);
  }

  if (filters.legacySection) {
    searchParams.set("legacySection", filters.legacySection);
  }

  const query = searchParams.toString();
  return query ? `?${query}` : "";
}

export function getBackofficeNewsItems(
  filters: BackofficeContentListFilters = {}
): Promise<BackofficeNewsItemRecord[]> {
  return fetchFromApi<BackofficeNewsItemRecord[]>(
    `/news/backoffice${buildContentFilterQuery(filters)}`
  );
}

export function getBackofficePublicDocuments(
  filters: BackofficeContentListFilters = {}
): Promise<BackofficePublicDocumentRecord[]> {
  return fetchFromApi<BackofficePublicDocumentRecord[]>(
    `/documents/backoffice${buildContentFilterQuery(filters)}`
  );
}

export function getBackofficeMeetingRecords(
  filters: BackofficeContentListFilters = {}
): Promise<BackofficeMeetingRecord[]> {
  return fetchFromApi<BackofficeMeetingRecord[]>(
    `/meetings/backoffice${buildContentFilterQuery(filters)}`
  );
}

export function getBackofficeApprovedStandards(
  filters: BackofficeContentListFilters = {}
): Promise<BackofficeApprovedStandardRecord[]> {
  return fetchFromApi<BackofficeApprovedStandardRecord[]>(
    `/standards/backoffice/approved${buildContentFilterQuery(filters)}`
  );
}

export function getLegacyContentInventory(
  filters: LegacyContentInventoryFilters = {}
): Promise<LegacyContentInventoryRecord[]> {
  return fetchFromApi<LegacyContentInventoryRecord[]>(
    `/content/backoffice/inventory${buildLegacyInventoryFilterQuery(filters)}`
  );
}

export function getUsers(): Promise<AuthenticatedUser[]> {
  return fetchFromApi<AuthenticatedUser[]>("/users");
}

export function getOrganizations(): Promise<OrganizationSummary[]> {
  return fetchFromApi<OrganizationSummary[]>("/organizations");
}

export function getMyNotifications(): Promise<NotificationRecord[]> {
  return fetchFromApi<NotificationRecord[]>("/notifications");
}

export function getMyUnreadNotificationCount(): Promise<NotificationUnreadCountDto> {
  return fetchFromApi<NotificationUnreadCountDto>("/notifications/unread-count");
}

export function isApiNotFoundError(error: unknown): boolean {
  return error instanceof Error && /status 404\b/u.test(error.message);
}
