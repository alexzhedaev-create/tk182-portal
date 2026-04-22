import { redirect } from "next/navigation";

import { AccessDeniedCard } from "../../../../../../components/access-denied-card";
import { ParticipantCommentsPanel } from "../../../../../../components/participant-comments-panel";
import { ParticipantPositionForm } from "../../../../../../components/participant-position-form";
import { WorkspaceSessionCard } from "../../../../../../components/workspace-session-card";
import {
  getPublicApiUrl,
  getParticipantComments,
  getParticipantDraftCard,
  getParticipantPosition,
  getServerSession
} from "../../../../../../lib/api";
import { canAccessWorkspace } from "../../../../../../lib/auth";
import {
  formatDate,
  formatDateTime,
  formatFileSize,
  formatReviewCycleStatus
} from "../../../../../../lib/review";

export const dynamic = "force-dynamic";

interface ParticipantDraftReviewPageProps {
  params: {
    cycleId: string;
    draftStandardId: string;
  };
}

export default async function ParticipantDraftReviewPage({
  params
}: ParticipantDraftReviewPageProps) {
  const publicApiUrl = getPublicApiUrl();
  const session = await getServerSession();

  if (!session.authenticated || !session.user) {
    redirect(`/login?next=/participant/reviews/${params.cycleId}/${params.draftStandardId}`);
  }

  if (!canAccessWorkspace(session.user.role, "participant")) {
    return (
      <div className="page-frame">
        <AccessDeniedCard area="participant" user={session.user} />
      </div>
    );
  }

  const [draftCard, comments, position] = await Promise.all([
    getParticipantDraftCard(params.cycleId, params.draftStandardId),
    getParticipantComments(params.cycleId, params.draftStandardId),
    getParticipantPosition(params.cycleId)
  ]);

  const canSubmit = draftCard.cycle.status === "open";

  return (
    <div className="page-frame">
      <section className="hero-card">
        <div>
          <div className="eyebrow">{draftCard.draftStandard.code}</div>
          <h1 className="page-title">{draftCard.draftStandard.title}</h1>
          <p className="page-intro">{draftCard.draftStandard.summary}</p>
        </div>

        <div className="pill-row">
          <span className="pill">
            Статус цикла: {formatReviewCycleStatus(draftCard.cycle.status)}
          </span>
          <span className="pill">Срок: {formatDateTime(draftCard.cycle.deadlineAt)}</span>
          <span className="pill">{draftCard.currentVersion.versionLabel}</span>
        </div>
      </section>

      <section className="info-grid">
        <WorkspaceSessionCard heading="Текущая сессия" user={session.user} />

        <article className="content-card">
          <h2>Карточка проекта</h2>
          <div className="content-stack">
            <div>
              <strong>Цикл согласования</strong>
              <p>{draftCard.cycle.title}</p>
            </div>
            <div>
              <strong>Ответственный подкомитет</strong>
              <p>
                {draftCard.draftStandard.responsibleSubcommittee
                  ? `${draftCard.draftStandard.responsibleSubcommittee.code} — ${draftCard.draftStandard.responsibleSubcommittee.title}`
                  : "Не указан"}
              </p>
            </div>
            <div>
              <strong>Описание цикла</strong>
              <p>{draftCard.cycle.description}</p>
            </div>
            <div>
              <strong>Открыт</strong>
              <p>{formatDate(draftCard.cycle.opensAt)}</p>
            </div>
            <div>
              <strong>Срок ответа</strong>
              <p>{formatDateTime(draftCard.cycle.deadlineAt)}</p>
            </div>
          </div>
        </article>

        <article className="content-card">
          <h2>Версия проекта</h2>
          <div className="content-stack">
            <div>
              <strong>Текущая версия</strong>
              <p>{draftCard.currentVersion.versionLabel}</p>
            </div>
            <div>
              <strong>Описание редакции</strong>
              <p>{draftCard.currentVersion.revisionSummary}</p>
            </div>
            <div>
              <strong>Дата публикации версии</strong>
              <p>{formatDate(draftCard.currentVersion.publishedAt)}</p>
            </div>
            <div>
              <strong>Основной документ версии</strong>
              <p>{draftCard.currentVersion.fileName}</p>
            </div>
            <div>
              <strong>Описание основного документа</strong>
              <p>{draftCard.currentVersion.fileNote}</p>
            </div>
          </div>
        </article>
      </section>

      <article className="content-card">
        <h2>Файлы версии</h2>
        <div className="content-stack">
          {draftCard.attachments.length > 0 ? (
            draftCard.attachments.map((attachment) => (
              <div key={attachment.id} className="document-card">
                <strong>{attachment.originalName}</strong>
                <div className="content-stack">
                  <div>
                    <strong>Описание</strong>
                    <p>{attachment.description ?? "Описание не указано."}</p>
                  </div>
                  <div className="form-grid compact-grid">
                    <div>
                      <strong>Дата загрузки</strong>
                      <p>{formatDateTime(attachment.uploadedAt)}</p>
                    </div>
                    <div>
                      <strong>Размер</strong>
                      <p>{formatFileSize(attachment.sizeBytes)}</p>
                    </div>
                  </div>
                  <div className="pill-row">
                    <a
                      className="pill"
                      href={`${publicApiUrl}/approval/participant/cycles/${encodeURIComponent(
                        params.cycleId
                      )}/drafts/${encodeURIComponent(
                        params.draftStandardId
                      )}/files/${encodeURIComponent(attachment.id)}/download`}
                    >
                      Скачать
                    </a>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p>Файлы версии пока не опубликованы.</p>
          )}
        </div>
      </article>

      <ParticipantCommentsPanel
        comments={comments}
        cycleId={params.cycleId}
        draftStandardId={params.draftStandardId}
        hasSubmittedPosition={Boolean(position)}
        isCycleOpen={draftCard.cycle.status === "open"}
      />

      <ParticipantPositionForm
        canSubmit={canSubmit}
        cycleId={params.cycleId}
        currentPosition={position}
      />
    </div>
  );
}
