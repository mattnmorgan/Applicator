import { Pool, PoolClient } from "pg";

let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      host: process.env.PGHOST || "localhost",
      port: parseInt(process.env.PGPORT || "5432"),
      database: process.env.PGDATABASE || "applicator",
      user: process.env.PGUSER || "applicator",
      password: process.env.PGPASSWORD || "",
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
      keepAlive: true,
      keepAliveInitialDelayMillis: 10000,
    });

    pool.on("error", (error) => {
      console.error("PostgreSQL pool error:", error);
    });

    pool.on("connect", () => {
      console.log("PostgreSQL client connected");
    });
  }

  return pool;
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

/**
 * Execute a function within a PostgreSQL transaction.
 * Automatically commits on success and rolls back on error.
 *
 * @param fn Function receiving a PoolClient to execute queries within the transaction
 * @returns The result of the function
 */
export async function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

/**
 * Get a PoolClient for read-only operations outside a transaction.
 * Caller is responsible for releasing the client.
 */
export async function getClient(): Promise<PoolClient> {
  return getPool().connect();
}
