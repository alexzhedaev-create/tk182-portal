import { Module } from "@nestjs/common";

import { ApprovalController } from "./approval.controller";
import { ApprovalFileStorageService } from "./approval-file-storage.service";
import { ApprovalService } from "./approval.service";

@Module({
  controllers: [ApprovalController],
  providers: [ApprovalService, ApprovalFileStorageService]
})
export class ApprovalModule {}
