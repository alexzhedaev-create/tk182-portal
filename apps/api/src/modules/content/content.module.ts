import { Module } from "@nestjs/common";

import { AuditModule } from "../audit/audit.module";
import { ContentFileStorageService } from "./content-file-storage.service";
import { ContentService } from "./content.service";

@Module({
  imports: [AuditModule],
  providers: [ContentService, ContentFileStorageService],
  exports: [ContentService, ContentFileStorageService]
})
export class ContentModule {}
