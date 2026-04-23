import { Module } from "@nestjs/common";

import { DatabaseModule } from "../../common/database/database.module";
import { AuthModule } from "../auth/auth.module";
import { ContentModule } from "../content/content.module";
import { StandardsController } from "./standards.controller";
import { StandardsService } from "./standards.service";

@Module({
  imports: [DatabaseModule, ContentModule, AuthModule],
  controllers: [StandardsController],
  providers: [StandardsService]
})
export class StandardsModule {}
