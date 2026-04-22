import { getPublicStandards } from "../../../lib/api";

export const dynamic = "force-dynamic";

export default async function StandardsPage() {
  const standards = await getPublicStandards();

  return (
    <div className="page-frame">
      <section className="hero-card">
        <div>
          <div className="eyebrow">Программа стандартизации</div>
          <h1 className="page-title">Проекты стандартов</h1>
          <p className="page-intro">
            В публичном каталоге показаны действующие проекты стандартов ТК 182,
            их стадия и ответственный подкомитет.
          </p>
        </div>

        <div className="pill-row">
          <span className="pill">Всего проектов: {standards.length}</span>
        </div>
      </section>

      <section className="content-stack">
        {standards.map((standard) => (
          <article key={standard.id} className="content-card review-card">
            <div className="review-card-header">
              <div>
                <div className="eyebrow">{standard.code}</div>
                <h2>{standard.title}</h2>
                <p>{standard.summary}</p>
              </div>
              <div className="pill-row">
                <span className="pill">Стадия: {standard.stage}</span>
                <span className="pill">
                  Ответственный ПК:{" "}
                  {standard.responsibleSubcommittee
                    ? standard.responsibleSubcommittee.code
                    : "не указан"}
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
          </article>
        ))}
      </section>
    </div>
  );
}
