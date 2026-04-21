import Link from "next/link";

import { LoginForm } from "../../../components/login-form";
import { WorkspaceSessionCard } from "../../../components/workspace-session-card";
import { getServerSession, getPublicApiUrl } from "../../../lib/api";
import { canAccessWorkspace, formatRole, getDefaultWorkspacePath } from "../../../lib/auth";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const apiBaseUrl = getPublicApiUrl();
  const session = await getServerSession();

  return (
    <div className="page-frame">
      <section className="hero-card">
        <div>
          <div className="eyebrow">Internal access</div>
          <h1 className="page-title">Participant and secretariat login</h1>
          <p className="page-intro">
            Local credential authentication is now active for the private
            committee workspaces, using hashed passwords and persisted
            httpOnly sessions.
          </p>
        </div>

        <div className="pill-row">
          <Link className="pill" href={`${apiBaseUrl}/auth`}>
            Auth summary
          </Link>
          <Link className="pill" href={`${apiBaseUrl}/auth/session`}>
            API session
          </Link>
          <Link className="pill" href="/participant">
            Participant workspace
          </Link>
          <Link className="pill" href="/secretariat">
            Secretariat workspace
          </Link>
        </div>
      </section>

      <section className="info-grid">
        {session.authenticated && session.user ? (
          <>
            <WorkspaceSessionCard heading="Current session" user={session.user} />
            <article className="content-card">
              <h2>Active workspace access</h2>
              <p>
                You are already signed in as {session.user.displayName} with the{" "}
                {formatRole(session.user.role)} role.
              </p>
              <div className="pill-row">
                <Link
                  className="pill"
                  href={getDefaultWorkspacePath(session.user.role)}
                >
                  Open your default workspace
                </Link>
                {canAccessWorkspace(session.user.role, "participant") ? (
                  <Link className="pill" href="/participant">
                    Participant workspace
                  </Link>
                ) : null}
                {canAccessWorkspace(session.user.role, "secretariat") ? (
                  <Link className="pill" href="/secretariat">
                    Secretariat workspace
                  </Link>
                ) : null}
              </div>
            </article>
          </>
        ) : (
          <>
            <LoginForm />
            <article className="content-card">
              <h2>Session behavior</h2>
              <p>
                Successful login stores an httpOnly cookie, `/auth/session`
                returns live user details, and protected workspace routes enforce
                role boundaries on both the web and API sides.
              </p>
            </article>
          </>
        )}
      </section>
    </div>
  );
}
