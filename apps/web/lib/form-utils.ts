export function toDateTimeLocalValue(value: string): string {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  const timezoneOffsetMs = parsed.getTimezoneOffset() * 60_000;

  return new Date(parsed.getTime() - timezoneOffsetMs).toISOString().slice(0, 16);
}

export async function extractApiErrorMessage(
  response: Response,
  fallbackMessage: string
): Promise<string> {
  const payload = (await response.json().catch(() => null)) as
    | { message?: string | string[] }
    | null;

  if (Array.isArray(payload?.message)) {
    return payload.message.join(" ");
  }

  if (typeof payload?.message === "string" && payload.message.trim()) {
    return payload.message;
  }

  return fallbackMessage;
}
