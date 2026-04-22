import { Module } from "@nestjs/common";

import { AuditModule } from "../audit/audit.module";
import { CommitteeController } from "./committee.controller";
import { CommitteeService } from "./committee.service";

@Module({
  imports: [AuditModule],
  controllers: [CommitteeController],
  providers: [CommitteeService],
  exports: [CommitteeService]
})
export class CommitteeModule {}
