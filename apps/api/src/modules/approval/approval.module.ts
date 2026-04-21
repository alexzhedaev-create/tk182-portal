import { Controller, Get, Injectable, Module } from "@nestjs/common";

import type { ModuleStubResponse } from "@tk182/shared-types";

import { createModuleStubResponse } from "../../common/stub-response";

@Injectable()
class ApprovalService {
  getSummary(): ModuleStubResponse {
    return createModuleStubResponse(
      "approval",
      ["participant", "secretariat"],
      "Review-cycle orchestration for draft standards and formal approvals will live in this module.",
      "Add review rounds, comment capture, and decision state tracking."
    );
  }
}

@Controller("approval")
class ApprovalController {
  constructor(private readonly approvalService: ApprovalService) {}

  @Get()
  getSummary(): ModuleStubResponse {
    return this.approvalService.getSummary();
  }
}

@Module({
  controllers: [ApprovalController],
  providers: [ApprovalService]
})
export class ApprovalModule {}
