import Link from "next/link";

import type { AuthenticatedUser } from "@tk182/shared-types";

import { formatRole, getDefaultWorkspacePath, getWorkspaceLabel, type WorkspaceArea } from "../lib/auth";

interface AccessDeniedCardProps {
  area: WorkspaceArea;
  user: AuthenticatedUser;
}

export function AccessDeniedCard({ area, user }: AccessDeniedCardProps) {
  const fallbackWorkspace = getDefaultWorkspacePath(user.role);

  return (
    <>
      <section className="hero-card" data-testid="access-denied-card">
        <div>
          <div className="eyebrow">Доступ ограничен</div>
          <h1 className="page-title">{getWorkspaceLabel(area)}</h1>
          <p className="page-intro">
            Этот раздел доступен для другой роли. Сейчас выполнен вход как{" "}
            {user.displayName} ({formatRole(user.role)}).
          </p>
        </div>

        <div className="pill-row">
          <span className="pill">Пользователь: {user.displayName}</span>
          <span className="pill">Роль: {formatRole(user.role)}</span>
          <Link className="pill" href={fallbackWorkspace}>
            Перейти в доступный кабинет
          </Link>
          <Link className="pill" href="/login">
            Вернуться ко входу
          </Link>
        </div>
      </section>

      <article className="content-card">
        <h2>Почему доступ закрыт</h2>
        <p>
          В MVP кабинет участника и кабинет секретариата разделены. Проверка
          роли выполняется и в веб-приложении, и на стороне API.
        </p>
      </article>
    </>
  );
}
