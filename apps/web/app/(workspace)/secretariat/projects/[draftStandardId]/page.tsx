import Link from "next/link";
import { redirect } from "next/navigation";

import { AccessDeniedCard } from "../../../../../components/access-denied-card";
import { SecretariatCycleForm } from "../../../../../components/secretariat-cycle-form";
import { SecretariatDraftStandardForm } from "../../../../../components/secretariat-draft-standard-form";
import { SecretariatVersionForm } from "../../../../../components/secretariat-version-form";
import { WorkspaceSessionCard } from "../../../../../components/workspace-session-card";
import {
  getCommitteeSubcommittees,
  getSecretariatDraftStandardDetail,
  getServerSession
} from "../../../../../lib/api";
import { canAccessWorkspace } from "../../../../../lib/auth";
import { formatDate, formatReviewCycleStatus } from "../../../../../lib/review";

export const dynamic = "force-dynamic";

interface SecretariatDraftStandardDetailPageProps {
  params: {
    draftStandardId: string;
  };
}

export default async function SecretariatDraftStandardDetailPage({
  params
}: SecretariatDraftStandardDetailPageProps) {
  const session = await getServerSession();

  if (!session.authenticated || !session.user) {
    redirect(`/login?next=/secretariat/projects/${params.draftStandardId}`);
  }

  if (!canAccessWorkspace(session.user.role, "secretariat")) {
    return (
      <div className="page-frame">
        <AccessDeniedCard area="secretariat" user={session.user} />
      </div>
    );
  }

  const [detail, subcommittees] = await Promise.all([
    getSecretariatDraftStandardDetail(params.draftStandardId),
    getCommitteeSubcommittees()
  ]);

  return (
    <div className="page-frame">
      <section className="hero-card">
        <div>
          <div className="eyebrow">{detail.draftStandard.code}</div>
          <h1 className="page-title">{detail.draftStandard.title}</h1>
          <p className="page-intro">{detail.draftStandard.summary}</p>
        </div>

        <div className="pill-row">
          <span className="pill">Стадия: {detail.draftStandard.stage}</span>
          <span className="pill">Версий: {detail.versions.length}</span>
          <span className="pill">Циклов: {detail.cycles.length}</span>
          <span className="pill">
            ПК:{" "}
            {detail.draftStandard.responsibleSubcommittee
              ? detail.draftStandard.responsibleSubcommittee.code
              : "не указан"}
          </span>
          <Link className="pill" href="/secretariat/projects">
            Ко всем проектам
          </Link>
        </div>
      </section>

      <section className="info-grid">
        <WorkspaceSessionCard heading="Текущая сессия" user={session.user} />
        <SecretariatDraftStandardForm
          draftStandard={detail.draftStandard}
          subcommittees={subcommittees}
        />
      </section>

      <section className="info-grid">
        <SecretariatVersionForm draftStandardId={detail.draftStandard.id} />
        <SecretariatCycleForm
          draftStandardId={detail.draftStandard.id}
          versions={detail.versions}
        />
      </section>

      <section className="content-stack">
        <article className="content-card">
          <h2>Версии проекта стандарта</h2>
          <div className="content-stack">
            {detail.versions.length > 0 ? (
              detail.versions.map((version) => (
                <div
                  key={version.id}
                  className="review-card"
                  data-testid={`secretariat-project-version-${version.id}`}
                >
                  <div className="review-card-header">
                    <div>
                      <strong>{version.versionLabel}</strong>
                      <p>{version.revisionSummary}</p>
                    </div>
                    <div className="pill-row">
                      <span className="pill">{version.fileName}</span>
                      <span className="pill">
                        Файлов вложено: {version.attachmentsCount}
                      </span>
                    </div>
                  </div>

                  <div className="info-grid compact-grid">
                    <div>
                      <strong>Дата публикации</strong>
                      <p>{formatDate(version.publishedAt)}</p>
                    </div>
                    <div>
                      <strong>Описание файла</strong>
                      <p>{version.fileNote}</p>
                    </div>
                    <div>
                      <strong>Ответственный подкомитет</strong>
                      <p>
                        {detail.draftStandard.responsibleSubcommittee
                          ? `${detail.draftStandard.responsibleSubcommittee.code} — ${detail.draftStandard.responsibleSubcommittee.title}`
                          : "Не указан"}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p>Для этого проекта стандарта версии пока не созданы.</p>
            )}
          </div>
        </article>

        <article className="content-card">
          <h2>Циклы согласования</h2>
          <div className="content-stack">
            {detail.cycles.length > 0 ? (
              detail.cycles.map((cycle) => (
                <div
                  key={cycle.cycle.id}
                  className="review-card"
                  data-testid={`secretariat-project-cycle-${cycle.cycle.id}`}
                >
                  <div className="review-card-header">
                    <div>
                      <strong>{cycle.cycle.title}</strong>
                      <p>{cycle.currentVersion.versionLabel}</p>
                    </div>
                    <div className="pill-row">
                      <span className="pill">
                        Статус: {formatReviewCycleStatus(cycle.cycle.status)}
                      </span>
                      <span className="pill">
                        Срок: {formatDate(cycle.cycle.deadlineAt)}
                      </span>
                    </div>
                  </div>

                  <div className="metric-grid">
                    <div className="metric-card">
                      <strong>Всего участников</strong>
                      <span>{cycle.totalParticipants}</span>
                    </div>
                    <div className="metric-card">
                      <strong>Ответили</strong>
                      <span>{cycle.respondedParticipants}</span>
                    </div>
                    <div className="metric-card">
                      <strong>Не ответили</strong>
                      <span>{cycle.pendingParticipants}</span>
                    </div>
                  </div>

                  <div className="info-grid compact-grid">
                    <div>
                      <strong>Ответственный подкомитет</strong>
                      <p>
                        {cycle.draftStandard.responsibleSubcommittee
                          ? `${cycle.draftStandard.responsibleSubcommittee.code} — ${cycle.draftStandard.responsibleSubcommittee.title}`
                          : "Не указан"}
                      </p>
                    </div>
                  </div>

                  <div className="pill-row">
                    <Link
                      className="pill"
                      data-testid={`secretariat-project-cycle-link-${cycle.cycle.id}`}
                      href={`/secretariat/cycles/${cycle.cycle.id}`}
                    >
                      Открыть цикл
                    </Link>
                  </div>
                </div>
              ))
            ) : (
              <p>Для этого проекта стандарта циклы согласования пока не созданы.</p>
            )}
          </div>
        </article>
      </section>
    </div>
  );
}
