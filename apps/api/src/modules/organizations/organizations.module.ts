import { Controller, Get, Injectable, Module } from "@nestjs/common";

import type { ModuleStubResponse } from "@tk182/shared-types";

import { createModuleStubResponse } from "../../common/stub-response";

@Injectable()
class OrganizationsService {
  getSummary(): ModuleStubResponse {
    return createModuleStubResponse(
      "organizations",
      ["public", "participant", "secretariat"],
      "Organizations will represent committee members, affiliations, and administrative relationships.",
      "Add organization records and membership links for local auth users."
    );
  }
}

@Controller("organizations")
class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Get()
  getSummary(): ModuleStubResponse {
    return this.organizationsService.getSummary();
  }
}

@Module({
  controllers: [OrganizationsController],
  providers: [OrganizationsService]
})
export class OrganizationsModule {}
