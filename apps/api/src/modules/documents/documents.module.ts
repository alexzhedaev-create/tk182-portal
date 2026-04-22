import { Module } from "@nestjs/common";

import { ContentModule } from "../content/content.module";
import { DocumentsController } from "./documents.controller";
import { DocumentsService } from "./documents.service";

@Module({
  imports: [ContentModule],
  controllers: [DocumentsController],
  providers: [DocumentsService]
})
export class DocumentsModule {}
