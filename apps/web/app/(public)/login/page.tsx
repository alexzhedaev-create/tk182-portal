import Link from "next/link";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export default function LoginPage() {
  return (
    <div className="page-frame">
      <section className="hero-card">
        <div>
          <div className="eyebrow">Internal access</div>
          <h1 className="page-title">Participant and secretariat login</h1>
          <p className="page-intro">
            Local credential-based authentication is scaffolded and intentionally
            limited to the committee workspaces. External identity providers
            remain out of scope for the MVP.
          </p>
        </div>

        <div className="pill-row">
          <Link className="pill" href="/participant">
            Participant workspace
          </Link>
          <Link className="pill" href="/secretariat">
            Secretariat workspace
          </Link>
          <Link className="pill" href={`${apiBaseUrl}/auth`}>
            Auth summary
          </Link>
          <Link className="pill" href={`${apiBaseUrl}/auth/session`}>
            Session stub
          </Link>
        </div>

        <div className="info-grid">
          <article className="content-card">
            <h2>Planned access model</h2>
            <p>
              Email and password authentication for committee participants and
              secretariat staff, backed by role-based authorization in the API
              and protected route guards in the workspaces.
            </p>
          </article>
          <article className="content-card">
            <h2>Current integration point</h2>
            <p>
              The API exposes the health, auth summary, and session placeholder
              endpoints already, so the credential flow can grow from a stable
              local scaffold.
            </p>
          </article>
        </div>
      </section>
    </div>
  );
}
