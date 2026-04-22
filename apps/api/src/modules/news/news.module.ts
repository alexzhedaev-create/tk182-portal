import { Module } from "@nestjs/common";

import { ContentModule } from "../content/content.module";
import { NewsController } from "./news.controller";
import { NewsService } from "./news.service";

@Module({
  imports: [ContentModule],
  controllers: [NewsController],
  providers: [NewsService]
})
export class NewsModule {}
