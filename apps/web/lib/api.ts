import "server-only";

import type { DocumentSummary, PaginatedResult, SessionResponseDto } from "@tk182/shared-types";
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

  return (await response.json()) as T;
}

export function getServerSession(): Promise<SessionResponseDto> {
  return fetchFromApi<SessionResponseDto>("/auth/session");
}

export function getWorkspaceDocuments(
  area: WorkspaceArea
): Promise<PaginatedResult<DocumentSummary>> {
  return fetchFromApi<PaginatedResult<DocumentSummary>>(`/documents/${area}`);
}
