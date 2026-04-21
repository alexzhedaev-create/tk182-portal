import { proxyAuthRequest } from "../../../../lib/auth-proxy";

export function GET(request: Request): Promise<Response> {
  return proxyAuthRequest(request, "/auth/session");
}
