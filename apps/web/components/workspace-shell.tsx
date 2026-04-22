import Link from "next/link";

const workspaceNavigation = [
  { href: "/participant", label: "Участник" },
  { href: "/secretariat", label: "Секретариат" },
  { href: "/login", label: "Вход" },
  { href: "/", label: "Публичный сайт" }
];

export function WorkspaceShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="workspace-frame">
      <div className="workspace-shell">
        <header className="workspace-header">
          <div>
            <div className="workspace-eyebrow">Рабочая зона</div>
            <h1 className="workspace-title">Кабинеты ТК 182</h1>
            <p className="workspace-copy">
              Процессы согласования участников и рабочий контур секретариата
              отделены от публичного сайта и используют локальную авторизацию.
            </p>
          </div>

          <nav className="workspace-nav" aria-label="Рабочие разделы">
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
