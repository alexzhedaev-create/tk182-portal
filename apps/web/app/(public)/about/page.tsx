import { getCommitteeStructure } from "../../../lib/api";

export const dynamic = "force-dynamic";

export default async function AboutPage() {
  const committee = await getCommitteeStructure();

  return (
    <div className="page-frame">
      <section className="hero-card">
        <div>
          <div className="eyebrow">Структура комитета</div>
          <h1 className="page-title">Руководство ТК 182</h1>
          <p className="page-intro">
            На публичной странице отражены действующее руководство ТК 182,
            секретариат комитета и сеть профильных подкомитетов ПК 1–ПК 7.
          </p>
        </div>

        <div className="pill-row">
          <span className="pill">Сопредседателей: {committee.leadership.length}</span>
          <span className="pill">Заместителей: {committee.deputyCoChairs.length}</span>
          <span className="pill">Подкомитетов: {committee.subcommittees.length}</span>
        </div>
      </section>

      <section className="content-stack">
        <article className="content-card">
          <h2>Руководство ТК 182</h2>
          <div className="content-stack">
            {committee.leadership.map((item) => (
              <div key={item.id} className="review-card">
                <strong>
                  {item.role.title}: {item.person.fullName}
                </strong>
                <p>{item.person.jobTitle}</p>
                <p>{item.person.organization?.name ?? "Организация не указана"}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="content-card">
          <h2>Заместители сопредседателей</h2>
          <div className="content-stack">
            {committee.deputyCoChairs.map((item) => (
              <div key={item.id} className="review-card">
                <strong>{item.person.fullName}</strong>
                <p>{item.person.jobTitle}</p>
                <p>{item.person.organization?.name ?? "Организация не указана"}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="content-card">
          <h2>Секретариат</h2>
          <div className="content-stack">
            {committee.secretariat.map((item) => (
              <div key={item.id} className="review-card">
                <strong>
                  {item.role.title}: {item.person.fullName}
                </strong>
                <p>{item.person.jobTitle}</p>
                <p>{item.person.organization?.name ?? "Организация не указана"}</p>
              </div>
            ))}
            <p className="status-note">
              Секретариат ведёт{" "}
              {committee.secretariatHostOrganization?.name ??
                "базовая организация комитета"}.
            </p>
          </div>
        </article>

        <article className="content-card">
          <h2>Подкомитеты</h2>
          <div className="content-stack">
            {committee.subcommittees.map((subcommittee) => (
              <div key={subcommittee.id} className="review-card">
                <strong>
                  {subcommittee.code} — {subcommittee.title}
                </strong>
                <p>Базовая организация: {subcommittee.hostOrganization.name}</p>
              </div>
            ))}
          </div>
        </article>
      </section>
    </div>
  );
}
