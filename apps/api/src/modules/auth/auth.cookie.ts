import { getApplicationConfig } from "../../common/config/environment";

function encodeCookieValue(value: string): string {
  return encodeURIComponent(value);
}

function buildCookieAttributes(expiresAt: Date): string[] {
  const configuration = getApplicationConfig();
  const attributes = [
    `Path=/`,
    `Expires=${expiresAt.toUTCString()}`,
    "HttpOnly",
    "SameSite=Lax"
  ];

  if (configuration.session.secureCookie) {
    attributes.push("Secure");
  }

  return attributes;
}

export function parseCookieHeader(
  cookieHeader: string | undefined
): Record<string, string> {
  if (!cookieHeader) {
    return {};
  }

  return cookieHeader.split(";").reduce<Record<string, string>>((cookies, entry) => {
    const [rawName, ...rawValue] = entry.trim().split("=");

    if (!rawName || rawValue.length === 0) {
      return cookies;
    }

    const value = rawValue.join("=");

    try {
      cookies[rawName] = decodeURIComponent(value);
    } catch {
      cookies[rawName] = value;
    }

    return cookies;
  }, {});
}

export function buildSessionCookie(sessionToken: string, expiresAt: Date): string {
  const configuration = getApplicationConfig();

  return [
    `${configuration.session.cookieName}=${encodeCookieValue(sessionToken)}`,
    ...buildCookieAttributes(expiresAt)
  ].join("; ");
}

export function buildExpiredSessionCookie(): string {
  const configuration = getApplicationConfig();

  return [
    `${configuration.session.cookieName}=`,
    "Path=/",
    "Expires=Thu, 01 Jan 1970 00:00:00 GMT",
    "Max-Age=0",
    "HttpOnly",
    "SameSite=Lax",
    ...(configuration.session.secureCookie ? ["Secure"] : [])
  ].join("; ");
}
