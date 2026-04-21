import type { AuthRole, AuthenticatedUser } from "@tk182/shared-types";

export interface UserIdentityRow {
  email: string;
  organization_country_code: string | null;
  organization_id: string | null;
  organization_name: string | null;
  organization_short_name: string | null;
  role: AuthRole;
  user_display_name: string;
  user_id: string;
}

export function mapAuthenticatedUser(row: UserIdentityRow): AuthenticatedUser {
  return {
    id: row.user_id,
    email: row.email,
    displayName: row.user_display_name,
    role: row.role,
    organization: row.organization_id
      ? {
          id: row.organization_id,
          name: row.organization_name ?? "Unknown organization",
          shortName: row.organization_short_name ?? "N/A",
          ...(row.organization_country_code
            ? { countryCode: row.organization_country_code }
            : {})
        }
      : null
  };
}
