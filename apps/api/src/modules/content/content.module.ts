import { Module } from "@nestjs/common";

import { AuditModule } from "../audit/audit.module";
import { ContentController } from "./content.controller";
import { ContentFileStorageService } from "./content-file-storage.service";
import { ContentService } from "./content.service";

@Module({
  imports: [AuditModule],
  controllers: [ContentController],
  providers: [ContentService, ContentFileStorageService],
  exports: [ContentService, ContentFileStorageService]
})
export class ContentModule {}
