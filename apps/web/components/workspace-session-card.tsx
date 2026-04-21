import type { AuthenticatedUser } from "@tk182/shared-types";

import { formatRole } from "../lib/auth";
import { LogoutButton } from "./logout-button";

interface WorkspaceSessionCardProps {
  heading: string;
  user: AuthenticatedUser;
}

export function WorkspaceSessionCard({
  heading,
  user
}: WorkspaceSessionCardProps) {
  return (
    <article className="content-card">
      <h2>{heading}</h2>
      <p>
        Signed in as <strong>{user.displayName}</strong>.
      </p>
      <div className="pill-row">
        <span className="pill">Role: {formatRole(user.role)}</span>
        <span className="pill">{user.email}</span>
        {user.organization ? (
          <span className="pill">{user.organization.shortName}</span>
        ) : null}
      </div>
      <div className="stack-actions">
        <LogoutButton />
      </div>
    </article>
  );
}
