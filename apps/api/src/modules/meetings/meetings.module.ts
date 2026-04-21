import { Controller, Get, Injectable, Module } from "@nestjs/common";

import type { ModuleStubResponse } from "@tk182/shared-types";

import { createModuleStubResponse } from "../../common/stub-response";

@Injectable()
class MeetingsService {
  getSummary(): ModuleStubResponse {
    return createModuleStubResponse(
      "meetings",
      ["public", "participant", "secretariat"],
      "Meeting scheduling, agendas, and minutes will be handled here.",
      "Add meeting entities, calendar data, and attachment links."
    );
  }
}

@Controller("meetings")
class MeetingsController {
  constructor(private readonly meetingsService: MeetingsService) {}

  @Get()
  getSummary(): ModuleStubResponse {
    return this.meetingsService.getSummary();
  }
}

@Module({
  controllers: [MeetingsController],
  providers: [MeetingsService]
})
export class MeetingsModule {}
