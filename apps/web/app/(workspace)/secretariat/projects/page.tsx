import Link from "next/link";
import { redirect } from "next/navigation";

import { AccessDeniedCard } from "../../../../components/access-denied-card";
import { SecretariatDraftStandardForm } from "../../../../components/secretariat-draft-standard-form";
import { WorkspaceSessionCard } from "../../../../components/workspace-session-card";
import {
  getCommitteeSubcommittees,
  getSecretariatDraftStandards,
  getServerSession
} from "../../../../lib/api";
import { canAccessWorkspace } from "../../../../lib/auth";

export const dynamic = "force-dynamic";

export default async function SecretariatProjectsPage() {
  const session = await getServerSession();

  if (!session.authenticated || !session.user) {
    redirect("/login?next=/secretariat/projects");
  }

  if (!canAccessWorkspace(session.user.role, "secretariat")) {
    return (
      <div className="page-frame">
        <AccessDeniedCard area="secretariat" user={session.user} />
      </div>
    );
  }

  const [draftStandards, subcommittees] = await Promise.all([
    getSecretariatDraftStandards(),
    getCommitteeSubcommittees()
  ]);

  return (
    <div className="page-frame">
      <section className="hero-card">
        <div>
          <div className="eyebrow">Секретариат</div>
          <h1 className="page-title">Проекты стандартов</h1>
          <p className="page-intro">
            Здесь создаются карточки проектов стандартов, версии редакций и новые
            циклы согласования для участников.
          </p>
        </div>

        <div className="pill-row">
          <span className="pill">Всего проектов: {draftStandards.length}</span>
          <span className="pill">
            Активных проектов:{" "}
            {draftStandards.filter((item) => item.activeCyclesCount > 0).length}
          </span>
          <Link className="pill" href="/secretariat">
            Вернуться к циклам
          </Link>
        </div>
      </section>

      <section className="info-grid">
        <WorkspaceSessionCard heading="Текущая сессия" user={session.user} />
        <SecretariatDraftStandardForm subcommittees={subcommittees} />
      </section>

      <section className="content-stack">
        {draftStandards.length > 0 ? (
          draftStandards.map((item) => (
            <article
              key={item.draftStandard.id}
              className="content-card review-card"
              data-testid={`secretariat-draft-standard-card-${item.draftStandard.id}`}
            >
              <div className="review-card-header">
                <div>
                  <div className="eyebrow">{item.draftStandard.code}</div>
                  <h2>{item.draftStandard.title}</h2>
                  <p>{item.draftStandard.summary}</p>
                </div>
                <div className="pill-row">
                  <span className="pill">Стадия: {item.draftStandard.stage}</span>
                  <span className="pill">Версий: {item.versionsCount}</span>
                  <span className="pill">Циклов: {item.cyclesCount}</span>
                </div>
              </div>

              <div className="info-grid compact-grid">
                <div>
                  <strong>Последняя версия</strong>
                  <p>{item.latestVersionLabel ?? "Пока не создана"}</p>
                </div>
                <div>
                  <strong>Активных циклов</strong>
                  <p>{item.activeCyclesCount}</p>
                </div>
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
                  data-testid={`secretariat-draft-standard-link-${item.draftStandard.id}`}
                  href={`/secretariat/projects/${item.draftStandard.id}`}
                >
                  Открыть проект
                </Link>
              </div>
            </article>
          ))
        ) : (
          <article className="content-card">
            <h2>Проектов пока нет</h2>
            <p>Создайте первый проект стандарта, чтобы перейти к версиям и циклам.</p>
          </article>
        )}
      </section>
    </div>
  );
}
