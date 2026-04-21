const defaultApiUrl = "http://127.0.0.1:3001";

function getInternalApiUrl(): string {
  return process.env.API_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_URL ?? defaultApiUrl;
}

export async function proxyAuthRequest(
  request: Request,
  path: "/auth/login" | "/auth/logout" | "/auth/session"
): Promise<Response> {
  const headers = new Headers();
  const contentType = request.headers.get("content-type");
  const cookieHeader = request.headers.get("cookie");

  if (contentType) {
    headers.set("content-type", contentType);
  }

  if (cookieHeader) {
    headers.set("cookie", cookieHeader);
  }

  const body = request.method === "GET" ? undefined : await request.text();
  const upstreamResponse = await fetch(`${getInternalApiUrl()}${path}`, {
    method: request.method,
    headers,
    body: body ?? null,
    cache: "no-store"
  });

  const responseHeaders = new Headers();
  const upstreamContentType = upstreamResponse.headers.get("content-type");
  const upstreamSetCookie = upstreamResponse.headers.get("set-cookie");

  if (upstreamContentType) {
    responseHeaders.set("content-type", upstreamContentType);
  }

  if (upstreamSetCookie) {
    responseHeaders.set("set-cookie", upstreamSetCookie);
  }

  return new Response(await upstreamResponse.text(), {
    status: upstreamResponse.status,
    headers: responseHeaders
  });
}
