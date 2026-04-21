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
    description: "Local credential-authentication scaffold summary."
  },
  {
    method: "GET",
    path: "/auth/session",
    areas: ["participant", "secretariat"],
    description: "Current session placeholder endpoint."
  },
  {
    method: "POST",
    path: "/auth/login",
    areas: ["participant", "secretariat"],
    description: "Local login stub for future credential flow."
  },
  {
    method: "GET",
    path: "/users",
    areas: ["participant", "secretariat"],
    description: "Committee user registry scaffold."
  },
  {
    method: "GET",
    path: "/organizations",
    areas: ["public", "participant", "secretariat"],
    description: "Organization directory and affiliation scaffold."
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
    description: "Document catalogue scaffold across portal areas."
  },
  {
    method: "GET",
    path: "/standards",
    areas: ["public", "participant", "secretariat"],
    description: "Standards catalogue scaffold."
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
    description: "Notification preferences and delivery scaffold."
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
      status: "stub",
      summary:
        "Local-first API scaffold for the TK182 public site, participant workspace, and secretariat workspace.",
      endpoints: apiEndpoints
    };
  }
}
