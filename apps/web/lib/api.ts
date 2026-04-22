import "server-only";

import type {
  ApprovalAuditEvent,
  DocumentSummary,
  NotificationRecord,
  NotificationUnreadCountDto,
  PaginatedResult,
  ParticipantAssignedReviewCycle,
  ParticipantDraftStandardCard,
  ParticipantPositionRecord,
  ReviewCommentRecord,
  SecretariatCycleDetail,
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

export function getSecretariatCycleDetail(
  cycleId: string
): Promise<SecretariatCycleDetail> {
  return fetchFromApi<SecretariatCycleDetail>(
    `/approval/secretariat/cycles/${encodeURIComponent(cycleId)}`
  );
}

export function getReviewCycleAuditEvents(
  cycleId: string
): Promise<ApprovalAuditEvent[]> {
  return fetchFromApi<ApprovalAuditEvent[]>(
    `/audit/review-cycles/${encodeURIComponent(cycleId)}/events`
  );
}

export function getMyNotifications(): Promise<NotificationRecord[]> {
  return fetchFromApi<NotificationRecord[]>("/notifications");
}

export function getMyUnreadNotificationCount(): Promise<NotificationUnreadCountDto> {
  return fetchFromApi<NotificationUnreadCountDto>("/notifications/unread-count");
}
