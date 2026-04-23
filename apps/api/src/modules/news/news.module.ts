import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { ContentModule } from "../content/content.module";
import { NewsController } from "./news.controller";
import { NewsService } from "./news.service";

@Module({
  imports: [ContentModule, AuthModule],
  controllers: [NewsController],
  providers: [NewsService]
})
export class NewsModule {}
