import { Controller, Get, Injectable, Module } from "@nestjs/common";

import type { ModuleStubResponse } from "@tk182/shared-types";

import { createModuleStubResponse } from "../../common/stub-response";

@Injectable()
class DocumentsService {
  getSummary(): ModuleStubResponse {
    return createModuleStubResponse(
      "documents",
      ["public", "participant", "secretariat"],
      "Document management will cover public publications first and protected review assets later.",
      "Add document metadata, storage strategy, and visibility controls."
    );
  }
}

@Controller("documents")
class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get()
  getSummary(): ModuleStubResponse {
    return this.documentsService.getSummary();
  }
}

@Module({
  controllers: [DocumentsController],
  providers: [DocumentsService]
})
export class DocumentsModule {}
