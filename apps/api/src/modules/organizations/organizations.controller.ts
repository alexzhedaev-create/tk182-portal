import { Controller, Get, Inject } from "@nestjs/common";
import type { OrganizationSummary } from "@tk182/shared-types";

import { OrganizationsService } from "./organizations.service";

@Controller("organizations")
export class OrganizationsController {
  constructor(
    @Inject(OrganizationsService)
    private readonly organizationsService: OrganizationsService
  ) {}

  @Get()
  listOrganizations(): Promise<OrganizationSummary[]> {
    return this.organizationsService.listOrganizations();
  }
}
