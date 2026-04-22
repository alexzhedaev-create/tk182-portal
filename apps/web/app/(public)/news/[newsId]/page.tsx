import Link from "next/link";
import { notFound } from "next/navigation";

import { getPublicNewsItem, isApiNotFoundError } from "../../../../lib/api";
import { formatDate } from "../../../../lib/review";

export const dynamic = "force-dynamic";

interface NewsDetailPageProps {
  params: {
    newsId: string;
  };
}

export default async function NewsDetailPage({ params }: NewsDetailPageProps) {
  try {
    const item = await getPublicNewsItem(params.newsId);

    return (
      <div className="page-frame">
        <section className="hero-card">
          <div>
            <div className="eyebrow">Новости</div>
            <h1 className="page-title">{item.title}</h1>
            <p className="page-intro">{item.excerpt}</p>
          </div>

          <div className="pill-row">
            <span className="pill">Дата публикации: {formatDate(item.publicationDate)}</span>
            <span className="pill">Раздел: Новости</span>
            <Link className="pill" href="/news">
              Ко всем новостям
            </Link>
          </div>
        </section>

        <section className="info-grid">
          <article className="content-card">
            <h2>Сведения о публикации</h2>
            <div className="content-stack">
              <div>
                <strong>Заголовок</strong>
                <p>{item.title}</p>
              </div>
              <div>
                <strong>Дата публикации</strong>
                <p>{formatDate(item.publicationDate)}</p>
              </div>
              <div>
                <strong>Раздел</strong>
                <p>Новости</p>
              </div>
            </div>
          </article>
        </section>

        <article className="content-card">
          <h2>Текст публикации</h2>
          <p style={{ whiteSpace: "pre-line" }}>{item.body}</p>
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
