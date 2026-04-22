import { Module } from "@nestjs/common";

import { ContentModule } from "../content/content.module";
import { StandardsController } from "./standards.controller";
import { StandardsService } from "./standards.service";

@Module({
  imports: [ContentModule],
  controllers: [StandardsController],
  providers: [StandardsService]
})
export class StandardsModule {}
