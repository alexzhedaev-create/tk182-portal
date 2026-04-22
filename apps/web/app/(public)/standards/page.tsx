import Link from "next/link";

import { getPublicApiUrl, getPublicStandardsPageData } from "../../../lib/api";
import { formatDate, formatFileSize } from "../../../lib/review";

export const dynamic = "force-dynamic";

interface StandardsPageProps {
  searchParams?: {
    q?: string;
  };
}

export default async function StandardsPage({ searchParams }: StandardsPageProps) {
  const [pageData, apiBaseUrl] = await Promise.all([
    getPublicStandardsPageData(),
    Promise.resolve(getPublicApiUrl())
  ]);
  const query = searchParams?.q?.trim() ?? "";
  const normalizedQuery = query.toLocaleLowerCase("ru");
  const filteredProgramDocuments = normalizedQuery
    ? pageData.nationalStandardsProgramDocuments.filter((document) =>
        [document.title, document.summary]
          .join(" ")
          .toLocaleLowerCase("ru")
          .includes(normalizedQuery)
      )
    : pageData.nationalStandardsProgramDocuments;
  const filteredApprovedStandards = normalizedQuery
    ? pageData.approvedStandards.filter((standard) =>
        [
          standard.code,
          standard.title,
          standard.summary,
          standard.responsibleSubcommittee?.title ?? "",
          standard.responsibleSubcommittee?.code ?? ""
        ]
          .join(" ")
          .toLocaleLowerCase("ru")
          .includes(normalizedQuery)
      )
    : pageData.approvedStandards;
  const filteredDraftStandards = normalizedQuery
    ? pageData.draftStandards.filter((standard) =>
        [
          standard.code,
          standard.title,
          standard.summary,
          standard.stage,
          standard.responsibleSubcommittee?.title ?? "",
          standard.responsibleSubcommittee?.code ?? ""
        ]
          .join(" ")
          .toLocaleLowerCase("ru")
          .includes(normalizedQuery)
      )
    : pageData.draftStandards;
  const filteredCount =
    filteredProgramDocuments.length +
    filteredApprovedStandards.length +
    filteredDraftStandards.length;

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
          {query ? <span className="pill">Найдено: {filteredCount}</span> : null}
        </div>
      </section>

      <section className="content-card">
        <h2>Поиск по стандартам и программам</h2>
        <form className="form-grid" method="get">
          <label>
            <span className="eyebrow">Поиск</span>
            <input
              className="text-input"
              type="search"
              name="q"
              defaultValue={query}
              placeholder="Введите обозначение, название или подкомитет"
            />
          </label>
          <div className="pill-row">
            <button className="pill" type="submit">
              Найти
            </button>
            {query ? (
              <Link className="pill" href="/standards">
                Сбросить фильтр
              </Link>
            ) : null}
          </div>
        </form>
      </section>

      <section className="content-stack">
        <article className="content-card">
          <h2>Программа разработки национальных стандартов</h2>
          <div className="content-stack">
            {filteredProgramDocuments.length > 0 ? (
              filteredProgramDocuments.map((document) => (
                <div key={document.id} className="review-card">
                  <div className="review-card-header">
                    <div>
                      <strong>
                        <Link href={`/documents/${document.id}`}>{document.title}</Link>
                      </strong>
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

                  <div className="pill-row">
                    <Link className="pill" href={`/documents/${document.id}`}>
                      Открыть карточку
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
                </div>
              ))
            ) : (
              <p>
                {query
                  ? "По выбранному фильтру документы программы не найдены."
                  : "Пока не опубликованы документы программы разработки национальных стандартов."}
              </p>
            )}
          </div>
        </article>

        <article className="content-card">
          <h2>Утвержденные стандарты</h2>
          <div className="content-stack">
            {filteredApprovedStandards.length > 0 ? (
              filteredApprovedStandards.map((standard) => (
                <div key={standard.id} className="review-card">
                  <div className="review-card-header">
                    <div>
                      <div className="eyebrow">{standard.code}</div>
                      <strong>
                        <Link href={`/standards/${standard.id}`}>{standard.title}</Link>
                      </strong>
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

                  <div className="pill-row">
                    <Link className="pill" href={`/standards/${standard.id}`}>
                      Открыть карточку
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
                </div>
              ))
            ) : (
              <p>
                {query
                  ? "По выбранному фильтру утвержденные стандарты не найдены."
                  : "Утвержденные стандарты пока не опубликованы."}
              </p>
            )}
          </div>
        </article>

        <article className="content-card">
          <h2>Проекты стандартов</h2>
          <div className="content-stack">
            {filteredDraftStandards.length > 0 ? (
              filteredDraftStandards.map((standard) => (
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
              ))
            ) : (
              <p>
                {query
                  ? "По выбранному фильтру проекты стандартов не найдены."
                  : "Проекты стандартов пока не опубликованы."}
              </p>
            )}
          </div>
        </article>
      </section>
    </div>
  );
}
