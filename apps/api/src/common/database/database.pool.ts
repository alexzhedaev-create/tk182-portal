import { Pool } from "pg";

import { getApplicationConfig } from "../config/environment";

export function createDatabasePool(): Pool {
  return new Pool({
    connectionString: getApplicationConfig().database.url
  });
}
