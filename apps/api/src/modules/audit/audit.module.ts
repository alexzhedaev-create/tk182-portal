import { Controller, Get, Injectable, Module } from "@nestjs/common";

import type { ModuleStubResponse } from "@tk182/shared-types";

import { createModuleStubResponse } from "../../common/stub-response";

@Injectable()
class AuditService {
  getSummary(): ModuleStubResponse {
    return createModuleStubResponse(
      "audit",
      ["secretariat"],
      "Audit history for critical portal actions will be stored here.",
      "Add persistent event recording for authentication, review, and publication actions."
    );
  }
}

@Controller("audit")
class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  getSummary(): ModuleStubResponse {
    return this.auditService.getSummary();
  }
}

@Module({
  controllers: [AuditController],
  providers: [AuditService]
})
export class AuditModule {}
