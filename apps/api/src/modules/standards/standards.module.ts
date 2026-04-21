import { Controller, Get, Injectable, Module } from "@nestjs/common";

import type { ModuleStubResponse } from "@tk182/shared-types";

import { createModuleStubResponse } from "../../common/stub-response";

@Injectable()
class StandardsService {
  getSummary(): ModuleStubResponse {
    return createModuleStubResponse(
      "standards",
      ["public", "participant", "secretariat"],
      "The standards module will own work items, status tracking, and publication metadata.",
      "Add standard records, stage transitions, and detail endpoints."
    );
  }
}

@Controller("standards")
class StandardsController {
  constructor(private readonly standardsService: StandardsService) {}

  @Get()
  getSummary(): ModuleStubResponse {
    return this.standardsService.getSummary();
  }
}

@Module({
  controllers: [StandardsController],
  providers: [StandardsService]
})
export class StandardsModule {}
