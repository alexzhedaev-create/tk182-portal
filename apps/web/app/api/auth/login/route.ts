import { proxyAuthRequest } from "../../../../lib/auth-proxy";

export function POST(request: Request): Promise<Response> {
  return proxyAuthRequest(request, "/auth/login");
}
