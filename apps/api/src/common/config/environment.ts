import { DEFAULT_ALLOWED_FILE_EXTENSIONS, resolveStorageRootDirectory } from "../storage/local-file-storage";

interface ApplicationConfig {
  api: {
    host: string;
    port: number;
  };
  database: {
    url: string;
  };
  session: {
    cookieName: string;
    secureCookie: boolean;
    ttlHours: number;
  };
  web: {
    allowedOrigins: string[];
    publicUrl: string;
  };
  storage: {
    allowedExtensions: string[];
    maxFileSizeBytes: number;
    rootDir: string;
  };
}

function parsePort(value: string | undefined, fallback: number): number {
  const parsedValue = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsedValue) ? parsedValue : fallback;
}

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) {
    return fallback;
  }

  return value.toLowerCase() === "true";
}

function parsePositiveInteger(value: string | undefined, fallback: number): number {
  const parsedValue = Number.parseInt(value ?? "", 10);

  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : fallback;
}

function parseCsvList(value: string | undefined, fallback: readonly string[]): string[] {
  const entries = value
    ?.split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

  return entries && entries.length > 0 ? entries : [...fallback];
}

function buildDefaultDatabaseUrl(): string {
  const user = process.env.POSTGRES_USER ?? "postgres";
  const password = process.env.POSTGRES_PASSWORD ?? "postgres";
  const host = process.env.POSTGRES_HOST ?? "127.0.0.1";
  const port = parsePort(process.env.POSTGRES_PORT, 5432);
  const database = process.env.POSTGRES_DB ?? "tk182_portal";

  return `postgresql://${user}:${password}@${host}:${port}/${database}`;
}

function buildAllowedOrigins(publicUrl: string): string[] {
  const origins = new Set([publicUrl]);

  if (publicUrl.includes("127.0.0.1")) {
    origins.add(publicUrl.replace("127.0.0.1", "localhost"));
  }

  if (publicUrl.includes("localhost")) {
    origins.add(publicUrl.replace("localhost", "127.0.0.1"));
  }

  return [...origins];
}

export function getApplicationConfig(): ApplicationConfig {
  const publicWebUrl = process.env.WEB_PUBLIC_URL ?? "http://127.0.0.1:3000";

  return {
    api: {
      host: process.env.API_HOST ?? "127.0.0.1",
      port: parsePort(process.env.API_PORT, 3001)
    },
    database: {
      url: process.env.DATABASE_URL ?? buildDefaultDatabaseUrl()
    },
    session: {
      cookieName: process.env.SESSION_COOKIE_NAME ?? "tk182_session",
      secureCookie: parseBoolean(process.env.SESSION_COOKIE_SECURE, false),
      ttlHours: parsePort(process.env.SESSION_TTL_HOURS, 168)
    },
    web: {
      publicUrl: publicWebUrl,
      allowedOrigins: buildAllowedOrigins(publicWebUrl)
    },
    storage: {
      rootDir: resolveStorageRootDirectory(process.env.FILE_STORAGE_DIR),
      maxFileSizeBytes: parsePositiveInteger(
        process.env.FILE_STORAGE_MAX_BYTES,
        10 * 1024 * 1024
      ),
      allowedExtensions: parseCsvList(
        process.env.FILE_STORAGE_ALLOWED_EXTENSIONS,
        DEFAULT_ALLOWED_FILE_EXTENSIONS
      )
    }
  };
}
