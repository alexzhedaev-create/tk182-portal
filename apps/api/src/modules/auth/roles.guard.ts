import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
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
    @Inject(Reflector)
    private readonly reflector: Reflector,
    @Inject(AuthService)
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
      throw new UnauthorizedException("Требуется действующая сессия.");
    }

    request.authSession = session;

    if (requiredRoles.includes(session.user.role)) {
      return true;
    }

    throw new ForbiddenException(
      `Доступ разрешен только ролям: ${requiredRoles.join(", ")}. Текущая роль: ${session.user.role}.`
    );
  }
}
