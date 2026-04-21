import type { PlaceholderStatus } from "./common";

export type AuthRole = "participant" | "secretariat";

export interface LoginRequestDto {
  email: string;
  password: string;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  displayName: string;
  organizationId?: string;
  roles: AuthRole[];
}

export interface AuthSummaryResponse {
  status: PlaceholderStatus;
  provider: "local-credentials";
  supportedRoles: AuthRole[];
  loginPath: string;
  sessionPath: string;
  notes: string[];
}

export interface SessionResponseDto {
  status: PlaceholderStatus;
  message: string;
  user: AuthenticatedUser | null;
}

export interface LoginResponseDto {
  status: PlaceholderStatus;
  message: string;
  user: AuthenticatedUser | null;
}
