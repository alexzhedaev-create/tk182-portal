import Link from "next/link";

import type { SiteNavigationItem } from "@tk182/shared-types";

const navigationItems: SiteNavigationItem[] = [
  { href: "/", label: "Home", area: "public" },
  { href: "/about", label: "About", area: "public" },
  { href: "/documents", label: "Documents", area: "public" },
  { href: "/standards", label: "Standards", area: "public" },
  { href: "/meetings", label: "Meetings", area: "public" },
  { href: "/news", label: "News", area: "public" },
  { href: "/contacts", label: "Contacts", area: "public" },
  { href: "/login", label: "Login", area: "public" }
];

export function SiteShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="site-frame">
      <div className="site-shell">
        <header className="site-header">
          <div className="brand-mark">
            <div className="brand-badge">182</div>
            <div className="brand-copy">
              <span>Technical Committee Portal</span>
              <strong>TK182 Portal</strong>
              <p>
                Public information on the committee, with a clean path toward
                participant and secretariat workspaces.
              </p>
            </div>
          </div>

          <nav className="site-nav" aria-label="Primary">
            {navigationItems.map((item) => (
              <Link key={item.href} className="nav-link" href={item.href}>
                {item.label}
              </Link>
            ))}
          </nav>
        </header>

        <main className="main-panel">{children}</main>

        <footer className="footer-card">
          <p>Local MVP foundation for the official TK182 portal.</p>
          <p>Public website now, review workflows next.</p>
        </footer>
      </div>
    </div>
  );
}
