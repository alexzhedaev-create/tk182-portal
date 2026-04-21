import { Controller, Get, Injectable, Module } from "@nestjs/common";

import type { ModuleStubResponse } from "@tk182/shared-types";

import { createModuleStubResponse } from "../../common/stub-response";

@Injectable()
class PagesService {
  getSummary(): ModuleStubResponse {
    return createModuleStubResponse(
      "pages",
      ["public"],
      "Managed content pages for the public website will be served from this module.",
      "Add page storage and publishing controls for public content."
    );
  }
}

@Controller("pages")
class PagesController {
  constructor(private readonly pagesService: PagesService) {}

  @Get()
  getSummary(): ModuleStubResponse {
    return this.pagesService.getSummary();
  }
}

@Module({
  controllers: [PagesController],
  providers: [PagesService]
})
export class PagesModule {}
