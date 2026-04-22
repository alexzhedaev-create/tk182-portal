import { Controller, Get } from "@nestjs/common";
import type { StandardSummary } from "@tk182/shared-types";

import { StandardsService } from "./standards.service";

@Controller("standards")
export class StandardsController {
  constructor(private readonly standardsService: StandardsService) {}

  @Get()
  listStandards(): Promise<StandardSummary[]> {
    return this.standardsService.listStandards();
  }
}
