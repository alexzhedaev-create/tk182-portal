interface ApplicationConfig {
  api: {
    host: string;
    port: number;
  };
  database: {
    url: string;
  };
  web: {
    publicUrl: string;
  };
}

function parsePort(value: string | undefined, fallback: number): number {
  const parsedValue = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsedValue) ? parsedValue : fallback;
}

function buildDefaultDatabaseUrl(): string {
  const user = process.env.POSTGRES_USER ?? "postgres";
  const password = process.env.POSTGRES_PASSWORD ?? "postgres";
  const host = process.env.POSTGRES_HOST ?? "localhost";
  const port = parsePort(process.env.POSTGRES_PORT, 5432);
  const database = process.env.POSTGRES_DB ?? "tk182_portal";

  return `postgresql://${user}:${password}@${host}:${port}/${database}`;
}

export function getApplicationConfig(): ApplicationConfig {
  return {
    api: {
      host: process.env.API_HOST ?? "127.0.0.1",
      port: parsePort(process.env.API_PORT, 3001)
    },
    database: {
      url: process.env.DATABASE_URL ?? buildDefaultDatabaseUrl()
    },
    web: {
      publicUrl: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000"
    }
  };
}
