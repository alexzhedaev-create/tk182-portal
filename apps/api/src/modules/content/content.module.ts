import { Module } from "@nestjs/common";

import { DatabaseModule } from "../../common/database/database.module";
import { AuditModule } from "../audit/audit.module";
import { AuthModule } from "../auth/auth.module";
import { ContentController } from "./content.controller";
import { ContentFileStorageService } from "./content-file-storage.service";
import { ContentService } from "./content.service";

@Module({
  imports: [DatabaseModule, AuditModule, AuthModule],
  controllers: [ContentController],
  providers: [ContentService, ContentFileStorageService],
  exports: [ContentService, ContentFileStorageService]
})
export class ContentModule {}
