import { Inject, Injectable } from "@nestjs/common";
import type { OrganizationSummary } from "@tk182/shared-types";

import { DatabaseService } from "../../common/database/database.service";

interface OrganizationRow {
  country_code: string | null;
  id: string;
  name: string;
  short_name: string;
}

@Injectable()
export class OrganizationsService {
  constructor(
    @Inject(DatabaseService)
    private readonly databaseService: DatabaseService
  ) {}

  async listOrganizations(): Promise<OrganizationSummary[]> {
    const result = await this.databaseService.query<OrganizationRow>(
      `
        SELECT id, name, short_name, country_code
        FROM organizations
        ORDER BY name ASC
      `
    );

    return result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      shortName: row.short_name,
      ...(row.country_code ? { countryCode: row.country_code } : {})
    }));
  }
}
