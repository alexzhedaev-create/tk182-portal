import { Module } from "@nestjs/common";

import { AuditModule } from "../audit/audit.module";
import { ApprovalController } from "./approval.controller";
import { ApprovalFileStorageService } from "./approval-file-storage.service";
import { ApprovalService } from "./approval.service";

@Module({
  imports: [AuditModule],
  controllers: [ApprovalController],
  providers: [ApprovalService, ApprovalFileStorageService]
})
export class ApprovalModule {}
