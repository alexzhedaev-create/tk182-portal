interface StatusPageProps {
  code: string;
  description: string;
  title: string;
}

export function StatusPage({ code, description, title }: StatusPageProps) {
  return (
    <main
      style={{
        fontFamily:
          "\"Avenir Next\", \"Segoe UI\", \"Helvetica Neue\", Arial, sans-serif",
        margin: "0 auto",
        maxWidth: "48rem",
        minHeight: "100vh",
        padding: "4rem 1.5rem",
        display: "grid",
        alignContent: "center",
        gap: "1rem",
        color: "#172033",
        background: "#f5f4ef"
      }}
    >
      <div
        style={{
          fontSize: "0.875rem",
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: "#8a5a44"
        }}
      >
        Портал ТК 182
      </div>
      <h1 style={{ fontSize: "2.5rem", margin: 0 }}>
        {code}: {title}
      </h1>
      <p style={{ fontSize: "1.125rem", lineHeight: 1.6, margin: 0 }}>
        {description}
      </p>
      <p style={{ margin: 0 }}>
        Перейти на <a href="/">главную страницу</a>.
      </p>
    </main>
  );
}
