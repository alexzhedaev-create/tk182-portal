import "../common/config/load-env";

import { createDatabasePool } from "../common/database/database.pool";
import { runMigrations } from "../common/database/migration-runner";

async function main(): Promise<void> {
  const pool = createDatabasePool();

  try {
    const result = await runMigrations(pool);
    console.info(
      `Migration run finished. Applied ${result.applied}, skipped ${result.skipped}.`
    );
  } finally {
    await pool.end();
  }
}

main().catch((error: unknown) => {
  console.error("Migration run failed.", error);
  process.exit(1);
});
