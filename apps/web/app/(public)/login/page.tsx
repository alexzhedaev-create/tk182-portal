import Link from "next/link";

import { LoginForm } from "../../../components/login-form";
import { WorkspaceSessionCard } from "../../../components/workspace-session-card";
import { getServerSession, getPublicApiUrl } from "../../../lib/api";
import { canAccessWorkspace, formatRole, getDefaultWorkspacePath } from "../../../lib/auth";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const apiBaseUrl = getPublicApiUrl();
  const session = await getServerSession();

  return (
    <div className="page-frame">
      <section className="hero-card">
        <div>
          <div className="eyebrow">Локальный доступ</div>
          <h1 className="page-title">Вход в рабочие кабинеты</h1>
          <p className="page-intro">
            Для рабочих кабинетов ТК 182 включена локальная авторизация с
            хэшированием паролей и постоянной httpOnly-сессией.
          </p>
        </div>

        <div className="pill-row">
          <Link className="pill" href={`${apiBaseUrl}/auth`}>
            Сводка auth API
          </Link>
          <Link className="pill" href={`${apiBaseUrl}/auth/session`}>
            Сессия API
          </Link>
          <Link className="pill" href="/participant">
            Кабинет участника
          </Link>
          <Link className="pill" href="/secretariat">
            Кабинет секретариата
          </Link>
        </div>
      </section>

      <section className="info-grid">
        {session.authenticated && session.user ? (
          <>
            <WorkspaceSessionCard heading="Текущая сессия" user={session.user} />
            <article className="content-card">
              <h2>Доступные разделы</h2>
              <p>
                Вы уже вошли как {session.user.displayName}. Текущая роль:{" "}
                {formatRole(session.user.role)}.
              </p>
              <div className="pill-row">
                <Link
                  className="pill"
                  href={getDefaultWorkspacePath(session.user.role)}
                >
                  Открыть основной кабинет
                </Link>
                {canAccessWorkspace(session.user.role, "participant") ? (
                  <Link className="pill" href="/participant">
                    Кабинет участника
                  </Link>
                ) : null}
                {canAccessWorkspace(session.user.role, "secretariat") ? (
                  <Link className="pill" href="/secretariat">
                    Кабинет секретариата
                  </Link>
                ) : null}
              </div>
            </article>
          </>
        ) : (
          <>
            <LoginForm />
            <article className="content-card">
              <h2>Как работает сессия</h2>
              <p>
                После входа сохраняется httpOnly-cookie, `/auth/session`
                возвращает актуальную информацию о пользователе, а защищенные
                маршруты проверяют роль и в вебе, и в API.
              </p>
            </article>
          </>
        )}
      </section>
    </div>
  );
}
