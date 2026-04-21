import Link from "next/link";

import type { AuthenticatedUser } from "@tk182/shared-types";

import { formatRole, getDefaultWorkspacePath, getWorkspaceLabel, type WorkspaceArea } from "../lib/auth";

interface AccessDeniedCardProps {
  area: WorkspaceArea;
  user: AuthenticatedUser;
}

export function AccessDeniedCard({ area, user }: AccessDeniedCardProps) {
  const fallbackWorkspace = getDefaultWorkspacePath(user.role);

  return (
    <>
      <section className="hero-card">
        <div>
          <div className="eyebrow">Access denied</div>
          <h1 className="page-title">{getWorkspaceLabel(area)} workspace</h1>
          <p className="page-intro">
            This workspace is restricted to a different role. You are signed in
            as {user.displayName} ({formatRole(user.role)}).
          </p>
        </div>

        <div className="pill-row">
          <span className="pill">Signed in: {user.displayName}</span>
          <span className="pill">Role: {formatRole(user.role)}</span>
          <Link className="pill" href={fallbackWorkspace}>
            Go to your workspace
          </Link>
          <Link className="pill" href="/login">
            Back to login
          </Link>
        </div>
      </section>

      <article className="content-card">
        <h2>Why this is blocked</h2>
        <p>
          The participant and secretariat surfaces are intentionally separated in
          the MVP. Route protection is enforced both in the web app and in the
          API.
        </p>
      </article>
    </>
  );
}
