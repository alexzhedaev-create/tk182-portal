import type { OrganizationSummary } from "./organization";

export type AuthRole = "ADMIN" | "SECRETARIAT" | "PARTICIPANT";
export type AuthMutationStatus = "success";

export interface LoginRequestDto {
  email: string;
  password: string;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  displayName: string;
  role: AuthRole;
  organization: OrganizationSummary | null;
}

export interface AuthSummaryResponse {
  provider: "local-credentials";
  supportedRoles: AuthRole[];
  loginPath: string;
  logoutPath: string;
  sessionPath: string;
  configured: boolean;
}

export interface SessionResponseDto {
  authenticated: boolean;
  user: AuthenticatedUser | null;
  expiresAt?: string | null;
}

export interface LoginResponseDto {
  status: AuthMutationStatus;
  message: string;
  user: AuthenticatedUser;
  expiresAt: string;
}

export interface LogoutResponseDto {
  status: AuthMutationStatus;
  message: string;
}
