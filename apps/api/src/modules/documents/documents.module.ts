import { Module } from "@nestjs/common";

import { DatabaseModule } from "../../common/database/database.module";
import { ContentModule } from "../content/content.module";
import { DocumentsController } from "./documents.controller";
import { DocumentsService } from "./documents.service";

@Module({
  imports: [DatabaseModule, ContentModule],
  controllers: [DocumentsController],
  providers: [DocumentsService]
})
export class DocumentsModule {}
