import type { AuthRole } from "@tk182/shared-types";

export type WorkspaceArea = "participant" | "secretariat";

const workspaceAccess: Record<WorkspaceArea, readonly AuthRole[]> = {
  participant: ["PARTICIPANT"],
  secretariat: ["SECRETARIAT", "ADMIN"]
};

export function canAccessWorkspace(role: AuthRole, area: WorkspaceArea): boolean {
  return workspaceAccess[area].includes(role);
}

export function formatRole(role: AuthRole): string {
  switch (role) {
    case "ADMIN":
      return "Администратор";
    case "SECRETARIAT":
      return "Секретариат";
    case "PARTICIPANT":
      return "Участник";
    default:
      return role;
  }
}

export function getDefaultWorkspacePath(role: AuthRole): string {
  return role === "PARTICIPANT" ? "/participant" : "/secretariat";
}

export function getWorkspaceLabel(area: WorkspaceArea): string {
  return area === "participant" ? "Кабинет участника" : "Кабинет секретариата";
}
