import Link from "next/link";

const workspaceNavigation = [
  { href: "/participant", label: "Participant" },
  { href: "/secretariat", label: "Secretariat" },
  { href: "/login", label: "Login" },
  { href: "/", label: "Public site" }
];

export function WorkspaceShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="workspace-frame">
      <div className="workspace-shell">
        <header className="workspace-header">
          <div>
            <div className="workspace-eyebrow">Private scaffold</div>
            <h1 className="workspace-title">TK182 internal workspaces</h1>
            <p className="workspace-copy">
              Participant review work and secretariat approval operations are
              intentionally isolated from the public website in this MVP
              scaffold.
            </p>
          </div>

          <nav className="workspace-nav" aria-label="Workspace">
            {workspaceNavigation.map((item) => (
              <Link key={item.href} className="workspace-link" href={item.href}>
                {item.label}
              </Link>
            ))}
          </nav>
        </header>

        <main className="workspace-main">{children}</main>
      </div>
    </div>
  );
}
