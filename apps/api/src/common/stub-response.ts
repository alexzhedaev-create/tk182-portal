import type { ModuleStubResponse, PortalArea } from "@tk182/shared-types";

export function createModuleStubResponse(
  module: string,
  areas: PortalArea[],
  summary: string,
  nextMilestone: string
): ModuleStubResponse {
  return {
    module,
    status: "stub",
    areas,
    summary,
    nextMilestone
  };
}
