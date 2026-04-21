import Link from "next/link";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

const secretariatCapabilities = [
  "Review-cycle setup and publication windows",
  "Notification rules and participant communication",
  "Audit visibility for protected workflow actions"
];

const secretariatNextSteps = [
  "Add secretariat role guards and internal navigation",
  "Connect approval, notifications, and audit endpoints to live data",
  "Persist workflow state, delivery settings, and audit records"
];

export default function SecretariatWorkspacePage() {
  return (
    <div className="page-frame">
      <section className="hero-card">
        <div>
          <div className="eyebrow">Secretariat workspace</div>
          <h1 className="page-title">Approval-cycle administration</h1>
          <p className="page-intro">
            This route is the private operating surface for secretariat staff.
            It is kept distinct from both the public website and the
            participant-facing review workspace.
          </p>
        </div>

        <div className="pill-row">
          <span className="pill">Review-cycle management</span>
          <span className="pill">Notification oversight</span>
          <span className="pill">Audit boundary</span>
        </div>
      </section>

      <section className="info-grid">
        <article className="content-card">
          <h2>Planned secretariat capabilities</h2>
          <ul>
            {secretariatCapabilities.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>
        <article className="content-card">
          <h2>Current API touchpoints</h2>
          <p>
            The current scaffold already exposes the approval, notifications,
            and audit modules as dedicated internal endpoints.
          </p>
          <div className="pill-row">
            <Link className="pill" href={`${apiBaseUrl}/approval`}>
              Approval stub
            </Link>
            <Link className="pill" href={`${apiBaseUrl}/notifications`}>
              Notifications stub
            </Link>
            <Link className="pill" href={`${apiBaseUrl}/audit`}>
              Audit stub
            </Link>
          </div>
        </article>
        <article className="content-card">
          <h2>Next implementation steps</h2>
          <ul>
            {secretariatNextSteps.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>
      </section>
    </div>
  );
}
