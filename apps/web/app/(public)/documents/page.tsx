import Link from "next/link";

import { getPublicApiUrl, getPublicDocumentsPageData } from "../../../lib/api";
import { formatPublicDocumentCategory, readQueryValue } from "../../../lib/content";
import { formatDate, formatFileSize, formatOptionalDate } from "../../../lib/review";

export const dynamic = "force-dynamic";

const documentCategories = ["MAIN_DOCUMENTS", "WORK_REPORTS", "WORK_PLANS"] as const;

interface DocumentsPageProps {
  searchParams?: {
    category?: string | string[];
    dateFrom?: string | string[];
    dateTo?: string | string[];
    q?: string | string[];
  };
}

export default async function DocumentsPage({ searchParams }: DocumentsPageProps) {
  const query = readQueryValue(searchParams?.q)?.trim() ?? "";
  const category = readQueryValue(searchParams?.category)?.trim() ?? "";
  const dateFrom = readQueryValue(searchParams?.dateFrom)?.trim() ?? "";
  const dateTo = readQueryValue(searchParams?.dateTo)?.trim() ?? "";
  const hasFilters = Boolean(query || category || dateFrom || dateTo);
  const [pageData, apiBaseUrl] = await Promise.all([
    getPublicDocumentsPageData({
      ...(query ? { q: query } : {}),
      ...(category
        ? { category: category as (typeof documentCategories)[number] }
        : {}),
      ...(dateFrom ? { dateFrom } : {}),
      ...(dateTo ? { dateTo } : {})
    }),
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
          <span className="pill">
            {hasFilters ? "Найдено документов" : "Опубликовано документов"}:{" "}
            {totalDocuments}
          </span>
        </div>
      </section>

      <section className="content-card">
        <div className="eyebrow">Фильтр</div>
        <h2>Поиск и фильтр по документам</h2>
        <form className="form-grid" method="get">
          <label>
            <span className="eyebrow">Поиск</span>
            <input
              className="text-input"
              type="search"
              name="q"
              defaultValue={query}
              placeholder="Введите название или описание документа"
            />
          </label>
          <label>
            <span className="eyebrow">Раздел</span>
            <select className="text-input" name="category" defaultValue={category}>
              <option value="">Все разделы</option>
              {documentCategories.map((item) => (
                <option key={item} value={item}>
                  {formatPublicDocumentCategory(item)}
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
              <Link className="pill" href="/documents">
                Сбросить фильтры
              </Link>
            ) : null}
          </div>
        </form>
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
                        <strong>
                          <Link href={`/documents/${document.id}`}>{document.title}</Link>
                        </strong>
                        <p>{document.summary}</p>
                      </div>
                      <span className="pill">
                        Публикация:{" "}
                        {formatOptionalDate(
                          document.publicationDate,
                          "дата на старом сайте не указана"
                        )}
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
                    ? "По выбранному фильтру документы не найдены."
                    : "В этом разделе пока нет опубликованных документов."}
                </p>
              )}
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
