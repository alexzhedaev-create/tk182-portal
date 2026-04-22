import Link from "next/link";

import type { SiteNavigationItem } from "@tk182/shared-types";

const navigationItems: SiteNavigationItem[] = [
  { href: "/", label: "Главная", area: "public" },
  { href: "/about", label: "О комитете", area: "public" },
  { href: "/documents", label: "Документы", area: "public" },
  { href: "/standards", label: "Стандарты", area: "public" },
  { href: "/meetings", label: "Заседания", area: "public" },
  { href: "/news", label: "Новости", area: "public" },
  { href: "/contacts", label: "Контакты", area: "public" },
  { href: "/login", label: "Вход", area: "public" }
];

export function SiteShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="site-frame">
      <div className="site-shell">
        <header className="site-header">
          <div className="brand-mark">
            <div className="brand-badge">182</div>
            <div className="brand-copy">
              <span>Официальный портал</span>
              <strong>ТК 182</strong>
              <p>
                Публичная информация о комитете и единая точка входа в рабочие
                кабинеты участника и секретариата.
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
          <p>Локальный MVP официального портала ТК 182.</p>
          <p>Публичный сайт и первый рабочий контур согласования проектов стандартов.</p>
        </footer>
      </div>
    </div>
  );
}
