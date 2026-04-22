import Link from "next/link";

import { getPublicNewsItems } from "../../../lib/api";
import { formatDate } from "../../../lib/review";

export const dynamic = "force-dynamic";

interface NewsPageProps {
  searchParams?: {
    q?: string;
  };
}

export default async function NewsPage({ searchParams }: NewsPageProps) {
  const newsItems = await getPublicNewsItems();
  const query = searchParams?.q?.trim() ?? "";
  const normalizedQuery = query.toLocaleLowerCase("ru");
  const filteredItems = normalizedQuery
    ? newsItems.filter((item) =>
        [item.title, item.excerpt, item.body]
          .join(" ")
          .toLocaleLowerCase("ru")
          .includes(normalizedQuery)
      )
    : newsItems;

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
          <span className="pill">Опубликовано новостей: {newsItems.length}</span>
          {query ? <span className="pill">Найдено: {filteredItems.length}</span> : null}
        </div>
      </section>

      <section className="content-card">
        <h2>Поиск по новостям</h2>
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
          <div className="pill-row">
            <button className="pill" type="submit">
              Найти
            </button>
            {query ? (
              <Link className="pill" href="/news">
                Сбросить фильтр
              </Link>
            ) : null}
          </div>
        </form>
      </section>

      <section className="content-stack">
        {filteredItems.length > 0 ? (
          filteredItems.map((item) => (
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
              {query
                ? "По вашему запросу новости не найдены."
                : "Опубликованных новостей пока нет."}
            </p>
          </article>
        )}
      </section>
    </div>
  );
}
