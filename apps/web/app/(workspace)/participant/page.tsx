import Link from "next/link";
import { redirect } from "next/navigation";

import { AccessDeniedCard } from "../../../components/access-denied-card";
import { WorkspaceSessionCard } from "../../../components/workspace-session-card";
import { getParticipantAssignedCycles, getServerSession } from "../../../lib/api";
import { canAccessWorkspace } from "../../../lib/auth";
import { formatDate, formatReviewCycleStatus } from "../../../lib/review";

export const dynamic = "force-dynamic";

export default async function ParticipantWorkspacePage() {
  const session = await getServerSession();

  if (!session.authenticated || !session.user) {
    redirect("/login?next=/participant");
  }

  if (!canAccessWorkspace(session.user.role, "participant")) {
    return (
      <div className="page-frame">
        <AccessDeniedCard area="participant" user={session.user} />
      </div>
    );
  }

  const assignedCycles = await getParticipantAssignedCycles();

  return (
    <div className="page-frame">
      <section className="hero-card">
        <div>
          <div className="eyebrow">Кабинет участника</div>
          <h1 className="page-title">На согласовании</h1>
          <p className="page-intro">
            Здесь отображаются назначенные вам проекты стандартов, сроки ответа,
            текущие редакции и рабочие замечания по активным циклам.
          </p>
        </div>

        <div className="pill-row">
          <span className="pill">Назначено циклов: {assignedCycles.length}</span>
          <span className="pill">Роль: Участник</span>
          <span className="pill">Локальная сессия активна</span>
        </div>
      </section>

      <section className="info-grid">
        <WorkspaceSessionCard heading="Текущая сессия" user={session.user} />

        <article className="content-card">
          <h2>Как работать с замечаниями</h2>
          <ul>
            <li>Откройте карточку проекта и проверьте текущую редакцию документа.</li>
            <li>Добавьте замечания с указанием раздела, пункта или страницы.</li>
            <li>После подготовки комментариев отправьте итоговую позицию организации.</li>
          </ul>
        </article>
      </section>

      <section className="content-stack">
        {assignedCycles.length > 0 ? (
          assignedCycles.map((item) => (
            <article key={item.assignmentId} className="content-card review-card">
              <div className="review-card-header">
                <div>
                  <div className="eyebrow">{item.draftStandard.code}</div>
                  <h2>{item.draftStandard.title}</h2>
                  <p>{item.draftStandard.summary}</p>
                </div>
                <div className="pill-row">
                  <span className="pill">
                    Статус: {formatReviewCycleStatus(item.cycle.status)}
                  </span>
                  <span className="pill">
                    Срок ответа: {formatDate(item.cycle.deadlineAt)}
                  </span>
                </div>
              </div>

              <div className="info-grid compact-grid">
                <div>
                  <strong>Цикл</strong>
                  <p>{item.cycle.title}</p>
                </div>
                <div>
                  <strong>Текущая версия</strong>
                  <p>{item.currentVersion.versionLabel}</p>
                </div>
                <div>
                  <strong>Файл</strong>
                  <p>{item.currentVersion.fileName}</p>
                </div>
              </div>

              <div className="pill-row">
                <Link
                  className="pill"
                  href={`/participant/reviews/${item.cycle.id}/${item.draftStandard.id}`}
                >
                  Открыть карточку проекта
                </Link>
              </div>
            </article>
          ))
        ) : (
          <article className="content-card">
            <h2>Активных назначений нет</h2>
            <p>Сейчас на вас не назначено активных циклов согласования.</p>
          </article>
        )}
      </section>
    </div>
  );
}
