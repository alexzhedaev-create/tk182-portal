import { Controller, Get, Injectable, Module } from "@nestjs/common";

import type { ModuleStubResponse } from "@tk182/shared-types";

import { createModuleStubResponse } from "../../common/stub-response";

@Injectable()
class NotificationsService {
  getSummary(): ModuleStubResponse {
    return createModuleStubResponse(
      "notifications",
      ["participant", "secretariat"],
      "Notification preferences and delivery rules will be managed here.",
      "Add delivery preferences, event triggers, and queued notifications."
    );
  }
}

@Controller("notifications")
class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  getSummary(): ModuleStubResponse {
    return this.notificationsService.getSummary();
  }
}

@Module({
  controllers: [NotificationsController],
  providers: [NotificationsService]
})
export class NotificationsModule {}
