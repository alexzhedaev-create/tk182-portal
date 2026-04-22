import Link from "next/link";
import { redirect } from "next/navigation";

import { AccessDeniedCard } from "../../../components/access-denied-card";
import { WorkspaceSessionCard } from "../../../components/workspace-session-card";
import { getSecretariatCycles, getServerSession } from "../../../lib/api";
import { canAccessWorkspace } from "../../../lib/auth";
import { formatDate, formatReviewCycleStatus } from "../../../lib/review";

export const dynamic = "force-dynamic";

export default async function SecretariatWorkspacePage() {
  const session = await getServerSession();

  if (!session.authenticated || !session.user) {
    redirect("/login?next=/secretariat");
  }

  if (!canAccessWorkspace(session.user.role, "secretariat")) {
    return (
      <div className="page-frame">
        <AccessDeniedCard area="secretariat" user={session.user} />
      </div>
    );
  }

  const cycles = await getSecretariatCycles();
  const activeCycles = cycles.filter((item) => item.cycle.status === "open");
  const archivedCycles = cycles.filter((item) => item.cycle.status !== "open");

  return (
    <div className="page-frame">
      <section className="hero-card">
        <div>
          <div className="eyebrow">Кабинет секретариата</div>
          <h1 className="page-title">Циклы согласования</h1>
          <p className="page-intro">
            Здесь собраны все циклы согласования, прогресс по участникам,
            замечания, ответы секретариата и итоговые позиции организаций.
          </p>
        </div>

        <div className="pill-row">
          <span className="pill">Активных циклов: {activeCycles.length}</span>
          <span className="pill">Архивных циклов: {archivedCycles.length}</span>
          <span className="pill">Доступ: секретариат и администратор</span>
        </div>
      </section>

      <section className="info-grid">
        <WorkspaceSessionCard heading="Текущая сессия" user={session.user} />

        <article className="content-card">
          <h2>Что можно сделать</h2>
          <ul>
            <li>Создать новый проект стандарта, версию и цикл согласования.</li>
            <li>Просмотреть прогресс по каждому циклу согласования.</li>
            <li>Проверить замечания и итоговые позиции участников.</li>
            <li>Обновить статус замечания и добавить ответ секретариата.</li>
          </ul>

          <div className="pill-row">
            <Link
              className="pill"
              data-testid="secretariat-projects-link"
              href="/secretariat/projects"
            >
              Открыть проекты стандартов
            </Link>
          </div>
        </article>
      </section>

      <section className="content-stack">
        <article className="content-card">
          <h2>Активные циклы</h2>
          <div className="content-stack">
            {activeCycles.length > 0 ? (
              activeCycles.map((item) => (
                <div key={item.cycle.id} className="review-card">
                  <div className="review-card-header">
                    <div>
                      <div className="eyebrow">{item.draftStandard.code}</div>
                      <strong>{item.draftStandard.title}</strong>
                      <p>{item.cycle.title}</p>
                    </div>
                    <div className="pill-row">
                      <span className="pill">
                        Статус: {formatReviewCycleStatus(item.cycle.status)}
                      </span>
                      <span className="pill">
                        Срок: {formatDate(item.cycle.deadlineAt)}
                      </span>
                    </div>
                  </div>

                  <div className="metric-grid">
                    <div className="metric-card">
                      <strong>Всего участников</strong>
                      <span>{item.totalParticipants}</span>
                    </div>
                    <div className="metric-card">
                      <strong>Ответили</strong>
                      <span>{item.respondedParticipants}</span>
                    </div>
                    <div className="metric-card">
                      <strong>Не ответили</strong>
                      <span>{item.pendingParticipants}</span>
                    </div>
                  </div>

                  <div className="info-grid compact-grid">
                    <div>
                      <strong>Ответственный подкомитет</strong>
                      <p>
                        {item.draftStandard.responsibleSubcommittee
                          ? `${item.draftStandard.responsibleSubcommittee.code} — ${item.draftStandard.responsibleSubcommittee.title}`
                          : "Не указан"}
                      </p>
                    </div>
                  </div>

                  <div className="pill-row">
                    <Link
                      className="pill"
                      data-testid={`secretariat-cycle-link-${item.cycle.id}`}
                      href={`/secretariat/cycles/${item.cycle.id}`}
                    >
                      Открыть цикл
                    </Link>
                  </div>
                </div>
              ))
            ) : (
              <p>Активных циклов согласования нет.</p>
            )}
          </div>
        </article>

        <article className="content-card">
          <h2>Архив</h2>
          <div className="content-stack">
            {archivedCycles.length > 0 ? (
              archivedCycles.map((item) => (
                <div key={item.cycle.id} className="review-card">
                  <div className="review-card-header">
                    <div>
                      <div className="eyebrow">{item.draftStandard.code}</div>
                      <strong>{item.draftStandard.title}</strong>
                      <p>{item.cycle.title}</p>
                    </div>
                    <div className="pill-row">
                      <span className="pill">
                        Статус: {formatReviewCycleStatus(item.cycle.status)}
                      </span>
                      <span className="pill">
                        Версия: {item.currentVersion.versionLabel}
                      </span>
                    </div>
                  </div>

                  <div className="pill-row">
                    <Link
                      className="pill"
                      data-testid={`secretariat-cycle-link-${item.cycle.id}`}
                      href={`/secretariat/cycles/${item.cycle.id}`}
                    >
                      Открыть архивный цикл
                    </Link>
                  </div>

                  <p className="status-note">
                    Ответственный подкомитет:{" "}
                    {item.draftStandard.responsibleSubcommittee
                      ? `${item.draftStandard.responsibleSubcommittee.code} — ${item.draftStandard.responsibleSubcommittee.title}`
                      : "не указан"}
                  </p>
                </div>
              ))
            ) : (
              <p>Архивных циклов пока нет.</p>
            )}
          </div>
        </article>
      </section>
    </div>
  );
}
