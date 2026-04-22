import Link from "next/link";
import { notFound } from "next/navigation";

import {
  getPublicApiUrl,
  getPublicApprovedStandard,
  isApiNotFoundError
} from "../../../../lib/api";
import { formatDate, formatFileSize } from "../../../../lib/review";

export const dynamic = "force-dynamic";

interface ApprovedStandardDetailPageProps {
  params: {
    standardId: string;
  };
}

export default async function ApprovedStandardDetailPage({
  params
}: ApprovedStandardDetailPageProps) {
  try {
    const [standard, apiBaseUrl] = await Promise.all([
      getPublicApprovedStandard(params.standardId),
      Promise.resolve(getPublicApiUrl())
    ]);

    return (
      <div className="page-frame">
        <section className="hero-card">
          <div>
            <div className="eyebrow">{standard.code}</div>
            <h1 className="page-title">{standard.title}</h1>
            <p className="page-intro">{standard.summary}</p>
          </div>

          <div className="pill-row">
            <span className="pill">Утвержден: {formatDate(standard.approvalDate)}</span>
            <span className="pill">
              Опубликован: {formatDate(standard.publicationDate)}
            </span>
            <Link className="pill" href="/standards">
              Ко всем стандартам
            </Link>
            {standard.attachment ? (
              <Link
                className="pill"
                href={`${apiBaseUrl}/standards/approved/${standard.id}/download`}
              >
                Скачать
              </Link>
            ) : null}
          </div>
        </section>

        <section className="info-grid">
          <article className="content-card">
            <h2>Сведения о стандарте</h2>
            <div className="content-stack">
              <div>
                <strong>Обозначение</strong>
                <p>{standard.code}</p>
              </div>
              <div>
                <strong>Дата утверждения</strong>
                <p>{formatDate(standard.approvalDate)}</p>
              </div>
              <div>
                <strong>Дата публикации</strong>
                <p>{formatDate(standard.publicationDate)}</p>
              </div>
              <div>
                <strong>Ответственный подкомитет</strong>
                <p>
                  {standard.responsibleSubcommittee
                    ? `${standard.responsibleSubcommittee.code} — ${standard.responsibleSubcommittee.title}`
                    : "Не указан"}
                </p>
              </div>
            </div>
          </article>

          <article className="content-card">
            <h2>Файл стандарта</h2>
            {standard.attachment ? (
              <div className="content-stack">
                <div>
                  <strong>Файл</strong>
                  <p>{standard.attachment.originalName}</p>
                </div>
                <div>
                  <strong>Описание</strong>
                  <p>{standard.attachment.description ?? "Не указано"}</p>
                </div>
                <div>
                  <strong>Дата загрузки</strong>
                  <p>{formatDate(standard.attachment.uploadedAt)}</p>
                </div>
                <div>
                  <strong>Размер</strong>
                  <p>{formatFileSize(standard.attachment.sizeBytes)}</p>
                </div>
              </div>
            ) : (
              <p>Файл для этого стандарта пока не добавлен.</p>
            )}
          </article>
        </section>

        <article className="content-card">
          <h2>Описание</h2>
          <p>{standard.summary}</p>
        </article>
      </div>
    );
  } catch (error) {
    if (isApiNotFoundError(error)) {
      notFound();
    }

    throw error;
  }
}
