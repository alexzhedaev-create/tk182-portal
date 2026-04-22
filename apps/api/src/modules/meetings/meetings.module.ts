import { Module } from "@nestjs/common";

import { ContentModule } from "../content/content.module";
import { MeetingsController } from "./meetings.controller";
import { MeetingsService } from "./meetings.service";

@Module({
  imports: [ContentModule],
  controllers: [MeetingsController],
  providers: [MeetingsService]
})
export class MeetingsModule {}
