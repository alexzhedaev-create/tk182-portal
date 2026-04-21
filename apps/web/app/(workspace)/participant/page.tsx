import { redirect } from "next/navigation";

import { AccessDeniedCard } from "../../../components/access-denied-card";
import { WorkspaceSessionCard } from "../../../components/workspace-session-card";
import { getServerSession, getWorkspaceDocuments } from "../../../lib/api";
import { canAccessWorkspace } from "../../../lib/auth";

export const dynamic = "force-dynamic";

const participantCapabilities = [
  "Assigned draft standards and review rounds",
  "Protected documents and working copies",
  "Comment submission and review history"
];

export default async function ParticipantWorkspacePage() {
  const session = await getServerSession();

  if (!session.authenticated || !session.user) {
    redirect("/login?next=/participant");
  }

  if (!canAccessWorkspace(session.user.role, "participant")) {
    return (
      <div className="page-frame">
        <AccessDeniedCard area="participant" user={session.user} />
      </div>
    );
  }

  const documents = await getWorkspaceDocuments("participant");

  return (
    <div className="page-frame">
      <section className="hero-card">
        <div>
          <div className="eyebrow">Participant workspace</div>
          <h1 className="page-title">Draft review surface</h1>
          <p className="page-intro">
            This workspace now uses the live session from the API and loads
            participant-visible documents from PostgreSQL seed data.
          </p>
        </div>

        <div className="pill-row">
          <span className="pill">Live session</span>
          <span className="pill">Participant role boundary</span>
          <span className="pill">Seeded draft documents</span>
        </div>
      </section>

      <section className="info-grid">
        <WorkspaceSessionCard heading="Current session" user={session.user} />

        <article className="content-card">
          <h2>Visible draft documents</h2>
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
            <p>No participant documents are available yet.</p>
          )}
        </article>

        <article className="content-card">
          <h2>Participant capabilities</h2>
          <ul>
            {participantCapabilities.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>
      </section>
    </div>
  );
}
