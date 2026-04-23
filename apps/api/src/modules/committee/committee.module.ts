import { Module } from "@nestjs/common";

import { DatabaseModule } from "../../common/database/database.module";
import { AuditModule } from "../audit/audit.module";
import { CommitteeController } from "./committee.controller";
import { CommitteeService } from "./committee.service";

@Module({
  imports: [DatabaseModule, AuditModule],
  controllers: [CommitteeController],
  providers: [CommitteeService],
  exports: [CommitteeService]
})
export class CommitteeModule {}
