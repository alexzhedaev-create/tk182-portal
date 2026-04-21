import type { AuthenticatedUser } from "@tk182/shared-types";

export interface CookieRequest {
  headers: {
    cookie?: string;
  };
}

export interface SetHeaderResponse {
  setHeader(name: string, value: string): void;
}

export interface ActiveSession {
  expiresAt: Date;
  id: string;
  user: AuthenticatedUser;
}

export interface AuthenticatedRequest extends CookieRequest {
  authSession?: ActiveSession | null;
}
