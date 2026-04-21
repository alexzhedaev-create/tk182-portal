import { Controller, Get, Inject } from "@nestjs/common";

import type { HealthStatusResponse } from "@tk182/shared-types";

import { HealthService } from "./health.service";

@Controller("health")
export class HealthController {
  constructor(@Inject(HealthService) private readonly healthService: HealthService) {}

  @Get()
  getStatus(): Promise<HealthStatusResponse> {
    return this.healthService.getStatus();
  }
}
