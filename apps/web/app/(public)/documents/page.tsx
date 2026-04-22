import Link from "next/link";

import { getPublicApiUrl, getPublicDocumentsPageData } from "../../../lib/api";
import { formatPublicDocumentCategory } from "../../../lib/content";
import { formatDate, formatFileSize } from "../../../lib/review";

export const dynamic = "force-dynamic";

export default async function DocumentsPage() {
  const [pageData, apiBaseUrl] = await Promise.all([
    getPublicDocumentsPageData(),
    Promise.resolve(getPublicApiUrl())
  ]);

  const totalDocuments = pageData.sections.reduce(
    (count, section) => count + section.documents.length,
    0
  );

  return (
    <div className="page-frame">
      <section className="hero-card">
        <div>
          <div className="eyebrow">Публичные материалы</div>
          <h1 className="page-title">Документы</h1>
          <p className="page-intro">
            В разделе размещаются основные документы ТК 182, отчеты о работе и планы
            перспективных программ. Материалы подготовлены для последующей миграции
            содержимого старого сайта в единый контур портала.
          </p>
        </div>

        <div className="pill-row">
          <span className="pill">Опубликовано документов: {totalDocuments}</span>
        </div>
      </section>

      <section className="content-stack">
        {pageData.sections.map((section) => (
          <article key={section.category} className="content-card">
            <h2>{formatPublicDocumentCategory(section.category)}</h2>
            <div className="content-stack">
              {section.documents.length > 0 ? (
                section.documents.map((document) => (
                  <div key={document.id} className="review-card">
                    <div className="review-card-header">
                      <div>
                        <strong>{document.title}</strong>
                        <p>{document.summary}</p>
                      </div>
                      <span className="pill">
                        Публикация: {formatDate(document.publicationDate)}
                      </span>
                    </div>

                    {document.attachment ? (
                      <div className="info-grid compact-grid">
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
                    ) : null}

                    {document.attachment ? (
                      <div className="pill-row">
                        <Link
                          className="pill"
                          href={`${apiBaseUrl}/documents/public/${document.id}/download`}
                        >
                          Скачать
                        </Link>
                      </div>
                    ) : null}
                  </div>
                ))
              ) : (
                <p>В этом разделе пока нет опубликованных документов.</p>
              )}
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
