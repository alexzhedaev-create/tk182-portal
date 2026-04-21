import { Injectable } from "@nestjs/common";

import type { HealthStatusResponse } from "@tk182/shared-types";

import { DatabaseService } from "../../common/database/database.service";

@Injectable()
export class HealthService {
  constructor(private readonly databaseService: DatabaseService) {}

  async getStatus(): Promise<HealthStatusResponse> {
    try {
      await this.databaseService.ping();

      return {
        status: "ok",
        timestamp: new Date().toISOString(),
        database: {
          status: "up"
        },
        services: ["api", "postgres"]
      };
    } catch {
      return {
        status: "degraded",
        timestamp: new Date().toISOString(),
        database: {
          status: "down"
        },
        services: ["api"]
      };
    }
  }
}
