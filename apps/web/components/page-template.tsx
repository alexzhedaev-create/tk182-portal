interface PageTemplateProps {
  eyebrow: string;
  title: string;
  intro: string;
  highlights: string[];
  nextSteps: string[];
}

export function PageTemplate({
  eyebrow,
  title,
  intro,
  highlights,
  nextSteps
}: PageTemplateProps) {
  return (
    <div className="page-frame">
      <section className="hero-card">
        <div>
          <div className="eyebrow">{eyebrow}</div>
          <h1 className="page-title">{title}</h1>
          <p className="page-intro">{intro}</p>
        </div>

        <div className="pill-row">
          {highlights.map((item) => (
            <span key={item} className="pill">
              {item}
            </span>
          ))}
        </div>
      </section>

      <section className="content-stack">
        <article className="content-card">
          <h2>What this page will hold</h2>
          <ul>
            {highlights.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>

        <article className="content-card">
          <h2>Next implementation steps</h2>
          <ul>
            {nextSteps.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>
      </section>
    </div>
  );
}
