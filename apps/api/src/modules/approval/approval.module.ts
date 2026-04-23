import { Module } from "@nestjs/common";

import { DatabaseModule } from "../../common/database/database.module";
import { AuditModule } from "../audit/audit.module";
import { AuthModule } from "../auth/auth.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { ApprovalController } from "./approval.controller";
import { ApprovalFileStorageService } from "./approval-file-storage.service";
import { ApprovalService } from "./approval.service";

@Module({
  imports: [DatabaseModule, AuditModule, NotificationsModule, AuthModule],
  controllers: [ApprovalController],
  providers: [ApprovalService, ApprovalFileStorageService]
})
export class ApprovalModule {}
