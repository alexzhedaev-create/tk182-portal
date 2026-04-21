import { Controller, Get, UseGuards } from "@nestjs/common";
import type { AuthenticatedUser } from "@tk182/shared-types";

import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { SessionAuthGuard } from "../auth/session-auth.guard";
import { UsersService } from "./users.service";

@Controller("users")
@UseGuards(SessionAuthGuard, RolesGuard)
@Roles("SECRETARIAT", "ADMIN")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  listUsers(): Promise<AuthenticatedUser[]> {
    return this.usersService.listUsers();
  }
}
