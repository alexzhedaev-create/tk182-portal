import { getPublicNewsItems } from "../../../lib/api";
import { formatDate } from "../../../lib/review";

export const dynamic = "force-dynamic";

export default async function NewsPage() {
  const newsItems = await getPublicNewsItems();

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
        </div>
      </section>

      <section className="content-stack">
        {newsItems.length > 0 ? (
          newsItems.map((item) => (
            <article key={item.id} className="content-card review-card">
              <div className="review-card-header">
                <div>
                  <div className="eyebrow">{formatDate(item.publicationDate)}</div>
                  <h2>{item.title}</h2>
                  <p>{item.excerpt}</p>
                </div>
                <span className="pill">Публикация: {formatDate(item.publicationDate)}</span>
              </div>
              <p style={{ whiteSpace: "pre-line" }}>{item.body}</p>
            </article>
          ))
        ) : (
          <article className="content-card">
            <p>Опубликованных новостей пока нет.</p>
          </article>
        )}
      </section>
    </div>
  );
}
