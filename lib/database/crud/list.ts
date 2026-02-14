import { PoolClient } from "pg";
import { getClient } from "@/lib/database/connections/postgresql";

async function sqlListIds(
  client: PoolClient,
  appId: string,
  tableName: string,
): Promise<string[]> {
  if (appId === "system") {
    const result = await client.query(`SELECT id FROM ${tableName}`);
    return result.rows.map((r) => r.id);
  } else {
    const result = await client.query(
      `SELECT id FROM records WHERE app_id = $1 AND table_name = $2`,
      [appId, tableName],
    );
    return result.rows.map((r) => r.id);
  }
}

export async function listRecords(
  table: string,
  appId: string,
  client?: PoolClient,
): Promise<string[]> {
  if (client) {
    return sqlListIds(client, appId, table);
  }
  const ownClient = await getClient();
  try {
    return await sqlListIds(ownClient, appId, table);
  } finally {
    ownClient.release();
  }
}
