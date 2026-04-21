import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";

import type { AuthRole } from "@tk182/shared-types";

import { AUTH_ROLES_KEY } from "./roles.decorator";
import { AuthService } from "./auth.service";
import type { AuthenticatedRequest } from "./auth.types";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authService: AuthService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles =
      this.reflector.getAllAndOverride<AuthRole[]>(AUTH_ROLES_KEY, [
        context.getHandler(),
        context.getClass()
      ]) ?? [];

    if (requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const session =
      request.authSession ?? (await this.authService.getRequestSession(request));

    if (!session) {
      throw new UnauthorizedException("A valid session is required.");
    }

    request.authSession = session;

    if (requiredRoles.includes(session.user.role)) {
      return true;
    }

    throw new ForbiddenException(
      `Access is restricted to ${requiredRoles.join(", ")}. Signed in as ${session.user.role}.`
    );
  }
}
