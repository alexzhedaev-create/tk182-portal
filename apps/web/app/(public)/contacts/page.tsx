import { getCommitteeStructure } from "../../../lib/api";

export const dynamic = "force-dynamic";

export default async function ContactsPage() {
  const committee = await getCommitteeStructure();

  return (
    <div className="page-frame">
      <section className="hero-card">
        <div>
          <div className="eyebrow">Контактная информация</div>
          <h1 className="page-title">Секретариат</h1>
          <p className="page-intro">
            Публичный раздел секретариата ТК 182 показывает ответственных лиц и
            базовую организацию, ведущую работу комитета.
          </p>
        </div>

        <div className="pill-row">
          <span className="pill">
            Базовая организация:{" "}
            {committee.secretariatHostOrganization?.shortName ??
              committee.secretariatHostOrganization?.name ??
              "не указана"}
          </span>
        </div>
      </section>

      <section className="content-stack">
        <article className="content-card">
          <h2>Секретариат ТК 182</h2>
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
          </div>
        </article>

        <article className="content-card">
          <h2>Базовая организация секретариата</h2>
          <div className="content-stack">
            <div>
              <strong>{committee.secretariatHostOrganization?.name ?? "Не указано"}</strong>
              <p>
                Секретариат ТК 182 ведётся этой организацией в текущей seed-структуре
                MVP.
              </p>
            </div>
          </div>
        </article>
      </section>
    </div>
  );
}
