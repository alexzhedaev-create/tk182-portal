import { Controller, Get } from "@nestjs/common";

import type { ApiIndexResponse } from "@tk182/shared-types";

const apiEndpoints: ApiIndexResponse["endpoints"] = [
  {
    method: "GET",
    path: "/health",
    areas: ["public", "participant", "secretariat"],
    description: "Service and database health status."
  },
  {
    method: "GET",
    path: "/auth",
    areas: ["participant", "secretariat"],
    description: "Local credential-authentication summary and supported roles."
  },
  {
    method: "GET",
    path: "/auth/session",
    areas: ["participant", "secretariat"],
    description: "Current authenticated user and session state."
  },
  {
    method: "POST",
    path: "/auth/login",
    areas: ["participant", "secretariat"],
    description: "Local login endpoint with hashed passwords and persisted sessions."
  },
  {
    method: "POST",
    path: "/auth/logout",
    areas: ["participant", "secretariat"],
    description: "Clear the current httpOnly session cookie and server-side session."
  },
  {
    method: "GET",
    path: "/users",
    areas: ["participant", "secretariat"],
    description: "Protected user directory for secretariat and admin roles."
  },
  {
    method: "GET",
    path: "/organizations",
    areas: ["public", "participant", "secretariat"],
    description: "Organization directory backed by PostgreSQL seed data."
  },
  {
    method: "GET",
    path: "/committee",
    areas: ["public", "secretariat"],
    description: "TK 182 leadership, secretariat, subcommittee, and organization structure."
  },
  {
    method: "GET",
    path: "/committee/subcommittees",
    areas: ["public", "secretariat"],
    description: "Subcommittee directory for public pages and secretariat draft-standard ownership."
  },
  {
    method: "GET",
    path: "/committee/backoffice",
    areas: ["secretariat"],
    description: "Protected TK 182 committee-structure backoffice data for organizations, people, roles, and subcommittees."
  },
  {
    method: "GET",
    path: "/pages",
    areas: ["public"],
    description: "Managed public-page scaffold."
  },
  {
    method: "GET",
    path: "/news",
    areas: ["public"],
    description: "Public committee news scaffold."
  },
  {
    method: "GET",
    path: "/documents",
    areas: ["public", "participant", "secretariat"],
    description: "Public document catalogue backed by PostgreSQL."
  },
  {
    method: "GET",
    path: "/documents/participant",
    areas: ["participant"],
    description: "Protected participant-visible document feed."
  },
  {
    method: "GET",
    path: "/documents/secretariat",
    areas: ["secretariat"],
    description: "Protected secretariat-visible document feed."
  },
  {
    method: "GET",
    path: "/standards",
    areas: ["public", "participant", "secretariat"],
    description: "Public draft-standard catalogue with linked responsible subcommittees."
  },
  {
    method: "GET",
    path: "/meetings",
    areas: ["public", "participant", "secretariat"],
    description: "Meeting and agenda scaffold."
  },
  {
    method: "GET",
    path: "/approval",
    areas: ["participant", "secretariat"],
    description: "Review-cycle and approval scaffold."
  },
  {
    method: "GET",
    path: "/notifications",
    areas: ["participant", "secretariat"],
    description: "In-portal notification center for review workflow events and unread counts."
  },
  {
    method: "GET",
    path: "/audit",
    areas: ["secretariat"],
    description: "Internal audit trail scaffold."
  }
];

@Controller()
export class AppController {
  @Get()
  getIndex(): ApiIndexResponse {
    return {
      name: "TK182 Portal API",
      status: "active",
      summary:
        "Local-first API foundation with persisted auth, role-aware access control, and seeded document data for the TK182 portal.",
      endpoints: apiEndpoints
    };
  }
}
