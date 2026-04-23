import { Inject, Injectable } from "@nestjs/common";
import type { AuthenticatedUser } from "@tk182/shared-types";

import { DatabaseService } from "../../common/database/database.service";
import { mapAuthenticatedUser, type UserIdentityRow } from "../auth/auth.user-mapper";

@Injectable()
export class UsersService {
  constructor(
    @Inject(DatabaseService)
    private readonly databaseService: DatabaseService
  ) {}

  async listUsers(): Promise<AuthenticatedUser[]> {
    const result = await this.databaseService.query<UserIdentityRow>(
      `
        SELECT
          u.id AS user_id,
          u.display_name AS user_display_name,
          u.email,
          u.role,
          o.id AS organization_id,
          o.name AS organization_name,
          o.short_name AS organization_short_name,
          o.country_code AS organization_country_code
        FROM users u
        LEFT JOIN organizations o ON o.id = u.organization_id
        ORDER BY
          CASE u.role
            WHEN 'ADMIN' THEN 1
            WHEN 'SECRETARIAT' THEN 2
            ELSE 3
          END,
          u.display_name ASC
      `
    );

    return result.rows.map((row) => mapAuthenticatedUser(row));
  }
}
