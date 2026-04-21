import { Controller, Get, Injectable, Module } from "@nestjs/common";

import type { ModuleStubResponse } from "@tk182/shared-types";

import { createModuleStubResponse } from "../../common/stub-response";

@Injectable()
class NewsService {
  getSummary(): ModuleStubResponse {
    return createModuleStubResponse(
      "news",
      ["public"],
      "Committee announcements and publication updates will be managed here.",
      "Add article storage, publication dates, and editorial workflow."
    );
  }
}

@Controller("news")
class NewsController {
  constructor(private readonly newsService: NewsService) {}

  @Get()
  getSummary(): ModuleStubResponse {
    return this.newsService.getSummary();
  }
}

@Module({
  controllers: [NewsController],
  providers: [NewsService]
})
export class NewsModule {}
