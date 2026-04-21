export type PortalArea = "public" | "participant" | "secretariat";

export type PlaceholderStatus = "planned" | "stub" | "active";

export interface SiteNavigationItem {
  href: string;
  label: string;
  area: PortalArea;
}

export interface ModuleStubResponse {
  module: string;
  status: PlaceholderStatus;
  areas: PortalArea[];
  summary: string;
  nextMilestone: string;
}

export interface ApiEndpointSummary {
  method: "GET" | "POST";
  path: string;
  areas: PortalArea[];
  description: string;
}

export interface ApiIndexResponse {
  name: string;
  status: PlaceholderStatus;
  summary: string;
  endpoints: ApiEndpointSummary[];
}

export interface PaginatedResult<TItem> {
  items: TItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface HealthStatusResponse {
  status: "ok" | "degraded";
  timestamp: string;
  database: {
    status: "up" | "down";
  };
  services: string[];
}
