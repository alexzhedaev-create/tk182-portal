import Link from "next/link";

import {
  getCommitteeSubcommittees,
  getPublicApiUrl,
  getPublicStandardsPageData
} from "../../../lib/api";
import {
  formatPublicStandardsSection,
  readQueryValue
} from "../../../lib/content";
import { formatDate, formatFileSize } from "../../../lib/review";

export const dynamic = "force-dynamic";

const standardsSections = [
  "DRAFT_STANDARDS",
  "APPROVED_STANDARDS",
  "NATIONAL_STANDARDS_PROGRAM"
] as const;

interface StandardsPageProps {
  searchParams?: {
    dateFrom?: string | string[];
    dateTo?: string | string[];
    q?: string | string[];
    responsibleSubcommitteeId?: string | string[];
    section?: string | string[];
  };
}

export default async function StandardsPage({ searchParams }: StandardsPageProps) {
  const query = readQueryValue(searchParams?.q)?.trim() ?? "";
  const section = readQueryValue(searchParams?.section)?.trim() ?? "";
  const responsibleSubcommitteeId =
    readQueryValue(searchParams?.responsibleSubcommitteeId)?.trim() ?? "";
  const dateFrom = readQueryValue(searchParams?.dateFrom)?.trim() ?? "";
  const dateTo = readQueryValue(searchParams?.dateTo)?.trim() ?? "";
  const hasFilters = Boolean(
    query || section || responsibleSubcommitteeId || dateFrom || dateTo
  );
  const [pageData, apiBaseUrl, subcommittees] = await Promise.all([
    getPublicStandardsPageData({
      ...(query ? { q: query } : {}),
      ...(section ? { section: section as (typeof standardsSections)[number] } : {}),
      ...(responsibleSubcommitteeId ? { responsibleSubcommitteeId } : {}),
      ...(dateFrom ? { dateFrom } : {}),
      ...(dateTo ? { dateTo } : {})
    }),
    Promise.resolve(getPublicApiUrl()),
    getCommitteeSubcommittees()
  ]);
  const filteredCount =
    pageData.nationalStandardsProgramDocuments.length +
    pageData.approvedStandards.length +
    pageData.draftStandards.length;

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
          {hasFilters ? <span className="pill">Найдено: {filteredCount}</span> : null}
        </div>
      </section>

      <section className="content-card">
        <div className="eyebrow">Фильтр</div>
        <h2>Поиск и фильтр по стандартам</h2>
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
          <label>
            <span className="eyebrow">Раздел</span>
            <select className="text-input" name="section" defaultValue={section}>
              <option value="">Все разделы</option>
              {standardsSections.map((item) => (
                <option key={item} value={item}>
                  {formatPublicStandardsSection(item)}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="eyebrow">Ответственный подкомитет</span>
            <select
              className="text-input"
              name="responsibleSubcommitteeId"
              defaultValue={responsibleSubcommitteeId}
            >
              <option value="">Все подкомитеты</option>
              {subcommittees.map((subcommittee) => (
                <option key={subcommittee.id} value={subcommittee.id}>
                  {subcommittee.code} — {subcommittee.title}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="eyebrow">Дата</span>
            <input
              className="text-input"
              type="date"
              name="dateFrom"
              defaultValue={dateFrom}
            />
          </label>
          <label>
            <span className="eyebrow">Дата</span>
            <input
              className="text-input"
              type="date"
              name="dateTo"
              defaultValue={dateTo}
            />
          </label>
          <div className="pill-row">
            <button className="pill" type="submit">
              Найти
            </button>
            {hasFilters ? (
              <Link className="pill" href="/standards">
                Сбросить фильтры
              </Link>
            ) : null}
          </div>
        </form>
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
                {hasFilters
                  ? "По выбранному фильтру документы программы не найдены."
                  : "Пока не опубликованы документы программы разработки национальных стандартов."}
              </p>
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
                {hasFilters
                  ? "По выбранному фильтру утвержденные стандарты не найдены."
                  : "Утвержденные стандарты пока не опубликованы."}
              </p>
            )}
          </div>
        </article>

        <article className="content-card">
          <h2>Проекты стандартов</h2>
          <div className="content-stack">
            {pageData.draftStandards.length > 0 ? (
              pageData.draftStandards.map((standard) => (
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
                {hasFilters
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
