import Link from "next/link";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

const participantCapabilities = [
  "Assigned draft standards and review rounds",
  "Protected documents and working copies",
  "Comment submission and review history"
];

const participantNextSteps = [
  "Add local credential login and participant role guards",
  "Connect review-cycle listings from the approval module",
  "Persist draft-document visibility and comment state"
];

export default function ParticipantWorkspacePage() {
  return (
    <div className="page-frame">
      <section className="hero-card">
        <div>
          <div className="eyebrow">Participant workspace</div>
          <h1 className="page-title">Draft review surface</h1>
          <p className="page-intro">
            This route is reserved for committee participants reviewing draft
            standards. It is intentionally separated from the public website and
            from the secretariat workflow.
          </p>
        </div>

        <div className="pill-row">
          <span className="pill">Local auth scaffold</span>
          <span className="pill">Protected review assets</span>
          <span className="pill">Participant role boundary</span>
        </div>
      </section>

      <section className="info-grid">
        <article className="content-card">
          <h2>Planned participant capabilities</h2>
          <ul>
            {participantCapabilities.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>
        <article className="content-card">
          <h2>Current API touchpoints</h2>
          <p>
            The local scaffold already exposes the auth, standards, documents,
            and approval endpoints that this workspace will eventually depend
            on.
          </p>
          <div className="pill-row">
            <Link className="pill" href={`${apiBaseUrl}/auth`}>
              Auth summary
            </Link>
            <Link className="pill" href={`${apiBaseUrl}/documents`}>
              Documents stub
            </Link>
            <Link className="pill" href={`${apiBaseUrl}/approval`}>
              Approval stub
            </Link>
          </div>
        </article>
        <article className="content-card">
          <h2>Next implementation steps</h2>
          <ul>
            {participantNextSteps.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>
      </section>
    </div>
  );
}
