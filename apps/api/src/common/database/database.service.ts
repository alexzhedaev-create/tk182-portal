import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { Pool } from "pg";

import { getApplicationConfig } from "../config/environment";

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);
  private readonly pool = new Pool({
    connectionString: getApplicationConfig().database.url
  });

  async onModuleInit(): Promise<void> {
    try {
      await this.ping();
      this.logger.log("PostgreSQL connection established.");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `PostgreSQL is not reachable yet. The API will stay up and report a degraded health state until the database is available. ${message}`
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }

  async ping(): Promise<void> {
    await this.pool.query("SELECT 1");
  }
}
