import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import type { PoolClient, QueryResult, QueryResultRow } from "pg";

import { createDatabasePool } from "./database.pool";

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);
  private readonly pool = createDatabasePool();

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

  async query<T extends QueryResultRow = QueryResultRow>(
    sql: string,
    values: readonly unknown[] = []
  ): Promise<QueryResult<T>> {
    return this.pool.query<T>(sql, [...values]);
  }

  async withClient<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();

    try {
      return await callback(client);
    } finally {
      client.release();
    }
  }
}
