import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import type { Pool } from "pg";

const MIGRATIONS_TABLE = "_migrations";

type MigrationLogger = Pick<typeof console, "error" | "info" | "warn">;

export interface MigrationResult {
  applied: number;
  skipped: number;
}

function getMigrationsDirectory(): string {
  return path.resolve(process.cwd(), "src/common/database/migrations");
}

export async function runMigrations(
  pool: Pool,
  logger: MigrationLogger = console
): Promise<MigrationResult> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (
      name TEXT PRIMARY KEY,
      checksum TEXT NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  const migrationFiles = (await readdir(getMigrationsDirectory()))
    .filter((fileName) => fileName.endsWith(".sql"))
    .sort((left, right) => left.localeCompare(right));

  const appliedMigrations = await pool.query<{ checksum: string; name: string }>(
    `SELECT name, checksum FROM ${MIGRATIONS_TABLE}`
  );
  const appliedByName = new Map(
    appliedMigrations.rows.map((row) => [row.name, row.checksum])
  );

  let applied = 0;
  let skipped = 0;

  for (const fileName of migrationFiles) {
    const filePath = path.join(getMigrationsDirectory(), fileName);
    const sql = await readFile(filePath, "utf8");
    const checksum = createHash("sha256").update(sql).digest("hex");
    const existingChecksum = appliedByName.get(fileName);

    if (existingChecksum === checksum) {
      skipped += 1;
      continue;
    }

    if (existingChecksum && existingChecksum !== checksum) {
      throw new Error(
        `Migration "${fileName}" has changed since it was applied. Create a new migration instead of editing an existing one.`
      );
    }

    const client = await pool.connect();

    try {
      await client.query("BEGIN");
      await client.query(sql);
      await client.query(
        `INSERT INTO ${MIGRATIONS_TABLE} (name, checksum) VALUES ($1, $2)`,
        [fileName, checksum]
      );
      await client.query("COMMIT");
      applied += 1;
      logger.info(`Applied migration ${fileName}.`);
    } catch (error) {
      await client.query("ROLLBACK");
      logger.error(`Failed to apply migration ${fileName}.`);
      throw error;
    } finally {
      client.release();
    }
  }

  if (migrationFiles.length === 0) {
    logger.warn("No migration files were found.");
  }

  return {
    applied,
    skipped
  };
}
