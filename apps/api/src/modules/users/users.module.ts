import { Controller, Get, Injectable, Module } from "@nestjs/common";

import type { ModuleStubResponse } from "@tk182/shared-types";

import { createModuleStubResponse } from "../../common/stub-response";

@Injectable()
class UsersService {
  getSummary(): ModuleStubResponse {
    return createModuleStubResponse(
      "users",
      ["participant", "secretariat"],
      "The user registry will manage local committee identities, roles, and profile data.",
      "Add persistence for user accounts and role assignments."
    );
  }
}

@Controller("users")
class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  getSummary(): ModuleStubResponse {
    return this.usersService.getSummary();
  }
}

@Module({
  controllers: [UsersController],
  providers: [UsersService]
})
export class UsersModule {}
