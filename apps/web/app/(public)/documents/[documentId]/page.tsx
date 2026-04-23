import Link from "next/link";
import { notFound } from "next/navigation";

import {
  getPublicApiUrl,
  getPublicDocument,
  isApiNotFoundError
} from "../../../../lib/api";
import { formatPublicDocumentCategory } from "../../../../lib/content";
import { formatDate, formatFileSize, formatOptionalDate } from "../../../../lib/review";

export const dynamic = "force-dynamic";

interface DocumentDetailPageProps {
  params: {
    documentId: string;
  };
}

export default async function DocumentDetailPage({
  params
}: DocumentDetailPageProps) {
  try {
    const [document, apiBaseUrl] = await Promise.all([
      getPublicDocument(params.documentId),
      Promise.resolve(getPublicApiUrl())
    ]);

    return (
      <div className="page-frame">
        <section className="hero-card">
          <div>
            <div className="eyebrow">{formatPublicDocumentCategory(document.category)}</div>
            <h1 className="page-title">{document.title}</h1>
            <p className="page-intro">{document.summary}</p>
          </div>

          <div className="pill-row">
            <span className="pill">
              Дата публикации:{" "}
              {formatOptionalDate(document.publicationDate, "на старом сайте не указана")}
            </span>
            <span className="pill">
              Раздел: {formatPublicDocumentCategory(document.category)}
            </span>
            <Link className="pill" href="/documents">
              Ко всем документам
            </Link>
            {document.attachment ? (
              <Link
                className="pill"
                href={`${apiBaseUrl}/documents/public/${document.id}/download`}
              >
                Скачать
              </Link>
            ) : null}
          </div>
        </section>

        <section className="info-grid">
          <article className="content-card">
            <h2>Основные сведения</h2>
            <div className="content-stack">
              <div>
                <strong>Раздел</strong>
                <p>{formatPublicDocumentCategory(document.category)}</p>
              </div>
              <div>
                <strong>Дата публикации</strong>
                <p>
                  {formatOptionalDate(
                    document.publicationDate,
                    "Дата на старом сайте не указана"
                  )}
                </p>
              </div>
              <div>
                <strong>Описание</strong>
                <p>{document.summary}</p>
              </div>
              <div>
                <strong>Содержимое</strong>
                <p style={{ whiteSpace: "pre-line" }}>
                  {document.body?.trim() || "Текстовое содержимое документа пока не добавлено."}
                </p>
              </div>
            </div>
          </article>

          <article className="content-card">
            <h2>Файл документа</h2>
            {document.attachment ? (
              <div className="content-stack">
                <div>
                  <strong>Файл</strong>
                  <p>{document.attachment.originalName}</p>
                </div>
                <div>
                  <strong>Описание</strong>
                  <p>{document.attachment.description ?? "Не указано"}</p>
                </div>
                <div>
                  <strong>Дата загрузки</strong>
                  <p>{formatDate(document.attachment.uploadedAt)}</p>
                </div>
                <div>
                  <strong>Размер</strong>
                  <p>{formatFileSize(document.attachment.sizeBytes)}</p>
                </div>
              </div>
            ) : (
              <p>
                Файл для этого документа не добавлен. Материал может быть опубликован
                как текстовая запись без отдельного вложения.
              </p>
            )}
          </article>
        </section>
      </div>
    );
  } catch (error) {
    if (isApiNotFoundError(error)) {
      notFound();
    }

    throw error;
  }
}
