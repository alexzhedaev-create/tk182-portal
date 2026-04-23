import { Module } from "@nestjs/common";

import { DatabaseModule } from "../../common/database/database.module";
import { ContentModule } from "../content/content.module";
import { StandardsController } from "./standards.controller";
import { StandardsService } from "./standards.service";

@Module({
  imports: [DatabaseModule, ContentModule],
  controllers: [StandardsController],
  providers: [StandardsService]
})
export class StandardsModule {}
