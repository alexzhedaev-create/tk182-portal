import Link from "next/link";

import { getPublicApiUrl, getPublicStandardsPageData } from "../../../lib/api";
import { formatDate, formatFileSize } from "../../../lib/review";

export const dynamic = "force-dynamic";

export default async function StandardsPage() {
  const [pageData, apiBaseUrl] = await Promise.all([
    getPublicStandardsPageData(),
    Promise.resolve(getPublicApiUrl())
  ]);

  return (
    <div className="page-frame">
      <section className="hero-card">
        <div>
          <div className="eyebrow">Публичный каталог</div>
          <h1 className="page-title">Стандарты</h1>
          <p className="page-intro">
            На странице объединены действующие проекты стандартов, программа разработки
            национальных стандартов и утвержденные стандарты ТК 182.
          </p>
        </div>

        <div className="pill-row">
          <span className="pill">Проектов стандартов: {pageData.draftStandards.length}</span>
          <span className="pill">Утвержденных стандартов: {pageData.approvedStandards.length}</span>
          <span className="pill">
            Документов программы: {pageData.nationalStandardsProgramDocuments.length}
          </span>
        </div>
      </section>

      <section className="content-stack">
        <article className="content-card">
          <h2>Программа разработки национальных стандартов</h2>
          <div className="content-stack">
            {pageData.nationalStandardsProgramDocuments.length > 0 ? (
              pageData.nationalStandardsProgramDocuments.map((document) => (
                <div key={document.id} className="review-card">
                  <div className="review-card-header">
                    <div>
                      <strong>{document.title}</strong>
                      <p>{document.summary}</p>
                    </div>
                    <span className="pill">Публикация: {formatDate(document.publicationDate)}</span>
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
              <p>Пока не опубликованы документы программы разработки национальных стандартов.</p>
            )}
          </div>
        </article>

        <article className="content-card">
          <h2>Утвержденные стандарты</h2>
          <div className="content-stack">
            {pageData.approvedStandards.length > 0 ? (
              pageData.approvedStandards.map((standard) => (
                <div key={standard.id} className="review-card">
                  <div className="review-card-header">
                    <div>
                      <div className="eyebrow">{standard.code}</div>
                      <strong>{standard.title}</strong>
                      <p>{standard.summary}</p>
                    </div>
                    <div className="pill-row">
                      <span className="pill">Утвержден: {formatDate(standard.approvalDate)}</span>
                      <span className="pill">Публикация: {formatDate(standard.publicationDate)}</span>
                    </div>
                  </div>

                  <div className="info-grid compact-grid">
                    <div>
                      <strong>Ответственный подкомитет</strong>
                      <p>
                        {standard.responsibleSubcommittee
                          ? `${standard.responsibleSubcommittee.code} — ${standard.responsibleSubcommittee.title}`
                          : "Не указан"}
                      </p>
                    </div>
                    {standard.attachment ? (
                      <>
                        <div>
                          <strong>Файл</strong>
                          <p>{standard.attachment.originalName}</p>
                        </div>
                        <div>
                          <strong>Размер</strong>
                          <p>{formatFileSize(standard.attachment.sizeBytes)}</p>
                        </div>
                      </>
                    ) : null}
                  </div>

                  {standard.attachment ? (
                    <div className="pill-row">
                      <Link
                        className="pill"
                        href={`${apiBaseUrl}/standards/approved/${standard.id}/download`}
                      >
                        Скачать
                      </Link>
                    </div>
                  ) : null}
                </div>
              ))
            ) : (
              <p>Утвержденные стандарты пока не опубликованы.</p>
            )}
          </div>
        </article>

        <article className="content-card">
          <h2>Проекты стандартов</h2>
          <div className="content-stack">
            {pageData.draftStandards.map((standard) => (
              <div key={standard.id} className="review-card">
                <div className="review-card-header">
                  <div>
                    <div className="eyebrow">{standard.code}</div>
                    <strong>{standard.title}</strong>
                    <p>{standard.summary}</p>
                  </div>
                  <div className="pill-row">
                    <span className="pill">Стадия: {standard.stage}</span>
                    <span className="pill">
                      Ответственный ПК:{" "}
                      {standard.responsibleSubcommittee?.code ?? "не указан"}
                    </span>
                  </div>
                </div>

                <div className="info-grid compact-grid">
                  <div>
                    <strong>Ответственный подкомитет</strong>
                    <p>
                      {standard.responsibleSubcommittee
                        ? `${standard.responsibleSubcommittee.code} — ${standard.responsibleSubcommittee.title}`
                        : "Не указан"}
                    </p>
                  </div>
                  <div>
                    <strong>Базовая организация</strong>
                    <p>
                      {standard.responsibleSubcommittee?.hostOrganization.name ??
                        "Не указана"}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>
    </div>
  );
}
