import type { AuthRole } from "@tk182/shared-types";

export type WorkspaceArea = "participant" | "secretariat";

const workspaceAccess: Record<WorkspaceArea, readonly AuthRole[]> = {
  participant: ["PARTICIPANT", "ADMIN"],
  secretariat: ["SECRETARIAT", "ADMIN"]
};

export function canAccessWorkspace(role: AuthRole, area: WorkspaceArea): boolean {
  return workspaceAccess[area].includes(role);
}

export function formatRole(role: AuthRole): string {
  return role
    .toLowerCase()
    .split("_")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

export function getDefaultWorkspacePath(role: AuthRole): string {
  return role === "PARTICIPANT" ? "/participant" : "/secretariat";
}

export function getWorkspaceLabel(area: WorkspaceArea): string {
  return area === "participant" ? "Participant" : "Secretariat";
}
