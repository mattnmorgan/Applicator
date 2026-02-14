import { PoolClient } from "pg";
import { getPool } from "@/lib/database/pg/pool";

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
