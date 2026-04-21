import { SetMetadata } from "@nestjs/common";

import type { AuthRole } from "@tk182/shared-types";

export const AUTH_ROLES_KEY = "auth:roles";

export const Roles = (...roles: AuthRole[]) => SetMetadata(AUTH_ROLES_KEY, roles);
