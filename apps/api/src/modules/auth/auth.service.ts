import { randomUUID } from "node:crypto";

import {
  BadRequestException,
  Injectable,
  UnauthorizedException
} from "@nestjs/common";
import type {
  AuthSummaryResponse,
  LoginRequestDto,
  LoginResponseDto,
  LogoutResponseDto,
  SessionResponseDto
} from "@tk182/shared-types";

import { DatabaseService } from "../../common/database/database.service";
import { getApplicationConfig } from "../../common/config/environment";
import { buildExpiredSessionCookie, buildSessionCookie, parseCookieHeader } from "./auth.cookie";
import {
  createSessionToken,
  hashSessionToken,
  verifyPassword
} from "./auth.crypto";
import { mapAuthenticatedUser, type UserIdentityRow } from "./auth.user-mapper";
import type { ActiveSession, AuthenticatedRequest, CookieRequest } from "./auth.types";

interface LoginResult {
  response: LoginResponseDto;
  setCookieHeader: string;
}

interface LogoutResult {
  response: LogoutResponseDto;
  setCookieHeader: string;
}

interface LoginLookupRow extends UserIdentityRow {
  password_hash: string;
}

interface SessionLookupRow extends LoginLookupRow {
  session_expires_at: string;
  session_id: string;
}

const USER_SELECT = `
  SELECT
    u.id AS user_id,
    u.display_name AS user_display_name,
    u.email,
    u.password_hash,
    u.role,
    o.id AS organization_id,
    o.name AS organization_name,
    o.short_name AS organization_short_name,
    o.country_code AS organization_country_code
  FROM users u
  LEFT JOIN organizations o ON o.id = u.organization_id
`;

@Injectable()
export class AuthService {
  constructor(private readonly databaseService: DatabaseService) {}

  getSummary(): AuthSummaryResponse {
    return {
      provider: "local-credentials",
      supportedRoles: ["ADMIN", "SECRETARIAT", "PARTICIPANT"],
      loginPath: "/auth/login",
      logoutPath: "/auth/logout",
      sessionPath: "/auth/session",
      configured: true
    };
  }

  async getSession(request: CookieRequest): Promise<SessionResponseDto> {
    const session = await this.getRequestSession(request);

    if (!session) {
      return {
        authenticated: false,
        user: null
      };
    }

    return {
      authenticated: true,
      user: session.user,
      expiresAt: session.expiresAt.toISOString()
    };
  }

  async login(credentials: LoginRequestDto): Promise<LoginResult> {
    const email = credentials.email.trim().toLowerCase();
    const password = credentials.password;

    if (!email || password.trim().length === 0) {
      throw new BadRequestException("Укажите адрес электронной почты и пароль.");
    }

    const userResult = await this.databaseService.query<LoginLookupRow>(
      `${USER_SELECT}
       WHERE u.email = $1
       LIMIT 1`,
      [email]
    );
    const user = userResult.rows[0];

    if (!user || !(await verifyPassword(password, user.password_hash))) {
      throw new UnauthorizedException("Неверный адрес электронной почты или пароль.");
    }

    const sessionToken = createSessionToken();
    const expiresAt = new Date(
      Date.now() + getApplicationConfig().session.ttlHours * 60 * 60 * 1000
    );

    await this.databaseService.query(
      `
        INSERT INTO sessions (id, user_id, token_hash, expires_at)
        VALUES ($1, $2, $3, $4)
      `,
      [
        randomUUID(),
        user.user_id,
        hashSessionToken(sessionToken),
        expiresAt.toISOString()
      ]
    );

    return {
      setCookieHeader: buildSessionCookie(sessionToken, expiresAt),
      response: {
        status: "success",
        message: "Вход выполнен.",
        user: mapAuthenticatedUser(user),
        expiresAt: expiresAt.toISOString()
      }
    };
  }

  async logout(request: CookieRequest): Promise<LogoutResult> {
    const sessionToken = this.getSessionTokenFromRequest(request);

    if (sessionToken) {
      await this.databaseService.query(
        `DELETE FROM sessions WHERE token_hash = $1`,
        [hashSessionToken(sessionToken)]
      );
    }

    return {
      setCookieHeader: buildExpiredSessionCookie(),
      response: {
        status: "success",
        message: "Выход выполнен."
      }
    };
  }

  async getRequestSession(
    request: CookieRequest | AuthenticatedRequest
  ): Promise<ActiveSession | null> {
    const authenticatedRequest = request as AuthenticatedRequest;

    if (Object.prototype.hasOwnProperty.call(authenticatedRequest, "authSession")) {
      return authenticatedRequest.authSession ?? null;
    }

    const sessionToken = this.getSessionTokenFromRequest(request);

    if (!sessionToken) {
      authenticatedRequest.authSession = null;

      return null;
    }

    const sessionResult = await this.databaseService.query<SessionLookupRow>(
      `
        SELECT
          s.id AS session_id,
          s.expires_at AS session_expires_at,
          ${USER_SELECT.replace("SELECT", "")}
        INNER JOIN sessions s ON s.user_id = u.id
        WHERE s.token_hash = $1
        LIMIT 1
      `,
      [hashSessionToken(sessionToken)]
    );
    const row = sessionResult.rows[0];

    if (!row) {
      authenticatedRequest.authSession = null;

      return null;
    }

    const expiresAt = new Date(row.session_expires_at);

    if (Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() <= Date.now()) {
      await this.databaseService.query(`DELETE FROM sessions WHERE id = $1`, [row.session_id]);

      authenticatedRequest.authSession = null;

      return null;
    }

    await this.databaseService.query(
      `UPDATE sessions SET last_accessed_at = NOW() WHERE id = $1`,
      [row.session_id]
    );

    const session: ActiveSession = {
      id: row.session_id,
      user: mapAuthenticatedUser(row),
      expiresAt
    };

    authenticatedRequest.authSession = session;

    return session;
  }

  private getSessionTokenFromRequest(request: CookieRequest): string | null {
    const cookies = parseCookieHeader(request.headers.cookie);
    const cookieName = getApplicationConfig().session.cookieName;

    return cookies[cookieName] ?? null;
  }
}
