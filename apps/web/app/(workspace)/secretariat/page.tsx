import { redirect } from "next/navigation";

import { AccessDeniedCard } from "../../../components/access-denied-card";
import { WorkspaceSessionCard } from "../../../components/workspace-session-card";
import { getServerSession, getWorkspaceDocuments } from "../../../lib/api";
import { canAccessWorkspace } from "../../../lib/auth";

export const dynamic = "force-dynamic";

const secretariatCapabilities = [
  "Review-cycle setup and publication windows",
  "Notification rules and participant communication",
  "Audit visibility for protected workflow actions"
];

export default async function SecretariatWorkspacePage() {
  const session = await getServerSession();

  if (!session.authenticated || !session.user) {
    redirect("/login?next=/secretariat");
  }

  if (!canAccessWorkspace(session.user.role, "secretariat")) {
    return (
      <div className="page-frame">
        <AccessDeniedCard area="secretariat" user={session.user} />
      </div>
    );
  }

  const documents = await getWorkspaceDocuments("secretariat");

  return (
    <div className="page-frame">
      <section className="hero-card">
        <div>
          <div className="eyebrow">Secretariat workspace</div>
          <h1 className="page-title">Approval-cycle administration</h1>
          <p className="page-intro">
            This workspace now uses the live session from the API and loads the
            broader secretariat-visible document set from PostgreSQL.
          </p>
        </div>

        <div className="pill-row">
          <span className="pill">Live session</span>
          <span className="pill">Secretariat role boundary</span>
          <span className="pill">Protected internal documents</span>
        </div>
      </section>

      <section className="info-grid">
        <WorkspaceSessionCard heading="Current session" user={session.user} />

        <article className="content-card">
          <h2>Visible workspace documents</h2>
          {documents.items.length > 0 ? (
            <div className="content-stack">
              {documents.items.map((document) => (
                <div key={document.id} className="document-card">
                  <strong>{document.title}</strong>
                  <p>{document.summary}</p>
                  <div className="pill-row">
                    <span className="pill">{document.category}</span>
                    <span className="pill">{document.visibility}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p>No secretariat documents are available yet.</p>
          )}
        </article>

        <article className="content-card">
          <h2>Secretariat capabilities</h2>
          <ul>
            {secretariatCapabilities.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>
      </section>
    </div>
  );
}
