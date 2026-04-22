import { redirect } from "next/navigation";

import { AccessDeniedCard } from "../../../../../components/access-denied-card";
import { SecretariatCommentsPanel } from "../../../../../components/secretariat-comments-panel";
import { SecretariatVersionFilesPanel } from "../../../../../components/secretariat-version-files-panel";
import { WorkspaceSessionCard } from "../../../../../components/workspace-session-card";
import { getSecretariatCycleDetail, getServerSession } from "../../../../../lib/api";
import { canAccessWorkspace } from "../../../../../lib/auth";
import {
  formatDate,
  formatDateTime,
  formatParticipantPosition,
  formatReviewCycleStatus
} from "../../../../../lib/review";

export const dynamic = "force-dynamic";

interface SecretariatCycleDetailPageProps {
  params: {
    cycleId: string;
  };
}

export default async function SecretariatCycleDetailPage({
  params
}: SecretariatCycleDetailPageProps) {
  const session = await getServerSession();

  if (!session.authenticated || !session.user) {
    redirect(`/login?next=/secretariat/cycles/${params.cycleId}`);
  }

  if (!canAccessWorkspace(session.user.role, "secretariat")) {
    return (
      <div className="page-frame">
        <AccessDeniedCard area="secretariat" user={session.user} />
      </div>
    );
  }

  const detail = await getSecretariatCycleDetail(params.cycleId);

  return (
    <div className="page-frame">
      <section className="hero-card">
        <div>
          <div className="eyebrow">{detail.cycle.draftStandard.code}</div>
          <h1 className="page-title">{detail.cycle.draftStandard.title}</h1>
          <p className="page-intro">{detail.cycle.cycle.title}</p>
        </div>

        <div className="pill-row">
          <span className="pill">
            Статус: {formatReviewCycleStatus(detail.cycle.cycle.status)}
          </span>
          <span className="pill">Срок: {formatDateTime(detail.cycle.cycle.deadlineAt)}</span>
          <span className="pill">
            Ответили: {detail.cycle.respondedParticipants} из{" "}
            {detail.cycle.totalParticipants}
          </span>
        </div>
      </section>

      <section className="info-grid">
        <WorkspaceSessionCard heading="Текущая сессия" user={session.user} />

        <article className="content-card">
          <h2>Параметры цикла</h2>
          <div className="content-stack">
            <div>
              <strong>Редакция</strong>
              <p>{detail.cycle.currentVersion.versionLabel}</p>
            </div>
            <div>
              <strong>Описание версии</strong>
              <p>{detail.cycle.currentVersion.revisionSummary}</p>
            </div>
            <div>
              <strong>Дата публикации версии</strong>
              <p>{formatDate(detail.cycle.currentVersion.publishedAt)}</p>
            </div>
            <div>
              <strong>Файл</strong>
              <p>{detail.cycle.currentVersion.fileName}</p>
            </div>
            <div>
              <strong>Описание файла</strong>
              <p>{detail.cycle.currentVersion.fileNote}</p>
            </div>
          </div>
        </article>

        <article className="content-card">
          <h2>Прогресс</h2>
          <div className="metric-grid">
            <div className="metric-card">
              <strong>Всего участников</strong>
              <span>{detail.cycle.totalParticipants}</span>
            </div>
            <div className="metric-card">
              <strong>Ответили</strong>
              <span>{detail.cycle.respondedParticipants}</span>
            </div>
            <div className="metric-card">
              <strong>Не ответили</strong>
              <span>{detail.cycle.pendingParticipants}</span>
            </div>
          </div>
        </article>
      </section>

      <SecretariatVersionFilesPanel
        files={detail.versionFiles}
        versionId={detail.cycle.currentVersion.id}
      />

      <article className="content-card">
        <h2>Позиции участников</h2>
        <div className="content-stack">
          {detail.participants.map((participant) => (
            <div key={participant.assignmentId} className="review-card">
              <div className="review-card-header">
                <div>
                  <strong>{participant.organizationName}</strong>
                  <p className="status-note">{participant.participantDisplayName}</p>
                </div>
                <div className="pill-row">
                  <span className="pill">
                    {participant.responded ? "Ответ получен" : "Ожидается ответ"}
                  </span>
                  {participant.respondedAt ? (
                    <span className="pill">
                      {formatDateTime(participant.respondedAt)}
                    </span>
                  ) : null}
                </div>
              </div>

              {participant.position ? (
                <div className="content-stack">
                  <div>
                    <strong>Итоговая позиция</strong>
                    <p>{formatParticipantPosition(participant.position.position)}</p>
                  </div>
                  {participant.position.note ? (
                    <div>
                      <strong>Комментарий</strong>
                      <p>{participant.position.note}</p>
                    </div>
                  ) : null}
                </div>
              ) : (
                <p>Позиция еще не направлена.</p>
              )}
            </div>
          ))}
        </div>
      </article>

      <SecretariatCommentsPanel comments={detail.comments} />
    </div>
  );
}
