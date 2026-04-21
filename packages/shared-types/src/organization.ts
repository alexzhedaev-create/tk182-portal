export interface UserSummary {
  id: string;
  email: string;
  displayName: string;
  organizationId?: string;
}

export interface OrganizationSummary {
  id: string;
  name: string;
  shortName: string;
  countryCode?: string;
}
