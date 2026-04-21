import Link from "next/link";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export default function HomePage() {
  return (
    <div className="page-frame">
      <section className="hero-card">
        <div>
          <div className="eyebrow">Local MVP</div>
          <h1 className="hero-title">
            A clear foundation for the official TK182 portal.
          </h1>
          <p className="hero-copy">
            The scaffold now separates the public website from the participant
            workspace and the secretariat workflow, while keeping the API,
            database wiring, and shared contracts local-first and ready to
            extend.
          </p>
        </div>

        <div className="pill-row">
          <Link className="pill" href="/">
            Public website
          </Link>
          <Link className="pill" href="/participant">
            Participant workspace
          </Link>
          <Link className="pill" href="/secretariat">
            Secretariat workspace
          </Link>
          <Link className="pill" href={`${apiBaseUrl}/health`}>
            API health
          </Link>
        </div>

        <div className="hero-grid">
          <article>
            <h2>Public website</h2>
            <p>
              Committee information, news, meetings, standards, and public
              documents sit in a dedicated public route group with reusable
              content scaffolding.
            </p>
          </article>
          <article>
            <h2>Participant workspace</h2>
            <p>
              Review rounds, protected documents, and comment activity now have
              a separate placeholder surface prepared for local-auth work.
            </p>
          </article>
          <article>
            <h2>Secretariat workspace</h2>
            <p>
              Approval-cycle management, notifications, and audit oversight now
              have their own internal shell instead of living inside the public
              website.
            </p>
          </article>
        </div>
      </section>

      <section className="status-grid">
        <article>
          <div className="eyebrow">Ready now</div>
          <h2>Three distinct portal surfaces</h2>
          <p>
            Route-level separation keeps public content and internal workflow
            concerns from bleeding into each other as the MVP grows.
          </p>
        </article>
        <article>
          <div className="eyebrow">API scaffold</div>
          <h2>Module inventory and auth summary</h2>
          <p>
            The API exposes a root index, health endpoint, and local-auth
            scaffold so the next implementation phase has a consistent starting
            contract.
          </p>
        </article>
        <article>
          <div className="eyebrow">Local-only</div>
          <h2>No cloud or external identity coupling</h2>
          <p>
            The scaffold keeps authentication local and environment-driven,
            matching the MVP constraint of avoiding external auth providers and
            cloud integrations.
          </p>
        </article>
      </section>

      <section className="route-grid">
        <article>
          <h2>Explore the public website</h2>
          <p>
            Browse the current placeholders for committee information and public
            content sections.
          </p>
          <div className="pill-row">
            <Link className="pill" href="/about">
              About
            </Link>
            <Link className="pill" href="/documents">
              Documents
            </Link>
            <Link className="pill" href="/standards">
              Standards
            </Link>
            <Link className="pill" href="/meetings">
              Meetings
            </Link>
            <Link className="pill" href="/news">
              News
            </Link>
            <Link className="pill" href="/contacts">
              Contacts
            </Link>
          </div>
        </article>
        <article>
          <h2>Move into the private scaffold</h2>
          <p>
            The next sprint can now build role checks, credential auth, and
            approval screens on top of separate participant and secretariat
            surfaces.
          </p>
          <div className="pill-row">
            <Link className="pill" href="/login">
              Login scaffold
            </Link>
            <Link className="pill" href="/participant">
              Participant
            </Link>
            <Link className="pill" href="/secretariat">
              Secretariat
            </Link>
            <Link className="pill" href={apiBaseUrl}>
              API index
            </Link>
          </div>
        </article>
      </section>
    </div>
  );
}
