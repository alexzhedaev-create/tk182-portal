import Link from "next/link";

import { getPublicNewsItems } from "../../../lib/api";
import { readQueryValue } from "../../../lib/content";
import { formatDate } from "../../../lib/review";

export const dynamic = "force-dynamic";

interface NewsPageProps {
  searchParams?: {
    dateFrom?: string | string[];
    dateTo?: string | string[];
    q?: string | string[];
  };
}

export default async function NewsPage({ searchParams }: NewsPageProps) {
  const query = readQueryValue(searchParams?.q)?.trim() ?? "";
  const dateFrom = readQueryValue(searchParams?.dateFrom)?.trim() ?? "";
  const dateTo = readQueryValue(searchParams?.dateTo)?.trim() ?? "";
  const hasFilters = Boolean(query || dateFrom || dateTo);
  const newsItems = await getPublicNewsItems({
    ...(query ? { q: query } : {}),
    ...(dateFrom ? { dateFrom } : {}),
    ...(dateTo ? { dateTo } : {})
  });

  return (
    <div className="page-frame">
      <section className="hero-card">
        <div>
          <div className="eyebrow">Публичные публикации</div>
          <h1 className="page-title">Новости</h1>
          <p className="page-intro">
            Раздел для официальных новостей ТК 182: объявления о публикациях,
            заседаниях, обновлениях комитетной структуры и статусах работ.
          </p>
        </div>

        <div className="pill-row">
          <span className="pill">
            {hasFilters ? "Найдено новостей" : "Опубликовано новостей"}: {newsItems.length}
          </span>
        </div>
      </section>

      <section className="content-card">
        <div className="eyebrow">Фильтр</div>
        <h2>Поиск и фильтр по новостям</h2>
        <form className="form-grid" method="get">
          <label>
            <span className="eyebrow">Поиск</span>
            <input
              className="text-input"
              type="search"
              name="q"
              defaultValue={query}
              placeholder="Введите заголовок или фрагмент текста"
            />
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
              <Link className="pill" href="/news">
                Сбросить фильтры
              </Link>
            ) : null}
          </div>
        </form>
      </section>

      <section className="content-stack">
        {newsItems.length > 0 ? (
          newsItems.map((item) => (
            <article key={item.id} className="content-card review-card">
              <div className="review-card-header">
                <div>
                  <div className="eyebrow">{formatDate(item.publicationDate)}</div>
                  <h2>
                    <Link href={`/news/${item.id}`}>{item.title}</Link>
                  </h2>
                  <p>{item.excerpt}</p>
                </div>
                <span className="pill">Публикация: {formatDate(item.publicationDate)}</span>
              </div>
              <div className="pill-row">
                <span className="pill">Раздел: Новости</span>
                <Link className="pill" href={`/news/${item.id}`}>
                  Открыть новость
                </Link>
              </div>
            </article>
          ))
        ) : (
          <article className="content-card">
            <p>
              {hasFilters
                ? "По вашему запросу новости не найдены."
                : "Опубликованных новостей пока нет."}
            </p>
          </article>
        )}
      </section>
    </div>
  );
}
