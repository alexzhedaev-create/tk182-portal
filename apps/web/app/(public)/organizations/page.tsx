import { getCommitteeStructure } from "../../../lib/api";

export const dynamic = "force-dynamic";

export default async function OrganizationsPage() {
  const committee = await getCommitteeStructure();

  return (
    <div className="page-frame">
      <section className="hero-card">
        <div>
          <div className="eyebrow">Участники структуры ТК 182</div>
          <h1 className="page-title">Организации</h1>
          <p className="page-intro">
            На странице перечислены организации, представленные в руководстве,
            секретариате и подкомитетах ТК 182.
          </p>
        </div>

        <div className="pill-row">
          <span className="pill">Организаций: {committee.organizations.length}</span>
        </div>
      </section>

      <section className="content-stack">
        {committee.organizations.map((organization) => (
          <article key={organization.id} className="content-card">
            <div className="review-card-header">
              <div>
                <h2>{organization.name}</h2>
                <p>{organization.shortName}</p>
              </div>
              <div className="pill-row">
                {organization.committeeFunctions.map((item) => (
                  <span key={item} className="pill">
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <div className="info-grid">
              <div>
                <strong>Представители</strong>
                <ul>
                  {organization.representedPeople.map((person) => (
                    <li key={person.id}>
                      {person.fullName} — {person.jobTitle}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <strong>Закрепленные подкомитеты</strong>
                <ul>
                  {organization.hostedSubcommittees.length > 0 ? (
                    organization.hostedSubcommittees.map((subcommittee) => (
                      <li key={subcommittee.id}>
                        {subcommittee.code} — {subcommittee.title}
                      </li>
                    ))
                  ) : (
                    <li>Подкомитеты не закреплены.</li>
                  )}
                </ul>
              </div>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
